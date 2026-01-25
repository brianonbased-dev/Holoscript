/**
 * @holoscript/lod - Type Definitions
 * Level of Detail system for VR performance optimization
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Vec3;
  max: Vec3;
}

export interface BoundingSphere {
  center: Vec3;
  radius: number;
}

export interface Frustum {
  planes: FrustumPlane[];
}

export interface FrustumPlane {
  normal: Vec3;
  distance: number;
}

// ============================================================================
// LOD Level Types
// ============================================================================

export enum LODSelectionMode {
  /** Distance from camera */
  Distance = 'distance',
  /** Screen-space coverage */
  ScreenSize = 'screen_size',
  /** Performance-adaptive */
  Adaptive = 'adaptive',
  /** Manual control */
  Manual = 'manual',
}

export interface LODLevel {
  /** Level index (0 = highest detail) */
  index: number;
  /** Distance threshold (max distance for this level) */
  distance: number;
  /** Screen coverage threshold (0-1) */
  screenCoverage?: number;
  /** Triangle count estimate */
  triangleCount?: number;
  /** Custom mesh/model reference */
  meshRef?: string;
  /** Render layers to enable */
  layers?: string[];
  /** Custom data */
  metadata?: Record<string, unknown>;
}

export interface LODGroup {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** World position */
  position: Vec3;
  /** Bounding sphere for culling */
  bounds: BoundingSphere;
  /** LOD levels (sorted by distance, ascending) */
  levels: LODLevel[];
  /** Current active level index */
  currentLevel: number;
  /** Selection mode */
  mode: LODSelectionMode;
  /** LOD bias (multiply distances) */
  lodBias: number;
  /** Is currently visible */
  isVisible: boolean;
  /** Fade transition duration (ms) */
  fadeTime: number;
  /** Force specific level (-1 = auto) */
  forcedLevel: number;
}

// ============================================================================
// Mesh Simplification Types
// ============================================================================

export interface SimplificationConfig {
  /** Target triangle ratio (0-1) */
  targetRatio: number;
  /** Maximum error threshold */
  maxError: number;
  /** Preserve UV seams */
  preserveUVSeams: boolean;
  /** Preserve material boundaries */
  preserveMaterials: boolean;
  /** Lock boundary vertices */
  lockBoundary: boolean;
  /** Vertex attribute weights */
  attributeWeights: {
    position: number;
    normal: number;
    uv: number;
    color: number;
  };
}

export interface SimplificationResult {
  /** Original triangle count */
  originalTriangles: number;
  /** Resulting triangle count */
  resultTriangles: number;
  /** Actual reduction ratio */
  reductionRatio: number;
  /** Quality metric (0-1) */
  quality: number;
  /** Processing time (ms) */
  processingTime: number;
}

// ============================================================================
// Culling Types
// ============================================================================

export enum CullingMode {
  /** No culling */
  None = 'none',
  /** View frustum culling */
  Frustum = 'frustum',
  /** Occlusion culling */
  Occlusion = 'occlusion',
  /** Distance-based culling */
  Distance = 'distance',
  /** Combined frustum + occlusion */
  Full = 'full',
}

export interface CullingConfig {
  /** Culling mode */
  mode: CullingMode;
  /** Maximum visible distance */
  maxDistance: number;
  /** Enable per-object frustum culling */
  frustumCulling: boolean;
  /** Enable occlusion culling */
  occlusionCulling: boolean;
  /** Occlusion buffer resolution */
  occlusionResolution: number;
  /** Conservative rasterization for occlusion */
  conservativeOcclusion: boolean;
  /** Small object culling threshold (screen pixels) */
  smallObjectThreshold: number;
}

export interface CullableObject {
  /** Unique identifier */
  id: string;
  /** World position */
  position: Vec3;
  /** Bounding sphere */
  bounds: BoundingSphere;
  /** Is static (for occlusion query optimization) */
  isStatic: boolean;
  /** Culling layers */
  layers: number;
  /** Last visibility frame */
  lastVisibleFrame: number;
  /** Is occluder (blocks visibility) */
  isOccluder: boolean;
  /** Occlusion priority (higher = checked first) */
  occlusionPriority: number;
}

