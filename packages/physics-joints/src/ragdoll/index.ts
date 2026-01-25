/**
 * @holoscript/physics-joints - Ragdoll System
 * Ragdoll creation, animation blending, and active ragdoll control
 */

import type {
  Vec3,
  Quaternion,
  PhysicsBody,
  RagdollBoneConfig,
  RagdollJointConfig,
  RagdollConfig,
  RagdollState,
  ChainConfig,
  ChainLink,
} from '../types';
import { RagdollBone, BodyType, HUMANOID_RAGDOLL_PRESET } from '../types';
import {
  Constraint,
  ConstraintSolver,
  createPointConstraint,
  createHingeConstraint,
  createConstraintSolver,
} from '../constraints';

// ============================================================================
// Ragdoll Bone
// ============================================================================

export class RagdollBodyPart {
  readonly bone: RagdollBone;
  readonly body: PhysicsBody;
  readonly config: RagdollBoneConfig;

  constructor(bone: RagdollBone, body: PhysicsBody, config: RagdollBoneConfig) {
    this.bone = bone;
    this.body = body;
    this.config = config;
  }
}

// ============================================================================
// Ragdoll Controller
// ============================================================================

export class RagdollController {
  readonly id: string;
  private parts: Map<RagdollBone, RagdollBodyPart> = new Map();
  private joints: Map<string, Constraint> = new Map();
  private solver: ConstraintSolver;
  private state: RagdollState;
  private animationBlend: number = 0;
  private animationPose: Map<RagdollBone, { position: Vec3; rotation: Quaternion }> = new Map();

  constructor(id: string, config: RagdollConfig) {
    this.id = id;
    this.solver = createConstraintSolver();
    this.state = {
      isActive: false,
      activeBones: new Set(),
      animationBlend: 0,
    };
    
    this.createFromConfig(config);
  }

  /** Create ragdoll from config */
  private createFromConfig(config: RagdollConfig): void {
    // Create bodies for each bone
    for (const boneConfig of config.bones) {
      const body: PhysicsBody = {
        id: `${this.id}_${boneConfig.bone}`,
        type: BodyType.Dynamic,
        position: { ...boneConfig.position },
        rotation: { ...boneConfig.rotation },
        mass: boneConfig.mass,
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
      };
      
      const part = new RagdollBodyPart(boneConfig.bone, body, boneConfig);
      this.parts.set(boneConfig.bone, part);
    }
    
    // Create joints between bones
    for (const jointConfig of config.joints) {
      const parentPart = this.parts.get(jointConfig.parentBone);
      const childPart = this.parts.get(jointConfig.childBone);
      
      if (!parentPart || !childPart) continue;
      
      const jointId = `${jointConfig.parentBone}_${jointConfig.childBone}`;
      
      // Create appropriate constraint based on limits
      if (jointConfig.twistAxis) {
        // Use hinge constraint for bones with clear twist axis
        const constraint = createHingeConstraint(
          parentPart.body,
          childPart.body,
          jointConfig.anchor,
          { x: 0, y: 0, z: 0 },
          jointConfig.twistAxis,
          {
            minAngle: jointConfig.minTwist ?? -Math.PI / 4,
            maxAngle: jointConfig.maxTwist ?? Math.PI / 4,
          }
        );
        this.joints.set(jointId, constraint);
        this.solver.addConstraint(constraint);
      } else {
        // Use point constraint (ball socket) for general joints
        const constraint = createPointConstraint(
          parentPart.body,
          childPart.body,
          jointConfig.anchor,
          { x: 0, y: 0, z: 0 }
        );
        this.joints.set(jointId, constraint);
        this.solver.addConstraint(constraint);
      }
    }
  }

  /** Activate ragdoll physics */
  activate(): void {
    this.state.isActive = true;
    this.animationBlend = 0;
    
    // Set all bones as active
    for (const bone of this.parts.keys()) {
      this.state.activeBones.add(bone);
    }
  }

  /** Deactivate ragdoll (return to animation) */
  deactivate(): void {
    this.state.isActive = false;
    this.state.activeBones.clear();
  }

  /** Activate specific bones only (partial ragdoll) */
  activateBones(bones: RagdollBone[]): void {
    this.state.isActive = true;
    this.state.activeBones = new Set(bones);
  }

