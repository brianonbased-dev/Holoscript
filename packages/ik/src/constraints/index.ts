/**
 * @holoscript/ik - Constraint System
 * Hinge, ball-socket, twist, and other IK constraints
 */

import type {
  Vec3,
  Quaternion,
  Joint,
  Constraint,
  ConstraintParams,
  HingeConstraintParams,
  BallSocketConstraintParams,
  TwistConstraintParams,
} from '../types';
import { ConstraintType } from '../types';
import { Vec3Math, QuatMath } from '../solvers';

// ============================================================================
// Constraint Solver Interface
// ============================================================================

export interface ConstraintSolver {
  apply(joint: Joint, constraint: Constraint): void;
}

// ============================================================================
// Hinge Constraint
// ============================================================================

export class HingeConstraint implements ConstraintSolver {
  apply(joint: Joint, constraint: Constraint): void {
    const params = constraint.params as HingeConstraintParams;
    const { axis, minAngle, maxAngle } = params;

    // Project rotation onto hinge axis
    const rotation = joint.localTransform.rotation;
    
    // Extract angle around hinge axis
    const hingeAxis = Vec3Math.normalize(axis);
    const angle = this.getAngleAroundAxis(rotation, hingeAxis);

    // Clamp angle
    const clampedAngle = Math.max(minAngle, Math.min(maxAngle, angle));

    if (Math.abs(angle - clampedAngle) > 0.001) {
      // Create corrected rotation
      joint.localTransform.rotation = QuatMath.fromAxisAngle(hingeAxis, clampedAngle);
    }
  }

  private getAngleAroundAxis(q: Quaternion, axis: Vec3): number {
    // Project quaternion onto axis
    const dot = q.x * axis.x + q.y * axis.y + q.z * axis.z;
    const projQ: Quaternion = {
      x: axis.x * dot,
      y: axis.y * dot,
      z: axis.z * dot,
      w: q.w,
    };
    const normalized = QuatMath.normalize(projQ);
    return 2 * Math.atan2(
      Math.sqrt(normalized.x * normalized.x + normalized.y * normalized.y + normalized.z * normalized.z),
      normalized.w
    );
  }
}

// ============================================================================
// Ball Socket Constraint
// ============================================================================

export class BallSocketConstraint implements ConstraintSolver {
  apply(joint: Joint, constraint: Constraint): void {
    const params = constraint.params as BallSocketConstraintParams;
    const { swingLimit, twistMin, twistMax } = params;

    const rotation = joint.localTransform.rotation;
    
    // Decompose rotation into swing and twist
    const { swing, twist } = this.decomposeSwingTwist(rotation, { x: 0, y: 1, z: 0 });

    // Constrain swing (cone limit)
    const swingAngle = 2 * Math.acos(Math.max(-1, Math.min(1, swing.w)));
    if (swingAngle > swingLimit) {
      const scale = swingLimit / swingAngle;
      const halfAngle = swingAngle * scale / 2;
      const sinHalf = Math.sin(halfAngle);
      const len = Math.sqrt(swing.x * swing.x + swing.y * swing.y + swing.z * swing.z);
      
      if (len > 0.0001) {
        swing.x = (swing.x / len) * sinHalf;
        swing.y = (swing.y / len) * sinHalf;
        swing.z = (swing.z / len) * sinHalf;
        swing.w = Math.cos(halfAngle);
      }
    }

    // Constrain twist
    const twistAngle = 2 * Math.atan2(
      Math.sqrt(twist.x * twist.x + twist.y * twist.y + twist.z * twist.z),
      twist.w
    );
    const clampedTwist = Math.max(twistMin, Math.min(twistMax, twistAngle));
    
    if (Math.abs(twistAngle - clampedTwist) > 0.001) {
      const axis = Vec3Math.normalize({ x: twist.x, y: twist.y, z: twist.z });
      const newTwist = QuatMath.fromAxisAngle(axis, clampedTwist);
      Object.assign(twist, newTwist);
    }

    // Recombine swing and twist
    joint.localTransform.rotation = QuatMath.normalize(QuatMath.multiply(swing, twist));
  }

