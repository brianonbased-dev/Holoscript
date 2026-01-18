/**
 * @holoscript/core Types
 *
 * Core type definitions for HoloScript AST and runtime
 */

// ============================================================================
// Spatial Types
// ============================================================================

export interface SpatialPosition {
  x: number;
  y: number;
  z: number;
}

export interface Position2D {
  x: number;
  y: number;
}

export interface Size2D {
  width: number;
  height: number;
}

// ============================================================================
// Hologram Types
// ============================================================================

export type HologramShape = 'orb' | 'cube' | 'cylinder' | 'pyramid' | 'sphere' | 'function' | 'gate' | 'stream' | 'server' | 'database' | 'fetch';

export interface HologramProperties {
  shape: HologramShape;
  color: string;
  size: number;
  glow: boolean;
  interactive: boolean;
}

// ============================================================================
// Input Types
// ============================================================================

export interface VoiceCommand {
  command: string;
  confidence: number;
  timestamp: number;
  spatialContext?: SpatialPosition;
}

export type GestureType = 'pinch' | 'swipe' | 'rotate' | 'grab' | 'release';
export type HandType = 'left' | 'right';

export interface GestureData {
  type: GestureType;
  position: SpatialPosition;
  direction?: SpatialPosition;
  magnitude: number;
  hand: HandType;
}

// ============================================================================
// AST Node Types
// ============================================================================


export type HoloScriptValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | HoloScriptValue[]
  | { [key: string]: HoloScriptValue }
  // We can include ASTNode if values can be nodes (e.g. templates)
  | ASTNode;

export interface ASTNode {
  type: string;
  position?: SpatialPosition;
  hologram?: HologramProperties;
  /** Source line number (1-indexed) */
  line?: number;
  /** Source column number (0-indexed) */
  column?: number;
}

export interface OrbNode extends ASTNode {
  type: 'orb';
  name: string;
  properties: Record<string, HoloScriptValue>;
  methods: MethodNode[];
}

export interface MethodNode extends ASTNode {
  type: 'method';
  name: string;
  parameters: ParameterNode[];
  body: ASTNode[];
  returnType?: string;
}

export interface ParameterNode extends ASTNode {
  type: 'parameter';
  name: string;
  dataType: string;
  defaultValue?: HoloScriptValue;
}

export interface ConnectionNode extends ASTNode {
  type: 'connection';
  from: string;
  to: string;
  dataType: string;
  bidirectional: boolean;
}

export interface GateNode extends ASTNode {
  type: 'gate';
  condition: string;
  truePath: ASTNode[];
  falsePath: ASTNode[];
}

export interface StreamNode extends ASTNode {
  type: 'stream';
  name: string;
  source: string;
  transformations: TransformationNode[];
}

export interface TransformationNode extends ASTNode {
  type: 'transformation';
  operation: string;
  parameters: Record<string, HoloScriptValue>;
}

export interface GenericASTNode extends ASTNode {
  [key: string]: HoloScriptValue | unknown; // keeping unknown for flexibility but preferring HoloScriptValue
}

export interface ServerNode extends ASTNode {
  type: 'server';
  port: number;
  routes: string[];
}

export interface DatabaseNode extends ASTNode {
  type: 'database';
  query: string;
}

export interface FetchNode extends ASTNode {
  type: 'fetch';
  url: string;
  method: string;
}

export interface ExecuteNode extends ASTNode {
  type: 'execute';
  target: string;
}

export interface DebugNode extends ASTNode {
  type: 'debug';
  target: string;
}

export interface VisualizeNode extends ASTNode {
  type: 'visualize';
  target: string;
}


// ============================================================================
// Phase 2: Loop Types
// ============================================================================

export interface ForLoopNode extends ASTNode {
  type: 'for-loop';
  init: string;
  condition: string;
  update: string;
  body: ASTNode[];
}

export interface WhileLoopNode extends ASTNode {
  type: 'while-loop';
  condition: string;
  body: ASTNode[];
}

export interface ForEachLoopNode extends ASTNode {
  type: 'foreach-loop';
  variable: string;
  collection: string;
  body: ASTNode[];
}

// ============================================================================
// Universe Scale & Spatial Context Types
// ============================================================================

export interface ScaleNode extends ASTNode {
  type: 'scale';
  magnitude: string; // 'galactic', 'macro', 'standard', 'micro', 'atomic'
  multiplier: number;
  body: ASTNode[];
}

export interface FocusNode extends ASTNode {
  type: 'focus';
  target: string;
  body: ASTNode[];
}

// ============================================================================
// Composition & Environment Types
// ============================================================================

export interface CompositionNode extends ASTNode {
  type: 'composition';
  name: string;
  children: ASTNode[];
}

