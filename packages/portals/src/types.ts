/**
 * @holoscript/portals - Type Definitions
 * VR portal and scene transition system
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quaternion;
  scale: Vec3;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ============================================================================
// Portal Types
// ============================================================================

export enum PortalType {
  /** Visual portal showing another location */
  Visual = 'visual',
  /** Teleport trigger only (no visual) */
  Teleport = 'teleport',
  /** Full scene transition */
  SceneTransition = 'scene_transition',
  /** Same-scene portal (for large environments) */
  SameScene = 'same_scene',
  /** Networked portal (cross-server/instance) */
  Networked = 'networked',
}

export enum PortalShape {
  /** Rectangular */
  Rectangle = 'rectangle',
  /** Circular/elliptical */
  Ellipse = 'ellipse',
  /** Arbitrary mesh */
  Custom = 'custom',
}

export interface PortalConfig {
  /** Portal type */
  type: PortalType;
  /** Portal shape */
  shape: PortalShape;
  /** Portal dimensions (width, height for rectangle; radii for ellipse) */
  size: { width: number; height: number };
  /** Custom mesh reference (for custom shape) */
  customMeshRef?: string;
  /** Render the destination scene in the portal surface */
  renderDestination: boolean;
  /** Render resolution multiplier (0.25-1.0) */
  renderScale: number;
  /** Max render distance into destination */
  renderDepth: number;
  /** Enable recursive portal rendering */
  recursiveRender: boolean;
  /** Max recursion depth */
  maxRecursion: number;
  /** Portal border/frame color */
  borderColor: Color;
  /** Border thickness */
  borderWidth: number;
  /** Glow effect intensity */
  glowIntensity: number;
  /** Audio pass-through enabled */
  audioPassthrough: boolean;
  /** Audio attenuation factor */
  audioAttenuation: number;
}

export interface PortalDestination {
  /** Destination scene ID (for SceneTransition) */
  sceneId?: string;
  /** Destination position */
  position: Vec3;
  /** Destination rotation */
  rotation: Quaternion;
  /** Destination spawn offset from portal */
  spawnOffset: Vec3;
  /** Maintain relative orientation */
  preserveOrientation: boolean;
  /** Maintain velocity through portal */
  preserveVelocity: boolean;
  /** Scale factor when exiting */
  scaleMultiplier: number;
  /** Server/instance URL (for networked) */
  serverUrl?: string;
  /** Room/instance ID (for networked) */
  instanceId?: string;
}

