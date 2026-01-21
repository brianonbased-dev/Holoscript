/**
 * Trait Generators Index
 *
 * All 9 HoloScript VR traits mapped to VRChat/UdonSharp.
 */

export { generateGrabbable } from './grabbable.js';
export { generateThrowable } from './throwable.js';
export { generatePointable } from './pointable.js';
export { generateHoverable } from './hoverable.js';
export { generateScalable } from './scalable.js';
export { generateRotatable } from './rotatable.js';
export { generateStackable } from './stackable.js';
export { generateSnappable } from './snappable.js';
export { generateBreakable } from './breakable.js';

import type { HSPlusNode, VRTraitName } from '@holoscript/core';
import type { TraitMapping, ExportContext, TraitGenerator } from '../types.js';

import { generateGrabbable } from './grabbable.js';
import { generateThrowable } from './throwable.js';
import { generatePointable } from './pointable.js';
import { generateHoverable } from './hoverable.js';
import { generateScalable } from './scalable.js';
import { generateRotatable } from './rotatable.js';
import { generateStackable } from './stackable.js';
import { generateSnappable } from './snappable.js';
import { generateBreakable } from './breakable.js';

/**
 * Registry of all trait generators
 */
export const traitGenerators: Record<VRTraitName, TraitGenerator> = {
  grabbable: generateGrabbable,
  throwable: generateThrowable,
  pointable: generatePointable,
  hoverable: generateHoverable,
  scalable: generateScalable,
  rotatable: generateRotatable,
  stackable: generateStackable,
  snappable: generateSnappable,
  breakable: generateBreakable,
};

/**
 * Generate mappings for all traits on a node
 */
export function generateTraitMappings(
  node: HSPlusNode,
  context: ExportContext
): TraitMapping[] {
  const mappings: TraitMapping[] = [];

  if (!node.traits || node.traits.size === 0) {
    return mappings;
  }

  for (const [traitName, traitConfig] of node.traits.entries()) {
    const generator = traitGenerators[traitName];
    if (generator) {
      try {
        const mapping = generator(node, traitConfig as Record<string, unknown>, context);
        mappings.push(mapping);
      } catch (error) {
        context.errors.push({
          code: 'TRAIT_GENERATION_ERROR',
          message: `Failed to generate ${traitName} trait for ${node.id || 'unnamed'}: ${error}`,
          node,
          fatal: false,
        });
      }
    } else {
      context.warnings.push({
        code: 'UNKNOWN_TRAIT',
        message: `Unknown trait @${traitName} on ${node.id || 'unnamed'} - skipping`,
        node,
      });
    }
  }

  return mappings;
}

/**
 * Get all required VRChat features from mappings
 */
export function getRequiredFeatures(mappings: TraitMapping[]): Set<string> {
  const features = new Set<string>();

  for (const mapping of mappings) {
    for (const feature of mapping.requiredFeatures) {
      features.add(feature);
    }
  }

  return features;
}

/**
 * Get all required Unity components from mappings
 */
export function getRequiredComponents(mappings: TraitMapping[]): Set<string> {
  const components = new Set<string>();

  for (const mapping of mappings) {
    for (const component of mapping.components) {
      components.add(component);
    }
  }

  return components;
}

/**
 * Merge prefab modifications from multiple mappings
 */
export function mergePrefabModifications(
  mappings: TraitMapping[]
): Record<string, Record<string, unknown>> {
  const merged: Record<string, Record<string, unknown>> = {};

  for (const mapping of mappings) {
    if (mapping.prefabModifications) {
      for (const [component, props] of Object.entries(mapping.prefabModifications)) {
        if (!merged[component]) {
          merged[component] = {};
        }
        Object.assign(merged[component], props);
      }
    }
  }

  return merged;
}
