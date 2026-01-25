/**
 * @holoscript/ik - Full-Body IK System
 * Humanoid IK for VR avatars with hand tracking support
 */

import type {
  Vec3,
  Quaternion,
  Transform,
  Joint,
  IKChain,
  IKTarget,
  Skeleton,
  FullBodyIKConfig,
  FullBodyTargets,
  LookAtTarget,
  HandTrackingData,
  HandJointData,
  SolverResult,
} from '../types';
import { HumanoidBone, IKChainType, JointType, SolverType, HandJointName } from '../types';
import { Vec3Math, QuatMath, FABRIKSolver, TwoBoneSolver, LookAtSolver, createSolver } from '../solvers';
import { ConstraintManager } from '../constraints';

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_FULLBODY_CONFIG: FullBodyIKConfig = {
  spineIK: true,
  armIK: true,
  legIK: true,
  lookAt: true,
  fingerIK: false,
  groundHeight: 0,
  footGrounding: true,
  hipOffset: 0,
};

// ============================================================================
// Full-Body IK Controller
// ============================================================================

export class FullBodyIKController {
  private skeleton: Skeleton;
  private config: FullBodyIKConfig;
  private constraintManager: ConstraintManager;
  
  // Cached solvers
  private armSolver: TwoBoneSolver;
  private legSolver: TwoBoneSolver;
  private spineSolver: FABRIKSolver;
  private lookAtSolver: LookAtSolver;

  constructor(skeleton: Skeleton, config: Partial<FullBodyIKConfig> = {}) {
    this.skeleton = skeleton;
    this.config = { ...DEFAULT_FULLBODY_CONFIG, ...config };
    this.constraintManager = new ConstraintManager();

    this.armSolver = new TwoBoneSolver({ damping: 0.8 });
    this.legSolver = new TwoBoneSolver({ damping: 0.9 });
    this.spineSolver = new FABRIKSolver({ maxIterations: 5, damping: 0.5 });
    this.lookAtSolver = new LookAtSolver();
  }

  /** Update full-body IK with targets */
  update(targets: FullBodyTargets, deltaTime: number = 1/60): Map<string, Transform> {
    const results = new Map<string, Transform>();

    // 1. Update hip position first (if provided)
    if (targets.hips) {
      this.updateHips(targets.hips, results);
    }

    // 2. Look-at for head/neck
    if (this.config.lookAt && targets.head) {
      this.updateLookAt(targets.head, results);
    }

    // 3. Arm IK
    if (this.config.armIK) {
      if (targets.leftHand) {
        this.updateArm('left', targets.leftHand, results);
      }
      if (targets.rightHand) {
        this.updateArm('right', targets.rightHand, results);
      }
    }

    // 4. Leg IK with foot grounding
    if (this.config.legIK) {
      if (targets.leftFoot) {
        this.updateLeg('left', targets.leftFoot, results);
      }
      if (targets.rightFoot) {
        this.updateLeg('right', targets.rightFoot, results);
      }
    }

    // 5. Spine IK (after arms/legs to maintain connectivity)
    if (this.config.spineIK) {
      this.updateSpine(results);
    }

    // 6. Finger IK
    if (this.config.fingerIK) {
      if (targets.leftFingers) {
        this.updateFingers('left', targets.leftFingers, results);
      }
      if (targets.rightFingers) {
        this.updateFingers('right', targets.rightFingers, results);
      }
    }

    // Apply constraints
    this.constraintManager.applyConstraints(this.skeleton.joints, this.skeleton.constraints);

    return results;
  }

  private updateHips(position: Vec3, results: Map<string, Transform>): void {
    const hipsId = this.getJointIdForBone(HumanoidBone.Hips);
    if (!hipsId) return;

    const hips = this.skeleton.joints.get(hipsId);
    if (!hips) return;

    const adjustedY = position.y + this.config.hipOffset;
    const newPos: Vec3 = { x: position.x, y: adjustedY, z: position.z };

    results.set(hipsId, {
      position: newPos,
      rotation: hips.worldTransform.rotation,
      scale: hips.worldTransform.scale,
    });

    // Update joint
    hips.worldTransform.position = newPos;
  }

