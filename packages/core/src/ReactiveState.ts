/**
 * Reactive State System for HoloScript
 */

import type { HoloScriptValue, ReactiveState as IReactiveState } from './types';

export class ReactiveState implements IReactiveState {
  private state: Record<string, HoloScriptValue>;
  private proxy: Record<string, HoloScriptValue>;
  private subscribers: Set<(state: Record<string, HoloScriptValue>) => void> = new Set();

  constructor(initialState: Record<string, HoloScriptValue> = {}) {
    this.state = { ...initialState };
    this.proxy = this.createReactiveProxy(this.state);
  }

  private createReactiveProxy(target: any): any {
    const self = this;
    return new Proxy(target, {
      get(obj, key) {
        const val = obj[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            return self.createReactiveProxy(val);
        }
        return val;
      },
      set(obj, key, value) {
        const oldVal = obj[key];
        obj[key] = value;
        if (oldVal !== value) {
          self.notify();
        }
        return true;
      }
    });
  }

  get(key: string): HoloScriptValue {
    return this.proxy[key];
  }

  set(key: string, value: HoloScriptValue): void {
    this.proxy[key] = value;
  }

  update(updates: Record<string, HoloScriptValue>): void {
    Object.assign(this.proxy, updates);
  }

  subscribe(callback: (state: Record<string, HoloScriptValue>) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getSnapshot(): Record<string, HoloScriptValue> {
    return { ...this.state };
  }

  private notify() {
    this.subscribers.forEach(cb => cb(this.getSnapshot()));
  }
}

export class ExpressionEvaluator {
  private context: Record<string, unknown>;

  constructor(context: Record<string, unknown> = {}) {
    this.context = context;
  }

  evaluate(expression: string): any {
    if (typeof expression !== 'string') return expression;

    // If it's a template string with ${}, we need to interpolate
    if (expression.includes('${')) {
        // Special case: if the whole string is just one interpolation, return raw value
        // Use trim() to allow spaces like " ${ count } "
        const trimmed = expression.trim();
        const match = trimmed.match(/^\$\{([^}]+)\}$/);
        if (match) {
             return this.evaluate(match[1]);
        }
        return this.interpolate(expression);
    }

    const keys = Object.keys(this.context);
    const values = Object.values(this.context);
    
    try {
      const fn = new Function(...keys, `return (${expression})`);
      return fn(...values);
    } catch (e) {
      // If it's just a string not an expression, return as is
      return expression;
    }
  }

  private interpolate(str: string): string {
    return str.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        const val = this.evaluate(expr);
        return val !== undefined ? String(val) : '';
    });
  }

  updateContext(updates: Record<string, unknown>): void {
    Object.assign(this.context, updates);
  }

  setContext(context: Record<string, unknown>): void {
    this.context = { ...context };
  }
}

export function createState(initial: Record<string, HoloScriptValue> = {}): ReactiveState {
    return new ReactiveState(initial);
}
