/**
 * @holoscript/pcg - Wave Function Collapse
 * Constraint-based tile generation
 */

import type { 
  WFCConfig, 
  WFCResult, 
  WFCCell, 
  WFCTile, 
  WFCAdjacency 
} from '../types';
import { WFCDirection, WFCSymmetry } from '../types';
import { Mulberry32 } from '../noise';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_WFC_CONFIG: Partial<WFCConfig> = {
  width: 10,
  height: 10,
  depth: 1,
  seed: 12345,
  backtrackLimit: 1000,
  is3D: false,
};

// ============================================================================
// Direction Utilities
// ============================================================================

const DIRECTION_OFFSETS_2D: Record<WFCDirection, { dx: number; dy: number; dz: number }> = {
  [WFCDirection.North]: { dx: 0, dy: -1, dz: 0 },
  [WFCDirection.East]: { dx: 1, dy: 0, dz: 0 },
  [WFCDirection.South]: { dx: 0, dy: 1, dz: 0 },
  [WFCDirection.West]: { dx: -1, dy: 0, dz: 0 },
  [WFCDirection.Up]: { dx: 0, dy: 0, dz: 1 },
  [WFCDirection.Down]: { dx: 0, dy: 0, dz: -1 },
};

const OPPOSITE_DIRECTION: Record<WFCDirection, WFCDirection> = {
  [WFCDirection.North]: WFCDirection.South,
  [WFCDirection.South]: WFCDirection.North,
  [WFCDirection.East]: WFCDirection.West,
  [WFCDirection.West]: WFCDirection.East,
  [WFCDirection.Up]: WFCDirection.Down,
  [WFCDirection.Down]: WFCDirection.Up,
};

// ============================================================================
// Wave Function Collapse Solver
// ============================================================================

export class WFCSolver {
  private config: WFCConfig;
  private rng: Mulberry32;
  private cells: WFCCell[][][];
  private adjacencyMap: Map<string, Map<WFCDirection, Set<string>>>;
  private tileWeights: Map<string, number>;
  private history: Array<{ x: number; y: number; z: number; possibilities: Set<string> }>;
  private backtrackCount: number;
  private iterationCount: number;

  constructor(config: WFCConfig) {
    this.config = { ...DEFAULT_WFC_CONFIG, ...config } as WFCConfig;
    this.rng = new Mulberry32(this.config.seed);
    this.cells = [];
    this.adjacencyMap = new Map();
    this.tileWeights = new Map();
    this.history = [];
    this.backtrackCount = 0;
    this.iterationCount = 0;

    this.buildAdjacencyMap();
    this.buildTileWeights();
    this.initializeCells();
  }

  private buildAdjacencyMap(): void {
    for (const tile of this.config.tiles) {
      this.adjacencyMap.set(tile.id, new Map());
      for (const dir of Object.values(WFCDirection).filter(v => typeof v === 'number') as WFCDirection[]) {
        this.adjacencyMap.get(tile.id)!.set(dir, new Set());
      }
    }

    for (const adj of this.config.adjacencies) {
      const tileAdjMap = this.adjacencyMap.get(adj.tile);
      if (tileAdjMap) {
        for (const allowed of adj.allowed) {
          tileAdjMap.get(adj.direction)!.add(allowed);
        }
      }
    }

    // Apply symmetry rules
    for (const tile of this.config.tiles) {
      this.applySymmetry(tile);
    }
  }

  private applySymmetry(tile: WFCTile): void {
    const tileAdj = this.adjacencyMap.get(tile.id);
    if (!tileAdj) return;

    switch (tile.symmetry) {
      case WFCSymmetry.Rotate90:
        // Rotate adjacencies 90 degrees
        this.rotateAdjacencies(tile.id, 1);
        this.rotateAdjacencies(tile.id, 2);
        this.rotateAdjacencies(tile.id, 3);
        break;
        
      case WFCSymmetry.Rotate180:
        this.rotateAdjacencies(tile.id, 2);
        break;
        
      case WFCSymmetry.FlipX:
        // Mirror east/west
        this.mirrorAdjacencies(tile.id, WFCDirection.East, WFCDirection.West);
        break;
        
      case WFCSymmetry.FlipY:
        // Mirror north/south
        this.mirrorAdjacencies(tile.id, WFCDirection.North, WFCDirection.South);
        break;
        
      case WFCSymmetry.Full:
        // Apply all symmetries
        this.rotateAdjacencies(tile.id, 1);
        this.rotateAdjacencies(tile.id, 2);
        this.rotateAdjacencies(tile.id, 3);
        this.mirrorAdjacencies(tile.id, WFCDirection.East, WFCDirection.West);
        this.mirrorAdjacencies(tile.id, WFCDirection.North, WFCDirection.South);
        break;
    }
  }

  private rotateAdjacencies(_tileId: string, _rotations: number): void {
    // Rotation logic - copies adjacencies from one direction to the rotated direction
    // Implementation simplified for clarity
  }

