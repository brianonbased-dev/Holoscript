/**
 * .holo Composition AST Types
 *
 * Type definitions for the declarative .holo format.
 * This is a scene-centric language designed for AI agents and visual tools.
 *
 * @version 1.0.0
 */

// =============================================================================
// SOURCE LOCATION
// =============================================================================

export interface SourceLocation {
  line: number;
  column: number;
  offset?: number;
}

export interface SourceRange {
  start: SourceLocation;
  end: SourceLocation;
}

// =============================================================================
// BASE NODE
// =============================================================================

export interface HoloNode {
  type: string;
  loc?: SourceRange;
}

// =============================================================================
// VALUE TYPES
// =============================================================================

export type HoloValue =
  | string
  | number
  | boolean
  | null
  | HoloValue[]
  | HoloObject;

export interface HoloObject {
  [key: string]: HoloValue;
}

export interface HoloPosition {
  x: number;
  y: number;
  z: number;
}

// =============================================================================
// COMPOSITION (ROOT NODE)
// =============================================================================

export interface HoloComposition extends HoloNode {
  type: 'Composition';
  name: string;
  environment?: HoloEnvironment;
  state?: HoloState;
  templates: HoloTemplate[];
  objects: HoloObjectDecl[];
  spatialGroups: HoloSpatialGroup[];
  logic?: HoloLogic;
  imports: HoloImport[];
}

// =============================================================================
// ENVIRONMENT
// =============================================================================

export interface HoloEnvironment extends HoloNode {
  type: 'Environment';
  properties: HoloEnvironmentProperty[];
}

export interface HoloEnvironmentProperty extends HoloNode {
  type: 'EnvironmentProperty';
  key: string;
  value: HoloValue | HoloParticleSystem | HoloLighting;
}

export interface HoloParticleSystem extends HoloNode {
  type: 'ParticleSystem';
  name: string;
  properties: Record<string, HoloValue>;
}

export interface HoloLighting extends HoloNode {
  type: 'Lighting';
  properties: Record<string, HoloValue>;
}

// =============================================================================
// STATE
// =============================================================================

export interface HoloState extends HoloNode {
  type: 'State';
  properties: HoloStateProperty[];
}

export interface HoloStateProperty extends HoloNode {
  type: 'StateProperty';
  key: string;
  value: HoloValue;
  reactive?: boolean;
}

// =============================================================================
// TEMPLATE
// =============================================================================

export interface HoloTemplate extends HoloNode {
  type: 'Template';
  name: string;
  properties: HoloTemplateProperty[];
  state?: HoloState;
  actions: HoloAction[];
}

export interface HoloTemplateProperty extends HoloNode {
  type: 'TemplateProperty';
  key: string;
  value: HoloValue;
}

// =============================================================================
// OBJECT
// =============================================================================

export interface HoloObjectDecl extends HoloNode {
  type: 'Object';
  name: string;
  template?: string; // "using" clause
  properties: HoloObjectProperty[];
  state?: HoloState;
  traits: HoloObjectTrait[];
  children?: HoloObjectDecl[];
}

export interface HoloObjectTrait extends HoloNode {
  type: 'ObjectTrait';
  name: string;
  config: Record<string, HoloValue>;
}

export interface HoloObjectProperty extends HoloNode {
  type: 'ObjectProperty';
  key: string;
  value: HoloValue;
}

// =============================================================================
// SPATIAL GROUP
// =============================================================================

export interface HoloSpatialGroup extends HoloNode {
  type: 'SpatialGroup';
  name: string;
  properties: HoloGroupProperty[];
  objects: HoloObjectDecl[];
  groups?: HoloSpatialGroup[]; // nested groups
}

export interface HoloGroupProperty extends HoloNode {
  type: 'GroupProperty';
  key: string;
  value: HoloValue;
}

// =============================================================================
// LOGIC
// =============================================================================

export interface HoloLogic extends HoloNode {
  type: 'Logic';
  handlers: HoloEventHandler[];
  actions: HoloAction[];
}

export interface HoloEventHandler extends HoloNode {
  type: 'EventHandler';
  event: string; // e.g., "on_enter", "on_player_attack"
  parameters: HoloParameter[];
  body: HoloStatement[];
}

export interface HoloAction extends HoloNode {
  type: 'Action';
  name: string;
  parameters: HoloParameter[];
  body: HoloStatement[];
  async?: boolean;
}

export interface HoloParameter extends HoloNode {
  type: 'Parameter';
  name: string;
  paramType?: string; // optional type annotation
  defaultValue?: HoloValue;
}

