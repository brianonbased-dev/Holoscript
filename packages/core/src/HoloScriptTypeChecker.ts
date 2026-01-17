/**
 * HoloScript Type Checker
 *
 * Static type analysis for HoloScript code.
 * Validates types, detects errors, and provides type information.
 */

import type {
  ASTNode,
  OrbNode,
  MethodNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  VariableDeclarationNode,
  ForLoopNode,
  WhileLoopNode,
  ForEachLoopNode,
  ImportNode,
  ExportNode,
} from './types';

// Type system types
export type HoloScriptType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'array'
  | 'object'
  | 'function'
  | 'void'
  | 'any'
  | 'unknown'
  | 'never'
  | 'orb'
  | 'stream'
  | 'connection'
  | 'gate';

export interface TypeInfo {
  type: HoloScriptType;
  elementType?: HoloScriptType; // For arrays
  properties?: Map<string, TypeInfo>; // For objects/orbs
  parameters?: ParameterType[]; // For functions
  returnType?: HoloScriptType; // For functions
  nullable?: boolean;
}

export interface ParameterType {
  name: string;
  type: HoloScriptType;
  optional?: boolean;
  defaultValue?: unknown;
}

export interface TypeDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
  code: string;
  suggestions?: string[];
}

export interface TypeCheckResult {
  valid: boolean;
  diagnostics: TypeDiagnostic[];
  typeMap: Map<string, TypeInfo>;
}