  private decomposeSwingTwist(q: Quaternion, twistAxis: Vec3): { swing: Quaternion; twist: Quaternion } {
    const dot = q.x * twistAxis.x + q.y * twistAxis.y + q.z * twistAxis.z;
    const projection: Quaternion = {
      x: twistAxis.x * dot,
      y: twistAxis.y * dot,
      z: twistAxis.z * dot,
      w: q.w,
    };

    const twist = QuatMath.normalize(projection);
    const swing = QuatMath.multiply(q, QuatMath.conjugate(twist));

    return { swing: QuatMath.normalize(swing), twist };
  }
}

// ============================================================================
// Twist Constraint
// ============================================================================

export class TwistConstraint implements ConstraintSolver {
  apply(joint: Joint, constraint: Constraint): void {
    const params = constraint.params as TwistConstraintParams;
    const { axis, minAngle, maxAngle } = params;

    const rotation = joint.localTransform.rotation;
    const twistAxis = Vec3Math.normalize(axis);

    // Extract twist angle
    const { twist } = this.decomposeSwingTwist(rotation, twistAxis);
    const twistAngle = 2 * Math.atan2(
      Math.sqrt(twist.x * twist.x + twist.y * twist.y + twist.z * twist.z),
      twist.w
    );

    // Clamp twist
    const clampedAngle = Math.max(minAngle, Math.min(maxAngle, twistAngle));
    
    if (Math.abs(twistAngle - clampedAngle) > 0.001) {
      const newTwist = QuatMath.fromAxisAngle(twistAxis, clampedAngle);
      // Get swing component and recombine
      const swing = QuatMath.multiply(rotation, QuatMath.conjugate(twist));
      joint.localTransform.rotation = QuatMath.normalize(QuatMath.multiply(swing, newTwist));
    }
  }

  private decomposeSwingTwist(q: Quaternion, twistAxis: Vec3): { swing: Quaternion; twist: Quaternion } {
    const dot = q.x * twistAxis.x + q.y * twistAxis.y + q.z * twistAxis.z;
    const projection: Quaternion = {
      x: twistAxis.x * dot,
      y: twistAxis.y * dot,
      z: twistAxis.z * dot,
      w: q.w,
    };

    const twist = QuatMath.normalize(projection);
    const swing = QuatMath.multiply(q, QuatMath.conjugate(twist));

    return { swing: QuatMath.normalize(swing), twist };
  }
}

// ============================================================================
// Constraint Manager
// ============================================================================

export class ConstraintManager {
  private solvers: Map<ConstraintType, ConstraintSolver>;

  constructor() {
    this.solvers = new Map<ConstraintType, ConstraintSolver>();
    this.solvers.set(ConstraintType.Hinge, new HingeConstraint());
    this.solvers.set(ConstraintType.BallSocket, new BallSocketConstraint());
    this.solvers.set(ConstraintType.Twist, new TwistConstraint());
  }

  /** Apply a single constraint to a joint */
  applyConstraint(joint: Joint, constraint: Constraint): void {
    if (!constraint.enabled || constraint.weight <= 0) return;

    const solver = this.solvers.get(constraint.type);
    if (solver) {
      solver.apply(joint, constraint);
    }
  }

  /** Apply all constraints to joints */
  applyConstraints(joints: Map<string, Joint>, constraints: Map<string, Constraint>): void {
    for (const [, constraint] of constraints) {
      const joint = joints.get(constraint.jointId);
      if (joint) {
        this.applyConstraint(joint, constraint);
      }
    }
  }

  /** Create a hinge constraint */
  static createHingeConstraint(
    id: string,
    jointId: string,
    axis: Vec3,
    minAngle: number,
    maxAngle: number
  ): Constraint {
    return {
      id,
      type: ConstraintType.Hinge,
      jointId,
      params: { type: 'hinge', axis, minAngle, maxAngle },
      weight: 1,
      enabled: true,
    };
  }

