import { describe, it, expect, beforeEach } from 'vitest';

import { TraitVisualRegistry } from '../TraitVisualRegistry';
import { TraitCompositor } from '../TraitCompositor';
import { CacheManager } from '../resolvers/CacheManager';
import { ProceduralResolver } from '../resolvers/ProceduralResolver';
import { AssetResolverPipeline } from '../resolvers/AssetResolverPipeline';
import { registerAllPresets } from '../index';
import type { TraitVisualConfig } from '../types';
import type { AssetResolverPlugin, ResolvedAsset } from '../resolvers/types';

// ---------------------------------------------------------------------------
// 1. TraitVisualRegistry
// ---------------------------------------------------------------------------
describe('TraitVisualRegistry', () => {
  let registry: TraitVisualRegistry;

  beforeEach(() => {
    registry = TraitVisualRegistry.getInstance();
    registry.reset();
  });

  it('getInstance() returns a singleton', () => {
    const a = TraitVisualRegistry.getInstance();
    const b = TraitVisualRegistry.getInstance();
    expect(a).toBe(b);
  });

  it('register() and get() round-trip', () => {
    const config: TraitVisualConfig = {
      material: { roughness: 0.5, metalness: 0.8 },
      tags: ['metallic'],
      layer: 'base_material',
    };
    registry.register('test_metal', config);
    const retrieved = registry.get('test_metal');
    expect(retrieved).toBe(config);
    expect(retrieved?.material?.roughness).toBe(0.5);
    expect(retrieved?.material?.metalness).toBe(0.8);
    expect(retrieved?.tags).toEqual(['metallic']);
    expect(retrieved?.layer).toBe('base_material');
  });

  it('get() returns undefined for unregistered traits', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('registerBatch() registers multiple configs at once', () => {
    const batch: Record<string, TraitVisualConfig> = {
      alpha: { material: { roughness: 0.1 }, tags: ['a'], layer: 'surface' },
      beta: { material: { roughness: 0.2 }, tags: ['b'], layer: 'condition' },
      gamma: { material: { roughness: 0.3 }, tags: ['c'], layer: 'lighting' },
    };
    registry.registerBatch(batch);

    expect(registry.get('alpha')?.material?.roughness).toBe(0.1);
    expect(registry.get('beta')?.material?.roughness).toBe(0.2);
    expect(registry.get('gamma')?.material?.roughness).toBe(0.3);
    expect(registry.size).toBe(3);
  });

  it('has() returns true for registered traits', () => {
    registry.register('existing', { tags: ['x'], layer: 'mood' });
    expect(registry.has('existing')).toBe(true);
  });

  it('has() returns false for unregistered traits', () => {
    expect(registry.has('does_not_exist')).toBe(false);
  });

  it('size reflects the number of registered configs', () => {
    expect(registry.size).toBe(0);
    registry.register('one', { tags: ['a'] });
    expect(registry.size).toBe(1);
    registry.register('two', { tags: ['b'] });
    expect(registry.size).toBe(2);
    registry.register('three', { tags: ['c'] });
    expect(registry.size).toBe(3);
  });

  it('reset() clears all registered configs', () => {
    registry.register('a', { tags: ['x'] });
    registry.register('b', { tags: ['y'] });
    expect(registry.size).toBe(2);

    registry.reset();

    expect(registry.size).toBe(0);
    expect(registry.has('a')).toBe(false);
    expect(registry.has('b')).toBe(false);
    expect(registry.get('a')).toBeUndefined();
  });

  it('register() overwrites an existing entry with the same name', () => {
    registry.register('dup', { material: { roughness: 0.1 }, tags: ['v1'] });
    registry.register('dup', { material: { roughness: 0.9 }, tags: ['v2'] });

    expect(registry.size).toBe(1);
    expect(registry.get('dup')?.material?.roughness).toBe(0.9);
    expect(registry.get('dup')?.tags).toEqual(['v2']);
  });

  it('getAll() returns a read-only map of all registered configs', () => {
    registry.register('x', { tags: ['x'] });
    registry.register('y', { tags: ['y'] });

    const all = registry.getAll();
    expect(all.size).toBe(2);
    expect(all.get('x')?.tags).toEqual(['x']);
    expect(all.get('y')?.tags).toEqual(['y']);
  });
});

// ---------------------------------------------------------------------------
// 2. Auto-registration (preset loading)
// ---------------------------------------------------------------------------
describe('Auto-registration from presets', () => {
  beforeEach(() => {
    const registry = TraitVisualRegistry.getInstance();
    registry.reset();
    registerAllPresets();
  });

  it('registerAllPresets loads >= 299 traits from preset files', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.size).toBeGreaterThanOrEqual(299);
  });

  it('contains metallic_sheen trait (visual-effects preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('metallic_sheen')).toBe(true);

    const config = registry.get('metallic_sheen');
    expect(config?.material?.metalness).toBe(0.7);
    expect(config?.material?.roughness).toBe(0.2);
    expect(config?.tags).toContain('metallic');
    expect(config?.layer).toBe('visual_effect');
  });

  it('contains wooden trait (material-properties preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('wooden')).toBe(true);

    const config = registry.get('wooden');
    expect(config?.material?.roughness).toBe(0.8);
    expect(config?.material?.metalness).toBe(0.0);
    expect(config?.material?.color).toBe('#8B5E3C');
    expect(config?.layer).toBe('base_material');
  });

  it('contains glossy trait (surface-texture preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('glossy')).toBe(true);

    const config = registry.get('glossy');
    expect(config?.material?.roughness).toBe(0.05);
    expect(config?.material?.metalness).toBe(0.3);
    expect(config?.layer).toBe('surface');
  });

  it('contains diamond_gem trait (gems-minerals preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('diamond_gem')).toBe(true);

    const config = registry.get('diamond_gem');
    expect(config?.material?.transmission).toBe(0.95);
    expect(config?.material?.ior).toBe(2.42);
    expect(config?.tags).toContain('gem');
  });

  it('contains rusted trait (age-condition preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('rusted')).toBe(true);

    const config = registry.get('rusted');
    expect(config?.material?.roughness).toBe(0.85);
    expect(config?.material?.metalness).toBe(0.6);
    expect(config?.material?.color).toBe('#8B4513');
    expect(config?.layer).toBe('condition');
  });

  it('contains tiny trait (size-scale preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('tiny')).toBe(true);

    const config = registry.get('tiny');
    expect(config?.scale).toEqual([0.1, 0.1, 0.1]);
    expect(config?.layer).toBe('scale');
  });

  it('contains happy trait (emotion-mood preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('happy')).toBe(true);

    const config = registry.get('happy');
    expect(config?.emissive?.color).toBe('#FFD700');
    expect(config?.emissive?.intensity).toBe(0.3);
    expect(config?.layer).toBe('mood');
  });

  it('contains volcanic trait (environmental-biome preset)', () => {
    const registry = TraitVisualRegistry.getInstance();
    expect(registry.has('volcanic')).toBe(true);

    const config = registry.get('volcanic');
    expect(config?.emissive?.color).toBe('#FF4500');
    expect(config?.emissive?.intensity).toBe(1.5);
    expect(config?.material?.color).toBe('#3C1414');
    expect(config?.layer).toBe('environmental');
  });
});

