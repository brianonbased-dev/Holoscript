/**
 * HoloScript+ Type Definitions
 *
 * Enhanced HoloScript with VR interactions, state management, and TypeScript interop.
 * Backward compatible with original HoloScript - new features are opt-in via @ directives.
 *
 * uaa2-service maintains its own evolved implementation for service-level enhancements.
 * Core baseline: @holoscript/core
 *
 * @version 1.0.0
 * @license MIT
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type Vector3 = [number, number, number];
export type Vector2 = [number, number];
export type Color = string; // Hex color like "#ff0000" or named colors
export type Duration = `${number}${'ms' | 's' | 'm'}`;

export interface Transform {
  position: Vector3;
  rotation?: Vector3;
  scale?: Vector3 | number;
}

// =============================================================================
// VR INTERACTION TYPES
// =============================================================================

/**
 * Hand reference for VR interactions
 */
export interface VRHand {
  id: 'left' | 'right';
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  grip: number; // 0-1 grip strength
  trigger: number; // 0-1 trigger pressure
}

/**
 * Velocity data for throw calculations
 */
export interface ThrowVelocity {
  direction: Vector3;
  magnitude: number;
  angularVelocity: Vector3;
}

/**
 * Collision event data
 */
export interface CollisionEvent {
  target: HSPlusNode;
  point: Vector3;
  normal: Vector3;
  impulse: number;
  relativeVelocity: Vector3;
}

// =============================================================================
// VR TRAIT CONFIGURATIONS
// =============================================================================

/**
 * @grabbable trait configuration
 */
export interface GrabbableTrait {
  snap_to_hand?: boolean;
  two_handed?: boolean;
  haptic_on_grab?: number; // 0-1 intensity
  grab_points?: Vector3[]; // Specific grab positions
  preserve_rotation?: boolean;
  distance_grab?: boolean; // Allow grabbing from distance
  max_grab_distance?: number;
}

/**
 * @throwable trait configuration
 */
export interface ThrowableTrait {
  velocity_multiplier?: number;
  gravity?: boolean;
  max_velocity?: number;
  spin?: boolean;
  bounce?: boolean;
  bounce_factor?: number; // 0-1
}

/**
 * @pointable trait configuration
 */
export interface PointableTrait {
  highlight_on_point?: boolean;
  highlight_color?: Color;
  cursor_style?: 'default' | 'pointer' | 'grab' | 'crosshair';
}

/**
 * @hoverable trait configuration
 */
export interface HoverableTrait {
  highlight_color?: Color;
  scale_on_hover?: number;
  show_tooltip?: string | boolean;
  tooltip_offset?: Vector3;
  glow?: boolean;
  glow_intensity?: number;
}

/**
 * @scalable trait configuration
 */
export interface ScalableTrait {
  min_scale?: number;
  max_scale?: number;
  uniform?: boolean; // Force uniform scaling
  pivot?: Vector3;
}

/**
 * @rotatable trait configuration
 */
export interface RotatableTrait {
  axis?: 'x' | 'y' | 'z' | 'all';
  snap_angles?: number[]; // Snap to specific angles
  speed?: number;
}

/**
 * @stackable trait configuration
 */
export interface StackableTrait {
  stack_axis?: 'x' | 'y' | 'z';
  stack_offset?: number;
  max_stack?: number;
  snap_distance?: number;
}

/**
 * @snappable trait configuration
 */
export interface SnappableTrait {
  snap_points?: Vector3[];
  snap_distance?: number;
  snap_rotation?: boolean;
  magnetic?: boolean;
}

/**
 * @breakable trait configuration
 */
export interface BreakableTrait {
  break_velocity?: number;
  fragments?: number;
  fragment_mesh?: string;
  sound_on_break?: string;
  respawn?: boolean;
  respawn_delay?: Duration;
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Reactive state declaration
 */
export interface StateDeclaration {
  [key: string]: unknown;
}

/**
 * State proxy for reactive updates
 */
export interface ReactiveState<T extends StateDeclaration> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  subscribe(callback: (state: T) => void): () => void;
}

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================

