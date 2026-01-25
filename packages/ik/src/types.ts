/**
 * @holoscript/ik - Inverse Kinematics Types
 */

// ============================================================================
// Math Types
// ============================================================================

/** 3D Vector */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Quaternion for rotations */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** 4x4 Transform Matrix (column-major) */
export type Matrix4 = Float32Array;

/** Transform with position, rotation, scale */
export interface Transform {
  position: Vec3;
  rotation: Quaternion;
  scale: Vec3;
}

// ============================================================================
// Joint Types
// ============================================================================

/** Joint type enumeration */
export enum JointType {
  /** Ball-and-socket joint (3 DOF) */
  BallSocket = 'ball-socket',
  /** Hinge joint (1 DOF rotation around axis) */
  Hinge = 'hinge',
  /** Twist joint (1 DOF rotation around bone axis) */
  Twist = 'twist',
  /** Fixed joint (0 DOF) */
  Fixed = 'fixed',
  /** Universal joint (2 DOF) */
  Universal = 'universal',
}

/** Joint configuration */
export interface JointConfig {
  type: JointType;
  /** Rotation limits in radians */
  limits?: JointLimits;
  /** Preferred rest pose */
  restPose?: Quaternion;
  /** Stiffness (0-1, affects IK solving) */
  stiffness: number;
  /** Damping factor */
  damping: number;
}

/** Joint rotation limits */
export interface JointLimits {
  /** Minimum rotation per axis (radians) */
  min: Vec3;
  /** Maximum rotation per axis (radians) */
  max: Vec3;
  /** Axis of rotation (for hinge joints) */
  hingeAxis?: Vec3;
  /** Twist axis (for twist joints) */
  twistAxis?: Vec3;
}

/** Joint definition in a skeleton */
export interface Joint {
  id: string;
  name: string;
  parentId: string | null;
  config: JointConfig;
  /** Local bind pose transform */
  bindPose: Transform;
  /** Current local transform */
  localTransform: Transform;
  /** Cached world transform */
  worldTransform: Transform;
  /** Bone length to child */
  boneLength: number;
}

// ============================================================================
// Chain Types
// ============================================================================

/** IK Chain definition */
export interface IKChain {
  id: string;
  name: string;
  /** Joint IDs from root to end effector */
  jointIds: string[];
  /** Chain type for specialized solving */
  type: IKChainType;
  /** End effector offset from last joint */
  endEffectorOffset: Vec3;
  /** Chain weight for blending */
  weight: number;
}

/** IK Chain type */
export enum IKChainType {
  /** Generic chain */
  Generic = 'generic',
  /** Arm chain (shoulder, elbow, wrist) */
  Arm = 'arm',
  /** Leg chain (hip, knee, ankle) */
  Leg = 'leg',
  /** Spine chain */
  Spine = 'spine',
  /** Finger chain */
  Finger = 'finger',
  /** Look-at chain (single joint) */
  LookAt = 'look-at',
}

// ============================================================================
// Target Types
// ============================================================================

/** IK Target */
export interface IKTarget {
  /** Target chain ID */
  chainId: string;
  /** Target position in world space */
  position: Vec3;
  /** Optional target rotation */
  rotation?: Quaternion;
  /** Position weight (0-1) */
  positionWeight: number;
  /** Rotation weight (0-1) */
  rotationWeight: number;
  /** Pole vector for controlling elbow/knee direction */
  poleVector?: Vec3;
  /** Pole vector weight */
  poleWeight: number;
}

/** Look-at target */
export interface LookAtTarget {
  /** Target position to look at */
  position: Vec3;
  /** Up vector */
  upVector: Vec3;
  /** Weight (0-1) */
  weight: number;
  /** Clamp angles */
  clampAngles?: Vec3;
}

// ============================================================================
// Solver Types
// ============================================================================

/** IK Solver type */
export enum SolverType {
  /** Forward And Backward Reaching IK */
  FABRIK = 'fabrik',
  /** Cyclic Coordinate Descent */
  CCD = 'ccd',
  /** Jacobian (analytical) */
  Jacobian = 'jacobian',
  /** Two-bone analytical */
  TwoBone = 'two-bone',
  /** Look-at solver */
  LookAt = 'look-at',
}

/** Solver configuration */
export interface SolverConfig {
  type: SolverType;
  /** Maximum iterations per solve */
  maxIterations: number;
  /** Position tolerance for convergence */
  positionTolerance: number;
  /** Rotation tolerance for convergence (radians) */
  rotationTolerance: number;
  /** Enable constraint enforcement */
  enforceConstraints: boolean;
  /** Damping factor to prevent oscillation */
  damping: number;
}

