/**
 * @holoscript/physics-joints - Constraint Solver System
 * Physics constraints for hinges, sliders, springs, and more
 */

import type {
  Vec3,
  Quaternion,
  PhysicsBody,
  ConstraintConfig,
  FixedConstraintConfig,
  PointConstraintConfig,
  HingeConstraintConfig,
  SpringConstraintConfig,
  DistanceConstraintConfig,
  ConstraintSolverConfig,
} from '../types';
import { ConstraintType, DEFAULT_PHYSICS_JOINT_MANAGER_CONFIG } from '../types';

// ============================================================================
// Constraint Base
// ============================================================================

export abstract class Constraint {
  readonly id: string;
  readonly type: ConstraintType;
  readonly bodyA: PhysicsBody;
  readonly bodyB: PhysicsBody;
  protected config: ConstraintConfig;
  protected broken: boolean = false;

  constructor(id: string, type: ConstraintType, bodyA: PhysicsBody, bodyB: PhysicsBody, config: ConstraintConfig) {
    this.id = id;
    this.type = type;
    this.bodyA = bodyA;
    this.bodyB = bodyB;
    this.config = config;
  }

  /** Calculate constraint error */
  abstract calculateError(): Vec3;
  
  /** Calculate corrective impulse */
  abstract calculateImpulse(dt: number, biasFactor: number): Vec3;
  
  /** Apply impulse to bodies */
  abstract applyImpulse(impulse: Vec3): void;

  /** Check if constraint is broken */
  isBroken(): boolean {
    if (this.config.breakForce !== undefined && !this.broken) {
      const error = this.calculateError();
      const magnitude = Math.sqrt(error.x ** 2 + error.y ** 2 + error.z ** 2);
      if (magnitude > this.config.breakForce) {
        this.broken = true;
      }
    }
    return this.broken;
  }
}

// ============================================================================
// Fixed Constraint
// ============================================================================

export class FixedConstraint extends Constraint {
  private anchorA: Vec3;
  private anchorB: Vec3;
  private storedInitialRotation: Quaternion;

  constructor(id: string, bodyA: PhysicsBody, bodyB: PhysicsBody, config: FixedConstraintConfig) {
    super(id, ConstraintType.Fixed, bodyA, bodyB, config);
    this.anchorA = config.anchorA ?? { x: 0, y: 0, z: 0 };
    this.anchorB = config.anchorB ?? { x: 0, y: 0, z: 0 };
    
    // Store initial relative rotation
    this.storedInitialRotation = this.getRelativeRotation();
  }

  private getRelativeRotation(): Quaternion {
    // Simplified: assumes identity for now
    return { x: 0, y: 0, z: 0, w: 1 };
  }

  /** Get the initial relative rotation between bodies */
  getInitialRotation(): Quaternion {
    return { ...this.storedInitialRotation };
  }

  calculateError(): Vec3 {
    const worldA = this.localToWorld(this.bodyA, this.anchorA);
    const worldB = this.localToWorld(this.bodyB, this.anchorB);
    
    return {
      x: worldB.x - worldA.x,
      y: worldB.y - worldA.y,
      z: worldB.z - worldA.z,
    };
  }

  calculateImpulse(dt: number, biasFactor: number): Vec3 {
    const error = this.calculateError();
    const bias = biasFactor / dt;
    
    return {
      x: error.x * bias,
      y: error.y * bias,
      z: error.z * bias,
    };
  }

  applyImpulse(impulse: Vec3): void {
    if (this.bodyA.type === 'dynamic') {
      const invMassA = 1 / this.bodyA.mass;
      this.bodyA.velocity!.x -= impulse.x * invMassA;
      this.bodyA.velocity!.y -= impulse.y * invMassA;
      this.bodyA.velocity!.z -= impulse.z * invMassA;
    }
    
    if (this.bodyB.type === 'dynamic') {
      const invMassB = 1 / this.bodyB.mass;
      this.bodyB.velocity!.x += impulse.x * invMassB;
      this.bodyB.velocity!.y += impulse.y * invMassB;
      this.bodyB.velocity!.z += impulse.z * invMassB;
    }
  }

  private localToWorld(body: PhysicsBody, local: Vec3): Vec3 {
    // Simplified: just offset by position
    return {
      x: body.position.x + local.x,
      y: body.position.y + local.y,
      z: body.position.z + local.z,
    };
  }
}

