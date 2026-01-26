/**
 * @holoscript/gpu - Position-Based Dynamics Solver
 * 
 * Implements Position-Based Dynamics (PBD) for soft-body physics simulation.
 * GPU-accelerated constraint solving for cloth, ropes, and deformable objects.
 * 
 * Reference: Müller et al. "Position Based Dynamics" (2006)
 */

import { GPUContext } from './GPUContext';

export interface PBDConfig {
  /** Number of solver iterations per frame */
  iterations: number;
  /** Gravity vector */
  gravity: [number, number, number];
  /** Damping factor (0-1) */
  damping: number;
  /** Time step */
  dt: number;
}

export interface Particle {
  position: [number, number, number];
  prevPosition: [number, number, number];
  velocity: [number, number, number];
  invMass: number; // 0 = static/pinned
}

export interface DistanceConstraint {
  p1: number; // Particle index 1
  p2: number; // Particle index 2
  restLength: number;
  stiffness: number;
}

const DEFAULT_CONFIG: PBDConfig = {
  iterations: 4,
  gravity: [0, -9.8, 0],
  damping: 0.99,
  dt: 1 / 60,
};

/**
 * PositionBasedDynamicsSolver
 * 
 * CPU implementation of Position-Based Dynamics for soft-body simulation.
 * Future: Port constraint solving to WebGPU compute shaders.
 */
export class PositionBasedDynamicsSolver {
  private config: PBDConfig;
  private particles: Particle[] = [];
  private constraints: DistanceConstraint[] = [];
  private gpuContext: GPUContext | null = null;
  private useGPU: boolean = false;
  
