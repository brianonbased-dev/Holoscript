/**
 * HoloScript Runtime Engine
 *
 * Executes HoloScript AST in VR environment with spatial computation.
 * Supports:
 * - Orb creation and manipulation
 * - Function definition and invocation with arguments
 * - Connections and reactive data flow
 * - Gates (conditionals)
 * - Streams (data pipelines)
 * - 2D UI elements
 * - Built-in commands (show, hide, animate, pulse)
 * - Expression evaluation
 * - Event system
 */

import { logger } from './logger';
import type {
  ASTNode,
  OrbNode,
  MethodNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  SpatialPosition,
  HologramProperties,
  HologramShape,
  RuntimeContext,
  ExecutionResult,
  ParticleSystem,
  TransformationNode,
  UI2DNode,
  ScaleNode,
  FocusNode,
  EnvironmentNode,
  CompositionNode,
  TemplateNode,
  HoloScriptValue,
  ServerNode,
  DatabaseNode,
  FetchNode,
  ExecuteNode,
  DebugNode,
  VisualizeNode,
} from './types';
import type { ImportLoader } from './types';

const RUNTIME_SECURITY_LIMITS = {
  maxExecutionDepth: 50,
  maxTotalNodes: 1000,
  maxExecutionTimeMs: 5000,
  maxParticlesPerSystem: 1000,
  maxStringLength: 10000,
  maxCallStackDepth: 100,
};

/**
 * Event handler type
 */
type EventHandler = (data?: HoloScriptValue) => void | Promise<void>;

/**
 * Scope for variable resolution
 */
interface Scope {
  variables: Map<string, HoloScriptValue>;
  parent?: Scope;
}

/**
 * Animation state
 */
interface Animation {
  target: string;
  property: string;
  from: number;
  to: number;
  duration: number;
  startTime: number;
  easing: string;
  loop?: boolean;
  yoyo?: boolean;
}

/**
 * UI Element state
 */
interface UIElementState {
  type: string;
  name: string;
  properties: Record<string, HoloScriptValue>;
  value?: HoloScriptValue;
  visible: boolean;
  enabled: boolean;
}

export class HoloScriptRuntime {
  private context: RuntimeContext;
  private particleSystems: Map<string, ParticleSystem> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private startTime: number = 0;
  private nodeCount: number = 0;

  // Enhanced runtime state
  private currentScope: Scope;
  private callStack: string[] = [];
  private eventHandlers: Map<string, EventHandler[]> = new Map();
  private animations: Map<string, Animation> = new Map();
  private uiElements: Map<string, UIElementState> = new Map();
  private builtinFunctions: Map<string, (args: HoloScriptValue[]) => HoloScriptValue>;

  constructor(_importLoader?: ImportLoader) {
    this.context = this.createEmptyContext();
    this.currentScope = { variables: this.context.variables };
    this.builtinFunctions = this.initBuiltins();
  }

  /**
   * Initialize built-in functions
   */
  private initBuiltins(): Map<string, (args: HoloScriptValue[]) => HoloScriptValue> {
    const builtins = new Map<string, (args: HoloScriptValue[]) => HoloScriptValue>();

    // Display commands
    builtins.set('show', (args) => {
      const target = String(args[0]);
      const element = this.uiElements.get(target);
      if (element) element.visible = true;
      const hologram = this.context.hologramState.get(target);
      if (hologram) {
        this.createParticleEffect(`${target}_show`, { x: 0, y: 0, z: 0 }, hologram.color, 15);
      }
      logger.info('show', { target });
      return { shown: target };
    });

    builtins.set('hide', (args) => {
      const target = String(args[0]);
      const element = this.uiElements.get(target);
      if (element) element.visible = false;
      logger.info('hide', { target });
      return { hidden: target };
    });

    // Animation commands
    builtins.set('pulse', (args) => {
      const target = String(args[0]);
      const options = (args[1] as Record<string, unknown>) || {};
      const duration = Number(options.duration) || 1000;
      const color = String(options.color || '#ffffff');

      const position = this.context.spatialMemory.get(target) || { x: 0, y: 0, z: 0 };
      this.createParticleEffect(`${target}_pulse`, position, color, 30);

      return { pulsing: target, duration };
    });

    builtins.set('animate', (args) => {
      const target = String(args[0]);
      const options = (args[1] as Record<string, unknown>) || {};

      const animation: Animation = {
        target,
        property: String(options.property || 'position.y'),
        from: Number(options.from || 0),
        to: Number(options.to || 1),
        duration: Number(options.duration || 1000),
        startTime: Date.now(),
        easing: String(options.easing || 'linear'),
        loop: Boolean(options.loop),
        yoyo: Boolean(options.yoyo),
      };

      this.animations.set(`${target}_${animation.property}`, animation);
      return { animating: target, animation };
    });

    // Spatial commands
    builtins.set('spawn', (args) => {
      const target = String(args[0]);
      const position = (args[1] as SpatialPosition) || { x: 0, y: 0, z: 0 };

      this.context.spatialMemory.set(target, position);
      this.createParticleEffect(`${target}_spawn`, position, '#00ff00', 25);

      return { spawned: target, at: position };
    });

    builtins.set('move', (args) => {
      const target = String(args[0]);
      const position = (args[1] as SpatialPosition) || { x: 0, y: 0, z: 0 };

      const current = this.context.spatialMemory.get(target);
      if (current) {
        this.context.spatialMemory.set(target, position);
        this.createConnectionStream(target, `${target}_dest`, current, position, 'move');
      }

      return { moved: target, to: position };
    });

    // Data commands
    builtins.set('set', (args) => {
      const target = String(args[0]);
      const value = args[1];
      this.setVariable(target, value);
      return { set: target, value };
    });

    builtins.set('get', (args) => {
      const target = String(args[0]);
      return this.getVariable(target);
    });

    // Math functions
    builtins.set('add', (args) => Number(args[0]) + Number(args[1]));
    builtins.set('subtract', (args) => Number(args[0]) - Number(args[1]));
    builtins.set('multiply', (args) => Number(args[0]) * Number(args[1]));
    builtins.set('divide', (args) => Number(args[1]) !== 0 ? Number(args[0]) / Number(args[1]) : 0);
    builtins.set('mod', (args) => Number(args[0]) % Number(args[1]));
    builtins.set('abs', (args) => Math.abs(Number(args[0])));
    builtins.set('floor', (args) => Math.floor(Number(args[0])));
    builtins.set('ceil', (args) => Math.ceil(Number(args[0])));
    builtins.set('round', (args) => Math.round(Number(args[0])));
    builtins.set('min', (args) => Math.min(...args.map(Number)));
    builtins.set('max', (args) => Math.max(...args.map(Number)));
    builtins.set('random', () => Math.random());

    // String functions
    builtins.set('concat', (args) => args.map(String).join(''));
    builtins.set('length', (args) => {
      const val = args[0];
      if (typeof val === 'string') return val.length;
      if (Array.isArray(val)) return val.length;
      return 0;
    });
    builtins.set('substring', (args) => String(args[0]).substring(Number(args[1]), Number(args[2])));
    builtins.set('uppercase', (args) => String(args[0]).toUpperCase());
    builtins.set('lowercase', (args) => String(args[0]).toLowerCase());

    // Array functions
    builtins.set('push', (args) => {
      const arr = args[0];
      if (Array.isArray(arr)) {
        arr.push(args[1]);
        return arr;
      }
      return [args[0], args[1]];
    });
    builtins.set('pop', (args) => {
      const arr = args[0];
      if (Array.isArray(arr)) return arr.pop();
      return undefined;
    });
    builtins.set('at', (args) => {
      const arr = args[0];
      const index = Number(args[1]);
      if (Array.isArray(arr)) return arr[index];
      return undefined;
    });

    // Console/Debug
    builtins.set('log', (args) => {
      logger.info('HoloScript log', { args });
      return args[0];
    });
    builtins.set('print', (args) => {
      const message = args.map(String).join(' ');
      logger.info('print', { message });
      return message;
    });

    // Type checking
    builtins.set('typeof', (args) => typeof args[0]);
    builtins.set('isArray', (args) => Array.isArray(args[0]));
    builtins.set('isNumber', (args) => typeof args[0] === 'number' && !isNaN(args[0] as number));
    builtins.set('isString', (args) => typeof args[0] === 'string');

    return builtins;
  }