  private updateLookAt(target: LookAtTarget, results: Map<string, Transform>): void {
    const headId = this.getJointIdForBone(HumanoidBone.Head);
    const neckId = this.getJointIdForBone(HumanoidBone.Neck);
    
    if (!headId) return;

    const head = this.skeleton.joints.get(headId);
    if (!head) return;

    // Create look-at chain
    const chainJoints: Joint[] = [];
    if (neckId) {
      const neck = this.skeleton.joints.get(neckId);
      if (neck) chainJoints.push(neck);
    }
    chainJoints.push(head);

    const chain: IKChain = {
      id: 'look_at_chain',
      name: 'Look At',
      jointIds: chainJoints.map(j => j.id),
      type: IKChainType.LookAt,
      endEffectorOffset: { x: 0, y: 0, z: 0 },
      weight: target.weight,
    };

    const ikTarget: IKTarget = {
      chainId: chain.id,
      position: target.position,
      positionWeight: 0,
      rotationWeight: target.weight,
      poleWeight: 0,
    };

    const result = this.lookAtSolver.solve(chainJoints, chain, ikTarget);

    for (const [jointId, transform] of result.jointTransforms) {
      results.set(jointId, transform);
      const joint = this.skeleton.joints.get(jointId);
      if (joint) {
        joint.worldTransform = transform;
      }
    }
  }

  private updateArm(side: 'left' | 'right', target: IKTarget, results: Map<string, Transform>): void {
    const shoulderBone = side === 'left' ? HumanoidBone.LeftUpperArm : HumanoidBone.RightUpperArm;
    const elbowBone = side === 'left' ? HumanoidBone.LeftLowerArm : HumanoidBone.RightLowerArm;
    const wristBone = side === 'left' ? HumanoidBone.LeftHand : HumanoidBone.RightHand;

    const shoulderId = this.getJointIdForBone(shoulderBone);
    const elbowId = this.getJointIdForBone(elbowBone);
    const wristId = this.getJointIdForBone(wristBone);

    if (!shoulderId || !elbowId || !wristId) return;

    const shoulder = this.skeleton.joints.get(shoulderId);
    const elbow = this.skeleton.joints.get(elbowId);
    const wrist = this.skeleton.joints.get(wristId);

    if (!shoulder || !elbow || !wrist) return;

    const chain: IKChain = {
      id: `${side}_arm_chain`,
      name: `${side} Arm`,
      jointIds: [shoulderId, elbowId, wristId],
      type: IKChainType.Arm,
      endEffectorOffset: { x: 0, y: 0, z: 0 },
      weight: target.positionWeight,
    };

    // Default pole vector (elbow points outward/backward)
    if (!target.poleVector) {
      const poleOffset = side === 'left' ? -0.3 : 0.3;
      target.poleVector = Vec3Math.add(
        elbow.worldTransform.position,
        { x: poleOffset, y: -0.2, z: -0.3 }
      );
      target.poleWeight = 0.5;
    }

    const result = this.armSolver.solve([shoulder, elbow, wrist], chain, target);

    for (const [jointId, transform] of result.jointTransforms) {
      results.set(jointId, transform);
      const joint = this.skeleton.joints.get(jointId);
      if (joint) {
        joint.worldTransform = transform;
      }
    }
  }

  private updateLeg(side: 'left' | 'right', target: IKTarget, results: Map<string, Transform>): void {
    const hipBone = side === 'left' ? HumanoidBone.LeftUpperLeg : HumanoidBone.RightUpperLeg;
    const kneeBone = side === 'left' ? HumanoidBone.LeftLowerLeg : HumanoidBone.RightLowerLeg;
    const ankleBone = side === 'left' ? HumanoidBone.LeftFoot : HumanoidBone.RightFoot;

    const hipId = this.getJointIdForBone(hipBone);
    const kneeId = this.getJointIdForBone(kneeBone);
    const ankleId = this.getJointIdForBone(ankleBone);

    if (!hipId || !kneeId || !ankleId) return;

    const hip = this.skeleton.joints.get(hipId);
    const knee = this.skeleton.joints.get(kneeId);
    const ankle = this.skeleton.joints.get(ankleId);

    if (!hip || !knee || !ankle) return;

    // Apply foot grounding
    let adjustedTarget = { ...target };
    if (this.config.footGrounding) {
      adjustedTarget.position = {
        x: target.position.x,
        y: Math.max(this.config.groundHeight, target.position.y),
        z: target.position.z,
      };
    }

    const chain: IKChain = {
      id: `${side}_leg_chain`,
      name: `${side} Leg`,
      jointIds: [hipId, kneeId, ankleId],
      type: IKChainType.Leg,
      endEffectorOffset: { x: 0, y: 0, z: 0 },
      weight: target.positionWeight,
    };

    // Default pole vector (knee points forward)
    if (!adjustedTarget.poleVector) {
      adjustedTarget.poleVector = Vec3Math.add(
        knee.worldTransform.position,
        { x: 0, y: 0, z: 0.5 }
      );
      adjustedTarget.poleWeight = 0.7;
    }

    const result = this.legSolver.solve([hip, knee, ankle], chain, adjustedTarget);

    for (const [jointId, transform] of result.jointTransforms) {
      results.set(jointId, transform);
      const joint = this.skeleton.joints.get(jointId);
      if (joint) {
        joint.worldTransform = transform;
      }
    }
  }

