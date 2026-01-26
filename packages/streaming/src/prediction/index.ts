/**
 * @holoscript/streaming - Predictive Loading
 * Movement prediction and preemptive asset loading for seamless streaming
 * 
 * Goals:
 * - Predict player position 1-2 seconds ahead
 * - Pre-decompress assets in background threads
 * - Achieve 99%+ invisible loading
 */

// ============================================================================
// Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface PredictionConfig {
  /** How far ahead to predict (seconds) */
  predictionHorizonSeconds: number;
  /** How often to update predictions (Hz) */
  updateRateHz: number;
  /** Minimum confidence to act on prediction */
  minConfidence: number;
  /** Enable path-based prediction (uses navmesh) */
  usePathPrediction: boolean;
  /** Velocity smoothing factor (0-1) */
  velocitySmoothing: number;
  /** Acceleration weight for prediction */
  accelerationWeight: number;
}

const DEFAULT_PREDICTION_CONFIG: PredictionConfig = {
  predictionHorizonSeconds: 1.5,
  updateRateHz: 10,
  minConfidence: 0.6,
  usePathPrediction: false,
  velocitySmoothing: 0.3,
  accelerationWeight: 0.5,
};

interface PositionSample {
  position: Vec3;
  velocity: Vec3;
  timestamp: number;
}

export interface PredictionResult {
  position: Vec3;
  confidence: number;
  radius: number; // Uncertainty radius
  timestamp: number;
}

// ============================================================================
// Movement Predictor
// ============================================================================

export class MovementPredictor {
  private samples: PositionSample[] = [];
  private config: PredictionConfig;
  private smoothedVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  private smoothedAcceleration: Vec3 = { x: 0, y: 0, z: 0 };
  
  constructor(config: Partial<PredictionConfig> = {}) {
    this.config = { ...DEFAULT_PREDICTION_CONFIG, ...config };
  }
  
  /**
   * Add a position sample from tracking
   */
  addSample(position: Vec3, timestamp: number = Date.now()): void {
    // Calculate velocity from last sample
    let velocity: Vec3 = { x: 0, y: 0, z: 0 };
    
    if (this.samples.length > 0) {
      const last = this.samples[this.samples.length - 1];
      const dt = (timestamp - last.timestamp) / 1000;
      
      if (dt > 0 && dt < 1) {
        velocity = {
          x: (position.x - last.position.x) / dt,
          y: (position.y - last.position.y) / dt,
          z: (position.z - last.position.z) / dt,
        };
        
        // Calculate acceleration
        const accel = {
          x: (velocity.x - last.velocity.x) / dt,
          y: (velocity.y - last.velocity.y) / dt,
          z: (velocity.z - last.velocity.z) / dt,
        };
        
        // Smooth acceleration
        const smooth = this.config.velocitySmoothing;
        this.smoothedAcceleration = {
          x: this.smoothedAcceleration.x * (1 - smooth) + accel.x * smooth,
          y: this.smoothedAcceleration.y * (1 - smooth) + accel.y * smooth,
          z: this.smoothedAcceleration.z * (1 - smooth) + accel.z * smooth,
        };
      }
    }
    
    // Smooth velocity
    const smooth = this.config.velocitySmoothing;
    this.smoothedVelocity = {
      x: this.smoothedVelocity.x * (1 - smooth) + velocity.x * smooth,
      y: this.smoothedVelocity.y * (1 - smooth) + velocity.y * smooth,
      z: this.smoothedVelocity.z * (1 - smooth) + velocity.z * smooth,
    };
    
    this.samples.push({ position, velocity, timestamp });
    
    // Keep only last 2 seconds of samples
    const cutoff = timestamp - 2000;
    this.samples = this.samples.filter(s => s.timestamp > cutoff);
  }
  
  /**
   * Predict position at a future time
   */
  predict(secondsAhead: number = this.config.predictionHorizonSeconds): PredictionResult {
    if (this.samples.length < 3) {
      const pos = this.samples.length > 0 
        ? this.samples[this.samples.length - 1].position 
        : { x: 0, y: 0, z: 0 };
      return {
        position: pos,
        confidence: 0.1,
        radius: 10,
        timestamp: Date.now() + secondsAhead * 1000,
      };
    }
    
    const current = this.samples[this.samples.length - 1];
    
    // Physics-based prediction with acceleration
    const t = secondsAhead;
    const a = this.config.accelerationWeight;
    
    const predicted: Vec3 = {
      x: current.position.x + 
         this.smoothedVelocity.x * t + 
         0.5 * this.smoothedAcceleration.x * t * t * a,
      y: current.position.y + 
         this.smoothedVelocity.y * t + 
         0.5 * this.smoothedAcceleration.y * t * t * a,
      z: current.position.z + 
         this.smoothedVelocity.z * t + 
         0.5 * this.smoothedAcceleration.z * t * t * a,
    };
    
    // Calculate confidence based on velocity consistency
    const confidence = this.calculateConfidence();
    
    // Uncertainty radius grows with time
    const speed = Math.sqrt(
      this.smoothedVelocity.x ** 2 + 
      this.smoothedVelocity.y ** 2 + 
      this.smoothedVelocity.z ** 2
    );
    const radius = Math.max(2, speed * t * (1 - confidence));
    
    return {
      position: predicted,
      confidence,
      radius,
      timestamp: Date.now() + secondsAhead * 1000,
    };
  }
  
