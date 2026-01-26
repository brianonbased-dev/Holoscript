/**
 * @holoscript/streaming
 * Asset streaming and caching system
 */

// Types
export * from './types';

// Loader
export {
  LoadQueue,
  AssetLoader,
  ProgressiveLoader,
  BundleLoader,
} from './loader';

// Cache
export {
  MemoryCache,
  IndexedDBCache,
  CacheManager,
  MemoryBudgetMonitor,
} from './cache';

// Prediction (movement prediction for preemptive loading)
export {
  MovementPredictor,
  PredictiveChunkLoader,
  createMovementPredictor,
  createPredictiveChunkLoader,
  type PredictionConfig,
  type PredictionResult,
  type ChunkInfo,
  type ChunkLoaderConfig,
} from './prediction';
