/**
 * @holoscript/pcg - Dungeon Generation
 * BSP, random, and cellular automata dungeon generators
 */

import type { 
  DungeonConfig, 
  Dungeon, 
  Room, 
  Corridor, 
  DungeonTile,
  Vec2 
} from '../types';
import { RoomShape, RoomType, DungeonTileType } from '../types';
import { Mulberry32 } from '../noise';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_DUNGEON_CONFIG: DungeonConfig = {
  width: 64,
  height: 64,
  seed: 12345,
  minRooms: 5,
  maxRooms: 15,
  minRoomSize: 5,
  maxRoomSize: 12,
  corridorWidth: 2,
  algorithm: 'bsp',
  roomDensity: 0.5,
};

// ============================================================================
// BSP Node for Binary Space Partitioning
// ============================================================================

interface BSPNode {
  x: number;
  y: number;
  width: number;
  height: number;
  left?: BSPNode;
  right?: BSPNode;
  room?: Room;
}

// ============================================================================
// Dungeon Generator
// ============================================================================

export class DungeonGenerator {
  private config: DungeonConfig;
  private rng: Mulberry32;
  private rooms: Room[] = [];
  private corridors: Corridor[] = [];
  private tiles: DungeonTile[][] = [];
  private roomIdCounter = 0;
  private corridorIdCounter = 0;

  constructor(config: Partial<DungeonConfig> = {}) {
    this.config = { ...DEFAULT_DUNGEON_CONFIG, ...config };
    this.rng = new Mulberry32(this.config.seed);
  }

  /** Generate dungeon using configured algorithm */
  generate(): Dungeon {
    this.rooms = [];
    this.corridors = [];
    this.roomIdCounter = 0;
    this.corridorIdCounter = 0;
    this.initializeTiles();

    switch (this.config.algorithm) {
      case 'bsp':
        this.generateBSP();
        break;
      case 'random':
        this.generateRandom();
        break;
      case 'cellular':
        this.generateCellular();
        break;
    }

    this.assignRoomTypes();
    this.carveDungeon();

    return {
      width: this.config.width,
      height: this.config.height,
      rooms: this.rooms,
      corridors: this.corridors,
      tiles: this.tiles,
      startRoom: this.rooms.find(r => r.type === RoomType.Start)?.id || this.rooms[0]?.id || '',
      bossRoom: this.rooms.find(r => r.type === RoomType.Boss)?.id || this.rooms[this.rooms.length - 1]?.id || '',
    };
  }

