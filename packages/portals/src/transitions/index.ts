/**
 * @holoscript/portals - Transitions Module
 * Scene transitions, teleportation, and VR comfort features
 */

import {
  Vec3,
  Quaternion,
  Color,
  TransitionType,
  TransitionState,
  TransitionConfig,
  TransitionProgress,
  TeleportMode,
  TeleportConfig,
  TeleportRequest,
  TeleportIndicator,
  ComfortSettings,
  SceneLoadConfig,
  SceneLoadProgress,
  PortalEvent,
  PortalEventHandler,
  DEFAULT_TRANSITION_CONFIG,
  DEFAULT_TELEPORT_CONFIG,
  DEFAULT_COMFORT_SETTINGS,
  TRANSITION_PRESETS,
} from '../types';

// ============================================================================
// Easing Functions
// ============================================================================

type EasingFunction = (t: number) => number;

const EASING_FUNCTIONS: Record<string, EasingFunction> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  bounce: (t) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      const t2 = t - 1.5 / 2.75;
      return 7.5625 * t2 * t2 + 0.75;
    } else if (t < 2.5 / 2.75) {
      const t2 = t - 2.25 / 2.75;
      return 7.5625 * t2 * t2 + 0.9375;
    } else {
      const t2 = t - 2.625 / 2.75;
      return 7.5625 * t2 * t2 + 0.984375;
    }
  },
};

// ============================================================================
// Transition Manager
// ============================================================================

export class TransitionManager {
  private currentTransition: {
    id: string;
    config: TransitionConfig;
    state: TransitionState;
    startTime: number;
    progress: number;
  } | null = null;
  
  private eventHandlers: Set<PortalEventHandler> = new Set();
  private defaultConfig: TransitionConfig;
  
  constructor(defaultConfig: TransitionConfig = DEFAULT_TRANSITION_CONFIG) {
    this.defaultConfig = defaultConfig;
  }
  
  /**
   * Start a scene transition
   */
  startTransition(
    config: Partial<TransitionConfig> = {},
    sourceSceneId?: string,
    destinationSceneId?: string
  ): string {
    const id = 'transition_' + Math.random().toString(36).substring(2, 11);
    const fullConfig = { ...this.defaultConfig, ...config };
    
    this.currentTransition = {
      id,
      config: fullConfig,
      state: TransitionState.TransitionOut,
      startTime: performance.now(),
      progress: 0,
    };
    
    this.emit({ type: 'transition_started', transitionId: id, transitionType: fullConfig.type });
    
    // Trigger start sound if specified
    if (fullConfig.soundStart) {
      // Would integrate with audio system
    }
    
    // Trigger start haptics if specified
    if (fullConfig.hapticStart) {
      // Would integrate with haptics system
    }
    
    return id;
  }
  
  /**
   * Update transition progress
   */
  update(): TransitionProgress | null {
    if (!this.currentTransition) {
      return null;
    }
    
    const elapsed = performance.now() - this.currentTransition.startTime;
    const config = this.currentTransition.config;
    const duration = config.duration;
    const outDuration = duration * config.outRatio;
    
    let progress: number;
    let state: TransitionState;
    
    if (elapsed < outDuration) {
      // Transition out phase
      progress = elapsed / outDuration;
      state = TransitionState.TransitionOut;
    } else if (elapsed < duration) {
      // Transition in phase
      progress = (elapsed - outDuration) / (duration - outDuration);
      state = TransitionState.TransitionIn;
    } else {
      // Complete
      progress = 1;
      state = TransitionState.Complete;
    }
    
    // Apply easing
    const easing = EASING_FUNCTIONS[config.easing] || EASING_FUNCTIONS.linear;
    const easedProgress = easing(progress);
    
    this.currentTransition.progress = easedProgress;
    this.currentTransition.state = state;
    
    this.emit({
      type: 'transition_progress',
      transitionId: this.currentTransition.id,
      progress: easedProgress,
    });
    
    if (state === TransitionState.Complete) {
      this.completeTransition();
    }
    
    return {
      state,
      progress: easedProgress,
      elapsed,
      remaining: Math.max(0, duration - elapsed),
    };
  }
  