  /** Set animation blend factor (0 = full ragdoll, 1 = full animation) */
  setAnimationBlend(blend: number): void {
    this.animationBlend = Math.max(0, Math.min(1, blend));
    this.state.animationBlend = this.animationBlend;
  }

  /** Update animation pose for blending */
  updateAnimationPose(poses: Map<RagdollBone, { position: Vec3; rotation: Quaternion }>): void {
    this.animationPose = new Map(poses);
  }

  /** Apply impulse to a bone */
  applyImpulse(bone: RagdollBone, impulse: Vec3, _point?: Vec3): void {
    const part = this.parts.get(bone);
    if (!part || part.body.type !== BodyType.Dynamic) return;
    
    const vel = part.body.velocity ?? { x: 0, y: 0, z: 0 };
    const invMass = 1 / part.body.mass;
    
    vel.x += impulse.x * invMass;
    vel.y += impulse.y * invMass;
    vel.z += impulse.z * invMass;
    
    part.body.velocity = vel;
  }

  /** Apply explosion force from a point */
  applyExplosion(origin: Vec3, force: number, radius: number): void {
    for (const part of this.parts.values()) {
      const dx = part.body.position.x - origin.x;
      const dy = part.body.position.y - origin.y;
      const dz = part.body.position.z - origin.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      
      if (distance > radius || distance < 0.001) continue;
      
      const falloff = 1 - (distance / radius);
      const magnitude = force * falloff;
      
      const impulse = {
        x: (dx / distance) * magnitude,
        y: (dy / distance) * magnitude,
        z: (dz / distance) * magnitude,
      };
      
      this.applyImpulse(part.bone, impulse);
    }
  }

  /** Get bone position */
  getBonePosition(bone: RagdollBone): Vec3 | undefined {
    return this.parts.get(bone)?.body.position;
  }

  /** Get bone rotation */
  getBoneRotation(bone: RagdollBone): Quaternion | undefined {
    return this.parts.get(bone)?.body.rotation;
  }

  /** Get all bone transforms */
  getAllBoneTransforms(): Map<RagdollBone, { position: Vec3; rotation: Quaternion }> {
    const transforms = new Map<RagdollBone, { position: Vec3; rotation: Quaternion }>();
    
    for (const [bone, part] of this.parts) {
      let position = { ...part.body.position };
      let rotation = { ...part.body.rotation };
      
      // Blend with animation if needed
      if (this.animationBlend > 0 && this.animationPose.has(bone)) {
        const animPose = this.animationPose.get(bone)!;
        
        // Lerp position
        position = {
          x: position.x * (1 - this.animationBlend) + animPose.position.x * this.animationBlend,
          y: position.y * (1 - this.animationBlend) + animPose.position.y * this.animationBlend,
          z: position.z * (1 - this.animationBlend) + animPose.position.z * this.animationBlend,
        };
        
        // Slerp rotation (simplified linear blend)
        rotation = {
          x: rotation.x * (1 - this.animationBlend) + animPose.rotation.x * this.animationBlend,
          y: rotation.y * (1 - this.animationBlend) + animPose.rotation.y * this.animationBlend,
          z: rotation.z * (1 - this.animationBlend) + animPose.rotation.z * this.animationBlend,
          w: rotation.w * (1 - this.animationBlend) + animPose.rotation.w * this.animationBlend,
        };
        
        // Normalize quaternion
        const len = Math.sqrt(rotation.x ** 2 + rotation.y ** 2 + rotation.z ** 2 + rotation.w ** 2);
        if (len > 0.0001) {
          rotation.x /= len;
          rotation.y /= len;
          rotation.z /= len;
          rotation.w /= len;
        }
      }
      
      transforms.set(bone, { position, rotation });
    }
    
    return transforms;
  }

  /** Get current state */
  getState(): RagdollState {
    return { ...this.state, activeBones: new Set(this.state.activeBones) };
  }

