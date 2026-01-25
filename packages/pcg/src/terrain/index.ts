/**
 * @holoscript/pcg - Terrain Generation
 * Heightmaps, erosion simulation, biome assignment
 */

import type { 
  TerrainConfig, 
  Heightmap, 
  TerrainPoint, 
  BiomeDefinition,
  Vec3,
  NoiseConfig 
} from '../types';
import { BiomeType, NoiseType, DEFAULT_NOISE_CONFIG } from '../types';
import { PerlinNoise, SimplexNoise, Mulberry32 } from '../noise';

// ============================================================================
// Default Biome Definitions
// ============================================================================

export const DEFAULT_BIOMES: BiomeDefinition[] = [
  { type: BiomeType.Ocean, minHeight: 0, maxHeight: 0.3, minMoisture: 0, maxMoisture: 1, minTemperature: 0, maxTemperature: 1, color: '#1a5276' },
  { type: BiomeType.Beach, minHeight: 0.3, maxHeight: 0.35, minMoisture: 0, maxMoisture: 1, minTemperature: 0.2, maxTemperature: 1, color: '#f9e79f' },
  { type: BiomeType.Desert, minHeight: 0.35, maxHeight: 0.6, minMoisture: 0, maxMoisture: 0.2, minTemperature: 0.6, maxTemperature: 1, color: '#d4ac0d' },
  { type: BiomeType.Plains, minHeight: 0.35, maxHeight: 0.5, minMoisture: 0.2, maxMoisture: 0.5, minTemperature: 0.3, maxTemperature: 0.7, color: '#82e0aa' },
  { type: BiomeType.Forest, minHeight: 0.4, maxHeight: 0.6, minMoisture: 0.4, maxMoisture: 0.8, minTemperature: 0.3, maxTemperature: 0.7, color: '#196f3d' },
  { type: BiomeType.Jungle, minHeight: 0.35, maxHeight: 0.55, minMoisture: 0.7, maxMoisture: 1, minTemperature: 0.7, maxTemperature: 1, color: '#0b5345' },
  { type: BiomeType.Swamp, minHeight: 0.3, maxHeight: 0.4, minMoisture: 0.8, maxMoisture: 1, minTemperature: 0.4, maxTemperature: 0.8, color: '#5d6d7e' },
  { type: BiomeType.Tundra, minHeight: 0.35, maxHeight: 0.6, minMoisture: 0.2, maxMoisture: 0.6, minTemperature: 0, maxTemperature: 0.3, color: '#aeb6bf' },
  { type: BiomeType.Mountain, minHeight: 0.6, maxHeight: 0.8, minMoisture: 0, maxMoisture: 1, minTemperature: 0, maxTemperature: 1, color: '#7b7d7d' },
  { type: BiomeType.Snow, minHeight: 0.8, maxHeight: 1, minMoisture: 0, maxMoisture: 1, minTemperature: 0, maxTemperature: 1, color: '#fdfefe' },
];

// ============================================================================
// Default Terrain Configuration
// ============================================================================

export const DEFAULT_TERRAIN_CONFIG: TerrainConfig = {
  width: 256,
  height: 256,
  seed: 12345,
  heightNoise: { ...DEFAULT_NOISE_CONFIG, type: NoiseType.Simplex, octaves: 6, persistence: 0.5, frequency: 0.01 },
  moistureNoise: { ...DEFAULT_NOISE_CONFIG, type: NoiseType.Perlin, octaves: 4, persistence: 0.6, frequency: 0.02, seed: 54321 },
  temperatureNoise: { ...DEFAULT_NOISE_CONFIG, type: NoiseType.Perlin, octaves: 3, persistence: 0.5, frequency: 0.015, seed: 98765 },
  erosionIterations: 50000,
  erosionStrength: 0.3,
};

// ============================================================================
// Terrain Generator
// ============================================================================

export class TerrainGenerator {
  private config: TerrainConfig;
  private heightNoise: SimplexNoise;
  private moistureNoise: PerlinNoise;
  private temperatureNoise: PerlinNoise;
  private rng: Mulberry32;
  private biomes: BiomeDefinition[];

  constructor(config: Partial<TerrainConfig> = {}, biomes: BiomeDefinition[] = DEFAULT_BIOMES) {
    this.config = { ...DEFAULT_TERRAIN_CONFIG, ...config };
    this.heightNoise = new SimplexNoise(this.config.heightNoise);
    this.moistureNoise = new PerlinNoise(this.config.moistureNoise);
    this.temperatureNoise = new PerlinNoise(this.config.temperatureNoise);
    this.rng = new Mulberry32(this.config.seed);
    this.biomes = biomes;
  }

