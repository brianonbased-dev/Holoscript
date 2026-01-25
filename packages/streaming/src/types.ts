/**
 * @holoscript/streaming - Type Definitions
 * Asset and world streaming system
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

// ============================================================================
// Asset Types
// ============================================================================

export enum AssetType {
  Mesh = 'mesh',
  Model = 'model',
  Texture = 'texture',
  Material = 'material',
  Audio = 'audio',
  Animation = 'animation',
  Script = 'script',
  Scene = 'scene',
  Prefab = 'prefab',
  Font = 'font',
  Shader = 'shader',
  Data = 'data',
  Binary = 'binary',
}

export enum AssetState {
  Unloaded = 'unloaded',
  Queued = 'queued',
  Loading = 'loading',
  Loaded = 'loaded',
  Failed = 'failed',
  Unloading = 'unloading',
  Error = 'error',
}

export interface AssetInfo {
  /** Asset ID */
  id: string;
  /** Asset type */
  type: AssetType;
  /** Asset URL/path */
  url: string;
  /** File size (bytes) */
  size: number;
  /** Compressed size (bytes) */
  compressedSize?: number;
  /** Content hash */
  hash?: string;
  /** Version */
  version?: number;
  /** Dependencies (other asset IDs) */
  dependencies?: string[];
  /** LOD level (0 = highest) */
  lodLevel?: number;
  /** Current state */
  state: AssetState;
  /** Priority */
  priority: LoadPriority;
  /** Reference count */
  references: number;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface LoadedAsset {
  /** Asset info */
  info: AssetInfo;
  /** Current state */
  state?: AssetState;
  /** Loaded data */
  data: unknown;
  /** Metadata */
  metadata: Record<string, unknown>;
  /** Load time (ms) */
  loadTime: number;
  /** Last access timestamp */
  lastAccess: number;
}

// ============================================================================
// Loading Types
// ============================================================================

export enum LoadPriority {
  Background = 0,
  Low = 1,
  Normal = 2,
  High = 3,
  Immediate = 4,
}