  /** Create a ball-socket constraint */
  static createBallSocketConstraint(
    id: string,
    jointId: string,
    swingLimit: number,
    twistMin: number,
    twistMax: number
  ): Constraint {
    return {
      id,
      type: ConstraintType.BallSocket,
      jointId,
      params: { type: 'ball-socket', swingLimit, twistMin, twistMax },
      weight: 1,
      enabled: true,
    };
  }

  /** Create a twist constraint */
  static createTwistConstraint(
    id: string,
    jointId: string,
    axis: Vec3,
    minAngle: number,
    maxAngle: number
  ): Constraint {
    return {
      id,
      type: ConstraintType.Twist,
      jointId,
      params: { type: 'twist', axis, minAngle, maxAngle },
      weight: 1,
      enabled: true,
    };
  }

  /** Create humanoid arm constraints */
  static createArmConstraints(
    prefix: string,
    shoulderId: string,
    elbowId: string,
    wristId: string
  ): Constraint[] {
    const isLeft = prefix.toLowerCase().includes('left');
    const bendDir = isLeft ? 1 : -1;

    return [
      // Shoulder - ball socket with limited range
      ConstraintManager.createBallSocketConstraint(
        `${prefix}_shoulder_constraint`,
        shoulderId,
        Math.PI * 0.6, // 108 degree cone
        -Math.PI * 0.25, // -45 degrees twist
        Math.PI * 0.5 // 90 degrees twist
      ),
      // Elbow - hinge joint
      ConstraintManager.createHingeConstraint(
        `${prefix}_elbow_constraint`,
        elbowId,
        { x: bendDir, y: 0, z: 0 }, // Bend axis
        0, // Can't extend past straight
        Math.PI * 0.85 // ~150 degree flex
      ),
      // Wrist - limited ball socket
      ConstraintManager.createBallSocketConstraint(
        `${prefix}_wrist_constraint`,
        wristId,
        Math.PI * 0.35, // ~60 degree cone
        -Math.PI * 0.5, // -90 degrees
        Math.PI * 0.5 // 90 degrees
      ),
    ];
  }

  /** Create humanoid leg constraints */
  static createLegConstraints(
    prefix: string,
    hipId: string,
    kneeId: string,
    ankleId: string
  ): Constraint[] {
    return [
      // Hip - ball socket
      ConstraintManager.createBallSocketConstraint(
        `${prefix}_hip_constraint`,
        hipId,
        Math.PI * 0.5, // 90 degree cone
        -Math.PI * 0.25, // -45 degrees twist
        Math.PI * 0.25 // 45 degrees twist
      ),
      // Knee - hinge joint (bends backward)
      ConstraintManager.createHingeConstraint(
        `${prefix}_knee_constraint`,
        kneeId,
        { x: 1, y: 0, z: 0 }, // Bend axis
        0, // Can't extend past straight
        Math.PI * 0.75 // ~135 degree flex
      ),
      // Ankle - limited ball socket
      ConstraintManager.createBallSocketConstraint(
        `${prefix}_ankle_constraint`,
        ankleId,
        Math.PI * 0.25, // ~45 degree cone
        -Math.PI * 0.15, // Limited twist
        Math.PI * 0.15
      ),
    ];
  }

  /** Create spine constraints */
  static createSpineConstraints(spineJointIds: string[]): Constraint[] {
    return spineJointIds.map((id, index) => {
      const flexibility = 0.15 + (index * 0.05); // More flexible higher up
      return ConstraintManager.createBallSocketConstraint(
        `spine_${index}_constraint`,
        id,
        Math.PI * flexibility,
        -Math.PI * 0.1,
        Math.PI * 0.1
      );
    });
  }
}

// Re-export
export { ConstraintType };
export type { Constraint, ConstraintParams };