  /** Update ragdoll physics */
  update(dt: number): void {
    if (!this.state.isActive) return;
    
    // Apply gravity to active bones
    const gravity = -9.81;
    for (const part of this.parts.values()) {
      if (!this.state.activeBones.has(part.bone)) continue;
      if (part.body.type !== BodyType.Dynamic) continue;
      
      const vel = part.body.velocity ?? { x: 0, y: 0, z: 0 };
      vel.y += gravity * dt;
      part.body.velocity = vel;
    }
    
    // Solve constraints
    this.solver.solve(dt);
    
    // Integrate positions
    for (const part of this.parts.values()) {
      if (!this.state.activeBones.has(part.bone)) continue;
      if (part.body.type !== BodyType.Dynamic) continue;
      
      const vel = part.body.velocity ?? { x: 0, y: 0, z: 0 };
      part.body.position.x += vel.x * dt;
      part.body.position.y += vel.y * dt;
      part.body.position.z += vel.z * dt;
    }
  }
}

// ============================================================================
// Active Ragdoll Controller
// ============================================================================

export class ActiveRagdollController extends RagdollController {
  private targetPose: Map<RagdollBone, { position: Vec3; rotation: Quaternion }> = new Map();
  private muscleStrength: number = 1.0;
  private balanceEnabled: boolean = true;

  constructor(id: string, config: RagdollConfig) {
    super(id, config);
  }

  /** Set target pose for active ragdoll */
  setTargetPose(poses: Map<RagdollBone, { position: Vec3; rotation: Quaternion }>): void {
    this.targetPose = new Map(poses);
  }

  /** Set muscle strength (0-1) */
  setMuscleStrength(strength: number): void {
    this.muscleStrength = Math.max(0, Math.min(1, strength));
  }

  /** Enable/disable balance controller */
  setBalanceEnabled(enabled: boolean): void {
    this.balanceEnabled = enabled;
  }

  /** Update with active control */
  override update(dt: number): void {
    // Apply muscle forces toward target pose
    if (this.muscleStrength > 0 && this.targetPose.size > 0) {
      this.applyMuscleForces(dt);
    }
    
    // Apply balance forces
    if (this.balanceEnabled) {
      this.applyBalanceForces(dt);
    }
    
    // Call parent update
    super.update(dt);
  }

  /** Apply forces to move toward target pose */
  private applyMuscleForces(dt: number): void {
    for (const [bone, target] of this.targetPose) {
      const current = this.getBonePosition(bone);
      if (!current) continue;
      
      const dx = target.position.x - current.x;
      const dy = target.position.y - current.y;
      const dz = target.position.z - current.z;
      
      // PD controller
      const kp = 50 * this.muscleStrength;
      const force = {
        x: dx * kp,
        y: dy * kp,
        z: dz * kp,
      };
      
      this.applyImpulse(bone, {
        x: force.x * dt,
        y: force.y * dt,
        z: force.z * dt,
      });
    }
  }

  /** Apply forces to maintain balance */
  private applyBalanceForces(dt: number): void {
    const hips = this.getBonePosition(RagdollBone.Hips);
    if (!hips) return;
    
    // Simple balance: try to keep hips above average of feet
    const leftFoot = this.getBonePosition(RagdollBone.LeftFoot);
    const rightFoot = this.getBonePosition(RagdollBone.RightFoot);
    
    if (!leftFoot || !rightFoot) return;
    
    const targetX = (leftFoot.x + rightFoot.x) / 2;
    const targetZ = (leftFoot.z + rightFoot.z) / 2;
    
    const dx = targetX - hips.x;
    const dz = targetZ - hips.z;
    
    const balanceForce = 20 * this.muscleStrength;
    
    this.applyImpulse(RagdollBone.Hips, {
      x: dx * balanceForce * dt,
      y: 0,
      z: dz * balanceForce * dt,
    });
  }
}

// ============================================================================
// Chain Builder (Rope, Hair, etc.)
// ============================================================================

export class PhysicsChain {
  readonly id: string;
  private links: ChainLink[] = [];
  private constraints: Constraint[] = [];
  private bodies: PhysicsBody[] = [];
  private solver: ConstraintSolver;

  constructor(id: string, config: ChainConfig) {
    this.id = id;
    this.solver = createConstraintSolver();
    this.createChain(config);
  }

