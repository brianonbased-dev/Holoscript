/**
 * HoloScript Browser Runtime
 * 
 * The core engine that loads .holo compositions and renders them in the browser.
 * This is the missing piece that makes HoloScript actually executable.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { parseHolo, parseHoloScriptPlus, type HoloComposition } from '@holoscript/core';
import { eventBus, emit, on } from '../events.js';
import { storage } from '../storage.js';
import { device, isVRCapable } from '../device.js';
import { createLoop, nextFrame } from '../timing.js';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { TraitSystem } from '../traits/TraitSystem';
import { GrabbableTrait, ThrowableTrait } from '../traits/InteractionTraits';
import { InputManager } from '../input/InputManager';

// ═══════════════════════════════════════════════════════════════════════════
// INLINED TYPES (from @hololand/world to avoid cross-repo dependency)
// ═══════════════════════════════════════════════════════════════════════════

interface ActionDefinition {
  name: string;
  params: string[];
  body: unknown;
}

interface CompositionLogic {
  actions: Map<string, ActionDefinition>;
  eventHandlers: Map<string, ActionDefinition>;
  frameHandlers: ActionDefinition[];
  keyboardHandlers: Map<string, ActionDefinition>;
}

interface EnvironmentConfig {
  theme?: string;
  skybox?: string;
  ambientLight?: number;
  grid?: boolean;
  fog?: { color: string; near: number; far: number };
}

interface LoadedComposition {
  state: Record<string, unknown>;
  logic: CompositionLogic;
  environment: EnvironmentConfig;
  objects: ParsedObject[];
}

interface ParsedObject {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color?: string;
  model?: string;
  traits: string[];
  metadata: Record<string, unknown>;
  // Animation properties
  animation?: string;
  animationLoop?: boolean;
  skeleton?: string;
  // Patrol/movement properties
  patrol?: number[][];
  patrolSpeed?: number;
  // Directive/action sequence properties
  directive?: string;
  actions?: DirectiveAction[];
  directiveLoop?: boolean;
  reps?: number;
  restTime?: number;
}

// Directive action for sequenced animations
interface DirectiveAction {
  animation?: string;
  reps?: number;
  rest?: number;
  speed?: number;
}

// Directive execution state attached to models
interface DirectiveState {
  actions: DirectiveAction[];
  currentIndex: number;
  currentReps: number;
  isResting: boolean;
  restEndTime: number;
  loop: boolean;
  mixer: THREE.AnimationMixer;
  model: THREE.Object3D;
  gltf: any;
}

// Minimal composition loader
function loadComposition(source: string, fileType: 'holo' | 'hsplus'): LoadedComposition {
  const result = fileType === 'holo' 
    ? parseHolo(source) 
    : parseHoloScriptPlus(source);
  
  if (!result.success) {
    throw new Error('Parse failed: ' + (result.errors?.[0]?.message || 'Unknown error'));
  }
  
  // For .holo files, extract from AST
  if (fileType === 'holo' && result.ast) {
    return extractFromHoloAST(result.ast);
  }
  
  // For .hsplus files
  return extractFromHsPlusAST(result.ast);
}

function extractFromHoloAST(ast: HoloComposition): LoadedComposition {
  const objects: ParsedObject[] = [];
  const state: Record<string, unknown> = {};
  const environment: EnvironmentConfig = {};
  
  console.log('[HoloScript] Extracting from AST:', ast);
  console.log('[HoloScript] AST objects:', ast.objects);
  
  // Extract state
  if (ast.state?.properties) {
    for (const prop of ast.state.properties) {
      state[prop.key] = prop.value;
    }
  }
  
  // Extract environment
  if (ast.environment?.properties) {
    for (const prop of ast.environment.properties) {
      (environment as Record<string, unknown>)[prop.key] = prop.value;
    }
  }
  
  // Extract objects
  for (const obj of ast.objects || []) {
    console.log('[HoloScript] Processing object:', obj.name, obj);
    const position = extractPosition(obj.properties?.find((p: { key: string }) => p.key === 'position')?.value);
    const scale = extractScale(obj.properties?.find((p: { key: string }) => p.key === 'scale')?.value);
    const color = obj.properties?.find((p: { key: string }) => p.key === 'color')?.value as string | undefined;
    const geometry = obj.properties?.find((p: { key: string }) => p.key === 'geometry')?.value as string | undefined;
    const objType = obj.properties?.find((p: { key: string }) => p.key === 'type')?.value as string | undefined;
    const model = obj.properties?.find((p: { key: string }) => p.key === 'model')?.value as string | undefined;
    
    // Extract animation properties
    const animation = obj.properties?.find((p: { key: string }) => p.key === 'animation')?.value as string | undefined;
    const animationLoop = obj.properties?.find((p: { key: string }) => p.key === 'animationLoop')?.value as boolean | undefined;
    const skeleton = obj.properties?.find((p: { key: string }) => p.key === 'skeleton')?.value as string | undefined;
    const patrol = obj.properties?.find((p: { key: string }) => p.key === 'patrol')?.value as number[][] | undefined;
    const patrolSpeed = obj.properties?.find((p: { key: string }) => p.key === 'patrolSpeed')?.value as number | undefined;
    
    // Extract directive properties
    const directive = obj.properties?.find((p: { key: string }) => p.key === 'directive')?.value as string | undefined;
    const actions = obj.properties?.find((p: { key: string }) => p.key === 'actions')?.value as DirectiveAction[] | undefined;
    const directiveLoop = obj.properties?.find((p: { key: string }) => p.key === 'directiveLoop')?.value as boolean | undefined;
    const reps = obj.properties?.find((p: { key: string }) => p.key === 'reps')?.value as number | undefined;
    const restTime = obj.properties?.find((p: { key: string }) => p.key === 'restTime')?.value as number | undefined;
    
    objects.push({
      id: obj.name,
      type: geometry || objType || 'box',
      position,
      scale,
      color,
      model,
      traits: [],
      metadata: {},
      animation,
      animationLoop,
      skeleton,
      patrol,
      patrolSpeed,
      directive,
      actions,
      directiveLoop,
      reps,
      restTime,
    });
  }
  
  // Extract from spatial groups
  for (const group of ast.spatialGroups || []) {
    for (const obj of group.objects || []) {
      const position = extractPosition(obj.properties?.find((p: { key: string }) => p.key === 'position')?.value);
      const scale = extractScale(obj.properties?.find((p: { key: string }) => p.key === 'scale')?.value);
      const color = obj.properties?.find((p: { key: string }) => p.key === 'color')?.value as string | undefined;
      const geometry = obj.properties?.find((p: { key: string }) => p.key === 'geometry')?.value as string | undefined;
      const objType = obj.properties?.find((p: { key: string }) => p.key === 'type')?.value as string | undefined;
      const model = obj.properties?.find((p: { key: string }) => p.key === 'model')?.value as string | undefined;
      
      // Extract animation properties for spatial group objects
      const animation = obj.properties?.find((p: { key: string }) => p.key === 'animation')?.value as string | undefined;
      const animationLoop = obj.properties?.find((p: { key: string }) => p.key === 'animationLoop')?.value as boolean | undefined;
      const skeleton = obj.properties?.find((p: { key: string }) => p.key === 'skeleton')?.value as string | undefined;
      const patrol = obj.properties?.find((p: { key: string }) => p.key === 'patrol')?.value as number[][] | undefined;
      const patrolSpeed = obj.properties?.find((p: { key: string }) => p.key === 'patrolSpeed')?.value as number | undefined;
      
      // Extract directive properties for spatial group objects
      const directive = obj.properties?.find((p: { key: string }) => p.key === 'directive')?.value as string | undefined;
      const actions = obj.properties?.find((p: { key: string }) => p.key === 'actions')?.value as DirectiveAction[] | undefined;
      const directiveLoop = obj.properties?.find((p: { key: string }) => p.key === 'directiveLoop')?.value as boolean | undefined;
      const reps = obj.properties?.find((p: { key: string }) => p.key === 'reps')?.value as number | undefined;
      const restTime = obj.properties?.find((p: { key: string }) => p.key === 'restTime')?.value as number | undefined;
      
      objects.push({
        id: obj.name,
        type: geometry || objType || 'box',
        position,
        scale,
        color,
        model,
        traits: [],
        metadata: {},
        animation,
        animationLoop,
        skeleton,
        patrol,
        patrolSpeed,
        directive,
        actions,
        directiveLoop,
        reps,
        restTime,
      });
    }
  }
  
  return {
    state,
    environment,
    objects,
    logic: {
      actions: new Map(),
      eventHandlers: new Map(),
      frameHandlers: [],
      keyboardHandlers: new Map(),
    },
  };
}

function extractFromHsPlusAST(ast: unknown): LoadedComposition {
  const objects: ParsedObject[] = [];
  const astAny = ast as { body?: Array<{ type: string; name: string; props?: Record<string, unknown>; traits?: string[] }> };
  
  for (const d of astAny.body || []) {
    if (d.type === 'orb' || d.type === 'object') {
      objects.push({
        id: d.name,
        type: d.type === 'orb' ? 'sphere' : 'box',
        position: extractPosition(d.props?.position),
        scale: extractScale(d.props?.scale),
        color: d.props?.color as string | undefined,
        traits: d.traits || [],
        metadata: d.props || {},
      });
    }
  }
  
  return {
    state: {},
    environment: {},
    objects,
    logic: {
      actions: new Map(),
      eventHandlers: new Map(),
      frameHandlers: [],
      keyboardHandlers: new Map(),
    },
  };
}

function extractPosition(pos: unknown): { x: number; y: number; z: number } {
  if (!pos) return { x: 0, y: 0, z: 0 };
  if (Array.isArray(pos)) return { x: Number(pos[0]) || 0, y: Number(pos[1]) || 0, z: Number(pos[2]) || 0 };
  if (typeof pos === 'object') {
    const p = pos as { x?: number; y?: number; z?: number };
    return { x: p.x || 0, y: p.y || 0, z: p.z || 0 };
  }
  return { x: 0, y: 0, z: 0 };
}

function extractScale(scale: unknown): { x: number; y: number; z: number } {
  if (!scale) return { x: 1, y: 1, z: 1 };
  if (typeof scale === 'number') return { x: scale, y: scale, z: scale };
  if (Array.isArray(scale)) return { x: Number(scale[0]) || 1, y: Number(scale[1]) || 1, z: Number(scale[2]) || 1 };
  if (typeof scale === 'object') {
    const s = scale as { x?: number; y?: number; z?: number };
    return { x: s.x || 1, y: s.y || 1, z: s.z || 1 };
  }
  return { x: 1, y: 1, z: 1 };
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RuntimeConfig {
  container?: HTMLElement; // Optional if existing renderer provided
  mode: 'web' | 'vr' | 'ar' | 'manual'; // manual = driven by external loop
  features?: {
    monaco?: boolean;
    brittney?: boolean;
    networking?: boolean;
    xr?: boolean;
  };
  quality?: 'low' | 'medium' | 'high' | 'ultra';
  // External context injection (for React Three Fiber etc)
  scene?: THREE.Scene;
  camera?: THREE.PerspectiveCamera;
  renderer?: THREE.WebGLRenderer;
}

export interface HoloScriptRuntime {
  load(source: string): void;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  
  // State access
  getState(): Record<string, unknown>;
  setState(key: string, value: unknown): void;
  
  // VR/AR
  supportsVR(): boolean;
  supportsAR(): boolean;
  enterVR(): Promise<void>;
  enterAR(): Promise<void>;
  exitXR(): void;
  
  // Events
  on(event: string, handler: (data: unknown) => void): () => void;
  emit(event: string, data?: unknown): void;
  
  // Actions
  executeAction(name: string, ...args: unknown[]): unknown;
  
  // Visual Regression
  captureSnapshot(): Promise<string>;
  
  // Cleanup
  dispose(): void;
}

// ═══════════════════════════════════════════════════════════════════════════
// RUNTIME IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

class BrowserRuntime implements HoloScriptRuntime {
  private config: RuntimeConfig;
  private composition: LoadedComposition | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls | null = null;
  private objectMap: Map<string, THREE.Object3D> = new Map();
  private uiComponents: Map<string, UIComponent> = new Map();
  private animationId: number | null = null;
  private animationMixers: THREE.AnimationMixer[] = [];
  private proceduralAnimatedObjects: THREE.Object3D[] = [];
  private patrollingObjects: THREE.Object3D[] = [];
  private directiveObjects: DirectiveState[] = []; // Objects with action sequences
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private state: Record<string, unknown> = {};
  private actionContext: ActionContext;
  private physicsWorld: PhysicsWorld;
  private traitSystem: TraitSystem;
  private inputManager: InputManager;
  
  constructor(config: RuntimeConfig) {
    this.config = {
      container: config.container as HTMLElement, // Force cast, validated later if needed
      mode: config.mode || 'web',
      features: {
        monaco: config.features?.monaco ?? true,
        brittney: config.features?.brittney ?? false,
        networking: config.features?.networking ?? false,
        xr: config.features?.xr ?? true,
      },
      quality: config.quality || 'medium',
    };
    
    // Initialize Three.js
    if (config.scene && config.camera && config.renderer) {
        // Use injected context
        this.scene = config.scene;
        this.camera = config.camera;
        this.renderer = config.renderer;
    } else {
        // Create new context
        const root = config.container;
        if (!root) throw new Error("Container required for standalone mode");
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f0f1a);
        
        this.camera = new THREE.PerspectiveCamera(
          75,
          root.clientWidth / root.clientHeight,
          0.1,
          1000
        );
        this.camera.position.set(0, 2, 5);
        
        this.renderer = new THREE.WebGLRenderer({ 
          antialias: this.config.quality !== 'low',
          alpha: true,
          preserveDrawingBuffer: true
        });
        this.renderer.setSize(root.clientWidth, root.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = this.config.quality !== 'low';
        this.renderer.xr.enabled = this.config.features?.xr ?? true;
        root.appendChild(this.renderer.domElement);
    }
    
    // Controls
    if (this.config.mode === 'web') {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
    }
    
    // Lighting
    this.setupDefaultLighting();
    
    // Create action execution context
    this.actionContext = this.createActionContext();
    
    // Physics
    this.physicsWorld = new PhysicsWorld({ gravity: [0, -9.82, 0] });
    
    // Traits
    this.traitSystem = new TraitSystem(this.physicsWorld);
    this.traitSystem.register(GrabbableTrait);
    this.traitSystem.register(ThrowableTrait);
    
    // Input
    this.inputManager = new InputManager(this.scene, this.camera, this.renderer.domElement);

    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  load(source: string): void {
    try {
      console.log('[HoloScript] Loading source:', source.substring(0, 100) + '...');
      
      // Detect file type from source
      const fileType = source.includes('composition') ? 'holo' : 'hsplus';
      console.log('[HoloScript] Detected file type:', fileType);
      
      // Load the composition
      this.composition = loadComposition(source, fileType);
      console.log('[HoloScript] Loaded composition:', this.composition);
      console.log('[HoloScript] Number of objects:', this.composition?.objects?.length || 0);
      
      // Initialize state
      this.state = { ...this.composition.state };
      
      // Apply environment (only if managing scene environment fully)
      if (this.config.mode !== 'manual') {
          this.applyEnvironment(this.composition.environment);
      }
      
      // Build scene from world
      this.buildScene();
      
      emit('runtime:loaded', { composition: this.composition });
    } catch (error) {
      console.error('Failed to load composition:', error);
      emit('runtime:error', { error });
    }
  }
  
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    
    this.renderLoop();
    emit('runtime:started');
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    emit('runtime:stopped');
  }
  
  pause(): void {
    this.isPaused = true;
    emit('runtime:paused');
  }
  
  resume(): void {
    this.isPaused = false;
    emit('runtime:resumed');
  }
  
  getState(): Record<string, unknown> {
    return { ...this.state };
  }
  
  setState(key: string, value: unknown): void {
    const keys = key.split('.');
    let current: any = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    emit('state:changed', { key, value });
    
    // Trigger reactive updates
    this.updateReactiveBindings(key);
  }
  
  supportsVR(): boolean {
    return isVRCapable() && (this.config.features?.xr ?? true);
  }
  
  supportsAR(): boolean {
    return 'xr' in navigator && (this.config.features?.xr ?? true);
  }
  
  async enterVR(): Promise<void> {
    if (!this.supportsVR()) {
      throw new Error('VR not supported');
    }
    
    const session = await (navigator as any).xr.requestSession('immersive-vr');
    this.renderer.xr.setSession(session);
    this.inputManager.setupVR(this.renderer);
    emit('xr:entered', { type: 'vr' });
  }
  
  async enterAR(): Promise<void> {
    if (!this.supportsAR()) {
      throw new Error('AR not supported');
    }
    
    const session = await (navigator as any).xr.requestSession('immersive-ar');
    this.renderer.xr.setSession(session);
    emit('xr:entered', { type: 'ar' });
  }
  
  exitXR(): void {
    const session = this.renderer.xr.getSession();
    if (session) {
      session.end();
    }
    emit('xr:exited');
  }
  
  on(event: string, handler: (data: unknown) => void): () => void {
    return on(event, handler);
  }
  
  emit(event: string, data?: unknown): void {
    emit(event, data);
  }
  
  executeAction(name: string, ...args: unknown[]): unknown {
    const action = this.composition?.logic.actions.get(name);
    if (!action) {
      console.warn(`Action not found: ${name}`);
      return undefined;
    }
    
    return this.runAction(action, args);
  }
  
  async captureSnapshot(): Promise<string> {
    if (!this.renderer) {
      throw new Error('Renderer not initialized');
    }
    
    // Explicitly render to ensure we have the latest frame if preserveDrawingBuffer is true
    this.renderer.render(this.scene, this.camera);
    
    // Get the data URL from the canvas
    return this.renderer.domElement.toDataURL('image/png');
  }
  
  dispose(): void {
    this.stop();
    
    // Cleanup Three.js
    this.renderer.dispose();
    this.controls?.dispose();
    
    // Remove from DOM
    this.renderer.domElement.remove();
    
    // Cleanup UI components
    this.uiComponents.forEach(component => component.dispose());
    this.uiComponents.clear();
    
    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    
    emit('runtime:disposed');
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════════
  
  private setupDefaultLighting(): void {
    const ambient = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(10, 20, 10);
    directional.castShadow = this.config.quality !== 'low';
    this.scene.add(directional);
  }
  
  private applyEnvironment(env: LoadedComposition['environment']): void {
    if (env.skybox) {
      this.loadSkybox(env.skybox);
    }
    
    if (env.ambientLight !== undefined) {
      const ambient = this.scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight;
      if (ambient) {
        ambient.intensity = env.ambientLight;
      }
    }
    
    if (env.grid) {
      const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
      this.scene.add(grid);
    }
    
    if (env.theme === 'developer-dark') {
      this.scene.background = new THREE.Color(0x0f0f1a);
    }
  }
  
  private loadSkybox(skybox: string): void {
    // Handle preset skyboxes
    const presets: Record<string, number> = {
      'nebula': 0x1a1a2e,
      'sunset': 0xff7f50,
      'night': 0x0a0a1a,
      'dev-gradient': 0x0f0f1a,
    };
    
    if (skybox in presets) {
      this.scene.background = new THREE.Color(presets[skybox]);
    } else if (skybox.startsWith('#')) {
      this.scene.background = new THREE.Color(skybox);
    }
    // TODO: Load actual skybox textures
  }
  
  private buildScene(): void {
    if (!this.composition) {
      console.log('[HoloScript] No composition to build');
      return;
    }
    
    console.log('[HoloScript] Building scene with', this.composition.objects.length, 'objects');
    console.log('[HoloScript] Objects:', this.composition.objects);
    
    // Iterate through parsed objects
    for (const obj of this.composition.objects) {
      console.log('[HoloScript] Creating object:', obj);
      this.createSceneObject(obj);
    }
  }
  
  private createSceneObject(obj: any): void {
    const type = obj.type;
    
    // Check for UI components
    if (type.startsWith('ui-')) {
      this.createUIComponent(obj);
      return;
    }
    
    // Check for model (GLB/GLTF)
    if (type === 'model' || obj.model) {
      this.loadModel(obj);
      return;
    }
    
    // Create 3D object
    let geometry: THREE.BufferGeometry;
    switch (type) {
      case 'sphere':
      case 'orb':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'box':
      case 'cube':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(1, 1);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.5, 0.2, 16, 100);
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    // Material - check both color and properties.color for compatibility
    const color = obj.color || obj.properties?.color || '#00d4ff';
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      metalness: 0.3,
      roughness: 0.7,
    });
    
    // Apply traits
    if (obj.traits?.includes('glowing') || obj.traits?.includes('emissive')) {
      material.emissive = new THREE.Color(color);
      material.emissiveIntensity = 0.5;
    }
    
    if (obj.traits?.includes('transparent')) {
      material.transparent = true;
      material.opacity = obj.properties?.opacity ?? 0.7;
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position, rotation, scale
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.rotation.set(obj.rotation?.x || 0, obj.rotation?.y || 0, obj.rotation?.z || 0);
    mesh.scale.set(obj.scale?.x || 1, obj.scale?.y || 1, obj.scale?.z || 1);
    
    mesh.name = obj.id;
    mesh.userData = { holoObject: obj };
    
    this.scene.add(mesh);
    this.objectMap.set(obj.id, mesh);

    // Physics integration
    if (obj.traits?.includes('physics') || obj.traits?.includes('gravity')) {
       // Determine shape based on type
       const shapeType = (type === 'sphere' || type === 'orb') ? 'sphere' :
                         (type === 'plane' || type === 'floor') ? 'plane' : 'box';
       
       const mass = (obj.traits?.includes('static') || type === 'plane' || type === 'floor') ? 0 : 1;
       
       this.physicsWorld.addBody(obj.id, mesh, shapeType, mass);
    }
    
    // Apply traits via system
    if (obj.traits && Array.isArray(obj.traits)) {
      for (const trait of obj.traits) {
        // config is usually in metadata or directives, for now pass empty or slice
        this.traitSystem.apply(mesh, trait, {});
      }
    }
  }
  
  /**
   * Load a GLB/GLTF model
   */
  private loadModel(obj: any): void {
    const loader = new GLTFLoader();
    const modelPath = obj.model || obj.properties?.model;
    
    if (!modelPath) {
      console.warn(`No model path specified for object ${obj.id}`);
      return;
    }
    
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Position, rotation, scale
        model.position.set(obj.position?.x || 0, obj.position?.y || 0, obj.position?.z || 0);
        model.rotation.set(obj.rotation?.x || 0, obj.rotation?.y || 0, obj.rotation?.z || 0);
        
        const scale = obj.scale?.x || obj.scale || 1;
        if (typeof scale === 'number') {
          model.scale.set(scale, scale, scale);
        } else {
          model.scale.set(obj.scale?.x || 1, obj.scale?.y || 1, obj.scale?.z || 1);
        }
        
        model.name = obj.id;
        model.userData = { holoObject: obj };
        
        // Apply color tint if specified - BUT preserve textured materials
        // GLB models with proper textures (eyes, mouth, skin) should NOT be overridden
        // Only apply to materials without texture maps
        if (obj.color) {
          const targetColor = new THREE.Color(obj.color);
          console.log(`[HoloScript] Color ${obj.color} specified for ${obj.id}`);
          
          let coloredCount = 0;
          let skippedCount = 0;
          
          model.traverse((child: any) => {
            if ((child.isMesh || child.isSkinnedMesh) && child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              
              const newMaterials = materials.map((mat: any) => {
                // Skip materials that have texture maps - they have proper artwork
                const hasTexture = mat.map || mat.normalMap || mat.roughnessMap || 
                                   mat.metalnessMap || mat.aoMap || mat.emissiveMap;
                
                if (hasTexture) {
                  skippedCount++;
                  return mat; // Keep original material with textures
                }
                
                // Only tint solid-color materials (no textures)
                const clonedMat = mat.clone();
                if (clonedMat.color) {
                  clonedMat.color.copy(targetColor);
                  coloredCount++;
                }
                return clonedMat;
              });
              
              child.material = Array.isArray(child.material) ? newMaterials : newMaterials[0];
            }
          });
          
          console.log(`[HoloScript] ${obj.id}: colored ${coloredCount} materials, preserved ${skippedCount} textured materials`);
        }
        
        // Detect and log skeleton/bone structure
        let skeletonFound = false;
        let boneCount = 0;
        const boneNames: string[] = [];
        
        model.traverse((child: any) => {
          if (child.isBone) {
            boneCount++;
            boneNames.push(child.name);
          }
          if (child.isSkinnedMesh) {
            skeletonFound = true;
            console.log(`[HoloScript] Found skinned mesh in ${obj.id}: ${child.name}`);
            if (child.skeleton) {
              console.log(`[HoloScript] Skeleton bones: ${child.skeleton.bones.length}`);
            }
          }
        });
        
        if (skeletonFound) {
          console.log(`[HoloScript] ✓ Humanoid skeleton detected in ${obj.id}`);
          console.log(`[HoloScript]   Bones (${boneCount}): ${boneNames.slice(0, 10).join(', ')}${boneCount > 10 ? '...' : ''}`);
          
          // Store skeleton info for potential IK or retargeting
          (model as any)._skeletonInfo = {
            type: obj.skeleton || 'humanoid',
            boneCount,
            boneNames,
            autoDetected: true,
          };
        } else {
          console.log(`[HoloScript] No skeleton in ${obj.id} - static model`);
        }
        
        // Play animations if available
        console.log(`[HoloScript] Model ${obj.id} has ${gltf.animations.length} animations`);
        if (gltf.animations.length > 0) {
          console.log(`[HoloScript] Animation clips:`, gltf.animations.map(a => a.name));
          const mixer = new THREE.AnimationMixer(model);
          
          // Check for directive-based action sequences
          if (obj.actions && Array.isArray(obj.actions) && obj.actions.length > 0) {
            console.log(`[HoloScript] ✓ Directive mode for ${obj.id} with ${obj.actions.length} actions`);
            
            // Setup directive state
            const directiveState: DirectiveState = {
              actions: obj.actions,
              currentIndex: 0,
              currentReps: 0,
              isResting: false,
              restEndTime: 0,
              loop: obj.directiveLoop !== false, // Default to true
              mixer: mixer,
              model: model,
              gltf: gltf,
            };
            
            // Start the first action
            this.startDirectiveAction(directiveState);
            this.directiveObjects.push(directiveState);
            
            // Store mixer for animation updates
            (model as any)._mixer = mixer;
            this.animationMixers.push(mixer);
          }
          // Check if a specific animation was requested (simple mode)
          else if (obj.animation) {
            const requestedAnimation = obj.animation;
            const shouldLoop = obj.animationLoop !== false; // Default to true
            const reps = obj.reps; // Optional rep count
            
            // Find and play the specific animation
            const clip = gltf.animations.find(a => 
              a.name.toLowerCase().includes(requestedAnimation.toLowerCase())
            ) || gltf.animations[0];
            
            if (clip) {
              const action = mixer.clipAction(clip);
              
              if (reps && reps > 0) {
                // Rep-based animation with rest
                console.log(`[HoloScript] ${obj.id}: ${reps} reps of ${clip.name}`);
                action.setLoop(THREE.LoopRepeat, reps);
                action.clampWhenFinished = true;
                
                // Setup simple directive for single animation with reps
                const simpleDirective: DirectiveState = {
                  actions: [
                    { animation: requestedAnimation, reps: reps },
                    { rest: obj.restTime || 3 }
                  ],
                  currentIndex: 0,
                  currentReps: 0,
                  isResting: false,
                  restEndTime: 0,
                  loop: obj.directiveLoop !== false,
                  mixer: mixer,
                  model: model,
                  gltf: gltf,
                };
                this.startDirectiveAction(simpleDirective);
                this.directiveObjects.push(simpleDirective);
              } else {
                // Simple infinite loop
                action.setLoop(shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
                action.play();
                console.log(`[HoloScript] Playing requested animation: ${clip.name}`);
              }
            }
            
            // Store mixer for animation updates
            (model as any)._mixer = mixer;
            this.animationMixers.push(mixer);
          } else {
            // Play ALL animations (default behavior)
            for (const clip of gltf.animations) {
              const action = mixer.clipAction(clip);
              action.play();
              console.log(`[HoloScript] Playing animation: ${clip.name} (duration: ${clip.duration}s)`);
            }
            
            // Store mixer for animation updates
            (model as any)._mixer = mixer;
            this.animationMixers.push(mixer);
          }
          
          console.log(`[HoloScript] Total animation mixers: ${this.animationMixers.length}`);
        } else {
          // No embedded animations - use procedural skeleton animation if skeleton exists
          const skeletonInfo = (model as any)._skeletonInfo;
          
          if (skeletonInfo && skeletonInfo.boneCount > 0) {
            // Has skeleton - use bone-based procedural animation
            console.log(`[HoloScript] ${obj.id}: No clips, using procedural skeleton animation`);
            
            // Find the SkinnedMesh and its bones
            let skinnedMesh: any = null;
            model.traverse((child: any) => {
              if (child.isSkinnedMesh && child.skeleton) {
                skinnedMesh = child;
              }
            });
            
            if (skinnedMesh && skinnedMesh.skeleton) {
              const skeleton = skinnedMesh.skeleton;
              const bones = skeleton.bones;
              
              // Store original bone rotations
              const originalRotations: THREE.Quaternion[] = [];
              for (const bone of bones) {
                originalRotations.push(bone.quaternion.clone());
              }
              
              (model as any)._proceduralSkeleton = {
                mesh: skinnedMesh,
                skeleton: skeleton,
                bones: bones,
                originalRotations: originalRotations,
                phase: Math.random() * Math.PI * 2,
                animationType: obj.animation || 'idle', // Use animation property to select type
              };
              
              (model as any)._isProceduralSkeletonAnimated = true;
              this.proceduralAnimatedObjects.push(model);
              console.log(`[HoloScript] ${obj.id}: Procedural skeleton ready with ${bones.length} bones`);
            }
          } else {
            // No skeleton - simple breathing animation on whole model
            console.log(`[HoloScript] No animations in ${obj.id}, adding procedural idle`);
            const baseScale = model.scale.clone();
            (model as any)._breathePhase = Math.random() * Math.PI * 2; // Random start phase
            (model as any)._baseScale = baseScale;
            (model as any)._isProceduralAnimated = true;
            this.proceduralAnimatedObjects.push(model);
          }
        }
        
        // Setup patrol if specified
        if (obj.patrol && Array.isArray(obj.patrol) && obj.patrol.length > 1) {
          console.log(`[HoloScript] Setting up patrol for ${obj.id} with ${obj.patrol.length} waypoints`);
          (model as any)._patrol = {
            waypoints: obj.patrol.map((p: number[]) => new THREE.Vector3(p[0], p[1], p[2])),
            currentIndex: 0,
            speed: obj.patrolSpeed || 1.0,
            startPosition: new THREE.Vector3(obj.position?.x || 0, obj.position?.y || 0, obj.position?.z || 0),
          };
          this.patrollingObjects.push(model);
        }
        
        this.scene.add(model);
        this.objectMap.set(obj.id, model);
        console.log(`Loaded model: ${obj.id} from ${modelPath}`);
      },
      (progress) => {
        // Progress callback
      },
      (error) => {
        console.error(`Failed to load model ${modelPath}:`, error);
        // Create placeholder
        const placeholder = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 16, 16),
          new THREE.MeshStandardMaterial({ color: 0xff0000 })
        );
        placeholder.position.set(obj.position?.x || 0, obj.position?.y || 0, obj.position?.z || 0);
        placeholder.name = obj.id;
        this.scene.add(placeholder);
        this.objectMap.set(obj.id, placeholder);
      }
    );
  }
  
  private createUIComponent(obj: any): void {
    const type = obj.type.replace('ui-', '');
    
    switch (type) {
      case 'monaco-editor':
        this.createMonacoEditor(obj);
        break;
      case '3d-viewport':
        this.create3DViewport(obj);
        break;
      case 'button':
        this.createButton(obj);
        break;
      case 'text':
        this.createText(obj);
        break;
      case 'input':
        this.createInput(obj);
        break;
      case 'chat':
        this.createChatPanel(obj);
        break;
      case 'list':
        this.createList(obj);
        break;
      case 'properties':
        this.createPropertiesPanel(obj);
        break;
      case 'error-list':
        this.createErrorList(obj);
        break;
      default:
        console.warn(`Unknown UI component: ${type}`);
    }
  }
  
  private createMonacoEditor(obj: any): void {
    if (!this.config.features?.monaco) {
      console.warn('Monaco editor feature not enabled');
      return;
    }
    
    const container = document.createElement('div');
    container.id = `monaco-${obj.id}`;
    container.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: ${(obj.scale?.x || 1) * 200}px;
      height: ${(obj.scale?.y || 1) * 200}px;
      background: #1e1e1e;
      border-radius: 8px;
      overflow: hidden;
      z-index: 10;
    `;
    
    (this.config.container || document.body).appendChild(container);
    
    // Load Monaco asynchronously
    this.loadMonaco(container, obj);
    
    this.uiComponents.set(obj.id, {
      element: container,
      type: 'monaco-editor',
      dispose: () => container.remove()
    });
  }
  
  private async loadMonaco(container: HTMLElement, obj: ParsedObject): Promise<void> {
    // Dynamic import of Monaco - use string variable to prevent TypeScript module resolution
    try {
      const monacoPath = 'monaco-editor';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monaco = await import(/* webpackIgnore: true */ monacoPath) as any;
      
      const editor = monaco.editor.create(container, {
        value: this.resolveStateRef(obj.metadata?.value as string) || '',
        language: (obj.metadata?.language as string) || 'holo',
        theme: 'vs-dark',
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
      });
      
      // Bind to state
      if (obj.metadata?.on_change) {
        editor.onDidChangeModelContent(() => {
          const value = editor.getValue();
          this.executeHandler(obj.metadata.on_change as string, { value });
        });
      }
      
      // Store reference
      (this.uiComponents.get(obj.id) as { editor?: unknown }).editor = editor;
    } catch (e) {
      console.warn('Monaco editor not available, using textarea fallback');
      const textarea = document.createElement('textarea');
      textarea.value = this.resolveStateRef(obj.metadata?.value as string) || '';
      textarea.style.cssText = 'width: 100%; height: 100%; background: #1e1e1e; color: #d4d4d4; border: none; padding: 8px; font-family: monospace;';
      container.appendChild(textarea);
    }
  }
  
  private create3DViewport(obj: any): void {
    // Create a secondary renderer for the preview
    const container = document.createElement('div');
    container.id = `viewport-${obj.id}`;
    container.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: ${(obj.scale?.x || 1) * 200}px;
      height: ${(obj.scale?.y || 1) * 200}px;
      background: #0a0a0f;
      border-radius: 8px;
      overflow: hidden;
      z-index: 5;
    `;
    
    (this.config.container || document.body).appendChild(container);
    
    // Mini renderer for preview
    const previewRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    previewRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(previewRenderer.domElement);
    
    const previewScene = new THREE.Scene();
    previewScene.background = new THREE.Color(0x0a0a0f);
    
    const previewCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);
    previewCamera.position.set(0, 2, 5);
    
    // Grid
    if (obj.properties?.show_grid) {
      previewScene.add(new THREE.GridHelper(10, 10, 0x444444, 0x222222));
    }
    
    // Axes
    if (obj.properties?.show_axes) {
      previewScene.add(new THREE.AxesHelper(2));
    }
    
    // Lighting
    previewScene.add(new THREE.AmbientLight(0x404040, 0.5));
    previewScene.add(new THREE.DirectionalLight(0xffffff, 0.8));
    
    this.uiComponents.set(obj.id, {
      element: container,
      type: '3d-viewport',
      renderer: previewRenderer,
      scene: previewScene,
      camera: previewCamera,
      dispose: () => {
        previewRenderer.dispose();
        container.remove();
      }
    });
  }
  
  private createButton(obj: any): void {
    const button = document.createElement('button');
    button.id = `btn-${obj.id}`;
    button.textContent = obj.properties?.label || 'Button';
    button.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      padding: 8px 16px;
      background: ${obj.properties?.color || '#00d4ff'};
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      z-index: 20;
    `;
    
    if (obj.properties?.on_click) {
      button.onclick = () => this.executeHandler(obj.properties.on_click, {});
    }
    
    (this.config.container || document.body).appendChild(button);
    this.uiComponents.set(obj.id, {
      element: button,
      type: 'button',
      dispose: () => button.remove()
    });
  }
  
  private createText(obj: any): void {
    const text = document.createElement('div');
    text.id = `text-${obj.id}`;
    text.textContent = this.resolveStateRef(obj.properties?.text) || '';
    text.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      color: ${obj.properties?.color || '#ffffff'};
      font-size: ${obj.properties?.font_size || 16}px;
      z-index: 15;
    `;
    
    (this.config.container || document.body).appendChild(text);
    this.uiComponents.set(obj.id, {
      element: text,
      type: 'text',
      dispose: () => text.remove()
    });
  }
  
  private createInput(obj: any): void {
    const input = document.createElement('input');
    input.id = `input-${obj.id}`;
    input.type = 'text';
    input.placeholder = obj.properties?.placeholder || '';
    input.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: ${(obj.scale?.x || 1) * 150}px;
      padding: 8px;
      background: #1a1a2e;
      color: #ffffff;
      border: 1px solid #333;
      border-radius: 6px;
      z-index: 20;
    `;
    
    if (obj.properties?.on_submit) {
      input.onkeydown = (e) => {
        if (e.key === 'Enter') {
          this.executeHandler(obj.properties.on_submit, { value: input.value });
          input.value = '';
        }
      };
    }
    
    (this.config.container || document.body).appendChild(input);
    this.uiComponents.set(obj.id, {
      element: input,
      type: 'input',
      dispose: () => input.remove()
    });
  }
  
  private createChatPanel(obj: any): void {
    const container = document.createElement('div');
    container.id = `chat-${obj.id}`;
    container.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: ${(obj.scale?.x || 1) * 200}px;
      height: ${(obj.scale?.y || 1) * 200}px;
      background: #1a1a2e;
      border-radius: 8px;
      overflow-y: auto;
      padding: 8px;
      z-index: 15;
    `;
    
    (this.config.container || document.body).appendChild(container);
    this.uiComponents.set(obj.id, {
      element: container,
      type: 'chat',
      messages: [],
      addMessage: (role: string, content: string) => {
        const msg = document.createElement('div');
        msg.style.cssText = `
          padding: 6px 10px;
          margin: 4px 0;
          border-radius: 6px;
          background: ${role === 'user' ? '#00d4ff22' : '#ffd70022'};
          color: #e0e0e0;
          font-size: 13px;
        `;
        msg.textContent = content;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
      },
      dispose: () => container.remove()
    });
  }
  
  private createList(obj: any): void {
    const list = document.createElement('div');
    list.id = `list-${obj.id}`;
    list.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: ${(obj.scale?.x || 1) * 150}px;
      max-height: ${(obj.scale?.y || 1) * 200}px;
      background: #1a1a2e;
      border-radius: 8px;
      overflow-y: auto;
      z-index: 15;
    `;
    
    (this.config.container || document.body).appendChild(list);
    this.uiComponents.set(obj.id, {
      element: list,
      type: 'list',
      dispose: () => list.remove()
    });
  }
  
  private createPropertiesPanel(obj: any): void {
    const panel = document.createElement('div');
    panel.id = `props-${obj.id}`;
    panel.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: 180px;
      background: #1a1a2e;
      border-radius: 8px;
      padding: 8px;
      z-index: 15;
    `;
    panel.innerHTML = '<div style="color:#00d4ff;font-size:12px;margin-bottom:8px;">Properties</div>';
    
    (this.config.container || document.body).appendChild(panel);
    this.uiComponents.set(obj.id, {
      element: panel,
      type: 'properties',
      dispose: () => panel.remove()
    });
  }
  
  private createErrorList(obj: any): void {
    const container = document.createElement('div');
    container.id = `errors-${obj.id}`;
    container.style.cssText = `
      position: absolute;
      left: ${this.worldToScreenX(obj.position.x)}px;
      top: ${this.worldToScreenY(obj.position.y)}px;
      width: ${(obj.scale?.x || 1) * 200}px;
      background: #2a1a1a;
      border-radius: 6px;
      padding: 6px;
      color: #ff6666;
      font-size: 12px;
      z-index: 20;
    `;
    
    (this.config.container || document.body).appendChild(container);
    this.uiComponents.set(obj.id, {
      element: container,
      type: 'error-list',
      dispose: () => container.remove()
    });
  }
  
  private worldToScreenX(worldX: number): number {
    // Simple mapping - would need proper projection for 3D UI
    return (this.config.container?.clientWidth || window.innerWidth) / 2 + worldX * 100;
  }
  
  private worldToScreenY(worldY: number): number {
    return (this.config.container?.clientHeight || window.innerHeight) / 2 - worldY * 100;
  }
  
  private resolveStateRef(value: unknown): string {
    if (typeof value === 'object' && value !== null && '__stateRef' in value) {
      const path = (value as any).__stateRef;
      return this.getStatePath(path) as string || '';
    }
    return value as string;
  }
  
  private getStatePath(path: string): unknown {
    const keys = path.split('.');
    let current: any = this.state;
    for (const key of keys) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }
    return current;
  }
  
  private executeHandler(handler: unknown, event: Record<string, unknown>): void {
    if (typeof handler === 'object' && handler !== null && '__call' in handler) {
      const call = (handler as any).__call;
      this.executeAction(call.name, ...call.args);
    } else if (typeof handler === 'string') {
      // Direct action name
      this.executeAction(handler);
    }
  }
  
  private runAction(action: ActionDefinition, args: unknown[]): unknown {
    // Create execution context
    const context = this.createActionContext();
    
    // Bind parameters
    const params: Record<string, unknown> = {};
    action.params.forEach((param, i) => {
      params[param] = args[i];
    });
    
    // Execute body (simple interpreter)
    return this.interpretActionBody(action.body, { ...context, ...params });
  }
  
  private createActionContext(): ActionContext {
    return {
      state: this.state,
      setState: this.setState.bind(this),
      emit: emit,
      parse_holo: (code: string) => {
        try {
          const result = loadComposition(code, 'holo');
          return { success: true, ast: result };
        } catch (e: any) {
          return { success: false, errors: [e.message] };
        }
      },
      render_to_preview: (viewportId: string, ast: any) => {
        const viewport = this.uiComponents.get(viewportId);
        if (viewport && viewport.type === '3d-viewport') {
          // Clear and rebuild preview scene
          // TODO: Implement
        }
      },
      format_holoscript: (code: string) => code, // TODO: Use formatter
      lint_holoscript: (code: string) => [], // TODO: Use linter
      get_fps: () => 60, // TODO: Actual FPS
      get_entities: () => Array.from(this.objectMap.keys()),
      now: () => performance.now(),
    };
  }
  
  private interpretActionBody(body: unknown, context: Record<string, unknown>): unknown {
    // Simplified interpreter - in production would be more complete
    if (!body) return undefined;
    
    // For now just log what would execute
    console.log('Would execute:', body);
    return undefined;
  }
  
  private updateReactiveBindings(changedKey: string): void {
    // Update UI components bound to this state key
    this.uiComponents.forEach((component, id) => {
      if (component.type === 'text') {
        // Re-render text if bound to changed state
        // TODO: Implement reactive binding system
      }
    });
  }
  
  private handleResize(): void {
    const width = this.config.container?.clientWidth || window.innerWidth;
    const height = this.config.container?.clientHeight || window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  private handleKeyDown(event: KeyboardEvent): void {
    const handler = this.composition?.logic.keyboardHandlers.get('on_keydown');
    if (handler) {
      this.runAction(handler, [{
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
      }]);
    }
  }
  
  private handleKeyUp(event: KeyboardEvent): void {
    const handler = this.composition?.logic.keyboardHandlers.get('on_keyup');
    if (handler) {
      this.runAction(handler, [{
        key: event.key,
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
      }]);
    }
  }
  
  private clock = new THREE.Clock();
  
  /**
   * Update procedural skeleton animation based on animation type
   */
  private updateProceduralSkeleton(skelData: any, time: number): void {
    const { bones, phase, animationType, originalRotations } = skelData;
    
    // Animation parameters based on type
    const animations: Record<string, any> = {
      'idle': { speed: 1.5, amplitude: 0.05, breathing: true },
      'flexing': { speed: 2.0, amplitude: 0.3, arms: true },
      'boxing': { speed: 4.0, amplitude: 0.4, arms: true, punch: true },
      'situps': { speed: 1.5, amplitude: 0.3, spine: true },
      'bicycleCrunch': { speed: 2.0, amplitude: 0.4, spine: true, legs: true },
      'wave': { speed: 2.0, amplitude: 0.5, rightArm: true },
      'dance': { speed: 3.0, amplitude: 0.3, fullBody: true },
    };
    
    const anim = animations[animationType] || animations['idle'];
    const t = time * anim.speed + phase;
    
    // Find key bones by common naming patterns
    for (let i = 0; i < bones.length; i++) {
      const bone = bones[i];
      const name = bone.name.toLowerCase();
      const original = originalRotations[i];
      
      // Reset to original first
      bone.quaternion.copy(original);
      
      // Breathing effect on spine/chest
      if (anim.breathing && (name.includes('spine') || name.includes('chest'))) {
        const breathe = Math.sin(t * 0.8) * 0.03;
        bone.rotation.x += breathe;
      }
      
      // Full body subtle sway
      if (name.includes('hip') || name === 'root' || name === 'pelvis') {
        const sway = Math.sin(t * 0.5) * 0.02;
        bone.rotation.z += sway;
      }
      
      // Arm animations (flexing, boxing, waving)
      if (anim.arms || anim.rightArm) {
        if (name.includes('upperarm') || name.includes('upper_arm')) {
          const isRight = name.includes('right') || name.includes('_r');
          const isLeft = name.includes('left') || name.includes('_l');
          
          if (anim.punch) {
            // Boxing punch alternation
            const punchPhase = isRight ? t : t + Math.PI;
            const punch = Math.max(0, Math.sin(punchPhase)) * anim.amplitude;
            bone.rotation.x -= punch * 0.5;
            bone.rotation.z += (isRight ? -1 : 1) * punch * 0.3;
          } else if (anim.rightArm && isRight) {
            // Wave with right arm
            const wave = Math.sin(t * 2) * anim.amplitude;
            bone.rotation.z += wave;
          } else if (anim.arms) {
            // Flexing - arms up and curling
            const flex = (1 + Math.sin(t)) * 0.5 * anim.amplitude;
            bone.rotation.x -= flex * 0.8;
            bone.rotation.z += (isRight ? -1 : 1) * 0.5;
          }
        }
        
        // Forearm/elbow animation
        if (name.includes('forearm') || name.includes('lower_arm') || name.includes('lowerarm')) {
          if (anim.punch) {
            const punchPhase = name.includes('right') ? t : t + Math.PI;
            const punch = Math.max(0, Math.sin(punchPhase)) * anim.amplitude;
            bone.rotation.x -= punch * 1.2; // Elbow bend
          } else if (anim.arms) {
            const flex = (1 + Math.sin(t * 1.5)) * 0.5 * anim.amplitude;
            bone.rotation.x -= flex * 1.5; // Bicep curl motion
          }
        }
      }
      
      // Spine animations (situps, crunches)
      if (anim.spine) {
        if (name.includes('spine') && !name.includes('spine1') && !name.includes('spine2')) {
          const crunch = Math.sin(t) * anim.amplitude;
          bone.rotation.x += crunch;
        }
        if (name.includes('spine1')) {
          const crunch = Math.sin(t) * anim.amplitude * 0.7;
          bone.rotation.x += crunch;
        }
        if (name.includes('spine2')) {
          const crunch = Math.sin(t) * anim.amplitude * 0.4;
          bone.rotation.x += crunch;
        }
      }
      
      // Leg animations (bicycle crunch)
      if (anim.legs) {
        if (name.includes('thigh') || name.includes('upperleg') || name.includes('upper_leg')) {
          const isRight = name.includes('right') || name.includes('_r');
          const legPhase = isRight ? t : t + Math.PI;
          const pedal = Math.sin(legPhase) * anim.amplitude;
          bone.rotation.x -= pedal * 0.8;
        }
        if (name.includes('shin') || name.includes('lowerleg') || name.includes('lower_leg') || name.includes('calf')) {
          const isRight = name.includes('right') || name.includes('_r');
          const legPhase = isRight ? t : t + Math.PI;
          const bend = Math.max(0, Math.sin(legPhase + 0.5)) * anim.amplitude;
          bone.rotation.x += bend * 0.6;
        }
      }
      
      // Head/neck subtle movement
      if (name.includes('head') || name.includes('neck')) {
        const nod = Math.sin(t * 0.7) * 0.02;
        const tilt = Math.sin(t * 0.5) * 0.01;
        bone.rotation.x += nod;
        bone.rotation.z += tilt;
      }
    }
  }
  
  /**
   * Start a directive action (animation with reps or rest period)
   */
  private startDirectiveAction(directive: DirectiveState): void {
    const action = directive.actions[directive.currentIndex];
    const modelName = (directive.model as any).name || 'unknown';
    
    if (action.rest !== undefined) {
      // This is a rest action
      console.log(`[HoloScript] ${modelName}: resting for ${action.rest}s`);
      directive.isResting = true;
      directive.restEndTime = performance.now() + (action.rest * 1000);
      
      // Stop all current animations during rest
      directive.mixer.stopAllAction();
    } else if (action.animation) {
      // This is an animation action
      const targetReps = action.reps || 1;
      console.log(`[HoloScript] ${modelName}: ${action.animation} x${targetReps}`);
      
      // Find the animation clip
      const clip = directive.gltf.animations.find((a: THREE.AnimationClip) => 
        a.name.toLowerCase().includes(action.animation!.toLowerCase())
      ) || directive.gltf.animations[0];
      
      if (clip) {
        // Stop all current actions first
        directive.mixer.stopAllAction();
        
        // Play the animation on infinite loop - we'll count reps manually
        const animAction = directive.mixer.clipAction(clip);
        animAction.reset();
        animAction.setLoop(THREE.LoopRepeat, Infinity); // Infinite, we count manually
        animAction.play();
        
        // Track reps via loop event
        directive.currentReps = 0;
        
        const advanceToNextAction = () => {
          directive.mixer.removeEventListener('loop', onLoop);
          animAction.stop();
          
          // Move to next action
          directive.currentIndex++;
          
          if (directive.currentIndex >= directive.actions.length) {
            if (directive.loop) {
              directive.currentIndex = 0;
              console.log(`[HoloScript] ${modelName}: Directive sequence complete, restarting`);
            } else {
              console.log(`[HoloScript] ${modelName}: Directive sequence complete`);
              return;
            }
          }
          
          // Start next action
          this.startDirectiveAction(directive);
        };
        
        const onLoop = (event: any) => {
          if (event.action === animAction) {
            directive.currentReps++;
            console.log(`[HoloScript] ${modelName}: rep ${directive.currentReps}/${targetReps}`);
            
            if (directive.currentReps >= targetReps) {
              advanceToNextAction();
            }
          }
        };
        
        directive.mixer.addEventListener('loop', onLoop);
      } else {
        console.warn(`[HoloScript] ${modelName}: Animation clip not found for "${action.animation}"`);
      }
    }
  }

  public update(delta: number): void {
      if (this.isPaused) return;

      // Update physics
      this.physicsWorld.step(delta);
      
      // Update traits
      this.traitSystem.update(delta);
      
      // Update input
      this.inputManager.update();
      
      // Update animation mixers
      for (const mixer of this.animationMixers) {
        mixer.update(delta);
      }
      
      // ... procedural animations (refactored from renderLoop)
  }

  private renderLoop = (): void => {
    if (!this.isRunning) return;
    
    // If manual mode, do nothing (external loop calls update)
    if (this.config.mode === 'manual') return; 

    this.animationId = requestAnimationFrame(this.renderLoop);
    
    const delta = this.clock.getDelta();
    this.update(delta);
    
    // ... procedural animations in update() now

    // Render logic (existing)
    
    // Update procedural animations
    const time = this.clock.getElapsedTime();
    for (const obj of this.proceduralAnimatedObjects) {
      // Check if this is procedural skeleton animation
      const skelData = (obj as any)._proceduralSkeleton;
      if (skelData && (obj as any)._isProceduralSkeletonAnimated) {
        // Procedural skeleton animation - animate bones
        this.updateProceduralSkeleton(skelData, time);
      } else {
        // Simple breathing animation for non-skeleton models
        const phase = (obj as any)._breathePhase || 0;
        const baseScale = (obj as any)._baseScale;
        if (baseScale) {
          // Subtle breathing: scale oscillates ±2%
          const breathe = 1 + Math.sin(time * 2 + phase) * 0.02;
          // Subtle sway: rotate Y slightly
          const sway = Math.sin(time * 1.5 + phase) * 0.03;
          obj.scale.set(
            baseScale.x * breathe,
            baseScale.y * breathe,
            baseScale.z * breathe
          );
          obj.rotation.y = sway;
        }
      }
    }
    
    // Update patrolling objects
    for (const obj of this.patrollingObjects) {
      const patrol = (obj as any)._patrol;
      if (!patrol) continue;
      
      const target = patrol.waypoints[patrol.currentIndex];
      const direction = target.clone().sub(obj.position);
      const distance = direction.length();
      
      if (distance < 0.1) {
        // Reached waypoint, move to next
        patrol.currentIndex = (patrol.currentIndex + 1) % patrol.waypoints.length;
      } else {
        // Move towards target
        direction.normalize();
        const moveDistance = patrol.speed * delta;
        obj.position.add(direction.multiplyScalar(Math.min(moveDistance, distance)));
        
        // Face movement direction
        obj.lookAt(target.x, obj.position.y, target.z);
      }
    }
    
    // Update directive objects (action sequences with reps and rest)
    const now = performance.now();
    for (const directive of this.directiveObjects) {
      if (directive.isResting) {
        // Check if rest period is over
        if (now >= directive.restEndTime) {
          directive.isResting = false;
          directive.currentIndex++;
          
          // Check if we've completed all actions
          if (directive.currentIndex >= directive.actions.length) {
            if (directive.loop) {
              directive.currentIndex = 0;
              console.log(`[HoloScript] Directive loop restart for ${(directive.model as any).name}`);
            } else {
              continue; // Done with this directive
            }
          }
          
          this.startDirectiveAction(directive);
        }
      }
    }
    
    // Update controls
    this.controls?.update();
    
    // Execute frame handlers
    for (const handler of this.composition?.logic.frameHandlers || []) {
      this.runAction(handler, []);
    }
    
    // Render main scene
    this.renderer.render(this.scene, this.camera);
    
    // Render UI viewport previews
    this.uiComponents.forEach((component) => {
      if (component.type === '3d-viewport' && component.renderer && component.scene && component.camera) {
        component.renderer.render(component.scene, component.camera);
      }
    });
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI COMPONENT INTERFACE
// ═══════════════════════════════════════════════════════════════════════════

interface UIComponent {
  element: HTMLElement;
  type: string;
  dispose: () => void;
  [key: string]: any;
}

interface ActionContext {
  state: Record<string, unknown>;
  setState: (key: string, value: unknown) => void;
  emit: typeof emit;
  parse_holo: (code: string) => { success: boolean; ast?: any; errors?: string[] };
  render_to_preview: (viewportId: string, ast: any) => void;
  format_holoscript: (code: string) => string;
  lint_holoscript: (code: string) => unknown[];
  get_fps: () => number;
  get_entities: () => string[];
  now: () => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export function createRuntime(config: RuntimeConfig): HoloScriptRuntime {
  return new BrowserRuntime(config);
}

// For global/UMD build
if (typeof window !== 'undefined') {
  (window as any).HoloScript = {
    createRuntime,
    version: '2.1.0'
  };
}

export { BrowserRuntime };
