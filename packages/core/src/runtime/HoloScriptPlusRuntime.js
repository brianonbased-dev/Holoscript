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
import { createState, ExpressionEvaluator } from '../state/ReactiveState';
import { vrTraitRegistry } from '../traits/VRTraitSystem';
// =============================================================================
// BUILT-IN FUNCTIONS
// =============================================================================
function createBuiltins(runtime) {
    return {
        Math,
        range: (start, end, step = 1) => {
            const result = [];
            if (step > 0) {
                for (let i = start; i < end; i += step) {
                    result.push(i);
                }
            }
            else if (step < 0) {
                for (let i = start; i > end; i += step) {
                    result.push(i);
                }
            }
            return result;
        },
        interpolate_color: (t, from, to) => {
            // Parse hex colors
            const parseHex = (hex) => {
                const clean = hex.replace('#', '');
                return [
                    parseInt(clean.substring(0, 2), 16),
                    parseInt(clean.substring(2, 4), 16),
                    parseInt(clean.substring(4, 6), 16),
                ];
            };
            const toHex = (r, g, b) => {
                const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
                return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
            };
            const [r1, g1, b1] = parseHex(from);
            const [r2, g2, b2] = parseHex(to);
            return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
        },
        distance_to: (point) => {
            const viewer = runtime.vrContext.headset.position;
            return Math.sqrt(Math.pow(point[0] - viewer[0], 2) +
                Math.pow(point[1] - viewer[1], 2) +
                Math.pow(point[2] - viewer[2], 2));
        },
        distance_to_viewer: () => {
            return 0; // Override in node context
        },
        hand_position: (handId) => {
            const hand = handId === 'left' ? runtime.vrContext.hands.left : runtime.vrContext.hands.right;
            return hand?.position || [0, 0, 0];
        },
        hand_velocity: (handId) => {
            const hand = handId === 'left' ? runtime.vrContext.hands.left : runtime.vrContext.hands.right;
            return hand?.velocity || [0, 0, 0];
        },
        dominant_hand: () => {
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
        play_sound: (source, options) => {
            runtime.emit('play_sound', { source, ...options });
        },
        haptic_feedback: (hand, intensity) => {
            const handId = typeof hand === 'string' ? hand : hand.id;
            runtime.emit('haptic', { hand: handId, intensity });
        },
        haptic_pulse: (intensity) => {
            runtime.emit('haptic', { hand: 'both', intensity });
        },
        apply_velocity: (node, velocity) => {
            runtime.emit('apply_velocity', { node, velocity });
        },
        spawn: (template, position) => {
            return runtime.spawnTemplate(template, position);
        },
        destroy: (node) => {
            runtime.destroyNode(node);
        },
        api_call: async (url, method, body) => {
            const response = await fetch(url, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined,
            });
            return response.json();
        },
        open_modal: (modalId) => {
            runtime.emit('open_modal', { id: modalId });
        },
        close_modal: (modalId) => {
            runtime.emit('close_modal', { id: modalId });
        },
        setTimeout: (callback, delay) => {
            return window.setTimeout(callback, delay);
        },
        clearTimeout: (id) => {
            window.clearTimeout(id);
        },
    };
}
// =============================================================================
// RUNTIME IMPLEMENTATION
// =============================================================================
class HoloScriptPlusRuntimeImpl {
    constructor(ast, options = {}) {
        this.rootInstance = null;
        this.eventHandlers = new Map();
        this.templates = new Map();
        this.updateLoopId = null;
        this.lastUpdateTime = 0;
        this.mounted = false;
        // VR context
        this.vrContext = {
            hands: {
                left: null,
                right: null,
            },
            headset: {
                position: [0, 1.6, 0],
                rotation: [0, 0, 0],
            },
            controllers: {
                left: null,
                right: null,
            },
        };
        this.ast = ast;
        this.options = options;
        this.state = createState({});
        this.traitRegistry = vrTraitRegistry;
        this.companions = options.companions || {};
        this.builtins = createBuiltins(this);
        // Create expression evaluator with context
        this.evaluator = new ExpressionEvaluator(this.state.getSnapshot(), this.builtins);
        // Initialize state from AST
        this.initializeState();
        // Load imports
        this.loadImports();
    }
    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    initializeState() {
        const stateDirective = this.ast.root.directives.find((d) => d.type === 'state');
        if (stateDirective && stateDirective.type === 'state') {
            this.state.update(stateDirective.body);
        }
    }
    loadImports() {
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
    mount(container) {
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
    unmount() {
        if (!this.mounted)
            return;
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
    instantiateNode(node, parent) {
        const instance = {
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
    processDirectives(instance) {
        for (const directive of instance.node.directives) {
            if (directive.type === 'lifecycle') {
                this.registerLifecycleHandler(instance, directive);
            }
        }
    }
    registerLifecycleHandler(instance, directive) {
        const { hook, params, body } = directive;
        // Create handler function
        const handler = (...args) => {
            // Build parameter context
            const paramContext = {};
            if (params) {
                params.forEach((param, i) => {
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
                    new Function(...Object.keys(this.builtins), ...Object.keys(paramContext), 'state', 'node', body)(...Object.values(this.builtins), ...Object.values(paramContext), this.state, instance.node);
                }
                else {
                    // Evaluate as expression
                    this.evaluator.evaluate(body);
                }
            }
            catch (error) {
                console.error(`Error in lifecycle handler ${hook}:`, error);
            }
        };
        // Register handler
        if (!instance.lifecycleHandlers.has(hook)) {
            instance.lifecycleHandlers.set(hook, []);
        }
        instance.lifecycleHandlers.get(hook).push(handler);
    }
    // ==========================================================================
    // CONTROL FLOW
    // ==========================================================================
    processControlFlow(children, directives) {
        const result = [];
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
            }
            else if (directive.type === 'if') {
                const condition = this.evaluateExpression(directive.condition);
                if (condition) {
                    result.push(...directive.body);
                }
                else if (directive.else) {
                    result.push(...directive.else);
                }
            }
        }
        // Add regular children
        result.push(...children);
        return result;
    }
    cloneNodeWithContext(node, context) {
        // Deep clone the node
        const cloned = {
            type: node.type,
            id: node.id ? this.interpolateString(node.id, context) : undefined,
            properties: this.interpolateProperties(node.properties, context),
            directives: [...node.directives],
            children: node.children.map((child) => this.cloneNodeWithContext(child, context)),
            traits: new Map(node.traits),
            loc: node.loc,
        };
        return cloned;
    }
    interpolateString(str, context) {
        return str.replace(/\$\{([^}]+)\}/g, (_match, expr) => {
            this.evaluator.updateContext(context);
            const value = this.evaluator.evaluate(expr);
            return String(value ?? '');
        });
    }
    interpolateProperties(properties, context) {
        const result = {};
        for (const [key, value] of Object.entries(properties)) {
            if (typeof value === 'string') {
                result[key] = this.interpolateString(value, context);
            }
            else if (value && typeof value === 'object' && '__expr' in value) {
                this.evaluator.updateContext(context);
                result[key] = this.evaluator.evaluate(value.__raw);
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    // ==========================================================================
    // EXPRESSION EVALUATION
    // ==========================================================================
    evaluateExpression(expr) {
        this.evaluator.updateContext(this.state.getSnapshot());
        return this.evaluator.evaluate(expr);
    }
    evaluateProperties(properties) {
        const result = {};
        for (const [key, value] of Object.entries(properties)) {
            if (value && typeof value === 'object' && '__expr' in value) {
                result[key] = this.evaluateExpression(value.__raw);
            }
            else if (value && typeof value === 'object' && '__ref' in value) {
                // Reference to state or companion
                const ref = value.__ref;
                result[key] = this.state.get(ref) ?? ref;
            }
            else if (typeof value === 'string' && value.includes('${')) {
                // String interpolation
                result[key] = this.interpolateString(value, this.state.getSnapshot());
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    // ==========================================================================
    // LIFECYCLE
    // ==========================================================================
    callLifecycle(instance, hook, ...args) {
        if (!instance || instance.destroyed)
            return;
        const handlers = instance.lifecycleHandlers.get(hook);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(...args);
                }
                catch (error) {
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
    startUpdateLoop() {
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
    stopUpdateLoop() {
        if (this.updateLoopId !== null) {
            cancelAnimationFrame(this.updateLoopId);
            this.updateLoopId = null;
        }
    }
    update(delta) {
        if (!this.rootInstance)
            return;
        // Update all instances
        this.updateInstance(this.rootInstance, delta);
        // Call update lifecycle
        this.callLifecycle(this.rootInstance, 'on_update', delta);
    }
    updateInstance(instance, delta) {
        if (instance.destroyed)
            return;
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
    createTraitContext(_instance) {
        return {
            vr: {
                hands: this.vrContext.hands,
                headset: this.vrContext.headset,
                getPointerRay: (hand) => {
                    const vrHand = hand === 'left' ? this.vrContext.hands.left : this.vrContext.hands.right;
                    if (!vrHand)
                        return null;
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
    destroyInstance(instance) {
        if (instance.destroyed)
            return;
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
    updateData(data) {
        this.state.set('data', data);
        this.callLifecycle(this.rootInstance, 'on_data_update', data);
    }
    getState() {
        return this.state.getSnapshot();
    }
    setState(updates) {
        this.state.update(updates);
    }
    emit(event, payload) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach((handler) => {
                try {
                    handler(payload);
                }
                catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(handler);
        return () => {
            this.eventHandlers.get(event)?.delete(handler);
        };
    }
    // ==========================================================================
    // VR INTEGRATION
    // ==========================================================================
    updateVRContext(context) {
        this.vrContext = context;
    }
    handleVREvent(event, node) {
        // Find instance for node
        const instance = this.findInstance(node);
        if (!instance)
            return;
        // Dispatch to traits
        const traitContext = this.createTraitContext(instance);
        this.traitRegistry.handleEventForAllTraits(node, traitContext, event);
        // Call lifecycle hooks based on event type
        const hookMapping = {
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
    findInstance(node, root = this.rootInstance) {
        if (!root)
            return null;
        if (root.node === node)
            return root;
        for (const child of root.children) {
            const found = this.findInstance(node, child);
            if (found)
                return found;
        }
        return null;
    }
    // ==========================================================================
    // TEMPLATES & SPAWNING
    // ==========================================================================
    registerTemplate(name, node) {
        this.templates.set(name, node);
    }
    spawnTemplate(name, position) {
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
    destroyNode(node) {
        const instance = this.findInstance(node);
        if (!instance)
            return;
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
export function createRuntime(ast, options) {
    return new HoloScriptPlusRuntimeImpl(ast, options);
}
// =============================================================================
// EXPORTS
// =============================================================================
export { HoloScriptPlusRuntimeImpl };