export interface Portal {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Portal transform */
  transform: Transform;
  /** Configuration */
  config: PortalConfig;
  /** Destination */
  destination: PortalDestination;
  /** Is portal active */
  isActive: boolean;
  /** Is portal open (can be traversed) */
  isOpen: boolean;
  /** Linked portal ID (bidirectional) */
  linkedPortalId?: string;
  /** Cooldown between traversals (ms) */
  cooldown: number;
  /** Last traversal time */
  lastTraversalTime: number;
  /** Access control list (empty = public) */
  allowedUsers: string[];
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// Portal Pair (Bidirectional)
// ============================================================================

export interface PortalPair {
  /** Pair ID */
  id: string;
  /** First portal */
  portalA: Portal;
  /** Second portal */
  portalB: Portal;
  /** Is bidirectional */
  bidirectional: boolean;
  /** Shared visual style */
  sharedStyle: boolean;
}

// ============================================================================
// Transition Types
// ============================================================================

export enum TransitionType {
  /** Instant cut */
  Cut = 'cut',
  /** Fade to black then fade in */
  Fade = 'fade',
  /** Cross-dissolve between scenes */
  Dissolve = 'dissolve',
  /** Dip to color then reveal */
  DipToColor = 'dip_to_color',
  /** Zoom/warp effect */
  Warp = 'warp',
  /** VR comfort vignette */
  Vignette = 'vignette',
  /** Blink effect */
  Blink = 'blink',
  /** Portal swirl */
  PortalSwirl = 'portal_swirl',
  /** Room-scale shrink */
  Shrink = 'shrink',
  /** Custom shader */
  Custom = 'custom',
}

export enum TransitionState {
  /** Not transitioning */
  Idle = 'idle',
  /** Transition starting (out) */
  TransitionOut = 'transition_out',
  /** Loading destination */
  Loading = 'loading',
  /** Transition ending (in) */
  TransitionIn = 'transition_in',
  /** Complete */
  Complete = 'complete',
}

export interface TransitionConfig {
  /** Transition type */
  type: TransitionType;
  /** Total duration (ms) */
  duration: number;
  /** Out phase duration ratio (0-1) */
  outRatio: number;
  /** Easing function name */
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
  /** Color for fade/dip effects */
  color: Color;
  /** Custom shader reference */
  customShaderRef?: string;
  /** Shader uniforms */
  shaderUniforms?: Record<string, number | Vec3 | Color>;
  /** Sound effect on start */
  soundStart?: string;
  /** Sound effect on complete */
  soundComplete?: string;
  /** Haptic feedback on start */
  hapticStart?: boolean;
  /** Haptic feedback on complete */
  hapticComplete?: boolean;
}

export interface TransitionProgress {
  /** Current state */
  state: TransitionState;
  /** Progress (0-1) */
  progress: number;
  /** Time elapsed (ms) */
  elapsed: number;
  /** Time remaining (ms) */
  remaining: number;
  /** Source scene ID */
  sourceSceneId?: string;
  /** Destination scene ID */
  destinationSceneId?: string;
}

// ============================================================================
// Scene Loading
// ============================================================================

export interface SceneLoadConfig {
  /** Scene ID to load */
  sceneId: string;
  /** Additive loading (keep current scene) */
  additive: boolean;
  /** Preload assets before transition */
  preload: boolean;
  /** Show loading screen */
  showLoadingScreen: boolean;
  /** Loading screen type */
  loadingScreenType: 'default' | 'minimal' | 'custom';
  /** Custom loading screen prefab */
  customLoadingScreen?: string;
  /** Minimum loading time (for smooth transitions) */
  minLoadTime: number;
  /** Timeout before failure (ms) */
  timeout: number;
}

export interface SceneLoadProgress {
  /** Scene ID */
  sceneId: string;
  /** Overall progress (0-1) */
  progress: number;
  /** Current phase */
  phase: 'downloading' | 'parsing' | 'creating' | 'initializing';
  /** Bytes loaded */
  bytesLoaded: number;
  /** Total bytes */
  bytesTotal: number;
  /** Objects created */
  objectsCreated: number;
  /** Total objects */
  objectsTotal: number;
}

// ============================================================================
// Teleportation
// ============================================================================

export enum TeleportMode {
  /** Instant position change */
  Instant = 'instant',
  /** Fade out/in */
  Fade = 'fade',
  /** Dash/slide to destination */
  Dash = 'dash',
  /** Comfort blink */
  Blink = 'blink',
  /** Parabolic arc indicator */
  Arc = 'arc',
}

export interface TeleportConfig {
  /** Teleport mode */
  mode: TeleportMode;
  /** Transition duration (ms) */
  duration: number;
  /** Fade color (for fade mode) */
  fadeColor: Color;
  /** Dash speed (for dash mode) */
  dashSpeed: number;
  /** Show destination indicator */
  showIndicator: boolean;
  /** Indicator color */
  indicatorColor: Color;
  /** Valid surface layers */
  validLayers: string[];
  /** Max teleport distance */
  maxDistance: number;
  /** Require line of sight */
  requireLineOfSight: boolean;
  /** Snap to navigation mesh */
  snapToNavMesh: boolean;
  /** Rotation mode on teleport */
  rotationMode: 'maintain' | 'face-forward' | 'face-indicator';
  /** Cooldown between teleports (ms) */
  cooldown: number;
}

export interface TeleportRequest {
  /** Destination position */
  position: Vec3;
  /** Destination rotation (optional) */
  rotation?: Quaternion;
  /** Use fade transition */
  useFade: boolean;
  /** Override config */
  config?: Partial<TeleportConfig>;
}

export interface TeleportIndicator {
  /** Is indicator visible */
  isVisible: boolean;
  /** Current target position */
  targetPosition: Vec3;
  /** Target rotation */
  targetRotation: Quaternion;
  /** Is valid destination */
  isValid: boolean;
  /** Invalid reason */
  invalidReason?: 'too_far' | 'no_surface' | 'blocked' | 'invalid_layer';
  /** Arc points (for parabolic mode) */
  arcPoints: Vec3[];
}

// ============================================================================
// VR Comfort
// ============================================================================

export interface ComfortSettings {
  /** Enable vignette during movement */
  vignetteOnMove: boolean;
  /** Vignette intensity (0-1) */
  vignetteIntensity: number;
  /** Vignette radius (0-1) */
  vignetteRadius: number;
  /** Enable snap turn */
  snapTurn: boolean;
  /** Snap turn angle (degrees) */
  snapTurnAngle: number;
  /** Smooth turn speed (degrees/sec) */
  smoothTurnSpeed: number;
  /** Teleport only (no smooth locomotion) */
  teleportOnly: boolean;
  /** Blink on quick movements */
  blinkOnQuickMove: boolean;
  /** Quick move threshold (m/s) */
  quickMoveThreshold: number;
  /** Height adjustment enabled */
  heightAdjustment: boolean;
  /** Seated mode offset */
  seatedModeOffset: number;
}

// ============================================================================
// Events
// ============================================================================

export type PortalEvent =
  | { type: 'portal_created'; portalId: string }
  | { type: 'portal_destroyed'; portalId: string }
  | { type: 'portal_activated'; portalId: string }
  | { type: 'portal_deactivated'; portalId: string }
  | { type: 'portal_entered'; portalId: string; userId: string }
  | { type: 'portal_exited'; portalId: string; userId: string }
  | { type: 'portal_traversed'; portalId: string; userId: string; destinationSceneId?: string }
  | { type: 'transition_started'; transitionId: string; transitionType: TransitionType }
  | { type: 'transition_progress'; transitionId: string; progress: number }
  | { type: 'transition_complete'; transitionId: string }
  | { type: 'scene_load_started'; sceneId: string }
  | { type: 'scene_load_progress'; sceneId: string; progress: number }
  | { type: 'scene_load_complete'; sceneId: string }
  | { type: 'scene_load_failed'; sceneId: string; error: string }
  | { type: 'teleport_started'; position: Vec3 }
  | { type: 'teleport_complete'; position: Vec3 };

export type PortalEventHandler = (event: PortalEvent) => void;

// ============================================================================
// Manager Config
// ============================================================================

export interface PortalManagerConfig {
  /** Maximum concurrent portal renders */
  maxConcurrentPortalRenders: number;
  /** Default portal config */
  defaultPortalConfig: Partial<PortalConfig>;
  /** Default transition config */
  defaultTransitionConfig: TransitionConfig;
  /** Default teleport config */
  defaultTeleportConfig: TeleportConfig;
  /** Comfort settings */
  comfort: ComfortSettings;
  /** Enable networked portals */
  enableNetworkedPortals: boolean;
  /** Portal render update rate (Hz) */
  portalRenderRate: number;
}

export const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  type: PortalType.Visual,
  shape: PortalShape.Ellipse,
  size: { width: 2, height: 2.5 },
  renderDestination: true,
  renderScale: 0.5,
  renderDepth: 20,
  recursiveRender: false,
  maxRecursion: 1,
  borderColor: { r: 0.3, g: 0.6, b: 1.0, a: 1.0 },
  borderWidth: 0.05,
  glowIntensity: 0.5,
  audioPassthrough: true,
  audioAttenuation: 0.5,
};

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  type: TransitionType.Fade,
  duration: 1000,
  outRatio: 0.4,
  easing: 'ease-in-out',
  color: { r: 0, g: 0, b: 0, a: 1 },
  hapticStart: true,
  hapticComplete: true,
};

