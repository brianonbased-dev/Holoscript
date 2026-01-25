/**
 * @holoscript/streaming - Cache Module
 * Multi-layer caching with memory, IndexedDB, and network
 */

import {
  AssetType,
  AssetState,
  AssetInfo,
  LoadedAsset,
  LoadPriority,
  CacheLayer,
  CacheConfig,
  CacheEntry,
  EvictionPolicy,
  MemoryBudget,
  StreamingEvent,
  StreamingEventHandler,
  DEFAULT_CACHE_CONFIG,
  DEFAULT_MEMORY_BUDGET,
} from '../types';

// ============================================================================
// Memory Cache
// ============================================================================

export class MemoryCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private budget: MemoryBudget;
  private currentSize: number = 0;
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(
    config: Partial<CacheConfig> = {},
    budget: Partial<MemoryBudget> = {}
  ) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.budget = { ...DEFAULT_MEMORY_BUDGET, ...budget };
  }
  
  set(key: string, asset: LoadedAsset, size: number): boolean {
    // Check if we need to evict
    while (this.currentSize + size > this.budget.textureMemory) {
      if (!this.evictOne()) {
        // Can't evict anything
        return false;
      }
    }
    
    const entry: CacheEntry = {
      key,
      asset,
      size,
      lastAccess: Date.now(),
      accessCount: 1,
      layer: CacheLayer.Memory,
      expires: this.config.ttl > 0 ? Date.now() + this.config.ttl : undefined,
    };
    
    this.cache.set(key, entry);
    this.currentSize += size;
    
    this.emit({ type: 'cache_set', key, layer: CacheLayer.Memory });
    
    return true;
  }
  
  get(key: string): LoadedAsset | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      return null;
    }
    
    // Update access info
    entry.lastAccess = Date.now();
    entry.accessCount++;
    
    this.emit({ type: 'cache_hit', key, layer: CacheLayer.Memory });
    
    return entry.asset;
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    this.currentSize -= entry.size;
    this.cache.delete(key);
    
    this.emit({ type: 'cache_evict', key, layer: CacheLayer.Memory });
    
    return true;
  }
  
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
    
    this.emit({ type: 'cache_clear', layer: CacheLayer.Memory });
  }
  
  getSize(): number {
    return this.currentSize;
  }
  
  getUsage(): number {
    return this.currentSize / this.budget.textureMemory;
  }
  
  getEntryCount(): number {
    return this.cache.size;
  }
  
  prune(): number {
    const now = Date.now();
    let pruned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.delete(key);
        pruned++;
      }
    }
    
    return pruned;
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private evictOne(): boolean {
    if (this.cache.size === 0) return false;
    
    let victim: string | null = null;
    
    switch (this.config.evictionPolicy) {
      case EvictionPolicy.LRU:
        victim = this.findLRU();
        break;
      case EvictionPolicy.LFU:
        victim = this.findLFU();
        break;
      case EvictionPolicy.FIFO:
        victim = this.findFIFO();
        break;
      case EvictionPolicy.Size:
        victim = this.findLargest();
        break;
      case EvictionPolicy.Priority:
        victim = this.findLowestPriority();
        break;
      default:
        victim = this.findLRU();
    }
    
    if (victim) {
      this.delete(victim);
      return true;
    }
    
    return false;
  }
  
  private findLRU(): string | null {
    let oldest: { key: string; time: number } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!oldest || entry.lastAccess < oldest.time) {
        oldest = { key, time: entry.lastAccess };
      }
    }
    
    return oldest?.key ?? null;
  }
  
  private findLFU(): string | null {
    let leastUsed: { key: string; count: number } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!leastUsed || entry.accessCount < leastUsed.count) {
        leastUsed = { key, count: entry.accessCount };
      }
    }
    
    return leastUsed?.key ?? null;
  }
  
  private findFIFO(): string | null {
    // First key in map (oldest insertion)
    const firstKey = this.cache.keys().next();
    return firstKey.done ? null : firstKey.value;
  }
  
  private findLargest(): string | null {
    let largest: { key: string; size: number } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      if (!largest || entry.size > largest.size) {
        largest = { key, size: entry.size };
      }
    }
    
    return largest?.key ?? null;
  }
  
  private findLowestPriority(): string | null {
    let lowest: { key: string; priority: number } | null = null;
    
    for (const [key, entry] of this.cache.entries()) {
      const priority = entry.asset.info.priority;
      if (!lowest || priority < lowest.priority) {
        lowest = { key, priority };
      }
    }
    
    return lowest?.key ?? null;
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
// IndexedDB Cache
// ============================================================================

export class IndexedDBCache {
  private dbName: string;
  private storeName: string = 'assets';
  private db: IDBDatabase | null = null;
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(dbName: string = 'holoscript-asset-cache') {
    this.dbName = dbName;
  }
  
  async initialize(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(true);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
          store.createIndex('lastAccess', 'lastAccess', { unique: false });
          store.createIndex('expires', 'expires', { unique: false });
        }
      };
    });
  }
  
  async set(key: string, asset: LoadedAsset, size: number): Promise<boolean> {
    if (!this.db) return false;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      // Serialize asset (can't store functions or complex objects)
      const serialized = {
        key,
        assetInfo: asset.info,
        data: asset.data,
        metadata: asset.metadata,
        size,
        lastAccess: Date.now(),
        accessCount: 1,
        expires: undefined,
      };
      
      const request = store.put(serialized);
      
      request.onsuccess = () => {
        this.emit({ type: 'cache_set', key, layer: CacheLayer.IndexedDB });
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    });
  }
  
  async get(key: string): Promise<LoadedAsset | null> {
    if (!this.db) return null;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const data = request.result;
        if (!data) {
          resolve(null);
          return;
        }
        
        // Update access time
        data.lastAccess = Date.now();
        data.accessCount++;
        store.put(data);
        
        // Reconstruct asset
        const asset: LoadedAsset = {
          info: data.assetInfo,
          data: data.data,
          metadata: data.metadata,
          loadTime: 0,
          lastAccess: data.lastAccess,
        };
        
        this.emit({ type: 'cache_hit', key, layer: CacheLayer.IndexedDB });
        resolve(asset);
      };
      
      request.onerror = () => {
        resolve(null);
      };
    });
  }
  
  async has(key: string): Promise<boolean> {
    if (!this.db) return false;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.count(IDBKeyRange.only(key));
      
      request.onsuccess = () => {
        resolve(request.result > 0);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    });
  }
  
  async delete(key: string): Promise<boolean> {
    if (!this.db) return false;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.delete(key);
      
      request.onsuccess = () => {
        this.emit({ type: 'cache_evict', key, layer: CacheLayer.IndexedDB });
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
    });
  }
  
  async clear(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        this.emit({ type: 'cache_clear', layer: CacheLayer.IndexedDB });
        resolve();
      };
      
      request.onerror = () => {
        resolve();
      };
    });
  }
  
  async getSize(): Promise<number> {
    if (!this.db) return 0;
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      let totalSize = 0;
      
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          totalSize += cursor.value.size || 0;
          cursor.continue();
        } else {
          resolve(totalSize);
        }
      };
      
      request.onerror = () => {
        resolve(0);
      };
    });
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
// Multi-Layer Cache Manager
// ============================================================================