// ============================================================================
// Point Constraint (Ball and Socket)
// ============================================================================

export class PointConstraint extends Constraint {
  private anchorA: Vec3;
  private anchorB: Vec3;

  constructor(id: string, bodyA: PhysicsBody, bodyB: PhysicsBody, config: PointConstraintConfig) {
    super(id, ConstraintType.Point, bodyA, bodyB, config);
    this.anchorA = config.anchorA;
    this.anchorB = config.anchorB;
  }

  calculateError(): Vec3 {
    const worldA = this.localToWorld(this.bodyA, this.anchorA);
    const worldB = this.localToWorld(this.bodyB, this.anchorB);
    
    return {
      x: worldB.x - worldA.x,
      y: worldB.y - worldA.y,
      z: worldB.z - worldA.z,
    };
  }

  calculateImpulse(dt: number, biasFactor: number): Vec3 {
    const error = this.calculateError();
    const bias = biasFactor / dt;
    
    return {
      x: error.x * bias,
      y: error.y * bias,
      z: error.z * bias,
    };
  }

  applyImpulse(impulse: Vec3): void {
    if (this.bodyA.type === 'dynamic') {
      const invMassA = 1 / this.bodyA.mass;
      this.bodyA.velocity!.x -= impulse.x * invMassA;
      this.bodyA.velocity!.y -= impulse.y * invMassA;
      this.bodyA.velocity!.z -= impulse.z * invMassA;
    }
    
    if (this.bodyB.type === 'dynamic') {
      const invMassB = 1 / this.bodyB.mass;
      this.bodyB.velocity!.x += impulse.x * invMassB;
      this.bodyB.velocity!.y += impulse.y * invMassB;
      this.bodyB.velocity!.z += impulse.z * invMassB;
    }
  }

  private localToWorld(body: PhysicsBody, local: Vec3): Vec3 {
    return {
      x: body.position.x + local.x,
      y: body.position.y + local.y,
      z: body.position.z + local.z,
    };
  }
}

// ============================================================================
// Hinge Constraint
// ============================================================================

export class HingeConstraint extends Constraint {
  private anchorA: Vec3;
  private anchorB: Vec3;
  private axis: Vec3;
  private limitMin: number;
  private limitMax: number;
  private motorEnabled: boolean;
  private motorSpeed: number;
  private motorForce: number;

  constructor(id: string, bodyA: PhysicsBody, bodyB: PhysicsBody, config: HingeConstraintConfig) {
    super(id, ConstraintType.Hinge, bodyA, bodyB, config);
    this.anchorA = config.anchorA;
    this.anchorB = config.anchorB;
    this.axis = config.axis;
    this.limitMin = config.minAngle ?? -Math.PI;
    this.limitMax = config.maxAngle ?? Math.PI;
    this.motorEnabled = config.motor?.enabled ?? false;
    this.motorSpeed = config.motor?.targetSpeed ?? 0;
    this.motorForce = config.motor?.maxForce ?? 0;
  }

  /** Get angle limits */
  getLimits(): { min: number; max: number } {
    return { min: this.limitMin, max: this.limitMax };
  }

  /** Set angle limits */
  setLimits(min: number, max: number): void {
    this.limitMin = min;
    this.limitMax = max;
  }

  calculateError(): Vec3 {
    // Position constraint
    const worldA = this.localToWorld(this.bodyA, this.anchorA);
    const worldB = this.localToWorld(this.bodyB, this.anchorB);
    
    return {
      x: worldB.x - worldA.x,
      y: worldB.y - worldA.y,
      z: worldB.z - worldA.z,
    };
  }

  calculateImpulse(dt: number, biasFactor: number): Vec3 {
    const error = this.calculateError();
    const bias = biasFactor / dt;
    
    const impulse = {
      x: error.x * bias,
      y: error.y * bias,
      z: error.z * bias,
    };
    
    // Add motor impulse if enabled
    if (this.motorEnabled && this.motorForce > 0) {
      const motorImpulse = Math.min(this.motorSpeed * this.motorForce * dt, this.motorForce);
      // Apply along hinge axis
      impulse.x += this.axis.x * motorImpulse;
      impulse.y += this.axis.y * motorImpulse;
      impulse.z += this.axis.z * motorImpulse;
    }
    
    return impulse;
  }

