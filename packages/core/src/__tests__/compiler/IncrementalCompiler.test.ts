import { describe, it, expect, beforeEach } from 'vitest';
import {
  IncrementalCompiler,
  createIncrementalCompiler,
  type DiffResult,
  type ASTChange,
} from '../../compiler/IncrementalCompiler';
import type { HoloComposition, HoloObject } from '../../parser/HoloCompositionTypes';

describe('IncrementalCompiler', () => {
  let compiler: IncrementalCompiler;

  beforeEach(() => {
    compiler = new IncrementalCompiler();
  });

  const createComposition = (objects: HoloObject[]): HoloComposition => ({
    name: 'TestScene',
    objects,
  });

  const createObject = (name: string, props: Record<string, unknown> = {}): HoloObject => ({
    name,
    properties: Object.entries(props).map(([key, value]) => ({ key, value })),
  });

  describe('initialization', () => {
    it('should create compiler instance', () => {
      expect(compiler).toBeDefined();
    });

    it('should create compiler via factory', () => {
      const factoryCompiler = createIncrementalCompiler();
      expect(factoryCompiler).toBeDefined();
    });
  });

  describe('diff', () => {
    it('should detect all objects as added on first compile', () => {
      const composition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);

      const result = compiler.diff(null, composition);

      expect(result.hasChanges).toBe(true);
      expect(result.addedObjects).toContain('Cube');
      expect(result.addedObjects).toContain('Sphere');
      expect(result.removedObjects).toHaveLength(0);
      expect(result.modifiedObjects).toHaveLength(0);
    });

    it('should detect added objects', () => {
      const oldComposition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
      ]);
      const newComposition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);

      // First compile to set previous AST
      compiler.diff(null, oldComposition);
      const result = compiler.diff(oldComposition, newComposition);

      expect(result.hasChanges).toBe(true);
      expect(result.addedObjects).toContain('Sphere');
      expect(result.removedObjects).toHaveLength(0);
    });

    it('should detect removed objects', () => {
      const oldComposition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);
      const newComposition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
      ]);

      const result = compiler.diff(oldComposition, newComposition);

      expect(result.hasChanges).toBe(true);
      expect(result.removedObjects).toContain('Sphere');
      expect(result.addedObjects).toHaveLength(0);
    });

    it('should detect modified objects', () => {
      const oldComposition = createComposition([
        createObject('Cube', { mesh: 'cube', color: '#ff0000' }),
      ]);
      const newComposition = createComposition([
        createObject('Cube', { mesh: 'cube', color: '#00ff00' }),
      ]);

      const result = compiler.diff(oldComposition, newComposition);

      expect(result.hasChanges).toBe(true);
      expect(result.modifiedObjects).toContain('Cube');
      expect(result.unchangedObjects).toHaveLength(0);
    });

    it('should detect unchanged objects', () => {
      const oldComposition = createComposition([
        createObject('Cube', { mesh: 'cube', color: '#ff0000' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);
      const newComposition = createComposition([
        createObject('Cube', { mesh: 'cube', color: '#00ff00' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);

      const result = compiler.diff(oldComposition, newComposition);

      expect(result.unchangedObjects).toContain('Sphere');
      expect(result.modifiedObjects).toContain('Cube');
    });

    it('should detect property additions', () => {
      const oldComposition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
      ]);
      const newComposition = createComposition([
        createObject('Cube', { mesh: 'cube', color: '#ff0000' }),
      ]);

      const result = compiler.diff(oldComposition, newComposition);

      const colorChange = result.changes.find(
        c => c.nodeName === 'color' && c.type === 'added'
      );
      expect(colorChange).toBeDefined();
    });

    it('should detect property removals', () => {
      const oldComposition = createComposition([
        createObject('Cube', { mesh: 'cube', color: '#ff0000' }),
      ]);
      const newComposition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
      ]);

      const result = compiler.diff(oldComposition, newComposition);

      const colorChange = result.changes.find(
        c => c.nodeName === 'color' && c.type === 'removed'
      );
      expect(colorChange).toBeDefined();
    });

    it('should detect trait changes', () => {
      const oldObj: HoloObject = {
        name: 'Cube',
        properties: [{ key: 'mesh', value: 'cube' }],
        traits: ['grabbable'],
      };
      const newObj: HoloObject = {
        name: 'Cube',
        properties: [{ key: 'mesh', value: 'cube' }],
        traits: ['grabbable', 'physics'],
      };

      const oldComposition = createComposition([oldObj]);
      const newComposition = createComposition([newObj]);

      const result = compiler.diff(oldComposition, newComposition);

      const traitChange = result.changes.find(
        c => c.nodeName === 'physics' && c.type === 'added'
      );
      expect(traitChange).toBeDefined();
    });

    it('should handle nested children', () => {
      const oldComposition: HoloComposition = {
        name: 'Scene',
        objects: [
          {
            name: 'Parent',
            properties: [],
            children: [createObject('Child', { mesh: 'cube' })],
          },
        ],
      };
      const newComposition: HoloComposition = {
        name: 'Scene',
        objects: [
          {
            name: 'Parent',
            properties: [],
            children: [
              createObject('Child', { mesh: 'cube' }),
              createObject('NewChild', { mesh: 'sphere' }),
            ],
          },
        ],
      };

      const result = compiler.diff(oldComposition, newComposition);

      expect(result.hasChanges).toBe(true);
      const addedChild = result.changes.find(
        c => c.nodeName === 'NewChild' && c.type === 'added'
      );
      expect(addedChild).toBeDefined();
    });
  });

  describe('caching', () => {
    it('should cache and retrieve compilation results', () => {
      const hash = 'abc123';
      const compiled = 'function Cube() { return <mesh />; }';

      compiler.setCached('Cube', hash, compiled, []);
      const cached = compiler.getCached('Cube', hash);

      expect(cached).not.toBeNull();
      expect(cached!.compiledCode).toBe(compiled);
    });

    it('should return null for invalid hash', () => {
      compiler.setCached('Cube', 'hash1', 'code', []);
      const cached = compiler.getCached('Cube', 'different-hash');

      expect(cached).toBeNull();
    });

    it('should return null for missing cache entry', () => {
      const cached = compiler.getCached('NonExistent', 'any-hash');
      expect(cached).toBeNull();
    });
  });

  describe('state management', () => {
    it('should save and restore state', () => {
      const states = new Map<string, Record<string, unknown>>();
      states.set('Counter', { count: 5 });
      states.set('Toggle', { active: true });

      compiler.saveState(states);
      const restored = compiler.restoreState();

      expect(restored).not.toBeNull();
      expect(restored!.objectStates.get('Counter')).toEqual({ count: 5 });
      expect(restored!.objectStates.get('Toggle')).toEqual({ active: true });
    });

    it('should clear state', () => {
      const states = new Map();
      states.set('Test', { value: 1 });
      compiler.saveState(states);

      compiler.clearState();

      expect(compiler.restoreState()).toBeNull();
    });
  });

  describe('dependency tracking', () => {
    it('should track dependencies', () => {
      compiler.updateDependencies('Button', ['Theme', 'i18n']);
      compiler.updateDependencies('Card', ['Theme']);

      const themeDependents = compiler.getDependents('Theme');

      expect(themeDependents).toContain('Button');
      expect(themeDependents).toContain('Card');
    });

    it('should compute recompilation set', () => {
      compiler.updateDependencies('Button', ['Theme']);
      compiler.updateDependencies('Card', ['Theme']);
      compiler.updateDependencies('Header', ['Card']);

      const recompileSet = compiler.getRecompilationSet(['Theme']);

      expect(recompileSet.has('Theme')).toBe(true);
      expect(recompileSet.has('Button')).toBe(true);
      expect(recompileSet.has('Card')).toBe(true);
      expect(recompileSet.has('Header')).toBe(true);
    });
  });

  describe('compile', () => {
    it('should compile all objects on first run', () => {
      const composition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);

      const mockCompile = (obj: HoloObject) => `function ${obj.name}() {}`;

      const result = compiler.compile(composition, mockCompile);

      expect(result.fullRecompile).toBe(true);
      expect(result.recompiledObjects).toContain('Cube');
      expect(result.recompiledObjects).toContain('Sphere');
      expect(result.cachedObjects).toHaveLength(0);
    });

    it('should use cache for unchanged objects', () => {
      const composition1 = createComposition([
        createObject('Cube', { mesh: 'cube' }),
        createObject('Sphere', { mesh: 'sphere' }),
      ]);
      const composition2 = createComposition([
        createObject('Cube', { mesh: 'cube' }),
        createObject('Sphere', { mesh: 'sphere', color: '#ff0000' }),
      ]);

      const mockCompile = (obj: HoloObject) => `function ${obj.name}() {}`;

      // First compile
      compiler.compile(composition1, mockCompile);

      // Second compile with one change
      const result = compiler.compile(composition2, mockCompile);

      expect(result.fullRecompile).toBe(false);
      expect(result.cachedObjects).toContain('Cube');
      expect(result.recompiledObjects).toContain('Sphere');
    });

    it('should force recompile specified objects', () => {
      const composition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
      ]);

      const mockCompile = (obj: HoloObject) => `function ${obj.name}() {}`;

      // First compile
      compiler.compile(composition, mockCompile);

      // Second compile with force
      const result = compiler.compile(composition, mockCompile, {
        forceRecompile: ['Cube'],
      });

      expect(result.recompiledObjects).toContain('Cube');
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      const composition = createComposition([
        createObject('Cube', { mesh: 'cube' }),
      ]);
      compiler.compile(composition, () => 'code');
      compiler.saveState(new Map([['Test', { x: 1 }]]));
      compiler.updateDependencies('A', ['B']);

      compiler.reset();

      const stats = compiler.getStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.dependencyEdges).toBe(0);
      expect(compiler.restoreState()).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      compiler.setCached('Obj1', 'h1', 'code1', []);
      compiler.setCached('Obj2', 'h2', 'code2', []);
      compiler.updateDependencies('A', ['B', 'C']);

      const stats = compiler.getStats();

      expect(stats.cacheSize).toBe(2);
      expect(stats.objectsCached).toContain('Obj1');
      expect(stats.objectsCached).toContain('Obj2');
      expect(stats.dependencyEdges).toBe(2);
    });
  });
});