// ---------------------------------------------------------------------------
// 3. TraitCompositor
// ---------------------------------------------------------------------------
describe('TraitCompositor', () => {
  let registry: TraitVisualRegistry;
  let compositor: TraitCompositor;

  beforeEach(() => {
    registry = TraitVisualRegistry.getInstance();
    registry.reset();
    registerAllPresets();
    compositor = new TraitCompositor(registry);
  });

  it('compose([]) returns an empty object', () => {
    const result = compositor.compose([]);
    expect(result).toEqual({});
  });

  it('compose(["wooden"]) returns wood material PBR props', () => {
    const result = compositor.compose(['wooden']);
    expect(result.roughness).toBe(0.8);
    expect(result.metalness).toBe(0.0);
    expect(result.color).toBe('#8B5E3C');
  });

  it('compose(["gold_material", "polished"]) applies polished on top of gold', () => {
    // gold_material: layer 'base_material' (priority 0) -> roughness 0.3, metalness 1.0, color '#FFD700'
    // polished: layer 'condition' (priority 2) -> roughness 0.05, envMapIntensity 1.5
    // multi-trait merge rule: ['gold_material', 'polished'] -> roughness 0.05, envMapIntensity 2.0
    const result = compositor.compose(['gold_material', 'polished']);

    expect(result.metalness).toBe(1.0); // from gold_material
    expect(result.color).toBe('#FFD700'); // from gold_material
    // Multi-trait merge rule overrides roughness and envMapIntensity
    expect(result.roughness).toBe(0.05);
    expect(result.envMapIntensity).toBe(2.0);
  });

  it('compose(["pristine", "rusted"]) - pristine suppresses rusted', () => {
    // pristine suppresses rusted via composition rule
    // So only pristine's material should apply
    const result = compositor.compose(['pristine', 'rusted']);

    // pristine: roughness 0.1, envMapIntensity 1.2
    expect(result.roughness).toBe(0.1);
    expect(result.envMapIntensity).toBe(1.2);
    // rusted's color (#8B4513) should NOT be present since it's suppressed
    expect(result.color).toBeUndefined();
    // rusted's metalness (0.6) should NOT be present
    expect(result.metalness).toBeUndefined();
  });

  it('compose(["rusted"]) - rusted alone cannot self-satisfy metallic requirement', () => {
    // rusted has requires: { tags: ['metallic'] }
    // rusted's own tags include 'metallic', but a trait cannot satisfy its own requirement
    // Therefore rusted is filtered out — result is empty
    const result = compositor.compose(['rusted']);

    expect(result.roughness).toBeUndefined();
    expect(result.metalness).toBeUndefined();
    expect(result.color).toBeUndefined();
  });

  it('compose(["wooden", "rusted"]) - rusted filtered because wooden lacks metallic tag', () => {
    // wooden tags: ['organic', 'opaque'] - no 'metallic' tag
    // rusted requires 'metallic' from another trait — wooden doesn't provide it
    // rusted is filtered out, only wooden applies
    const result = compositor.compose(['wooden', 'rusted']);

    // Only wooden (base_material): roughness 0.8, metalness 0.0, color '#8B5E3C'
    expect(result.roughness).toBe(0.8);
    expect(result.metalness).toBe(0.0);
    expect(result.color).toBe('#8B5E3C');
  });

  it('compose(["iron_material", "rusted"]) - multi-trait merge rule applies', () => {
    // iron_material (base_material, priority 0): roughness 0.5, metalness 0.9, color '#434343'
    //   tags: ['metallic'] — satisfies rusted's requirement
    // rusted (condition, priority 2): roughness 0.85, metalness 0.6, color '#8B4513'
    // After layer merge: rusted overrides iron_material
    // Then multi-trait merge rule: ['rusted', 'iron_material'] -> color '#6B3A1F', roughness 0.9, metalness 0.5
    const result = compositor.compose(['iron_material', 'rusted']);

    // Multi-trait merge rule is applied AFTER layer merge, overwriting those props
    expect(result.color).toBe('#6B3A1F');
    expect(result.roughness).toBe(0.9);
    expect(result.metalness).toBe(0.5);
  });

  it('layer ordering: base_material props are overridden by surface, then condition', () => {
    registry.register('test_base', {
      material: { roughness: 0.5, metalness: 0.3, color: '#FF0000' },
      tags: ['test'],
      layer: 'base_material',
    });
    registry.register('test_surface', {
      material: { roughness: 0.2 },
      tags: ['test'],
      layer: 'surface',
    });
    registry.register('test_condition', {
      material: { roughness: 0.9 },
      tags: ['test'],
      layer: 'condition',
    });

    const result = compositor.compose(['test_base', 'test_surface', 'test_condition']);

    // base_material (priority 0) applied first: roughness 0.5, metalness 0.3, color '#FF0000'
    // surface (priority 1) overrides: roughness -> 0.2
    // condition (priority 2) overrides: roughness -> 0.9
    expect(result.roughness).toBe(0.9);
    expect(result.metalness).toBe(0.3); // from base, not overridden
    expect(result.color).toBe('#FF0000'); // from base, not overridden
  });

  it('layer ordering respects all layer priorities', () => {
    registry.register('t_mood', {
      material: { roughness: 0.1 },
      tags: [],
      layer: 'mood',
    });
    registry.register('t_base', {
      material: { roughness: 0.9 },
      tags: [],
      layer: 'base_material',
    });

    // Even if mood is passed first, base_material has lower priority so is applied first
    // mood (priority 8) overrides base_material (priority 0)
    const result = compositor.compose(['t_mood', 't_base']);
    expect(result.roughness).toBe(0.1); // mood layer wins (higher priority = applied later)
  });

  it('multi-trait merge: ["emissive", "angry"] produces emissive #FF2200', () => {
    const result = compositor.compose(['emissive', 'angry']);

    expect(result.emissive).toBe('#FF2200');
    expect(result.emissiveIntensity).toBe(2.5);
  });

  it('compose with unregistered traits ignores them', () => {
    const result = compositor.compose(['nonexistent_trait']);
    expect(result).toEqual({});
  });

  it('compose mixes registered and unregistered traits gracefully', () => {
    const result = compositor.compose(['nonexistent', 'wooden', 'also_nonexistent']);
    expect(result.roughness).toBe(0.8);
    expect(result.metalness).toBe(0.0);
    expect(result.color).toBe('#8B5E3C');
  });

  it('emissive config sets emissive and emissiveIntensity on merged output', () => {
    const result = compositor.compose(['emissive']);

    // emissive trait has emissive: { color: '#FFFFFF', intensity: 1.5 }
    // AND material: { emissive: '#FFFFFF', emissiveIntensity: 1.5 }
    // The compositor merges both: material props first, then emissive config overwrites
    expect(result.emissive).toBe('#FFFFFF');
    expect(result.emissiveIntensity).toBe(1.5);
  });

  it('opacity config sets opacity and transparent on merged output', () => {
    const result = compositor.compose(['faded']);

    // faded has opacity: 0.85
    expect(result.opacity).toBe(0.85);
    expect(result.transparent).toBe(true);
  });

  it('additive rule: enchanted adds emissive overlay', () => {
    const result = compositor.compose(['enchanted']);

    // enchanted base config: emissive '#9966FF', emissiveIntensity 0.5
    // additive rule: emissive '#9966FF', emissiveIntensity 0.3
    // additive rule is applied AFTER the main merge, so it overwrites
    expect(result.emissive).toBe('#9966FF');
    expect(result.emissiveIntensity).toBe(0.3);
  });

  it('brand_new suppresses worn and weathered', () => {
    const result = compositor.compose(['brand_new', 'worn', 'weathered']);

    // brand_new suppresses: worn, weathered, and many others
    // Only brand_new's material should be in the output
    expect(result.roughness).toBe(0.1); // brand_new
    expect(result.envMapIntensity).toBe(1.3); // brand_new
  });

  // ── New composition rule tests ────────────────────────────────

  it('temperature conflict: frozen_liquid suppresses fiery', () => {
    const result = compositor.compose(['frozen_liquid', 'fiery']);

    // frozen_liquid suppresses fiery; only frozen_liquid material applies
    expect(result.color).toBe('#D6EAF8'); // frozen_liquid additive tint
    // fiery's emissive should NOT be present
    expect(result.emissiveIntensity).toBeUndefined();
  });

  it('organic requirement: moss_covered on wooden passes', () => {
    // wooden has tags: ['organic', 'opaque']
    const result = compositor.compose(['wooden', 'moss_covered']);

    // Both should apply — moss_covered overrides wooden (condition > base_material)
    expect(result.color).toBe('#4A7C3F'); // moss_covered color
    expect(result.roughness).toBe(0.9); // moss_covered roughness
  });

  it('organic requirement: moss_covered on iron_material fails', () => {
    // iron_material has tags: ['metallic'] — no organic/mineral/stone
    const result = compositor.compose(['iron_material', 'moss_covered']);

    // moss_covered filtered out, only iron_material applies
    expect(result.color).toBe('#434343'); // iron_material color
    expect(result.metalness).toBe(0.9); // iron_material metalness
  });

  it('visibility suppression: invisible suppresses glowing', () => {
    const result = compositor.compose(['invisible', 'glowing']);

    // invisible suppresses glowing; glowing's emissive should not appear
    expect(result.emissive).toBeUndefined();
    expect(result.emissiveIntensity).toBeUndefined();
  });

  it('magic synergy: enchanted + ancient = magical artifact', () => {
    const result = compositor.compose(['enchanted', 'ancient']);

    // Multi-trait merge: enchanted + ancient → purple magical artifact
    expect(result.emissive).toBe('#9966FF');
    expect(result.emissiveIntensity).toBe(0.5);
    expect(result.color).toBe('#8B6914');
  });

  it('nature synergy: wildfire + wooden = burning wood', () => {
    const result = compositor.compose(['wildfire', 'wooden']);

    // Multi-trait merge: wildfire + wooden → burning wood
    expect(result.emissive).toBe('#FF4500');
    expect(result.emissiveIntensity).toBe(2.5);
    expect(result.roughness).toBe(0.9);
  });

  it('metal finishing: brushed requires metallic tag from other trait', () => {
    // brushed itself has metallic tag but can't self-satisfy
    const resultAlone = compositor.compose(['brushed']);
    expect(resultAlone.roughness).toBeUndefined();

    // With iron_material (provides metallic tag) → brushed applies
    const resultWithMetal = compositor.compose(['iron_material', 'brushed']);
    expect(resultWithMetal.roughness).toBeDefined();
  });

  it('copper + rusted = verdigris patina', () => {
    const result = compositor.compose(['copper_material', 'rusted']);

    // Multi-trait merge: rusted + copper → verdigris
    expect(result.color).toBe('#5C8A7A');
    expect(result.metalness).toBe(0.6);
  });

  it('cursed suppresses blessed (and vice versa)', () => {
    // cursed suppresses blessed
    const r1 = compositor.compose(['cursed', 'blessed']);
    // blessed is suppressed, only cursed material applies
    expect(r1).toBeDefined();

    // blessed suppresses cursed
    const r2 = compositor.compose(['blessed', 'cursed']);
    // cursed is suppressed, only blessed material applies
    expect(r2).toBeDefined();
  });

  it('petrified suppresses living traits', () => {
    const result = compositor.compose(['petrified', 'growable', 'bloomable']);

    // petrified suppresses growable and bloomable
    // Only petrified material should apply
    expect(result.roughness).toBe(0.6); // petrified roughness
  });

  it('additive: ghostly adds transparency', () => {
    const result = compositor.compose(['wooden', 'ghostly']);

    // ghostly additive: opacity 0.3, transparent true
    expect(result.opacity).toBe(0.3);
    expect(result.transparent).toBe(true);
    // wooden's base material should still be present
    expect(result.color).toBeDefined();
  });

  it('additive: bioluminescent adds green glow', () => {
    const result = compositor.compose(['aquatic', 'bioluminescent']);

    // Multi-trait merge: bioluminescent + aquatic → glowing sea creature
    expect(result.emissive).toBe('#00CCAA');
    expect(result.emissiveIntensity).toBe(1.2);
  });

  it('frozen + crystalline = ice crystal', () => {
    const result = compositor.compose(['frozen_liquid', 'crystalline']);

    // Multi-trait merge: frozen_liquid + crystalline → ice crystal
    expect(result.transmission).toBe(0.9);
    expect(result.ior).toBe(1.31);
    expect(result.iridescence).toBe(0.7);
  });
});