export type LifecycleHook =
  | 'on_mount'
  | 'on_unmount'
  | 'on_update'
  | 'on_data_update';

export type VRLifecycleHook =
  | 'on_grab'
  | 'on_release'
  | 'on_hover_enter'
  | 'on_hover_exit'
  | 'on_point_enter'
  | 'on_point_exit'
  | 'on_collision'
  | 'on_trigger_enter'
  | 'on_trigger_exit'
  | 'on_click'
  | 'on_double_click';

export type ControllerHook =
  | 'on_controller_button'
  | 'on_trigger_hold'
  | 'on_trigger_release'
  | 'on_grip_hold'
  | 'on_grip_release';

// =============================================================================
// CONTROL FLOW
// =============================================================================

/**
 * For loop iteration context
 */
export interface ForLoopContext<T> {
  item: T;
  index: number;
  first: boolean;
  last: boolean;
  even: boolean;
  odd: boolean;
}

/**
 * Range helper for numeric loops
 */
export function range(start: number, end: number, step?: number): number[];

// =============================================================================
// AST NODE TYPES
// =============================================================================

export type HSPlusDirective =
  | { type: 'state'; body: StateDeclaration }
  | { type: 'for'; variable: string; iterable: string; body: HSPlusNode[] }
  | { type: 'if'; condition: string; body: HSPlusNode[]; else?: HSPlusNode[] }
  | { type: 'import'; path: string; alias: string }
  | { type: 'lifecycle'; hook: LifecycleHook | VRLifecycleHook | ControllerHook; params?: string[]; body: string }
  | { type: 'trait'; name: VRTraitName; config: Record<string, unknown> };

export type VRTraitName =
  | 'grabbable'
  | 'throwable'
  | 'pointable'
  | 'hoverable'
  | 'scalable'
  | 'rotatable'
  | 'stackable'
  | 'snappable'
  | 'breakable';

export interface HSPlusNode {
  type: string;
  id?: string;
  properties: Record<string, unknown>;
  directives: HSPlusDirective[];
  children: HSPlusNode[];
  traits: Map<VRTraitName, unknown>;
  // Source location for debugging
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface HSPlusAST {
  version: '1.0';
  root: HSPlusNode;
  imports: Array<{ path: string; alias: string }>;
  hasState: boolean;
  hasVRTraits: boolean;
  hasControlFlow: boolean;
}

// =============================================================================
// RUNTIME CONTEXT
// =============================================================================

export interface HSPlusRuntimeContext {
  // Data from data_source
  data: unknown;

  // Reactive state
  state: ReactiveState<StateDeclaration>;

  // VR context
  vr: {
    hands: { left: VRHand | null; right: VRHand | null };
    headset: { position: Vector3; rotation: Vector3 };
    controllers: { left: unknown; right: unknown };
  };

  // TypeScript companion functions
  scripts: Record<string, (...args: unknown[]) => unknown>;

  // Built-in functions
  builtins: HSPlusBuiltins;
}

export interface HSPlusBuiltins {
  // Math
  Math: typeof Math;

  // Array methods
  range: (start: number, end: number, step?: number) => number[];

  // Color utilities
  interpolate_color: (t: number, from: Color, to: Color) => Color;

  // Distance/proximity
  distance_to: (point: Vector3) => number;
  distance_to_viewer: () => number;

  // VR helpers
  hand_position: (handId: string) => Vector3;
  hand_velocity: (handId: string) => Vector3;
  dominant_hand: () => VRHand;

  // Audio
  play_sound: (source: string, options?: { volume?: number; spatial?: boolean }) => void;

  // Haptics
  haptic_feedback: (hand: VRHand | string, intensity: number) => void;
  haptic_pulse: (intensity: number) => void;

  // Physics
  apply_velocity: (node: HSPlusNode, velocity: Vector3) => void;

  // Spawning
  spawn: (template: string, position: Vector3) => HSPlusNode;
  destroy: (node: HSPlusNode) => void;