  /**
   * Execute a single AST node
   */
  async executeNode(node: ASTNode): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      this.context.executionStack.push(node);

      let result: ExecutionResult;

      switch (node.type) {
        case 'orb':
          result = await this.executeOrb(node as OrbNode);
          break;
        case 'method':
        case 'function':
          result = await this.executeFunction(node as MethodNode);
          break;
        case 'connection':
          result = await this.executeConnection(node as ConnectionNode);
          break;
        case 'gate':
          result = await this.executeGate(node as GateNode);
          break;
        case 'stream':
          result = await this.executeStream(node as StreamNode);
          break;
        case 'execute':
        case 'call':
          result = await this.executeCall(node as ASTNode & { target?: string; args?: unknown[] });
          break;
        case 'debug':
          result = await this.executeDebug(node);
          break;
        case 'visualize':
          result = await this.executeVisualize(node);
          break;
        case '2d-element':
          result = await this.executeUIElement(node as unknown as UI2DNode);
          break;
        case 'nexus':
        case 'building':
          result = await this.executeStructure(node);
          break;
        case 'assignment':
          result = await this.executeAssignment(node as ASTNode & { name: string; value: unknown });
          break;
        case 'return':
          result = await this.executeReturn(node as ASTNode & { value: unknown });
          break;
        case 'generic':
          result = await this.executeGeneric(node);
          break;
        case 'expression-statement':
          result = await this.executeCall(node);
          break;
        case 'scale':
          result = await this.executeScale(node as ScaleNode);
          break;
        case 'focus':
          result = await this.executeFocus(node as FocusNode);
          break;
        case 'environment':
          result = await this.executeEnvironment(node as EnvironmentNode);
          break;
        case 'composition':
          result = await this.executeComposition(node as CompositionNode);
          break;
        case 'template':
          result = await this.executeTemplate(node as TemplateNode);
          break;
        case 'server':
          result = await this.executeServerNode(node as ServerNode);
          break;
        case 'database':
          result = await this.executeDatabaseNode(node as DatabaseNode);
          break;
        case 'fetch':
          result = await this.executeFetchNode(node as FetchNode);
          break;
        case 'execute':
          result = await this.executeTarget(node as ExecuteNode);
          break;
        case 'debug':
          result = await this.executeDebug(node as DebugNode);
          break;
        case 'visualize':
          result = await this.executeVisualize(node as VisualizeNode);
          break;
        default:
          result = {
            success: false,
            error: `Unknown node type: ${node.type}`,
            executionTime: Date.now() - startTime,
          };
      }

      result.executionTime = Date.now() - startTime;
      this.executionHistory.push(result);
      this.context.executionStack.pop();