  applyImpulse(impulse: Vec3): void {
    if (this.bodyA.type === 'dynamic') {
      const invMassA = 1 / this.bodyA.mass;
      this.bodyA.velocity!.x -= impulse.x * invMassA;
      this.bodyA.velocity!.y -= impulse.y * invMassA;
      this.bodyA.velocity!.z -= impulse.z * invMassA;
    }
    
    if (this.bodyB.type === 'dynamic') {
      const invMassB = 1 / this.bodyB.mass;
      this.bodyB.velocity!.x += impulse.x * invMassB;
      this.bodyB.velocity!.y += impulse.y * invMassB;
      this.bodyB.velocity!.z += impulse.z * invMassB;
    }
  }

  /** Set motor parameters */
  setMotor(enabled: boolean, speed: number, force: number): void {
    this.motorEnabled = enabled;
    this.motorSpeed = speed;
    this.motorForce = force;
  }

  /** Get current angle */
  getCurrentAngle(): number {
    // Simplified: calculate relative rotation around axis
    return 0; // Would need full quaternion math
  }

  private localToWorld(body: PhysicsBody, local: Vec3): Vec3 {
    return {
      x: body.position.x + local.x,
      y: body.position.y + local.y,
      z: body.position.z + local.z,
    };
  }
}

// ============================================================================
// Spring Constraint
// ============================================================================

export class SpringConstraint extends Constraint {
  private anchorA: Vec3;
  private anchorB: Vec3;
  private restLength: number;
  private stiffness: number;
  private damping: number;

  constructor(id: string, bodyA: PhysicsBody, bodyB: PhysicsBody, config: SpringConstraintConfig) {
    super(id, ConstraintType.Spring, bodyA, bodyB, config);
    this.anchorA = config.anchorA;
    this.anchorB = config.anchorB;
    this.restLength = config.restLength;
    this.stiffness = config.stiffness;
    this.damping = config.damping;
  }

  calculateError(): Vec3 {
    const worldA = this.localToWorld(this.bodyA, this.anchorA);
    const worldB = this.localToWorld(this.bodyB, this.anchorB);
    
    const dx = worldB.x - worldA.x;
    const dy = worldB.y - worldA.y;
    const dz = worldB.z - worldA.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    const extension = distance - this.restLength;
    
    if (distance > 0.0001) {
      return {
        x: (dx / distance) * extension,
        y: (dy / distance) * extension,
        z: (dz / distance) * extension,
      };
    }
    
    return { x: 0, y: 0, z: 0 };
  }

  calculateImpulse(dt: number, _biasFactor: number): Vec3 {
    const worldA = this.localToWorld(this.bodyA, this.anchorA);
    const worldB = this.localToWorld(this.bodyB, this.anchorB);
    
    const dx = worldB.x - worldA.x;
    const dy = worldB.y - worldA.y;
    const dz = worldB.z - worldA.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (distance < 0.0001) return { x: 0, y: 0, z: 0 };
    
    // Normalize direction
    const nx = dx / distance;
    const ny = dy / distance;
    const nz = dz / distance;
    
    // Spring force (Hooke's law)
    const extension = distance - this.restLength;
    const springForce = extension * this.stiffness;
    
    // Relative velocity
    const velA = this.bodyA.velocity ?? { x: 0, y: 0, z: 0 };
    const velB = this.bodyB.velocity ?? { x: 0, y: 0, z: 0 };
    const relVel = (velB.x - velA.x) * nx + (velB.y - velA.y) * ny + (velB.z - velA.z) * nz;
    
    // Damping force
    const dampingForce = relVel * this.damping;
    
    // Total force
    const totalForce = springForce + dampingForce;
    
    return {
      x: nx * totalForce * dt,
      y: ny * totalForce * dt,
      z: nz * totalForce * dt,
    };
  }

  applyImpulse(impulse: Vec3): void {
    if (this.bodyA.type === 'dynamic') {
      const invMassA = 1 / this.bodyA.mass;
      this.bodyA.velocity!.x -= impulse.x * invMassA;
      this.bodyA.velocity!.y -= impulse.y * invMassA;
      this.bodyA.velocity!.z -= impulse.z * invMassA;
    }
    
    if (this.bodyB.type === 'dynamic') {
      const invMassB = 1 / this.bodyB.mass;
      this.bodyB.velocity!.x += impulse.x * invMassB;
      this.bodyB.velocity!.y += impulse.y * invMassB;
      this.bodyB.velocity!.z += impulse.z * invMassB;
    }
  }

