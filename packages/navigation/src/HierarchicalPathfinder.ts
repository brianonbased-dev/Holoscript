/**
 * @holoscript/navigation - HierarchicalPathfinder
 * Multi-level A* for balanced accuracy/performance
 * 
 * Levels:
 * 1. Room/Zone graph (5-20 nodes) - coarse path
 * 2. Cluster graph (50-200 nodes) - medium detail  
 * 3. NavMesh (full detail) - only for current area
 * 
 * Result: Find paths for 50+ NPCs per frame
 */

// ============================================================================
// Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface HierarchyConfig {
  /** Size of level-1 zones (largest) */
  zoneSize: number;
  /** Size of level-2 clusters */
  clusterSize: number;
  /** Size of level-3 cells (smallest) */
  cellSize: number;
  /** Maximum path length to cache */
  maxCacheSize: number;
  /** Cache TTL in milliseconds */
  cacheTTLMs: number;
}

const DEFAULT_HIERARCHY_CONFIG: HierarchyConfig = {
  zoneSize: 50,
  clusterSize: 10,
  cellSize: 1,
  maxCacheSize: 1000,
  cacheTTLMs: 5000,
};

interface GraphNode {
  id: string;
  x: number;
  z: number;
  neighbors: string[];
  level: number;
}

interface PathResult {
  path: Vec3[];
  cost: number;
  level: number;
  cached: boolean;
}

interface CacheEntry {
  path: Vec3[];
  cost: number;
  level: number;
  timestamp: number;
}

// ============================================================================
// Priority Queue (for A*)
// ============================================================================

class PriorityQueue<T> {
  private items: Array<{ item: T; priority: number }> = [];
  
  push(item: T, priority: number): void {
    this.items.push({ item, priority });
    this.items.sort((a, b) => a.priority - b.priority);
  }
  
  pop(): T | undefined {
    return this.items.shift()?.item;
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
}

// ============================================================================
// Hierarchical Pathfinder
// ============================================================================

export class HierarchicalPathfinder {
  private config: HierarchyConfig;
  
  // Hierarchy graphs
  private zoneGraph: Map<string, GraphNode> = new Map();
  private clusterGraph: Map<string, GraphNode> = new Map();
  private cellGraph: Map<string, GraphNode> = new Map();
  
  // Obstacles
  private blockedCells: Set<string> = new Set();
  
  // Path cache
  private pathCache: Map<string, CacheEntry> = new Map();
  
  constructor(config: Partial<HierarchyConfig> = {}) {
    this.config = { ...DEFAULT_HIERARCHY_CONFIG, ...config };
  }
  
  // --------------------------------------------------------------------------
  // Graph Building
  // --------------------------------------------------------------------------
  
  /**
   * Initialize hierarchy from a navmesh or grid
   */
  initializeFromGrid(width: number, height: number, obstacles?: Vec3[]): void {
    // Build level 3: Cell graph
    this.buildCellGraph(width, height);
    
    // Build level 2: Cluster graph
    this.buildClusterGraph(width, height);
    
    // Build level 1: Zone graph
    this.buildZoneGraph(width, height);
    
    // Apply obstacles
    if (obstacles) {
      for (const obs of obstacles) {
        this.addObstacle(obs.x, obs.z);
      }
    }
  }
  
  private buildCellGraph(width: number, height: number): void {
    const { cellSize } = this.config;
    const cellsX = Math.ceil(width / cellSize);
    const cellsZ = Math.ceil(height / cellSize);
    
    for (let x = 0; x < cellsX; x++) {
      for (let z = 0; z < cellsZ; z++) {
        const id = `cell:${x},${z}`;
        const neighbors: string[] = [];
        
        // 8-directional neighbors
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue;
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < cellsX && nz >= 0 && nz < cellsZ) {
              neighbors.push(`cell:${nx},${nz}`);
            }
          }
        }
        
