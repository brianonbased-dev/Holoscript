/**
 * @holoscript/pcg - Noise Generators
 * Perlin, Simplex, Worley, Value, and White noise with seeded RNG
 */

import type { NoiseConfig, SeededRandom, Vec2, Vec3 } from '../types';
import { NoiseType, DEFAULT_NOISE_CONFIG } from '../types';

// ============================================================================
// Seeded Random Number Generator (Mulberry32)
// ============================================================================

export class Mulberry32 implements SeededRandom {
  private _seed: number;
  private state: number;

  constructor(seed: number = Date.now()) {
    this._seed = seed;
    this.state = seed;
  }

  get seed(): number {
    return this._seed;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  nextItem<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  nextGaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stddev + mean;
  }

  reset(): void {
    this.state = this._seed;
  }
}

// ============================================================================
// Gradient Tables
// ============================================================================

const GRAD3: Vec3[] = [
  { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
  { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
  { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 },
];

const GRAD2: Vec2[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
  { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: -1 },
];

// ============================================================================
// Base Noise Class
// ============================================================================

export abstract class NoiseGenerator {
  protected config: NoiseConfig;
  protected rng: SeededRandom;
  protected permutation: Uint8Array;

  constructor(config: Partial<NoiseConfig> = {}) {
    this.config = { ...DEFAULT_NOISE_CONFIG, ...config };
    this.rng = new Mulberry32(this.config.seed);
    this.permutation = this.generatePermutation();
  }

  protected generatePermutation(): Uint8Array {
    const p = new Uint8Array(512);
    const base: number[] = [];
    for (let i = 0; i < 256; i++) base.push(i);
    
    // Fisher-Yates shuffle with seeded RNG
    for (let i = 255; i > 0; i--) {
      const j = this.rng.nextInt(0, i);
      [base[i], base[j]] = [base[j], base[i]];
    }
    
    for (let i = 0; i < 256; i++) {
      p[i] = base[i];
      p[i + 256] = base[i];
    }
    
    return p;
  }

  abstract noise2D(x: number, y: number): number;
  abstract noise3D(x: number, y: number, z: number): number;

  /** Get noise with octaves (fBm) */
  fbm2D(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;
    let maxValue = 0;

    for (let i = 0; i < this.config.octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value / maxValue;
  }

  fbm3D(x: number, y: number, z: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;
    let maxValue = 0;

    for (let i = 0; i < this.config.octaves; i++) {
      value += amplitude * this.noise3D(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= this.config.persistence;
      frequency *= this.config.lacunarity;
    }

    return value / maxValue;
  }

  /** Ridged multi-fractal noise */
  ridged2D(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;
    let weight = 1;

    for (let i = 0; i < this.config.octaves; i++) {
      let signal = this.noise2D(x * frequency, y * frequency);
      signal = 1.0 - Math.abs(signal);
      signal *= signal * weight;
      weight = Math.min(1, Math.max(0, signal * 2));
      value += signal * amplitude;
      frequency *= this.config.lacunarity;
      amplitude *= this.config.persistence;
    }

    return value;
  }

  /** Turbulence noise */
  turbulence2D(x: number, y: number): number {
    let value = 0;
    let amplitude = this.config.amplitude;
    let frequency = this.config.frequency;

    for (let i = 0; i < this.config.octaves; i++) {
      value += amplitude * Math.abs(this.noise2D(x * frequency, y * frequency));
      frequency *= this.config.lacunarity;
      amplitude *= this.config.persistence;
    }

    return value;
  }
}

// ============================================================================
// Perlin Noise
// ============================================================================

export class PerlinNoise extends NoiseGenerator {
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad2D(hash: number, x: number, y: number): number {
    const g = GRAD2[hash & 7];
    return g.x * x + g.y * y;
  }

  private grad3D(hash: number, x: number, y: number, z: number): number {
    const g = GRAD3[hash % 12];
    return g.x * x + g.y * y + g.z * z;
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const p = this.permutation;
    const A = p[X] + Y;
    const B = p[X + 1] + Y;

    return this.lerp(
      this.lerp(this.grad2D(p[A], x, y), this.grad2D(p[B], x - 1, y), u),
      this.lerp(this.grad2D(p[A + 1], x, y - 1), this.grad2D(p[B + 1], x - 1, y - 1), u),
      v
    );
  }

  noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const p = this.permutation;
    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.grad3D(p[AA], x, y, z), this.grad3D(p[BA], x - 1, y, z), u),
        this.lerp(this.grad3D(p[AB], x, y - 1, z), this.grad3D(p[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad3D(p[AA + 1], x, y, z - 1), this.grad3D(p[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad3D(p[AB + 1], x, y - 1, z - 1), this.grad3D(p[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

// ============================================================================
// Simplex Noise
// ============================================================================

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;

export class SimplexNoise extends NoiseGenerator {
  noise2D(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1: number, j1: number;
    if (x0 > y0) {
      i1 = 1; j1 = 0;
    } else {
      i1 = 0; j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const p = this.permutation;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = p[ii + p[jj]] % 12;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0].x * x0 + GRAD3[gi0].y * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = p[ii + i1 + p[jj + j1]] % 12;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1].x * x1 + GRAD3[gi1].y * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = p[ii + 1 + p[jj + 1]] % 12;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2].x * x2 + GRAD3[gi2].y * y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  noise3D(x: number, y: number, z: number): number {
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
      } else {
        i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
      } else {
        i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const p = this.permutation;

    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      const gi0 = p[ii + p[jj + p[kk]]] % 12;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0].x * x0 + GRAD3[gi0].y * y0 + GRAD3[gi0].z * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      const gi1 = p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1].x * x1 + GRAD3[gi1].y * y1 + GRAD3[gi1].z * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      const gi2 = p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2].x * x2 + GRAD3[gi2].y * y2 + GRAD3[gi2].z * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      const gi3 = p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12;
      t3 *= t3;
      n3 = t3 * t3 * (GRAD3[gi3].x * x3 + GRAD3[gi3].y * y3 + GRAD3[gi3].z * z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  }
}

// ============================================================================
// Worley (Cellular) Noise
// ============================================================================

export class WorleyNoise extends NoiseGenerator {
  private featurePoints: Map<string, Vec3[]> = new Map();

  private getFeaturePoints(cx: number, cy: number, cz: number): Vec3[] {
    const key = `${cx},${cy},${cz}`;
    if (this.featurePoints.has(key)) {
      return this.featurePoints.get(key)!;
    }

    // Generate 1-4 feature points per cell
    const rng = new Mulberry32(this.config.seed + cx * 31337 + cy * 7919 + cz * 6553);
    const count = rng.nextInt(1, 4);
    const points: Vec3[] = [];

    for (let i = 0; i < count; i++) {
      points.push({
        x: cx + rng.next(),
        y: cy + rng.next(),
        z: cz + rng.next(),
      });
    }

    this.featurePoints.set(key, points);
    return points;
  }

  noise2D(x: number, y: number): number {
    const cx = Math.floor(x);
    const cy = Math.floor(y);

    let minDist = Infinity;
    let secondDist = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const points = this.getFeaturePoints(cx + dx, cy + dy, 0);
        for (const p of points) {
          const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
          if (dist < minDist) {
            secondDist = minDist;
            minDist = dist;
          } else if (dist < secondDist) {
            secondDist = dist;
          }
        }
      }
    }

    // Return F1 (closest) normalized to roughly -1 to 1
    return minDist * 2 - 1;
  }

  noise3D(x: number, y: number, z: number): number {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    const cz = Math.floor(z);

    let minDist = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const points = this.getFeaturePoints(cx + dx, cy + dy, cz + dz);
          for (const p of points) {
            const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2 + (z - p.z) ** 2);
            if (dist < minDist) {
              minDist = dist;
            }
          }
        }
      }
    }

    return minDist * 2 - 1;
  }

  /** Get F2-F1 (cellular pattern) */
  cellularF2F1_2D(x: number, y: number): number {
    const cx = Math.floor(x);
    const cy = Math.floor(y);

    let minDist = Infinity;
    let secondDist = Infinity;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const points = this.getFeaturePoints(cx + dx, cy + dy, 0);
        for (const p of points) {
          const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2);
          if (dist < minDist) {
            secondDist = minDist;
            minDist = dist;
          } else if (dist < secondDist) {
            secondDist = dist;
          }
        }
      }
    }

    return (secondDist - minDist);
  }
}

