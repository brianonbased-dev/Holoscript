/**
 * @holoscript/pcg - Procedural Content Generation
 * Main entry point
 */

// Noise generators
export {
  Mulberry32,
  NoiseGenerator,
  PerlinNoise,
  SimplexNoise,
  WorleyNoise,
  ValueNoise,
  WhiteNoise,
  createNoise,
} from './noise';

// Terrain generation
export {
  TerrainGenerator,
  createTerrainGenerator,
  DEFAULT_BIOMES,
  DEFAULT_TERRAIN_CONFIG,
} from './terrain';

// Dungeon generation
export {
  DungeonGenerator,
  createDungeonGenerator,
  DEFAULT_DUNGEON_CONFIG,
} from './dungeon';

// L-System generation
export {
  LSystemGenerator,
  createLSystem,
  LSYSTEM_PRESETS,
} from './lsystem';

// Wave Function Collapse
export {
  WFCSolver,
  createWFCSolver,
  createWFCFromTileset,
  SIMPLE_TILESET,
  DEFAULT_WFC_CONFIG,
} from './wfc';

// Re-export all types
export * from './types';
