/**
 * @holoscript/gestures - Body Pose Detector
 * Full body and upper body pose detection for VR/AR
 */

import type {
  Vec3,
  BodyJointPositions,
  BodyPose,
  BodyStance,
  BodyRecognizerConfig,
  GestureEvent,
  GestureEventHandler,
} from '../types';
import { BodyJoint, BodyGesture, DEFAULT_BODY_RECOGNIZER_CONFIG } from '../types';

// ============================================================================
// Vector Math
// ============================================================================

const Vec3Math = {
  create: (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z }),
  
  sub: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),
  
  add: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),
  
  scale: (v: Vec3, s: number): Vec3 => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  }),
  
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  
  distance: (a: Vec3, b: Vec3): number => Vec3Math.length(Vec3Math.sub(a, b)),
  
  normalize: (v: Vec3): Vec3 => {
    const len = Vec3Math.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
  
  cross: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }),
  
  angle: (a: Vec3, b: Vec3): number => {
    const dot = Vec3Math.dot(Vec3Math.normalize(a), Vec3Math.normalize(b));
    return Math.acos(Math.max(-1, Math.min(1, dot)));
  },
};

// ============================================================================
// Stance Thresholds
// ============================================================================

interface StanceThresholds {
  // Standing
  standingHeadHeightMin: number;
  
  // Crouching
  crouchHeadHeightMax: number;
  crouchHeadHeightMin: number;
  
  // Prone
  proneHeadHeightMax: number;
  
  // Lean thresholds (radians)
  leanForwardAngle: number;
  leanBackwardAngle: number;
  leanLeftAngle: number;
  leanRightAngle: number;
  
  // Jump detection  
  jumpVelocityThreshold: number;
}

const DEFAULT_THRESHOLDS: StanceThresholds = {
  standingHeadHeightMin: 1.4, // 1.4m minimum for standing
  crouchHeadHeightMax: 1.3,
  crouchHeadHeightMin: 0.5,
  proneHeadHeightMax: 0.4,
  leanForwardAngle: 0.3, // ~17 degrees
  leanBackwardAngle: 0.3,
  leanLeftAngle: 0.25,
  leanRightAngle: 0.25,
  jumpVelocityThreshold: 1.5, // m/s upward velocity
};

// ============================================================================
// Body Pose Analyzer
// ============================================================================

export class BodyPoseAnalyzer {
  private config: BodyRecognizerConfig;
  private thresholds: StanceThresholds;
  
  // Calibration
  private calibratedHeight: number = 1.7; // Default standing height
  private calibratedShoulderWidth: number = 0.4;
  private isCalibrated: boolean = false;
  
  // Position history for velocity
  private positionHistory: Array<{ position: Vec3; timestamp: number }> = [];
  private historyMaxLength: number = 10;

  constructor(
    config: BodyRecognizerConfig = DEFAULT_BODY_RECOGNIZER_CONFIG,
    thresholds: StanceThresholds = DEFAULT_THRESHOLDS
  ) {
    this.config = config;
    this.thresholds = thresholds;
  }

  /** Calibrate with current pose as standing reference */
  calibrate(joints: BodyJointPositions): void {
    const head = joints[BodyJoint.Head];
    const leftShoulder = joints[BodyJoint.LeftShoulder];
    const rightShoulder = joints[BodyJoint.RightShoulder];
    
    if (head) {
      this.calibratedHeight = head.y;
    }
    
    if (leftShoulder && rightShoulder) {
      this.calibratedShoulderWidth = Vec3Math.distance(leftShoulder, rightShoulder);
    }
    
    this.isCalibrated = true;
  }

  /** Analyze current pose */
  analyze(joints: BodyJointPositions): BodyPose {
    const now = performance.now();
    const head = joints[BodyJoint.Head] ?? { x: 0, y: 1.7, z: 0 };
    
    // Track position history
    this.positionHistory.push({ position: head, timestamp: now });
    if (this.positionHistory.length > this.historyMaxLength) {
      this.positionHistory.shift();
    }
    
    // Calculate velocity
    const velocity = this.calculateVelocity();
    
    // Calculate center of mass (approximation)
    const centerOfMass = this.calculateCenterOfMass(joints);
    
    // Determine facing direction
    const facingDirection = this.calculateFacingDirection(joints);
    
    // Determine stance
    const stance = this.determineStance(joints, velocity);
    
    // Calculate arm positions relative to body
    const armsRaised = this.areArmsRaised(joints);
    const armsForward = this.areArmsForward(joints);
    
    return {
      joints,
      centerOfMass,
      facingDirection,
      velocity,
      isMoving: Vec3Math.length(velocity) > 0.1,
      stance,
      armsRaised,
      armsForward,
    };
  }

