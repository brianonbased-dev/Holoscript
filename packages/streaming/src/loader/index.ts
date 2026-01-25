/**
 * @holoscript/streaming - Loader Module
 * Asset loading, prioritization, and progressive streaming
 */

import {
  AssetType,
  AssetState,
  AssetInfo,
  LoadedAsset,
  LoadPriority,
  LoadRequest,
  LoadProgress,
  ProgressiveConfig,
  AssetBundle,
  BundleManifest,
  StreamingEvent,
  StreamingEventHandler,
  DEFAULT_PROGRESSIVE_CONFIG,
} from '../types';

// ============================================================================
// Load Queue
// ============================================================================

export class LoadQueue {
  private queue: LoadRequest[] = [];
  private activeLoads: Map<string, LoadRequest> = new Map();
  private maxConcurrent: number;
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(maxConcurrent: number = 4) {
    this.maxConcurrent = maxConcurrent;
  }
  
  enqueue(request: LoadRequest): void {
    // Check if already in queue or loading
    if (this.queue.some((r) => r.assetId === request.assetId)) return;
    if (this.activeLoads.has(request.assetId)) return;
    
    this.queue.push(request);
    this.sortQueue();
    this.processQueue();
    
    this.emit({ type: 'asset_queued', assetId: request.assetId });
  }
  
  prioritize(assetId: string, priority: LoadPriority): void {
    const request = this.queue.find((r) => r.assetId === assetId);
    if (request) {
      request.priority = priority;
      this.sortQueue();
    }
  }
  
  cancel(assetId: string): boolean {
    const queueIndex = this.queue.findIndex((r) => r.assetId === assetId);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      return true;
    }
    
    const activeRequest = this.activeLoads.get(assetId);
    if (activeRequest) {
      // Mark as cancelled - actual cancellation depends on loader
      this.activeLoads.delete(assetId);
      return true;
    }
    