        this.cellGraph.set(id, {
          id,
          x: (x + 0.5) * cellSize,
          z: (z + 0.5) * cellSize,
          neighbors,
          level: 3,
        });
      }
    }
  }
  
  private buildClusterGraph(width: number, height: number): void {
    const { clusterSize } = this.config;
    const clustersX = Math.ceil(width / clusterSize);
    const clustersZ = Math.ceil(height / clusterSize);
    
    for (let x = 0; x < clustersX; x++) {
      for (let z = 0; z < clustersZ; z++) {
        const id = `cluster:${x},${z}`;
        const neighbors: string[] = [];
        
        // 8-directional neighbors
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dz === 0) continue;
            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < clustersX && nz >= 0 && nz < clustersZ) {
              neighbors.push(`cluster:${nx},${nz}`);
            }
          }
        }
        
        this.clusterGraph.set(id, {
          id,
          x: (x + 0.5) * clusterSize,
          z: (z + 0.5) * clusterSize,
          neighbors,
          level: 2,
        });
      }
    }
  }
  
  private buildZoneGraph(width: number, height: number): void {
    const { zoneSize } = this.config;
    const zonesX = Math.ceil(width / zoneSize);
    const zonesZ = Math.ceil(height / zoneSize);
    
    for (let x = 0; x < zonesX; x++) {
      for (let z = 0; z < zonesZ; z++) {
        const id = `zone:${x},${z}`;
        const neighbors: string[] = [];
        
        // 4-directional neighbors (zones are larger, less granular)
        const directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dz] of directions) {
          const nx = x + dx;
          const nz = z + dz;
          if (nx >= 0 && nx < zonesX && nz >= 0 && nz < zonesZ) {
            neighbors.push(`zone:${nx},${nz}`);
          }
        }
        
        this.zoneGraph.set(id, {
          id,
          x: (x + 0.5) * zoneSize,
          z: (z + 0.5) * zoneSize,
          neighbors,
          level: 1,
        });
      }
    }
  }
  
  // --------------------------------------------------------------------------
  // Pathfinding
  // --------------------------------------------------------------------------
  
  /**
   * Find path from start to goal using hierarchical search
   */
  findPath(start: Vec3, goal: Vec3): PathResult {
    // Check cache first
    const cacheKey = this.getCacheKey(start, goal);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
    
    // Determine if we need full detail or can use hierarchy
    const distance = Math.sqrt(
      (goal.x - start.x) ** 2 + (goal.z - start.z) ** 2
    );
    
    let result: PathResult;
    
    if (distance < this.config.clusterSize * 2) {
      // Short distance: use full cell detail
      result = this.findPathAtLevel(start, goal, 3);
    } else if (distance < this.config.zoneSize * 2) {
      // Medium distance: use cluster level + cell detail at ends
      result = this.findHierarchicalPath(start, goal, 2);
    } else {
      // Long distance: use zone level + cluster + cell detail
      result = this.findHierarchicalPath(start, goal, 1);
    }
    
    // Cache result
    this.addToCache(cacheKey, result);
    
    return { ...result, cached: false };
  }
  
  private findPathAtLevel(start: Vec3, goal: Vec3, level: number): PathResult {
    const graph = this.getGraphForLevel(level);
    const startNode = this.getNearestNode(start, graph);
    const goalNode = this.getNearestNode(goal, graph);
    
    if (!startNode || !goalNode) {
      return { path: [], cost: Infinity, level, cached: false };
    }
    
    // A* search
    const openSet = new PriorityQueue<string>();
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    gScore.set(startNode.id, 0);
    fScore.set(startNode.id, this.heuristic(startNode, goalNode));
    openSet.push(startNode.id, fScore.get(startNode.id)!);
    
    while (!openSet.isEmpty()) {
      const currentId = openSet.pop()!;
      
      if (currentId === goalNode.id) {
        // Reconstruct path
        const path = this.reconstructPath(cameFrom, currentId, graph);
        return {
          path,
          cost: gScore.get(currentId)!,
          level,
          cached: false,
        };
      }
      
      const current = graph.get(currentId)!;
      
      for (const neighborId of current.neighbors) {
        if (this.isBlocked(neighborId)) continue;
        
        const neighbor = graph.get(neighborId);
        if (!neighbor) continue;
        
        const tentativeG = gScore.get(currentId)! + this.distance(current, neighbor);
        
        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + this.heuristic(neighbor, goalNode));
          openSet.push(neighborId, fScore.get(neighborId)!);
        }
      }
    }
    
    // No path found
    return { path: [], cost: Infinity, level, cached: false };
  }
  
  private findHierarchicalPath(start: Vec3, goal: Vec3, topLevel: number): PathResult {
    // Find coarse path at top level
    const coarsePath = this.findPathAtLevel(start, goal, topLevel);
    
    if (coarsePath.path.length === 0) {
      return coarsePath;
    }
    
    // Refine: only detail current and next waypoint
    const refinedPath: Vec3[] = [];
    
    // Detail first segment
    if (coarsePath.path.length >= 2) {
      const detailStart = this.findPathAtLevel(start, coarsePath.path[1], topLevel + 1);
      refinedPath.push(...detailStart.path);
    } else {
      refinedPath.push(start);
    }
    
    // Keep coarse waypoints for rest (refinement happens as agent moves)
    for (let i = 2; i < coarsePath.path.length; i++) {
      refinedPath.push(coarsePath.path[i]);
    }
    
    refinedPath.push(goal);
    
    return {
      path: refinedPath,
      cost: coarsePath.cost,
      level: topLevel,
      cached: false,
    };
  }
  
  // --------------------------------------------------------------------------
  // Batch Pathfinding (for 50+ NPCs)
  // --------------------------------------------------------------------------
  
  /**
   * Find paths for multiple agents (budget-limited)
   * 
   * @param requests Array of {agentId, start, goal}
   * @param maxPathsPerFrame Maximum paths to compute this frame
   * @returns Computed paths (may be fewer than requests if budget exceeded)
   */
  findPathsBatched(
    requests: Array<{ agentId: string; start: Vec3; goal: Vec3; priority: number }>,
    maxPathsPerFrame: number = 5
  ): Map<string, PathResult> {
    const results = new Map<string, PathResult>();
    
    // Sort by priority (higher first)
    const sorted = [...requests].sort((a, b) => b.priority - a.priority);
    
    let computed = 0;
    
    for (const req of sorted) {
      // Check cache first (doesn't count against budget)
      const cacheKey = this.getCacheKey(req.start, req.goal);
      const cached = this.getFromCache(cacheKey);
      
      if (cached) {
        results.set(req.agentId, { ...cached, cached: true });
        continue;
      }
      
      // Compute new path (counts against budget)
      if (computed < maxPathsPerFrame) {
        const path = this.findPath(req.start, req.goal);
        results.set(req.agentId, path);
        computed++;
      }
      // Else: agent keeps old path, will try again next frame
    }
    
    return results;
  }
  
  // --------------------------------------------------------------------------
  // Obstacles
  // --------------------------------------------------------------------------
  
  /**
   * Mark a cell as blocked
   */
  addObstacle(x: number, z: number): void {
    const { cellSize } = this.config;
    const cellX = Math.floor(x / cellSize);
    const cellZ = Math.floor(z / cellSize);
    this.blockedCells.add(`cell:${cellX},${cellZ}`);
    
    // Invalidate affected cache entries
    this.invalidateCacheInRadius(x, z, cellSize * 3);
  }
  
  /**
   * Remove a blocked cell
   */
  removeObstacle(x: number, z: number): void {
    const { cellSize } = this.config;
    const cellX = Math.floor(x / cellSize);
    const cellZ = Math.floor(z / cellSize);
    this.blockedCells.delete(`cell:${cellX},${cellZ}`);
  }
  
  private isBlocked(nodeId: string): boolean {
    return this.blockedCells.has(nodeId);
  }
  
  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  
  private getGraphForLevel(level: number): Map<string, GraphNode> {
    switch (level) {
      case 1: return this.zoneGraph;
      case 2: return this.clusterGraph;
      case 3: return this.cellGraph;
      default: return this.cellGraph;
    }
  }
  
  private getNearestNode(pos: Vec3, graph: Map<string, GraphNode>): GraphNode | undefined {
    let nearest: GraphNode | undefined;
    let minDist = Infinity;
    
    for (const node of graph.values()) {
      const dist = (node.x - pos.x) ** 2 + (node.z - pos.z) ** 2;
      if (dist < minDist) {
        minDist = dist;
        nearest = node;
      }
    }
    
    return nearest;
  }
  
  private heuristic(a: GraphNode, b: GraphNode): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }
  
  private distance(a: GraphNode, b: GraphNode): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
  }
  
  private reconstructPath(
    cameFrom: Map<string, string>,
    current: string,
    graph: Map<string, GraphNode>
  ): Vec3[] {
    const path: Vec3[] = [];
    let node = current;
    
    while (cameFrom.has(node)) {
      const graphNode = graph.get(node);
      if (graphNode) {
        path.unshift({ x: graphNode.x, y: 0, z: graphNode.z });
      }
      node = cameFrom.get(node)!;
    }
    
    // Add start
    const startNode = graph.get(node);
    if (startNode) {
      path.unshift({ x: startNode.x, y: 0, z: startNode.z });
    }
    
    return path;
  }
  
  // --------------------------------------------------------------------------
  // Cache
  // --------------------------------------------------------------------------
  
  private getCacheKey(start: Vec3, goal: Vec3): string {
    const { cellSize } = this.config;
    const sx = Math.floor(start.x / cellSize);
    const sz = Math.floor(start.z / cellSize);
    const gx = Math.floor(goal.x / cellSize);
    const gz = Math.floor(goal.z / cellSize);
    return `${sx},${sz}->${gx},${gz}`;
  }
  
  private getFromCache(key: string): CacheEntry | null {
    const entry = this.pathCache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.config.cacheTTLMs) {
      this.pathCache.delete(key);
      return null;
    }
    
    return entry;
  }
  
  private addToCache(key: string, result: PathResult): void {
    if (this.pathCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const oldest = [...this.pathCache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.pathCache.delete(oldest[0]);
      }
    }
    
    this.pathCache.set(key, {
      path: result.path,
      cost: result.cost,
      level: result.level,
      timestamp: Date.now(),
    });
  }
  
  private invalidateCacheInRadius(x: number, z: number, radius: number): void {
    const radiusSq = radius * radius;
    
    for (const [key, entry] of this.pathCache) {
      // Check if path passes near the obstacle
      for (const point of entry.path) {
        const distSq = (point.x - x) ** 2 + (point.z - z) ** 2;
        if (distSq < radiusSq) {
          this.pathCache.delete(key);
          break;
        }
      }
    }
  }
  
  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  
  getStats(): {
    zoneNodes: number;
    clusterNodes: number;
    cellNodes: number;
    cachedPaths: number;
    blockedCells: number;
  } {
    return {
      zoneNodes: this.zoneGraph.size,
      clusterNodes: this.clusterGraph.size,
      cellNodes: this.cellGraph.size,
      cachedPaths: this.pathCache.size,
      blockedCells: this.blockedCells.size,
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createHierarchicalPathfinder(
  config?: Partial<HierarchyConfig>
): HierarchicalPathfinder {
  return new HierarchicalPathfinder(config);
}