/** Default solver configuration */
export const DEFAULT_SOLVER_CONFIG: SolverConfig = {
  type: SolverType.FABRIK,
  maxIterations: 10,
  positionTolerance: 0.001,
  rotationTolerance: 0.01,
  enforceConstraints: true,
  damping: 0.5,
};

/** Solver result */
export interface SolverResult {
  /** Whether the target was reached */
  reached: boolean;
  /** Number of iterations used */
  iterations: number;
  /** Final distance to target */
  positionError: number;
  /** Final rotation error (radians) */
  rotationError: number;
  /** Updated joint transforms */
  jointTransforms: Map<string, Transform>;
}

// ============================================================================
// Constraint Types
// ============================================================================

/** Constraint type */
export enum ConstraintType {
  /** Hinge constraint (elbow, knee) */
  Hinge = 'hinge',
  /** Ball-socket constraint (shoulder, hip) */
  BallSocket = 'ball-socket',
  /** Twist constraint (forearm, spine) */
  Twist = 'twist',
  /** Distance constraint */
  Distance = 'distance',
  /** Position constraint (ground, wall) */
  Position = 'position',
  /** Look-at constraint */
  LookAt = 'look-at',
  /** Pole vector constraint */
  PoleVector = 'pole-vector',
}

/** Constraint definition */
export interface Constraint {
  id: string;
  type: ConstraintType;
  jointId: string;
  /** Constraint-specific parameters */
  params: ConstraintParams;
  /** Weight (0-1) */
  weight: number;
  /** Is constraint active */
  enabled: boolean;
}

/** Constraint parameters union */
export type ConstraintParams =
  | HingeConstraintParams
  | BallSocketConstraintParams
  | TwistConstraintParams
  | DistanceConstraintParams
  | PositionConstraintParams
  | LookAtConstraintParams
  | PoleVectorConstraintParams;

export interface HingeConstraintParams {
  type: 'hinge';
  axis: Vec3;
  minAngle: number;
  maxAngle: number;
}

export interface BallSocketConstraintParams {
  type: 'ball-socket';
  /** Swing limit (cone angle in radians) */
  swingLimit: number;
  /** Twist limit (radians) */
  twistMin: number;
  twistMax: number;
}

export interface TwistConstraintParams {
  type: 'twist';
  axis: Vec3;
  minAngle: number;
  maxAngle: number;
}

export interface DistanceConstraintParams {
  type: 'distance';
  targetJointId: string;
  minDistance: number;
  maxDistance: number;
}

export interface PositionConstraintParams {
  type: 'position';
  /** World space position constraint */
  position: Vec3;
  /** Axes to constrain (x, y, z each 0-1) */
  axes: Vec3;
}

export interface LookAtConstraintParams {
  type: 'look-at';
  targetPosition: Vec3;
  upVector: Vec3;
  /** Forward axis of the joint */
  forwardAxis: Vec3;
}

export interface PoleVectorConstraintParams {
  type: 'pole-vector';
  /** Pole target position */
  polePosition: Vec3;
  /** Chain start joint */
  startJointId: string;
  /** Chain end joint */
  endJointId: string;
}

// ============================================================================
// Full-Body IK Types
// ============================================================================

/** Humanoid bone mapping */
export enum HumanoidBone {
  Hips = 'hips',
  Spine = 'spine',
  Spine1 = 'spine1',
  Spine2 = 'spine2',
  Chest = 'chest',
  Neck = 'neck',
  Head = 'head',
  
  LeftShoulder = 'left-shoulder',
  LeftUpperArm = 'left-upper-arm',
  LeftLowerArm = 'left-lower-arm',
  LeftHand = 'left-hand',
  
  RightShoulder = 'right-shoulder',
  RightUpperArm = 'right-upper-arm',
  RightLowerArm = 'right-lower-arm',
  RightHand = 'right-hand',
  
  LeftUpperLeg = 'left-upper-leg',
  LeftLowerLeg = 'left-lower-leg',
  LeftFoot = 'left-foot',
  LeftToe = 'left-toe',
  
  RightUpperLeg = 'right-upper-leg',
  RightLowerLeg = 'right-lower-leg',
  RightFoot = 'right-foot',
  RightToe = 'right-toe',
  