  /** Calculate velocity from position history */
  private calculateVelocity(): Vec3 {
    if (this.positionHistory.length < 2) {
      return { x: 0, y: 0, z: 0 };
    }
    
    const recent = this.positionHistory[this.positionHistory.length - 1];
    const older = this.positionHistory[0];
    const dt = (recent.timestamp - older.timestamp) / 1000; // Convert to seconds
    
    if (dt <= 0) return { x: 0, y: 0, z: 0 };
    
    return {
      x: (recent.position.x - older.position.x) / dt,
      y: (recent.position.y - older.position.y) / dt,
      z: (recent.position.z - older.position.z) / dt,
    };
  }

  /** Calculate approximate center of mass */
  private calculateCenterOfMass(joints: BodyJointPositions): Vec3 {
    // Weight different joints (torso joints weighted more)
    const weights: [BodyJoint, number][] = [
      [BodyJoint.Hips, 3],
      [BodyJoint.Spine, 2],
      [BodyJoint.Chest, 2],
      [BodyJoint.Head, 1],
      [BodyJoint.LeftShoulder, 1],
      [BodyJoint.RightShoulder, 1],
    ];
    
    let totalWeight = 0;
    let weighted = { x: 0, y: 0, z: 0 };
    
    for (const [joint, weight] of weights) {
      const pos = joints[joint];
      if (pos) {
        weighted.x += pos.x * weight;
        weighted.y += pos.y * weight;
        weighted.z += pos.z * weight;
        totalWeight += weight;
      }
    }
    
    if (totalWeight === 0) {
      return { x: 0, y: 1, z: 0 };
    }
    
    return {
      x: weighted.x / totalWeight,
      y: weighted.y / totalWeight,
      z: weighted.z / totalWeight,
    };
  }

  /** Calculate facing direction from shoulder/hip orientation */
  private calculateFacingDirection(joints: BodyJointPositions): Vec3 {
    const leftShoulder = joints[BodyJoint.LeftShoulder];
    const rightShoulder = joints[BodyJoint.RightShoulder];
    
    if (!leftShoulder || !rightShoulder) {
      return { x: 0, y: 0, z: -1 }; // Default forward
    }
    
    // Shoulder vector
    const shoulderVec = Vec3Math.normalize(Vec3Math.sub(rightShoulder, leftShoulder));
    
    // Facing is perpendicular to shoulder line
    // Cross with up vector to get facing
    const up = { x: 0, y: 1, z: 0 };
    const facing = Vec3Math.normalize(Vec3Math.cross(up, shoulderVec));
    
    return facing;
  }

  /** Determine current body stance */
  private determineStance(joints: BodyJointPositions, velocity: Vec3): BodyStance {
    const head = joints[BodyJoint.Head];
    const hips = joints[BodyJoint.Hips];
    
    const headHeight = head?.y ?? 1.7;
    const heightRatio = this.isCalibrated 
      ? headHeight / this.calibratedHeight 
      : headHeight / 1.7;
    
    // Check for jump
    if (velocity.y > this.thresholds.jumpVelocityThreshold) {
      return 'jumping';
    }
    
    // Check lying down (prone/supine)
    if (headHeight < this.thresholds.proneHeadHeightMax) {
      return 'lying';
    }
    
    // Check for lean
    if (head && hips) {
      const leanVec = Vec3Math.sub(head, hips);
      const leanAngle = Vec3Math.angle(leanVec, { x: 0, y: 1, z: 0 });
      
      // Check which direction
      if (leanVec.z < -0.1 && leanAngle > this.thresholds.leanForwardAngle) {
        return 'leaning_forward';
      }
      if (leanVec.z > 0.1 && leanAngle > this.thresholds.leanBackwardAngle) {
        return 'leaning_back';
      }
      if (leanVec.x < -0.1 && leanAngle > this.thresholds.leanLeftAngle) {
        return 'leaning_left';
      }
      if (leanVec.x > 0.1 && leanAngle > this.thresholds.leanRightAngle) {
        return 'leaning_right';
      }
    }
    
    // Check crouching
    if (heightRatio < 0.8 && headHeight < this.thresholds.crouchHeadHeightMax) {
      return 'crouching';
    }
    
    // Check sitting
    if (hips && head) {
      const hipToHead = headHeight - hips.y;
      if (hips.y < 0.7 && hipToHead > 0.4) {
        return 'sitting';
      }
    }
    
    // Default standing
    return 'standing';
  }

