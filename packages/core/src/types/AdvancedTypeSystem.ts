/**
 * @holoscript/core Advanced Type System
 *
 * Union types, generics, type inference, exhaustiveness checking
 */

export type HoloScriptType =
  | PrimitiveType
  | ArrayType
  | UnionType
  | IntersectionType
  | GenericType
  | LiteralType
  | CustomType;

/**
 * Primitive types
 */
export type PrimitiveTypeName = 'number' | 'string' | 'boolean' | 'void';

export interface PrimitiveType {
  kind: 'primitive';
  name: PrimitiveTypeName;
}

/**
 * Array type: T[]
 */
export interface ArrayType {
  kind: 'array';
  elementType: HoloScriptType;
}

/**
 * Union type: A | B | C
 */
export interface UnionType {
  kind: 'union';
  members: HoloScriptType[];
}

/**
 * Intersection type: A & B
 */
export interface IntersectionType {
  kind: 'intersection';
  members: HoloScriptType[];
}

/**
 * Generic type: Container<T>
 */
export interface GenericType {
  kind: 'generic';
  name: string;
  typeArgs: HoloScriptType[];
}

/**
 * Literal type: "idle" | "moving"
 */
export interface LiteralType {
  kind: 'literal';
  value: string | number | boolean;
}

/**
 * Custom type: User-defined types
 */
export interface CustomType {
  kind: 'custom';
  name: string;
  properties: Map<string, HoloScriptType>;
  methods: Map<string, FunctionType>;
}

/**
 * Function type
 */
export interface FunctionType {
  kind: 'function';
  parameters: { name: string; type: HoloScriptType }[];
  returnType: HoloScriptType;
}

/**
 * Type inference engine
 */
export class TypeInferenceEngine {
  // Reserved for future type environment tracking
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // private typeEnvironment: Map<string, HoloScriptType> = new Map();
  // private genericTypeVars: Map<string, HoloScriptType> = new Map();

  /**
   * Infer type from value
   */
  inferType(value: any): HoloScriptType {
    if (typeof value === 'number') {
      return { kind: 'primitive', name: 'number' };
    }
    if (typeof value === 'string') {
      return { kind: 'primitive', name: 'string' };
    }
    if (typeof value === 'boolean') {
      return { kind: 'primitive', name: 'boolean' };
    }
    if (Array.isArray(value)) {
      const elementType: HoloScriptType = value.length > 0 ? this.inferType(value[0]) : { kind: 'primitive', name: 'void' };
      return { kind: 'array', elementType } as ArrayType;
    }
    return { kind: 'primitive', name: 'void' };
  }

  /**
   * Check type compatibility
   */
  isAssignableTo(from: HoloScriptType, to: HoloScriptType): boolean {
    // Same type
    if (JSON.stringify(from) === JSON.stringify(to)) return true;

    // Union type includes from
    if (to.kind === 'union') {
      return to.members.some((m) => this.isAssignableTo(from, m));
    }

    // Intersection type all match
    if (from.kind === 'intersection') {
      return from.members.every((m) => this.isAssignableTo(m, to));
    }

    // Array covariance
    if (from.kind === 'array' && to.kind === 'array') {
      return this.isAssignableTo(from.elementType, to.elementType);
    }

    return false;
  }

  /**
   * Unify types (for generics)
   */
  unify(t1: HoloScriptType, t2: HoloScriptType): Map<string, HoloScriptType> {
    const substitutions = new Map<string, HoloScriptType>();

    // If t1 is a type variable
    if (t1.kind === 'custom' && this.isTypeVariable(t1.name)) {
      substitutions.set(t1.name, t2);
      return substitutions;
    }

    // Structural unification
    if (t1.kind === 'array' && t2.kind === 'array') {
      return this.unify(t1.elementType, t2.elementType);
    }

    if (t1.kind === 'generic' && t2.kind === 'generic') {
      if (t1.name === t2.name && t1.typeArgs.length === t2.typeArgs.length) {
        for (let i = 0; i < t1.typeArgs.length; i++) {
          const unified = this.unify(t1.typeArgs[i], t2.typeArgs[i]);
          for (const [k, v] of unified) {
            substitutions.set(k, v);
          }
        }
      }
    }

    return substitutions;
  }

