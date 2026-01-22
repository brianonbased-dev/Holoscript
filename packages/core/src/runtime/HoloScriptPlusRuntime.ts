/**
 * HoloScript+ Runtime Engine
 *
 * Executes parsed HoloScript+ AST with:
 * - Control flow (@for, @if) evaluation
 * - Lifecycle hook management
 * - VR trait integration
 * - Reactive state binding
 * - TypeScript companion integration
 *
 * @version 1.0.0
 */

import type {
  HSPlusAST,
  HSPlusNode,
  HSPlusDirective,
  HSPlusRuntime,
  HSPlusBuiltins,
  StateDeclaration,
  VRHand,
  Vector3,
  Color,
} from '../types/HoloScriptPlus';
import { ReactiveState, createState, ExpressionEvaluator } from '../state/ReactiveState';
import { VRTraitRegistry, vrTraitRegistry, TraitContext, TraitEvent } from '../traits/VRTraitSystem';

// MOCK: StateSync (to resolve cross-repo dependency for visualization)
class StateSync {
  constructor(_options?: any) {}
  getInterpolatedState(_id: string) { return null; }
}

// =============================================================================
// TYPES
// =============================================================================

type LifecycleHandler = (...args: unknown[]) => void;

interface NodeInstance {
  node: HSPlusNode;
  renderedNode: unknown; // Actual 3D object from renderer
  lifecycleHandlers: Map<string, LifecycleHandler[]>;
  children: NodeInstance[];
  parent: NodeInstance | null;
  destroyed: boolean;
}

interface RuntimeOptions {
  renderer?: Renderer;
  vrEnabled?: boolean;
  companions?: Record<string, Record<string, (...args: unknown[]) => unknown>>;
}

interface Renderer {
  createElement(type: string, properties: Record<string, unknown>): unknown;
  updateElement(element: unknown, properties: Record<string, unknown>): void;
  appendChild(parent: unknown, child: unknown): void;
  removeChild(parent: unknown, child: unknown): void;
  destroy(element: unknown): void;
}



// =============================================================================
// RUNTIME IMPLEMENTATION
// =============================================================================

class HoloScriptPlusRuntimeImpl implements HSPlusRuntime {
  private ast: HSPlusAST;
  private options: RuntimeOptions;
  private state: ReactiveState<StateDeclaration>;
  private evaluator: ExpressionEvaluator;
  private builtins: HSPlusBuiltins;
  private traitRegistry: VRTraitRegistry;
  private rootInstance: NodeInstance | null = null;
  private eventHandlers: Map<string, Set<(payload: unknown) => void>> = new Map();
  private templates: Map<string, HSPlusNode> = new Map();
  private updateLoopId: number | null = null;
  private lastUpdateTime: number = 0;
  private companions: Record<string, Record<string, (...args: unknown[]) => unknown>>;
  private networkSync: StateSync;
  private mounted: boolean = false;
  private scaleMultiplier: number = 1;

  // VR context
  public vrContext: {
    hands: { left: VRHand | null; right: VRHand | null };
    headset: { position: Vector3; rotation: Vector3 };
    controllers: { left: unknown; right: unknown };
  } = {
    hands: {
      left: null,
      right: null,
    },
    headset: {
      position: [0, 1.6, 0],
      rotation: [0, 0, 0],
    },
    controllers: {
      left: null,
      right: null,
    },
  };