export interface LoadRequest {
  /** Asset ID */
  assetId: string;
  /** Asset URL */
  url: string;
  /** Asset type */
  type: AssetType;
  /** Load priority */
  priority: LoadPriority;
  /** Queue time */
  queueTime: number;
  /** Callback on complete */
  onComplete?: (asset: LoadedAsset | null, error?: string) => void;
  /** Callback on progress */
  onProgress?: (progress: number) => void;
  /** Cancel token */
  cancelToken?: { cancelled: boolean };
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface LoadProgress {
  /** Asset ID */
  assetId: string;
  /** Bytes loaded */
  bytesLoaded: number;
  /** Total bytes */
  bytesTotal: number;
  /** Progress (0-1) */
  progress: number;
  /** Current phase */
  phase: 'downloading' | 'parsing' | 'processing';
  /** Estimated time remaining (ms) */
  estimatedTimeRemaining: number;
}

export interface LoaderConfig {
  /** Max concurrent downloads */
  maxConcurrentDownloads: number;
  /** Max concurrent processing */
  maxConcurrentProcessing: number;
  /** Request timeout (ms) */
  timeout: number;
  /** Retry count */
  retryCount: number;
  /** Retry delay (ms) */
  retryDelay: number;
  /** Enable compression */
  enableCompression: boolean;
  /** Base URL for assets */
  baseUrl: string;
  /** Custom fetch options */
  fetchOptions?: RequestInit;
}

// ============================================================================
// Cache Types
// ============================================================================

export enum CacheLayer {
  /** In-memory cache */
  Memory = 'memory',
  /** IndexedDB cache */
  IndexedDB = 'indexeddb',
  /** Cache API (Service Worker) */
  CacheAPI = 'cache_api',
  /** File system (Node.js) */
  FileSystem = 'file_system',
}

export enum EvictionPolicy {
  LRU = 'lru',
  LFU = 'lfu',
  FIFO = 'fifo',
  Size = 'size',
  Priority = 'priority',
}

export interface CacheConfig {
  /** Enabled cache layers */
  layers: CacheLayer[];
  /** Memory cache size limit (bytes) */
  memorySizeLimit: number;
  /** Persistent cache size limit (bytes) */
  persistentSizeLimit: number;
  /** TTL for unused assets (ms) */
  ttl: number;
  /** Eviction policy */
  evictionPolicy: EvictionPolicy;
  /** Enable preloading */
  enablePreloading: boolean;
  /** Preload distance (world units) */
  preloadDistance: number;
  /** Enable persistence */
  enablePersistence: boolean;
}

export interface CacheStats {
  /** Total items in memory */
  memoryItems: number;
  /** Memory usage (bytes) */
  memoryUsage: number;
  /** Total items in persistent cache */
  persistentItems: number;
  /** Persistent storage usage (bytes) */
  persistentUsage: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit ratio (0-1) */
  hitRatio: number;
  /** Evictions */
  evictions: number;
}

export interface CacheEntry {
  /** Cache key */
  key: string;
  /** Loaded asset */
  asset: LoadedAsset;
  /** Cache layer */
  layer: CacheLayer;
  /** Size (bytes) */
  size: number;
  /** Last access time */
  lastAccess: number;
  /** Access count */
  accessCount: number;
  /** Expires at */
  expires?: number;
}

// ============================================================================
// Streaming Tile Types
// ============================================================================

export interface StreamingTile {
  /** Tile ID */
  id: string;
  /** Tile bounds */
  bounds: BoundingBox;
  /** LOD levels (asset IDs per level) */
  lodLevels: string[][];
  /** Current loaded level (-1 = unloaded) */
  loadedLevel: number;
  /** Is loading */
  isLoading: boolean;
  /** Priority */
  priority: number;
  /** Distance from camera */
  distance: number;
  /** Objects in tile */
  objectCount: number;
}

export interface StreamingGrid {
  /** Grid cell size */
  cellSize: number;
  /** Grid dimensions */
  dimensions: { x: number; y: number; z: number };
  /** Grid origin */
  origin: Vec3;
  /** Tiles */
  tiles: Map<string, StreamingTile>;
}

export interface StreamingConfig {
  /** Enable streaming */
  enabled: boolean;
  /** Base load distance */
  loadDistance: number;
  /** Unload distance */
  unloadDistance: number;
  /** LOD distances */
  lodDistances: number[];
  /** Max tiles loading at once */
  maxLoadingTiles: number;
  /** Update interval (ms) */
  updateInterval: number;
  /** Preload behind camera */
  preloadBehind: boolean;
  /** Behind camera load ratio */
  behindLoadRatio: number;
}

// ============================================================================
// Progressive Loading
// ============================================================================

export interface ProgressiveConfig {
  /** Enable progressive loading */
  enabled: boolean;
  /** Initial quality (0-1) */
  initialQuality: number;
  /** Quality increase rate per second */
  qualityIncreaseRate: number;
  /** Priority radius (load high quality close) */
  priorityRadius: number;
  /** Enable texture streaming */
  textureStreaming: boolean;
  /** Texture mip bias */
  textureMipBias: number;
}

export interface ProgressiveAsset {
  /** Asset ID */
  assetId: string;
  /** Current quality level */
  currentQuality: number;
  /** Target quality level */
  targetQuality: number;
  /** Available quality levels */
  qualityLevels: number[];
  /** Is transitioning */
  isTransitioning: boolean;
}

// ============================================================================
// Bundle Types
// ============================================================================

export interface AssetBundle {
  /** Bundle ID */
  id: string;
  /** Assets in bundle */
  assets: AssetInfo[];
  /** Dependencies (other bundle IDs) */
  dependencies: string[];
  /** Total size (bytes) */
  totalSize: number;
  /** Loaded size (bytes) */
  loadedSize: number;
  /** Is fully loaded */
  isLoaded: boolean;
}

export interface BundleManifest {
  /** Manifest ID */
  id: string;
  /** Manifest version */
  version: number;
  /** Created timestamp */
  createdAt: number;
  /** Bundles */
  bundles: Array<{
    id: string;
    assets: AssetInfo[];
    dependencies: string[];
  }>;
  /** Asset to bundle mapping */
  assetBundleMap: Record<string, string>;
}

// ============================================================================
// Events
// ============================================================================

export type StreamingEvent =
  | { type: 'asset_queued'; assetId: string }
  | { type: 'asset_loading'; assetId: string }
  | { type: 'asset_load_started'; assetId: string; priority: LoadPriority }
  | { type: 'asset_load_progress'; assetId: string; progress: number }
  | { type: 'asset_loaded'; assetId: string; asset: LoadedAsset }
  | { type: 'asset_load_failed'; assetId: string; error: string }
  | { type: 'asset_error'; assetId: string; error: string }
  | { type: 'asset_unloaded'; assetId: string }
  | { type: 'tile_load_started'; tileId: string; level: number }
  | { type: 'tile_loaded'; tileId: string; level: number }
  | { type: 'tile_unloaded'; tileId: string }
  | { type: 'cache_set'; key: string; layer: CacheLayer }
  | { type: 'cache_hit'; key: string; layer: CacheLayer }
  | { type: 'cache_miss'; key: string }
  | { type: 'cache_evict'; key: string; layer: CacheLayer }
  | { type: 'cache_evicted'; assetId: string; layer: CacheLayer }
  | { type: 'cache_clear'; layer: CacheLayer }
  | { type: 'memory_warning'; category: string; usage: number }
  | { type: 'memory_critical'; category: string; usage: number }
  | { type: 'manifest_loaded'; manifestId: string }
  | { type: 'manifest_error'; url: string; error: string }
  | { type: 'bundle_loaded'; bundleId: string }
  | { type: 'bundle_unloaded'; bundleId: string }
  | { type: 'bundle_error'; bundleId: string; error: string }
  | { type: 'progressive_level_loaded'; assetId: string; level: number; totalLevels: number }
  | { type: 'quality_changed'; assetId: string; oldQuality: number; newQuality: number };

export type StreamingEventHandler = (event: StreamingEvent) => void;

// ============================================================================
// Config Defaults
// ============================================================================

export const DEFAULT_LOADER_CONFIG: LoaderConfig = {
  maxConcurrentDownloads: 4,
  maxConcurrentProcessing: 2,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
  enableCompression: true,
  baseUrl: '',
};

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  layers: [CacheLayer.Memory, CacheLayer.IndexedDB],
  memorySizeLimit: 256 * 1024 * 1024, // 256 MB
  persistentSizeLimit: 1024 * 1024 * 1024, // 1 GB
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  evictionPolicy: EvictionPolicy.LRU,
  enablePreloading: true,
  preloadDistance: 50,
  enablePersistence: true,
};