  /** Check if arms are raised */
  private areArmsRaised(joints: BodyJointPositions): boolean {
    const head = joints[BodyJoint.Head];
    const leftWrist = joints[BodyJoint.LeftWrist];
    const rightWrist = joints[BodyJoint.RightWrist];
    
    if (!head) return false;
    
    const threshold = head.y - 0.3; // Raised if above shoulder height
    
    const leftRaised = leftWrist && leftWrist.y > threshold;
    const rightRaised = rightWrist && rightWrist.y > threshold;
    
    return Boolean(leftRaised || rightRaised);
  }

  /** Check if arms are extended forward */
  private areArmsForward(joints: BodyJointPositions): boolean {
    const chest = joints[BodyJoint.Chest];
    const leftWrist = joints[BodyJoint.LeftWrist];
    const rightWrist = joints[BodyJoint.RightWrist];
    
    if (!chest) return false;
    
    const facing = this.calculateFacingDirection(joints);
    const forwardThreshold = 0.4; // How far forward from chest
    
    let forward = false;
    
    if (leftWrist) {
      const toWrist = Vec3Math.sub(leftWrist, chest);
      const forwardDist = Vec3Math.dot(toWrist, facing);
      if (forwardDist > forwardThreshold) forward = true;
    }
    
    if (rightWrist) {
      const toWrist = Vec3Math.sub(rightWrist, chest);
      const forwardDist = Vec3Math.dot(toWrist, facing);
      if (forwardDist > forwardThreshold) forward = true;
    }
    
    return forward;
  }

  /** Get the current config */
  getConfig(): BodyRecognizerConfig {
    return this.config;
  }

  /** Get the calibrated shoulder width */
  getCalibratedShoulderWidth(): number {
    return this.calibratedShoulderWidth;
  }

  /** Get the calibrated height */
  getCalibratedHeight(): number {
    return this.calibratedHeight;
  }

  /** Check if calibrated */
  getIsCalibrated(): boolean {
    return this.isCalibrated;
  }
}

// ============================================================================
// Body Gesture Detector
// ============================================================================

export class BodyGestureDetector {
  private config: BodyRecognizerConfig;
  private analyzer: BodyPoseAnalyzer;
  private eventHandlers: Set<GestureEventHandler> = new Set();
  
  // State tracking
  private lastPose: BodyPose | null = null;
  private gestureStartTimes: Map<BodyGesture, number> = new Map();
  private activeGestures: Set<BodyGesture> = new Set();

  constructor(config?: Partial<BodyRecognizerConfig>) {
    this.config = { ...DEFAULT_BODY_RECOGNIZER_CONFIG, ...config };
    this.analyzer = new BodyPoseAnalyzer(this.config);
  }

  /** Calibrate with current standing pose */
  calibrate(joints: BodyJointPositions): void {
    this.analyzer.calibrate(joints);
  }

  /** Update with new joint positions */
  update(joints: BodyJointPositions): BodyPose {
    const now = performance.now();
    const pose = this.analyzer.analyze(joints);
    
    // Detect gestures
    this.detectGestures(pose, now);
    
    this.lastPose = pose;
    return pose;
  }

