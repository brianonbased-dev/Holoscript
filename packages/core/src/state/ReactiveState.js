/**
 * Reactive State System for HoloScript+
 *
 * Provides reactive state management with:
 * - Proxy-based reactivity
 * - Computed properties
 * - Effect system for side effects
 * - Batched updates for performance
 *
 * @version 1.0.0
 */
// interface WatchOptions<T> extends EffectOptions {
//   handler: (newValue: T, oldValue: T) => void;
// }
// =============================================================================
// DEPENDENCY TRACKING
// =============================================================================
let activeEffect = null;
const targetMap = new WeakMap();
function track(target, key) {
    if (!activeEffect)
        return;
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    dep.add(activeEffect);
}
function trigger(target, key) {
    const depsMap = targetMap.get(target);
    if (!depsMap)
        return;
    const dep = depsMap.get(key);
    if (!dep)
        return;
    // Create a copy to avoid infinite loops if effects modify dependencies
    const effectsToRun = new Set(dep);
    effectsToRun.forEach((effect) => {
        // Avoid running effect if it's the active one
        if (effect !== activeEffect) {
            queueEffect(effect);
        }
    });
}
// =============================================================================
// EFFECT BATCHING
// =============================================================================
const pendingEffects = new Set();
let isFlushing = false;
function queueEffect(effect) {
    pendingEffects.add(effect);
    if (!isFlushing) {
        isFlushing = true;
        Promise.resolve().then(flushEffects);
    }
}
function flushEffects() {
    pendingEffects.forEach((effect) => {
        try {
            runEffect(effect);
        }
        catch (error) {
            console.error('Error running effect:', error);
        }
    });
    pendingEffects.clear();
    isFlushing = false;
}
function runEffect(effect) {
    const prevEffect = activeEffect;
    activeEffect = effect;
    try {
        effect();
    }
    finally {
        activeEffect = prevEffect;
    }
}
// =============================================================================
// REACTIVE PROXY
// =============================================================================
function createReactiveProxy(target) {
    return new Proxy(target, {
        get(obj, key) {
            track(obj, key);
            const value = Reflect.get(obj, key);
            // Deep reactivity for nested objects
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                return createReactiveProxy(value);
            }
            return value;
        },
        set(obj, key, value) {
            const oldValue = Reflect.get(obj, key);
            const result = Reflect.set(obj, key, value);
            if (oldValue !== value) {
                trigger(obj, key);
            }
            return result;
        },
        deleteProperty(obj, key) {
            const hadKey = Reflect.has(obj, key);
            const result = Reflect.deleteProperty(obj, key);
            if (hadKey) {
                trigger(obj, key);
            }
            return result;
        },
    });
}
// =============================================================================
// REACTIVE STATE CLASS
// =============================================================================
export class ReactiveState {
    constructor(initialState) {
        this.subscribers = new Set();
        this.computedCache = new Map();
        this.watchCleanups = new Map();
        this.state = { ...initialState };
        this.proxy = createReactiveProxy(this.state);
    }
    get(key) {
        return this.proxy[key];
    }
    set(key, value) {
        const oldValue = this.state[key];
        this.proxy[key] = value;
        if (oldValue !== value) {
            this.notifySubscribers(key);
        }
    }
    update(updates) {
        const changedKeys = [];
        for (const key in updates) {
            if (Object.prototype.hasOwnProperty.call(updates, key)) {
                const oldValue = this.state[key];
                const newValue = updates[key];
                if (oldValue !== newValue) {
                    this.proxy[key] = newValue;
                    changedKeys.push(key);
                }
            }
        }
        if (changedKeys.length > 0) {
            // Batch notify for all changes
            this.subscribers.forEach((callback) => {
                callback(this.state);
            });
        }
    }
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }
    notifySubscribers(changedKey) {
        this.subscribers.forEach((callback) => {
            callback(this.state, changedKey);
        });
    }
    // ==========================================================================
    // COMPUTED PROPERTIES
    // ==========================================================================
    computed(key, getter) {
        const cached = this.computedCache.get(key);
        if (cached && !cached.dirty) {
            return cached.value;
        }
        // Track dependencies
        const prevEffect = activeEffect;
        activeEffect = () => {
            // Mark cached value as dirty
            const entry = this.computedCache.get(key);
            if (entry) {
                entry.dirty = true;
            }
        };
        try {
            const value = getter();
            this.computedCache.set(key, { value, dirty: false });
            return value;
        }
        finally {
            activeEffect = prevEffect;
        }
    }
    // ==========================================================================
    // WATCHERS
    // ==========================================================================
    watch(key, handler, options = {}) {
        let oldValue = this.state[key];
        const effect = () => {
            const newValue = this.proxy[key];
            if (newValue !== oldValue) {
                handler(newValue, oldValue);
                oldValue = newValue;
            }
        };
        // Run immediately if requested
        if (options.immediate) {
            handler(this.state[key], undefined);
        }
        // Subscribe to changes
        return this.subscribe((_state, changedKey) => {
            if (changedKey === key) {
                effect();
            }
        });
    }
    watchEffect(effect, _options = {}) {
        let cleanup;
        const wrappedEffect = () => {
            // Run cleanup from previous run
            if (cleanup) {
                cleanup();
            }
            cleanup = effect();
        };
        // Run immediately
        runEffect(wrappedEffect);
        return () => {
            if (cleanup) {
                cleanup();
            }
            // Note: Would need to remove from dependency tracking
        };
    }
    // ==========================================================================
    // SNAPSHOT / RESET
    // ==========================================================================
    getSnapshot() {
        return { ...this.state };
    }
    reset(newState) {
        const stateToSet = newState || {};
        // Clear all keys
        for (const key in this.state) {
            if (Object.prototype.hasOwnProperty.call(this.state, key)) {
                delete this.state[key];
            }
        }
        // Set new state
        for (const key in stateToSet) {
            if (Object.prototype.hasOwnProperty.call(stateToSet, key)) {
                this.state[key] = stateToSet[key];
            }
        }
        // Notify all subscribers
        this.subscribers.forEach((callback) => {
            callback(this.state);
        });
    }
    // ==========================================================================
    // DESTROY
    // ==========================================================================
    destroy() {
        this.subscribers.clear();
        this.computedCache.clear();
        this.watchCleanups.forEach((cleanup) => cleanup());
        this.watchCleanups.clear();
    }
}
// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================
export function createState(initialState) {
    return new ReactiveState(initialState);
}
export function ref(value) {
    return createReactiveProxy({ value });
}
export function reactive(target) {
    return createReactiveProxy(target);
}
export function effect(fn, _options) {
    let cleanup;
    const wrappedEffect = () => {
        if (cleanup) {
            cleanup();
        }
        cleanup = fn();
    };
    runEffect(wrappedEffect);
    return () => {
        if (cleanup) {
            cleanup();
        }
    };
}
export function computed(getter) {
    let value;
    let dirty = true;
    const runner = () => {
        dirty = true;
    };
    return {
        get value() {
            if (dirty) {
                const prevEffect = activeEffect;
                activeEffect = runner;
                try {
                    value = getter();
                    dirty = false;
                }
                finally {
                    activeEffect = prevEffect;
                }
            }
            return value;
        },
    };
}
export function bind(state, key) {
    return {
        get: () => state.get(key),
        set: (value) => state.set(key, value),
        subscribe: (callback) => {
            return state.subscribe((s, changedKey) => {
                if (changedKey === key || changedKey === undefined) {
                    callback(s[key]);
                }
            });
        },
    };
}
// =============================================================================
// EXPRESSION EVALUATOR
// =============================================================================
export class ExpressionEvaluator {
    constructor(context = {}, builtins = {}) {
        this.context = context;
        this.builtins = {
            Math,
            parseInt,
            parseFloat,
            String,
            Number,
            Boolean,
            Array,
            Object,
            JSON,
            Date,
            ...builtins,
        };
    }
    evaluate(expression) {
        // Security: Create safe evaluation context
        const contextKeys = Object.keys(this.context);
        const contextValues = Object.values(this.context);
        const builtinKeys = Object.keys(this.builtins);
        const builtinValues = Object.values(this.builtins);
        try {
            // Create function with context variables as parameters
            const fn = new Function(...contextKeys, ...builtinKeys, `"use strict"; return (${expression})`);
            return fn(...contextValues, ...builtinValues);
        }
        catch (error) {
            console.error(`Error evaluating expression: ${expression}`, error);
            return undefined;
        }
    }
    updateContext(updates) {
        Object.assign(this.context, updates);
    }
    setContext(context) {
        this.context = context;
    }
}
export class StateDOMBinder {
    constructor(state) {
        this.bindings = [];
        this.state = state;
        this.evaluator = new ExpressionEvaluator();
    }
    bind(element, property, expression) {
        // Update evaluator context with state
        this.evaluator.setContext(this.state.getSnapshot());
        // Initial evaluation
        const value = this.evaluator.evaluate(expression);
        this.applyValue(element, property, value);
        // Subscribe to state changes
        const unsubscribe = this.state.subscribe((newState) => {
            this.evaluator.setContext(newState);
            const newValue = this.evaluator.evaluate(expression);
            this.applyValue(element, property, newValue);
        });
        const binding = { element, property, expression, unsubscribe };
        this.bindings.push(binding);
        return binding;
    }
    unbind(binding) {
        binding.unsubscribe();
        const index = this.bindings.indexOf(binding);
        if (index > -1) {
            this.bindings.splice(index, 1);
        }
    }
    unbindAll() {
        this.bindings.forEach((binding) => binding.unsubscribe());
        this.bindings = [];
    }
    applyValue(element, property, value) {
        // Abstract - actual implementation depends on renderer (Three.js, DOM, etc.)
        if (element && typeof element === 'object') {
            const el = element;
            const props = property.split('.');
            let target = el;
            for (let i = 0; i < props.length - 1; i++) {
                target = target[props[i]];
                if (!target)
                    return;
            }
            target[props[props.length - 1]] = value;
        }
    }
}
// =============================================================================
// EXPORTS
// =============================================================================
export { track, trigger, runEffect, flushEffects, createReactiveProxy, };