  /**
   * Get current transition visual parameters
   */
  getVisualParams(): {
    opacity: number;
    color: Color;
    effectIntensity: number;
    type: TransitionType;
  } | null {
    if (!this.currentTransition) return null;
    
    const { config, state, progress } = this.currentTransition;
    
    let opacity = 0;
    let effectIntensity = 0;
    
    switch (config.type) {
      case TransitionType.Cut:
        opacity = state === TransitionState.TransitionOut ? 1 : 0;
        break;
      
      case TransitionType.Fade:
      case TransitionType.DipToColor:
        if (state === TransitionState.TransitionOut) {
          opacity = progress;
        } else if (state === TransitionState.TransitionIn) {
          opacity = 1 - progress;
        } else {
          opacity = 0;
        }
        break;
      
      case TransitionType.Dissolve:
        effectIntensity = state === TransitionState.TransitionOut
          ? progress
          : 1 - progress;
        break;
      
      case TransitionType.Warp:
      case TransitionType.PortalSwirl:
        effectIntensity =
          state === TransitionState.TransitionOut
            ? progress
            : 1 - progress;
        break;
      
      case TransitionType.Vignette:
      case TransitionType.Blink:
        opacity =
          state === TransitionState.TransitionOut
            ? progress
            : 1 - progress;
        break;
      
      case TransitionType.Shrink:
        effectIntensity =
          state === TransitionState.TransitionOut
            ? 1 - progress
            : progress;
        break;
      
      default:
        opacity = 0;
    }
    
    return {
      opacity,
      color: config.color,
      effectIntensity,
      type: config.type,
    };
  }
  
  /**
   * Check if mid-transition (loading phase)
   */
  isAtMidpoint(): boolean {
    if (!this.currentTransition) return false;
    return this.currentTransition.state === TransitionState.Loading;
  }
  
  /**
   * Signal that loading is complete
   */
  onLoadComplete(): void {
    if (
      this.currentTransition &&
      this.currentTransition.state === TransitionState.Loading
    ) {
      this.currentTransition.state = TransitionState.TransitionIn;
      this.currentTransition.startTime =
        performance.now() -
        this.currentTransition.config.duration *
          this.currentTransition.config.outRatio;
    }
  }
  
  /**
   * Cancel current transition
   */
  cancel(): void {
    if (this.currentTransition) {
      this.currentTransition = null;
    }
  }
  
  /**
   * Use a preset transition
   */
  usePreset(presetName: keyof typeof TRANSITION_PRESETS): TransitionConfig {
    return { ...TRANSITION_PRESETS[presetName] };
  }
  
  private completeTransition(): void {
    if (!this.currentTransition) return;
    
    const id = this.currentTransition.id;
    const config = this.currentTransition.config;
    
    // Trigger complete sound
    if (config.soundComplete) {
      // Would integrate with audio system
    }
    
    // Trigger complete haptics
    if (config.hapticComplete) {
      // Would integrate with haptics system
    }
    
    this.emit({ type: 'transition_complete', transitionId: id });
    this.currentTransition = null;
  }
  
  // Events
  