  private updateSpine(results: Map<string, Transform>): void {
    const spineBones = [
      HumanoidBone.Hips,
      HumanoidBone.Spine,
      HumanoidBone.Spine1,
      HumanoidBone.Spine2,
      HumanoidBone.Chest,
    ];

    const spineJoints: Joint[] = [];
    const spineIds: string[] = [];

    for (const bone of spineBones) {
      const id = this.getJointIdForBone(bone);
      if (id) {
        const joint = this.skeleton.joints.get(id);
        if (joint) {
          spineJoints.push(joint);
          spineIds.push(id);
        }
      }
    }

    if (spineJoints.length < 2) return;

    // Spine IK typically maintains relative positions after arm/leg IK
    // Here we just smooth out any discontinuities
    for (let i = 1; i < spineJoints.length; i++) {
      const parent = spineJoints[i - 1];
      const current = spineJoints[i];
      
      // Calculate direction from parent to current
      const dir = Vec3Math.normalize(Vec3Math.sub(
        current.worldTransform.position,
        parent.worldTransform.position
      ));
      
      // Update parent rotation to point at current
      parent.worldTransform.rotation = QuatMath.lookRotation(dir);
      results.set(spineIds[i - 1], parent.worldTransform);
    }
  }

  private updateFingers(side: 'left' | 'right', fingerGrips: number[], results: Map<string, Transform>): void {
    const fingerBones = side === 'left' ? [
      [HumanoidBone.LeftIndex1, HumanoidBone.LeftIndex2, HumanoidBone.LeftIndex3],
      [HumanoidBone.LeftMiddle1, HumanoidBone.LeftMiddle2, HumanoidBone.LeftMiddle3],
      [HumanoidBone.LeftRing1, HumanoidBone.LeftRing2, HumanoidBone.LeftRing3],
      [HumanoidBone.LeftPinky1, HumanoidBone.LeftPinky2, HumanoidBone.LeftPinky3],
      [HumanoidBone.LeftThumb1, HumanoidBone.LeftThumb2, HumanoidBone.LeftThumb3],
    ] : [
      [HumanoidBone.RightIndex1, HumanoidBone.RightIndex2, HumanoidBone.RightIndex3],
      [HumanoidBone.RightMiddle1, HumanoidBone.RightMiddle2, HumanoidBone.RightMiddle3],
      [HumanoidBone.RightRing1, HumanoidBone.RightRing2, HumanoidBone.RightRing3],
      [HumanoidBone.RightPinky1, HumanoidBone.RightPinky2, HumanoidBone.RightPinky3],
      [HumanoidBone.RightThumb1, HumanoidBone.RightThumb2, HumanoidBone.RightThumb3],
    ];

    for (let i = 0; i < fingerBones.length && i < fingerGrips.length; i++) {
      const grip = Math.max(0, Math.min(1, fingerGrips[i]));
      const maxCurl = Math.PI * 0.5; // 90 degrees max curl per joint

      for (const bone of fingerBones[i]) {
        const jointId = this.getJointIdForBone(bone);
        if (!jointId) continue;

        const joint = this.skeleton.joints.get(jointId);
        if (!joint) continue;

        // Curl finger based on grip value
        const curlAngle = grip * maxCurl;
        const curlAxis = { x: 1, y: 0, z: 0 }; // Curl around local X axis
        const curlRotation = QuatMath.fromAxisAngle(curlAxis, curlAngle);

        joint.localTransform.rotation = QuatMath.multiply(
          joint.bindPose.rotation,
          curlRotation
        );

        results.set(jointId, joint.localTransform);
      }
    }
  }

  private getJointIdForBone(bone: HumanoidBone): string | undefined {
    return this.skeleton.humanoidMapping?.get(bone);
  }

