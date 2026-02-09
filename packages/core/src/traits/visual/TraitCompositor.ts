import type { R3FMaterialProps, TraitVisualConfig, VisualLayer } from './types';
import { VISUAL_LAYER_PRIORITY } from './types';
import { TraitVisualRegistry } from './TraitVisualRegistry';
import { COMPOSITION_RULES, type CompositionRule } from './composition-rules';

/**
 * Composes multiple trait visual configs into a single merged material.
 *
 * When an object has multiple traits (e.g., `@metallic @rusted @glowing`),
 * the compositor:
 * 1. Looks up each trait in TraitVisualRegistry
 * 2. Sorts by visual layer priority (base_material=0 → mood=8)
 * 3. Merges: later layers override earlier layers for the same property
 * 4. Applies composition rules (conflicts, suppressions, enhancements)
 *
 * @example
 * ```ts
 * const compositor = new TraitCompositor();
 * const material = compositor.compose(['metallic', 'rusted', 'glowing']);
 * // { metalness: 0.6, roughness: 0.85, color: '#8B4513', emissive: '#FFFFFF', ... }
 * ```
 */
export class TraitCompositor {
  private registry: TraitVisualRegistry;
  private rules: CompositionRule[];

  constructor(
    registry?: TraitVisualRegistry,
    rules?: CompositionRule[],
  ) {
    this.registry = registry ?? TraitVisualRegistry.getInstance();
    this.rules = rules ?? COMPOSITION_RULES;
  }

  /**
   * Compose multiple trait visuals into a single material config.
   * Returns only the properties that were explicitly set by at least one trait.
   */
  compose(traitNames: string[]): R3FMaterialProps {
    // 1. Resolve visual configs and collect tags
    const entries: Array<{ name: string; config: TraitVisualConfig; priority: number }> = [];
    const allTags = new Set<string>();

    for (const name of traitNames) {
      const config = this.registry.get(name);
      if (!config) continue;

      const layer = config.layer ?? 'visual_effect';
      const priority = VISUAL_LAYER_PRIORITY[layer];
      entries.push({ name, config, priority });

      if (config.tags) {
        for (const tag of config.tags) {
          allTags.add(tag);
        }
      }
    }

    // 2. Apply suppression rules — remove suppressed traits
    const suppressedTraits = this.getSuppressedTraits(traitNames);
    const activeEntries = entries.filter((e) => !suppressedTraits.has(e.name));

    // 3. Apply requirement rules — remove traits whose requirements aren't met
    const filteredEntries = activeEntries.filter((e) => {
      return this.meetsRequirements(e.name, allTags);
    });

    // 4. Sort by layer priority (lower = applied first, overridden by higher)
    filteredEntries.sort((a, b) => a.priority - b.priority);

    // 5. Merge material props in order
    const merged: R3FMaterialProps = {};
    for (const entry of filteredEntries) {
      if (entry.config.material) {
        Object.assign(merged, entry.config.material);
      }
      if (entry.config.emissive) {
        merged.emissive = entry.config.emissive.color;
        merged.emissiveIntensity = entry.config.emissive.intensity;
      }
      if (entry.config.opacity !== undefined) {
        merged.opacity = entry.config.opacity;
        merged.transparent = entry.config.opacity < 1;
      }
    }

    // 6. Apply additive and multi-trait merge rules
    this.applyAdditiveRules(traitNames, allTags, merged);

    return merged;
  }

  /** Get set of trait names suppressed by other active traits. */
  private getSuppressedTraits(traitNames: string[]): Set<string> {
    const suppressed = new Set<string>();
    const nameSet = new Set(traitNames);

    for (const rule of this.rules) {
      if ('suppresses' in rule && rule.suppresses && nameSet.has(rule.trait)) {
        for (const s of rule.suppresses) {
          suppressed.add(s);
        }
      }
    }

    return suppressed;
  }

  /** Check if a trait's requirement rules are satisfied. */
  private meetsRequirements(traitName: string, allTags: Set<string>): boolean {
    for (const rule of this.rules) {
      if (!('requires' in rule) || rule.trait !== traitName || !rule.requires) continue;

      if (rule.requires.tags) {
        const hasRequired = rule.requires.tags.some((tag) => allTags.has(tag));
        if (!hasRequired) return false;
      }
    }
    return true;
  }

  /** Apply additive rules and multi-trait merge overrides. */
  private applyAdditiveRules(
    traitNames: string[],
    allTags: Set<string>,
    merged: R3FMaterialProps,
  ): void {
    const nameSet = new Set(traitNames);

    for (const rule of this.rules) {
      // Additive: blend property on top of existing
      if ('additive' in rule && rule.additive && nameSet.has(rule.trait)) {
        Object.assign(merged, rule.additive);
      }

      // Multi-trait merge: requires all specified traits present
      if ('traits' in rule && rule.traits && 'merge' in rule && rule.merge) {
        const allPresent = rule.traits.every((t) => nameSet.has(t));
        if (allPresent) {
          Object.assign(merged, rule.merge);
        }
      }
    }
  }
}