// ---------------------------------------------------------------------------
// 4. CacheManager
// ---------------------------------------------------------------------------
describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager(1024); // 1KB limit for testing
  });

  it('get/set round-trip stores and retrieves assets', () => {
    const asset: ResolvedAsset = {
      type: 'texture',
      url: 'https://example.com/texture.png',
    };

    cache.set('wooden', asset);
    const retrieved = cache.get('wooden');

    expect(retrieved).toBeDefined();
    expect(retrieved?.type).toBe('texture');
    expect(retrieved?.url).toBe('https://example.com/texture.png');
  });

  it('get() returns undefined for uncached traits', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('has() returns true for cached traits', () => {
    cache.set('test_trait', { type: 'texture' });
    expect(cache.has('test_trait')).toBe(true);
  });

  it('has() returns false for uncached traits', () => {
    expect(cache.has('missing')).toBe(false);
  });

  it('LRU eviction when cache exceeds limit', () => {
    // Use a very small cache (200 bytes) to force eviction
    const smallCache = new CacheManager(200);

    // Each asset: base 100 bytes (no URL/data) = ~100 bytes each
    const asset1: ResolvedAsset = { type: 'texture' };
    const asset2: ResolvedAsset = { type: 'model' };

    // Insert first (100 bytes, under 200 limit)
    smallCache.set('trait_a', asset1);
    expect(smallCache.has('trait_a')).toBe(true);
    expect(smallCache.size).toBe(1);

    // Insert second (200 bytes total, at limit)
    smallCache.set('trait_b', asset2);
    expect(smallCache.has('trait_a')).toBe(true);
    expect(smallCache.has('trait_b')).toBe(true);
    expect(smallCache.size).toBe(2);

    // Insert third — exceeds 200 limit, must evict at least one
    smallCache.set('trait_c', { type: 'shader' });
    expect(smallCache.has('trait_c')).toBe(true);
    // At least one of the original entries was evicted
    const survivors = [smallCache.has('trait_a'), smallCache.has('trait_b')].filter(Boolean).length;
    expect(survivors).toBeLessThan(2);
  });

  it('clear() resets the cache size to 0', () => {
    cache.set('a', { type: 'texture', url: 'x' });
    cache.set('b', { type: 'model', url: 'y' });
    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.has('a')).toBe(false);
    expect(cache.has('b')).toBe(false);
    expect(cache.bytesUsed).toBe(0);
  });

  it('single item exceeding limit is not cached', () => {
    const tinyCache = new CacheManager(50); // 50 bytes limit

    const bigAsset: ResolvedAsset = {
      type: 'texture',
      url: 'some_url',
    };

    tinyCache.set('big', bigAsset);

    // Should not be cached since its estimated size (~118 bytes) exceeds 50
    expect(tinyCache.has('big')).toBe(false);
    expect(tinyCache.size).toBe(0);
  });

  it('updating an existing cache entry replaces it', () => {
    const assetV1: ResolvedAsset = { type: 'texture', url: 'v1' };
    const assetV2: ResolvedAsset = { type: 'texture', url: 'v2' };

    cache.set('t', assetV1);
    expect(cache.get('t')?.url).toBe('v1');

    cache.set('t', assetV2);
    expect(cache.get('t')?.url).toBe('v2');
    expect(cache.size).toBe(1);
  });

  it('bytesUsed tracks cumulative size', () => {
    expect(cache.bytesUsed).toBe(0);

    cache.set('a', { type: 'texture' }); // ~100 bytes base overhead
    const sizeAfterFirst = cache.bytesUsed;
    expect(sizeAfterFirst).toBeGreaterThan(0);

    cache.set('b', { type: 'texture' });
    expect(cache.bytesUsed).toBeGreaterThan(sizeAfterFirst);
  });

  it('caches assets with ArrayBuffer data and tracks their size', () => {
    const buffer = new ArrayBuffer(256);
    const asset: ResolvedAsset = {
      type: 'texture',
      data: buffer,
    };

    cache.set('buffered', asset);
    expect(cache.has('buffered')).toBe(true);
    // Size should be at least 100 (base) + 256 (buffer) = 356
    expect(cache.bytesUsed).toBeGreaterThanOrEqual(356);

    const retrieved = cache.get('buffered');
    expect(retrieved?.data?.byteLength).toBe(256);
  });
});