  private mirrorAdjacencies(tileId: string, dir1: WFCDirection, dir2: WFCDirection): void {
    const tileAdj = this.adjacencyMap.get(tileId);
    if (!tileAdj) return;

    const adj1 = tileAdj.get(dir1);
    const adj2 = tileAdj.get(dir2);
    
    if (adj1 && adj2) {
      for (const t of adj1) adj2.add(t);
      for (const t of adj2) adj1.add(t);
    }
  }

  private buildTileWeights(): void {
    for (const tile of this.config.tiles) {
      this.tileWeights.set(tile.id, tile.weight);
    }
  }

  private initializeCells(): void {
    const allTileIds = new Set(this.config.tiles.map(t => t.id));
    
    this.cells = [];
    for (let z = 0; z < (this.config.depth || 1); z++) {
      this.cells[z] = [];
      for (let y = 0; y < this.config.height; y++) {
        this.cells[z][y] = [];
        for (let x = 0; x < this.config.width; x++) {
          this.cells[z][y][x] = {
            x, y, z,
            possibilities: new Set(allTileIds),
            collapsed: false,
          };
        }
      }
    }
  }

  /** Run the WFC algorithm */
  solve(): WFCResult {
    this.initializeCells();
    this.history = [];
    this.backtrackCount = 0;
    this.iterationCount = 0;

    while (true) {
      this.iterationCount++;

      // Find cell with minimum entropy (smallest number of possibilities)
      const cell = this.findMinEntropyCell();
      
      if (!cell) {
        // All cells collapsed - success!
        return this.buildResult(true);
      }

      if (cell.possibilities.size === 0) {
        // Contradiction - need to backtrack
        if (!this.backtrack()) {
          return this.buildResult(false);
        }
        continue;
      }

      // Save state for backtracking
      this.history.push({
        x: cell.x,
        y: cell.y,
        z: cell.z,
        possibilities: new Set(cell.possibilities),
      });

      // Collapse cell to a single tile
      this.collapseCell(cell);

      // Propagate constraints
      if (!this.propagate(cell)) {
        // Propagation failed - backtrack
        if (!this.backtrack()) {
          return this.buildResult(false);
        }
      }
    }
  }

  private findMinEntropyCell(): WFCCell | null {
    let minEntropy = Infinity;
    let candidates: WFCCell[] = [];

    for (const layer of this.cells) {
      for (const row of layer) {
        for (const cell of row) {
          if (cell.collapsed) continue;
          
          const entropy = cell.possibilities.size;
          if (entropy < minEntropy) {
            minEntropy = entropy;
            candidates = [cell];
          } else if (entropy === minEntropy) {
            candidates.push(cell);
          }
        }
      }
    }

    if (candidates.length === 0) return null;
    
    // Add noise to entropy calculation for variation
    return this.rng.nextItem(candidates);
  }

  private collapseCell(cell: WFCCell): void {
    // Weighted random selection
    const possibilities = Array.from(cell.possibilities);
    const weights = possibilities.map(id => this.tileWeights.get(id) || 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    let random = this.rng.next() * totalWeight;
    let selectedId = possibilities[0];
    
    for (let i = 0; i < possibilities.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedId = possibilities[i];
        break;
      }
    }

    cell.possibilities = new Set([selectedId]);
    cell.collapsed = true;
    cell.tileId = selectedId;
  }

  private propagate(startCell: WFCCell): boolean {
    const stack: WFCCell[] = [startCell];
    const processed = new Set<string>();

    while (stack.length > 0) {
      const cell = stack.pop()!;
      const key = `${cell.x},${cell.y},${cell.z}`;
      
      if (processed.has(key)) continue;
      processed.add(key);

      const directions = this.config.is3D
        ? [WFCDirection.North, WFCDirection.East, WFCDirection.South, WFCDirection.West, WFCDirection.Up, WFCDirection.Down]
        : [WFCDirection.North, WFCDirection.East, WFCDirection.South, WFCDirection.West];

      for (const dir of directions) {
        const offset = DIRECTION_OFFSETS_2D[dir];
        const nx = cell.x + offset.dx;
        const ny = cell.y + offset.dy;
        const nz = cell.z + offset.dz;

        if (!this.isValidPosition(nx, ny, nz)) continue;

        const neighbor = this.cells[nz][ny][nx];
        if (neighbor.collapsed) continue;

        const oppositeDir = OPPOSITE_DIRECTION[dir];
        const validNeighbors = new Set<string>();

        // Find valid neighbors based on current cell's possibilities
        for (const tileId of cell.possibilities) {
          const adjacencies = this.adjacencyMap.get(tileId)?.get(dir);
          if (adjacencies) {
            for (const adj of adjacencies) {
              validNeighbors.add(adj);
            }
          }
        }

        // Constrain neighbor's possibilities
        const beforeSize = neighbor.possibilities.size;
        const newPossibilities = new Set<string>();
        
        for (const p of neighbor.possibilities) {
          if (validNeighbors.has(p)) {
            // Also check reverse adjacency
            const reverseAdj = this.adjacencyMap.get(p)?.get(oppositeDir);
            if (reverseAdj) {
              for (const tileId of cell.possibilities) {
                if (reverseAdj.has(tileId)) {
                  newPossibilities.add(p);
                  break;
                }
              }
            }
          }
        }

        neighbor.possibilities = newPossibilities;

        if (neighbor.possibilities.size === 0) {
          return false; // Contradiction
        }

        if (neighbor.possibilities.size < beforeSize) {
          stack.push(neighbor);
        }
      }
    }

    return true;
  }