// ============================================================================
// Value Noise
// ============================================================================

export class ValueNoise extends NoiseGenerator {
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  noise2D(x: number, y: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const sx = this.smoothstep(x - x0);
    const sy = this.smoothstep(y - y0);

    const p = this.permutation;
    const n00 = (p[(x0 & 255) + p[y0 & 255]] / 255) * 2 - 1;
    const n10 = (p[(x1 & 255) + p[y0 & 255]] / 255) * 2 - 1;
    const n01 = (p[(x0 & 255) + p[y1 & 255]] / 255) * 2 - 1;
    const n11 = (p[(x1 & 255) + p[y1 & 255]] / 255) * 2 - 1;

    const nx0 = this.lerp(n00, n10, sx);
    const nx1 = this.lerp(n01, n11, sx);

    return this.lerp(nx0, nx1, sy);
  }

  noise3D(x: number, y: number, z: number): number {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const z0 = Math.floor(z);

    const sx = this.smoothstep(x - x0);
    const sy = this.smoothstep(y - y0);
    const sz = this.smoothstep(z - z0);

    const p = this.permutation;
    const getValue = (ix: number, iy: number, iz: number): number => {
      return (p[(ix & 255) + p[(iy & 255) + p[iz & 255]]] / 255) * 2 - 1;
    };

    const n000 = getValue(x0, y0, z0);
    const n100 = getValue(x0 + 1, y0, z0);
    const n010 = getValue(x0, y0 + 1, z0);
    const n110 = getValue(x0 + 1, y0 + 1, z0);
    const n001 = getValue(x0, y0, z0 + 1);
    const n101 = getValue(x0 + 1, y0, z0 + 1);
    const n011 = getValue(x0, y0 + 1, z0 + 1);
    const n111 = getValue(x0 + 1, y0 + 1, z0 + 1);

    const nx00 = this.lerp(n000, n100, sx);
    const nx10 = this.lerp(n010, n110, sx);
    const nx01 = this.lerp(n001, n101, sx);
    const nx11 = this.lerp(n011, n111, sx);

    const nxy0 = this.lerp(nx00, nx10, sy);
    const nxy1 = this.lerp(nx01, nx11, sy);

    return this.lerp(nxy0, nxy1, sz);
  }
}

// ============================================================================
// White Noise
// ============================================================================

export class WhiteNoise extends NoiseGenerator {
  noise2D(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const rng = new Mulberry32(this.config.seed + ix * 12345 + iy * 67890);
    return rng.next() * 2 - 1;
  }

  noise3D(x: number, y: number, z: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);
    const rng = new Mulberry32(this.config.seed + ix * 12345 + iy * 67890 + iz * 11111);
    return rng.next() * 2 - 1;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createNoise(config: Partial<NoiseConfig> = {}): NoiseGenerator {
  const mergedConfig = { ...DEFAULT_NOISE_CONFIG, ...config };
  
  switch (mergedConfig.type) {
    case NoiseType.Perlin:
      return new PerlinNoise(mergedConfig);
    case NoiseType.Simplex:
      return new SimplexNoise(mergedConfig);
    case NoiseType.Worley:
      return new WorleyNoise(mergedConfig);
    case NoiseType.Value:
      return new ValueNoise(mergedConfig);
    case NoiseType.White:
      return new WhiteNoise(mergedConfig);
    default:
      return new PerlinNoise(mergedConfig);
  }
}

// Re-export types
export type { NoiseConfig, SeededRandom };
export { NoiseType, DEFAULT_NOISE_CONFIG };