  /** Generate base heightmap */
  generateHeightmap(): Heightmap {
    const { width, height } = this.config;
    const data = new Float32Array(width * height);
    let min = Infinity;
    let max = -Infinity;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = (this.heightNoise.fbm2D(x, y) + 1) / 2; // Normalize to 0-1
        data[y * width + x] = value;
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    // Normalize to 0-1 range
    const range = max - min || 1;
    for (let i = 0; i < data.length; i++) {
      data[i] = (data[i] - min) / range;
    }

    return { width, height, data, min: 0, max: 1 };
  }

  /** Apply hydraulic erosion simulation */
  applyErosion(heightmap: Heightmap): Heightmap {
    const { width, height, data } = heightmap;
    const eroded = new Float32Array(data);

    const inertia = 0.05;
    const sedimentCapacityFactor = 4;
    const minSedimentCapacity = 0.01;
    const erosionRate = 0.3 * this.config.erosionStrength;
    const depositRate = 0.3;
    const evaporateRate = 0.01;
    const gravity = 4;
    const maxDropletLifetime = 30;

    const getHeight = (x: number, y: number): number => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      if (xi < 0 || xi >= width - 1 || yi < 0 || yi >= height - 1) return 0;
      
      const fx = x - xi;
      const fy = y - yi;
      
      const h00 = eroded[yi * width + xi];
      const h10 = eroded[yi * width + xi + 1];
      const h01 = eroded[(yi + 1) * width + xi];
      const h11 = eroded[(yi + 1) * width + xi + 1];
      
      return h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy;
    };

    const getGradient = (x: number, y: number): { x: number; y: number } => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      if (xi < 1 || xi >= width - 1 || yi < 1 || yi >= height - 1) {
        return { x: 0, y: 0 };
      }

      const hl = eroded[yi * width + xi - 1];
      const hr = eroded[yi * width + xi + 1];
      const hd = eroded[(yi - 1) * width + xi];
      const hu = eroded[(yi + 1) * width + xi];

