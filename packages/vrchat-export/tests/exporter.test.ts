/**
 * VRChat Export Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { exportToVRChat, SUPPORTED_TRAITS, TRAIT_COMPONENT_MAP } from '../src/index.js';
import type { HSPlusAST, HSPlusNode } from '@holoscript/core';

// Helper to create test AST
function createTestAST(nodes: Partial<HSPlusNode>[]): HSPlusAST {
  const children: HSPlusNode[] = nodes.map((n, i) => ({
    type: n.type || 'cube',
    id: n.id || `object_${i}`,
    properties: n.properties || {},
    directives: n.directives || [],
    children: n.children || [],
    traits: n.traits || new Map(),
  }));

  return {
    version: '1.0',
    root: {
      type: 'scene',
      id: 'root',
      properties: {},
      directives: [],
      children,
      traits: new Map(),
    },
    imports: [],
    hasState: false,
    hasVRTraits: children.some(c => c.traits && c.traits.size > 0),
    hasControlFlow: false,
  };
}

describe('@holoscript/vrchat-export', () => {
  describe('exportToVRChat', () => {
    it('should export empty AST successfully', async () => {
      const ast = createTestAST([]);
      const result = await exportToVRChat(ast);

      expect(result.success).toBe(true);
      expect(result.stats.objectCount).toBe(1); // root node
      expect(result.errors.filter(e => e.fatal)).toHaveLength(0);
    });

    it('should export node with @grabbable trait', async () => {
      const traits = new Map();
      traits.set('grabbable', { snap_to_hand: true, haptic_on_grab: 0.7 });

      const ast = createTestAST([
        {
          type: 'orb',
          id: 'ball',
          properties: { color: '#ff0000', position: [0, 1, 0] },
          traits,
        },
      ]);

      const result = await exportToVRChat(ast, {
        projectName: 'TestWorld',
      });

      expect(result.success).toBe(true);
      expect(result.prefabs.length).toBeGreaterThan(0);
      expect(result.scripts.length).toBeGreaterThan(0);

      // Check that grabbable script was generated
      const grabbableScript = result.scripts.find(s => s.trait === 'grabbable');
      expect(grabbableScript).toBeDefined();
      expect(grabbableScript?.source).toContain('VRC_Pickup');
      expect(grabbableScript?.source).toContain('OnPickup');
    });

    it('should export node with @throwable trait', async () => {
      const traits = new Map();
      traits.set('throwable', { velocity_multiplier: 2, bounce: true });

      const ast = createTestAST([
        {
          type: 'cube',
          id: 'throwCube',
          properties: { color: '#0000ff' },
          traits,
        },
      ]);

      const result = await exportToVRChat(ast);

      expect(result.success).toBe(true);
      const throwableScript = result.scripts.find(s => s.trait === 'throwable');
      expect(throwableScript).toBeDefined();
      expect(throwableScript?.source).toContain('velocityMultiplier');
    });

    it('should export node with multiple traits', async () => {
      const traits = new Map();
      traits.set('grabbable', { snap_to_hand: true });
      traits.set('throwable', { velocity_multiplier: 1.5 });
      traits.set('hoverable', { glow: true, highlight_color: '#ffff00' });

      const ast = createTestAST([
        {
          type: 'sphere',
          id: 'multiTraitBall',
          properties: { color: '#00ff00' },
          traits,
        },
      ]);

      const result = await exportToVRChat(ast);

      expect(result.success).toBe(true);
      expect(result.scripts.length).toBe(3);
      expect(result.scripts.map(s => s.trait).sort()).toEqual([
        'grabbable',
        'hoverable',
        'throwable',
      ]);
    });

    it('should generate materials for colored objects', async () => {
      const ast = createTestAST([
        {
          type: 'cube',
          id: 'redCube',
          properties: { color: '#ff0000' },
        },
        {
          type: 'sphere',
          id: 'blueSphere',
          properties: { color: '#0000ff' },
        },
      ]);

      const result = await exportToVRChat(ast);

      expect(result.materials.length).toBe(2);
      expect(result.materials.map(m => m.name).sort()).toEqual([
        'blueSphere_Material',
        'redCube_Material',
      ]);
    });

    it('should include README with marketing content', async () => {
      const ast = createTestAST([{ type: 'cube', id: 'test' }]);

      const result = await exportToVRChat(ast, {
        projectName: 'TestWorld',
        includeReadme: true,
      });

      const readmeFile = result.files.find(f => f.path === 'README.md');
      expect(readmeFile).toBeDefined();
    });

    it('should include migration guide', async () => {
      const ast = createTestAST([{ type: 'cube', id: 'test' }]);

      const result = await exportToVRChat(ast, {
        includeMigrationGuide: true,
      });

      const guideFile = result.files.find(f => f.path === 'MIGRATION_GUIDE.md');
      expect(guideFile).toBeDefined();
    });

    it('should warn about @breakable requiring manual setup', async () => {
      const traits = new Map();
      traits.set('breakable', { fragments: 5, respawn: true });

      const ast = createTestAST([
        {
          type: 'cube',
          id: 'breakableCube',
          traits,
        },
      ]);

      const result = await exportToVRChat(ast);

      expect(result.warnings.some(w => w.code === 'BREAKABLE_POOL_REQUIRED')).toBe(true);
      expect(result.stats.manualSetupRequired.length).toBeGreaterThan(0);
    });
  });

  describe('constants', () => {
    it('should export all 9 supported traits', () => {
      expect(SUPPORTED_TRAITS).toHaveLength(9);
      expect(SUPPORTED_TRAITS).toContain('grabbable');
      expect(SUPPORTED_TRAITS).toContain('throwable');
      expect(SUPPORTED_TRAITS).toContain('pointable');
      expect(SUPPORTED_TRAITS).toContain('hoverable');
      expect(SUPPORTED_TRAITS).toContain('scalable');
      expect(SUPPORTED_TRAITS).toContain('rotatable');
      expect(SUPPORTED_TRAITS).toContain('stackable');
      expect(SUPPORTED_TRAITS).toContain('snappable');
      expect(SUPPORTED_TRAITS).toContain('breakable');
    });

    it('should have component mappings for all traits', () => {
      for (const trait of SUPPORTED_TRAITS) {
        expect(TRAIT_COMPONENT_MAP[trait]).toBeDefined();
        expect(Array.isArray(TRAIT_COMPONENT_MAP[trait])).toBe(true);
      }
    });
  });
});