// Built-in type definitions
const BUILTIN_FUNCTIONS: Map<string, TypeInfo> = new Map([
  ['add', { type: 'function', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' }],
  ['subtract', { type: 'function', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' }],
  ['multiply', { type: 'function', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' }],
  ['divide', { type: 'function', parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }], returnType: 'number' }],
  ['concat', { type: 'function', parameters: [{ name: 'a', type: 'string' }, { name: 'b', type: 'string' }], returnType: 'string' }],
  ['length', { type: 'function', parameters: [{ name: 'value', type: 'any' }], returnType: 'number' }],
  ['push', { type: 'function', parameters: [{ name: 'arr', type: 'array' }, { name: 'item', type: 'any' }], returnType: 'array' }],
  ['pop', { type: 'function', parameters: [{ name: 'arr', type: 'array' }], returnType: 'any' }],
  ['log', { type: 'function', parameters: [{ name: 'message', type: 'any' }], returnType: 'void' }],
  ['print', { type: 'function', parameters: [{ name: 'message', type: 'any' }], returnType: 'void' }],
  ['show', { type: 'function', parameters: [{ name: 'target', type: 'orb' }], returnType: 'void' }],
  ['hide', { type: 'function', parameters: [{ name: 'target', type: 'orb' }], returnType: 'void' }],
  ['pulse', { type: 'function', parameters: [{ name: 'target', type: 'orb' }], returnType: 'void' }],
  ['animate', { type: 'function', parameters: [{ name: 'target', type: 'orb' }, { name: 'config', type: 'object' }], returnType: 'void' }],
  ['spawn', { type: 'function', parameters: [{ name: 'type', type: 'string' }, { name: 'position', type: 'object' }], returnType: 'orb' }],
  ['isNumber', { type: 'function', parameters: [{ name: 'value', type: 'any' }], returnType: 'boolean' }],
  ['isString', { type: 'function', parameters: [{ name: 'value', type: 'any' }], returnType: 'boolean' }],
  ['isArray', { type: 'function', parameters: [{ name: 'value', type: 'any' }], returnType: 'boolean' }],
]);

export class HoloScriptTypeChecker {
  private typeMap: Map<string, TypeInfo> = new Map();
  private diagnostics: TypeDiagnostic[] = [];
  private currentLine: number = 0;
  private currentColumn: number = 0;

  constructor() {
    // Initialize with built-in functions
    BUILTIN_FUNCTIONS.forEach((type, name) => {
      this.typeMap.set(name, type);
    });
  }

  /**
   * Type check an AST
   */
  check(ast: ASTNode[]): TypeCheckResult {
    this.diagnostics = [];

    // First pass: collect declarations
    for (const node of ast) {
      this.collectDeclaration(node);
    }

    // Second pass: validate types
    for (const node of ast) {
      this.checkNode(node);
    }

    return {
      valid: this.diagnostics.filter(d => d.severity === 'error').length === 0,
      diagnostics: this.diagnostics,
      typeMap: new Map(this.typeMap),
    };
  }

  /**
   * Collect type declarations
   */
  private collectDeclaration(node: ASTNode): void {
    switch (node.type) {
      case 'orb':
        this.collectOrbDeclaration(node as OrbNode);
        break;
      case 'method':
        this.collectMethodDeclaration(node as MethodNode);
        break;
      case 'variable-declaration':
        this.collectVariableDeclaration(node as VariableDeclarationNode);
        break;
      case 'stream':
        this.collectStreamDeclaration(node as StreamNode);
        break;
    }
  }

  private collectOrbDeclaration(node: OrbNode): void {
    const properties = new Map<string, TypeInfo>();

    // Add default orb properties
    properties.set('position', { type: 'object', properties: new Map([
      ['x', { type: 'number' }],
      ['y', { type: 'number' }],
      ['z', { type: 'number' }],
    ])});
    properties.set('color', { type: 'string' });
    properties.set('glow', { type: 'boolean' });
    properties.set('interactive', { type: 'boolean' });
    properties.set('visible', { type: 'boolean' });

    // Add user-defined properties
    for (const [key, value] of Object.entries(node.properties)) {
      properties.set(key, this.inferType(value));
    }

    this.typeMap.set(node.name, {
      type: 'orb',
      properties,
    });
  }

  private collectMethodDeclaration(node: MethodNode): void {
    const parameters: ParameterType[] = node.parameters.map(p => ({
      name: p.name,
      type: this.parseTypeString(p.dataType),
      optional: p.defaultValue !== undefined,
      defaultValue: p.defaultValue,
    }));

    this.typeMap.set(node.name, {
      type: 'function',
      parameters,
      returnType: node.returnType ? this.parseTypeString(node.returnType) : 'void',
    });
  }

  private collectVariableDeclaration(node: VariableDeclarationNode): void {
    let type: HoloScriptType = 'any';

    if (node.dataType) {
      type = this.parseTypeString(node.dataType);
    } else if (node.value !== undefined) {
      type = this.inferType(node.value).type;
    }

    this.typeMap.set(node.name, { type });
  }

  private collectStreamDeclaration(node: StreamNode): void {
    this.typeMap.set(node.name, {
      type: 'stream',
      properties: new Map([
        ['source', { type: 'string' }],
        ['result', { type: 'any' }],
      ]),
    });
  }

  /**
   * Check a node for type errors
   */
  private checkNode(node: ASTNode): void {
    this.currentLine = node.position?.x ?? 0;
    this.currentColumn = node.position?.y ?? 0;

    switch (node.type) {
      case 'connection':
        this.checkConnection(node as ConnectionNode);
        break;
      case 'gate':
        this.checkGate(node as GateNode);
        break;
      case 'for-loop':
        this.checkForLoop(node as ForLoopNode);
        break;
      case 'while-loop':
        this.checkWhileLoop(node as WhileLoopNode);
        break;
      case 'foreach-loop':
        this.checkForEachLoop(node as ForEachLoopNode);
        break;
      case 'import':
        this.checkImport(node as ImportNode);
        break;
      case 'export':
        this.checkExport(node as ExportNode);
        break;
    }
  }

  private checkConnection(node: ConnectionNode): void {
    const fromType = this.typeMap.get(node.from);
    const toType = this.typeMap.get(node.to);

    if (!fromType) {
      this.addDiagnostic('error', `Unknown source '${node.from}' in connection`, 'E001');
    }

    if (!toType) {
      this.addDiagnostic('error', `Unknown target '${node.to}' in connection`, 'E002');
    }

    // Check if types are compatible
    if (fromType && toType && node.dataType !== 'any') {
      // Warn if connecting incompatible types
      if (fromType.type !== toType.type && fromType.type !== 'any' && toType.type !== 'any') {
        this.addDiagnostic('warning',
          `Connection from '${node.from}' (${fromType.type}) to '${node.to}' (${toType.type}) may be incompatible`,
          'W001',
          [`Consider using 'as "any"' to bypass type checking`]
        );
      }
    }
  }

  private checkGate(node: GateNode): void {
    // Validate condition references valid variables
    const conditionVars = this.extractVariables(node.condition);
    for (const varName of conditionVars) {
      if (!this.typeMap.has(varName) && !this.isLiteral(varName)) {
        this.addDiagnostic('error', `Unknown variable '${varName}' in gate condition`, 'E003');
      }
    }
  }

  private checkForLoop(node: ForLoopNode): void {
    // Check init references
    const initVars = this.extractVariables(node.init);
    // For loops can declare new variables in init, so we add them
    for (const varName of initVars) {
      if (!this.typeMap.has(varName)) {
        this.typeMap.set(varName, { type: 'number' }); // Loop vars are typically numbers
      }
    }

    // Check condition
    const condVars = this.extractVariables(node.condition);
    for (const varName of condVars) {
      if (!this.typeMap.has(varName) && !this.isLiteral(varName)) {
        this.addDiagnostic('error', `Unknown variable '${varName}' in for loop condition`, 'E004');
      }
    }
  }

  private checkWhileLoop(node: WhileLoopNode): void {
    const condVars = this.extractVariables(node.condition);
    for (const varName of condVars) {
      if (!this.typeMap.has(varName) && !this.isLiteral(varName)) {
        this.addDiagnostic('error', `Unknown variable '${varName}' in while loop condition`, 'E005');
      }
    }
  }

  private checkForEachLoop(node: ForEachLoopNode): void {
    // Check collection exists
    if (!this.typeMap.has(node.collection)) {
      this.addDiagnostic('error', `Unknown collection '${node.collection}' in forEach loop`, 'E006');
    } else {
      const collectionType = this.typeMap.get(node.collection);
      if (collectionType && collectionType.type !== 'array' && collectionType.type !== 'any') {
        this.addDiagnostic('error', `'${node.collection}' is not iterable (type: ${collectionType.type})`, 'E007');
      }
    }

    // Add loop variable to scope
    this.typeMap.set(node.variable, { type: 'any' });
  }

  private checkImport(node: ImportNode): void {
    if (!node.modulePath) {
      this.addDiagnostic('error', 'Import statement missing module path', 'E008');
    }

    // Register imported names as 'any' type (can't resolve external modules)
    for (const name of node.imports) {
      this.typeMap.set(name, { type: 'any' });
    }

    if (node.defaultImport) {
      this.typeMap.set(node.defaultImport, { type: 'any' });
    }
  }

  private checkExport(node: ExportNode): void {
    if (node.exports) {
      for (const name of node.exports) {
        if (!this.typeMap.has(name)) {
          this.addDiagnostic('error', `Cannot export unknown identifier '${name}'`, 'E009');
        }
      }
    }
  }

  /**
   * Infer type from a value
   */
  private inferType(value: unknown): TypeInfo {
    if (value === null || value === undefined) {
      return { type: 'any', nullable: true };
    }

    if (typeof value === 'number') {
      return { type: 'number' };
    }

    if (typeof value === 'string') {
      return { type: 'string' };
    }

    if (typeof value === 'boolean') {
      return { type: 'boolean' };
    }

    if (Array.isArray(value)) {
      const elementType = value.length > 0 ? this.inferType(value[0]).type : 'any';
      return { type: 'array', elementType };
    }

    if (typeof value === 'object') {
      const properties = new Map<string, TypeInfo>();
      for (const [key, val] of Object.entries(value)) {
        properties.set(key, this.inferType(val));
      }
      return { type: 'object', properties };
    }

    return { type: 'any' };
  }

  /**
   * Parse type string to HoloScriptType
   */
  private parseTypeString(typeStr: string): HoloScriptType {
    const normalized = typeStr.toLowerCase().trim();
    const validTypes: HoloScriptType[] = [
      'number', 'string', 'boolean', 'array', 'object',
      'function', 'void', 'any', 'unknown', 'never',
      'orb', 'stream', 'connection', 'gate'
    ];

    if (validTypes.includes(normalized as HoloScriptType)) {
      return normalized as HoloScriptType;
    }

    return 'any';
  }

  /**
   * Extract variable names from an expression string
   */
  private extractVariables(expr: string): string[] {
    const varPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    const matches = expr.match(varPattern) || [];
    const keywords = ['true', 'false', 'null', 'undefined', 'if', 'else', 'for', 'while', 'return'];
    return matches.filter(m => !keywords.includes(m));
  }

  /**
   * Check if string is a literal
   */
  private isLiteral(str: string): boolean {
    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(str)) return true;
    // Boolean
    if (str === 'true' || str === 'false') return true;
    // String literal
    if (/^["'].*["']$/.test(str)) return true;
    return false;
  }

  /**
   * Add a diagnostic
   */
  private addDiagnostic(
    severity: 'error' | 'warning' | 'info',
    message: string,
    code: string,
    suggestions?: string[]
  ): void {
    this.diagnostics.push({
      severity,
      message,
      line: this.currentLine,
      column: this.currentColumn,
      code,
      suggestions,
    });
  }

  /**
   * Get type info for a name
   */
  getType(name: string): TypeInfo | undefined {
    return this.typeMap.get(name);
  }

  /**
   * Get all registered types
   */
  getAllTypes(): Map<string, TypeInfo> {
    return new Map(this.typeMap);
  }

  /**
   * Reset the type checker
   */
  reset(): void {
    this.typeMap.clear();
    this.diagnostics = [];

    // Re-add built-ins
    BUILTIN_FUNCTIONS.forEach((type, name) => {
      this.typeMap.set(name, type);
    });
  }
}

/**
 * Create a type checker instance
 */
export function createTypeChecker(): HoloScriptTypeChecker {
  return new HoloScriptTypeChecker();
}
