/**
 * Trait Visual System — barrel export and auto-registration.
 *
 * Importing this module registers all preset visual configs into
 * the TraitVisualRegistry singleton, making them available to the
 * R3FCompiler and future compilers.
 */

export { TraitVisualRegistry } from './TraitVisualRegistry';
export type { TraitVisualConfig, R3FMaterialProps, VisualLayer } from './types';
export { VISUAL_LAYER_PRIORITY } from './types';

// Preset data re-exports
export { MATERIAL_PROPERTIES_VISUALS } from './presets/material-properties.visual';
export { SURFACE_TEXTURE_VISUALS } from './presets/surface-texture.visual';
export { LIGHTING_VISUALS } from './presets/lighting.visual';
export { GEMS_MINERALS_VISUALS } from './presets/gems-minerals.visual';
export { FABRIC_CLOTH_VISUALS } from './presets/fabric-cloth.visual';
export { VISUAL_EFFECTS_VISUALS } from './presets/visual-effects.visual';
export { AGE_CONDITION_VISUALS } from './presets/age-condition.visual';
export { WATER_FLUID_VISUALS } from './presets/water-fluid.visual';
export { WEATHER_PHENOMENA_VISUALS } from './presets/weather-phenomena.visual';
export { EMOTION_MOOD_VISUALS } from './presets/emotion-mood.visual';
export { SIZE_SCALE_VISUALS } from './presets/size-scale.visual';
export { ENVIRONMENTAL_BIOME_VISUALS } from './presets/environmental-biome.visual';

import { TraitVisualRegistry } from './TraitVisualRegistry';
import { MATERIAL_PROPERTIES_VISUALS } from './presets/material-properties.visual';
import { SURFACE_TEXTURE_VISUALS } from './presets/surface-texture.visual';
import { LIGHTING_VISUALS } from './presets/lighting.visual';
import { GEMS_MINERALS_VISUALS } from './presets/gems-minerals.visual';
import { FABRIC_CLOTH_VISUALS } from './presets/fabric-cloth.visual';
import { VISUAL_EFFECTS_VISUALS } from './presets/visual-effects.visual';
import { AGE_CONDITION_VISUALS } from './presets/age-condition.visual';
import { WATER_FLUID_VISUALS } from './presets/water-fluid.visual';
import { WEATHER_PHENOMENA_VISUALS } from './presets/weather-phenomena.visual';
import { EMOTION_MOOD_VISUALS } from './presets/emotion-mood.visual';
import { SIZE_SCALE_VISUALS } from './presets/size-scale.visual';
import { ENVIRONMENTAL_BIOME_VISUALS } from './presets/environmental-biome.visual';

/** All preset visual data in registration order. */
const ALL_PRESETS = [
  MATERIAL_PROPERTIES_VISUALS,
  SURFACE_TEXTURE_VISUALS,
  LIGHTING_VISUALS,
  GEMS_MINERALS_VISUALS,
  FABRIC_CLOTH_VISUALS,
  VISUAL_EFFECTS_VISUALS,
  AGE_CONDITION_VISUALS,
  WATER_FLUID_VISUALS,
  WEATHER_PHENOMENA_VISUALS,
  EMOTION_MOOD_VISUALS,
  SIZE_SCALE_VISUALS,
  ENVIRONMENTAL_BIOME_VISUALS,
];

/**
 * Register all preset visuals into the global registry.
 * Called once on module load.
 */
function registerAllPresets(): void {
  const registry = TraitVisualRegistry.getInstance();
  for (const presetMap of ALL_PRESETS) {
    registry.registerBatch(presetMap);
  }
}

// Auto-register on import
registerAllPresets();