  on(handler: PortalEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: PortalEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Transition event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Teleportation System
// ============================================================================

export class TeleportSystem {
  private config: TeleportConfig;
  private indicator: TeleportIndicator;
  private lastTeleportTime: number = 0;
  private eventHandlers: Set<PortalEventHandler> = new Set();
  
  private linecastCallback?: (
    from: Vec3,
    to: Vec3
  ) => { hit: boolean; point?: Vec3; normal?: Vec3; layer?: string };
  
  constructor(config: TeleportConfig = DEFAULT_TELEPORT_CONFIG) {
    this.config = config;
    this.indicator = {
      isVisible: false,
      targetPosition: { x: 0, y: 0, z: 0 },
      targetRotation: { x: 0, y: 0, z: 0, w: 1 },
      isValid: false,
      arcPoints: [],
    };
  }
  
  /**
   * Set linecast callback for surface detection
   */
  setLinecastCallback(
    callback: (
      from: Vec3,
      to: Vec3
    ) => { hit: boolean; point?: Vec3; normal?: Vec3; layer?: string }
  ): void {
    this.linecastCallback = callback;
  }
  
  /**
   * Update teleport indicator
   */
  updateIndicator(
    controllerPosition: Vec3,
    controllerForward: Vec3,
    controllerUp?: Vec3
  ): TeleportIndicator {
    if (!this.linecastCallback) {
      this.indicator.isVisible = false;
      return this.indicator;
    }
    
    const arcPoints: Vec3[] = [];
    const gravity = -9.8;
    const steps = 30;
    const timeStep = 0.05;
    
    let velocity: Vec3 = {
      x: controllerForward.x * 10,
      y: controllerForward.y * 10 + 5, // Add upward arc
      z: controllerForward.z * 10,
    };
    
    let position: Vec3 = { ...controllerPosition };
    let hitResult:
      | { hit: boolean; point?: Vec3; normal?: Vec3; layer?: string }
      | undefined;
    
    for (let i = 0; i < steps; i++) {
      const nextPosition: Vec3 = {
        x: position.x + velocity.x * timeStep,
        y: position.y + velocity.y * timeStep,
        z: position.z + velocity.z * timeStep,
      };
      
      arcPoints.push({ ...position });
      
      // Check for hit
      const result = this.linecastCallback(position, nextPosition);
      if (result.hit && result.point) {
        hitResult = result;
        arcPoints.push(result.point);
        break;
      }
      
      position = nextPosition;
      velocity.y += gravity * timeStep;
    }
    
    this.indicator.arcPoints = arcPoints;
    
    if (hitResult && hitResult.point) {
      const distance = Math.sqrt(
        (hitResult.point.x - controllerPosition.x) ** 2 +
        (hitResult.point.y - controllerPosition.y) ** 2 +
        (hitResult.point.z - controllerPosition.z) ** 2
      );
      
      const isValidDistance = distance <= this.config.maxDistance;
      const isValidLayer =
        !hitResult.layer ||
        this.config.validLayers.length === 0 ||
        this.config.validLayers.includes(hitResult.layer);
      
      this.indicator.isVisible = true;
      this.indicator.targetPosition = hitResult.point;
      this.indicator.isValid = isValidDistance && isValidLayer;
      
      if (!isValidDistance) {
        this.indicator.invalidReason = 'too_far';
      } else if (!isValidLayer) {
        this.indicator.invalidReason = 'invalid_layer';
      } else {
        this.indicator.invalidReason = undefined;
      }
      
      // Calculate rotation
      if (this.config.rotationMode === 'face-forward' && controllerUp) {
        // Face direction of throw
        const yaw = Math.atan2(controllerForward.x, controllerForward.z);
        this.indicator.targetRotation = {
          x: 0,
          y: Math.sin(yaw / 2),
          z: 0,
          w: Math.cos(yaw / 2),
        };
      }
    } else {
      this.indicator.isVisible = true;
      this.indicator.isValid = false;
      this.indicator.invalidReason = 'no_surface';
    }
    
    return this.indicator;
  }
  
  /**
   * Hide indicator
   */
  hideIndicator(): void {
    this.indicator.isVisible = false;
  }
  
  /**
   * Get current indicator state
   */
  getIndicator(): TeleportIndicator {
    return { ...this.indicator };
  }
  
  /**
   * Execute teleport
   */
  teleport(request?: TeleportRequest): Vec3 | null {
    const now = Date.now();
    if (now - this.lastTeleportTime < this.config.cooldown) {
      return null;
    }
    
    const targetPos = request?.position || this.indicator.targetPosition;
    const isValid = request ? true : this.indicator.isValid;
    
    if (!isValid) return null;
    
    this.lastTeleportTime = now;
    this.indicator.isVisible = false;
    
    this.emit({ type: 'teleport_started', position: targetPos });
    
    // For non-instant modes, the actual teleport would be animated
    // Here we just return the target
    
    setTimeout(() => {
      this.emit({ type: 'teleport_complete', position: targetPos });
    }, this.config.duration);
    
    return targetPos;
  }
  
  /**
   * Get teleport visual params
   */
  getTeleportMode(): TeleportMode {
    return this.config.mode;
  }
  
  /**
   * Update configuration
   */
  setConfig(config: Partial<TeleportConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  // Events
  
  on(handler: PortalEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: PortalEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Teleport event handler error:', e);
      }
    }
  }
}

// ============================================================================
// VR Comfort Manager
// ============================================================================

export class ComfortManager {
  private settings: ComfortSettings;
  private currentVignetteIntensity: number = 0;
  private lastPosition: Vec3 = { x: 0, y: 0, z: 0 };
  private velocitySmooth: number = 0;
  
  constructor(settings: ComfortSettings = DEFAULT_COMFORT_SETTINGS) {
    this.settings = settings;
  }
  
  /**
   * Update comfort effects based on movement
   */
  update(
    currentPosition: Vec3,
    deltaTime: number
  ): { vignetteIntensity: number; shouldBlink: boolean } {
    const dx = currentPosition.x - this.lastPosition.x;
    const dy = currentPosition.y - this.lastPosition.y;
    const dz = currentPosition.z - this.lastPosition.z;
    
    const velocity = Math.sqrt(dx * dx + dy * dy + dz * dz) / deltaTime;
    
    // Smooth velocity
    this.velocitySmooth = this.velocitySmooth * 0.8 + velocity * 0.2;
    
    this.lastPosition = { ...currentPosition };
    
    // Calculate vignette
    let vignette = 0;
    if (this.settings.vignetteOnMove && this.velocitySmooth > 0.1) {
      const factor = Math.min(1, this.velocitySmooth / 5);
      vignette = factor * this.settings.vignetteIntensity;
    }
    
    // Smooth vignette transition
    this.currentVignetteIntensity +=
      (vignette - this.currentVignetteIntensity) * 0.2;
    
    // Check for quick movement blink
    const shouldBlink =
      this.settings.blinkOnQuickMove &&
      this.velocitySmooth > this.settings.quickMoveThreshold;
    
    return {
      vignetteIntensity: this.currentVignetteIntensity,
      shouldBlink,
    };
  }
  
