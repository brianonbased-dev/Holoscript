/**
 * @holoscript/core Advanced Type System
 *
 * Union types, generics, type inference, exhaustiveness checking
 */
/**
 * Type inference engine
 */
export class TypeInferenceEngine {
    constructor() {
        this.typeEnvironment = new Map();
        this.genericTypeVars = new Map();
    }
    /**
     * Infer type from value
     */
    inferType(value) {
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
            const elementType = value.length > 0 ? this.inferType(value[0]) : { kind: 'primitive', name: 'void' };
            return { kind: 'array', elementType };
        }
        return { kind: 'primitive', name: 'void' };
    }
    /**
     * Check type compatibility
     */
    isAssignableTo(from, to) {
        // Same type
        if (JSON.stringify(from) === JSON.stringify(to))
            return true;
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
    unify(t1, t2) {
        const substitutions = new Map();
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
    isTypeVariable(name) {
        return /^[A-Z]$/.test(name); // Single uppercase letter is type var
    }
    /**
     * Resolve generic type with type arguments
     */
    resolveGeneric(generic, concreteTypes) {
        const substitutions = new Map();
        for (let i = 0; i < generic.typeArgs.length; i++) {
            if (generic.typeArgs[i].kind === 'custom') {
                substitutions.set(generic.typeArgs[i].name, concreteTypes[i]);
            }
        }
        return this.substitute(generic, substitutions);
    }
    substitute(type, subs) {
        if (type.kind === 'custom' && subs.has(type.name)) {
            return subs.get(type.name);
        }
        if (type.kind === 'array') {
            return {
                kind: 'array',
                elementType: this.substitute(type.elementType, subs),
            };
        }
        if (type.kind === 'union') {
            return {
                kind: 'union',
                members: type.members.map((m) => this.substitute(m, subs)),
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
    checkMatch(unionType, casePatterns) {
        const patterns = new Set(casePatterns.map((p) => p.toLowerCase()));
        const uncovered = [];
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
    getCaseName(type) {
        if (type.kind === 'literal') {
            return String(type.value);
        }
        if (type.kind === 'custom') {
            return type.name;
        }
        return type.kind;
    }
}
/**
 * Type checker for HoloScript+
 */
export class AdvancedTypeChecker {
    constructor() {
        this.types = new Map();
        this.inference = new TypeInferenceEngine();
        this.exhaustiveness = new ExhaustivenessChecker();
        // Register built-in types
        this.registerBuiltins();
    }
    registerBuiltins() {
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
                ['position', this.types.get('Vector3')],
                ['rotation', this.types.get('Vector3')],
                ['scale', this.types.get('Vector3')],
            ]),
            methods: new Map(),
        });
    }
    /**
     * Register a new type
     */
    registerType(name, type) {
        this.types.set(name, type);
    }
    /**
     * Get registered type
     */
    getType(name) {
        return this.types.get(name);
    }
    /**
     * Check union exhaustiveness
     */
    checkUnionExhaustiveness(unionType, cases) {
        return this.exhaustiveness.checkMatch(unionType, cases);
    }
    /**
     * Check type assignment
     */
    checkAssignment(from, to) {
        if (this.inference.isAssignableTo(from, to)) {
            return { valid: true };
        }
        return {
            valid: false,
            error: `Type '${this.formatType(from)}' is not assignable to '${this.formatType(to)}'`,
        };
    }
    formatType(type) {
        switch (type.kind) {
            case 'primitive':
                return type.name;
            case 'array':
                return `${this.formatType(type.elementType)}[]`;
            case 'union':
                return type.members.map((m) => this.formatType(m)).join(' | ');
            case 'intersection':
                return type.members.map((m) => this.formatType(m)).join(' & ');
            case 'custom':
                return type.name;
            case 'literal':
                return JSON.stringify(type.value);
            default:
                return 'unknown';
        }
    }
}
