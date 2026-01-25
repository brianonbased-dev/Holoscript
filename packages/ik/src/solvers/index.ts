/**
 * @holoscript/ik - IK Solvers
 * FABRIK, CCD, Two-Bone, and Look-At solvers
 */

import type {
  Vec3,
  Quaternion,
  Transform,
  Joint,
  IKChain,
  IKTarget,
  SolverConfig,
  SolverResult,
} from '../types';
import { SolverType, DEFAULT_SOLVER_CONFIG } from '../types';

// ============================================================================
// Vector Math Utilities
// ============================================================================

export const Vec3Math = {
  create(x = 0, y = 0, z = 0): Vec3 {
    return { x, y, z };
  },

  add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vec3, s: number): Vec3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  length(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  lengthSq(v: Vec3): number {
    return v.x * v.x + v.y * v.y + v.z * v.z;
  },

  normalize(v: Vec3): Vec3 {
    const len = Vec3Math.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },

  dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  },

  lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },

  distance(a: Vec3, b: Vec3): number {
    return Vec3Math.length(Vec3Math.sub(b, a));
  },

  clone(v: Vec3): Vec3 {
    return { x: v.x, y: v.y, z: v.z };
  },
};

// ============================================================================
// Quaternion Math Utilities
// ============================================================================

export const QuatMath = {
  identity(): Quaternion {
    return { x: 0, y: 0, z: 0, w: 1 };
  },

  multiply(a: Quaternion, b: Quaternion): Quaternion {
    return {
      x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
      y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
      z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
      w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    };
  },

  conjugate(q: Quaternion): Quaternion {
    return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
  },

  normalize(q: Quaternion): Quaternion {
    const len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
    if (len === 0) return QuatMath.identity();
    return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len };
  },

  fromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return QuatMath.normalize({
      x: axis.x * s,
      y: axis.y * s,
      z: axis.z * s,
      w: Math.cos(halfAngle),
    });
  },

  rotateVec3(q: Quaternion, v: Vec3): Vec3 {
    const qv: Quaternion = { x: v.x, y: v.y, z: v.z, w: 0 };
    const qConj = QuatMath.conjugate(q);
    const result = QuatMath.multiply(QuatMath.multiply(q, qv), qConj);
    return { x: result.x, y: result.y, z: result.z };
  },

  slerp(a: Quaternion, b: Quaternion, t: number): Quaternion {
    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    
    // Ensure shortest path
    let bTemp = { ...b };
    if (dot < 0) {
      bTemp = { x: -b.x, y: -b.y, z: -b.z, w: -b.w };
      dot = -dot;
    }

    if (dot > 0.9995) {
      // Linear interpolation for very close quaternions
      return QuatMath.normalize({
        x: a.x + (bTemp.x - a.x) * t,
        y: a.y + (bTemp.y - a.y) * t,
        z: a.z + (bTemp.z - a.z) * t,
        w: a.w + (bTemp.w - a.w) * t,
      });
    }

    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return {
      x: a.x * s0 + bTemp.x * s1,
      y: a.y * s0 + bTemp.y * s1,
      z: a.z * s0 + bTemp.z * s1,
      w: a.w * s0 + bTemp.w * s1,
    };
  },

  lookRotation(forward: Vec3, up: Vec3 = { x: 0, y: 1, z: 0 }): Quaternion {
    const f = Vec3Math.normalize(forward);
    const r = Vec3Math.normalize(Vec3Math.cross(up, f));
    const u = Vec3Math.cross(f, r);

    const m00 = r.x, m01 = r.y, m02 = r.z;
    const m10 = u.x, m11 = u.y, m12 = u.z;
    const m20 = f.x, m21 = f.y, m22 = f.z;

    const trace = m00 + m11 + m22;
    let q: Quaternion;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      q = {
        w: 0.25 / s,
        x: (m21 - m12) * s,
        y: (m02 - m20) * s,
        z: (m10 - m01) * s,
      };
    } else if (m00 > m11 && m00 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
      q = {
        w: (m21 - m12) / s,
        x: 0.25 * s,
        y: (m01 + m10) / s,
        z: (m02 + m20) / s,
      };
    } else if (m11 > m22) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
      q = {
        w: (m02 - m20) / s,
        x: (m01 + m10) / s,
        y: 0.25 * s,
        z: (m12 + m21) / s,
      };
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
      q = {
        w: (m10 - m01) / s,
        x: (m02 + m20) / s,
        y: (m12 + m21) / s,
        z: 0.25 * s,
      };
    }

    return QuatMath.normalize(q);
  },

  clone(q: Quaternion): Quaternion {
    return { x: q.x, y: q.y, z: q.z, w: q.w };
  },
};