  constructor(ast: HSPlusAST, options: RuntimeOptions = {}) {
    this.ast = ast;
    this.options = options;
    this.state = createState({});
    this.traitRegistry = vrTraitRegistry;
    this.companions = options.companions || {};
    this.builtins = createBuiltins(this);
    this.networkSync = new StateSync({ interpolation: true });

    // Create expression evaluator with context
    this.evaluator = new ExpressionEvaluator(
      this.state.getSnapshot(),
      this.builtins as unknown as Record<string, unknown>
    );

    // Initialize state from AST
    this.initializeState();

    // Load imports
    this.loadImports();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private initializeState(): void {
    const stateDirective = this.ast.root.directives.find((d: HSPlusDirective) => d.type === 'state');
    if (stateDirective && stateDirective.type === 'state') {
      this.state.update(stateDirective.body);
    }
  }

  private loadImports(): void {
    for (const imp of this.ast.imports) {
      // Companions should be provided via options
      if (this.companions[imp.alias]) {
        // Already loaded
        continue;
      }
      console.warn(`Import ${imp.path} not found. Provide via companions option.`);
    }
  }

  // ==========================================================================
  // MOUNTING
  // ==========================================================================

  mount(container: unknown): void {
    if (this.mounted) {
      console.warn('Runtime already mounted');
      return;
    }

    this.mounted = true;

    // Build node tree
    this.rootInstance = this.instantiateNode(this.ast.root, null);

    // Mount to container
    if (this.options.renderer && this.rootInstance) {
      this.options.renderer.appendChild(container, this.rootInstance.renderedNode);
    }

    // Call mount lifecycle
    this.callLifecycle(this.rootInstance, 'on_mount');

    // Start update loop
    this.startUpdateLoop();
  }

  unmount(): void {
    if (!this.mounted) return;

    // Stop update loop
    this.stopUpdateLoop();

    // Call unmount lifecycle
    if (this.rootInstance) {
      this.callLifecycle(this.rootInstance, 'on_unmount');
      this.destroyInstance(this.rootInstance);
    }

    this.rootInstance = null;
    this.mounted = false;
  }

  // ==========================================================================
  // NODE INSTANTIATION
  // ==========================================================================

  private instantiateNode(node: HSPlusNode, parent: NodeInstance | null): NodeInstance {
    const instance: NodeInstance = {
      node,
      renderedNode: null,
      lifecycleHandlers: new Map(),
      children: [],
      parent,
      destroyed: false,
    };

    // Process directives
    this.processDirectives(instance);

    // Create rendered element
    if (this.options.renderer) {
      const properties = this.evaluateProperties(node.properties);
      instance.renderedNode = this.options.renderer.createElement(node.type, properties);
    }

    // Attach VR traits
    for (const [traitName, config] of node.traits) {
      this.traitRegistry.attachTrait(node, traitName, config, this.createTraitContext(instance));
    }

    // Process children with control flow
    const children = this.processControlFlow(node.children, node.directives);
    for (const childNode of children) {
      const childInstance = this.instantiateNode(childNode, instance);
      instance.children.push(childInstance);

      if (this.options.renderer && instance.renderedNode) {
        this.options.renderer.appendChild(instance.renderedNode, childInstance.renderedNode);
      }
    }

    return instance;
  }

  private processDirectives(instance: NodeInstance): void {
    for (const directive of instance.node.directives) {
      if (directive.type === 'lifecycle') {
        this.registerLifecycleHandler(instance, directive);
      }
    }
  }

  private registerLifecycleHandler(instance: NodeInstance, directive: HSPlusDirective & { type: 'lifecycle' }): void {
    const { hook, params, body } = directive;

    // Create handler function
    const handler = (...args: unknown[]) => {
      // Build parameter context
      const paramContext: Record<string, unknown> = {};
      if (params) {
        params.forEach((param: string, i: number) => {
          paramContext[param] = args[i];
        });
      }

      // Evaluate body
      this.evaluator.updateContext({
        ...this.state.getSnapshot(),
        ...paramContext,
        node: instance.node,
        self: instance.node,
      });

      try {
        // Check if body looks like code or expression
        if (body.includes(';') || body.includes('{')) {
          // Execute as code block
          new Function(
            ...Object.keys(this.builtins),
            ...Object.keys(paramContext),
            'state',
            'node',
            body
          )(
            ...Object.values(this.builtins),
            ...Object.values(paramContext),
            this.state,
            instance.node
          );
        } else {
          // Evaluate as expression
          this.evaluator.evaluate(body);
        }
      } catch (error) {
        console.error(`Error in lifecycle handler ${hook}:`, error);
      }
    };

    // Register handler
    if (!instance.lifecycleHandlers.has(hook)) {
      instance.lifecycleHandlers.set(hook, []);
    }
    instance.lifecycleHandlers.get(hook)!.push(handler);
  }

  // ==========================================================================
  // CONTROL FLOW
  // ==========================================================================

  private processControlFlow(children: HSPlusNode[], directives: HSPlusDirective[]): HSPlusNode[] {
    const result: HSPlusNode[] = [];

    // Process control flow directives
    for (const directive of directives) {
      if (directive.type === 'for') {
        const items = this.evaluateExpression(directive.iterable);
        if (Array.isArray(items)) {
          items.forEach((item, index) => {
            // Create context for each iteration
            const iterContext = {
              [directive.variable]: item,
              index,
              first: index === 0,
              last: index === items.length - 1,
              even: index % 2 === 0,
              odd: index % 2 !== 0,
            };

            // Clone and process body nodes
            for (const bodyNode of directive.body) {
              const cloned = this.cloneNodeWithContext(bodyNode, iterContext);
              result.push(cloned);
            }
          });
        }
      } else if (directive.type === 'forEach') {
        // @forEach item in collection { ... }
        const items = this.evaluateExpression(directive.collection);
        if (Array.isArray(items)) {
          items.forEach((item, index) => {
            const iterContext = {
              [directive.variable]: item,
              index,
              first: index === 0,
              last: index === items.length - 1,
              even: index % 2 === 0,
              odd: index % 2 !== 0,
            };

            for (const bodyNode of directive.body) {
              const cloned = this.cloneNodeWithContext(bodyNode, iterContext);
              result.push(cloned);
            }
          });
        }
      } else if (directive.type === 'while') {
        // @while condition { ... }
        // Runtime evaluation - expand once at instantiation time
        // Note: For true reactive while loops, this would need re-evaluation on state change
        const MAX_ITERATIONS = 1000; // Safety limit
        let iterations = 0;

        while (iterations < MAX_ITERATIONS) {
          const condition = this.evaluateExpression(directive.condition);
          if (!condition) break;

          const iterContext = {
            iteration: iterations,
            index: iterations,
          };

          for (const bodyNode of directive.body) {
            const cloned = this.cloneNodeWithContext(bodyNode, iterContext);
            result.push(cloned);
          }

          iterations++;
        }

        if (iterations >= MAX_ITERATIONS) {
          console.warn('@while loop hit maximum iteration limit (1000)');
        }
      } else if (directive.type === 'if') {
        const condition = this.evaluateExpression(directive.condition);
        if (condition) {
          result.push(...directive.body);
        } else if (directive.else) {
          result.push(...directive.else);
        }
      }
    }

    // Add regular children
    result.push(...children);

    return result;
  }

  private cloneNodeWithContext(node: HSPlusNode, context: Record<string, unknown>): HSPlusNode {
    // Deep clone the node
    const cloned: HSPlusNode = {
      type: node.type,
      id: node.id ? this.interpolateString(node.id, context) : undefined,
      properties: this.interpolateProperties(node.properties, context),
      directives: [...node.directives],
      children: node.children.map((child: HSPlusNode) => this.cloneNodeWithContext(child, context)),
      traits: new Map(node.traits),
      loc: node.loc,
    };

    return cloned;
  }

  private interpolateString(str: string, context: Record<string, unknown>): string {
    return str.replace(/\$\{([^}]+)\}/g, (_match, expr) => {
      this.evaluator.updateContext(context);
      const value = this.evaluator.evaluate(expr);
      return String(value ?? '');
    });
  }