  /** Apply WebXR hand tracking data */
  applyHandTracking(data: HandTrackingData, results: Map<string, Transform>): void {
    if (!data.isTracking) return;

    // Map hand joints to skeleton
    const handPrefix = data.hand === 'left' ? 'Left' : 'Right';
    
    for (const jointData of data.joints) {
      const boneName = this.mapHandJointToBone(jointData.name, handPrefix);
      if (!boneName) continue;

      const jointId = this.getJointIdForBone(boneName);
      if (!jointId) continue;

      const joint = this.skeleton.joints.get(jointId);
      if (!joint) continue;

      // Apply tracking data
      joint.worldTransform.position = jointData.position;
      joint.worldTransform.rotation = jointData.rotation;
      
      results.set(jointId, joint.worldTransform);
    }
  }

  private mapHandJointToBone(jointName: HandJointName, prefix: string): HumanoidBone | undefined {
    const mapping: Partial<Record<HandJointName, HumanoidBone>> = {
      [HandJointName.Wrist]: prefix === 'Left' ? HumanoidBone.LeftHand : HumanoidBone.RightHand,
      [HandJointName.IndexProximal]: prefix === 'Left' ? HumanoidBone.LeftIndex1 : HumanoidBone.RightIndex1,
      [HandJointName.IndexIntermediate]: prefix === 'Left' ? HumanoidBone.LeftIndex2 : HumanoidBone.RightIndex2,
      [HandJointName.IndexDistal]: prefix === 'Left' ? HumanoidBone.LeftIndex3 : HumanoidBone.RightIndex3,
      [HandJointName.MiddleProximal]: prefix === 'Left' ? HumanoidBone.LeftMiddle1 : HumanoidBone.RightMiddle1,
      [HandJointName.MiddleIntermediate]: prefix === 'Left' ? HumanoidBone.LeftMiddle2 : HumanoidBone.RightMiddle2,
      [HandJointName.MiddleDistal]: prefix === 'Left' ? HumanoidBone.LeftMiddle3 : HumanoidBone.RightMiddle3,
      [HandJointName.RingProximal]: prefix === 'Left' ? HumanoidBone.LeftRing1 : HumanoidBone.RightRing1,
      [HandJointName.RingIntermediate]: prefix === 'Left' ? HumanoidBone.LeftRing2 : HumanoidBone.RightRing2,
      [HandJointName.RingDistal]: prefix === 'Left' ? HumanoidBone.LeftRing3 : HumanoidBone.RightRing3,
      [HandJointName.PinkyProximal]: prefix === 'Left' ? HumanoidBone.LeftPinky1 : HumanoidBone.RightPinky1,
      [HandJointName.PinkyIntermediate]: prefix === 'Left' ? HumanoidBone.LeftPinky2 : HumanoidBone.RightPinky2,
      [HandJointName.PinkyDistal]: prefix === 'Left' ? HumanoidBone.LeftPinky3 : HumanoidBone.RightPinky3,
      [HandJointName.ThumbProximal]: prefix === 'Left' ? HumanoidBone.LeftThumb1 : HumanoidBone.RightThumb1,
      [HandJointName.ThumbDistal]: prefix === 'Left' ? HumanoidBone.LeftThumb2 : HumanoidBone.RightThumb2,
    };

    return mapping[jointName];
  }
}

// ============================================================================
// Skeleton Builder
// ============================================================================

export class SkeletonBuilder {
  private joints: Map<string, Joint> = new Map();
  private chains: Map<string, IKChain> = new Map();
  private constraints: Map<string, Constraint> = new Map();
  private humanoidMapping: Map<HumanoidBone, string> = new Map();
  private rootId: string = '';

  /** Add a joint to the skeleton */
  addJoint(
    id: string,
    name: string,
    parentId: string | null,
    position: Vec3,
    boneLength: number = 0.1
  ): this {
    const joint: Joint = {
      id,
      name,
      parentId,
      config: {
        type: JointType.BallSocket,
        stiffness: 1,
        damping: 0.5,
      },
      bindPose: {
        position,
        rotation: QuatMath.identity(),
        scale: { x: 1, y: 1, z: 1 },
      },
      localTransform: {
        position: { ...position },
        rotation: QuatMath.identity(),
        scale: { x: 1, y: 1, z: 1 },
      },
      worldTransform: {
        position: { ...position },
        rotation: QuatMath.identity(),
        scale: { x: 1, y: 1, z: 1 },
      },
      boneLength,
    };

    this.joints.set(id, joint);

    if (!parentId) {
      this.rootId = id;
    }

    return this;
  }