      return result;
    } catch (error) {
      const execTime = Date.now() - startTime;
      const errorResult: ExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: execTime,
      };

      this.executionHistory.push(errorResult);
      this.context.executionStack.pop();

      return errorResult;
    }
  }

  /**
   * Execute multiple nodes in sequence
   */
  async executeProgram(nodes: ASTNode[], depth: number = 0): Promise<ExecutionResult[]> {
    if (depth === 0) {
      this.startTime = Date.now();
      this.nodeCount = 0;
    }

    if (depth > RUNTIME_SECURITY_LIMITS.maxExecutionDepth) {
      logger.error('Max execution depth exceeded', { depth });
      return [{
        success: false,
        error: `Max execution depth exceeded (${RUNTIME_SECURITY_LIMITS.maxExecutionDepth})`,
        executionTime: 0,
      }];
    }

    const results: ExecutionResult[] = [];

    for (const node of nodes) {
      this.nodeCount++;
      if (this.nodeCount > RUNTIME_SECURITY_LIMITS.maxTotalNodes) {
        logger.error('Max total nodes exceeded', { count: this.nodeCount });
        results.push({
          success: false,
          error: 'Max total nodes exceeded',
          executionTime: Date.now() - this.startTime,
        });
        break;
      }

      if (Date.now() - this.startTime > RUNTIME_SECURITY_LIMITS.maxExecutionTimeMs) {
        logger.error('Execution timeout', { duration: Date.now() - this.startTime });
        results.push({
          success: false,
          error: 'Execution timeout',
          executionTime: Date.now() - this.startTime,
        });
        break;
      }

      const result = await this.executeNode(node);
      results.push(result);

      // Stop on error (except visualize) or return statement
      if (!result.success && node.type !== 'visualize') {
        break;
      }
      if (node.type === 'return') {
        break;
      }
    }

    return results;
  }

  /**
   * Call a function with arguments
   */
  async callFunction(name: string, args: HoloScriptValue[] = []): Promise<ExecutionResult> {
    // Check built-in functions first
    const builtin = this.builtinFunctions.get(name);
    if (builtin) {
      try {
        const result = builtin(args);
        return {
          success: true,
          output: result,
        };
      } catch (error) {
        return {
          success: false,
          error: `Built-in function ${name} failed: ${error}`,
        };
      }
    }

    // Check user-defined functions
    const func = this.context.functions.get(name);
    if (!func) {
      return {
        success: false,
        error: `Function '${name}' not found`,
      };
    }

    // Check call stack depth
    if (this.callStack.length >= RUNTIME_SECURITY_LIMITS.maxCallStackDepth) {
      return {
        success: false,
        error: `Max call stack depth exceeded (${RUNTIME_SECURITY_LIMITS.maxCallStackDepth})`,
      };
    }

    // Create new scope
    const parentScope = this.currentScope;
    this.currentScope = {
      variables: new Map(),
      parent: parentScope,
    };

    // Bind parameters
    func.parameters.forEach((param, index) => {
      const value = index < args.length ? args[index] : param.defaultValue;
      this.currentScope.variables.set(param.name, value);
    });

    // Push to call stack
    this.callStack.push(name);

    // Execute function body
    let returnValue: unknown = undefined;
    try {
      const results = await this.executeProgram(func.body, this.callStack.length);
      const lastResult = results[results.length - 1];

      if (lastResult?.output !== undefined) {
        returnValue = lastResult.output;
      }

      // Visual effect
      this.createExecutionEffect(name, func.position || { x: 0, y: 0, z: 0 });

      return {
        success: results.every(r => r.success),
        output: returnValue,
        hologram: func.hologram,
        spatialPosition: func.position,
      };
    } finally {
      // Restore scope
      this.currentScope = parentScope;
      this.callStack.pop();
    }
  }

  /**
   * Set a variable in current scope
   */
  setVariable(name: string, value: HoloScriptValue): void {
    // Handle property access (e.g., "obj.prop")
    if (name.includes('.')) {
      const parts = name.split('.');
      const objName = parts[0];
      const propPath = parts.slice(1);

      let obj = this.getVariable(objName);
      if (obj === undefined || typeof obj !== 'object' || obj === null) {
        obj = {};
        this.currentScope.variables.set(objName, obj as HoloScriptValue);
      }

      let current = obj as Record<string, HoloScriptValue>;
      for (let i = 0; i < propPath.length - 1; i++) {
        if (current[propPath[i]] === undefined || typeof current[propPath[i]] !== 'object') {
          current[propPath[i]] = {};
        }
        current = current[propPath[i]] as Record<string, HoloScriptValue>;
      }
      current[propPath[propPath.length - 1]] = value;
    } else {
      this.currentScope.variables.set(name, value);
    }
  }

  /**
   * Get a variable from scope chain
   */
  getVariable(name: string): HoloScriptValue {
    // Handle property access (e.g., "obj.prop")
    if (name.includes('.')) {
      const parts = name.split('.');
      let value = this.getVariable(parts[0]);

      for (let i = 1; i < parts.length && value !== undefined; i++) {
        if (typeof value === 'object' && value !== null) {
          value = (value as Record<string, HoloScriptValue>)[parts[i]];
        } else {
          return undefined;
        }
      }
      return value;
    }

    // Walk scope chain
    let scope: Scope | undefined = this.currentScope;
    while (scope) {
      if (scope.variables.has(name)) {
        return scope.variables.get(name);
      }
      scope = scope.parent;
    }

    // Check context variables
    if (this.context.variables.has(name)) {
      return this.context.variables.get(name);
    }

    // Fallback to functions map (for imported functions)
    if (this.context.functions.has(name)) {
      return this.context.functions.get(name);
    }

    return undefined;
  }

  /**
   * Evaluate an expression
   */
  /**
   * Evaluate an expression
   */
  evaluateExpression(expr: string): HoloScriptValue {
    if (!expr || typeof expr !== 'string') return expr;

    expr = expr.trim();

    // Security check
    const suspicious = ['eval', 'process', 'require', '__proto__', 'constructor', 'Function'];
    if (suspicious.some(kw => expr.toLowerCase().includes(kw))) {
      logger.warn('Suspicious expression blocked', { expr });
      return undefined;
    }

    // String literal
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // Boolean literal
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    // Array literal [a, b, c]
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const inner = expr.slice(1, -1);
      if (!inner.trim()) return [];
      const elements = this.splitByComma(inner);
      return elements.map(e => this.evaluateExpression(e.trim())) as HoloScriptValue[];
    }

    // Object literal {a: 1, b: 2}
    if (expr.startsWith('{') && expr.endsWith('}')) {
      const inner = expr.slice(1, -1);
      if (!inner.trim()) return {};
      const pairs = this.splitByComma(inner);
      const obj: Record<string, HoloScriptValue> = {};
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex > 0) {
          const key = pair.slice(0, colonIndex).trim();
          const value = pair.slice(colonIndex + 1).trim();
          obj[key] = this.evaluateExpression(value);
        }
      }
      return obj;
    }

    // Function call: name(args)
    const funcMatch = expr.match(/^(\w+)\s*\((.*)?\)$/);
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      const args = argsStr ? this.splitByComma(argsStr).map(a => this.evaluateExpression(a.trim())) : [];

      // Check builtins
      const builtin = this.builtinFunctions.get(funcName);
      if (builtin) {
        return builtin(args);
      }

      // Check user functions (but don't execute - just reference)
      if (this.context.functions.has(funcName)) {
        // For async execution, return a promise marker
        return { __holoCall: funcName, args } as unknown as HoloScriptValue;
      }

      return undefined;
    }

    // Binary operations: a + b, a - b, etc.
    const binaryOps = [
      { pattern: /(.+)\s*\+\s*(.+)/, op: (a: HoloScriptValue, b: HoloScriptValue) => (typeof a === 'string' || typeof b === 'string') ? String(a) + String(b) : Number(a) + Number(b) },
      { pattern: /(.+)\s*-\s*(.+)/, op: (a: HoloScriptValue, b: HoloScriptValue) => Number(a) - Number(b) },
      { pattern: /(.+)\s*\*\s*(.+)/, op: (a: HoloScriptValue, b: HoloScriptValue) => Number(a) * Number(b) },
      { pattern: /(.+)\s*\/\s*(.+)/, op: (a: HoloScriptValue, b: HoloScriptValue) => Number(b) !== 0 ? Number(a) / Number(b) : 0 },
      { pattern: /(.+)\s*%\s*(.+)/, op: (a: HoloScriptValue, b: HoloScriptValue) => Number(a) % Number(b) },
    ];

    for (const { pattern, op } of binaryOps) {
      const match = expr.match(pattern);
      if (match) {
        const left = this.evaluateExpression(match[1]);
        const right = this.evaluateExpression(match[2]);
        return op(left, right);
      }
    }

    // Variable reference
    return this.getVariable(expr);
  }

  /**
   * Split string by comma, respecting nesting
   */
  private splitByComma(str: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && str[i - 1] !== '\\') {
        inString = false;
      }

      if (!inString) {
        if (char === '(' || char === '[' || char === '{') depth++;
        if (char === ')' || char === ']' || char === '}') depth--;

        if (char === ',' && depth === 0) {
          parts.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts;
  }

  // ============================================================================
  // Node Executors
  // ============================================================================

  private async executeOrb(node: OrbNode): Promise<ExecutionResult> {
    const scale = this.context.currentScale || 1;
    const adjustedPos = node.position ? {
      x: node.position.x * scale,
      y: node.position.y * scale,
      z: node.position.z * scale
    } : { x: 0, y: 0, z: 0 };

    if (node.position) {
      this.context.spatialMemory.set(node.name, adjustedPos);
    }

    const hologram = node.hologram ? {
      ...node.hologram,
      size: (node.hologram.size || 1) * scale
    } : undefined;

    // Create orb object with reactive properties
    const orbData = {
      __type: 'orb',
      name: node.name,
      properties: { ...node.properties },
      position: adjustedPos,
      hologram: hologram,
      created: Date.now(),
      // Methods bound to this orb
      show: () => this.builtinFunctions.get('show')!([node.name]),
      hide: () => this.builtinFunctions.get('hide')!([node.name]),
      pulse: (opts?: Record<string, unknown>) => this.builtinFunctions.get('pulse')!([node.name, opts]),
    };

    this.context.variables.set(node.name, orbData);

    if (hologram) {
      this.context.hologramState.set(node.name, hologram);
    }

    this.createParticleEffect(`${node.name}_creation`, adjustedPos, '#00ffff', 20);

    logger.info('Orb created', { name: node.name, properties: Object.keys(node.properties), scale });

    return {
      success: true,
      output: orbData,
      hologram: hologram,
      spatialPosition: adjustedPos,
    };
  }

  private async executeFunction(node: MethodNode): Promise<ExecutionResult> {
    this.context.functions.set(node.name, node);

    const hologram: HologramProperties = {
      shape: 'cube',
      color: '#ff6b35',
      size: 1.5,
      glow: true,
      interactive: true,
      ...node.hologram,
    };

    this.context.hologramState.set(node.name, hologram);

    logger.info('Function defined', { name: node.name, params: node.parameters.map(p => p.name) });

    return {
      success: true,
      output: `Function '${node.name}' defined with ${node.parameters.length} parameter(s)`,
      hologram,
      spatialPosition: node.position,
    };
  }

  private async executeConnection(node: ConnectionNode): Promise<ExecutionResult> {
    this.context.connections.push(node);

    const fromPos = this.context.spatialMemory.get(node.from);
    const toPos = this.context.spatialMemory.get(node.to);

    if (fromPos && toPos) {
      this.createConnectionStream(node.from, node.to, fromPos, toPos, node.dataType);
    }

    // Set up reactive binding if bidirectional
    if (node.bidirectional) {
      // When 'from' changes, update 'to'
      this.on(`${node.from}.changed`, async (data) => {
        this.setVariable(node.to, data);
        this.emit(`${node.to}.changed`, data);
      });
      // When 'to' changes, update 'from'
      this.on(`${node.to}.changed`, async (data) => {
        this.setVariable(node.from, data);
        this.emit(`${node.from}.changed`, data);
      });
    }

    logger.info('Connection created', { from: node.from, to: node.to, dataType: node.dataType });

    return {
      success: true,
      output: `Connected '${node.from}' to '${node.to}' (${node.dataType})`,
      hologram: {
        shape: 'cylinder',
        color: this.getDataTypeColor(node.dataType),
        size: 0.1,
        glow: true,
        interactive: false,
      },
    };
  }

  private async executeGate(node: GateNode): Promise<ExecutionResult> {
    try {
      const condition = this.evaluateCondition(node.condition);
      const path = condition ? node.truePath : node.falsePath;

      logger.info('Gate evaluation', { condition: node.condition, result: condition });

      if (path.length > 0) {
        await this.executeProgram(path, this.callStack.length + 1);
      }

      return {
        success: true,
        output: `Gate: took ${condition ? 'true' : 'false'} path`,
        hologram: {
          shape: 'pyramid',
          color: condition ? '#00ff00' : '#ff0000',
          size: 1,
          glow: true,
          interactive: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: `Gate execution failed: ${error}`,
      };
    }
  }

  private async executeStream(node: StreamNode): Promise<ExecutionResult> {
    let data = this.getVariable(node.source);

    logger.info('Stream processing', { name: node.name, source: node.source, transforms: node.transformations.length });

    for (const transform of node.transformations) {
      data = await this.applyTransformation(data, transform);
    }

    this.setVariable(`${node.name}_result`, data);
    this.createFlowingStream(node.name, node.position || { x: 0, y: 0, z: 0 }, data);

    return {
      success: true,
      output: `Stream '${node.name}' processed ${Array.isArray(data) ? data.length : 1} item(s)`,
      hologram: node.hologram,
      spatialPosition: node.position,
    };
  }

  private async executeCall(node: ASTNode & { target?: string; args?: unknown[] }): Promise<ExecutionResult> {
    const funcName = node.target || '';
    const args = node.args || [];

    return this.callFunction(funcName, args);
  }

  private async executeDebug(node: ASTNode & { target?: string }): Promise<ExecutionResult> {
    const debugInfo = {
      variables: Object.fromEntries(this.currentScope.variables),
      contextVariables: Object.fromEntries(this.context.variables),
      functions: Array.from(this.context.functions.keys()),
      connections: this.context.connections.length,
      callStack: [...this.callStack],
      uiElements: Array.from(this.uiElements.keys()),
      animations: Array.from(this.animations.keys()),
      executionHistory: this.executionHistory.slice(-10),
    };

    const debugOrb: HologramProperties = {
      shape: 'pyramid',
      color: '#ff1493',
      size: 0.8,
      glow: true,
      interactive: true,
    };

    this.context.hologramState.set(`debug_${node.target || 'program'}`, debugOrb);

    logger.info('Debug info', debugInfo);

    return {
      success: true,
      output: debugInfo,
      hologram: debugOrb,
    };
  }

  private async executeVisualize(node: ASTNode & { target?: string }): Promise<ExecutionResult> {
    const target = node.target || '';
    const data = this.getVariable(target);

    if (data === undefined) {
      return {
        success: false,
        error: `No data found for '${target}'`,
      };
    }

    const visHologram: HologramProperties = {
      shape: 'cylinder',
      color: '#32cd32',
      size: 1.5,
      glow: true,
      interactive: true,
    };

    this.createDataVisualization(target, data, node.position || { x: 0, y: 0, z: 0 });

    return {
      success: true,
      output: { visualizing: target, data },
      hologram: visHologram,
    };
  }

  private async executeUIElement(node: UI2DNode): Promise<ExecutionResult> {
    const element: UIElementState = {
      type: node.elementType,
      name: node.name,
      properties: { ...node.properties },
      visible: true,
      enabled: true,
    };

    // Set initial value based on element type
    if (node.elementType === 'textinput') {
      element.value = node.properties.value || '';
    } else if (node.elementType === 'slider') {
      element.value = node.properties.value || node.properties.min || 0;
    } else if (node.elementType === 'toggle') {
      element.value = node.properties.checked || false;
    }

    this.uiElements.set(node.name, element);

    // Register event handlers
    if (node.events) {
      for (const [eventName, handlerName] of Object.entries(node.events)) {
        this.on(`${node.name}.${eventName}`, async () => {
          await this.callFunction(handlerName);
        });
      }
    }

    logger.info('UI element created', { type: node.elementType, name: node.name });

    return {
      success: true,
      output: element,
    };
  }

  /**
   * Execute generic voice commands
   * Handles commands like: show, hide, animate, pulse, create
   */
  private async executeGeneric(_node: ASTNode): Promise<ExecutionResult> {
    const genericNode = _node as any;
    const command = String(genericNode.command || '').trim().toLowerCase();
    const tokens = command.split(/\s+/);
    const action = tokens[0];
    const target = tokens[1];

    logger.info('Executing generic command', { command, action, target });

    try {
      let result: any;

      switch (action) {
        case 'show':
          result = await this.executeShowCommand(target, genericNode);
          break;
        case 'hide':
          result = await this.executeHideCommand(target, genericNode);
          break;
        case 'create':
        case 'summon':
          result = await this.executeCreateCommand(tokens.slice(1), genericNode);
          break;
        case 'animate':
          result = await this.executeAnimateCommand(target, tokens.slice(2), genericNode);
          break;
        case 'pulse':
          result = await this.executePulseCommand(target, tokens.slice(2), genericNode);
          break;
        case 'move':
          result = await this.executeMoveCommand(target, tokens.slice(2), genericNode);
          break;
        case 'delete':
        case 'remove':
          result = await this.executeDeleteCommand(target, genericNode);
          break;
        default:
          // Default: create visual representation of the generic command
          logger.warn('Unknown voice command action', { action, command });
          result = {
            executed: false,
            message: `Unknown command: ${action}`,
          };
      }

      return {
        success: true,
        output: result,
      };
    } catch (error) {
      return {
        success: false,
        error: `Generic command execution failed: ${String(error)}`,
      };
    }
  }

  /**
   * Execute 'show' command
   */
  private async executeShowCommand(target: string, _node: any): Promise<any> {
    // Create or show orb for this target
    const hologram = _node.hologram || {
      shape: 'orb',
      color: '#00ffff',
      size: 0.8,
      glow: true,
      interactive: true,
    };

    const position = _node.position || { x: 0, y: 0, z: 0 };
    this.context.spatialMemory.set(target, position);
    this.createParticleEffect(`${target}_show`, position, hologram.color, 15);

    logger.info('Show command executed', { target, position });

    return {
      showed: target,
      hologram,
      position,
    };
  }

  /**
   * Execute 'hide' command
   */
  private async executeHideCommand(target: string, _node: any): Promise<any> {
    const position = this.context.spatialMemory.get(target) || { x: 0, y: 0, z: 0 };
    this.createParticleEffect(`${target}_hide`, position, '#ff0000', 10);
    
    logger.info('Hide command executed', { target });

    return {
      hidden: target,
    };
  }

  /**
   * Execute 'create' command
   */
  private async executeCreateCommand(tokens: string[], _node: any): Promise<any> {
    if (tokens.length < 2) {
      return { error: 'Create command requires shape and name' };
    }

    const shape = tokens[0];
    const name = tokens[1];
    const position = _node.position || { x: 0, y: 0, z: 0 };

    const hologram: HologramProperties = {
      shape: shape as HologramShape,
      color: _node.hologram?.color || '#00ffff',
      size: _node.hologram?.size || 1,
      glow: _node.hologram?.glow !== false,
      interactive: _node.hologram?.interactive !== false,
    };

    this.context.spatialMemory.set(name, position);
    this.createParticleEffect(`${name}_create`, position, hologram.color, 20);

    logger.info('Create command executed', { shape, name, position });

    return {
      created: name,
      shape,
      hologram,
      position,
    };
  }

  /**
   * Execute 'animate' command
   */
  private async executeAnimateCommand(target: string, tokens: string[], _node: any): Promise<any> {
    const property = tokens[0] || 'position.y';
    const duration = parseInt(tokens[1] || '1000', 10);
    
    const animation: Animation = {
      target,
      property,
      from: 0,
      to: 1,
      duration,
      startTime: Date.now(),
      easing: 'ease-in-out',
    };

    this.animations.set(`${target}_${property}`, animation);

    logger.info('Animate command executed', { target, property, duration });

    return {
      animating: target,
      animation,
    };
  }

  /**
   * Execute 'pulse' command
   */
  private async executePulseCommand(target: string, tokens: string[], _node: any): Promise<any> {
    const duration = parseInt(tokens[0] || '500', 10);
    const position = this.context.spatialMemory.get(target) || { x: 0, y: 0, z: 0 };

    // Create pulsing particle effect
    this.createParticleEffect(`${target}_pulse`, position, '#ffff00', 30);

    // Create animation for scale
    const animation: Animation = {
      target,
      property: 'scale',
      from: 1,
      to: 1.5,
      duration,
      startTime: Date.now(),
      easing: 'sine',
      yoyo: true,
      loop: true,
    };

    this.animations.set(`${target}_pulse`, animation);

    logger.info('Pulse command executed', { target, duration });

    return {
      pulsing: target,
      duration,
    };
  }

  /**
   * Execute 'move' command
   */
  private async executeMoveCommand(target: string, tokens: string[], _node: any): Promise<any> {
    const x = parseFloat(tokens[0] || '0');
    const y = parseFloat(tokens[1] || '0');
    const z = parseFloat(tokens[2] || '0');
    const position: SpatialPosition = { x, y, z };

    const current = this.context.spatialMemory.get(target);
    if (current) {
      this.context.spatialMemory.set(target, position);
      this.createConnectionStream(target, `${target}_move`, current, position, 'movement');
    } else {
      this.context.spatialMemory.set(target, position);
    }

    logger.info('Move command executed', { target, position });

    return {
      moved: target,
      to: position,
    };
  }

  /**
   * Execute 'delete' command
   */
  private async executeDeleteCommand(target: string, _node: any): Promise<any> {
    const position = this.context.spatialMemory.get(target);
    if (position) {
      this.createParticleEffect(`${target}_delete`, position, '#ff0000', 15);
      this.context.spatialMemory.delete(target);
    }

    logger.info('Delete command executed', { target });

    return {
      deleted: target,
    };
  }

  private async executeStructure(node: ASTNode): Promise<ExecutionResult> {
    // Handle nexus, building, and other structural elements
    const hologram: HologramProperties = node.hologram || {
      shape: node.type === 'nexus' ? 'sphere' : 'cube',
      color: node.type === 'nexus' ? '#9b59b6' : '#e74c3c',
      size: node.type === 'nexus' ? 3 : 4,
      glow: true,
      interactive: true,
    };

    return {
      success: true,
      output: { type: node.type, created: true },
      hologram,
      spatialPosition: node.position,
    };
  }

  private async executeAssignment(node: ASTNode & { name: string; value: unknown }): Promise<ExecutionResult> {
    const value = this.evaluateExpression(String(node.value));
    this.setVariable(node.name, value);

    return {
      success: true,
      output: { assigned: node.name, value },
    };
  }

  private async executeReturn(node: ASTNode & { value: unknown }): Promise<ExecutionResult> {
    const value = this.evaluateExpression(String(node.value));

    return {
      success: true,
      output: value,
    };
  }

  // ============================================================================
  // Condition Evaluation
  // ============================================================================

  private evaluateCondition(condition: string): boolean {
    if (!condition) return false;

    const suspiciousKeywords = ['eval', 'process', 'require', '__proto__', 'constructor'];
    if (suspiciousKeywords.some(kw => condition.toLowerCase().includes(kw))) {
      logger.warn('Suspicious condition blocked', { condition });
      return false;
    }

    try {
      // Boolean literals
      if (condition.trim().toLowerCase() === 'true') return true;
      if (condition.trim().toLowerCase() === 'false') return false;

      // Comparison operators
      const comparisonPatterns: Array<{ regex: RegExp; logical?: string }> = [
        { regex: /^(.+?)\s*(===|!==)\s*(.+)$/ },
        { regex: /^(.+?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/ },
        { regex: /^(.+?)\s*(&&)\s*(.+)$/, logical: 'and' },
        { regex: /^(.+?)\s*(\|\|)\s*(.+)$/, logical: 'or' },
      ];

      for (const { regex, logical } of comparisonPatterns) {
        const match = condition.match(regex);
        if (match) {
          const [, leftExpr, operator, rightExpr] = match;
          const left = this.evaluateExpression(leftExpr.trim());
          const right = this.evaluateExpression(rightExpr.trim());

          if (logical === 'and') return Boolean(left) && Boolean(right);
          if (logical === 'or') return Boolean(left) || Boolean(right);

          switch (operator) {
            case '===': return left === right;
            case '!==': return left !== right;
            case '==': return left == right;
            case '!=': return left != right;
            case '>=': return Number(left) >= Number(right);
            case '<=': return Number(left) <= Number(right);
            case '>': return Number(left) > Number(right);
            case '<': return Number(left) < Number(right);
          }
        }
      }

      // Negation
      if (condition.startsWith('!')) {
        return !this.evaluateCondition(condition.slice(1).trim());
      }

      // Variable truthiness
      const value = this.evaluateExpression(condition.trim());
      return Boolean(value);
    } catch (error) {
      logger.error('Condition evaluation error', { condition, error });
      return false;
    }
  }

  // ============================================================================
  // Transformation
  // ============================================================================

  private async applyTransformation(data: unknown, transform: TransformationNode): Promise<unknown> {
    const params = transform.parameters || {};

    switch (transform.operation) {
      case 'filter': {
        if (!Array.isArray(data)) return data;
        const predicate = params.predicate as string;
        if (predicate) {
          return data.filter(item => {
            this.setVariable('_item', item);
            return this.evaluateCondition(predicate);
          });
        }
        return data.filter(item => item !== null && item !== undefined);
      }

      case 'map': {
        if (!Array.isArray(data)) return data;
        const mapper = params.mapper as string;
        if (mapper) {
          return data.map(item => {
            this.setVariable('_item', item);
            return this.evaluateExpression(mapper);
          });
        }
        return data.map(item => ({ value: item, processed: true }));
      }

      case 'reduce': {
        if (!Array.isArray(data)) return data;
        const initial = params.initial ?? 0;
        const reducer = params.reducer as string;
        if (reducer) {
          return data.reduce((acc, item) => {
            this.setVariable('_acc', acc);
            this.setVariable('_item', item);
            return this.evaluateExpression(reducer);
          }, initial);
        }
        return data.reduce((acc, item) => acc + (typeof item === 'number' ? item : 0), 0);
      }

      case 'sort': {
        if (!Array.isArray(data)) return data;
        const key = params.key as string;
        const desc = params.descending as boolean;
        const sorted = [...data].sort((a, b) => {
          const aVal = key ? (a as Record<string, unknown>)[key] : a;
          const bVal = key ? (b as Record<string, unknown>)[key] : b;
          if (aVal < bVal) return desc ? 1 : -1;
          if (aVal > bVal) return desc ? -1 : 1;
          return 0;
        });
        return sorted;
      }

      case 'sum':
        return Array.isArray(data) ? data.reduce((sum, item) => sum + (typeof item === 'number' ? item : 0), 0) : data;

      case 'count':
        return Array.isArray(data) ? data.length : 1;

      case 'unique':
        return Array.isArray(data) ? Array.from(new Set(data)) : data;

      case 'flatten':
        return Array.isArray(data) ? data.flat() : data;

      case 'reverse':
        return Array.isArray(data) ? [...data].reverse() : data;

      case 'take': {
        if (!Array.isArray(data)) return data;
        const count = Number(params.count) || 10;
        return data.slice(0, count);
      }

      case 'skip': {
        if (!Array.isArray(data)) return data;
        const count = Number(params.count) || 0;
        return data.slice(count);
      }

      default:
        logger.warn('Unknown transformation', { operation: transform.operation });
        return data;
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Register event handler
   */
  on(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
  }

  /**
   * Remove event handler
   */
  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      const handlers = this.eventHandlers.get(event) || [];
      this.eventHandlers.set(event, handlers.filter(h => h !== handler));
    }
  }

  /**
   * Emit event
   */
  async emit(event: string, data?: unknown): Promise<void> {
    const handlers = this.eventHandlers.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(data);
      } catch (error) {
        logger.error('Event handler error', { event, error });
      }
    }
  }

  /**
   * Trigger UI event
   */
  async triggerUIEvent(elementName: string, eventType: string, data?: unknown): Promise<void> {
    const element = this.uiElements.get(elementName);
    if (!element) {
      logger.warn('UI element not found', { elementName });
      return;
    }

    // Update element state based on event
    if (eventType === 'change' && data !== undefined) {
      element.value = data;
    }

    await this.emit(`${elementName}.${eventType}`, data);
  }

  // ============================================================================
  // Animation System
  // ============================================================================

  /**
   * Update all animations
   */
  updateAnimations(): void {
    const now = Date.now();

    for (const [key, anim] of this.animations) {
      const elapsed = now - anim.startTime;
      let progress = Math.min(elapsed / anim.duration, 1);

      // Apply easing
      progress = this.applyEasing(progress, anim.easing);

      // Calculate current value
      let currentValue = anim.from + (anim.to - anim.from) * progress;

      // Handle yoyo
      if (anim.yoyo && progress >= 1) {
        anim.startTime = now;
        [anim.from, anim.to] = [anim.to, anim.from];
      }

      // Update the property
      this.setVariable(`${anim.target}.${anim.property}`, currentValue);

      // Remove completed non-looping animations
      if (progress >= 1 && !anim.loop && !anim.yoyo) {
        this.animations.delete(key);
      } else if (progress >= 1 && anim.loop) {
        anim.startTime = now;
      }
    }
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'easeIn':
        return t * t;
      case 'easeOut':
        return t * (2 - t);
      case 'easeInOut':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeInQuad':
        return t * t;
      case 'easeOutQuad':
        return t * (2 - t);
      case 'easeInOutQuad':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'linear':
      default:
        return t;
    }
  }

  // ============================================================================
  // Particle Effects
  // ============================================================================

  private createParticleEffect(name: string, position: SpatialPosition, color: string, count: number): void {
    const limitedCount = Math.min(count, RUNTIME_SECURITY_LIMITS.maxParticlesPerSystem);
    const particles: SpatialPosition[] = [];

    for (let i = 0; i < limitedCount; i++) {
      particles.push({
        x: position.x + (Math.random() - 0.5) * 2,
        y: position.y + (Math.random() - 0.5) * 2,
        z: position.z + (Math.random() - 0.5) * 2,
      });
    }

    this.particleSystems.set(name, {
      particles,
      color,
      lifetime: 3000,
      speed: 0.01,
    });
  }

  private createConnectionStream(from: string, to: string, fromPos: SpatialPosition, toPos: SpatialPosition, dataType: string): void {
    const streamName = `connection_${from}_${to}`;
    const particles: SpatialPosition[] = [];
    const steps = 20;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      particles.push({
        x: fromPos.x + (toPos.x - fromPos.x) * t,
        y: fromPos.y + (toPos.y - fromPos.y) * t,
        z: fromPos.z + (toPos.z - fromPos.z) * t,
      });
    }

    this.particleSystems.set(streamName, {
      particles,
      color: this.getDataTypeColor(dataType),
      lifetime: 5000,
      speed: 0.02,
    });
  }

  private createFlowingStream(name: string, position: SpatialPosition, data: unknown): void {
    const count = Array.isArray(data) ? Math.min(data.length, 50) : 10;
    this.createParticleEffect(`${name}_flow`, position, '#45b7d1', count);
  }

  private createExecutionEffect(name: string, position: SpatialPosition): void {
    this.createParticleEffect(`${name}_execution`, position, '#ff4500', 30);
  }

  private createDataVisualization(name: string, data: unknown, position: SpatialPosition): void {
    let count = 10;
    if (Array.isArray(data)) {
      count = Math.min(data.length, 100);
    } else if (typeof data === 'object' && data !== null) {
      count = Math.min(Object.keys(data).length * 5, 50);
    }
    this.createParticleEffect(`${name}_visualization`, position, '#32cd32', count);
  }

  private getDataTypeColor(dataType: string): string {
    const colors: Record<string, string> = {
      'string': '#ff6b35',
      'number': '#4ecdc4',
      'boolean': '#45b7d1',
      'object': '#96ceb4',
      'array': '#ffeaa7',
      'any': '#dda0dd',
      'move': '#ff69b4',
    };
    return colors[dataType] || '#ffffff';
  }

  // ============================================================================
  // Public API
  // ============================================================================

  getParticleSystems(): Map<string, ParticleSystem> {
    return new Map(this.particleSystems);
  }

  updateParticles(deltaTime: number): void {
    for (const [name, system] of this.particleSystems) {
      system.lifetime -= deltaTime;
      system.particles.forEach(particle => {
        particle.x += (Math.random() - 0.5) * system.speed;
        particle.y += (Math.random() - 0.5) * system.speed;
        particle.z += (Math.random() - 0.5) * system.speed;
      });
      if (system.lifetime <= 0) {
        this.particleSystems.delete(name);
      }
    }
  }

  getContext(): RuntimeContext {
    return { ...this.context };
  }

  getUIElements(): Map<string, UIElementState> {
    return new Map(this.uiElements);
  }

  getUIElement(name: string): UIElementState | undefined {
    return this.uiElements.get(name);
  }

  getAnimations(): Map<string, Animation> {
    return new Map(this.animations);
  }

  reset(): void {
    this.context = this.createEmptyContext();
    this.currentScope = { variables: this.context.variables };
    this.callStack = [];
    this.particleSystems.clear();
    this.executionHistory = [];
    this.eventHandlers.clear();
    this.animations.clear();
    this.uiElements.clear();
  }

  private createEmptyContext(): RuntimeContext {
    return {
      variables: new Map(),
      functions: new Map(),
      exports: new Map(),
      connections: [],
      spatialMemory: new Map(),
      hologramState: new Map(),
      executionStack: [],
      currentScale: 1,
      scaleMagnitude: 'standard',
      focusHistory: [],
      environment: {},
      templates: new Map(),
    };
  }

  private async executeScale(node: ScaleNode): Promise<ExecutionResult> {
    const parentScale = this.context.currentScale;
    this.context.currentScale *= node.multiplier;
    this.context.scaleMagnitude = node.magnitude;

    logger.info('Scale context entering', { magnitude: node.magnitude, multiplier: this.context.currentScale });
    
    // Emit event for renderer sync
    this.emit('scale:change', { multiplier: this.context.currentScale, magnitude: node.magnitude });

    const results = await this.executeProgram(node.body, this.context.executionStack.length);

    // Restore parent scale after block
    this.context.currentScale = parentScale;
    
    // Restore renderer scale
    this.emit('scale:change', { multiplier: this.context.currentScale });

    return {
      success: results.every(r => r.success),
      output: `Executed scale block: ${node.magnitude}`
    };
  }

  private async executeFocus(node: FocusNode): Promise<ExecutionResult> {
    this.context.focusHistory.push(node.target);
    const results = await this.executeProgram(node.body, this.context.executionStack.length);

    return {
      success: results.every(r => r.success),
      output: `Focused on ${node.target}`
    };
  }

  private async executeEnvironment(node: EnvironmentNode): Promise<ExecutionResult> {
    this.context.environment = { ...this.context.environment, ...node.settings };
    return { success: true, output: 'Environment updated' };
  }

  private async executeComposition(node: CompositionNode): Promise<ExecutionResult> {
    const results = await this.executeProgram(node.children, this.context.executionStack.length);
    return { success: true, output: `Composition ${node.name} executed` };
  }

  private async executeTemplate(node: TemplateNode): Promise<ExecutionResult> {
    this.context.templates.set(node.name, node);
    return { success: true, output: `Template ${node.name} registered` };
  }

  private async executeServerNode(node: ServerNode): Promise<ExecutionResult> {
    if (this.context.mode === 'public') {
      return { success: false, error: 'SecurityViolation: Server creation blocked in public mode.', executionTime: 0 };
    }
    
    logger.info(`Starting server on port ${node.port}`);
    
    return {
      success: true,
      output: `Server listening on port ${node.port}`,
      hologram: node.hologram,
      executionTime: 0
    };
  }

  private async executeDatabaseNode(node: DatabaseNode): Promise<ExecutionResult> {
    if (this.context.mode === 'public') {
      return { success: false, error: 'SecurityViolation: DB access blocked in public mode.', executionTime: 0 };
    }

    logger.info(`Executing Query: ${node.query}`);
    
    return {
      success: true,
      output: `Query executed: ${node.query}`,
      hologram: node.hologram,
      executionTime: 0
    };
  }

  private async executeFetchNode(node: FetchNode): Promise<ExecutionResult> {
    if (this.context.mode === 'public') {
      return { success: false, error: 'SecurityViolation: External fetch blocked in public mode.', executionTime: 0 };
    }

    logger.info(`Fetching: ${node.url}`);
    
    return {
      success: true,
      output: `Fetched data from ${node.url}`,
      hologram: node.hologram,
      executionTime: 0
    };
  }

  private async executeTarget(node: ExecuteNode): Promise<ExecutionResult> {
    const target = this.context.functions.get(node.target);

    if (!target) {
      return {
        success: false,
        error: `Function ${node.target} not found`,
        executionTime: 0
      };
    }

    const result = await this.executeFunction(target);
    this.createExecutionEffect(node.target, target.position || {x:0,y:0,z:0});

    return {
      success: true,
      output: `Executed ${node.target}`,
      hologram: {
        shape: 'sphere',
        color: '#ff4500',
        size: 1.2,
        glow: true,
        interactive: false,
      },
      executionTime: result.executionTime
    };
  }

  private async executeDebug(node: DebugNode): Promise<ExecutionResult> {
    const target = node.target;
    // In a real scenario, this would gather more debug info
    const debugInfo = {
      target,
      variables: Object.fromEntries(this.context.variables),
      executionHistoryLength: this.executionHistory.length
    };

    return {
      success: true,
      output: debugInfo as unknown as HoloScriptValue,
      hologram: node.hologram,
      executionTime: 0
    };
  }

  private async executeVisualize(node: VisualizeNode): Promise<ExecutionResult> {
    const target = node.target;
    const data = this.context.variables.get(target);

    if (!data) {
      return {
        success: false,
        error: `No data found for ${target}`,
        executionTime: 0
      };
    }

    this.createDataVisualization(target, data, node.position || {x:0,y:0,z:0});

    return {
      success: true,
      output: `Visualizing ${target}`,
      hologram: node.hologram,
      executionTime: 0
    };
  }

  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  getHologramStates(): Map<string, HologramProperties> {
    return new Map(this.context.hologramState);
  }

  getCallStack(): string[] {
    return [...this.callStack];
  }
}