export interface CullingResult {
  /** Visible object IDs */
  visible: string[];
  /** Culled object IDs */
  culled: string[];
  /** Frustum culled count */
  frustumCulled: number;
  /** Occlusion culled count */
  occlusionCulled: number;
  /** Distance culled count */
  distanceCulled: number;
  /** Small object culled count */
  smallObjectCulled: number;
  /** Processing time (ms) */
  processingTime: number;
}

// ============================================================================
// Streaming / Loading Types
// ============================================================================

export interface StreamingConfig {
  /** Enable streaming */
  enabled: boolean;
  /** Maximum concurrent loads */
  maxConcurrentLoads: number;
  /** Memory budget (MB) */
  memoryBudget: number;
  /** Preload distance */
  preloadDistance: number;
  /** Unload distance (farther than max LOD) */
  unloadDistance: number;
  /** Priority decay per second */
  priorityDecay: number;
}

export interface StreamingTile {
  /** Tile ID */
  id: string;
  /** Tile bounds */
  bounds: BoundingBox;
  /** LOD levels available */
  lodLevels: number[];
  /** Current loaded level (-1 = unloaded) */
  loadedLevel: number;
  /** Is loading */
  isLoading: boolean;
  /** Load priority */
  priority: number;
  /** Last access time */
  lastAccessTime: number;
  /** Memory usage (bytes) */
  memoryUsage: number;
}

export interface StreamingStats {
  /** Total tiles */
  totalTiles: number;
  /** Loaded tiles */
  loadedTiles: number;
  /** Loading tiles */
  loadingTiles: number;
  /** Memory used (MB) */
  memoryUsed: number;
  /** Memory budget (MB) */
  memoryBudget: number;
  /** Tiles loaded this frame */
  tilesLoadedThisFrame: number;
  /** Tiles unloaded this frame */
  tilesUnloadedThisFrame: number;
}

// ============================================================================
// Impostors (Billboard LOD)
// ============================================================================

export interface ImpostorConfig {
  /** Atlas texture size */
  atlasSize: number;
  /** Number of view angles */
  viewAngleCount: number;
  /** Distance to switch to impostor */
  switchDistance: number;
  /** Fade blend range */
  fadeRange: number;
  /** Update frequency for dynamic objects */
  updateFrequency: number;
  /** Use octahedral mapping */
  octahedralMapping: boolean;
}

export interface Impostor {
  /** Source object ID */
  sourceId: string;
  /** Atlas UV coordinates */
  atlasRegion: { x: number; y: number; width: number; height: number };
  /** View direction to atlas index mapping */
  viewIndexes: Map<number, number>;
  /** Is impostor active */
  isActive: boolean;
  /** Last update frame */
  lastUpdateFrame: number;
}

// ============================================================================
// HLOD (Hierarchical LOD)
// ============================================================================

export interface HLODNode {
  /** Node ID */
  id: string;
  /** Parent node ID */
  parentId: string | null;
  /** Child node IDs */
  childIds: string[];
  /** Bounding box */
  bounds: BoundingBox;
  /** Merged mesh for distant view */
  mergedMeshRef?: string;
  /** Switch distance */
  switchDistance: number;
  /** Is using merged representation */
  isMerged: boolean;
  /** Original object IDs contained */
  containedObjects: string[];
}

export interface HLODTree {
  /** Root node ID */
  rootId: string;
  /** All nodes */
  nodes: Map<string, HLODNode>;
  /** Max depth */
  maxDepth: number;
  /** Total objects */
  totalObjects: number;
}

// ============================================================================
// Events
// ============================================================================