  constructor(config: Partial<PBDConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize GPU acceleration (optional)
   */
  async initGPU(): Promise<boolean> {
    this.gpuContext = new GPUContext({ powerPreference: 'high-performance' });
    const success = await this.gpuContext.initialize();
    this.useGPU = success;
    return success;
  }
  
  /**
   * Add a particle to the simulation
   */
  addParticle(x: number, y: number, z: number, invMass: number = 1): number {
    const idx = this.particles.length;
    this.particles.push({
      position: [x, y, z],
      prevPosition: [x, y, z],
      velocity: [0, 0, 0],
      invMass,
    });
    return idx;
  }
  
  /**
   * Add a distance constraint between two particles
   */
  addDistanceConstraint(
    p1: number,
    p2: number,
    restLength?: number,
    stiffness: number = 1.0
  ): void {
    if (!restLength) {
      // Calculate from current positions
      const pos1 = this.particles[p1].position;
      const pos2 = this.particles[p2].position;
      const dx = pos2[0] - pos1[0];
      const dy = pos2[1] - pos1[1];
      const dz = pos2[2] - pos1[2];
      restLength = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    
    this.constraints.push({ p1, p2, restLength, stiffness });
  }
  
  /**
   * Create a cloth grid
   */
  createCloth(
    width: number,
    height: number,
    segmentsX: number,
    segmentsZ: number,
    pinTop: boolean = true
  ): void {
    const startIdx = this.particles.length;
    const cellWidth = width / segmentsX;
    const cellHeight = height / segmentsZ;
    
    // Create particles
    for (let z = 0; z <= segmentsZ; z++) {
      for (let x = 0; x <= segmentsX; x++) {
        const px = (x - segmentsX / 2) * cellWidth;
        const py = 2; // Height
        const pz = (z - segmentsZ / 2) * cellHeight;
        
        // Pin top row
        const invMass = (pinTop && z === 0) ? 0 : 1;
        this.addParticle(px, py, pz, invMass);
      }
    }
    
    // Create structural constraints
    const cols = segmentsX + 1;
    for (let z = 0; z <= segmentsZ; z++) {
      for (let x = 0; x <= segmentsX; x++) {
        const i = startIdx + z * cols + x;
        
        // Horizontal
        if (x < segmentsX) {
          this.addDistanceConstraint(i, i + 1);
        }
        
        // Vertical
        if (z < segmentsZ) {
          this.addDistanceConstraint(i, i + cols);
        }
        
        // Shear
        if (x < segmentsX && z < segmentsZ) {
          this.addDistanceConstraint(i, i + cols + 1);
          this.addDistanceConstraint(i + 1, i + cols);
        }
      }
    }
  }
  
  /**
   * Create a rope
   */
  createRope(
    startX: number,
    startY: number,
    startZ: number,
    length: number,
    segments: number,
    pinStart: boolean = true
  ): void {
    const segmentLength = length / segments;
    
    for (let i = 0; i <= segments; i++) {
      const invMass = (pinStart && i === 0) ? 0 : 1;
      const idx = this.addParticle(startX, startY - i * segmentLength, startZ, invMass);
      
      if (i > 0) {
        this.addDistanceConstraint(idx - 1, idx, segmentLength);
      }
    }
  }
  
  /**
   * Step the simulation forward
   */
  step(dt?: number): void {
    const h = dt ?? this.config.dt;
    const g = this.config.gravity;
    
    // Predict positions
    for (const p of this.particles) {
      if (p.invMass === 0) continue;
      
      // Apply gravity
      p.velocity[0] += g[0] * h;
      p.velocity[1] += g[1] * h;
      p.velocity[2] += g[2] * h;
      
      // Damping
      p.velocity[0] *= this.config.damping;
      p.velocity[1] *= this.config.damping;
      p.velocity[2] *= this.config.damping;
      
      // Store previous
      p.prevPosition[0] = p.position[0];
      p.prevPosition[1] = p.position[1];
      p.prevPosition[2] = p.position[2];
      
      // Predict
      p.position[0] += p.velocity[0] * h;
      p.position[1] += p.velocity[1] * h;
      p.position[2] += p.velocity[2] * h;
    }
    
    // Solve constraints
    for (let iter = 0; iter < this.config.iterations; iter++) {
      this.solveConstraints();
    }
    
    // Update velocities
    const invH = 1 / h;
    for (const p of this.particles) {
      if (p.invMass === 0) continue;
      
      p.velocity[0] = (p.position[0] - p.prevPosition[0]) * invH;
      p.velocity[1] = (p.position[1] - p.prevPosition[1]) * invH;
      p.velocity[2] = (p.position[2] - p.prevPosition[2]) * invH;
    }
    
    // Floor collision
    for (const p of this.particles) {
      if (p.position[1] < 0) {
        p.position[1] = 0;
        p.velocity[1] = 0;
      }
    }
  }
  
  /**
   * Solve all distance constraints
   */
  private solveConstraints(): void {
    for (const c of this.constraints) {
      const p1 = this.particles[c.p1];
      const p2 = this.particles[c.p2];
      
      const dx = p2.position[0] - p1.position[0];
      const dy = p2.position[1] - p1.position[1];
      const dz = p2.position[2] - p1.position[2];
      
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist === 0) continue;
      
      const diff = (dist - c.restLength) / dist;
      const correction = diff * c.stiffness / (p1.invMass + p2.invMass);
      
      if (p1.invMass > 0) {
        p1.position[0] += dx * correction * p1.invMass;
        p1.position[1] += dy * correction * p1.invMass;
        p1.position[2] += dz * correction * p1.invMass;
      }
      
      if (p2.invMass > 0) {
        p2.position[0] -= dx * correction * p2.invMass;
        p2.position[1] -= dy * correction * p2.invMass;
        p2.position[2] -= dz * correction * p2.invMass;
      }
    }
  }
  
  /**
   * Get all particle positions (for rendering)
   */
  getPositions(): Float32Array {
    const data = new Float32Array(this.particles.length * 3);
    for (let i = 0; i < this.particles.length; i++) {
      data[i * 3 + 0] = this.particles[i].position[0];
      data[i * 3 + 1] = this.particles[i].position[1];
      data[i * 3 + 2] = this.particles[i].position[2];
    }
    return data;
  }
  
  /**
   * Get particle count
   */
  getParticleCount(): number {
    return this.particles.length;
  }
  
  /**
   * Get constraint count
   */
  getConstraintCount(): number {
    return this.constraints.length;
  }
  
  /**
   * Apply external force to a particle
   */
  applyForce(particleIndex: number, fx: number, fy: number, fz: number): void {
    const p = this.particles[particleIndex];
    if (!p || p.invMass === 0) return;
    
    p.velocity[0] += fx * p.invMass * this.config.dt;
    p.velocity[1] += fy * p.invMass * this.config.dt;
    p.velocity[2] += fz * p.invMass * this.config.dt;
  }
  
  /**
   * Set particle position directly (for interaction)
   */
  setParticlePosition(particleIndex: number, x: number, y: number, z: number): void {
    const p = this.particles[particleIndex];
    if (!p) return;
    
    p.position[0] = x;
    p.position[1] = y;
    p.position[2] = z;
  }
  
  /**
   * Clear all particles and constraints
   */
  clear(): void {
    this.particles = [];
    this.constraints = [];
  }
  
  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.clear();
    this.gpuContext?.destroy();
    this.gpuContext = null;
  }
}