  /**
   * Get multiple prediction points (for loading multiple chunks)
   */
  predictPath(
    count: number = 5,
    maxSeconds: number = this.config.predictionHorizonSeconds
  ): PredictionResult[] {
    const results: PredictionResult[] = [];
    
    for (let i = 1; i <= count; i++) {
      const t = (i / count) * maxSeconds;
      results.push(this.predict(t));
    }
    
    return results;
  }
  
  private calculateConfidence(): number {
    if (this.samples.length < 5) return 0.3;
    
    // Check velocity consistency
    const recent = this.samples.slice(-5);
    const velocities = recent.map(s => s.velocity);
    
    // Calculate variance
    const avgVel = {
      x: velocities.reduce((sum, v) => sum + v.x, 0) / velocities.length,
      y: velocities.reduce((sum, v) => sum + v.y, 0) / velocities.length,
      z: velocities.reduce((sum, v) => sum + v.z, 0) / velocities.length,
    };
    
    let variance = 0;
    for (const v of velocities) {
      variance += (v.x - avgVel.x) ** 2 + (v.y - avgVel.y) ** 2 + (v.z - avgVel.z) ** 2;
    }
    variance /= velocities.length;
    
    // Lower variance = higher confidence
    return Math.max(0.3, Math.min(0.95, 1 - Math.sqrt(variance) / 5));
  }
  
  /**
   * Get current movement direction (normalized)
   */
  getDirection(): Vec3 {
    const magnitude = Math.sqrt(
      this.smoothedVelocity.x ** 2 + 
      this.smoothedVelocity.y ** 2 + 
      this.smoothedVelocity.z ** 2
    );
    
    if (magnitude < 0.01) {
      return { x: 0, y: 0, z: 1 };
    }
    
    return {
      x: this.smoothedVelocity.x / magnitude,
      y: this.smoothedVelocity.y / magnitude,
      z: this.smoothedVelocity.z / magnitude,
    };
  }
  
  /**
   * Get current speed
   */
  getSpeed(): number {
    return Math.sqrt(
      this.smoothedVelocity.x ** 2 + 
      this.smoothedVelocity.y ** 2 + 
      this.smoothedVelocity.z ** 2
    );
  }
}

// ============================================================================
// Predictive Chunk Loader
// ============================================================================

export interface ChunkInfo {
  id: string;
  x: number;
  z: number;
  priority: number;
  state: 'unloaded' | 'loading' | 'decompressing' | 'uploading' | 'ready';
}

export interface ChunkLoaderConfig {
  chunkSize: number;
  loadRadius: number;
  preloadRadius: number;
  maxConcurrentLoads: number;
  maxConcurrentDecompress: number;
  priorityBoostForPredicted: number;
}

const DEFAULT_CHUNK_LOADER_CONFIG: ChunkLoaderConfig = {
  chunkSize: 50,
  loadRadius: 3,
  preloadRadius: 5,
  maxConcurrentLoads: 4,
  maxConcurrentDecompress: 2,
  priorityBoostForPredicted: 2.0,
};

export class PredictiveChunkLoader {
  private config: ChunkLoaderConfig;
  private predictor: MovementPredictor;
  private chunks: Map<string, ChunkInfo> = new Map();
  private loadQueue: string[] = [];
  private decompressQueue: string[] = [];
  private activeLoads: Set<string> = new Set();
  private activeDecompress: Set<string> = new Set();
  
  // Callbacks
  private loadCallback?: (chunkId: string) => Promise<ArrayBuffer>;
  private decompressCallback?: (data: ArrayBuffer) => Promise<unknown>;
  private uploadCallback?: (chunkId: string, data: unknown) => Promise<void>;
  
  constructor(
    predictor: MovementPredictor,
    config: Partial<ChunkLoaderConfig> = {}
  ) {
    this.config = { ...DEFAULT_CHUNK_LOADER_CONFIG, ...config };
    this.predictor = predictor;
  }
  
