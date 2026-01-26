/**
 * @holoscript/navigation - FlowFieldGenerator
 * Grid-based flow field calculation for mass unit pathfinding
 */

export interface FlowFieldConfig {
  /** Grid cell size in world units */
  cellSize: number;
  /** Grid width in cells */
  width: number;
  /** Grid height in cells */
  height: number;
  /** Obstacle cost (impassable) */
  obstacleCost: number;
  /** Diagonal movement allowed */
  allowDiagonal: boolean;
}

export interface Vec2 {
  x: number;
  y: number;
}

interface FlowCell {
  /** Cost to reach goal */
  cost: number;
  /** Direction vector towards goal */
  direction: Vec2;
  /** Is blocked */
  blocked: boolean;
}

const DEFAULT_CONFIG: FlowFieldConfig = {
  cellSize: 1.0,
  width: 64,
  height: 64,
  obstacleCost: 999999,
  allowDiagonal: true,
};

/**
 * FlowFieldGenerator
 * 
 * Generates and maintains flow fields for efficient mass pathfinding.
 * Each cell contains a direction vector pointing towards the goal.
 */
export class FlowFieldGenerator {
  private config: FlowFieldConfig;
  private grid: FlowCell[][];
  private obstacles: Set<string> = new Set();
  private goalX: number = 0;
  private goalZ: number = 0;
  private isDirty: boolean = true;
  
  constructor(config: Partial<FlowFieldConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.grid = this.createEmptyGrid();
  }
  
  /**
   * Set the goal position (in world coordinates)
   */
  setGoal(x: number, z: number): void {
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    
    if (cellX !== this.goalX || cellZ !== this.goalZ) {
      this.goalX = cellX;
      this.goalZ = cellZ;
      this.isDirty = true;
    }
  }
  
  /**
   * Add an obstacle at world position
   */
  addObstacle(x: number, z: number): void {
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    const key = `${cellX},${cellZ}`;
    
    if (!this.obstacles.has(key)) {
      this.obstacles.add(key);
      if (this.isInBounds(cellX, cellZ)) {
        this.grid[cellX][cellZ].blocked = true;
      }
      this.isDirty = true;
    }
  }
  
  /**
   * Remove an obstacle at world position
   */
  removeObstacle(x: number, z: number): void {
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    const key = `${cellX},${cellZ}`;
    
    if (this.obstacles.has(key)) {
      this.obstacles.delete(key);
      if (this.isInBounds(cellX, cellZ)) {
        this.grid[cellX][cellZ].blocked = false;
      }
      this.isDirty = true;
    }
  }
  
  /**
   * Clear all obstacles
   */
  clearObstacles(): void {
    this.obstacles.clear();
    for (let x = 0; x < this.config.width; x++) {
      for (let z = 0; z < this.config.height; z++) {
        this.grid[x][z].blocked = false;
      }
    }
    this.isDirty = true;
  }
  