  private localToWorld(body: PhysicsBody, local: Vec3): Vec3 {
    return {
      x: body.position.x + local.x,
      y: body.position.y + local.y,
      z: body.position.z + local.z,
    };
  }
}

// ============================================================================
// Distance Constraint
// ============================================================================

export class DistanceConstraint extends Constraint {
  private anchorA: Vec3;
  private anchorB: Vec3;
  private targetDistance: number;
  private minDistance: number;
  private maxDistance: number;
  private stiffness: number;

  constructor(id: string, bodyA: PhysicsBody, bodyB: PhysicsBody, config: DistanceConstraintConfig) {
    super(id, ConstraintType.Distance, bodyA, bodyB, config);
    this.anchorA = config.anchorA;
    this.anchorB = config.anchorB;
    this.targetDistance = config.distance;
    this.minDistance = config.minDistance ?? config.distance;
    this.maxDistance = config.maxDistance ?? config.distance;
    this.stiffness = config.stiffness ?? 1.0;
  }

  /** Get the target distance */
  getDistance(): number {
    return this.targetDistance;
  }

  /** Set the target distance */
  setDistance(distance: number): void {
    this.targetDistance = distance;
    this.minDistance = distance;
    this.maxDistance = distance;
  }

  calculateError(): Vec3 {
    const worldA = this.localToWorld(this.bodyA, this.anchorA);
    const worldB = this.localToWorld(this.bodyB, this.anchorB);
    
    const dx = worldB.x - worldA.x;
    const dy = worldB.y - worldA.y;
    const dz = worldB.z - worldA.z;
    const currentDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    let targetDistance = currentDistance;
    if (currentDistance < this.minDistance) {
      targetDistance = this.minDistance;
    } else if (currentDistance > this.maxDistance) {
      targetDistance = this.maxDistance;
    }
    
    const error = currentDistance - targetDistance;
    
    if (currentDistance > 0.0001) {
      return {
        x: (dx / currentDistance) * error,
        y: (dy / currentDistance) * error,
        z: (dz / currentDistance) * error,
      };
    }
    
    return { x: 0, y: 0, z: 0 };
  }

  calculateImpulse(dt: number, biasFactor: number): Vec3 {
    const error = this.calculateError();
    const magnitude = Math.sqrt(error.x ** 2 + error.y ** 2 + error.z ** 2);
    
    if (magnitude < 0.0001) return { x: 0, y: 0, z: 0 };
    
    const bias = biasFactor / dt * this.stiffness;
    
    return {
      x: error.x * bias,
      y: error.y * bias,
      z: error.z * bias,
    };
  }

  applyImpulse(impulse: Vec3): void {
    if (this.bodyA.type === 'dynamic') {
      const invMassA = 1 / this.bodyA.mass;
      this.bodyA.velocity!.x -= impulse.x * invMassA;
      this.bodyA.velocity!.y -= impulse.y * invMassA;
      this.bodyA.velocity!.z -= impulse.z * invMassA;
    }
    
    if (this.bodyB.type === 'dynamic') {
      const invMassB = 1 / this.bodyB.mass;
      this.bodyB.velocity!.x += impulse.x * invMassB;
      this.bodyB.velocity!.y += impulse.y * invMassB;
      this.bodyB.velocity!.z += impulse.z * invMassB;
    }
  }

  private localToWorld(body: PhysicsBody, local: Vec3): Vec3 {
    return {
      x: body.position.x + local.x,
      y: body.position.y + local.y,
      z: body.position.z + local.z,
    };
  }
}

// ============================================================================
// Constraint Solver
// ============================================================================

export class ConstraintSolver {
  private constraints: Map<string, Constraint> = new Map();
  private config: ConstraintSolverConfig;
  private warmStartCache: Map<string, Vec3> = new Map();

  constructor(config?: Partial<ConstraintSolverConfig>) {
    this.config = {
      ...DEFAULT_PHYSICS_JOINT_MANAGER_CONFIG,
      ...config,
    };
  }

