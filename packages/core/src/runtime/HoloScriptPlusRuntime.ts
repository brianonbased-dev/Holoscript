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
} from '../types/AdvancedTypeSystem';
import { ReactiveState, createState, ExpressionEvaluator } from '../state/ReactiveState';
import { VRTraitRegistry, vrTraitRegistry, TraitContext, TraitEvent } from '../traits/VRTraitSystem';

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
  private mounted: boolean = false;

  // VR context
  vrContext = {
    hands: {
      left: null as VRHand | null,
      right: null as VRHand | null,
    },
    headset: {
      position: [0, 1.6, 0] as Vector3,
      rotation: [0, 0, 0] as Vector3,
    },
    controllers: {
      left: null as unknown,
      right: null as unknown,
    },
  };

  constructor(ast: HSPlusAST, options: RuntimeOptions = {}) {
    this.ast = ast;
    this.options = options;
    this.state = createState({});
    this.traitRegistry = vrTraitRegistry;
    this.companions = options.companions || {};
    this.builtins = createBuiltins(this);

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

    // Process @for directives
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

  private update(delta: number): void {
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

    // Update rendered element if properties changed
    if (this.options.renderer && instance.renderedNode) {
      const properties = this.evaluateProperties(instance.node.properties);
      this.options.renderer.updateElement(instance.renderedNode, properties);
    }

    // Update children
    for (const child of instance.children) {
      this.updateInstance(child, delta);
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
