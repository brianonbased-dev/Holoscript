import { HSPlusNode } from '../types/AdvancedTypeSystem';
import * as crypto from 'crypto';

/**
 * CachedNode
 * 
 * Stores the AST node and the content hash for a specific chunk.
 */
export interface CachedNode {
  id: string;
  hash: string;
  node: HSPlusNode;
  lastUsed: number;
}

/**
 * ParseCache
 * 
 * In-memory storage for AST nodes to enable incremental parsing re-use.
 */
export class ParseCache {
  private cache: Map<string, CachedNode> = new Map();
  private maxEntries: number = 500;

  /**
   * Generates a hash for the chunk content
   */
  static hash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Retrieves a cached node if the hash matches
   */
  get(id: string, currentHash: string): HSPlusNode | null {
    const cached = this.cache.get(id);
    if (cached && cached.hash === currentHash) {
      cached.lastUsed = Date.now();
      return cached.node;
    }
    return null;
  }

  /**
   * Stores a node in the cache
   */
  set(id: string, hash: string, node: HSPlusNode): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }
    
    this.cache.set(id, {
      id,
      hash,
      node,
      lastUsed: Date.now()
    });
  }

  /**
   * Clears the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, entry] of this.cache.entries()) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.cache.delete(oldestId);
    }
  }
}

// Global cache instance
export const globalParseCache = new ParseCache();