  /**
   * Recalculate the flow field (call after goal/obstacle changes)
   */
  update(): void {
    if (!this.isDirty) return;
    
    // Reset costs
    for (let x = 0; x < this.config.width; x++) {
      for (let z = 0; z < this.config.height; z++) {
        this.grid[x][z].cost = this.grid[x][z].blocked 
          ? this.config.obstacleCost 
          : Infinity;
        this.grid[x][z].direction = { x: 0, y: 0 };
      }
    }
    
    // Dijkstra's algorithm from goal
    if (!this.isInBounds(this.goalX, this.goalZ)) return;
    
    const queue: [number, number][] = [[this.goalX, this.goalZ]];
    this.grid[this.goalX][this.goalZ].cost = 0;
    
    while (queue.length > 0) {
      const [cx, cz] = queue.shift()!;
      const currentCost = this.grid[cx][cz].cost;
      
      const neighbors = this.getNeighbors(cx, cz);
      
      for (const [nx, nz, moveCost] of neighbors) {
        const cell = this.grid[nx][nz];
        const newCost = currentCost + moveCost;
        
        if (newCost < cell.cost && !cell.blocked) {
          cell.cost = newCost;
          queue.push([nx, nz]);
        }
      }
    }
    
    // Calculate direction vectors
    for (let x = 0; x < this.config.width; x++) {
      for (let z = 0; z < this.config.height; z++) {
        const cell = this.grid[x][z];
        if (cell.blocked || cell.cost === Infinity) continue;
        
        let bestDir = { x: 0, y: 0 };
        let bestCost = cell.cost;
        
        const neighbors = this.getNeighbors(x, z);
        
        for (const [nx, nz] of neighbors) {
          const neighborCost = this.grid[nx][nz].cost;
          if (neighborCost < bestCost) {
            bestCost = neighborCost;
            bestDir = { x: nx - x, y: nz - z };
          }
        }
        
        // Normalize direction
        const len = Math.sqrt(bestDir.x * bestDir.x + bestDir.y * bestDir.y);
        if (len > 0) {
          cell.direction = { x: bestDir.x / len, y: bestDir.y / len };
        }
      }
    }
    
    this.isDirty = false;
  }
  
  /**
   * Get flow direction at world position
   */
  getVector(x: number, z: number): Vec2 {
    if (this.isDirty) this.update();
    
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    
    if (!this.isInBounds(cellX, cellZ)) {
      // Return direction towards center
      const cx = this.config.width / 2;
      const cz = this.config.height / 2;
      const dx = cx - cellX;
      const dz = cz - cellZ;
      const len = Math.sqrt(dx * dx + dz * dz);
      return len > 0 ? { x: dx / len, y: dz / len } : { x: 0, y: 0 };
    }
    
    return this.grid[cellX][cellZ].direction;
  }
  
  /**
   * Get cost at world position
   */
  getCost(x: number, z: number): number {
    if (this.isDirty) this.update();
    
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    
    if (!this.isInBounds(cellX, cellZ)) return Infinity;
    
    return this.grid[cellX][cellZ].cost;
  }
  
  /**
   * Check if position is blocked
   */
  isBlocked(x: number, z: number): boolean {
    const cellX = Math.floor(x / this.config.cellSize);
    const cellZ = Math.floor(z / this.config.cellSize);
    
    if (!this.isInBounds(cellX, cellZ)) return true;
    
    return this.grid[cellX][cellZ].blocked;
  }
  
  private createEmptyGrid(): FlowCell[][] {
    const grid: FlowCell[][] = [];
    
    for (let x = 0; x < this.config.width; x++) {
      grid[x] = [];
      for (let z = 0; z < this.config.height; z++) {
        grid[x][z] = {
          cost: Infinity,
          direction: { x: 0, y: 0 },
          blocked: false,
        };
      }
    }
    
    return grid;
  }
  
  private isInBounds(x: number, z: number): boolean {
    return x >= 0 && x < this.config.width && z >= 0 && z < this.config.height;
  }
  
  private getNeighbors(x: number, z: number): [number, number, number][] {
    const neighbors: [number, number, number][] = [];
    
    // Cardinal directions
    const cardinals: [number, number][] = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    
    for (const [dx, dz] of cardinals) {
      const nx = x + dx;
      const nz = z + dz;
      if (this.isInBounds(nx, nz)) {
        neighbors.push([nx, nz, 1]);
      }
    }
    
    // Diagonal directions
    if (this.config.allowDiagonal) {
      const diagonals: [number, number][] = [
        [-1, -1], [-1, 1], [1, -1], [1, 1]
      ];
      
      for (const [dx, dz] of diagonals) {
        const nx = x + dx;
        const nz = z + dz;
        if (this.isInBounds(nx, nz)) {
          neighbors.push([nx, nz, Math.SQRT2]);
        }
      }
    }
    
    return neighbors;
  }
}