  // API calls
  api_call: (url: string, method: string, body?: unknown) => Promise<unknown>;

  // Modals
  open_modal: (modalId: string) => void;
  close_modal: (modalId: string) => void;

  // Timing
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
}

// =============================================================================
// PARSER OPTIONS
// =============================================================================

export interface HSPlusParserOptions {
  // Enable VR trait parsing
  enableVRTraits?: boolean;

  // Enable TypeScript companion imports
  enableTypeScriptImports?: boolean;

  // Strict mode - error on unknown directives
  strict?: boolean;

  // Source file path for error messages
  sourcePath?: string;
}

// =============================================================================
// COMPILER OUTPUT
// =============================================================================

export interface HSPlusCompileResult {
  ast: HSPlusAST;

  // Compiled JavaScript for expressions
  compiledExpressions: Map<string, string>;

  // Required TypeScript companions
  requiredCompanions: string[];

  // Feature flags
  features: {
    state: boolean;
    vrTraits: boolean;
    loops: boolean;
    conditionals: boolean;
    lifecycleHooks: boolean;
  };

  // Warnings
  warnings: Array<{ message: string; line: number; column: number }>;

  // Errors
  errors: Array<{ message: string; line: number; column: number }>;
}

// =============================================================================
// EXPORTS
// =============================================================================

export interface HoloScriptPlusModule {
  parse: (source: string, options?: HSPlusParserOptions) => HSPlusCompileResult;

  createRuntime: (ast: HSPlusAST, context?: Partial<HSPlusRuntimeContext>) => HSPlusRuntime;

  // Version info
  version: string;

  // Feature detection
  features: {
    vrTraits: readonly VRTraitName[];
    lifecycleHooks: readonly (LifecycleHook | VRLifecycleHook | ControllerHook)[];
  };
}

export interface HSPlusRuntime {
  // Mount the scene
  mount: (container: unknown) => void;

  // Unmount and cleanup
  unmount: () => void;

  // Update with new data
  updateData: (data: unknown) => void;

  // Get current state
  getState: () => StateDeclaration;

  // Set state
  setState: (updates: Partial<StateDeclaration>) => void;

  // Emit event
  emit: (event: string, payload?: unknown) => void;

