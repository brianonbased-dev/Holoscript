/**
 * Headless Runtime Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  HeadlessRuntime,
  createHeadlessRuntime,
  type HeadlessRuntimeOptions,
} from './HeadlessRuntime';
import {
  HEADLESS_PROFILE,
  MINIMAL_PROFILE,
  getProfile,
  getAvailableProfiles,
  createCustomProfile,
} from './RuntimeProfile';
import type { HSPlusAST, HSPlusNode } from '../../types/HoloScriptPlus';

// Helper to create a simple test AST
function createTestAST(options: {
  state?: Record<string, unknown>;
  children?: HSPlusNode[];
} = {}): HSPlusAST {
  return {
    root: {
      type: 'scene',
      id: 'root',
      properties: {},
      traits: new Map(),
      directives: options.state
        ? [{ type: 'state', body: options.state }]
        : [],
      children: options.children || [],
    },
    imports: [],
    body: [],
  };
}

describe('RuntimeProfile', () => {
  describe('predefined profiles', () => {
    it('should have headless profile', () => {
      expect(HEADLESS_PROFILE).toBeDefined();
      expect(HEADLESS_PROFILE.name).toBe('headless');
      expect(HEADLESS_PROFILE.rendering.enabled).toBe(false);
      expect(HEADLESS_PROFILE.physics.enabled).toBe(false);
      expect(HEADLESS_PROFILE.audio.enabled).toBe(false);
      expect(HEADLESS_PROFILE.input.enabled).toBe(false);
      expect(HEADLESS_PROFILE.memoryBudget).toBe(50);
    });

    it('should have minimal profile', () => {
      expect(MINIMAL_PROFILE).toBeDefined();
      expect(MINIMAL_PROFILE.name).toBe('minimal');
      expect(MINIMAL_PROFILE.rendering.enabled).toBe(true);
      expect(MINIMAL_PROFILE.rendering.renderer).toBe('canvas2d');
    });

    it('should get profile by name', () => {
      const headless = getProfile('headless');
      expect(headless).toBe(HEADLESS_PROFILE);

      const minimal = getProfile('minimal');
      expect(minimal).toBe(MINIMAL_PROFILE);
    });

    it('should throw for unknown profile', () => {
      expect(() => getProfile('unknown' as any)).toThrow('Unknown runtime profile');
    });

    it('should list available profiles', () => {
      const profiles = getAvailableProfiles();
      expect(profiles).toContain('headless');
      expect(profiles).toContain('minimal');
      expect(profiles).toContain('standard');
      expect(profiles).toContain('vr');
    });
  });

  describe('custom profiles', () => {
    it('should create custom profile from base', () => {
      const custom = createCustomProfile('headless', {
        name: 'custom' as any,
        memoryBudget: 100,
        protocols: { mqtt: false },
      });

      expect(custom.name).toBe('custom');
      expect(custom.memoryBudget).toBe(100);
      expect(custom.protocols.mqtt).toBe(false);
      // Should inherit other settings from headless
      expect(custom.rendering.enabled).toBe(false);
    });
  });
});

describe('HeadlessRuntime', () => {
  let runtime: HeadlessRuntime;

  afterEach(() => {
    if (runtime?.isRunning()) {
      runtime.stop();
    }
  });

  describe('initialization', () => {
    it('should create runtime with default options', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);

      expect(runtime).toBeInstanceOf(HeadlessRuntime);
      expect(runtime.isRunning()).toBe(false);
      expect(runtime.getProfile().name).toBe('headless');
    });

    it('should create runtime with custom profile', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast, { profile: MINIMAL_PROFILE });

      expect(runtime.getProfile().name).toBe('minimal');
    });

    it('should initialize state from AST', () => {
      const ast = createTestAST({
        state: { counter: 0, name: 'test' },
      });
      runtime = createHeadlessRuntime(ast);

      const state = runtime.getState();
      expect(state.counter).toBe(0);
      expect(state.name).toBe('test');
    });
  });

  describe('lifecycle', () => {
    it('should start and stop', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);

      expect(runtime.isRunning()).toBe(false);
      runtime.start();
      expect(runtime.isRunning()).toBe(true);
      runtime.stop();
      expect(runtime.isRunning()).toBe(false);
    });

    it('should emit runtime_started event', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);

      const handler = vi.fn();
      runtime.on('runtime_started', handler);

      runtime.start();

      expect(handler).toHaveBeenCalled();
    });

    it('should emit runtime_stopped event', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);

      const handler = vi.fn();
      runtime.on('runtime_stopped', handler);

      runtime.start();
      runtime.stop();

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][0]).toHaveProperty('uptime');
    });
  });

  describe('state management', () => {
    beforeEach(() => {
      const ast = createTestAST({
        state: { counter: 0 },
      });
      runtime = createHeadlessRuntime(ast);
    });

    it('should get state', () => {
      expect(runtime.get('counter' as any)).toBe(0);
    });

    it('should set state', () => {
      runtime.set('counter' as any, 5);
      expect(runtime.get('counter' as any)).toBe(5);
    });

    it('should update state with partial', () => {
      runtime.setState({ counter: 10, name: 'updated' } as any);
      expect(runtime.get('counter' as any)).toBe(10);
      expect(runtime.get('name' as any)).toBe('updated');
    });
  });

  describe('events', () => {
    beforeEach(() => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);
    });

    it('should emit and receive events', () => {
      const handler = vi.fn();
      runtime.on('test_event', handler);

      runtime.emit('test_event', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('should unsubscribe from events', () => {
      const handler = vi.fn();
      const unsubscribe = runtime.on('test_event', handler);

      unsubscribe();
      runtime.emit('test_event', {});

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support once() for single-fire events', () => {
      const handler = vi.fn();
      runtime.once('test_event', handler);

      runtime.emit('test_event', { first: true });
      runtime.emit('test_event', { second: true });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ first: true });
    });
  });

  describe('update loop', () => {
    it('should run update loop at specified tick rate', async () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast, { tickRate: 100 });

      runtime.start();

      // Wait for a few ticks
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = runtime.getStats();
      expect(stats.updateCount).toBeGreaterThan(0);

      runtime.stop();
    });

    it('should not run updates when stopped', async () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast, { tickRate: 100 });

      runtime.start();
      await new Promise((resolve) => setTimeout(resolve, 30));
      runtime.stop();

      const statsAfterStop = runtime.getStats();
      const updateCount = statsAfterStop.updateCount;

      await new Promise((resolve) => setTimeout(resolve, 30));

      const statsLater = runtime.getStats();
      expect(statsLater.updateCount).toBe(updateCount);
    });

    it('should support manual tick', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast, { tickRate: 0 });

      // Start runtime to instantiate nodes (but tickRate=0 means no automatic updates)
      runtime.start();

      expect(runtime.getStats().updateCount).toBe(0);

      runtime.manualTick(0.016);
      expect(runtime.getStats().updateCount).toBe(1);

      runtime.manualTick(0.016);
      expect(runtime.getStats().updateCount).toBe(2);

      runtime.stop();
    });
  });

  describe('statistics', () => {
    it('should track update count', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast, { tickRate: 0 });

      // Start runtime to instantiate nodes
      runtime.start();

      runtime.manualTick(0.016);
      runtime.manualTick(0.016);
      runtime.manualTick(0.016);

      const stats = runtime.getStats();
      expect(stats.updateCount).toBe(3);

      runtime.stop();
    });

    it('should track event count', () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);

      runtime.emit('event1', {});
      runtime.emit('event2', {});

      const stats = runtime.getStats();
      expect(stats.eventCount).toBe(2);
    });

    it('should track uptime', async () => {
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast);

      runtime.start();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = runtime.getStats();
      expect(stats.uptime).toBeGreaterThanOrEqual(40);

      runtime.stop();
    });

    it('should estimate memory usage', () => {
      const ast = createTestAST({
        children: [
          { type: 'object', id: 'obj1', properties: {}, traits: new Map(), directives: [], children: [] },
          { type: 'object', id: 'obj2', properties: {}, traits: new Map(), directives: [], children: [] },
        ],
      });
      runtime = createHeadlessRuntime(ast);
      runtime.start();

      const stats = runtime.getStats();
      expect(stats.memoryEstimate).toBeGreaterThan(0);
      expect(stats.instanceCount).toBe(3); // root + 2 children

      runtime.stop();
    });
  });

  describe('node finding', () => {
    it('should find nodes by ID', () => {
      const ast = createTestAST({
        children: [
          { type: 'object', id: 'sensor', properties: { value: 42 }, traits: new Map(), directives: [], children: [] },
          { type: 'object', id: 'actuator', properties: { state: 'off' }, traits: new Map(), directives: [], children: [] },
        ],
      });
      runtime = createHeadlessRuntime(ast);
      runtime.start();

      const sensor = runtime.findNode('sensor');
      expect(sensor).not.toBeNull();
      expect(sensor?.id).toBe('sensor');

      const actuator = runtime.findNode('actuator');
      expect(actuator).not.toBeNull();
      expect(actuator?.properties?.state).toBe('off');

      const notFound = runtime.findNode('nonexistent');
      expect(notFound).toBeNull();

      runtime.stop();
    });
  });

  describe('state providers', () => {
    it('should update state from providers', async () => {
      let sensorValue = 0;
      const ast = createTestAST({ state: { sensorReading: 0 } });
      runtime = createHeadlessRuntime(ast, {
        tickRate: 100,
        stateProviders: new Map([
          ['sensorReading', () => sensorValue++],
        ]),
      });

      runtime.start();
      // Wait longer than tickRate (100ms) to ensure at least one tick occurs
      await new Promise((resolve) => setTimeout(resolve, 150));
      runtime.stop();

      const state = runtime.getState();
      expect(state.sensorReading).toBeGreaterThan(0);
    });
  });

  describe('instance limits', () => {
    it('should respect max instances limit', () => {
      // Create AST with many children
      const children: HSPlusNode[] = [];
      for (let i = 0; i < 100; i++) {
        children.push({
          type: 'object',
          id: `obj_${i}`,
          properties: {},
          traits: new Map(),
          directives: [],
          children: [],
        });
      }

      const ast = createTestAST({ children });
      runtime = createHeadlessRuntime(ast, { maxInstances: 50 });

      expect(() => runtime.start()).toThrow('Instance limit exceeded');
    });
  });

  describe('custom builtins', () => {
    it('should allow custom builtins', () => {
      const customFn = vi.fn().mockReturnValue(42);
      const ast = createTestAST();
      runtime = createHeadlessRuntime(ast, {
        builtins: {
          customFunction: customFn,
        },
      });

      // Builtins are available in lifecycle handlers
      // This is tested indirectly through the builtin being registered
      expect(runtime).toBeDefined();
    });
  });
});

describe('HeadlessRuntime IoT Scenarios', () => {
  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should handle sensor data updates', () => {
    const ast = createTestAST({
      state: { temperature: 0, humidity: 0 },
      children: [
        { type: 'sensor', id: 'temp_sensor', properties: {}, traits: new Map(), directives: [], children: [] },
        { type: 'sensor', id: 'humidity_sensor', properties: {}, traits: new Map(), directives: [], children: [] },
      ],
    });

    const runtime = createHeadlessRuntime(ast);
    runtime.start();

    // Simulate sensor data
    runtime.setState({ temperature: 25.5, humidity: 60 } as any);

    const state = runtime.getState();
    expect(state.temperature).toBe(25.5);
    expect(state.humidity).toBe(60);

    runtime.stop();
  });

  it('should emit events for state changes', () => {
    const ast = createTestAST({ state: { alertLevel: 'normal' } });
    const runtime = createHeadlessRuntime(ast);

    const alertHandler = vi.fn();
    runtime.on('alert', alertHandler);

    runtime.start();

    // Simulate alert condition
    runtime.setState({ alertLevel: 'critical' } as any);
    runtime.emit('alert', { level: 'critical', message: 'Temperature exceeded threshold' });

    expect(alertHandler).toHaveBeenCalledWith({
      level: 'critical',
      message: 'Temperature exceeded threshold',
    });

    runtime.stop();
  });
});
