/**
 * @holoscript/core Runtime Optimization
 *
 * Object pooling, lazy evaluation, memoization, caching
 */
/**
 * Generic object pool for efficient memory reuse
 */
export class ObjectPool {
    constructor(factory, reset, capacity = 100) {
        this.factory = factory;
        this.reset = reset;
        this.capacity = capacity;
        this.available = [];
        this.inUse = new Set();
        this.peakUsage = 0;
        this.preallocate(capacity);
    }
    /**
     * Pre-allocate objects
     */
    preallocate(count) {
        for (let i = 0; i < count; i++) {
            this.available.push(this.factory());
        }
    }
    /**
     * Acquire object from pool
     */
    acquire() {
        let obj = this.available.pop();
        if (!obj) {
            obj = this.factory();
        }
        this.inUse.add(obj);
        this.peakUsage = Math.max(this.peakUsage, this.inUse.size);
        return obj;
    }
    /**
     * Release object back to pool
     */
    release(obj) {
        if (!this.inUse.has(obj)) {
            console.warn('Releasing object not from this pool');
            return;
        }
        this.inUse.delete(obj);
        this.reset(obj);
        this.available.push(obj);
    }
    /**
     * Batch acquire
     */
    acquireBatch(count) {
        const batch = [];
        for (let i = 0; i < count; i++) {
            batch.push(this.acquire());
        }
        return batch;
    }
    /**
     * Batch release
     */
    releaseBatch(objects) {
        for (const obj of objects) {
            this.release(obj);
        }
    }
    /**
     * Get pool statistics
     */
    getStats() {
        return {
            available: this.available.length,
            inUse: this.inUse.size,
            peakUsage: this.peakUsage,
            utilization: this.inUse.size / (this.inUse.size + this.available.length),
        };
    }
    /**
     * Clear pool
     */
    clear() {
        this.available = [];
        this.inUse.clear();
        this.peakUsage = 0;
    }
}
/**
 * Lazy evaluated value
 */
export class Lazy {
    constructor(compute) {
        this.compute = compute;
        this.computed = false;
    }
    /**
     * Get value (compute if needed)
     */
    get() {
        if (!this.computed) {
            this.value = this.compute();
            this.computed = true;
        }
        return this.value;
    }
    /**
     * Force re-computation
     */
    reset() {
        this.computed = false;
        this.value = undefined;
    }
    /**
     * Check if computed
     */
    isComputed() {
        return this.computed;
    }
}
/**
 * Memoization decorator
 */
export function memoize(fn, maxSize = 100) {
    const cache = new Map();
    return ((...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        if (cache.size >= maxSize) {
            const firstKey = cache.keys().next().value;
            cache.delete(firstKey);
        }
        cache.set(key, result);
        return result;
    });
}
/**
 * Memoized property decorator
 */
export function MemoizedProperty() {
    return function (target, propertyKey, descriptor) {
        const originalGetter = descriptor.get;
        const cache = new Map();
        descriptor.get = function () {
            if (!cache.has(this)) {
                cache.set(this, originalGetter.call(this));
            }
            return cache.get(this);
        };
        return descriptor;
    };
}
/**
 * LRU Cache with maximum size
 */
export class LRUCache {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.cache = new Map();
        this.accessOrder = [];
    }
    /**
     * Get value from cache
     */
    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
            return this.cache.get(key);
        }
        return undefined;
    }
    /**
     * Set value in cache
     */
    set(key, value) {
        if (this.cache.has(key)) {
            // Update existing
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
        }
        else if (this.cache.size >= this.maxSize) {
            // Evict LRU
            const lruKey = this.accessOrder.shift();
            this.cache.delete(lruKey);
        }
        this.cache.set(key, value);
        this.accessOrder.push(key);
    }
    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
        this.accessOrder = [];
    }
    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            utilization: this.cache.size / this.maxSize,
        };
    }
}
/**
 * Batch processing for efficient bulk operations
 */
export class Batcher {
    constructor(processor, batchSize = 100, flushIntervalMs = 16 // ~1 frame at 60fps
    ) {
        this.processor = processor;
        this.batchSize = batchSize;
        this.flushIntervalMs = flushIntervalMs;
        this.queue = [];
        this.processingTimeout = null;
    }
    /**
     * Add item to batch
     */
    async add(item) {
        return new Promise((resolve) => {
            this.queue.push(item);
            if (this.queue.length >= this.batchSize) {
                this.flush().then((results) => {
                    resolve(results[results.length - 1]);
                });
            }
            else if (!this.processingTimeout) {
                this.processingTimeout = setTimeout(() => {
                    this.flush();
                }, this.flushIntervalMs);
            }
        });
    }
    /**
     * Flush batch
     */
    async flush() {
        if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
        }
        if (this.queue.length === 0) {
            return [];
        }
        const batch = this.queue.splice(0, this.batchSize);
        return await this.processor(batch);
    }
    /**
     * Manually flush remaining items
     */
    async flushAll() {
        const results = [];
        while (this.queue.length > 0) {
            const batchResults = await this.flush();
            results.push(...batchResults);
        }
        return results;
    }
}
/**
 * Performance profiler with hot path tracking
 */
export class PerformanceProfiler {
    constructor() {
        this.measurements = new Map();
        this.activeTimers = new Map();
    }
    /**
     * Start timing a function
     */
    startTimer(label) {
        this.activeTimers.set(label, performance.now());
    }
    /**
     * End timing
     */
    endTimer(label) {
        const startTime = this.activeTimers.get(label);
        if (!startTime) {
            console.warn(`No timer started for ${label}`);
            return 0;
        }
        const duration = performance.now() - startTime;
        this.activeTimers.delete(label);
        // Update statistics
        const stats = this.measurements.get(label) || { count: 0, totalTime: 0, minTime: Infinity, maxTime: -Infinity };
        stats.count++;
        stats.totalTime += duration;
        stats.minTime = Math.min(stats.minTime, duration);
        stats.maxTime = Math.max(stats.maxTime, duration);
        this.measurements.set(label, stats);
        return duration;
    }
    /**
     * Measure function execution
     */
    async measure(label, fn) {
        this.startTimer(label);
        try {
            return await fn();
        }
        finally {
            this.endTimer(label);
        }
    }
    /**
     * Get profiling report
     */
    getReport() {
        let report = '=== Performance Profile ===\n\n';
        const sorted = Array.from(this.measurements.entries()).sort((a, b) => b[1].totalTime - a[1].totalTime);
        for (const [label, stats] of sorted) {
            const avgTime = stats.totalTime / stats.count;
            report += `${label}:\n`;
            report += `  Calls: ${stats.count}\n`;
            report += `  Total: ${stats.totalTime.toFixed(2)}ms\n`;
            report += `  Avg: ${avgTime.toFixed(2)}ms\n`;
            report += `  Min/Max: ${stats.minTime.toFixed(2)}ms / ${stats.maxTime.toFixed(2)}ms\n\n`;
        }
        return report;
    }
    /**
     * Reset measurements
     */
    reset() {
        this.measurements.clear();
        this.activeTimers.clear();
    }
    /**
     * Get hottest paths
     */
    getHotPaths(topN = 5) {
        return Array.from(this.measurements.entries())
            .sort((a, b) => b[1].totalTime - a[1].totalTime)
            .slice(0, topN)
            .map(([label, stats]) => [label, stats.totalTime]);
    }
}
/**
 * Global optimizer instance
 */
let globalProfiler = null;
export function getGlobalProfiler() {
    if (!globalProfiler) {
        globalProfiler = new PerformanceProfiler();
    }
    return globalProfiler;
}