// =============================================================================
// STATEMENTS
// =============================================================================

export type HoloStatement =
  | HoloAssignment
  | HoloMethodCall
  | HoloIfStatement
  | HoloForStatement
  | HoloAwaitStatement
  | HoloReturnStatement
  | HoloEmitStatement
  | HoloAnimateStatement
  | HoloExpressionStatement;

export interface HoloAssignment extends HoloNode {
  type: 'Assignment';
  target: string; // e.g., "state.visitors", "enemy.health"
  operator: '=' | '+=' | '-=' | '*=' | '/=';
  value: HoloExpression;
}

export interface HoloMethodCall extends HoloNode {
  type: 'MethodCall';
  object?: string; // optional for global calls
  method: string;
  arguments: HoloExpression[];
}

export interface HoloIfStatement extends HoloNode {
  type: 'IfStatement';
  condition: HoloExpression;
  consequent: HoloStatement[];
  alternate?: HoloStatement[];
}

export interface HoloForStatement extends HoloNode {
  type: 'ForStatement';
  variable: string;
  iterable: HoloExpression;
  body: HoloStatement[];
}

export interface HoloAwaitStatement extends HoloNode {
  type: 'AwaitStatement';
  expression: HoloExpression;
}

export interface HoloReturnStatement extends HoloNode {
  type: 'ReturnStatement';
  value?: HoloExpression;
}

export interface HoloEmitStatement extends HoloNode {
  type: 'EmitStatement';
  event: string;
  data?: HoloExpression;
}

export interface HoloAnimateStatement extends HoloNode {
  type: 'AnimateStatement';
  target: string;
  properties: Record<string, HoloValue>;
}

export interface HoloExpressionStatement extends HoloNode {
  type: 'ExpressionStatement';
  expression: HoloExpression;
}

// =============================================================================
// EXPRESSIONS
// =============================================================================

export type HoloExpression =
  | HoloLiteral
  | HoloIdentifier
  | HoloBinaryExpression
  | HoloUnaryExpression
  | HoloMemberExpression
  | HoloCallExpression
  | HoloArrayExpression
  | HoloObjectExpression;

export interface HoloLiteral extends HoloNode {
  type: 'Literal';
  value: string | number | boolean | null;
}

export interface HoloIdentifier extends HoloNode {
  type: 'Identifier';
  name: string;
}

export interface HoloBinaryExpression extends HoloNode {
  type: 'BinaryExpression';
  operator: string; // +, -, *, /, ==, !=, <, >, <=, >=, &&, ||
  left: HoloExpression;
  right: HoloExpression;
}

export interface HoloUnaryExpression extends HoloNode {
  type: 'UnaryExpression';
  operator: '!' | '-';
  argument: HoloExpression;
}

export interface HoloMemberExpression extends HoloNode {
  type: 'MemberExpression';
  object: HoloExpression;
  property: string;
  computed: boolean; // true for a[b], false for a.b
}

export interface HoloCallExpression extends HoloNode {
  type: 'CallExpression';
  callee: HoloExpression;
  arguments: HoloExpression[];
}

export interface HoloArrayExpression extends HoloNode {
  type: 'ArrayExpression';
  elements: HoloExpression[];
}

export interface HoloObjectExpression extends HoloNode {
  type: 'ObjectExpression';
  properties: { key: string; value: HoloExpression }[];
}

// =============================================================================
// IMPORTS
// =============================================================================

export interface HoloImport extends HoloNode {
  type: 'Import';
  specifiers: HoloImportSpecifier[];
  source: string; // e.g., "./player.hsplus"
}

export interface HoloImportSpecifier extends HoloNode {
  type: 'ImportSpecifier';
  imported: string;
  local?: string; // alias
}

// =============================================================================
// PARSER RESULT
// =============================================================================

export interface HoloParseResult {
  success: boolean;
  ast?: HoloComposition;
  errors: HoloParseError[];
  warnings: HoloParseWarning[];
}

export interface HoloParseError {
  message: string;
  loc?: SourceLocation;
  code?: string;
}

export interface HoloParseWarning {
  message: string;
  loc?: SourceLocation;
  code?: string;
}

// =============================================================================
// PARSER OPTIONS
// =============================================================================

export interface HoloParserOptions {
  /** Include source locations in AST nodes */
  locations?: boolean;
  /** Collect errors instead of throwing */
  tolerant?: boolean;
  /** Enable strict mode (stricter validation) */
  strict?: boolean;
  /** Source filename for error messages */
  filename?: string;
}