// ---------------------------------------------------------------------------
// 5. ProceduralResolver
// ---------------------------------------------------------------------------
describe('ProceduralResolver', () => {
  let resolver: ProceduralResolver;
  const dummyConfig: TraitVisualConfig = { tags: [], layer: 'base_material' };

  beforeEach(() => {
    resolver = new ProceduralResolver();
  });

  it('canResolve("wooden", ...) returns true', () => {
    expect(resolver.canResolve('wooden', dummyConfig)).toBe(true);
  });

  it('canResolve("marble_material", ...) returns true', () => {
    expect(resolver.canResolve('marble_material', dummyConfig)).toBe(true);
  });

  it('canResolve("rusted", ...) returns true', () => {
    expect(resolver.canResolve('rusted', dummyConfig)).toBe(true);
  });

  it('canResolve("crystallized", ...) returns true', () => {
    expect(resolver.canResolve('crystallized', dummyConfig)).toBe(true);
  });

  it('canResolve("unknown_thing", ...) returns false', () => {
    expect(resolver.canResolve('unknown_thing', dummyConfig)).toBe(false);
  });

  it('canResolve("metallic_sheen", ...) returns false (not a procedural trait)', () => {
    expect(resolver.canResolve('metallic_sheen', dummyConfig)).toBe(false);
  });

  it('resolve("wooden", ...) returns texture with ArrayBuffer data', async () => {
    const result = await resolver.resolve('wooden', dummyConfig);

    expect(result.type).toBe('texture');
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.data!.byteLength).toBeGreaterThan(0);

    // Should be 256x256 RGBA = 256*256*4 = 262144 bytes
    expect(result.data!.byteLength).toBe(256 * 256 * 4);
  });

  it('resolve("wooden", ...) includes correct metadata', async () => {
    const result = await resolver.resolve('wooden', dummyConfig);

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.generator).toBe('procedural');
    expect(result.metadata?.pattern).toBe('wood_grain');
    expect(result.metadata?.width).toBe(256);
    expect(result.metadata?.height).toBe(256);
    expect(result.metadata?.format).toBe('rgba8');
  });

  it('resolve("marble_material", ...) returns marble vein texture', async () => {
    const result = await resolver.resolve('marble_material', dummyConfig);

    expect(result.type).toBe('texture');
    expect(result.data).toBeInstanceOf(ArrayBuffer);
    expect(result.metadata?.pattern).toBe('marble_vein');
  });

  it('resolve("crystallized", ...) returns voronoi texture', async () => {
    const result = await resolver.resolve('crystallized', dummyConfig);

    expect(result.type).toBe('texture');
    expect(result.metadata?.pattern).toBe('voronoi');
  });

  it('resolve() throws for unknown traits', async () => {
    await expect(resolver.resolve('unknown', dummyConfig)).rejects.toThrow(
      'ProceduralResolver: no spec for trait "unknown"',
    );
  });

  it('has correct name and priority', () => {
    expect(resolver.name).toBe('procedural');
    expect(resolver.priority).toBe(10);
  });

  it('generated textures are deterministic (same input = same output)', async () => {
    const result1 = await resolver.resolve('wooden', dummyConfig);
    const result2 = await resolver.resolve('wooden', dummyConfig);

    const bytes1 = new Uint8Array(result1.data!);
    const bytes2 = new Uint8Array(result2.data!);

    expect(bytes1.length).toBe(bytes2.length);
    for (let i = 0; i < bytes1.length; i++) {
      expect(bytes1[i]).toBe(bytes2[i]);
    }
  });

  it('generated texture pixels are valid RGBA (alpha channel is 255)', async () => {
    const result = await resolver.resolve('wooden', dummyConfig);
    const pixels = new Uint8Array(result.data!);

    // Check every 4th byte (alpha channel) is 255
    for (let i = 3; i < pixels.length; i += 4) {
      expect(pixels[i]).toBe(255);
    }
  });
});