export const DEFAULT_STREAMING_CONFIG: StreamingConfig = {
  enabled: true,
  loadDistance: 100,
  unloadDistance: 150,
  lodDistances: [20, 50, 100],
  maxLoadingTiles: 4,
  updateInterval: 100,
  preloadBehind: true,
  behindLoadRatio: 0.5,
};

export const DEFAULT_PROGRESSIVE_CONFIG: ProgressiveConfig = {
  enabled: true,
  initialQuality: 0.25,
  qualityIncreaseRate: 0.5,
  priorityRadius: 10,
  textureStreaming: true,
  textureMipBias: 0,
};

// ============================================================================
// Utilities
// ============================================================================

export interface DownloadBandwidth {
  /** Current bandwidth (bytes/sec) */
  current: number;
  /** Average bandwidth (bytes/sec) */
  average: number;
  /** Peak bandwidth (bytes/sec) */
  peak: number;
  /** Sample count */
  samples: number;
}

export interface MemoryBudget {
  /** Texture memory budget (bytes) */
  textureMemory: number;
  /** Geometry memory budget (bytes) */
  geometryMemory: number;
  /** Audio memory budget (bytes) */
  audioMemory: number;
  /** Total memory budget (bytes) */
  totalMemory: number;
  /** Warning threshold (0-1) */
  warningThreshold: number;
  /** Critical threshold (0-1) */
  criticalThreshold: number;
}

export const DEFAULT_MEMORY_BUDGET: MemoryBudget = {
  textureMemory: 256 * 1024 * 1024,  // 256 MB
  geometryMemory: 128 * 1024 * 1024, // 128 MB
  audioMemory: 64 * 1024 * 1024,     // 64 MB
  totalMemory: 512 * 1024 * 1024,    // 512 MB
  warningThreshold: 0.8,
  criticalThreshold: 0.95,
};
