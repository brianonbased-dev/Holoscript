/**
 * @holoscript/state-sync - Test Suite
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StateSyncEngine,
  createStateSyncEngine,
  LWWRegister,
  GCounter,
  PNCounter,
  LWWMap,
  GSet,
  ORSet,
  SYNC_STRATEGIES,
} from '../index.js';
import type { SyncConfig, ConflictStrategy } from '../types.js';

describe('@holoscript/state-sync', () => {
  describe('createStateSyncEngine', () => {
    it('should create an engine with default settings', () => {
      const engine = createStateSyncEngine();
      expect(engine).toBeInstanceOf(StateSyncEngine);
    });

    it('should create an engine with custom settings', () => {
      const config: Partial<SyncConfig> = {
        peerId: 'test-peer',
        syncInterval: 100,
        conflictStrategy: 'last-write-wins',
        maxHistorySize: 500,
      };
      
      const engine = createStateSyncEngine(config);
      expect(engine).toBeInstanceOf(StateSyncEngine);
    });
  });

  describe('SYNC_STRATEGIES', () => {
    it('should have standard strategies defined', () => {
      expect(SYNC_STRATEGIES['last-write-wins']).toBeDefined();
      expect(SYNC_STRATEGIES['merge']).toBeDefined();
      expect(SYNC_STRATEGIES['vector-clock']).toBeDefined();
    });
  });

  describe('LWWRegister', () => {
    let register: LWWRegister<string>;

    beforeEach(() => {
      register = new LWWRegister<string>('initial');
    });

    it('should get initial value', () => {
      expect(register.value).toBe('initial');
    });

    it('should set new value', () => {
      register.set('updated');
      expect(register.value).toBe('updated');
    });

    it('should merge with later timestamp winning', () => {
      const other = new LWWRegister<string>('other', Date.now() + 1000);
      register.merge(other.state);
      expect(register.value).toBe('other');
    });

    it('should merge with earlier timestamp losing', () => {
      const other = new LWWRegister<string>('other', Date.now() - 1000);
      register.set('current'); // Updates timestamp
      register.merge(other.state);
      expect(register.value).toBe('current');
    });
  });

  describe('GCounter', () => {
    let counter: GCounter;

    beforeEach(() => {
      counter = new GCounter('node1');
    });

    it('should start at zero', () => {
      expect(counter.value).toBe(0);
    });

    it('should increment', () => {
      counter.increment();
      expect(counter.value).toBe(1);
      
      counter.increment(5);
      expect(counter.value).toBe(6);
    });

    it('should merge correctly', () => {
      const other = new GCounter('node2');
      other.increment(10);
      
      counter.increment(5);
      counter.merge(other.state);
      
      expect(counter.value).toBe(15);
    });
  });

  describe('PNCounter', () => {
    let counter: PNCounter;

    beforeEach(() => {
      counter = new PNCounter('node1');
    });

    it('should start at zero', () => {
      expect(counter.value).toBe(0);
    });

    it('should increment and decrement', () => {
      counter.increment(10);
      expect(counter.value).toBe(10);
      
      counter.decrement(3);
      expect(counter.value).toBe(7);
    });

    it('should merge correctly', () => {
      const other = new PNCounter('node2');
      other.increment(10);
      other.decrement(2);
      
      counter.increment(5);
      counter.merge(other.state);
      
      expect(counter.value).toBe(13); // 5 + 10 - 2
    });
  });

  describe('GSet', () => {
    let set: GSet<string>;

    beforeEach(() => {
      set = new GSet<string>();
    });

    it('should start empty', () => {
      expect(set.size).toBe(0);
      expect(set.has('item')).toBe(false);
    });

    it('should add items', () => {
      set.add('item1');
      set.add('item2');
      
      expect(set.size).toBe(2);
      expect(set.has('item1')).toBe(true);
      expect(set.has('item2')).toBe(true);
    });

    it('should not allow duplicates', () => {
      set.add('item');
      set.add('item');
      
      expect(set.size).toBe(1);
    });

    it('should merge correctly', () => {
      const other = new GSet<string>();
      other.add('item2');
      other.add('item3');
      
      set.add('item1');
      set.merge(other.state);
      
      expect(set.size).toBe(3);
      expect([...set.values()].sort()).toEqual(['item1', 'item2', 'item3']);
    });
  });

  describe('ORSet', () => {
    let set: ORSet<string>;

    beforeEach(() => {
      set = new ORSet<string>('node1');
    });

    it('should add and remove items', () => {
      set.add('item');
      expect(set.has('item')).toBe(true);
      
      set.remove('item');
      expect(set.has('item')).toBe(false);
    });

    it('should handle concurrent add-remove conflicts', () => {
      const set1 = new ORSet<string>('node1');
      const set2 = new ORSet<string>('node2');
      
      set1.add('item');
      set2.merge(set1.state);
      
      // Concurrent operations: set1 removes, set2 re-adds
      set1.remove('item');
      set2.add('item');
      
      // Merge - add should win (observed-remove semantics)
      set1.merge(set2.state);
      
      expect(set1.has('item')).toBe(true);
    });
  });

  describe('LWWMap', () => {
    let map: LWWMap<string, number>;

    beforeEach(() => {
      map = new LWWMap<string, number>();
    });

    it('should set and get values', () => {
      map.set('key1', 100);
      map.set('key2', 200);
      
      expect(map.get('key1')).toBe(100);
      expect(map.get('key2')).toBe(200);
    });

    it('should delete values', () => {
      map.set('key', 100);
      map.delete('key');
      
      expect(map.has('key')).toBe(false);
    });

    it('should merge with LWW semantics', () => {
      const other = new LWWMap<string, number>();
      
      map.set('key', 100);
      other.set('key', 200);
      
      // Merge - later timestamp wins
      map.merge(other.state);
      
      expect(map.get('key')).toBe(200);
    });
  });

  describe('StateSyncEngine', () => {
    let engine: StateSyncEngine;

    beforeEach(() => {
      engine = createStateSyncEngine({
        peerId: 'test-peer',
      });
    });

    it('should create state containers', () => {
      const counter = engine.createCounter('test-counter');
      expect(counter).toBeDefined();
    });

    it('should create registers', () => {
      const register = engine.createRegister('test-register', 'initial');
      expect(register.value).toBe('initial');
    });

    it('should create sets', () => {
      const set = engine.createSet('test-set');
      expect(set.size).toBe(0);
    });

    it('should create maps', () => {
      const map = engine.createMap('test-map');
      expect(map.size).toBe(0);
    });

    it('should serialize state', () => {
      const counter = engine.createCounter('counter');
      counter.increment(5);
      
      const state = engine.serializeState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
    });

    it('should deserialize state', () => {
      const counter = engine.createCounter('counter');
      counter.increment(5);
      
      const state = engine.serializeState();
      
      const engine2 = createStateSyncEngine({ peerId: 'peer2' });
      engine2.deserializeState(state);
      
      const restoredCounter = engine2.getCounter('counter');
      expect(restoredCounter?.value).toBe(5);
    });
  });
});