  /** Detect body gestures */
  private detectGestures(pose: BodyPose, now: number): void {
    const detectedGestures = new Set<BodyGesture>();
    
    // Stance-based gestures
    switch (pose.stance) {
      case 'standing':
        detectedGestures.add(BodyGesture.Stand);
        break;
      case 'crouching':
        detectedGestures.add(BodyGesture.Crouch);
        detectedGestures.add(BodyGesture.Duck);
        break;
      case 'jumping':
        detectedGestures.add(BodyGesture.Jump);
        break;
      case 'lying':
        detectedGestures.add(BodyGesture.Prone);
        break;
      case 'leaning_forward':
        detectedGestures.add(BodyGesture.LeanForward);
        break;
      case 'leaning_back':
        detectedGestures.add(BodyGesture.LeanBack);
        break;
      case 'leaning_left':
        detectedGestures.add(BodyGesture.LeanLeft);
        break;
      case 'leaning_right':
        detectedGestures.add(BodyGesture.LeanRight);
        break;
    }
    
    // Arms raised check
    if (pose.armsRaised) {
      detectedGestures.add(BodyGesture.ArmsRaised);
    }
    
    // Arms forward / T-pose check
    if (this.isTPose(pose)) {
      detectedGestures.add(BodyGesture.TPose);
    }
    
    // Spin detection (compare facing direction change)
    if (this.lastPose) {
      const spinAmount = this.detectSpin(this.lastPose.facingDirection, pose.facingDirection);
      if (spinAmount !== null) {
        detectedGestures.add(spinAmount > 0 ? BodyGesture.SpinLeft : BodyGesture.SpinRight);
      }
    }
    
    // Emit events for gesture changes
    for (const gesture of detectedGestures) {
      if (!this.activeGestures.has(gesture)) {
        // Gesture started
        this.gestureStartTimes.set(gesture, now);
        this.emit({
          type: 'body_gesture_start',
          gesture,
          timestamp: now,
        });
      }
    }
    
    for (const gesture of this.activeGestures) {
      if (!detectedGestures.has(gesture)) {
        // Gesture ended
        const startTime = this.gestureStartTimes.get(gesture) ?? now;
        const duration = now - startTime;
        this.emit({
          type: 'body_gesture_end',
          gesture,
          duration,
          timestamp: now,
        });
        this.gestureStartTimes.delete(gesture);
      }
    }
    
    this.activeGestures = detectedGestures;
  }

  /** Check for T-pose */
  private isTPose(pose: BodyPose): boolean {
    const leftShoulder = pose.joints[BodyJoint.LeftShoulder];
    const rightShoulder = pose.joints[BodyJoint.RightShoulder];
    const leftWrist = pose.joints[BodyJoint.LeftWrist];
    const rightWrist = pose.joints[BodyJoint.RightWrist];
    
    if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) {
      return false;
    }
    
    // Arms should be roughly horizontal and extended to sides
    const leftArm = Vec3Math.normalize(Vec3Math.sub(leftWrist, leftShoulder));
    const rightArm = Vec3Math.normalize(Vec3Math.sub(rightWrist, rightShoulder));
    
    // Check that arms are roughly horizontal (low Y component)
    const leftHorizontal = Math.abs(leftArm.y) < 0.3;
    const rightHorizontal = Math.abs(rightArm.y) < 0.3;
    
    // Check that arms are extended to sides (opposite X directions)
    const leftOutward = leftArm.x < -0.5;
    const rightOutward = rightArm.x > 0.5;
    
    return leftHorizontal && rightHorizontal && leftOutward && rightOutward;
  }

  /** Detect spin by facing direction change */
  private detectSpin(oldFacing: Vec3, newFacing: Vec3): number | null {
    const cross = Vec3Math.cross(oldFacing, newFacing);
    const dot = Vec3Math.dot(oldFacing, newFacing);
    
    // Significant rotation (more than ~30 degrees per frame)
    if (Math.abs(cross.y) > 0.5 && dot < 0.5) {
      return cross.y; // Positive = spinning left
    }
    
    return null;
  }

  /** Get active body gestures */
  getActiveGestures(): BodyGesture[] {
    return Array.from(this.activeGestures);
  }

  /** Get duration of an active gesture */
  getGestureDuration(gesture: BodyGesture): number | null {
    const startTime = this.gestureStartTimes.get(gesture);
    if (startTime === undefined) return null;
    return performance.now() - startTime;
  }

  /** Add event handler */
  addEventListener(handler: GestureEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /** Remove event handler */
  removeEventListener(handler: GestureEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /** Emit event */
  private emit(event: GestureEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Body gesture event handler error:', e);
      }
    }
  }
}

// ============================================================================
// 3-Point Body Tracker (HMD + Controllers)
// ============================================================================