  private interpolateProperties(
    properties: Record<string, unknown>,
    context: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateString(value, context);
      } else if (value && typeof value === 'object' && '__expr' in (value as object)) {
        this.evaluator.updateContext(context);
        result[key] = this.evaluator.evaluate((value as { __raw: string }).__raw);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // ==========================================================================
  // EXPRESSION EVALUATION
  // ==========================================================================

  private evaluateExpression(expr: string): unknown {
    this.evaluator.updateContext(this.state.getSnapshot());
    return this.evaluator.evaluate(expr);
  }

  private evaluateProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(properties)) {
      if (value && typeof value === 'object' && '__expr' in value) {
        result[key] = this.evaluateExpression((value as unknown as { __raw: string }).__raw);
      } else if (value && typeof value === 'object' && '__ref' in value) {
        // Reference to state or companion
        const ref = (value as { __ref: string }).__ref;
        result[key] = this.state.get(ref as keyof StateDeclaration) ?? ref;
      } else if (typeof value === 'string' && value.includes('${')) {
        // String interpolation
        result[key] = this.interpolateString(value, this.state.getSnapshot());
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  private callLifecycle(instance: NodeInstance | null, hook: string, ...args: unknown[]): void {
    if (!instance || instance.destroyed) return;

    const handlers = instance.lifecycleHandlers.get(hook);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in lifecycle ${hook}:`, error);
        }
      });
    }

    // Recurse to children
    for (const child of instance.children) {
      this.callLifecycle(child, hook, ...args);
    }
  }

  // ==========================================================================
  // UPDATE LOOP
  // ==========================================================================

  private startUpdateLoop(): void {
    this.lastUpdateTime = performance.now();

    const update = () => {
      const now = performance.now();
      const delta = (now - this.lastUpdateTime) / 1000; // Convert to seconds
      this.lastUpdateTime = now;

      this.update(delta);

      this.updateLoopId = requestAnimationFrame(update);
    };

    this.updateLoopId = requestAnimationFrame(update);
  }

  private stopUpdateLoop(): void {
    if (this.updateLoopId !== null) {
      cancelAnimationFrame(this.updateLoopId);
      this.updateLoopId = null;
    }
  }

  public update(delta: number): void {
    if (!this.rootInstance) return;

    // Update all instances
    this.updateInstance(this.rootInstance, delta);

    // Call update lifecycle
    this.callLifecycle(this.rootInstance, 'on_update', delta);
  }

  private updateInstance(instance: NodeInstance, delta: number): void {
    if (instance.destroyed) return;

    // Update VR traits
    const traitContext = this.createTraitContext(instance);
    this.traitRegistry.updateAllTraits(instance.node, traitContext, delta);

    // Sync Avatar Body Parts
    if (instance.node.type === 'avatar') {
      this.syncAvatarParts(instance);
    }

    // Apply Networking Sync
    if (instance.node.traits.has('networked')) {
      const interpolated = this.networkSync.getInterpolatedState(instance.node.id || '') as any;
      if (interpolated) {
        if (interpolated.position) {
          instance.node.properties.position = [interpolated.position.x, interpolated.position.y, interpolated.position.z];
        }
        if (interpolated.rotation) {
          instance.node.properties.rotation = [interpolated.rotation.x, interpolated.rotation.y, interpolated.rotation.z];
        }
      }
    }

    // Update rendered element if properties changed
    if (this.options.renderer && instance.renderedNode) {
      const properties = this.evaluateProperties(instance.node.properties);
      this.options.renderer.updateElement(instance.renderedNode, properties);
    }

    // Update children
    for (const child of instance.children) {
      this.updateInstance(child, delta);
    }

    // Update @external_api polling
    this.updateExternalApis(instance, delta);

    // Process @generate requests
    this.processGenerateDirectives(instance);
  }

  private syncAvatarParts(instance: NodeInstance): void {
    const vrHands = this.vrContext.hands;
    const vrHead = this.vrContext.headset;

    // Local player avatar sync
    if (instance.node.id === 'local_player') {
      instance.node.properties.position = vrHead.position;
      instance.node.properties.rotation = vrHead.rotation;
      
      // Update children (hands)
      instance.children.forEach(child => {
        if (child.node.id === 'left_hand' && vrHands.left) {
          child.node.properties.position = vrHands.left.position;
          child.node.properties.rotation = vrHands.left.rotation;
        } else if (child.node.id === 'right_hand' && vrHands.right) {
          child.node.properties.position = vrHands.right.position;
          child.node.properties.rotation = vrHands.right.rotation;
        }
      });

      // Broadcast if networked
      if (instance.node.traits.has('networked')) {
        (this as any).emit('network_snapshot', {
          objectId: instance.node.id,
          position: { x: vrHead.position[0], y: vrHead.position[1], z: vrHead.position[2] },
          rotation: { x: vrHead.rotation[0], y: vrHead.rotation[1], z: vrHead.rotation[2] },
          timestamp: Date.now()
        });
      }
    }
  }

  private generatedNodes: Set<string> = new Set();

  private processGenerateDirectives(instance: NodeInstance): void {
    const generateDirectives = instance.node.directives.filter(d => d.type === 'generate');
    
    for (const d of generateDirectives) {
      const directive: any = d;
      const genId = `${instance.node.id || 'node'}_${directive.prompt.substring(0, 10)}`;
      
      if (this.generatedNodes.has(genId)) continue;

      console.log(`[Generate] AI Bridge Request: "${directive.prompt}"`);
      
      // Emit request for external agent/bridge to handle
      (this as any).emit('generate_request', {
        id: genId,
        nodeId: instance.node.id,
        prompt: directive.prompt,
        context: directive.context,
        target: directive.target || 'children',
      });

      this.generatedNodes.add(genId);
    }
  }

  private apiPollingTimers: Map<NodeInstance, number> = new Map();

  private updateExternalApis(instance: NodeInstance, _delta: number): void {
    const apiDirectives = instance.node.directives.filter(d => d.type === 'external_api');
    
    for (const d of apiDirectives) {
      const directive: any = d;
      if (directive.type !== 'external_api') continue;
      
      const intervalStr = directive.interval || '0s';
      const intervalMs = this.parseDurationToMs(intervalStr);
      
      if (intervalMs <= 0) continue;

      let lastTime = this.apiPollingTimers.get(instance) || 0;
      const now = performance.now();
      
      if (now - lastTime >= intervalMs) {
        this.apiPollingTimers.set(instance, now);
        this.executeExternalApi(instance, directive);
      }
    }
  }

  private async executeExternalApi(instance: NodeInstance, directive: any): Promise<void> {
    try {
      const data = await this.builtins.api_call(directive.url, directive.method || 'GET');
      
      // Update state if needed or trigger logic
      this.state.set('api_data', data);
      
      // Trigger update on instance
      this.updateData(data);
    } catch (error) {
      console.error(`External API error for ${directive.url}:`, error);
    }
  }

  private parseDurationToMs(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m)$/);
    if (!match) return 0;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 'ms': return value;
      case 's': return value * 1000;
      case 'm': return value * 60000;
      default: return 0;
    }
  }

  // ==========================================================================
  // TRAIT CONTEXT
  // ==========================================================================

  private createTraitContext(_instance: NodeInstance): TraitContext {
    return {
      vr: {
        hands: this.vrContext.hands,
        headset: this.vrContext.headset,
        getPointerRay: (hand) => {
          const vrHand = hand === 'left' ? this.vrContext.hands.left : this.vrContext.hands.right;
          if (!vrHand) return null;
          return {
            origin: vrHand.position,
            direction: [0, 0, -1], // Forward direction - should be calculated from rotation
          };
        },
        getDominantHand: () => this.vrContext.hands.right || this.vrContext.hands.left,
      },
      physics: {
        applyVelocity: (node, velocity) => {
          this.emit('apply_velocity', { node, velocity });
        },
        applyAngularVelocity: (node, angularVelocity) => {
          this.emit('apply_angular_velocity', { node, angularVelocity });
        },
        setKinematic: (node, kinematic) => {
          this.emit('set_kinematic', { node, kinematic });
        },
        raycast: (_origin, _direction, _maxDistance) => {
          // Would need physics engine integration
          return null;
        },
      },
      audio: {
        playSound: (source, options) => {
          this.emit('play_sound', { source, ...options });
        },
      },
      haptics: {
        pulse: (hand, intensity, duration) => {
          this.emit('haptic', { hand, intensity, duration, type: 'pulse' });
        },
        rumble: (hand, intensity) => {
          this.emit('haptic', { hand, intensity, type: 'rumble' });
        },
      },
      emit: this.emit.bind(this),
      getState: () => this.state.getSnapshot(),
      setState: (updates) => this.state.update(updates),
      getScaleMultiplier: () => this.scaleMultiplier,
      setScaleContext: (magnitude: string) => {
        const multipliers: Record<string, number> = {
          'galactic': 1000000,
          'macro': 1000,
          'standard': 1,
          'micro': 0.001,
          'atomic': 0.000001
        };
        const newMultiplier = multipliers[magnitude] || 1;
        if (this.scaleMultiplier !== newMultiplier) {
          this.scaleMultiplier = newMultiplier;
          this.emit('scale_change', { magnitude, multiplier: newMultiplier });
        }
      },
    };
  }

  // ==========================================================================
  // NODE DESTRUCTION
  // ==========================================================================

  private destroyInstance(instance: NodeInstance): void {
    if (instance.destroyed) return;

    instance.destroyed = true;

    // Destroy children first
    for (const child of instance.children) {
      this.destroyInstance(child);
    }

    // Detach traits
    const traitContext = this.createTraitContext(instance);
    for (const traitName of instance.node.traits.keys()) {
      this.traitRegistry.detachTrait(instance.node, traitName, traitContext);
    }

    // Destroy rendered element
    if (this.options.renderer && instance.renderedNode) {
      this.options.renderer.destroy(instance.renderedNode);
    }

    // Clear handlers
    instance.lifecycleHandlers.clear();
    instance.children = [];
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  updateData(data: unknown): void {
    this.state.set('data', data);
    this.callLifecycle(this.rootInstance, 'on_data_update', data);
  }

  getState(): StateDeclaration {
    return this.state.getSnapshot();
  }

  // ==========================================================================
  // COMPATIBILITY METHODS
  // ==========================================================================

  getVariable(name: string): unknown {
    return this.state.get(name as keyof StateDeclaration);
  }

  setVariable(name: string, value: unknown): void {
    this.state.set(name as keyof StateDeclaration, value);
  }

  getContext(): any {
    // Legacy mapping for context inspection
    const spatialMemory = new Map<string, any>();
    const hologramState = new Map<string, any>();

    const traverse = (instance: NodeInstance) => {
      if (instance.node.id) {
        spatialMemory.set(instance.node.id, instance.node.properties.position || { x: 0, y: 0, z: 0 });
        hologramState.set(instance.node.id, {
          shape: instance.node.properties.shape || instance.node.type,
          color: instance.node.properties.color,
          size: instance.node.properties.size,
          glow: instance.node.properties.glow,
          interactive: instance.node.properties.interactive,
        });
      }
      instance.children.forEach(traverse);
    };

    if (this.rootInstance) traverse(this.rootInstance);

    return {
      spatialMemory,
      hologramState,
      state: this.state,
      builtins: this.builtins,
      vr: this.vrContext,
    };
  }

  reset(): void {
    this.unmount();
    this.state = createState({});
    this.mounted = false;
  }

  updateAnimations(): void {
    this.update(1 / 60);
  }

  updateParticles(delta: number): void {
    this.update(delta);
  }

  getHologramStates(): Map<string, any> {
    return this.getContext().hologramState;
  }

  setState(updates: Partial<StateDeclaration>): void {
    this.state.update(updates);
  }

  emit(event: string, payload?: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  updateEntity(id: string, properties: Partial<Record<string, unknown>>): boolean {
    if (!this.rootInstance) return false;

    let found = false;
    const traverse = (instance: NodeInstance) => {
      if (instance.node.id === id) {
        instance.node.properties = { ...instance.node.properties, ...properties };
        // If we have a renderer, notify it of the change
        if (this.options.renderer && instance.renderedNode) {
          this.options.renderer.updateElement(instance.renderedNode, properties);
        }
        found = true;
      }
      instance.children.forEach(traverse);
    };

    traverse(this.rootInstance);
    return found;
  }

  on(event: string, handler: (payload: unknown) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  // ==========================================================================
  // VR INTEGRATION
  // ==========================================================================

  updateVRContext(context: typeof this.vrContext): void {
    this.vrContext = context;
  }

  handleVREvent(event: TraitEvent, node: HSPlusNode): void {
    // Find instance for node
    const instance = this.findInstance(node);
    if (!instance) return;

    // Dispatch to traits
    const traitContext = this.createTraitContext(instance);
    this.traitRegistry.handleEventForAllTraits(node, traitContext, event);

    // Call lifecycle hooks based on event type
    const hookMapping: Record<string, string> = {
      grab_start: 'on_grab',
      grab_end: 'on_release',
      hover_enter: 'on_hover_enter',
      hover_exit: 'on_hover_exit',
      point_enter: 'on_point_enter',
      point_exit: 'on_point_exit',
      collision: 'on_collision',
      trigger_enter: 'on_trigger_enter',
      trigger_exit: 'on_trigger_exit',
      click: 'on_click',
    };

    const hook = hookMapping[event.type];
    if (hook) {
      this.callLifecycle(instance, hook, event);
    }
  }

  private findInstance(node: HSPlusNode, root: NodeInstance | null = this.rootInstance): NodeInstance | null {
    if (!root) return null;
    if (root.node === node) return root;

    for (const child of root.children) {
      const found = this.findInstance(node, child);
      if (found) return found;
    }

    return null;
  }

  // ==========================================================================
  // TEMPLATES & SPAWNING
  // ==========================================================================

  registerTemplate(name: string, node: HSPlusNode): void {
    this.templates.set(name, node);
  }

  spawnTemplate(name: string, position: Vector3): HSPlusNode {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Template "${name}" not found`);
    }

    // Clone template
    const cloned = this.cloneNodeWithContext(template, { position });
    cloned.properties.position = position;

    // Instantiate
    if (this.rootInstance) {
      const instance = this.instantiateNode(cloned, this.rootInstance);
      this.rootInstance.children.push(instance);

      if (this.options.renderer && this.rootInstance.renderedNode) {
        this.options.renderer.appendChild(this.rootInstance.renderedNode, instance.renderedNode);
      }

      this.callLifecycle(instance, 'on_mount');
    }

    return cloned;
  }