  /**
   * Get snap turn angle
   */
  getSnapTurnAngle(): number {
    return this.settings.snapTurn ? this.settings.snapTurnAngle : 0;
  }
  
  /**
   * Get smooth turn speed
   */
  getSmoothTurnSpeed(): number {
    return this.settings.snapTurn ? 0 : this.settings.smoothTurnSpeed;
  }
  
  /**
   * Get vignette parameters
   */
  getVignetteParams(): {
    intensity: number;
    radius: number;
    enabled: boolean;
  } {
    return {
      intensity: this.currentVignetteIntensity,
      radius: this.settings.vignetteRadius,
      enabled: this.settings.vignetteOnMove,
    };
  }
  
  /**
   * Is teleport-only mode
   */
  isTeleportOnly(): boolean {
    return this.settings.teleportOnly;
  }
  
  /**
   * Get seated mode offset
   */
  getSeatedModeOffset(): number {
    return this.settings.seatedModeOffset;
  }
  
  /**
   * Update settings
   */
  setSettings(settings: Partial<ComfortSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }
  
  /**
   * Get current settings
   */
  getSettings(): ComfortSettings {
    return { ...this.settings };
  }
}

// ============================================================================
// Scene Loader
// ============================================================================

export class SceneLoader {
  private currentLoad: {
    config: SceneLoadConfig;
    progress: SceneLoadProgress;
    startTime: number;
  } | null = null;
  
  private eventHandlers: Set<PortalEventHandler> = new Set();
  private loadSceneCallback?: (
    sceneId: string
  ) => Promise<{ success: boolean; error?: string }>;
  
  /**
   * Set scene loading callback
   */
  setLoadCallback(
    callback: (
      sceneId: string
    ) => Promise<{ success: boolean; error?: string }>
  ): void {
    this.loadSceneCallback = callback;
  }
  
  /**
   * Start loading a scene
   */
  async loadScene(config: SceneLoadConfig): Promise<boolean> {
    if (this.currentLoad) {
      console.warn('Scene already loading');
      return false;
    }
    
    this.currentLoad = {
      config,
      progress: {
        sceneId: config.sceneId,
        progress: 0,
        phase: 'downloading',
        bytesLoaded: 0,
        bytesTotal: 0,
        objectsCreated: 0,
        objectsTotal: 0,
      },
      startTime: performance.now(),
    };
    
    this.emit({ type: 'scene_load_started', sceneId: config.sceneId });
    
    try {
      if (this.loadSceneCallback) {
        const result = await this.loadSceneCallback(config.sceneId);
        
        if (!result.success) {
          this.emit({
            type: 'scene_load_failed',
            sceneId: config.sceneId,
            error: result.error || 'Unknown error',
          });
          this.currentLoad = null;
          return false;
        }
      }
      
      // Ensure minimum load time
      const elapsed = performance.now() - this.currentLoad.startTime;
      if (elapsed < config.minLoadTime) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.minLoadTime - elapsed)
        );
      }
      
      this.emit({ type: 'scene_load_complete', sceneId: config.sceneId });
      this.currentLoad = null;
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit({
        type: 'scene_load_failed',
        sceneId: config.sceneId,
        error: errorMessage,
      });
      this.currentLoad = null;
      return false;
    }
  }
  
  /**
   * Update progress (called externally during load)
   */
  updateProgress(progress: Partial<SceneLoadProgress>): void {
    if (this.currentLoad) {
      Object.assign(this.currentLoad.progress, progress);
      this.emit({
        type: 'scene_load_progress',
        sceneId: this.currentLoad.config.sceneId,
        progress: this.currentLoad.progress.progress,
      });
    }
  }
  
  /**
   * Get current loading progress
   */
  getProgress(): SceneLoadProgress | null {
    return this.currentLoad?.progress ?? null;
  }
  
  /**
   * Is currently loading
   */
  isLoading(): boolean {
    return this.currentLoad !== null;
  }
  
  // Events
  
  on(handler: PortalEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: PortalEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Scene loader event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export { EASING_FUNCTIONS };