export interface EnvironmentNode extends ASTNode {
  type: 'environment';
  settings: Record<string, HoloScriptValue>;
}

export interface TemplateNode extends ASTNode {
  type: 'template';
  name: string;
  parameters: string[];
  body: ASTNode[];
}

export interface GlobalHandlerNode extends ASTNode {
  type: 'global_handler';
  handlerType: 'every' | 'on_gesture';
  config: Record<string, HoloScriptValue>;
  action: string;
}

// ============================================================================
// Phase 2: Module Types
// ============================================================================

export interface ImportNode extends ASTNode {
  type: 'import';
  imports: string[];
  defaultImport?: string;
  modulePath: string;
}

export type ImportLoader = (path: string) => Promise<string>;

export interface ExportNode extends ASTNode {
  type: 'export';
  exports?: string[];
  declaration?: ASTNode;
}

// ============================================================================
// Phase 2: Variable Declaration Types
// ============================================================================

export interface VariableDeclarationNode extends ASTNode {
  type: 'variable-declaration';
  kind: 'const' | 'let' | 'var';
  name: string;
  dataType?: string;
  value?: HoloScriptValue;
  isExpression?: boolean;
}

// ============================================================================
// 2D UI Types
// ============================================================================

export type UIElementType =
  | 'canvas'
  | 'button'
  | 'textinput'
  | 'panel'
  | 'text'
  | 'image'
  | 'list'
  | 'modal'
  | 'slider'
  | 'toggle'
  | 'dropdown'
  | 'flex-container'
  | 'grid-container'
  | 'scroll-view'
  | 'tab-view'
  | 'dashboard' | 'card' | 'metric' | 'row' | 'col';

export interface UI2DNode {
  type: '2d-element';
  elementType: UIElementType;
  name: string;
  properties: Record<string, HoloScriptValue>;
  children?: UI2DNode[];
  events?: Record<string, string>;
}

export interface UIStyle {
  backgroundColor?: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  margin?: number;
}

// ============================================================================
// Runtime Types
// ============================================================================

export interface RuntimeContext {
  variables: Map<string, HoloScriptValue>;
  functions: Map<string, MethodNode>;
  exports: Map<string, HoloScriptValue>;
  connections: ConnectionNode[];
  spatialMemory: Map<string, SpatialPosition>;
  hologramState: Map<string, HologramProperties>;
  executionStack: ASTNode[];
  mode?: 'public' | 'secure';

  // Scaling & Context
  currentScale: number;
  scaleMagnitude: string;
  focusHistory: string[];

  // Composition & Environment
  environment: Record<string, HoloScriptValue>;
  templates: Map<string, TemplateNode>;
}

export interface ExecutionResult {
  success: boolean;
  output?: HoloScriptValue;
  hologram?: HologramProperties;
  spatialPosition?: SpatialPosition;
  error?: string;
  executionTime?: number;
  learningSignals?: Record<string, HoloScriptValue>;
}

export interface ParticleSystem {
  particles: SpatialPosition[];
  color: string;
  lifetime: number;
  speed: number;
}

// ============================================================================
// Security Config Types
// ============================================================================

export interface SecurityConfig {
  maxCommandLength: number;
  maxTokens: number;
  maxHologramsPerUser: number;
  suspiciousKeywords: string[];
  allowedShapes: string[];
  allowedUIElements: string[];
}

export interface RuntimeSecurityLimits {
  maxExecutionDepth: number;
  maxTotalNodes: number;
  maxExecutionTimeMs: number;
  maxParticlesPerSystem: number;
}
// ============================================================================
// VR Types
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface Duration {
  milliseconds: number;
}

export interface Transform {
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
}

export type VRHand = 'left' | 'right' | 'both';

export interface ThrowVelocity {
  magnitude: number;
  direction: Vector3;
  spin?: Vector3;
}

export interface CollisionEvent {
  object1: string;
  object2: string;
  position: Vector3;
  normal: Vector3;
  force: number;
  timestamp: number;
}

// ============================================================================
// VR Traits
// ============================================================================

export interface GrabbableTrait {
  snapToHand: boolean;
  grip_type: 'palm' | 'pinch' | 'full';
  haptic_feedback: boolean;
}

export interface ThrowableTrait {
  velocityMultiplier: number;
  enableSpin: boolean;
  gravityScale: number;
}

export interface PointableTrait {
  maxPointDistance: number;
  interactionRadius: number;
  hapticFeedback: boolean;
}

export interface HoverableTrait {
  hoverDistance: number;
  hoverColor: Color;
  hoverScale: number;
  enableHighlight: boolean;
}

export interface ScalableTrait {
  minScale: number;
  maxScale: number;
  scaleSpeed: number;
}

export interface RotatableTrait {
  rotationSpeed: number;
  freeRotation: boolean;
  snapAngles?: number[];
}