  destroyNode(node: HSPlusNode): void {
    const instance = this.findInstance(node);
    if (!instance) return;

    // Call unmount
    this.callLifecycle(instance, 'on_unmount');

    // Remove from parent
    if (instance.parent) {
      const index = instance.parent.children.indexOf(instance);
      if (index > -1) {
        instance.parent.children.splice(index, 1);
      }

      if (this.options.renderer && instance.parent.renderedNode && instance.renderedNode) {
        this.options.renderer.removeChild(instance.parent.renderedNode, instance.renderedNode);
      }
    }

    // Destroy
    this.destroyInstance(instance);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createRuntime(
  ast: HSPlusAST,
  options?: RuntimeOptions
): HSPlusRuntime {
  return new HoloScriptPlusRuntimeImpl(ast, options);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { HoloScriptPlusRuntimeImpl };
export type { RuntimeOptions, Renderer, NodeInstance };

// =============================================================================
// BUILT-IN FUNCTIONS
// =============================================================================

function createBuiltins(runtime: HoloScriptPlusRuntimeImpl): HSPlusBuiltins {
  return {
    Math,

    range: (start: number, end: number, step: number = 1): number[] => {
      const result: number[] = [];
      if (step > 0) {
        for (let i = start; i < end; i += step) {
          result.push(i);
        }
      } else if (step < 0) {
        for (let i = start; i > end; i += step) {
          result.push(i);
        }
      }
      return result;
    },

    interpolate_color: (t: number, from: Color, to: Color): Color => {
      // Parse hex colors
      const parseHex = (hex: string): [number, number, number] => {
        const clean = hex.replace('#', '');
        return [
          parseInt(clean.substring(0, 2), 16),
          parseInt(clean.substring(2, 4), 16),
          parseInt(clean.substring(4, 6), 16),
        ];
      };

      const toHex = (r: number, g: number, b: number): string => {
        const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
        return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
      };

      const [r1, g1, b1] = parseHex(from);
      const [r2, g2, b2] = parseHex(to);

      return toHex(
        r1 + (r2 - r1) * t,
        g1 + (g2 - g1) * t,
        b1 + (b2 - b1) * t
      );
    },

    distance_to: (point: Vector3): number => {
      const viewer = runtime.vrContext.headset.position;
      return Math.sqrt(
        Math.pow(point[0] - viewer[0], 2) +
        Math.pow(point[1] - viewer[1], 2) +
        Math.pow(point[2] - viewer[2], 2)
      );
    },

    distance_to_viewer: (): number => {
      return 0; // Override in node context
    },

    hand_position: (handId: string): Vector3 => {
      const hand = handId === 'left' ? runtime.vrContext.hands.left : runtime.vrContext.hands.right;
      return hand?.position || [0, 0, 0];
    },

    hand_velocity: (handId: string): Vector3 => {
      const hand = handId === 'left' ? runtime.vrContext.hands.left : runtime.vrContext.hands.right;
      return hand?.velocity || [0, 0, 0];
    },

    dominant_hand: (): VRHand => {
      // Default to right hand
      return runtime.vrContext.hands.right || runtime.vrContext.hands.left || {
        id: 'right',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        velocity: [0, 0, 0],
        grip: 0,
        trigger: 0,
      };
    },

    play_sound: (source: string, options?: { volume?: number; spatial?: boolean }): void => {
      runtime.emit('play_sound', { source, ...options });
    },

    haptic_feedback: (hand: VRHand | string, intensity: number): void => {
      const handId = typeof hand === 'string' ? hand : hand.id;
      runtime.emit('haptic', { hand: handId, intensity });
    },

    haptic_pulse: (intensity: number): void => {
      runtime.emit('haptic', { hand: 'both', intensity });
    },

    apply_velocity: (node: HSPlusNode, velocity: Vector3): void => {
      runtime.emit('apply_velocity', { node, velocity });
    },

    spawn: (template: string, position: Vector3): HSPlusNode => {
      return runtime.spawnTemplate(template, position);
    },

    assistant_generate: (prompt: string, context?: string): void => {
      runtime.emit('assistant_generate', { prompt, context });
    },

    destroy: (node: HSPlusNode): void => {
      runtime.destroyNode(node);
    },

    api_call: async (url: string, method: string, body?: unknown): Promise<unknown> => {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json();
    },

    open_modal: (modalId: string): void => {
      runtime.emit('open_modal', { id: modalId });
    },

    close_modal: (modalId: string): void => {
      runtime.emit('close_modal', { id: modalId });
    },

    setTimeout: (callback: () => void, delay: number): number => {
      return window.setTimeout(callback, delay) as unknown as number;
    },

    clearTimeout: (id: number): void => {
      window.clearTimeout(id);
    },
  };
}