  private isTypeVariable(name: string): boolean {
    return /^[A-Z]$/.test(name); // Single uppercase letter is type var
  }

  /**
   * Resolve generic type with type arguments
   */
  resolveGeneric(generic: GenericType, concreteTypes: HoloScriptType[]): HoloScriptType {
    const substitutions = new Map<string, HoloScriptType>();

    for (let i = 0; i < generic.typeArgs.length; i++) {
      if (generic.typeArgs[i].kind === 'custom') {
        substitutions.set((generic.typeArgs[i] as CustomType).name, concreteTypes[i]);
      }
    }

    return this.substitute(generic, substitutions);
  }

  private substitute(type: HoloScriptType, subs: Map<string, HoloScriptType>): HoloScriptType {
    if (type.kind === 'custom' && subs.has((type as CustomType).name)) {
      return subs.get((type as CustomType).name)!;
    }

    if (type.kind === 'array') {
      return {
        kind: 'array',
        elementType: this.substitute((type as ArrayType).elementType, subs),
      };
    }

    if (type.kind === 'union') {
      return {
        kind: 'union',
        members: (type as UnionType).members.map((m) => this.substitute(m, subs)),
      };
    }

    return type;
  }
}

/**
 * Exhaustiveness checker for match statements
 */
export class ExhaustivenessChecker {
  /**
   * Check if all union members are covered in match statement
   */
  checkMatch(unionType: UnionType, casePatterns: string[]): {
    isExhaustive: boolean;
    uncoveredCases: string[];
  } {
    const patterns = new Set(casePatterns.map((p) => p.toLowerCase()));

    const uncovered: string[] = [];
    for (const member of unionType.members) {
      const caseName = this.getCaseName(member);
      if (!patterns.has(caseName.toLowerCase()) && caseName !== '_') {
        uncovered.push(caseName);
      }
    }

    return {
      isExhaustive: uncovered.length === 0 || patterns.has('_'),
      uncoveredCases: uncovered,
    };
  }

  private getCaseName(type: HoloScriptType): string {
    if (type.kind === 'literal') {
      return String((type as LiteralType).value);
    }
    if (type.kind === 'custom') {
      return (type as CustomType).name;
    }
    return type.kind;
  }
}

/**
 * Type checker for HoloScript+
 */
export class AdvancedTypeChecker {
  private inference: TypeInferenceEngine;
  private exhaustiveness: ExhaustivenessChecker;
  private types: Map<string, HoloScriptType> = new Map();

  constructor() {
    this.inference = new TypeInferenceEngine();
    this.exhaustiveness = new ExhaustivenessChecker();

    // Register built-in types
    this.registerBuiltins();
  }

  private registerBuiltins(): void {
    this.types.set('Vector3', {
      kind: 'custom',
      name: 'Vector3',
      properties: new Map([
        ['x', { kind: 'primitive', name: 'number' }],
        ['y', { kind: 'primitive', name: 'number' }],
        ['z', { kind: 'primitive', name: 'number' }],
      ]),
      methods: new Map(),
    });

    this.types.set('Transform', {
      kind: 'custom',
      name: 'Transform',
      properties: new Map([
        ['position', this.types.get('Vector3')!],
        ['rotation', this.types.get('Vector3')!],
        ['scale', this.types.get('Vector3')!],
      ]),
      methods: new Map(),
    });
  }

  /**
   * Register a new type
   */
  registerType(name: string, type: HoloScriptType): void {
    this.types.set(name, type);
  }

  /**
   * Get registered type
   */
  getType(name: string): HoloScriptType | undefined {
    return this.types.get(name);
  }

  /**
   * Check union exhaustiveness
   */
  checkUnionExhaustiveness(
    unionType: UnionType,
    cases: string[]
  ): { isExhaustive: boolean; uncoveredCases: string[] } {
    return this.exhaustiveness.checkMatch(unionType, cases);
  }