export const DEFAULT_TELEPORT_CONFIG: TeleportConfig = {
  mode: TeleportMode.Blink,
  duration: 150,
  fadeColor: { r: 0, g: 0, b: 0, a: 1 },
  dashSpeed: 15,
  showIndicator: true,
  indicatorColor: { r: 0.2, g: 0.8, b: 0.4, a: 0.8 },
  validLayers: ['ground', 'floor', 'walkable'],
  maxDistance: 20,
  requireLineOfSight: true,
  snapToNavMesh: true,
  rotationMode: 'maintain',
  cooldown: 200,
};

export const DEFAULT_COMFORT_SETTINGS: ComfortSettings = {
  vignetteOnMove: true,
  vignetteIntensity: 0.5,
  vignetteRadius: 0.4,
  snapTurn: true,
  snapTurnAngle: 45,
  smoothTurnSpeed: 90,
  teleportOnly: false,
  blinkOnQuickMove: true,
  quickMoveThreshold: 3,
  heightAdjustment: true,
  seatedModeOffset: 0,
};

export const DEFAULT_PORTAL_MANAGER_CONFIG: PortalManagerConfig = {
  maxConcurrentPortalRenders: 2,
  defaultPortalConfig: DEFAULT_PORTAL_CONFIG,
  defaultTransitionConfig: DEFAULT_TRANSITION_CONFIG,
  defaultTeleportConfig: DEFAULT_TELEPORT_CONFIG,
  comfort: DEFAULT_COMFORT_SETTINGS,
  enableNetworkedPortals: false,
  portalRenderRate: 30,
};

// ============================================================================
// Transition Presets
// ============================================================================

export const TRANSITION_PRESETS: Record<string, TransitionConfig> = {
  instant: {
    type: TransitionType.Cut,
    duration: 0,
    outRatio: 0,
    easing: 'linear',
    color: { r: 0, g: 0, b: 0, a: 1 },
  },
  fade_slow: {
    type: TransitionType.Fade,
    duration: 2000,
    outRatio: 0.5,
    easing: 'ease-in-out',
    color: { r: 0, g: 0, b: 0, a: 1 },
    hapticStart: true,
    hapticComplete: true,
  },
  fade_fast: {
    type: TransitionType.Fade,
    duration: 500,
    outRatio: 0.4,
    easing: 'ease-out',
    color: { r: 0, g: 0, b: 0, a: 1 },
  },
  white_flash: {
    type: TransitionType.DipToColor,
    duration: 800,
    outRatio: 0.3,
    easing: 'ease-in',
    color: { r: 1, g: 1, b: 1, a: 1 },
    hapticStart: true,
  },
  vr_blink: {
    type: TransitionType.Blink,
    duration: 200,
    outRatio: 0.5,
    easing: 'ease-in-out',
    color: { r: 0, g: 0, b: 0, a: 1 },
  },
  portal_swirl: {
    type: TransitionType.PortalSwirl,
    duration: 1500,
    outRatio: 0.4,
    easing: 'ease-in-out',
    color: { r: 0.2, g: 0.4, b: 0.8, a: 1 },
    soundStart: 'portal_enter',
    soundComplete: 'portal_exit',
    hapticStart: true,
    hapticComplete: true,
  },
};
