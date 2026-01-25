/**
 * @holoscript/pcg - Procedural Content Generation Types
 */

// ============================================================================
// Common Types
// ============================================================================

/** 2D Vector */
export interface Vec2 {
  x: number;
  y: number;
}

/** 3D Vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Bounding box */
export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

/** 2D Bounding box */
export interface BoundingBox2D {
  min: Vec2;
  max: Vec2;
}

// ============================================================================
// Noise Types
// ============================================================================

/** Noise type enumeration */
export enum NoiseType {
  Perlin = 'perlin',
  Simplex = 'simplex',
  Worley = 'worley',
  Value = 'value',
  White = 'white',
}

/** Noise configuration */
export interface NoiseConfig {
  type: NoiseType;
  seed: number;
  frequency: number;
  amplitude: number;
  octaves: number;
  lacunarity: number;
  persistence: number;
}

/** Default noise configuration */
export const DEFAULT_NOISE_CONFIG: NoiseConfig = {
  type: NoiseType.Perlin,
  seed: 12345,
  frequency: 1.0,
  amplitude: 1.0,
  octaves: 4,
  lacunarity: 2.0,
  persistence: 0.5,
};

// ============================================================================
// Terrain Types
// ============================================================================

/** Biome type */
export enum BiomeType {
  Ocean = 'ocean',
  Beach = 'beach',
  Plains = 'plains',
  Forest = 'forest',
  Desert = 'desert',
  Tundra = 'tundra',
  Mountain = 'mountain',
  Snow = 'snow',
  Swamp = 'swamp',
  Jungle = 'jungle',
}

/** Biome definition */
export interface BiomeDefinition {
  type: BiomeType;
  minHeight: number;
  maxHeight: number;
  minMoisture: number;
  maxMoisture: number;
  minTemperature: number;
  maxTemperature: number;
  color: string;
}

/** Terrain configuration */
export interface TerrainConfig {
  width: number;
  height: number;
  seed: number;
  heightNoise: NoiseConfig;
  moistureNoise: NoiseConfig;
  temperatureNoise: NoiseConfig;
  erosionIterations: number;
  erosionStrength: number;
}

/** Heightmap data */
export interface Heightmap {
  width: number;
  height: number;
  data: Float32Array;
  min: number;
  max: number;
}

/** Terrain point data */
export interface TerrainPoint {
  height: number;
  moisture: number;
  temperature: number;
  biome: BiomeType;
  normal: Vec3;
}

// ============================================================================
// Dungeon Types
// ============================================================================

/** Room shape */
export enum RoomShape {
  Rectangle = 'rectangle',
  Circle = 'circle',
  LShape = 'l-shape',
  TShape = 't-shape',
  Cross = 'cross',
  Irregular = 'irregular',
}

/** Room type */
export enum RoomType {
  Start = 'start',
  Normal = 'normal',
  Treasure = 'treasure',
  Boss = 'boss',
  Secret = 'secret',
  Corridor = 'corridor',
}

/** Room definition */
export interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: RoomShape;
  type: RoomType;
  connections: string[];
  doors: Vec2[];
}

/** Corridor definition */
export interface Corridor {
  id: string;
  from: string;
  to: string;
  points: Vec2[];
  width: number;
}

/** Dungeon configuration */
export interface DungeonConfig {
  width: number;
  height: number;
  seed: number;
  minRooms: number;
  maxRooms: number;
  minRoomSize: number;
  maxRoomSize: number;
  corridorWidth: number;
  algorithm: 'bsp' | 'random' | 'cellular';
  roomDensity: number;
}

/** Generated dungeon */
export interface Dungeon {
  width: number;
  height: number;
  rooms: Room[];
  corridors: Corridor[];
  tiles: DungeonTile[][];
  startRoom: string;
  bossRoom: string;
}

/** Dungeon tile type */
export enum DungeonTileType {
  Wall = 0,
  Floor = 1,
  Door = 2,
  Corridor = 3,
}

/** Dungeon tile */
export interface DungeonTile {
  type: DungeonTileType;
  roomId?: string;
  corridorId?: string;
}

// ============================================================================
// L-System Types
// ============================================================================

/** L-System rule */
export interface LSystemRule {
  predecessor: string;
  successor: string;
  probability?: number;
  condition?: (context: LSystemContext) => boolean;
}

/** L-System context for conditional rules */
export interface LSystemContext {
  iteration: number;
  position: Vec3;
  direction: Vec3;
  depth: number;
}

/** L-System configuration */
export interface LSystemConfig {
  axiom: string;
  rules: LSystemRule[];
  iterations: number;
  angle: number;
  stepLength: number;
  stepLengthScale: number;
  angleVariation: number;
  seed: number;
}

/** L-System generated segment */
export interface LSystemSegment {
  start: Vec3;
  end: Vec3;
  depth: number;
  thickness: number;
}

/** L-System generated structure */
export interface LSystemResult {
  segments: LSystemSegment[];
  leaves: Vec3[];
  bounds: BoundingBox;
}

/** Preset L-System types */
export enum LSystemPreset {
  Tree = 'tree',
  Bush = 'bush',
  Fern = 'fern',
  KochCurve = 'koch-curve',
  SierpinskiTriangle = 'sierpinski',
  DragonCurve = 'dragon-curve',
  HilbertCurve = 'hilbert-curve',
}

// ============================================================================
// Wave Function Collapse Types
// ============================================================================

/** WFC tile definition */
export interface WFCTile {
  id: string;
  name: string;
  weight: number;
  symmetry: WFCSymmetry;
  data?: unknown;
}

/** WFC symmetry type */
export enum WFCSymmetry {
  None = 'none',
  Rotate90 = 'rotate90',
  Rotate180 = 'rotate180',
  FlipX = 'flipx',
  FlipY = 'flipy',
  Full = 'full',
}

/** WFC adjacency rule */
export interface WFCAdjacency {
  tile: string;
  direction: WFCDirection;
  allowed: string[];
}

/** WFC direction */
export enum WFCDirection {
  North = 0,
  East = 1,
  South = 2,
  West = 3,
  Up = 4,
  Down = 5,
}

/** WFC configuration */
export interface WFCConfig {
  width: number;
  height: number;
  depth?: number;
  tiles: WFCTile[];
  adjacencies: WFCAdjacency[];
  seed: number;
  backtrackLimit: number;
  is3D: boolean;
}

/** WFC cell state */
export interface WFCCell {
  x: number;
  y: number;
  z: number;
  possibilities: Set<string>;
  collapsed: boolean;
  tileId?: string;
}

/** WFC result */
export interface WFCResult {
  width: number;
  height: number;
  depth: number;
  cells: WFCCell[][][];
  success: boolean;
  iterations: number;
  backtrackCount: number;
}

// ============================================================================
// Seeded Random
// ============================================================================

/** Seeded random number generator interface */
export interface SeededRandom {
  seed: number;
  next(): number;
  nextInt(min: number, max: number): number;
  nextFloat(min: number, max: number): number;
  nextBool(probability?: number): boolean;
  nextItem<T>(array: T[]): T;
  shuffle<T>(array: T[]): T[];
  nextGaussian(mean?: number, stddev?: number): number;
  reset(): void;
}