  // Subscribe to events
  on: (event: string, handler: (payload: unknown) => void) => () => void;
}

// =============================================================================
// VR INTERACTION TYPES
// =============================================================================

/**
 * Hand reference for VR interactions
 */
export interface VRHand {
  id: 'left' | 'right';
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  grip: number; // 0-1 grip strength
  trigger: number; // 0-1 trigger pressure
}

/**
 * Velocity data for throw calculations
 */
export interface ThrowVelocity {
  direction: Vector3;
  magnitude: number;
  angularVelocity: Vector3;
}

/**
 * Collision event data
 */
export interface CollisionEvent {
  target: HSPlusNode;
  point: Vector3;
  normal: Vector3;
  impulse: number;
  relativeVelocity: Vector3;
}

// =============================================================================
// VR TRAIT CONFIGURATIONS
// =============================================================================

/**
 * @grabbable trait configuration
 */
export interface GrabbableTrait {
  snap_to_hand?: boolean;
  two_handed?: boolean;
  haptic_on_grab?: number; // 0-1 intensity
  grab_points?: Vector3[]; // Specific grab positions
  preserve_rotation?: boolean;
  distance_grab?: boolean; // Allow grabbing from distance
  max_grab_distance?: number;
}

/**
 * @throwable trait configuration
 */
export interface ThrowableTrait {
  velocity_multiplier?: number;
  gravity?: boolean;
  max_velocity?: number;
  spin?: boolean;
  bounce?: boolean;
  bounce_factor?: number; // 0-1
}

/**
 * @pointable trait configuration
 */
export interface PointableTrait {
  highlight_on_point?: boolean;
  highlight_color?: Color;
  cursor_style?: 'default' | 'pointer' | 'grab' | 'crosshair';
}

/**
 * @hoverable trait configuration
 */
export interface HoverableTrait {
  highlight_color?: Color;
  scale_on_hover?: number;
  show_tooltip?: string | boolean;
  tooltip_offset?: Vector3;
  glow?: boolean;
  glow_intensity?: number;
}

/**
 * @scalable trait configuration
 */
export interface ScalableTrait {
  min_scale?: number;
  max_scale?: number;
  uniform?: boolean; // Force uniform scaling
  pivot?: Vector3;
}

/**
 * @rotatable trait configuration
 */
export interface RotatableTrait {
  axis?: 'x' | 'y' | 'z' | 'all';
  snap_angles?: number[]; // Snap to specific angles
  speed?: number;
}

/**
 * @stackable trait configuration
 */
export interface StackableTrait {
  stack_axis?: 'x' | 'y' | 'z';
  stack_offset?: number;
  max_stack?: number;
  snap_distance?: number;
}

/**
 * @snappable trait configuration
 */
export interface SnappableTrait {
  snap_points?: Vector3[];
  snap_distance?: number;
  snap_rotation?: boolean;
  magnetic?: boolean;
}

/**
 * @breakable trait configuration
 */
export interface BreakableTrait {
  break_velocity?: number;
  fragments?: number;
  fragment_mesh?: string;
  sound_on_break?: string;
  respawn?: boolean;
  respawn_delay?: Duration;
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Reactive state declaration
 */
export interface StateDeclaration {
  [key: string]: unknown;
}

/**
 * State proxy for reactive updates
 */
export interface ReactiveState<T extends StateDeclaration> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  subscribe(callback: (state: T) => void): () => void;
}

// =============================================================================
// LIFECYCLE HOOKS
// =============================================================================

export type LifecycleHook =
  | 'on_mount'
  | 'on_unmount'
  | 'on_update'
  | 'on_data_update';

export type VRLifecycleHook =
  | 'on_grab'
  | 'on_release'
  | 'on_hover_enter'
  | 'on_hover_exit'
  | 'on_point_enter'
  | 'on_point_exit'
  | 'on_collision'
  | 'on_trigger_enter'
  | 'on_trigger_exit'
  | 'on_click'
  | 'on_double_click';

export type ControllerHook =
  | 'on_controller_button'
  | 'on_trigger_hold'
  | 'on_trigger_release'
  | 'on_grip_hold'
  | 'on_grip_release';

// =============================================================================
// CONTROL FLOW
// =============================================================================

/**
 * For loop iteration context
 */
export interface ForLoopContext<T> {
  item: T;
  index: number;
  first: boolean;
  last: boolean;
  even: boolean;
  odd: boolean;
}

/**
 * Range helper for numeric loops
 */
export function range(start: number, end: number, step?: number): number[];

// =============================================================================
// AST NODE TYPES
// =============================================================================

export type HSPlusDirective =
  | { type: 'state'; body: StateDeclaration }
  | { type: 'for'; variable: string; iterable: string; body: HSPlusNode[] }
  | { type: 'if'; condition: string; body: HSPlusNode[]; else?: HSPlusNode[] }
  | { type: 'import'; path: string; alias: string }
  | { type: 'lifecycle'; hook: LifecycleHook | VRLifecycleHook | ControllerHook; params?: string[]; body: string }
  | { type: 'trait'; name: VRTraitName; config: Record<string, unknown> };

export type VRTraitName =
  | 'grabbable'
  | 'throwable'
  | 'pointable'
  | 'hoverable'
  | 'scalable'
  | 'rotatable'
  | 'stackable'
  | 'snappable'
  | 'breakable';

export interface HSPlusNode {
  type: string;
  id?: string;
  properties: Record<string, unknown>;
  directives: HSPlusDirective[];
  children: HSPlusNode[];
  traits: Map<VRTraitName, unknown>;
  // Source location for debugging
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface HSPlusAST {
  version: '1.0';
  root: HSPlusNode;
  imports: Array<{ path: string; alias: string }>;
  hasState: boolean;
  hasVRTraits: boolean;
  hasControlFlow: boolean;
}

// =============================================================================
// RUNTIME CONTEXT
// =============================================================================

export interface HSPlusRuntimeContext {
  // Data from data_source
  data: unknown;