    return false;
  }
  
  cancelAll(): void {
    this.queue = [];
    this.activeLoads.clear();
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
  
  getActiveCount(): number {
    return this.activeLoads.size;
  }
  
  isLoading(assetId: string): boolean {
    return this.activeLoads.has(assetId);
  }
  
  isQueued(assetId: string): boolean {
    return this.queue.some((r) => r.assetId === assetId);
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  markComplete(assetId: string): void {
    this.activeLoads.delete(assetId);
    this.processQueue();
  }
  
  markFailed(assetId: string): void {
    this.activeLoads.delete(assetId);
    this.processQueue();
  }
  
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) return b.priority - a.priority;
      // Earlier queue time first
      return a.queueTime - b.queueTime;
    });
  }
  
  private processQueue(): void {
    while (
      this.activeLoads.size < this.maxConcurrent &&
      this.queue.length > 0
    ) {
      const request = this.queue.shift();
      if (request) {
        this.activeLoads.set(request.assetId, request);
        this.emit({ type: 'asset_loading', assetId: request.assetId });
      }
    }
  }
  
  private emit(event: StreamingEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Asset Loader
// ============================================================================

export class AssetLoader {
  private loadQueue: LoadQueue;
  private assets: Map<string, LoadedAsset> = new Map();
  private loaders: Map<AssetType, (url: string) => Promise<unknown>> = new Map();
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(maxConcurrent: number = 4) {
    this.loadQueue = new LoadQueue(maxConcurrent);
    this.setupDefaultLoaders();
    this.setupQueueEvents();
  }
  
  async load(
    assetId: string,
    url: string,
    type: AssetType,
    priority: LoadPriority = LoadPriority.Normal
  ): Promise<LoadedAsset | null> {
    // Check cache
    const cached = this.assets.get(assetId);
    if (cached && cached.state === AssetState.Loaded) {
      return cached;
    }
    
    // Create asset entry
    const asset: LoadedAsset = {
      info: {
        id: assetId,
        url,
        type,
        size: 0,
        state: AssetState.Loading,
        priority,
        references: 1,
      },
      data: null,
      metadata: {},
      loadTime: 0,
      lastAccess: Date.now(),
    };
    
    this.assets.set(assetId, asset);
    
    // Queue for loading
    const request: LoadRequest = {
      assetId,
      url,
      type,
      priority,
      queueTime: Date.now(),
    };
    
    this.loadQueue.enqueue(request);
    
    // Actually load
    try {
      const startTime = performance.now();
      const loader = this.loaders.get(type);
      
      if (!loader) {
        throw new Error(`No loader for asset type: ${type}`);
      }
      
      const data = await loader(url);
      
      asset.data = data;
      asset.info.state = AssetState.Loaded;
      asset.loadTime = performance.now() - startTime;
      
      this.loadQueue.markComplete(assetId);
      this.emit({ type: 'asset_loaded', assetId, asset });
      
      return asset;
    } catch (error) {
      asset.info.state = AssetState.Error;
      this.loadQueue.markFailed(assetId);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'asset_error', assetId, error: errorMessage });
      
      return null;
    }
  }
  
  async loadBatch(requests: Array<{
    assetId: string;
    url: string;
    type: AssetType;
    priority?: LoadPriority;
  }>): Promise<Map<string, LoadedAsset | null>> {
    const results = new Map<string, LoadedAsset | null>();
    
    const promises = requests.map(async (req) => {
      const result = await this.load(
        req.assetId,
        req.url,
        req.type,
        req.priority ?? LoadPriority.Normal
      );
      results.set(req.assetId, result);
    });
    
    await Promise.all(promises);
    return results;
  }
  
  unload(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    if (!asset) return false;
    
    asset.info.references--;
    
    if (asset.info.references <= 0) {
      this.assets.delete(assetId);
      this.emit({ type: 'asset_unloaded', assetId });
      return true;
    }
    
    return false;
  }
  
  getAsset(assetId: string): LoadedAsset | undefined {
    const asset = this.assets.get(assetId);
    if (asset) {
      asset.lastAccess = Date.now();
    }
    return asset;
  }
  
  isLoaded(assetId: string): boolean {
    const asset = this.assets.get(assetId);
    return asset?.info.state === AssetState.Loaded;
  }
  
  getLoadedAssets(): LoadedAsset[] {
    return Array.from(this.assets.values()).filter(
      (a) => a.info.state === AssetState.Loaded
    );
  }
  
  registerLoader(type: AssetType, loader: (url: string) => Promise<unknown>): void {
    this.loaders.set(type, loader);
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private setupDefaultLoaders(): void {
    // Texture loader
    this.loaders.set(AssetType.Texture, async (url: string) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    });
    
    // Model loader (returns fetch response for parsing elsewhere)
    this.loaders.set(AssetType.Model, async (url: string) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    });
    
    // Audio loader
    this.loaders.set(AssetType.Audio, async (url: string) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    });
    
    // JSON loader
    this.loaders.set(AssetType.Script, async (url: string) => {
      const response = await fetch(url);
      return await response.text();
    });
    
    // Scene loader
    this.loaders.set(AssetType.Scene, async (url: string) => {
      const response = await fetch(url);
      return await response.json();
    });
    
    // Binary loader
    this.loaders.set(AssetType.Binary, async (url: string) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    });
    
    // Material loader
    this.loaders.set(AssetType.Material, async (url: string) => {
      const response = await fetch(url);
      return await response.json();
    });
    
    // Animation loader
    this.loaders.set(AssetType.Animation, async (url: string) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    });
    
    // Font loader
    this.loaders.set(AssetType.Font, async (url: string) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    });
    
    // Shader loader
    this.loaders.set(AssetType.Shader, async (url: string) => {
      const response = await fetch(url);
      return await response.text();
    });
  }
  
  private setupQueueEvents(): void {
    this.loadQueue.on((event) => {
      if (event.type === 'asset_queued' || event.type === 'asset_loading') {
        this.emit(event);
      }
    });
  }
  
  private emit(event: StreamingEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Progressive Loader
// ============================================================================

export class ProgressiveLoader {
  private config: ProgressiveConfig;
  private loadingAssets: Map<string, {
    currentLevel: number;
    levels: string[];
  }> = new Map();
  private assetLoader: AssetLoader;
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(
    assetLoader: AssetLoader,
    config: Partial<ProgressiveConfig> = {}
  ) {
    this.assetLoader = assetLoader;
    this.config = { ...DEFAULT_PROGRESSIVE_CONFIG, ...config };
  }
  
  async loadProgressive(
    assetId: string,
    levelUrls: string[],
    type: AssetType,
    priority: LoadPriority = LoadPriority.Normal
  ): Promise<LoadedAsset | null> {
    if (levelUrls.length === 0) return null;
    
    this.loadingAssets.set(assetId, {
      currentLevel: -1,
      levels: levelUrls,
    });
    
    let lastLoaded: LoadedAsset | null = null;
    
    for (let i = 0; i < levelUrls.length; i++) {
      const levelUrl = levelUrls[i];
      const levelAssetId = `${assetId}_level_${i}`;
      
      const asset = await this.assetLoader.load(
        levelAssetId,
        levelUrl,
        type,
        priority
      );
      
      if (asset) {
        lastLoaded = asset;
        
        const loadingState = this.loadingAssets.get(assetId);
        if (loadingState) {
          loadingState.currentLevel = i;
        }
        
        this.emit({
          type: 'progressive_level_loaded',
          assetId,
          level: i,
          totalLevels: levelUrls.length,
        });
      }
    }
    
    this.loadingAssets.delete(assetId);
    return lastLoaded;
  }
  
  getCurrentLevel(assetId: string): number {
    return this.loadingAssets.get(assetId)?.currentLevel ?? -1;
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: StreamingEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Bundle Loader
// ============================================================================

export class BundleLoader {
  private assetLoader: AssetLoader;
  private bundles: Map<string, AssetBundle> = new Map();
  private manifests: Map<string, BundleManifest> = new Map();
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
  }
  
  async loadManifest(url: string): Promise<BundleManifest | null> {
    try {
      const response = await fetch(url);
      const manifest: BundleManifest = await response.json();
      
      this.manifests.set(manifest.id, manifest);
      this.emit({ type: 'manifest_loaded', manifestId: manifest.id });
      
      return manifest;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'manifest_error', url, error: errorMessage });
      return null;
    }
  }
  
  async loadBundle(bundleId: string): Promise<AssetBundle | null> {
    // Find bundle in manifests
    let bundleInfo: BundleManifest['bundles'][0] | null = null;
    
    for (const manifest of this.manifests.values()) {
      const found = manifest.bundles.find((b) => b.id === bundleId);
      if (found) {
        bundleInfo = found;
        break;
      }
    }
    
    if (!bundleInfo) {
      this.emit({ type: 'bundle_error', bundleId, error: 'Bundle not found' });
      return null;
    }
    
    // Check dependencies
    for (const depId of bundleInfo.dependencies) {
      if (!this.bundles.has(depId)) {
        await this.loadBundle(depId);
      }
    }
    
    // Load all assets in bundle
    const assets: LoadedAsset[] = [];
    
    for (const assetInfo of bundleInfo.assets) {
      const asset = await this.assetLoader.load(
        assetInfo.id,
        assetInfo.url,
        assetInfo.type,
        assetInfo.priority
      );
      
      if (asset) {
        assets.push(asset);
      }
    }
    
    const bundle: AssetBundle = {
      id: bundleId,
      assets: bundleInfo.assets,
      dependencies: bundleInfo.dependencies,
      totalSize: bundleInfo.assets.reduce((sum, a) => sum + a.size, 0),
      loadedSize: assets.reduce((sum, a) => sum + a.info.size, 0),
      isLoaded: assets.length === bundleInfo.assets.length,
    };
    
    this.bundles.set(bundleId, bundle);
    this.emit({ type: 'bundle_loaded', bundleId });
    
    return bundle;
  }
  
  unloadBundle(bundleId: string): boolean {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) return false;
    
    for (const assetInfo of bundle.assets) {
      this.assetLoader.unload(assetInfo.id);
    }
    
    this.bundles.delete(bundleId);
    this.emit({ type: 'bundle_unloaded', bundleId });
    
    return true;
  }
  
  getBundle(bundleId: string): AssetBundle | undefined {
    return this.bundles.get(bundleId);
  }
  
  getLoadedBundles(): AssetBundle[] {
    return Array.from(this.bundles.values()).filter((b) => b.isLoaded);
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: StreamingEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}