export class CacheManager {
  private memoryCache: MemoryCache;
  private indexedDBCache: IndexedDBCache;
  private config: CacheConfig;
  private isInitialized: boolean = false;
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.memoryCache = new MemoryCache(config);
    this.indexedDBCache = new IndexedDBCache();
    
    this.setupEventForwarding();
  }
  
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;
    
    const result = await this.indexedDBCache.initialize();
    this.isInitialized = result;
    
    return result;
  }
  
  async set(key: string, asset: LoadedAsset, size: number): Promise<boolean> {
    // Always set in memory cache
    const memResult = this.memoryCache.set(key, asset, size);
    
    // Also persist to IndexedDB if enabled and initialized
    if (this.isInitialized && this.config.enablePersistence) {
      await this.indexedDBCache.set(key, asset, size);
    }
    
    return memResult;
  }
  
  async get(key: string): Promise<LoadedAsset | null> {
    // Check memory first
    const memResult = this.memoryCache.get(key);
    if (memResult) {
      return memResult;
    }
    
    // Check IndexedDB
    if (this.isInitialized) {
      const dbResult = await this.indexedDBCache.get(key);
      if (dbResult) {
        // Promote to memory cache
        this.memoryCache.set(key, dbResult, dbResult.info.size);
        return dbResult;
      }
    }
    
    this.emit({ type: 'cache_miss', key });
    return null;
  }
  
  async has(key: string): Promise<boolean> {
    if (this.memoryCache.has(key)) return true;
    if (this.isInitialized) {
      return await this.indexedDBCache.has(key);
    }
    return false;
  }
  
  async delete(key: string): Promise<boolean> {
    const memResult = this.memoryCache.delete(key);
    let dbResult = false;
    
    if (this.isInitialized) {
      dbResult = await this.indexedDBCache.delete(key);
    }
    
    return memResult || dbResult;
  }
  
  async clear(): Promise<void> {
    this.memoryCache.clear();
    if (this.isInitialized) {
      await this.indexedDBCache.clear();
    }
  }
  
  getMemoryUsage(): { size: number; usage: number; entries: number } {
    return {
      size: this.memoryCache.getSize(),
      usage: this.memoryCache.getUsage(),
      entries: this.memoryCache.getEntryCount(),
    };
  }
  
  async getStats(): Promise<{
    memorySize: number;
    memoryUsage: number;
    memoryEntries: number;
    indexedDBSize: number;
  }> {
    const indexedDBSize = this.isInitialized
      ? await this.indexedDBCache.getSize()
      : 0;
    
    return {
      memorySize: this.memoryCache.getSize(),
      memoryUsage: this.memoryCache.getUsage(),
      memoryEntries: this.memoryCache.getEntryCount(),
      indexedDBSize,
    };
  }
  
  prune(): number {
    return this.memoryCache.prune();
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private setupEventForwarding(): void {
    this.memoryCache.on((event) => this.emit(event));
    this.indexedDBCache.on((event) => this.emit(event));
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
// Memory Budget Monitor
// ============================================================================

export class MemoryBudgetMonitor {
  private budget: MemoryBudget;
  private currentUsage: {
    texture: number;
    geometry: number;
    audio: number;
    total: number;
  } = { texture: 0, geometry: 0, audio: 0, total: 0 };
  private eventHandlers: Set<StreamingEventHandler> = new Set();
  
  constructor(budget: Partial<MemoryBudget> = {}) {
    this.budget = { ...DEFAULT_MEMORY_BUDGET, ...budget };
  }
  
  addUsage(amount: number, category: 'texture' | 'geometry' | 'audio'): void {
    this.currentUsage[category] += amount;
    this.currentUsage.total += amount;
    
    this.checkBudget(category);
  }
  
  removeUsage(amount: number, category: 'texture' | 'geometry' | 'audio'): void {
    this.currentUsage[category] = Math.max(0, this.currentUsage[category] - amount);
    this.currentUsage.total = Math.max(0, this.currentUsage.total - amount);
  }
  
  getUsage(): typeof this.currentUsage {
    return { ...this.currentUsage };
  }
  
  getBudget(): MemoryBudget {
    return { ...this.budget };
  }
  
  getUsagePercent(category: 'texture' | 'geometry' | 'audio' | 'total'): number {
    const budgetMap = {
      texture: this.budget.textureMemory,
      geometry: this.budget.geometryMemory,
      audio: this.budget.audioMemory,
      total: this.budget.totalMemory,
    };
    
    return this.currentUsage[category] / budgetMap[category];
  }
  
  isOverBudget(category: 'texture' | 'geometry' | 'audio' | 'total'): boolean {
    return this.getUsagePercent(category) > 1.0;
  }
  
  isNearBudget(
    category: 'texture' | 'geometry' | 'audio' | 'total',
    threshold: number = 0.9
  ): boolean {
    return this.getUsagePercent(category) > threshold;
  }
  
  on(handler: StreamingEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private checkBudget(category: 'texture' | 'geometry' | 'audio'): void {
    if (this.isOverBudget(category)) {
      this.emit({
        type: 'memory_warning',
        category,
        usage: this.getUsagePercent(category),
      });
    }
    
    if (this.isOverBudget('total')) {
      this.emit({
        type: 'memory_critical',
        category: 'total',
        usage: this.getUsagePercent('total'),
      });
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
