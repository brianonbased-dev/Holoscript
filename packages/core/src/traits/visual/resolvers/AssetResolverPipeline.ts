import type { TraitVisualConfig } from '../types';
import type { AssetResolverPlugin, ResolvedAsset } from './types';
import { CacheManager } from './CacheManager';

/**
 * Orchestrates multiple asset resolvers in priority order.
 *
 * Resolution pipeline:
 * 1. Check cache → return immediately if hit
 * 2. Try each registered plugin in priority order (lower = first)
 * 3. Cache the result on success
 * 4. Return null if all resolvers fail → caller falls back to PBR values
 */
export class AssetResolverPipeline {
  private plugins: AssetResolverPlugin[] = [];
  private cache: CacheManager;

  constructor(cache?: CacheManager) {
    this.cache = cache ?? new CacheManager();
  }

  /** Register a resolver plugin. Plugins are sorted by priority. */
  register(plugin: AssetResolverPlugin): void {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Attempt to resolve an asset for the given trait.
   *
   * @returns Resolved asset, or null if no resolver could handle it.
   */
  async resolve(
    trait: string,
    config: TraitVisualConfig,
  ): Promise<ResolvedAsset | null> {
    // 1. Cache hit
    const cached = this.cache.get(trait);
    if (cached) return cached;

    // 2. Try plugins in priority order
    for (const plugin of this.plugins) {
      if (!plugin.canResolve(trait, config)) continue;

      try {
        const result = await plugin.resolve(trait, config);
        // 3. Cache on success
        this.cache.set(trait, result);
        return result;
      } catch {
        // Plugin failed — try next
        continue;
      }
    }

    // 4. No resolver could handle this trait
    return null;
  }

  /** Get the cache manager (for stats/clearing). */
  getCache(): CacheManager {
    return this.cache;
  }

  /** Number of registered plugins. */
  get pluginCount(): number {
    return this.plugins.length;
  }
}