  /** Add a constraint */
  addConstraint(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint);
  }

  /** Remove a constraint */
  removeConstraint(id: string): boolean {
    this.warmStartCache.delete(id);
    return this.constraints.delete(id);
  }

  /** Get a constraint by ID */
  getConstraint(id: string): Constraint | undefined {
    return this.constraints.get(id);
  }

  /** Get all constraints */
  getAllConstraints(): Constraint[] {
    return Array.from(this.constraints.values());
  }

  /** Solve all constraints */
  solve(dt: number): void {
    const biasFactor = this.config.biasFactor ?? 0.2;
    const iterations = this.config.solverIterations ?? 10;
    
    // Remove broken constraints
    for (const [id, constraint] of this.constraints) {
      if (constraint.isBroken()) {
        this.constraints.delete(id);
        this.warmStartCache.delete(id);
      }
    }
    
    // Warm start: apply cached impulses
    if (this.config.warmStarting) {
      for (const constraint of this.constraints.values()) {
        const cached = this.warmStartCache.get(constraint.id);
        if (cached) {
          constraint.applyImpulse(cached);
        }
      }
    }
    
    // Iterative solving
    for (let i = 0; i < iterations; i++) {
      for (const constraint of this.constraints.values()) {
        const impulse = constraint.calculateImpulse(dt, biasFactor);
        constraint.applyImpulse(impulse);
        
        // Cache for warm starting
        if (this.config.warmStarting) {
          const cached = this.warmStartCache.get(constraint.id);
          if (cached) {
            cached.x += impulse.x;
            cached.y += impulse.y;
            cached.z += impulse.z;
          } else {
            this.warmStartCache.set(constraint.id, { ...impulse });
          }
        }
      }
    }
  }

  /** Clear all constraints */
  clear(): void {
    this.constraints.clear();
    this.warmStartCache.clear();
  }
}

// ============================================================================
// Constraint Factory
// ============================================================================

let nextConstraintId = 0;

export function createFixedConstraint(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  config?: Partial<FixedConstraintConfig>
): FixedConstraint {
  const id = `fixed_${nextConstraintId++}`;
  return new FixedConstraint(id, bodyA, bodyB, {
    anchorA: { x: 0, y: 0, z: 0 },
    anchorB: { x: 0, y: 0, z: 0 },
    ...config,
  });
}

export function createPointConstraint(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  anchorA: Vec3,
  anchorB: Vec3,
  config?: Partial<PointConstraintConfig>
): PointConstraint {
  const id = `point_${nextConstraintId++}`;
  return new PointConstraint(id, bodyA, bodyB, {
    anchorA,
    anchorB,
    ...config,
  });
}

export function createHingeConstraint(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  anchorA: Vec3,
  anchorB: Vec3,
  axis: Vec3,
  config?: Partial<HingeConstraintConfig>
): HingeConstraint {
  const id = `hinge_${nextConstraintId++}`;
  return new HingeConstraint(id, bodyA, bodyB, {
    anchorA,
    anchorB,
    axis,
    ...config,
  });
}

export function createSpringConstraint(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  anchorA: Vec3,
  anchorB: Vec3,
  restLength: number,
  stiffness: number,
  damping: number,
  config?: Partial<SpringConstraintConfig>
): SpringConstraint {
  const id = `spring_${nextConstraintId++}`;
  return new SpringConstraint(id, bodyA, bodyB, {
    anchorA,
    anchorB,
    restLength,
    stiffness,
    damping,
    ...config,
  });
}

export function createDistanceConstraint(
  bodyA: PhysicsBody,
  bodyB: PhysicsBody,
  anchorA: Vec3,
  anchorB: Vec3,
  distance: number,
  config?: Partial<DistanceConstraintConfig>
): DistanceConstraint {
  const id = `distance_${nextConstraintId++}`;
  return new DistanceConstraint(id, bodyA, bodyB, {
    anchorA,
    anchorB,
    distance,
    ...config,
  });
}

export function createConstraintSolver(config?: Partial<ConstraintSolverConfig>): ConstraintSolver {
  return new ConstraintSolver(config);
}

// Re-exports
export { ConstraintType, DEFAULT_PHYSICS_JOINT_MANAGER_CONFIG } from '../types';
export type { PhysicsBody, ConstraintConfig, ConstraintSolverConfig };