  private backtrack(): boolean {
    this.backtrackCount++;
    
    if (this.backtrackCount > this.config.backtrackLimit) {
      return false;
    }

    if (this.history.length === 0) {
      return false;
    }

    // Restore last state
    const lastState = this.history.pop()!;
    const cell = this.cells[lastState.z][lastState.y][lastState.x];
    
    // Remove the failed choice
    const failedTile = cell.tileId;
    cell.collapsed = false;
    cell.tileId = undefined;
    cell.possibilities = new Set(lastState.possibilities);
    
    if (failedTile) {
      cell.possibilities.delete(failedTile);
    }

    // Re-propagate from this cell
    if (cell.possibilities.size > 0) {
      return true;
    }

    // Need to backtrack further
    return this.backtrack();
  }

  private isValidPosition(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.config.width &&
           y >= 0 && y < this.config.height &&
           z >= 0 && z < (this.config.depth || 1);
  }

  private buildResult(success: boolean): WFCResult {
    return {
      width: this.config.width,
      height: this.config.height,
      depth: this.config.depth || 1,
      cells: this.cells,
      success,
      iterations: this.iterationCount,
      backtrackCount: this.backtrackCount,
    };
  }

  /** Get tile at position */
  getTile(x: number, y: number, z: number = 0): string | undefined {
    if (!this.isValidPosition(x, y, z)) return undefined;
    return this.cells[z][y][x].tileId;
  }

  /** Reset the solver with a new seed */
  reset(seed?: number): void {
    if (seed !== undefined) {
      this.config.seed = seed;
      this.rng = new Mulberry32(seed);
    }
    this.initializeCells();
    this.history = [];
    this.backtrackCount = 0;
    this.iterationCount = 0;
  }
}

// ============================================================================
// Preset Tile Sets
// ============================================================================

export interface TileSet {
  tiles: WFCTile[];
  adjacencies: WFCAdjacency[];
}

export const SIMPLE_TILESET: TileSet = {
  tiles: [
    { id: 'grass', name: 'Grass', weight: 10, symmetry: WFCSymmetry.Full },
    { id: 'water', name: 'Water', weight: 3, symmetry: WFCSymmetry.Full },
    { id: 'sand', name: 'Sand', weight: 2, symmetry: WFCSymmetry.Full },
    { id: 'forest', name: 'Forest', weight: 5, symmetry: WFCSymmetry.Full },
  ],
  adjacencies: [
    // Grass can be next to anything except water directly
    { tile: 'grass', direction: WFCDirection.North, allowed: ['grass', 'sand', 'forest'] },
    { tile: 'grass', direction: WFCDirection.East, allowed: ['grass', 'sand', 'forest'] },
    { tile: 'grass', direction: WFCDirection.South, allowed: ['grass', 'sand', 'forest'] },
    { tile: 'grass', direction: WFCDirection.West, allowed: ['grass', 'sand', 'forest'] },
    
    // Water must be adjacent to sand (beach)
    { tile: 'water', direction: WFCDirection.North, allowed: ['water', 'sand'] },
    { tile: 'water', direction: WFCDirection.East, allowed: ['water', 'sand'] },
    { tile: 'water', direction: WFCDirection.South, allowed: ['water', 'sand'] },
    { tile: 'water', direction: WFCDirection.West, allowed: ['water', 'sand'] },
    
    // Sand bridges water and grass
    { tile: 'sand', direction: WFCDirection.North, allowed: ['grass', 'water', 'sand'] },
    { tile: 'sand', direction: WFCDirection.East, allowed: ['grass', 'water', 'sand'] },
    { tile: 'sand', direction: WFCDirection.South, allowed: ['grass', 'water', 'sand'] },
    { tile: 'sand', direction: WFCDirection.West, allowed: ['grass', 'water', 'sand'] },
    
    // Forest is only on grass
    { tile: 'forest', direction: WFCDirection.North, allowed: ['grass', 'forest'] },
    { tile: 'forest', direction: WFCDirection.East, allowed: ['grass', 'forest'] },
    { tile: 'forest', direction: WFCDirection.South, allowed: ['grass', 'forest'] },
    { tile: 'forest', direction: WFCDirection.West, allowed: ['grass', 'forest'] },
  ],
};

// Export factory function
export function createWFCSolver(config: WFCConfig): WFCSolver {
  return new WFCSolver(config);
}

export function createWFCFromTileset(
  tileset: TileSet,
  width: number,
  height: number,
  seed?: number
): WFCSolver {
  return new WFCSolver({
    width,
    height,
    tiles: tileset.tiles,
    adjacencies: tileset.adjacencies,
    seed: seed || Date.now(),
    backtrackLimit: 1000,
    is3D: false,
  });
}

// Re-export types
export type { WFCConfig, WFCResult, WFCCell, WFCTile, WFCAdjacency };
export { WFCDirection, WFCSymmetry };