  /**
   * Set loading callbacks
   */
  setCallbacks(callbacks: {
    load: (chunkId: string) => Promise<ArrayBuffer>;
    decompress: (data: ArrayBuffer) => Promise<unknown>;
    upload: (chunkId: string, data: unknown) => Promise<void>;
  }): void {
    this.loadCallback = callbacks.load;
    this.decompressCallback = callbacks.decompress;
    this.uploadCallback = callbacks.upload;
  }
  
  /**
   * Update loading priorities based on current position
   */
  update(currentPosition: Vec3): void {
    // Get predictions
    const predictions = this.predictor.predictPath(5, 2.0);
    
    // Find chunks that should be loaded
    const requiredChunks = this.getRequiredChunks(currentPosition, predictions);
    
    // Prioritize and queue
    this.queueChunks(requiredChunks, currentPosition, predictions);
    
    // Process queues
    this.processLoadQueue();
    this.processDecompressQueue();
    
    // Unload distant chunks
    this.unloadDistantChunks(currentPosition);
  }
  
  private getRequiredChunks(
    currentPosition: Vec3,
    predictions: PredictionResult[]
  ): string[] {
    const chunks: Set<string> = new Set();
    const { chunkSize, loadRadius, preloadRadius } = this.config;
    
    // Current position chunks
    const cx = Math.floor(currentPosition.x / chunkSize);
    const cz = Math.floor(currentPosition.z / chunkSize);
    
    for (let x = cx - loadRadius; x <= cx + loadRadius; x++) {
      for (let z = cz - loadRadius; z <= cz + loadRadius; z++) {
        chunks.add(`${x},${z}`);
      }
    }
    
    // Predicted position chunks (with uncertainty)
    for (const pred of predictions) {
      if (pred.confidence < 0.4) continue;
      
      const px = Math.floor(pred.position.x / chunkSize);
      const pz = Math.floor(pred.position.z / chunkSize);
      
      // Load chunks within prediction uncertainty radius
      const chunkRadius = Math.ceil(pred.radius / chunkSize);
      
      for (let x = px - chunkRadius; x <= px + chunkRadius; x++) {
        for (let z = pz - chunkRadius; z <= pz + chunkRadius; z++) {
          chunks.add(`${x},${z}`);
        }
      }
    }
    
    return Array.from(chunks);
  }
  
  private queueChunks(
    chunkIds: string[],
    currentPosition: Vec3,
    predictions: PredictionResult[]
  ): void {
    const { chunkSize, priorityBoostForPredicted } = this.config;
    
    for (const chunkId of chunkIds) {
      let chunk = this.chunks.get(chunkId);
      
      if (!chunk) {
        const [x, z] = chunkId.split(',').map(Number);
        chunk = {
          id: chunkId,
          x,
          z,
          priority: 0,
          state: 'unloaded',
        };
        this.chunks.set(chunkId, chunk);
      }
      
      if (chunk.state !== 'unloaded') continue;
      
      // Calculate priority
      const chunkCenterX = (chunk.x + 0.5) * chunkSize;
      const chunkCenterZ = (chunk.z + 0.5) * chunkSize;
      
      const distToCurrent = Math.sqrt(
        (chunkCenterX - currentPosition.x) ** 2 +
        (chunkCenterZ - currentPosition.z) ** 2
      );
      
      // Base priority (closer = higher)
      let priority = 1000 / (distToCurrent + 1);
      
      // Boost if in predicted path
      for (const pred of predictions) {
        const distToPredicted = Math.sqrt(
          (chunkCenterX - pred.position.x) ** 2 +
          (chunkCenterZ - pred.position.z) ** 2
        );
        
        if (distToPredicted < pred.radius * 1.5) {
          priority *= priorityBoostForPredicted * pred.confidence;
          break;
        }
      }
      
      // Boost if in movement direction
      const direction = this.predictor.getDirection();
      const toChunk = {
        x: chunkCenterX - currentPosition.x,
        z: chunkCenterZ - currentPosition.z,
      };
      const toChunkMag = Math.sqrt(toChunk.x ** 2 + toChunk.z ** 2);
      
      if (toChunkMag > 0) {
        const dot = (direction.x * toChunk.x + direction.z * toChunk.z) / toChunkMag;
        if (dot > 0.7) { // In front of player
          priority *= 1.5;
        }
      }
      
      chunk.priority = priority;
      
      if (!this.loadQueue.includes(chunkId)) {
        this.loadQueue.push(chunkId);
      }
    }
    
    // Sort by priority
    this.loadQueue.sort((a, b) => {
      const chunkA = this.chunks.get(a);
      const chunkB = this.chunks.get(b);
      return (chunkB?.priority || 0) - (chunkA?.priority || 0);
    });
  }
  