  private createChain(config: ChainConfig): void {
    const direction = this.normalize({
      x: config.endPoint.x - config.startPoint.x,
      y: config.endPoint.y - config.startPoint.y,
      z: config.endPoint.z - config.startPoint.z,
    });
    
    const totalLength = this.distance(config.startPoint, config.endPoint);
    const segmentLength = totalLength / config.segments;
    
    // Create bodies
    for (let i = 0; i <= config.segments; i++) {
      const t = i / config.segments;
      const position = {
        x: config.startPoint.x + direction.x * totalLength * t,
        y: config.startPoint.y + direction.y * totalLength * t,
        z: config.startPoint.z + direction.z * totalLength * t,
      };
      
      const body: PhysicsBody = {
        id: `${this.id}_link_${i}`,
        type: i === 0 && config.anchorStart ? BodyType.Static : BodyType.Dynamic,
        position,
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        mass: config.massPerSegment ?? 1,
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
      };
      
      this.bodies.push(body);
      
      if (i > 0) {
        const link: ChainLink = {
          index: i - 1,
          body: this.bodies[i - 1],
          length: segmentLength,
        };
        this.links.push(link);
        
        // Create distance constraint
        const constraint = createPointConstraint(
          this.bodies[i - 1],
          body,
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: 0 }
        );
        this.constraints.push(constraint);
        this.solver.addConstraint(constraint);
      }
    }
    
    // Anchor end if needed
    if (config.anchorEnd && this.bodies.length > 0) {
      this.bodies[this.bodies.length - 1].type = BodyType.Static;
    }
  }

  /** Get link positions */
  getPositions(): Vec3[] {
    return this.bodies.map(b => ({ ...b.position }));
  }

  /** Set anchor position */
  setAnchorPosition(position: Vec3): void {
    if (this.bodies.length > 0 && this.bodies[0].type === BodyType.Static) {
      this.bodies[0].position = { ...position };
    }
  }

  /** Apply wind force */
  applyWind(force: Vec3): void {
    for (const body of this.bodies) {
      if (body.type !== BodyType.Dynamic) continue;
      
      const vel = body.velocity ?? { x: 0, y: 0, z: 0 };
      const invMass = 1 / body.mass;
      vel.x += force.x * invMass;
      vel.y += force.y * invMass;
      vel.z += force.z * invMass;
      body.velocity = vel;
    }
  }

  /** Update physics */
  update(dt: number): void {
    const gravity = -9.81;
    
    // Apply gravity
    for (const body of this.bodies) {
      if (body.type !== BodyType.Dynamic) continue;
      
      const vel = body.velocity ?? { x: 0, y: 0, z: 0 };
      vel.y += gravity * dt;
      body.velocity = vel;
    }
    
    // Solve constraints
    this.solver.solve(dt);
    
    // Integrate
    for (const body of this.bodies) {
      if (body.type !== BodyType.Dynamic) continue;
      
      const vel = body.velocity ?? { x: 0, y: 0, z: 0 };
      body.position.x += vel.x * dt;
      body.position.y += vel.y * dt;
      body.position.z += vel.z * dt;
    }
  }

  private normalize(v: Vec3): Vec3 {
    const len = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
    if (len < 0.0001) return { x: 0, y: 1, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  private distance(a: Vec3, b: Vec3): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let nextRagdollId = 0;

export function createRagdoll(config: RagdollConfig): RagdollController {
  const id = `ragdoll_${nextRagdollId++}`;
  return new RagdollController(id, config);
}

export function createActiveRagdoll(config: RagdollConfig): ActiveRagdollController {
  const id = `active_ragdoll_${nextRagdollId++}`;
  return new ActiveRagdollController(id, config);
}

export function createHumanoidRagdoll(): RagdollController {
  return createRagdoll(HUMANOID_RAGDOLL_PRESET);
}

export function createActiveHumanoidRagdoll(): ActiveRagdollController {
  return createActiveRagdoll(HUMANOID_RAGDOLL_PRESET);
}

export function createChain(config: ChainConfig): PhysicsChain {
  const id = `chain_${nextRagdollId++}`;
  return new PhysicsChain(id, config);
}

// Re-exports
export { RagdollBone, BodyType, HUMANOID_RAGDOLL_PRESET } from '../types';
export type { RagdollConfig, RagdollState, RagdollBoneConfig, RagdollJointConfig, ChainConfig };