// ============================================================================
// Base Solver Interface
// ============================================================================

export interface IKSolver {
  solve(joints: Joint[], chain: IKChain, target: IKTarget): SolverResult;
  config: SolverConfig;
}

// ============================================================================
// FABRIK Solver
// ============================================================================

export class FABRIKSolver implements IKSolver {
  config: SolverConfig;

  constructor(config: Partial<SolverConfig> = {}) {
    this.config = { ...DEFAULT_SOLVER_CONFIG, type: SolverType.FABRIK, ...config };
  }

  solve(joints: Joint[], chain: IKChain, target: IKTarget): SolverResult {
    const jointIds = chain.jointIds;
    const positions: Vec3[] = jointIds.map(id => {
      const joint = joints.find(j => j.id === id);
      return joint ? Vec3Math.clone(joint.worldTransform.position) : Vec3Math.create();
    });

    const boneLengths: number[] = [];
    for (let i = 0; i < jointIds.length - 1; i++) {
      boneLengths.push(Vec3Math.distance(positions[i], positions[i + 1]));
    }

    const totalLength = boneLengths.reduce((a, b) => a + b, 0);
    const rootPos = Vec3Math.clone(positions[0]);
    const targetPos = Vec3Math.add(target.position, chain.endEffectorOffset);
    const distToTarget = Vec3Math.distance(rootPos, targetPos);

    // Check if target is reachable
    if (distToTarget > totalLength) {
      // Target unreachable - stretch toward it
      const dir = Vec3Math.normalize(Vec3Math.sub(targetPos, rootPos));
      let currentPos = Vec3Math.clone(rootPos);
      
      for (let i = 0; i < positions.length - 1; i++) {
        positions[i] = Vec3Math.clone(currentPos);
        currentPos = Vec3Math.add(currentPos, Vec3Math.scale(dir, boneLengths[i]));
      }
      positions[positions.length - 1] = Vec3Math.clone(currentPos);
    } else {
      // FABRIK iterations
      for (let iter = 0; iter < this.config.maxIterations; iter++) {
        // Forward reaching (from end effector to root)
        positions[positions.length - 1] = Vec3Math.clone(targetPos);
        
        for (let i = positions.length - 2; i >= 0; i--) {
          const dir = Vec3Math.normalize(Vec3Math.sub(positions[i], positions[i + 1]));
          positions[i] = Vec3Math.add(positions[i + 1], Vec3Math.scale(dir, boneLengths[i]));
        }

        // Backward reaching (from root to end effector)
        positions[0] = Vec3Math.clone(rootPos);
        
        for (let i = 0; i < positions.length - 1; i++) {
          const dir = Vec3Math.normalize(Vec3Math.sub(positions[i + 1], positions[i]));
          positions[i + 1] = Vec3Math.add(positions[i], Vec3Math.scale(dir, boneLengths[i]));
        }

        // Check convergence
        const error = Vec3Math.distance(positions[positions.length - 1], targetPos);
        if (error < this.config.positionTolerance) {
          break;
        }
      }
    }

    // Apply pole vector constraint if specified
    if (target.poleVector && target.poleWeight > 0 && positions.length >= 3) {
      this.applyPoleVector(positions, rootPos, targetPos, target.poleVector, target.poleWeight);
    }

    // Calculate resulting transforms
    const jointTransforms = new Map<string, Transform>();
    for (let i = 0; i < jointIds.length; i++) {
      const rotation = i < jointIds.length - 1
        ? this.calculateRotation(positions[i], positions[i + 1])
        : QuatMath.identity();

      jointTransforms.set(jointIds[i], {
        position: positions[i],
        rotation,
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    const finalError = Vec3Math.distance(positions[positions.length - 1], targetPos);

    return {
      reached: finalError < this.config.positionTolerance,
      iterations: this.config.maxIterations,
      positionError: finalError,
      rotationError: 0,
      jointTransforms,
    };
  }

  private applyPoleVector(positions: Vec3[], root: Vec3, target: Vec3, pole: Vec3, weight: number): void {
    if (positions.length < 3) return;

    const midIndex = Math.floor(positions.length / 2);
    const midPos = positions[midIndex];

    // Calculate the plane normal from root to target
    const chainDir = Vec3Math.normalize(Vec3Math.sub(target, root));
    
    // Project pole and mid onto the plane perpendicular to chain
    const poleDirUnprojected = Vec3Math.sub(pole, root);
    const midDirUnprojected = Vec3Math.sub(midPos, root);

    const projPole = Vec3Math.sub(poleDirUnprojected, Vec3Math.scale(chainDir, Vec3Math.dot(poleDirUnprojected, chainDir)));
    const projMid = Vec3Math.sub(midDirUnprojected, Vec3Math.scale(chainDir, Vec3Math.dot(midDirUnprojected, chainDir)));

    if (Vec3Math.lengthSq(projPole) < 0.0001 || Vec3Math.lengthSq(projMid) < 0.0001) return;

    const desiredDir = Vec3Math.normalize(projPole);
    const currentDir = Vec3Math.normalize(projMid);

    // Calculate rotation to align mid joint with pole
    const dot = Vec3Math.dot(currentDir, desiredDir);
    if (dot > 0.9999) return;

    const cross = Vec3Math.cross(currentDir, desiredDir);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * weight;
    const rotationQuat = QuatMath.fromAxisAngle(chainDir, angle);

    // Rotate middle joints around the chain axis
    for (let i = 1; i < positions.length - 1; i++) {
      const offset = Vec3Math.sub(positions[i], root);
      const rotated = QuatMath.rotateVec3(rotationQuat, offset);
      positions[i] = Vec3Math.add(root, rotated);
    }
  }

  private calculateRotation(from: Vec3, to: Vec3): Quaternion {
    const dir = Vec3Math.normalize(Vec3Math.sub(to, from));
    return QuatMath.lookRotation(dir);
  }
}

// ============================================================================
// CCD (Cyclic Coordinate Descent) Solver
// ============================================================================

export class CCDSolver implements IKSolver {
  config: SolverConfig;

  constructor(config: Partial<SolverConfig> = {}) {
    this.config = { ...DEFAULT_SOLVER_CONFIG, type: SolverType.CCD, ...config };
  }

  solve(joints: Joint[], chain: IKChain, target: IKTarget): SolverResult {
    const jointIds = chain.jointIds;
    const chainJoints = jointIds.map(id => joints.find(j => j.id === id)!).filter(Boolean);

    if (chainJoints.length < 2) {
      return {
        reached: false,
        iterations: 0,
        positionError: Infinity,
        rotationError: 0,
        jointTransforms: new Map(),
      };
    }

    const targetPos = Vec3Math.add(target.position, chain.endEffectorOffset);
    const rotations: Quaternion[] = chainJoints.map(j => QuatMath.clone(j.localTransform.rotation));
    
    let iterations = 0;
    let positionError = Infinity;

    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      iterations++;

      // Work backwards from end to root
      for (let i = chainJoints.length - 2; i >= 0; i--) {
        const endEffectorPos = this.getEndEffectorPosition(chainJoints, rotations);
        const jointPos = this.getJointWorldPosition(chainJoints, rotations, i);

        // Vector from joint to end effector
        const toEnd = Vec3Math.normalize(Vec3Math.sub(endEffectorPos, jointPos));
        // Vector from joint to target
        const toTarget = Vec3Math.normalize(Vec3Math.sub(targetPos, jointPos));

        // Calculate rotation to align end effector with target
        const dot = Vec3Math.dot(toEnd, toTarget);
        if (dot < 0.9999) {
          const axis = Vec3Math.normalize(Vec3Math.cross(toEnd, toTarget));
          if (Vec3Math.lengthSq(axis) > 0.0001) {
            const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * this.config.damping;
            const deltaRot = QuatMath.fromAxisAngle(axis, angle);
            rotations[i] = QuatMath.normalize(QuatMath.multiply(deltaRot, rotations[i]));
          }
        }
      }

      // Check convergence
      const endPos = this.getEndEffectorPosition(chainJoints, rotations);
      positionError = Vec3Math.distance(endPos, targetPos);

      if (positionError < this.config.positionTolerance) {
        break;
      }
    }

    // Build result transforms
    const jointTransforms = new Map<string, Transform>();
    for (let i = 0; i < chainJoints.length; i++) {
      jointTransforms.set(chainJoints[i].id, {
        position: this.getJointWorldPosition(chainJoints, rotations, i),
        rotation: rotations[i],
        scale: { x: 1, y: 1, z: 1 },
      });
    }

    return {
      reached: positionError < this.config.positionTolerance,
      iterations,
      positionError,
      rotationError: 0,
      jointTransforms,
    };
  }

  private getJointWorldPosition(joints: Joint[], rotations: Quaternion[], index: number): Vec3 {
    let pos = Vec3Math.clone(joints[0].worldTransform.position);
    
    for (let i = 0; i < index; i++) {
      const boneDir = QuatMath.rotateVec3(rotations[i], { x: 0, y: joints[i].boneLength, z: 0 });
      pos = Vec3Math.add(pos, boneDir);
    }
    
    return pos;
  }

  private getEndEffectorPosition(joints: Joint[], rotations: Quaternion[]): Vec3 {
    return this.getJointWorldPosition(joints, rotations, joints.length);
  }
}

// ============================================================================
// Two-Bone Analytical Solver
// ============================================================================

export class TwoBoneSolver implements IKSolver {
  config: SolverConfig;

  constructor(config: Partial<SolverConfig> = {}) {
    this.config = { ...DEFAULT_SOLVER_CONFIG, type: SolverType.TwoBone, ...config };
  }

  solve(joints: Joint[], chain: IKChain, target: IKTarget): SolverResult {
    if (chain.jointIds.length !== 3) {
      throw new Error('TwoBoneSolver requires exactly 3 joints (root, mid, end)');
    }

    const [rootId, midId, endId] = chain.jointIds;
    const root = joints.find(j => j.id === rootId)!;
    const mid = joints.find(j => j.id === midId)!;
    const end = joints.find(j => j.id === endId)!;

    const rootPos = Vec3Math.clone(root.worldTransform.position);
    const targetPos = Vec3Math.add(target.position, chain.endEffectorOffset);

    const upperLength = root.boneLength;
    const lowerLength = mid.boneLength;
    const targetDist = Vec3Math.distance(rootPos, targetPos);

    // Clamp target distance to valid range
    const maxDist = upperLength + lowerLength - 0.001;
    const minDist = Math.abs(upperLength - lowerLength) + 0.001;
    const clampedDist = Math.max(minDist, Math.min(maxDist, targetDist));

    // Calculate joint angle using law of cosines
    const cosAngle = (upperLength * upperLength + lowerLength * lowerLength - clampedDist * clampedDist) /
                     (2 * upperLength * lowerLength);
    const jointAngle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

    // Calculate upper bone rotation
    const cosUpper = (upperLength * upperLength + clampedDist * clampedDist - lowerLength * lowerLength) /
                     (2 * upperLength * clampedDist);
    const upperAngle = Math.acos(Math.max(-1, Math.min(1, cosUpper)));

    // Direction to target
    const toTarget = Vec3Math.normalize(Vec3Math.sub(targetPos, rootPos));
    
    // Calculate mid position
    const bendAxis = target.poleVector
      ? Vec3Math.normalize(Vec3Math.cross(toTarget, Vec3Math.sub(target.poleVector, rootPos)))
      : { x: 0, y: 0, z: 1 };

    const upperRot = QuatMath.fromAxisAngle(bendAxis, -upperAngle);
    const upperDir = QuatMath.rotateVec3(upperRot, toTarget);
    const midPos = Vec3Math.add(rootPos, Vec3Math.scale(upperDir, upperLength));

    // Calculate end position
    const midToEnd = Vec3Math.normalize(Vec3Math.sub(targetPos, midPos));
    const endPos = Vec3Math.add(midPos, Vec3Math.scale(midToEnd, lowerLength));

    const jointTransforms = new Map<string, Transform>();
    
    jointTransforms.set(rootId, {
      position: rootPos,
      rotation: QuatMath.lookRotation(upperDir),
      scale: { x: 1, y: 1, z: 1 },
    });

    jointTransforms.set(midId, {
      position: midPos,
      rotation: QuatMath.lookRotation(midToEnd),
      scale: { x: 1, y: 1, z: 1 },
    });

    jointTransforms.set(endId, {
      position: endPos,
      rotation: target.rotation || QuatMath.identity(),
      scale: { x: 1, y: 1, z: 1 },
    });

    const positionError = Vec3Math.distance(endPos, targetPos);

    return {
      reached: positionError < this.config.positionTolerance,
      iterations: 1,
      positionError,
      rotationError: 0,
      jointTransforms,
    };
  }
}

// ============================================================================
// Look-At Solver
// ============================================================================

export class LookAtSolver implements IKSolver {
  config: SolverConfig;

  constructor(config: Partial<SolverConfig> = {}) {
    this.config = { ...DEFAULT_SOLVER_CONFIG, type: SolverType.LookAt, ...config };
  }

  solve(joints: Joint[], chain: IKChain, target: IKTarget): SolverResult {
    if (chain.jointIds.length < 1) {
      throw new Error('LookAtSolver requires at least 1 joint');
    }

    const jointId = chain.jointIds[chain.jointIds.length - 1];
    const joint = joints.find(j => j.id === jointId)!;
    const jointPos = Vec3Math.clone(joint.worldTransform.position);

    const toTarget = Vec3Math.sub(target.position, jointPos);
    const distance = Vec3Math.length(toTarget);
    
    if (distance < 0.001) {
      return {
        reached: true,
        iterations: 1,
        positionError: 0,
        rotationError: 0,
        jointTransforms: new Map([[jointId, joint.worldTransform]]),
      };
    }

    const lookDir = Vec3Math.normalize(toTarget);
    const rotation = QuatMath.lookRotation(lookDir);

    // Blend with current rotation based on weight
    const blendedRotation = target.rotationWeight < 1
      ? QuatMath.slerp(joint.worldTransform.rotation, rotation, target.rotationWeight)
      : rotation;

    const jointTransforms = new Map<string, Transform>();
    jointTransforms.set(jointId, {
      position: jointPos,
      rotation: blendedRotation,
      scale: { x: 1, y: 1, z: 1 },
    });

    return {
      reached: true,
      iterations: 1,
      positionError: 0,
      rotationError: 0,
      jointTransforms,
    };
  }
}

// ============================================================================
// Solver Factory
// ============================================================================

export function createSolver(type: SolverType, config?: Partial<SolverConfig>): IKSolver {
  switch (type) {
    case SolverType.FABRIK:
      return new FABRIKSolver(config);
    case SolverType.CCD:
      return new CCDSolver(config);
    case SolverType.TwoBone:
      return new TwoBoneSolver(config);
    case SolverType.LookAt:
      return new LookAtSolver(config);
    default:
      return new FABRIKSolver(config);
  }
}

// Re-export enums from types
export { SolverType } from '../types';