  private initializeTiles(): void {
    this.tiles = [];
    for (let y = 0; y < this.config.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.config.width; x++) {
        this.tiles[y][x] = { type: DungeonTileType.Wall };
      }
    }
  }

  // ============================================================================
  // BSP Generation
  // ============================================================================

  private generateBSP(): void {
    const root: BSPNode = {
      x: 1,
      y: 1,
      width: this.config.width - 2,
      height: this.config.height - 2,
    };

    this.splitNode(root, 0, 4); // Max 4 splits = 16 potential rooms
    this.createRoomsInLeaves(root);
    this.connectBSPRooms(root);
  }

  private splitNode(node: BSPNode, depth: number, maxDepth: number): void {
    if (depth >= maxDepth) return;

    const minSize = this.config.minRoomSize * 2 + 2;
    const canSplitH = node.width >= minSize;
    const canSplitV = node.height >= minSize;

    if (!canSplitH && !canSplitV) return;

    let splitHorizontally: boolean;
    if (!canSplitH) splitHorizontally = true;
    else if (!canSplitV) splitHorizontally = false;
    else splitHorizontally = this.rng.nextBool(node.height > node.width ? 0.7 : 0.3);

    if (splitHorizontally) {
      const splitY = this.rng.nextInt(
        node.y + this.config.minRoomSize + 1,
        node.y + node.height - this.config.minRoomSize - 1
      );
      
      node.left = { x: node.x, y: node.y, width: node.width, height: splitY - node.y };
      node.right = { x: node.x, y: splitY, width: node.width, height: node.y + node.height - splitY };
    } else {
      const splitX = this.rng.nextInt(
        node.x + this.config.minRoomSize + 1,
        node.x + node.width - this.config.minRoomSize - 1
      );
      
      node.left = { x: node.x, y: node.y, width: splitX - node.x, height: node.height };
      node.right = { x: splitX, y: node.y, width: node.x + node.width - splitX, height: node.height };
    }

    this.splitNode(node.left, depth + 1, maxDepth);
    this.splitNode(node.right, depth + 1, maxDepth);
  }

  private createRoomsInLeaves(node: BSPNode): void {
    if (node.left || node.right) {
      if (node.left) this.createRoomsInLeaves(node.left);
      if (node.right) this.createRoomsInLeaves(node.right);
      return;
    }

    // Create room in leaf
    const roomWidth = this.rng.nextInt(
      this.config.minRoomSize,
      Math.min(this.config.maxRoomSize, node.width - 2)
    );
    const roomHeight = this.rng.nextInt(
      this.config.minRoomSize,
      Math.min(this.config.maxRoomSize, node.height - 2)
    );

    const roomX = this.rng.nextInt(node.x + 1, node.x + node.width - roomWidth - 1);
    const roomY = this.rng.nextInt(node.y + 1, node.y + node.height - roomHeight - 1);

    const room: Room = {
      id: `room_${this.roomIdCounter++}`,
      x: roomX,
      y: roomY,
      width: roomWidth,
      height: roomHeight,
      shape: RoomShape.Rectangle,
      type: RoomType.Normal,
      connections: [],
      doors: [],
    };

    node.room = room;
    this.rooms.push(room);
  }

  private connectBSPRooms(node: BSPNode): Room | undefined {
    if (!node.left && !node.right) return node.room;

    const leftRoom = node.left ? this.connectBSPRooms(node.left) : undefined;
    const rightRoom = node.right ? this.connectBSPRooms(node.right) : undefined;

    if (leftRoom && rightRoom) {
      this.createCorridor(leftRoom, rightRoom);
    }

    return leftRoom || rightRoom;
  }

  // ============================================================================
  // Random Placement Generation
  // ============================================================================

  private generateRandom(): void {
    const attempts = this.config.maxRooms * 10;
    
    for (let i = 0; i < attempts && this.rooms.length < this.config.maxRooms; i++) {
      const width = this.rng.nextInt(this.config.minRoomSize, this.config.maxRoomSize);
      const height = this.rng.nextInt(this.config.minRoomSize, this.config.maxRoomSize);
      const x = this.rng.nextInt(1, this.config.width - width - 1);
      const y = this.rng.nextInt(1, this.config.height - height - 1);

      if (!this.roomOverlaps(x, y, width, height)) {
        const room: Room = {
          id: `room_${this.roomIdCounter++}`,
          x, y, width, height,
          shape: RoomShape.Rectangle,
          type: RoomType.Normal,
          connections: [],
          doors: [],
        };
        this.rooms.push(room);
      }
    }

    // Connect rooms with minimum spanning tree
    this.connectRoomsMST();
  }

  private roomOverlaps(x: number, y: number, width: number, height: number): boolean {
    const padding = 2;
    for (const room of this.rooms) {
      if (
        x - padding < room.x + room.width &&
        x + width + padding > room.x &&
        y - padding < room.y + room.height &&
        y + height + padding > room.y
      ) {
        return true;
      }
    }
    return false;
  }

  private connectRoomsMST(): void {
    if (this.rooms.length < 2) return;

    const connected = new Set<string>([this.rooms[0].id]);
    const edges: { from: Room; to: Room; dist: number }[] = [];

    // Build all edges
    for (let i = 0; i < this.rooms.length; i++) {
      for (let j = i + 1; j < this.rooms.length; j++) {
        const dist = this.roomDistance(this.rooms[i], this.rooms[j]);
        edges.push({ from: this.rooms[i], to: this.rooms[j], dist });
      }
    }

    edges.sort((a, b) => a.dist - b.dist);

    while (connected.size < this.rooms.length) {
      for (const edge of edges) {
        const fromIn = connected.has(edge.from.id);
        const toIn = connected.has(edge.to.id);

        if (fromIn !== toIn) {
          this.createCorridor(edge.from, edge.to);
          connected.add(edge.from.id);
          connected.add(edge.to.id);
          break;
        }
      }
    }

    // Add some extra connections for loops
    const extraConnections = Math.floor(this.rooms.length * 0.2);
    for (let i = 0; i < extraConnections; i++) {
      const edge = this.rng.nextItem(edges);
      if (!edge.from.connections.includes(edge.to.id)) {
        this.createCorridor(edge.from, edge.to);
      }
    }
  }

  // ============================================================================
  // Cellular Automata Generation
  // ============================================================================

  private generateCellular(): void {
    // Initialize with random floor/wall
    for (let y = 1; y < this.config.height - 1; y++) {
      for (let x = 1; x < this.config.width - 1; x++) {
        if (this.rng.nextBool(this.config.roomDensity)) {
          this.tiles[y][x] = { type: DungeonTileType.Floor };
        }
      }
    }

    // Apply cellular automata rules
    for (let iteration = 0; iteration < 5; iteration++) {
      const newTiles: DungeonTile[][] = [];
      for (let y = 0; y < this.config.height; y++) {
        newTiles[y] = [];
        for (let x = 0; x < this.config.width; x++) {
          if (x === 0 || y === 0 || x === this.config.width - 1 || y === this.config.height - 1) {
            newTiles[y][x] = { type: DungeonTileType.Wall };
            continue;
          }

          const walls = this.countAdjacentWalls(x, y);
          newTiles[y][x] = walls >= 5 
            ? { type: DungeonTileType.Wall }
            : { type: DungeonTileType.Floor };
        }
      }
      this.tiles = newTiles;
    }

    // Flood fill to find rooms
    this.floodFillRooms();

    // Connect isolated regions
    if (this.rooms.length > 1) {
      this.connectRoomsMST();
    }
  }

  private countAdjacentWalls(x: number, y: number): number {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= this.config.width || ny >= this.config.height) {
          count++;
        } else if (this.tiles[ny][nx].type === DungeonTileType.Wall) {
          count++;
        }
      }
    }
    return count;
  }

  private floodFillRooms(): void {
    const visited = new Set<string>();
    
    for (let y = 1; y < this.config.height - 1; y++) {
      for (let x = 1; x < this.config.width - 1; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        if (this.tiles[y][x].type !== DungeonTileType.Floor) continue;

        const region: Vec2[] = [];
        const stack: Vec2[] = [{ x, y }];

        while (stack.length > 0) {
          const pos = stack.pop()!;
          const pkey = `${pos.x},${pos.y}`;
          if (visited.has(pkey)) continue;
          visited.add(pkey);

          if (this.tiles[pos.y]?.[pos.x]?.type !== DungeonTileType.Floor) continue;
          region.push(pos);

          stack.push({ x: pos.x + 1, y: pos.y });
          stack.push({ x: pos.x - 1, y: pos.y });
          stack.push({ x: pos.x, y: pos.y + 1 });
          stack.push({ x: pos.x, y: pos.y - 1 });
        }

        if (region.length >= this.config.minRoomSize * this.config.minRoomSize) {
          // Calculate bounding box
          const minX = Math.min(...region.map(p => p.x));
          const maxX = Math.max(...region.map(p => p.x));
          const minY = Math.min(...region.map(p => p.y));
          const maxY = Math.max(...region.map(p => p.y));

          const room: Room = {
            id: `room_${this.roomIdCounter++}`,
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            shape: RoomShape.Irregular,
            type: RoomType.Normal,
            connections: [],
            doors: [],
          };

          this.rooms.push(room);
        }
      }
    }
  }

  // ============================================================================
  // Corridor Generation
  // ============================================================================

  private createCorridor(from: Room, to: Room): void {
    const fromCenter = this.getRoomCenter(from);
    const toCenter = this.getRoomCenter(to);

    const points: Vec2[] = [fromCenter];

    // L-shaped corridor
    if (this.rng.nextBool()) {
      points.push({ x: toCenter.x, y: fromCenter.y });
    } else {
      points.push({ x: fromCenter.x, y: toCenter.y });
    }
    points.push(toCenter);

    const corridor: Corridor = {
      id: `corridor_${this.corridorIdCounter++}`,
      from: from.id,
      to: to.id,
      points,
      width: this.config.corridorWidth,
    };

    this.corridors.push(corridor);
    from.connections.push(to.id);
    to.connections.push(from.id);

    // Add door positions
    from.doors.push(points[0]);
    to.doors.push(points[points.length - 1]);
  }

  private getRoomCenter(room: Room): Vec2 {
    return {
      x: Math.floor(room.x + room.width / 2),
      y: Math.floor(room.y + room.height / 2),
    };
  }

  private roomDistance(a: Room, b: Room): number {
    const ac = this.getRoomCenter(a);
    const bc = this.getRoomCenter(b);
    return Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y);
  }

  // ============================================================================
  // Tile Carving
  // ============================================================================

  private carveDungeon(): void {
    // Carve rooms
    for (const room of this.rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          if (y >= 0 && y < this.config.height && x >= 0 && x < this.config.width) {
            this.tiles[y][x] = { type: DungeonTileType.Floor, roomId: room.id };
          }
        }
      }
    }

    // Carve corridors
    for (const corridor of this.corridors) {
      for (let i = 0; i < corridor.points.length - 1; i++) {
        this.carveLine(
          corridor.points[i],
          corridor.points[i + 1],
          corridor.width,
          corridor.id
        );
      }
    }

    // Mark doors
    for (const room of this.rooms) {
      for (const door of room.doors) {
        if (door.y >= 0 && door.y < this.config.height && door.x >= 0 && door.x < this.config.width) {
          this.tiles[door.y][door.x] = { type: DungeonTileType.Door, roomId: room.id };
        }
      }
    }
  }

  private carveLine(from: Vec2, to: Vec2, width: number, corridorId: string): void {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    let x = from.x;
    let y = from.y;

    while (true) {
      for (let w = -Math.floor(width / 2); w <= Math.floor(width / 2); w++) {
        const cx = dx === 0 ? x + w : x;
        const cy = dy === 0 ? y + w : y;
        
        if (cy >= 0 && cy < this.config.height && cx >= 0 && cx < this.config.width) {
          if (this.tiles[cy][cx].type === DungeonTileType.Wall) {
            this.tiles[cy][cx] = { type: DungeonTileType.Corridor, corridorId };
          }
        }
      }

      if (x === to.x && y === to.y) break;
      if (x !== to.x) x += dx;
      if (y !== to.y) y += dy;
    }
  }

  // ============================================================================
  // Room Type Assignment
  // ============================================================================

  private assignRoomTypes(): void {
    if (this.rooms.length === 0) return;

    // Find rooms furthest apart for start and boss
    let maxDist = 0;
    let startIdx = 0;
    let bossIdx = this.rooms.length - 1;

    for (let i = 0; i < this.rooms.length; i++) {
      for (let j = i + 1; j < this.rooms.length; j++) {
        const dist = this.roomDistance(this.rooms[i], this.rooms[j]);
        if (dist > maxDist) {
          maxDist = dist;
          startIdx = i;
          bossIdx = j;
        }
      }
    }

    this.rooms[startIdx].type = RoomType.Start;
    this.rooms[bossIdx].type = RoomType.Boss;

    // Assign treasure and secret rooms
    const treasureCount = Math.floor(this.rooms.length * 0.15);
    const secretCount = Math.floor(this.rooms.length * 0.1);

    const candidates = this.rooms.filter(
      (_, i) => i !== startIdx && i !== bossIdx
    );

    this.rng.shuffle(candidates);

    for (let i = 0; i < treasureCount && i < candidates.length; i++) {
      candidates[i].type = RoomType.Treasure;
    }

    for (let i = treasureCount; i < treasureCount + secretCount && i < candidates.length; i++) {
      candidates[i].type = RoomType.Secret;
    }
  }
}

// Export factory function
export function createDungeonGenerator(config?: Partial<DungeonConfig>): DungeonGenerator {
  return new DungeonGenerator(config);
}

// Re-export types
export type { DungeonConfig, Dungeon, Room, Corridor, DungeonTile, Vec2 };
export { RoomShape, RoomType, DungeonTileType };