  /**
   * Check type assignment
   */
  checkAssignment(from: HoloScriptType, to: HoloScriptType): { valid: boolean; error?: string } {
    if (this.inference.isAssignableTo(from, to)) {
      return { valid: true };
    }

    return {
      valid: false,
      error: `Type '${this.formatType(from)}' is not assignable to '${this.formatType(to)}'`,
    };
  }

  private formatType(type: HoloScriptType): string {
    switch (type.kind) {
      case 'primitive':
        return (type as PrimitiveType).name;
      case 'array':
        return `${this.formatType((type as ArrayType).elementType)}[]`;
      case 'union':
        return (type as UnionType).members.map((m) => this.formatType(m)).join(' | ');
      case 'intersection':
        return (type as IntersectionType).members.map((m) => this.formatType(m)).join(' & ');
      case 'custom':
        return (type as CustomType).name;
      case 'literal':
        return JSON.stringify((type as LiteralType).value);
      default:
        return 'unknown';
    }
  }
}

/**
 * HoloScript+ AST Types
 */
export interface HSPlusNode {
  type: 'directive' | 'trait' | 'lifecycle' | 'state' | 'for' | 'if' | 'import' | 'component' | 'element' | 'fragment' | 'Program';
  [key: string]: any;
}

export interface HSPlusAST extends HSPlusNode {
  type: 'Program';
  body: HSPlusNode[];
  version: string;
  root: HSPlusNode;
  imports: Array<{ path: string; alias: string }>;
  hasState: boolean;
  hasVRTraits: boolean;
  hasControlFlow: boolean;
}

export interface HSPlusDirective extends HSPlusNode {
  type: 'directive' | 'trait' | 'lifecycle' | 'state' | 'for' | 'if' | 'import' | 'fragment';
  name: string;
  args: string[];
  enableTypeScriptImports?: boolean;
  enableVRTraits?: boolean;
}

export interface HSPlusCompileResult {
  success: boolean;
  code?: string;
  sourceMap?: any;
  errors: Array<{ message: string; line: number; column: number }>;
  ast?: any;
  compiledExpressions?: any;
  requiredCompanions?: string[];
  features?: any;
  warnings?: any[];
  [key: string]: any;
}

export interface HSPlusParserOptions {
  sourceMap?: boolean;
  strict?: boolean;
  enableTypeScriptImports?: boolean;
  enableVRTraits?: boolean;
}

export type VRTraitName =
  | 'grabbable'
  | 'throwable'
  | 'pointable'
  | 'scalable'
  | 'draggable'
  | 'rotatable'
  | 'clickable'
  | 'hoverable'
  | 'pressable'
  | 'stackable'
  | 'snappable'
  | 'breakable';

export interface StateDeclaration {
  name: string;
  type: HoloScriptType;
  initialValue?: any;
  [key: string]: any;
}

export interface LifecycleHook {
  name: 'mounted' | 'updated' | 'destroyed';
  handler: string;
}

export interface VRLifecycleHook {
  name: 'grabbed' | 'released' | 'pointed' | 'unpointed' | 'thrown';
  handler: string;
}

export interface ControllerHook {
  name: 'trigger' | 'grip' | 'thumbstick' | 'button_a' | 'button_b';
  handler: string;
}

/**
 * Vector3 type for 3D coordinates
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Color type for RGBA colors
 */
export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * VR Hand representation
 */
export interface VRHand {
  position: Vector3;
  rotation: Vector3;
  pinch: number;
  grip: number;
  pointing: boolean;
}

/**
 * HoloScript+ Runtime built-in functions
 */
export interface HSPlusBuiltins {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  setTimeout: (fn: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
  setInterval: (fn: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
  fetch: (url: string, options?: any) => Promise<any>;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler?: (data: any) => void) => void;
  [key: string]: any;
}

/**
 * HoloScript+ Runtime interface
 */
export interface HSPlusRuntime {
  state: Record<string, any>;
  props: Record<string, any>;
  refs: Record<string, any>;
  builtins: HSPlusBuiltins;
  execute: (ast: HSPlusAST) => any;
  evaluate: (expression: string) => any;
  callMethod: (name: string, args: any[]) => any;
  setState: (key: string, value: any) => void;
  getState: (key: string) => any;
  destroy: () => void;
}