  /** Map a joint to a humanoid bone */
  mapBone(jointId: string, bone: HumanoidBone): this {
    this.humanoidMapping.set(bone, jointId);
    return this;
  }

  /** Add an IK chain */
  addChain(id: string, name: string, jointIds: string[], type: IKChainType): this {
    this.chains.set(id, {
      id,
      name,
      jointIds,
      type,
      endEffectorOffset: { x: 0, y: 0, z: 0 },
      weight: 1,
    });
    return this;
  }

  /** Add a constraint */
  addConstraint(constraint: Constraint): this {
    this.constraints.set(constraint.id, constraint);
    return this;
  }

  /** Build the skeleton */
  build(id: string, name: string): Skeleton {
    return {
      id,
      name,
      joints: this.joints,
      chains: this.chains,
      constraints: this.constraints,
      rootId: this.rootId,
      humanoidMapping: this.humanoidMapping,
    };
  }

  /** Create a basic humanoid skeleton */
  static createHumanoid(height: number = 1.7): Skeleton {
    const builder = new SkeletonBuilder();
    
    const scale = height / 1.7;
    
    // Define joint positions relative to ground
    const positions = {
      hips: { x: 0, y: 1.0 * scale, z: 0 },
      spine: { x: 0, y: 1.1 * scale, z: 0 },
      spine1: { x: 0, y: 1.2 * scale, z: 0 },
      spine2: { x: 0, y: 1.3 * scale, z: 0 },
      chest: { x: 0, y: 1.4 * scale, z: 0 },
      neck: { x: 0, y: 1.5 * scale, z: 0 },
      head: { x: 0, y: 1.6 * scale, z: 0 },
      
      leftShoulder: { x: -0.1 * scale, y: 1.45 * scale, z: 0 },
      leftUpperArm: { x: -0.2 * scale, y: 1.4 * scale, z: 0 },
      leftLowerArm: { x: -0.45 * scale, y: 1.4 * scale, z: 0 },
      leftHand: { x: -0.7 * scale, y: 1.4 * scale, z: 0 },
      
      rightShoulder: { x: 0.1 * scale, y: 1.45 * scale, z: 0 },
      rightUpperArm: { x: 0.2 * scale, y: 1.4 * scale, z: 0 },
      rightLowerArm: { x: 0.45 * scale, y: 1.4 * scale, z: 0 },
      rightHand: { x: 0.7 * scale, y: 1.4 * scale, z: 0 },
      
      leftUpperLeg: { x: -0.1 * scale, y: 0.9 * scale, z: 0 },
      leftLowerLeg: { x: -0.1 * scale, y: 0.5 * scale, z: 0 },
      leftFoot: { x: -0.1 * scale, y: 0.05 * scale, z: 0 },
      
      rightUpperLeg: { x: 0.1 * scale, y: 0.9 * scale, z: 0 },
      rightLowerLeg: { x: 0.1 * scale, y: 0.5 * scale, z: 0 },
      rightFoot: { x: 0.1 * scale, y: 0.05 * scale, z: 0 },
    };

    // Create spine chain
    builder
      .addJoint('hips', 'Hips', null, positions.hips, 0.1 * scale)
      .mapBone('hips', HumanoidBone.Hips)
      .addJoint('spine', 'Spine', 'hips', positions.spine, 0.1 * scale)
      .mapBone('spine', HumanoidBone.Spine)
      .addJoint('spine1', 'Spine1', 'spine', positions.spine1, 0.1 * scale)
      .mapBone('spine1', HumanoidBone.Spine1)
      .addJoint('spine2', 'Spine2', 'spine1', positions.spine2, 0.1 * scale)
      .mapBone('spine2', HumanoidBone.Spine2)
      .addJoint('chest', 'Chest', 'spine2', positions.chest, 0.1 * scale)
      .mapBone('chest', HumanoidBone.Chest)
      .addJoint('neck', 'Neck', 'chest', positions.neck, 0.1 * scale)
      .mapBone('neck', HumanoidBone.Neck)
      .addJoint('head', 'Head', 'neck', positions.head, 0.1 * scale)
      .mapBone('head', HumanoidBone.Head);

    // Left arm
    builder
      .addJoint('left_shoulder', 'LeftShoulder', 'chest', positions.leftShoulder, 0.1 * scale)
      .mapBone('left_shoulder', HumanoidBone.LeftShoulder)
      .addJoint('left_upper_arm', 'LeftUpperArm', 'left_shoulder', positions.leftUpperArm, 0.25 * scale)
      .mapBone('left_upper_arm', HumanoidBone.LeftUpperArm)
      .addJoint('left_lower_arm', 'LeftLowerArm', 'left_upper_arm', positions.leftLowerArm, 0.25 * scale)
      .mapBone('left_lower_arm', HumanoidBone.LeftLowerArm)
      .addJoint('left_hand', 'LeftHand', 'left_lower_arm', positions.leftHand, 0.1 * scale)
      .mapBone('left_hand', HumanoidBone.LeftHand);

    // Right arm
    builder
      .addJoint('right_shoulder', 'RightShoulder', 'chest', positions.rightShoulder, 0.1 * scale)
      .mapBone('right_shoulder', HumanoidBone.RightShoulder)
      .addJoint('right_upper_arm', 'RightUpperArm', 'right_shoulder', positions.rightUpperArm, 0.25 * scale)
      .mapBone('right_upper_arm', HumanoidBone.RightUpperArm)
      .addJoint('right_lower_arm', 'RightLowerArm', 'right_upper_arm', positions.rightLowerArm, 0.25 * scale)
      .mapBone('right_lower_arm', HumanoidBone.RightLowerArm)
      .addJoint('right_hand', 'RightHand', 'right_lower_arm', positions.rightHand, 0.1 * scale)
      .mapBone('right_hand', HumanoidBone.RightHand);

    // Left leg
    builder
      .addJoint('left_upper_leg', 'LeftUpperLeg', 'hips', positions.leftUpperLeg, 0.4 * scale)
      .mapBone('left_upper_leg', HumanoidBone.LeftUpperLeg)
      .addJoint('left_lower_leg', 'LeftLowerLeg', 'left_upper_leg', positions.leftLowerLeg, 0.4 * scale)
      .mapBone('left_lower_leg', HumanoidBone.LeftLowerLeg)
      .addJoint('left_foot', 'LeftFoot', 'left_lower_leg', positions.leftFoot, 0.1 * scale)
      .mapBone('left_foot', HumanoidBone.LeftFoot);

    // Right leg
    builder
      .addJoint('right_upper_leg', 'RightUpperLeg', 'hips', positions.rightUpperLeg, 0.4 * scale)
      .mapBone('right_upper_leg', HumanoidBone.RightUpperLeg)
      .addJoint('right_lower_leg', 'RightLowerLeg', 'right_upper_leg', positions.rightLowerLeg, 0.4 * scale)
      .mapBone('right_lower_leg', HumanoidBone.RightLowerLeg)
      .addJoint('right_foot', 'RightFoot', 'right_lower_leg', positions.rightFoot, 0.1 * scale)
      .mapBone('right_foot', HumanoidBone.RightFoot);

    // Add IK chains
    builder
      .addChain('left_arm', 'Left Arm', ['left_upper_arm', 'left_lower_arm', 'left_hand'], IKChainType.Arm)
      .addChain('right_arm', 'Right Arm', ['right_upper_arm', 'right_lower_arm', 'right_hand'], IKChainType.Arm)
      .addChain('left_leg', 'Left Leg', ['left_upper_leg', 'left_lower_leg', 'left_foot'], IKChainType.Leg)
      .addChain('right_leg', 'Right Leg', ['right_upper_leg', 'right_lower_leg', 'right_foot'], IKChainType.Leg)
      .addChain('spine', 'Spine', ['hips', 'spine', 'spine1', 'spine2', 'chest'], IKChainType.Spine);

    // Add constraints
    const armConstraints = [
      ...ConstraintManager.createArmConstraints('left', 'left_upper_arm', 'left_lower_arm', 'left_hand'),
      ...ConstraintManager.createArmConstraints('right', 'right_upper_arm', 'right_lower_arm', 'right_hand'),
    ];
    
    const legConstraints = [
      ...ConstraintManager.createLegConstraints('left', 'left_upper_leg', 'left_lower_leg', 'left_foot'),
      ...ConstraintManager.createLegConstraints('right', 'right_upper_leg', 'right_lower_leg', 'right_foot'),
    ];

    for (const constraint of [...armConstraints, ...legConstraints]) {
      builder.addConstraint(constraint);
    }

    return builder.build('humanoid', 'Humanoid Skeleton');
  }
}

// Constraint type re-import
import type { Constraint } from '../types';