  // Reactive state
  state: ReactiveState<StateDeclaration>;

  // VR context
  vr: {
    hands: { left: VRHand | null; right: VRHand | null };
    headset: { position: Vector3; rotation: Vector3 };
    controllers: { left: unknown; right: unknown };
  };

  // TypeScript companion functions
  scripts: Record<string, (...args: unknown[]) => unknown>;

  // Built-in functions
  builtins: HSPlusBuiltins;
}

export interface HSPlusBuiltins {
  // Math
  Math: typeof Math;

  // Array methods
  range: (start: number, end: number, step?: number) => number[];

  // Color utilities
  interpolate_color: (t: number, from: Color, to: Color) => Color;

  // Distance/proximity
  distance_to: (point: Vector3) => number;
  distance_to_viewer: () => number;

  // VR helpers
  hand_position: (handId: string) => Vector3;
  hand_velocity: (handId: string) => Vector3;
  dominant_hand: () => VRHand;

  // Audio
  play_sound: (source: string, options?: { volume?: number; spatial?: boolean }) => void;

  // Haptics
  haptic_feedback: (hand: VRHand | string, intensity: number) => void;
  haptic_pulse: (intensity: number) => void;

  // Physics
  apply_velocity: (node: HSPlusNode, velocity: Vector3) => void;

  // Spawning
  spawn: (template: string, position: Vector3) => HSPlusNode;
  destroy: (node: HSPlusNode) => void;

  // API calls
  api_call: (url: string, method: string, body?: unknown) => Promise<unknown>;

  // Modals
  open_modal: (modalId: string) => void;
  close_modal: (modalId: string) => void;

  // Timing
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;
}

// =============================================================================
// PARSER OPTIONS
// =============================================================================

export interface HSPlusParserOptions {
  // Enable VR trait parsing
  enableVRTraits?: boolean;

  // Enable TypeScript companion imports
  enableTypeScriptImports?: boolean;

  // Strict mode - error on unknown directives
  strict?: boolean;

  // Source file path for error messages
  sourcePath?: string;
}

// =============================================================================
// COMPILER OUTPUT
// =============================================================================

export interface HSPlusCompileResult {
  ast: HSPlusAST;

  // Compiled JavaScript for expressions
  compiledExpressions: Map<string, string>;

  // Required TypeScript companions
  requiredCompanions: string[];

  // Feature flags
  features: {
    state: boolean;
    vrTraits: boolean;
    loops: boolean;
    conditionals: boolean;
    lifecycleHooks: boolean;
  };

  // Warnings
  warnings: Array<{ message: string; line: number; column: number }>;

  // Errors
  errors: Array<{ message: string; line: number; column: number }>;
}

// =============================================================================
// EXPORTS
// =============================================================================

export interface HoloScriptPlusModule {
  parse: (source: string, options?: HSPlusParserOptions) => HSPlusCompileResult;

  createRuntime: (ast: HSPlusAST, context?: Partial<HSPlusRuntimeContext>) => HSPlusRuntime;

  // Version info
  version: string;

  // Feature detection
  features: {
    vrTraits: readonly VRTraitName[];
    lifecycleHooks: readonly (LifecycleHook | VRLifecycleHook | ControllerHook)[];
  };
}

export interface HSPlusRuntime {
  // Mount the scene
  mount: (container: unknown) => void;

  // Unmount and cleanup
  unmount: () => void;

  // Update with new data
  updateData: (data: unknown) => void;

  // Get current state
  getState: () => StateDeclaration;

  // Set state
  setState: (updates: Partial<StateDeclaration>) => void;

  // Emit event
  emit: (event: string, payload?: unknown) => void;

  // Subscribe to events
  on: (event: string, handler: (payload: unknown) => void) => () => void;
}