export class ThreePointTracker {
  private headPosition: Vec3 = { x: 0, y: 1.7, z: 0 };
  private leftHandPosition: Vec3 = { x: -0.3, y: 1.0, z: 0 };
  private rightHandPosition: Vec3 = { x: 0.3, y: 1.0, z: 0 };
  
  // Estimated body proportions
  private neckLength: number = 0.15;
  private shoulderWidth: number = 0.4;
  private armLength: number = 0.6;
  private torsoLength: number = 0.5;

  /** Update with 3-point tracking data */
  update(
    headPos: Vec3,
    leftHandPos: Vec3,
    rightHandPos: Vec3
  ): BodyJointPositions {
    this.headPosition = headPos;
    this.leftHandPosition = leftHandPos;
    this.rightHandPosition = rightHandPos;
    
    return this.estimateBody();
  }

  /** Estimate full body from 3 points */
  private estimateBody(): BodyJointPositions {
    const joints: BodyJointPositions = {};
    
    // Head
    joints[BodyJoint.Head] = this.headPosition;
    
    // Neck (below head)
    joints[BodyJoint.Neck] = {
      x: this.headPosition.x,
      y: this.headPosition.y - this.neckLength,
      z: this.headPosition.z,
    };
    
    // Shoulders (between neck and hands)
    const neckY = this.headPosition.y - this.neckLength;
    joints[BodyJoint.LeftShoulder] = {
      x: this.headPosition.x - this.shoulderWidth / 2,
      y: neckY,
      z: this.headPosition.z,
    };
    joints[BodyJoint.RightShoulder] = {
      x: this.headPosition.x + this.shoulderWidth / 2,
      y: neckY,
      z: this.headPosition.z,
    };
    
    // Wrists (from controller positions)
    joints[BodyJoint.LeftWrist] = this.leftHandPosition;
    joints[BodyJoint.RightWrist] = this.rightHandPosition;
    
    // Elbows (interpolated based on relative arm length)
    const elbowT = 0.5 * (this.armLength / 0.6); // Normalized to default arm
    joints[BodyJoint.LeftElbow] = Vec3Math.lerp(
      joints[BodyJoint.LeftShoulder]!,
      joints[BodyJoint.LeftWrist]!,
      Math.min(0.5, elbowT)
    );
    joints[BodyJoint.RightElbow] = Vec3Math.lerp(
      joints[BodyJoint.RightShoulder]!,
      joints[BodyJoint.RightWrist]!,
      Math.min(0.5, elbowT)
    );
    
    // Chest (between shoulders, slightly down)
    joints[BodyJoint.Chest] = {
      x: this.headPosition.x,
      y: neckY - 0.15,
      z: this.headPosition.z,
    };
    
    // Spine (between chest and hips)
    joints[BodyJoint.Spine] = {
      x: this.headPosition.x,
      y: neckY - this.torsoLength / 2,
      z: this.headPosition.z,
    };
    
    // Hips (below spine)
    joints[BodyJoint.Hips] = {
      x: this.headPosition.x,
      y: neckY - this.torsoLength,
      z: this.headPosition.z,
    };
    
    return joints;
  }

  /** Set body proportions */
  setProportions(proportions: {
    neckLength?: number;
    shoulderWidth?: number;
    armLength?: number;
    torsoLength?: number;
  }): void {
    if (proportions.neckLength !== undefined) this.neckLength = proportions.neckLength;
    if (proportions.shoulderWidth !== undefined) this.shoulderWidth = proportions.shoulderWidth;
    if (proportions.armLength !== undefined) this.armLength = proportions.armLength;
    if (proportions.torsoLength !== undefined) this.torsoLength = proportions.torsoLength;
  }
}

// Factory functions
export function createBodyPoseAnalyzer(
  config?: Partial<BodyRecognizerConfig>
): BodyPoseAnalyzer {
  return new BodyPoseAnalyzer(
    config ? { ...DEFAULT_BODY_RECOGNIZER_CONFIG, ...config } : undefined
  );
}

export function createBodyGestureDetector(
  config?: Partial<BodyRecognizerConfig>
): BodyGestureDetector {
  return new BodyGestureDetector(config);
}

export function createThreePointTracker(): ThreePointTracker {
  return new ThreePointTracker();
}

// Re-exports
export { BodyJoint, BodyGesture } from '../types';
export type { BodyJointPositions, BodyPose, BodyStance, BodyRecognizerConfig } from '../types';