  private async processLoadQueue(): Promise<void> {
    if (!this.loadCallback) return;
    
    while (
      this.activeLoads.size < this.config.maxConcurrentLoads &&
      this.loadQueue.length > 0
    ) {
      const chunkId = this.loadQueue.shift()!;
      const chunk = this.chunks.get(chunkId);
      
      if (!chunk || chunk.state !== 'unloaded') continue;
      
      chunk.state = 'loading';
      this.activeLoads.add(chunkId);
      
      // Load in background
      this.loadCallback(chunkId)
        .then(data => {
          chunk.state = 'decompressing';
          this.activeLoads.delete(chunkId);
          this.decompressQueue.push(chunkId);
          // Store data temporarily
          (chunk as any)._data = data;
        })
        .catch(err => {
          console.error(`Failed to load chunk ${chunkId}:`, err);
          chunk.state = 'unloaded';
          this.activeLoads.delete(chunkId);
        });
    }
  }
  
  private async processDecompressQueue(): Promise<void> {
    if (!this.decompressCallback || !this.uploadCallback) return;
    
    while (
      this.activeDecompress.size < this.config.maxConcurrentDecompress &&
      this.decompressQueue.length > 0
    ) {
      const chunkId = this.decompressQueue.shift()!;
      const chunk = this.chunks.get(chunkId);
      
      if (!chunk || chunk.state !== 'decompressing') continue;
      
      this.activeDecompress.add(chunkId);
      
      const data = (chunk as any)._data as ArrayBuffer;
      delete (chunk as any)._data;
      
      // Decompress in background thread
      this.decompressCallback(data)
        .then(async decompressedData => {
          chunk.state = 'uploading';
          
          // Upload to GPU
          await this.uploadCallback!(chunkId, decompressedData);
          
          chunk.state = 'ready';
          this.activeDecompress.delete(chunkId);
        })
        .catch(err => {
          console.error(`Failed to decompress chunk ${chunkId}:`, err);
          chunk.state = 'unloaded';
          this.activeDecompress.delete(chunkId);
        });
    }
  }
  
  private unloadDistantChunks(currentPosition: Vec3): void {
    const { chunkSize, preloadRadius } = this.config;
    const maxDist = (preloadRadius + 2) * chunkSize;
    
    for (const [chunkId, chunk] of this.chunks) {
      if (chunk.state !== 'ready') continue;
      
      const chunkCenterX = (chunk.x + 0.5) * chunkSize;
      const chunkCenterZ = (chunk.z + 0.5) * chunkSize;
      
      const dist = Math.sqrt(
        (chunkCenterX - currentPosition.x) ** 2 +
        (chunkCenterZ - currentPosition.z) ** 2
      );
      
      if (dist > maxDist) {
        chunk.state = 'unloaded';
        // Emit unload event for cleanup
      }
    }
  }
  
  /**
   * Get loading stats
   */
  getStats(): {
    loaded: number;
    loading: number;
    queued: number;
  } {
    let loaded = 0;
    let loading = 0;
    
    for (const chunk of this.chunks.values()) {
      if (chunk.state === 'ready') loaded++;
      if (chunk.state === 'loading' || chunk.state === 'decompressing') loading++;
    }
    
    return {
      loaded,
      loading,
      queued: this.loadQueue.length,
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createMovementPredictor(
  config?: Partial<PredictionConfig>
): MovementPredictor {
  return new MovementPredictor(config);
}

export function createPredictiveChunkLoader(
  predictor: MovementPredictor,
  config?: Partial<ChunkLoaderConfig>
): PredictiveChunkLoader {
  return new PredictiveChunkLoader(predictor, config);
}

// ============================================================================
// Usage Example
// ============================================================================

/*
import { 
  createMovementPredictor, 
  createPredictiveChunkLoader 
} from '@holoscript/streaming';

const predictor = createMovementPredictor({
  predictionHorizonSeconds: 1.5,
  velocitySmoothing: 0.3,
});

const loader = createPredictiveChunkLoader(predictor, {
  chunkSize: 50,
  loadRadius: 3,
  preloadRadius: 5,
});

loader.setCallbacks({
  load: async (chunkId) => {
    const response = await fetch(`/chunks/${chunkId}.bin`);
    return response.arrayBuffer();
  },
  decompress: async (data) => {
    // Use Web Worker for decompression
    return await worker.decompress(data);
  },
  upload: async (chunkId, data) => {
    scene.uploadChunk(chunkId, data);
  },
});

// In render loop:
function onFrame(playerPosition: Vec3) {
  predictor.addSample(playerPosition);
  loader.update(playerPosition);
  
  const stats = loader.getStats();
  // console.log(`Loaded: ${stats.loaded}, Loading: ${stats.loading}`);
}
*/