      return { x: (hl - hr) / 2, y: (hd - hu) / 2 };
    };

    // Simulate droplets
    for (let i = 0; i < this.config.erosionIterations; i++) {
      let x = this.rng.nextFloat(1, width - 2);
      let y = this.rng.nextFloat(1, height - 2);
      let dirX = 0;
      let dirY = 0;
      let speed = 1;
      let water = 1;
      let sediment = 0;

      for (let lifetime = 0; lifetime < maxDropletLifetime; lifetime++) {
        const xi = Math.floor(x);
        const yi = Math.floor(y);

        if (xi < 1 || xi >= width - 1 || yi < 1 || yi >= height - 1) break;

        const gradient = getGradient(x, y);
        const oldHeight = getHeight(x, y);

        // Update direction with inertia
        dirX = dirX * inertia - gradient.x * (1 - inertia);
        dirY = dirY * inertia - gradient.y * (1 - inertia);

        const len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len > 0) {
          dirX /= len;
          dirY /= len;
        }

        const newX = x + dirX;
        const newY = y + dirY;

        if (newX < 1 || newX >= width - 1 || newY < 1 || newY >= height - 1) break;

        const newHeight = getHeight(newX, newY);
        const heightDiff = newHeight - oldHeight;

        // Calculate sediment capacity
        const sedimentCapacity = Math.max(
          -heightDiff * speed * water * sedimentCapacityFactor,
          minSedimentCapacity
        );

        if (sediment > sedimentCapacity || heightDiff > 0) {
          // Deposit sediment
          const deposit = heightDiff > 0
            ? Math.min(heightDiff, sediment)
            : (sediment - sedimentCapacity) * depositRate;
          
          sediment -= deposit;
          eroded[yi * width + xi] += deposit;
        } else {
          // Erode
          const erosion = Math.min((sedimentCapacity - sediment) * erosionRate, -heightDiff);
          
          for (let ey = -1; ey <= 1; ey++) {
            for (let ex = -1; ex <= 1; ex++) {
              const idx = (yi + ey) * width + (xi + ex);
              if (idx >= 0 && idx < eroded.length) {
                eroded[idx] -= erosion / 9;
              }
            }
          }
          sediment += erosion;
        }

        // Update droplet
        x = newX;
        y = newY;
        speed = Math.sqrt(speed * speed + heightDiff * gravity);
        water *= (1 - evaporateRate);
      }
    }

    // Normalize
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < eroded.length; i++) {
      min = Math.min(min, eroded[i]);
      max = Math.max(max, eroded[i]);
    }
    const range = max - min || 1;
    for (let i = 0; i < eroded.length; i++) {
      eroded[i] = (eroded[i] - min) / range;
    }

    return { width, height, data: eroded, min: 0, max: 1 };
  }

  /** Generate moisture map */
  generateMoistureMap(): Float32Array {
    const { width, height } = this.config;
    const data = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        data[y * width + x] = (this.moistureNoise.fbm2D(x, y) + 1) / 2;
      }
    }

    return data;
  }

  /** Generate temperature map */
  generateTemperatureMap(heightmap: Heightmap): Float32Array {
    const { width, height } = this.config;
    const data = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      // Base temperature decreases toward poles (assuming y=0 and y=height are poles)
      const latitude = Math.abs(y / height - 0.5) * 2; // 0 at equator, 1 at poles
      const baseTemp = 1 - latitude * 0.6;

      for (let x = 0; x < width; x++) {
        const h = heightmap.data[y * width + x];
        const noiseTemp = (this.temperatureNoise.fbm2D(x, y) + 1) / 2;
        
        // Higher altitude = colder
        const altitudeEffect = h > 0.5 ? (h - 0.5) * 0.8 : 0;
        
        data[y * width + x] = Math.max(0, Math.min(1, baseTemp * 0.6 + noiseTemp * 0.4 - altitudeEffect));
      }
    }

    return data;
  }

  /** Determine biome at a point */
  getBiome(height: number, moisture: number, temperature: number): BiomeType {
    for (const biome of this.biomes) {
      if (
        height >= biome.minHeight && height <= biome.maxHeight &&
        moisture >= biome.minMoisture && moisture <= biome.maxMoisture &&
        temperature >= biome.minTemperature && temperature <= biome.maxTemperature
      ) {
        return biome.type;
      }
    }
    return BiomeType.Plains;
  }

  /** Calculate surface normal */
  calculateNormal(heightmap: Heightmap, x: number, y: number): Vec3 {
    const { width, height, data } = heightmap;
    
    const getH = (px: number, py: number): number => {
      px = Math.max(0, Math.min(width - 1, px));
      py = Math.max(0, Math.min(height - 1, py));
      return data[py * width + px];
    };

    const scale = 10; // Height scale for normal calculation
    const hl = getH(x - 1, y);
    const hr = getH(x + 1, y);
    const hd = getH(x, y - 1);
    const hu = getH(x, y + 1);

    const nx = (hl - hr) * scale;
    const ny = 2;
    const nz = (hd - hu) * scale;

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return { x: nx / len, y: ny / len, z: nz / len };
  }

  /** Generate complete terrain data */
  generateTerrain(): {
    heightmap: Heightmap;
    moisture: Float32Array;
    temperature: Float32Array;
    biomes: BiomeType[][];
    getPoint: (x: number, y: number) => TerrainPoint;
  } {
    let heightmap = this.generateHeightmap();
    
    if (this.config.erosionIterations > 0) {
      heightmap = this.applyErosion(heightmap);
    }

    const moisture = this.generateMoistureMap();
    const temperature = this.generateTemperatureMap(heightmap);
    
    const { width, height } = this.config;
    const biomeGrid: BiomeType[][] = [];

    for (let y = 0; y < height; y++) {
      biomeGrid[y] = [];
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        biomeGrid[y][x] = this.getBiome(
          heightmap.data[idx],
          moisture[idx],
          temperature[idx]
        );
      }
    }

    const getPoint = (x: number, y: number): TerrainPoint => {
      const xi = Math.floor(x);
      const yi = Math.floor(y);
      const idx = yi * width + xi;

      return {
        height: heightmap.data[idx] || 0,
        moisture: moisture[idx] || 0,
        temperature: temperature[idx] || 0,
        biome: biomeGrid[yi]?.[xi] || BiomeType.Plains,
        normal: this.calculateNormal(heightmap, xi, yi),
      };
    };

    return { heightmap, moisture, temperature, biomes: biomeGrid, getPoint };
  }
}

// Export factory function
export function createTerrainGenerator(
  config?: Partial<TerrainConfig>,
  biomes?: BiomeDefinition[]
): TerrainGenerator {
  return new TerrainGenerator(config, biomes);
}

// Re-export types
export type { TerrainConfig, Heightmap, TerrainPoint, BiomeDefinition };
export { BiomeType };
