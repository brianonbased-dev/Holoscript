import type { R3FMaterialProps } from './types';

/**
 * Composition rules for multi-trait visual merging.
 *
 * Rules control how traits interact when multiple are applied:
 * - **requires**: Trait only applies if objects has tags from other traits
 * - **suppresses**: Trait removes listed traits from consideration
 * - **additive**: Extra properties blended on top when trait is present
 * - **multi-trait merge**: When all listed traits are present, override with merged values
 */

export type CompositionRule =
  | RequiresRule
  | SuppressesRule
  | AdditiveRule
  | MultiTraitMergeRule;

export interface RequiresRule {
  trait: string;
  requires: { tags: string[] };
}

export interface SuppressesRule {
  trait: string;
  suppresses: string[];
}

export interface AdditiveRule {
  trait: string;
  additive: Partial<R3FMaterialProps>;
}

export interface MultiTraitMergeRule {
  traits: string[];
  merge: Partial<R3FMaterialProps>;
}

/**
 * Default composition rules.
 * These handle common trait interactions and conflicts.
 */
export const COMPOSITION_RULES: CompositionRule[] = [
  // ── Requirement rules ──────────────────────────────────────────

  // Corrosion traits only apply to objects with a metallic base
  { trait: 'rusted', requires: { tags: ['metallic'] } },
  { trait: 'tarnished', requires: { tags: ['metallic'] } },
  { trait: 'corroded', requires: { tags: ['metallic'] } },

  // ── Suppression rules ──────────────────────────────────────────

  // Pristine/brand_new suppress all damage/wear states
  {
    trait: 'pristine',
    suppresses: [
      'rusted', 'worn', 'weathered', 'decayed', 'tarnished', 'corroded',
      'crumbling', 'faded', 'stained', 'scratched', 'dented', 'chipped',
      'cracked', 'shattered', 'battle_scarred', 'charred', 'tattered',
      'dust_covered', 'moss_covered', 'vine_covered',
    ],
  },
  {
    trait: 'brand_new',
    suppresses: [
      'rusted', 'worn', 'weathered', 'decayed', 'tarnished', 'corroded',
      'faded', 'stained', 'scratched', 'dented', 'chipped', 'antique',
      'dust_covered',
    ],
  },

  // Restored suppresses active decay (but not cosmetic scars)
  {
    trait: 'restored',
    suppresses: ['decayed', 'crumbling', 'corroded', 'rusted'],
  },

  // Mirrored overrides surface textures
  {
    trait: 'mirrored',
    suppresses: ['matte_surface', 'frosted_surface', 'brushed'],
  },

  // ── Additive rules ─────────────────────────────────────────────

  // Frozen adds blue tint and reduced roughness
  { trait: 'frozen_liquid', additive: { color: '#D6EAF8' } },

  // Enchanted adds a subtle purple shimmer
  { trait: 'enchanted', additive: { emissive: '#9966FF', emissiveIntensity: 0.3 } },

  // ── Multi-trait merge rules ────────────────────────────────────

  // Metallic + rusted = corroded bronze appearance
  {
    traits: ['rusted', 'iron_material'],
    merge: { color: '#6B3A1F', roughness: 0.9, metalness: 0.5 },
  },

  // Glowing + angry mood = intense red emissive
  {
    traits: ['emissive', 'angry'],
    merge: { emissive: '#FF2200', emissiveIntensity: 2.5 },
  },

  // Holographic + ghostly = spectral hologram
  {
    traits: ['holographic', 'ghostly'],
    merge: { opacity: 0.2, emissive: '#88BBFF', emissiveIntensity: 1.5 },
  },

  // Crystal + enchanted = magical crystal
  {
    traits: ['crystal_gem', 'enchanted'],
    merge: { emissive: '#CC88FF', emissiveIntensity: 1.0, iridescence: 1.0 },
  },

  // Gold + polished = high-shine gold
  {
    traits: ['gold_material', 'polished'],
    merge: { roughness: 0.05, envMapIntensity: 2.0 },
  },
];