  // Fingers
  LeftThumb1 = 'left-thumb-1',
  LeftThumb2 = 'left-thumb-2',
  LeftThumb3 = 'left-thumb-3',
  LeftIndex1 = 'left-index-1',
  LeftIndex2 = 'left-index-2',
  LeftIndex3 = 'left-index-3',
  LeftMiddle1 = 'left-middle-1',
  LeftMiddle2 = 'left-middle-2',
  LeftMiddle3 = 'left-middle-3',
  LeftRing1 = 'left-ring-1',
  LeftRing2 = 'left-ring-2',
  LeftRing3 = 'left-ring-3',
  LeftPinky1 = 'left-pinky-1',
  LeftPinky2 = 'left-pinky-2',
  LeftPinky3 = 'left-pinky-3',
  
  RightThumb1 = 'right-thumb-1',
  RightThumb2 = 'right-thumb-2',
  RightThumb3 = 'right-thumb-3',
  RightIndex1 = 'right-index-1',
  RightIndex2 = 'right-index-2',
  RightIndex3 = 'right-index-3',
  RightMiddle1 = 'right-middle-1',
  RightMiddle2 = 'right-middle-2',
  RightMiddle3 = 'right-middle-3',
  RightRing1 = 'right-ring-1',
  RightRing2 = 'right-ring-2',
  RightRing3 = 'right-ring-3',
  RightPinky1 = 'right-pinky-1',
  RightPinky2 = 'right-pinky-2',
  RightPinky3 = 'right-pinky-3',
}

/** Full-body IK configuration */
export interface FullBodyIKConfig {
  /** Enable spine IK */
  spineIK: boolean;
  /** Enable arm IK */
  armIK: boolean;
  /** Enable leg IK */
  legIK: boolean;
  /** Enable look-at */
  lookAt: boolean;
  /** Enable finger IK */
  fingerIK: boolean;
  /** Ground plane height */
  groundHeight: number;
  /** Use foot grounding */
  footGrounding: boolean;
  /** Hip height offset */
  hipOffset: number;
}

/** Full-body IK targets */
export interface FullBodyTargets {
  head?: LookAtTarget;
  leftHand?: IKTarget;
  rightHand?: IKTarget;
  leftFoot?: IKTarget;
  rightFoot?: IKTarget;
  hips?: Vec3;
  /** Finger poses (0-1 per finger for grip) */
  leftFingers?: number[];
  rightFingers?: number[];
}

/** Skeleton definition */
export interface Skeleton {
  id: string;
  name: string;
  joints: Map<string, Joint>;
  chains: Map<string, IKChain>;
  constraints: Map<string, Constraint>;
  /** Root joint ID */
  rootId: string;
  /** Humanoid bone mapping (optional) */
  humanoidMapping?: Map<HumanoidBone, string>;
}

// ============================================================================
// Hand Tracking Types
// ============================================================================

/** Hand tracking data from XR */
export interface HandTrackingData {
  hand: 'left' | 'right';
  joints: HandJointData[];
  isTracking: boolean;
}

/** Individual hand joint data */
export interface HandJointData {
  name: HandJointName;
  position: Vec3;
  rotation: Quaternion;
  radius: number;
}

/** WebXR hand joint names */
export enum HandJointName {
  Wrist = 'wrist',
  ThumbMetacarpal = 'thumb-metacarpal',
  ThumbProximal = 'thumb-phalanx-proximal',
  ThumbDistal = 'thumb-phalanx-distal',
  ThumbTip = 'thumb-tip',
  IndexMetacarpal = 'index-finger-metacarpal',
  IndexProximal = 'index-finger-phalanx-proximal',
  IndexIntermediate = 'index-finger-phalanx-intermediate',
  IndexDistal = 'index-finger-phalanx-distal',
  IndexTip = 'index-finger-tip',
  MiddleMetacarpal = 'middle-finger-metacarpal',
  MiddleProximal = 'middle-finger-phalanx-proximal',
  MiddleIntermediate = 'middle-finger-phalanx-intermediate',
  MiddleDistal = 'middle-finger-phalanx-distal',
  MiddleTip = 'middle-finger-tip',
  RingMetacarpal = 'ring-finger-metacarpal',
  RingProximal = 'ring-finger-phalanx-proximal',
  RingIntermediate = 'ring-finger-phalanx-intermediate',
  RingDistal = 'ring-finger-phalanx-distal',
  RingTip = 'ring-finger-tip',
  PinkyMetacarpal = 'pinky-finger-metacarpal',
  PinkyProximal = 'pinky-finger-phalanx-proximal',
  PinkyIntermediate = 'pinky-finger-phalanx-intermediate',
  PinkyDistal = 'pinky-finger-phalanx-distal',
  PinkyTip = 'pinky-finger-tip',
}
