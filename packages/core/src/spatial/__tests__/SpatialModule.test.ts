/**
 * Spatial Module Tests
 * Sprint 4 Priority 4 - Spatial Context Awareness
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  Vector3,
  SpatialEntity,
  Region,
  distance,
  distanceSquared,
  isPointInBox,
  isPointInSphere,
  normalize,
  boxesOverlap,
  dot,
  cross,
  lerp,
} from '../SpatialTypes';
import { SpatialQueryExecutor, QueryResult } from '../SpatialQuery';
import { SpatialContextProvider } from '../SpatialContextProvider';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function createEntity(
  id: string,
  position: Vector3,
  type: string = 'default'
): SpatialEntity {
  return {
    id,
    type,
    position,
  };
}

function createRegion(
  id: string,
  min: Vector3,
  max: Vector3,
  name?: string
): Region {
  return {
    id,
    name: name || id,
    type: 'box',
    bounds: { min, max },
  };
}

// =============================================================================
// SPATIAL TYPES TESTS
// =============================================================================

describe('SpatialTypes', () => {
  describe('distance', () => {
    it('should calculate distance between two points', () => {
      const a: Vector3 = { x: 0, y: 0, z: 0 };
      const b: Vector3 = { x: 3, y: 4, z: 0 };
      expect(distance(a, b)).toBe(5);
    });

    it('should return 0 for same point', () => {
      const a: Vector3 = { x: 5, y: 5, z: 5 };
      expect(distance(a, a)).toBe(0);
    });

    it('should work in 3D', () => {
      const a: Vector3 = { x: 0, y: 0, z: 0 };
      const b: Vector3 = { x: 1, y: 1, z: 1 };
      expect(distance(a, b)).toBeCloseTo(Math.sqrt(3));
    });
  });

  describe('distanceSquared', () => {
    it('should calculate squared distance', () => {
      const a: Vector3 = { x: 0, y: 0, z: 0 };
      const b: Vector3 = { x: 3, y: 4, z: 0 };
      expect(distanceSquared(a, b)).toBe(25);
    });
  });

  describe('isPointInBox', () => {
    it('should return true for point inside box', () => {
      const point: Vector3 = { x: 5, y: 5, z: 5 };
      const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
      expect(isPointInBox(point, box)).toBe(true);
    });

    it('should return false for point outside box', () => {
      const point: Vector3 = { x: 15, y: 5, z: 5 };
      const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
      expect(isPointInBox(point, box)).toBe(false);
    });

    it('should return true for point on boundary', () => {
      const point: Vector3 = { x: 10, y: 5, z: 5 };
      const box = { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 10, z: 10 } };
      expect(isPointInBox(point, box)).toBe(true);
    });
  });

  describe('isPointInSphere', () => {
    it('should return true for point inside sphere', () => {
      const point: Vector3 = { x: 1, y: 0, z: 0 };
      const sphere = { center: { x: 0, y: 0, z: 0 }, radius: 5 };
      expect(isPointInSphere(point, sphere)).toBe(true);
    });

    it('should return false for point outside sphere', () => {
      const point: Vector3 = { x: 10, y: 0, z: 0 };
      const sphere = { center: { x: 0, y: 0, z: 0 }, radius: 5 };
      expect(isPointInSphere(point, sphere)).toBe(false);
    });
  });

  describe('normalize', () => {
    it('should normalize a vector', () => {
      const v: Vector3 = { x: 3, y: 4, z: 0 };
      const n = normalize(v);
      expect(n.x).toBeCloseTo(0.6);
      expect(n.y).toBeCloseTo(0.8);
      expect(n.z).toBe(0);
    });

    it('should return zero vector for zero input', () => {
      const v: Vector3 = { x: 0, y: 0, z: 0 };
      const n = normalize(v);
      expect(n).toEqual({ x: 0, y: 0, z: 0 });
    });
  });

  describe('boxesOverlap', () => {
    it('should return true for overlapping boxes', () => {
      const a = { min: { x: 0, y: 0, z: 0 }, max: { x: 5, y: 5, z: 5 } };
      const b = { min: { x: 3, y: 3, z: 3 }, max: { x: 8, y: 8, z: 8 } };
      expect(boxesOverlap(a, b)).toBe(true);
    });

    it('should return false for non-overlapping boxes', () => {
      const a = { min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
      const b = { min: { x: 5, y: 5, z: 5 }, max: { x: 8, y: 8, z: 8 } };
      expect(boxesOverlap(a, b)).toBe(false);
    });
  });

  describe('dot', () => {
    it('should calculate dot product', () => {
      const a: Vector3 = { x: 1, y: 0, z: 0 };
      const b: Vector3 = { x: 0, y: 1, z: 0 };
      expect(dot(a, b)).toBe(0); // Perpendicular
    });

    it('should return positive for same direction', () => {
      const a: Vector3 = { x: 1, y: 0, z: 0 };
      const b: Vector3 = { x: 1, y: 0, z: 0 };
      expect(dot(a, b)).toBe(1);
    });
  });

  describe('cross', () => {
    it('should calculate cross product', () => {
      const a: Vector3 = { x: 1, y: 0, z: 0 };
      const b: Vector3 = { x: 0, y: 1, z: 0 };
      const c = cross(a, b);
      expect(c).toEqual({ x: 0, y: 0, z: 1 });
    });
  });

  describe('lerp', () => {
    it('should interpolate between vectors', () => {
      const a: Vector3 = { x: 0, y: 0, z: 0 };
      const b: Vector3 = { x: 10, y: 10, z: 10 };
      const result = lerp(a, b, 0.5);
      expect(result).toEqual({ x: 5, y: 5, z: 5 });
    });

    it('should return start at t=0', () => {
      const a: Vector3 = { x: 0, y: 0, z: 0 };
      const b: Vector3 = { x: 10, y: 10, z: 10 };
      expect(lerp(a, b, 0)).toEqual(a);
    });

    it('should return end at t=1', () => {
      const a: Vector3 = { x: 0, y: 0, z: 0 };
      const b: Vector3 = { x: 10, y: 10, z: 10 };
      expect(lerp(a, b, 1)).toEqual(b);
    });
  });
});

// =============================================================================
// SPATIAL QUERY TESTS
// =============================================================================

describe('SpatialQueryExecutor', () => {
  let executor: SpatialQueryExecutor;
  let entities: SpatialEntity[];

  beforeEach(() => {
    executor = new SpatialQueryExecutor();
    entities = [
      createEntity('e1', { x: 0, y: 0, z: 0 }, 'npc'),
      createEntity('e2', { x: 5, y: 0, z: 0 }, 'npc'),
      createEntity('e3', { x: 10, y: 0, z: 0 }, 'item'),
      createEntity('e4', { x: 0, y: 10, z: 0 }, 'item'),
      createEntity('e5', { x: 100, y: 100, z: 100 }, 'npc'),
    ];
    executor.updateEntities(entities);
  });

  describe('nearest query', () => {
    it('should find nearest entity', () => {
      const results = executor.execute({
        type: 'nearest',
        from: { x: 4, y: 0, z: 0 },
        count: 1,
      });

      expect(results.length).toBe(1);
      expect(results[0].entity.id).toBe('e2'); // Closest to x=4
    });

    it('should find multiple nearest entities', () => {
      const results = executor.execute({
        type: 'nearest',
        from: { x: 0, y: 0, z: 0 },
        count: 3,
      });

      expect(results.length).toBe(3);
      expect(results[0].entity.id).toBe('e1'); // At origin
      expect(results[1].entity.id).toBe('e2'); // 5 units away
    });
  });

  describe('within query', () => {
    it('should find entities within radius', () => {
      const results = executor.execute({
        type: 'within',
        from: { x: 0, y: 0, z: 0 },
        radius: 6,
      });

      expect(results.length).toBe(2);
      expect(results.map((r) => r.entity.id).sort()).toEqual(['e1', 'e2']);
    });

    it('should return empty for no matches', () => {
      const results = executor.execute({
        type: 'within',
        from: { x: 50, y: 50, z: 50 },
        radius: 1,
      });

      expect(results.length).toBe(0);
    });
  });

  describe('by_type query', () => {
    it('should filter by entity type', () => {
      const results = executor.execute({
        type: 'by_type',
        from: { x: 0, y: 0, z: 0 },
        entityTypes: ['item'],
      });

      expect(results.length).toBe(2);
      expect(results.every((r) => r.entity.type === 'item')).toBe(true);
    });

    it('should filter by type and radius', () => {
      const results = executor.execute({
        type: 'by_type',
        from: { x: 0, y: 0, z: 0 },
        entityTypes: ['npc'],
        radius: 20,
      });

      expect(results.length).toBe(2); // e1 and e2, not e5
    });
  });

  describe('entity type filter', () => {
    it('should apply entity type filter across queries', () => {
      const results = executor.execute({
        type: 'nearest',
        from: { x: 0, y: 0, z: 0 },
        count: 5,
        entityTypeFilter: ['item'],
      });

      expect(results.length).toBe(2);
      expect(results.every((r) => r.entity.type === 'item')).toBe(true);
    });
  });

  describe('maxResults', () => {
    it('should limit results', () => {
      const results = executor.execute({
        type: 'within',
        from: { x: 0, y: 0, z: 0 },
        radius: 1000,
        maxResults: 2,
      });

      expect(results.length).toBe(2);
    });
  });
});

// =============================================================================
// SPATIAL CONTEXT PROVIDER TESTS
// =============================================================================

describe('SpatialContextProvider', () => {
  let provider: SpatialContextProvider;

  beforeEach(() => {
    provider = new SpatialContextProvider();
  });

  afterEach(() => {
    provider.stop();
  });

  describe('agent registration', () => {
    it('should register an agent', () => {
      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 });
      expect(provider.getContext('agent-1')).toBeNull(); // No update yet
    });

    it('should unregister an agent', () => {
      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 });
      provider.unregisterAgent('agent-1');
      expect(provider.getContext('agent-1')).toBeNull();
    });
  });

  describe('entity management', () => {
    it('should add entities', () => {
      provider.setEntity(createEntity('e1', { x: 0, y: 0, z: 0 }));
      const entities = provider.getEntities();
      expect(entities.length).toBe(1);
      expect(entities[0].id).toBe('e1');
    });

    it('should remove entities', () => {
      provider.setEntity(createEntity('e1', { x: 0, y: 0, z: 0 }));
      provider.removeEntity('e1');
      expect(provider.getEntities().length).toBe(0);
    });

    it('should batch set entities', () => {
      provider.setEntities([
        createEntity('e1', { x: 0, y: 0, z: 0 }),
        createEntity('e2', { x: 5, y: 0, z: 0 }),
      ]);
      expect(provider.getEntities().length).toBe(2);
    });
  });

  describe('context updates', () => {
    it('should update context on manual update', () => {
      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 });
      provider.setEntities([
        createEntity('e1', { x: 1, y: 0, z: 0 }),
        createEntity('e2', { x: 5, y: 0, z: 0 }),
      ]);

      provider.update();

      const context = provider.getContext('agent-1');
      expect(context).not.toBeNull();
      expect(context!.nearbyEntities.length).toBe(2);
    });

    it('should emit context:updated event', () => {
      const handler = vi.fn();
      provider.on('context:updated', handler);

      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 });
      provider.update();

      expect(handler).toHaveBeenCalledWith('agent-1', expect.any(Object));
    });
  });

  describe('entity events', () => {
    it('should emit entity:entered when entity comes into range', () => {
      const handler = vi.fn();
      provider.on('entity:entered', handler);

      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 }, { perceptionRadius: 10 });
      provider.update(); // First update with no entities

      provider.setEntity(createEntity('e1', { x: 5, y: 0, z: 0 }));
      provider.update();

      expect(handler).toHaveBeenCalledWith('agent-1', expect.objectContaining({
        type: 'entity_entered',
      }));
    });

    it('should emit entity:exited when entity leaves range', () => {
      const handler = vi.fn();
      provider.on('entity:exited', handler);

      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 }, { perceptionRadius: 10 });
      provider.setEntity(createEntity('e1', { x: 5, y: 0, z: 0 }));
      provider.update();

      provider.removeEntity('e1');
      provider.update();

      expect(handler).toHaveBeenCalledWith('agent-1', expect.objectContaining({
        type: 'entity_exited',
      }));
    });
  });

  describe('region events', () => {
    it('should emit region:entered when agent enters region', () => {
      const handler = vi.fn();
      provider.on('region:entered', handler);

      provider.setRegion(createRegion('r1', { x: -5, y: -5, z: -5 }, { x: 5, y: 5, z: 5 }));
      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 });
      provider.update();

      expect(handler).toHaveBeenCalledWith('agent-1', expect.objectContaining({
        type: 'region_entered',
      }));
    });

    it('should emit region:exited when agent leaves region', () => {
      const handler = vi.fn();
      provider.on('region:exited', handler);

      provider.setRegion(createRegion('r1', { x: -5, y: -5, z: -5 }, { x: 5, y: 5, z: 5 }));
      provider.registerAgent('agent-1', { x: 0, y: 0, z: 0 });
      provider.update();

      provider.updateAgentPosition('agent-1', { x: 100, y: 100, z: 100 });
      provider.update();

      expect(handler).toHaveBeenCalledWith('agent-1', expect.objectContaining({
        type: 'region_exited',
      }));
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      provider.setEntities([
        createEntity('e1', { x: 1, y: 0, z: 0 }, 'npc'),
        createEntity('e2', { x: 5, y: 0, z: 0 }, 'item'),
        createEntity('e3', { x: 10, y: 0, z: 0 }, 'npc'),
      ]);
    });

    it('should find nearest entity', () => {
      const results = provider.findNearest({ x: 0, y: 0, z: 0 }, 1);
      expect(results.length).toBe(1);
      expect(results[0].entity.id).toBe('e1');
    });

    it('should find entities within radius', () => {
      const results = provider.findWithin({ x: 0, y: 0, z: 0 }, 6);
      expect(results.length).toBe(2);
    });

    it('should filter by type', () => {
      const results = provider.findNearest({ x: 0, y: 0, z: 0 }, 10, ['item']);
      expect(results.length).toBe(1);
      expect(results[0].entity.type).toBe('item');
    });
  });

  describe('region subscriptions', () => {
    it('should call subscription callback on region enter', () => {
      const callback = vi.fn();

      provider.setRegion(createRegion('r1', { x: -5, y: -5, z: -5 }, { x: 5, y: 5, z: 5 }));
      provider.registerAgent('agent-1', { x: 100, y: 100, z: 100 });
      provider.subscribeToRegion('agent-1', 'r1', callback);
      provider.update();

      // Move agent into region
      provider.updateAgentPosition('agent-1', { x: 0, y: 0, z: 0 });
      provider.update();

      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        type: 'region_entered',
      }));
    });
  });
});

// =============================================================================
// PERFORMANCE TESTS
// =============================================================================

describe('Spatial Performance', () => {
  it('should handle 1000 entities efficiently', () => {
    const provider = new SpatialContextProvider();
    const entities: SpatialEntity[] = [];

    for (let i = 0; i < 1000; i++) {
      entities.push(createEntity(`e${i}`, {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 1000,
      }));
    }

    provider.setEntities(entities);
    provider.registerAgent('agent-1', { x: 500, y: 500, z: 500 });

    const start = performance.now();
    provider.update();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50); // Should complete in under 50ms
    provider.stop();
  });

  it('should find nearest among 1000 entities under 10ms', () => {
    const executor = new SpatialQueryExecutor();
    const entities: SpatialEntity[] = [];

    for (let i = 0; i < 1000; i++) {
      entities.push(createEntity(`e${i}`, {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
        z: Math.random() * 1000,
      }));
    }

    executor.updateEntities(entities);

    const start = performance.now();
    const results = executor.execute({
      type: 'nearest',
      from: { x: 500, y: 500, z: 500 },
      count: 10,
    });
    const elapsed = performance.now() - start;

    expect(results.length).toBe(10);
    expect(elapsed).toBeLessThan(10);
  });
});