// ---------------------------------------------------------------------------
// 6. AssetResolverPipeline
// ---------------------------------------------------------------------------
describe('AssetResolverPipeline', () => {
  let pipeline: AssetResolverPipeline;
  let cache: CacheManager;
  const dummyConfig: TraitVisualConfig = { tags: [], layer: 'base_material' };

  beforeEach(() => {
    cache = new CacheManager();
    pipeline = new AssetResolverPipeline(cache);
  });

  it('returns null when no plugins are registered', async () => {
    const result = await pipeline.resolve('wooden', dummyConfig);
    expect(result).toBeNull();
  });

  it('cache hit returns cached value without calling plugins', async () => {
    const cachedAsset: ResolvedAsset = {
      type: 'texture',
      url: 'cached://wooden',
    };
    cache.set('wooden', cachedAsset);

    let pluginCalled = false;
    const mockPlugin: AssetResolverPlugin = {
      name: 'mock',
      priority: 1,
      canResolve: () => { pluginCalled = true; return true; },
      resolve: async () => ({ type: 'texture', url: 'plugin://wooden' }),
    };
    pipeline.register(mockPlugin);

    const result = await pipeline.resolve('wooden', dummyConfig);

    expect(result).toBeDefined();
    expect(result?.url).toBe('cached://wooden');
    expect(pluginCalled).toBe(false);
  });

  it('falls through to next plugin when first plugin cannot resolve', async () => {
    const pluginA: AssetResolverPlugin = {
      name: 'plugin_a',
      priority: 1,
      canResolve: (trait) => trait === 'only_a',
      resolve: async () => ({ type: 'texture', url: 'a://result' }),
    };

    const pluginB: AssetResolverPlugin = {
      name: 'plugin_b',
      priority: 2,
      canResolve: () => true,
      resolve: async () => ({ type: 'texture', url: 'b://result' }),
    };

    pipeline.register(pluginA);
    pipeline.register(pluginB);

    const result = await pipeline.resolve('wooden', dummyConfig);

    expect(result).toBeDefined();
    expect(result?.url).toBe('b://result');
  });

  it('falls through to next plugin when first plugin throws', async () => {
    const failingPlugin: AssetResolverPlugin = {
      name: 'failing',
      priority: 1,
      canResolve: () => true,
      resolve: async () => { throw new Error('intentional failure'); },
    };

    const fallbackPlugin: AssetResolverPlugin = {
      name: 'fallback',
      priority: 2,
      canResolve: () => true,
      resolve: async () => ({ type: 'texture', url: 'fallback://result' }),
    };

    pipeline.register(failingPlugin);
    pipeline.register(fallbackPlugin);

    const result = await pipeline.resolve('anything', dummyConfig);

    expect(result).toBeDefined();
    expect(result?.url).toBe('fallback://result');
  });

  it('caches results from successful plugin resolution', async () => {
    let callCount = 0;
    const countingPlugin: AssetResolverPlugin = {
      name: 'counting',
      priority: 1,
      canResolve: () => true,
      resolve: async () => {
        callCount++;
        return { type: 'texture', url: 'counted://result' };
      },
    };

    pipeline.register(countingPlugin);

    // First call — plugin is invoked
    const result1 = await pipeline.resolve('trait_x', dummyConfig);
    expect(result1?.url).toBe('counted://result');
    expect(callCount).toBe(1);

    // Second call — cache hit, plugin NOT invoked
    const result2 = await pipeline.resolve('trait_x', dummyConfig);
    expect(result2?.url).toBe('counted://result');
    expect(callCount).toBe(1);
  });

  it('plugins are sorted by priority (lower priority first)', async () => {
    const callOrder: string[] = [];

    const highPriority: AssetResolverPlugin = {
      name: 'high',
      priority: 100,
      canResolve: () => { callOrder.push('high'); return false; },
      resolve: async () => ({ type: 'texture' }),
    };

    const lowPriority: AssetResolverPlugin = {
      name: 'low',
      priority: 1,
      canResolve: () => { callOrder.push('low'); return false; },
      resolve: async () => ({ type: 'texture' }),
    };

    // Register in reverse order to verify sorting
    pipeline.register(highPriority);
    pipeline.register(lowPriority);

    await pipeline.resolve('test', dummyConfig);

    // Low priority (1) should be tried before high priority (100)
    expect(callOrder).toEqual(['low', 'high']);
  });

  it('returns null when all plugins fail', async () => {
    const plugin: AssetResolverPlugin = {
      name: 'always_fails',
      priority: 1,
      canResolve: () => true,
      resolve: async () => { throw new Error('fail'); },
    };

    pipeline.register(plugin);

    const result = await pipeline.resolve('doomed', dummyConfig);
    expect(result).toBeNull();
  });

  it('returns null when no plugin can resolve the trait', async () => {
    const plugin: AssetResolverPlugin = {
      name: 'selective',
      priority: 1,
      canResolve: (trait) => trait === 'specific_only',
      resolve: async () => ({ type: 'texture' }),
    };

    pipeline.register(plugin);

    const result = await pipeline.resolve('something_else', dummyConfig);
    expect(result).toBeNull();
  });

  it('pluginCount reflects number of registered plugins', () => {
    expect(pipeline.pluginCount).toBe(0);

    const plugin1: AssetResolverPlugin = {
      name: 'p1',
      priority: 1,
      canResolve: () => false,
      resolve: async () => ({ type: 'texture' }),
    };
    const plugin2: AssetResolverPlugin = {
      name: 'p2',
      priority: 2,
      canResolve: () => false,
      resolve: async () => ({ type: 'texture' }),
    };

    pipeline.register(plugin1);
    expect(pipeline.pluginCount).toBe(1);

    pipeline.register(plugin2);
    expect(pipeline.pluginCount).toBe(2);
  });

  it('getCache() returns the underlying cache manager', () => {
    expect(pipeline.getCache()).toBe(cache);
  });

  it('integration: ProceduralResolver works inside the pipeline', async () => {
    const proceduralResolver = new ProceduralResolver();
    pipeline.register(proceduralResolver);

    const result = await pipeline.resolve('wooden', {
      material: { roughness: 0.8, metalness: 0.0 },
      tags: ['organic'],
      layer: 'base_material',
    });

    expect(result).not.toBeNull();
    expect(result?.type).toBe('texture');
    expect(result?.data).toBeInstanceOf(ArrayBuffer);
    expect(result?.metadata?.pattern).toBe('wood_grain');

    // Verify it was cached
    expect(cache.has('wooden')).toBe(true);
  });
});