export type LODEvent =
  | { type: 'level_changed'; groupId: string; previousLevel: number; newLevel: number }
  | { type: 'object_culled'; objectId: string; reason: 'frustum' | 'occlusion' | 'distance' | 'small' }
  | { type: 'object_visible'; objectId: string }
  | { type: 'tile_loaded'; tileId: string; level: number }
  | { type: 'tile_unloaded'; tileId: string }
  | { type: 'memory_warning'; used: number; budget: number }
  | { type: 'impostor_created'; objectId: string }
  | { type: 'hlod_switch'; nodeId: string; isMerged: boolean };

export type LODEventHandler = (event: LODEvent) => void;

// ============================================================================
// Manager Config
// ============================================================================

export interface LODManagerConfig {
  /** LOD selection mode */
  selectionMode: LODSelectionMode;
  /** Global LOD bias */
  globalLodBias: number;
  /** Culling configuration */
  culling: CullingConfig;
  /** Streaming configuration */
  streaming: StreamingConfig;
  /** Enable impostors */
  enableImpostors: boolean;
  /** Impostor configuration */
  impostors?: ImpostorConfig;
  /** Enable HLOD */
  enableHLOD: boolean;
  /** Update budget (ms per frame) */
  updateBudget: number;
  /** Reference screen height for screen-size LOD */
  referenceScreenHeight: number;
}

export const DEFAULT_LOD_MANAGER_CONFIG: LODManagerConfig = {
  selectionMode: LODSelectionMode.Distance,
  globalLodBias: 1.0,
  culling: {
    mode: CullingMode.Frustum,
    maxDistance: 1000,
    frustumCulling: true,
    occlusionCulling: false,
    occlusionResolution: 256,
    conservativeOcclusion: true,
    smallObjectThreshold: 4,
  },
  streaming: {
    enabled: false,
    maxConcurrentLoads: 4,
    memoryBudget: 512,
    preloadDistance: 50,
    unloadDistance: 150,
    priorityDecay: 0.1,
  },
  enableImpostors: false,
  enableHLOD: false,
  updateBudget: 2,
  referenceScreenHeight: 1080,
};

// ============================================================================
// Presets
// ============================================================================

export const LOD_DISTANCE_PRESETS = {
  /** Close-up objects (characters, items) */
  close: [
    { index: 0, distance: 5, triangleCount: 10000 },
    { index: 1, distance: 15, triangleCount: 2500 },
    { index: 2, distance: 30, triangleCount: 500 },
    { index: 3, distance: 60, triangleCount: 100 },
  ],
  /** Medium objects (furniture, props) */
  medium: [
    { index: 0, distance: 10, triangleCount: 5000 },
    { index: 1, distance: 30, triangleCount: 1000 },
    { index: 2, distance: 60, triangleCount: 200 },
  ],
  /** Large objects (buildings, terrain) */
  large: [
    { index: 0, distance: 50, triangleCount: 20000 },
    { index: 1, distance: 150, triangleCount: 5000 },
    { index: 2, distance: 300, triangleCount: 1000 },
    { index: 3, distance: 500, triangleCount: 200 },
  ],
  /** Background (skybox elements, distant mountains) */
  background: [
    { index: 0, distance: 200, triangleCount: 2000 },
    { index: 1, distance: 500, triangleCount: 500 },
  ],
} as const;

export const SIMPLIFICATION_PRESETS: Record<string, SimplificationConfig> = {
  quality: {
    targetRatio: 0.5,
    maxError: 0.001,
    preserveUVSeams: true,
    preserveMaterials: true,
    lockBoundary: true,
    attributeWeights: { position: 1.0, normal: 0.5, uv: 0.3, color: 0.1 },
  },
  balanced: {
    targetRatio: 0.25,
    maxError: 0.005,
    preserveUVSeams: true,
    preserveMaterials: true,
    lockBoundary: false,
    attributeWeights: { position: 1.0, normal: 0.3, uv: 0.2, color: 0.05 },
  },
  aggressive: {
    targetRatio: 0.1,
    maxError: 0.02,
    preserveUVSeams: false,
    preserveMaterials: false,
    lockBoundary: false,
    attributeWeights: { position: 1.0, normal: 0.1, uv: 0.05, color: 0.0 },
  },
};
