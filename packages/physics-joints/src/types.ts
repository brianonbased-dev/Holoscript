/**
 * @holoscript/physics-joints - Type Definitions
 * Physics constraint and joint system for VR interactions
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quaternion;
  scale?: Vec3;
}

// ============================================================================
// Physics Body Types
// ============================================================================

export enum BodyType {
  /** Immovable */
  Static = 'static',
  /** Affected by physics */
  Dynamic = 'dynamic',
  /** Moved by code, affects dynamic bodies */
  Kinematic = 'kinematic',
}

export interface PhysicsBody {
  /** Unique identifier */
  id: string;
  /** Body type */
  type: BodyType | 'static' | 'dynamic' | 'kinematic';
  /** Position */
  position: Vec3;
  /** Rotation */
  rotation: Quaternion;
  /** Mass in kg (0 for static) */
  mass: number;
  /** Linear velocity */
  velocity?: Vec3;
  /** Angular velocity */
  angularVelocity?: Vec3;
  /** Linear damping (0-1) */
  linearDamping?: number;
  /** Angular damping (0-1) */
  angularDamping?: number;
  /** Is sleeping (optimization) */
  isSleeping?: boolean;
}

// ============================================================================
// Constraint Types
// ============================================================================

export enum ConstraintType {
  /** Fixed position/rotation */
  Fixed = 'fixed',
  /** Point-to-point (ball socket) */
  Point = 'point',
  /** Single axis rotation (door hinge) */
  Hinge = 'hinge',
  /** Slider along axis */
  Slider = 'slider',
  /** Twist + swing rotation */
  ConeTwist = 'cone_twist',
  /** Full 6-DOF constraint */
  Generic = 'generic',
  /** Spring connection */
  Spring = 'spring',
  /** Distance constraint */
  Distance = 'distance',
}

export interface ConstraintConfig {
  /** Constraint type */
  type?: ConstraintType;
  /** First body ID */
  bodyA?: string;
  /** Second body ID (null = world) */
  bodyB?: string | null;
  /** Anchor point on body A (local space) */
  anchorA?: Vec3;
  /** Anchor point on body B (local space) */
  anchorB?: Vec3;
  /** Is constraint enabled */
  enabled?: boolean;
  /** Collision between connected bodies */
  collideConnected?: boolean;
  /** Breaking force (undefined = unbreakable) */
  breakForce?: number;
}

// ============================================================================
// Specific Constraint Configs
// ============================================================================

export interface FixedConstraintConfig extends ConstraintConfig {
  type?: ConstraintType.Fixed;
  /** Anchor point on body A (local space) */
  anchorA?: Vec3;
  /** Anchor point on body B (local space) */
  anchorB?: Vec3;
}

export interface PointConstraintConfig extends ConstraintConfig {
  type?: ConstraintType.Point;
  /** Anchor point on body A (local space) */
  anchorA: Vec3;
  /** Anchor point on body B (local space) */
  anchorB: Vec3;
  /** Maximum distance (0 = rigid) */
  maxDistance?: number;
}

export interface HingeConstraintConfig extends ConstraintConfig {
  type?: ConstraintType.Hinge;
  /** Anchor point on body A (local space) */
  anchorA: Vec3;
  /** Anchor point on body B (local space) */
  anchorB: Vec3;
  /** Rotation axis (local to body A) */
  axis: Vec3;
  /** Minimum angle (radians) */
  minAngle?: number;
  /** Maximum angle (radians) */
  maxAngle?: number;
  /** Motor configuration */
  motor?: {
    enabled: boolean;
    targetSpeed: number;
    maxForce: number;
  };
}

export interface SliderConstraintConfig extends ConstraintConfig {
  type: ConstraintType.Slider;
  /** Slide axis (local to body A) */
  axis: Vec3;
  /** Enable position limits */
  enableLimits: boolean;
  /** Minimum position */
  minPosition: number;
  /** Maximum position */
  maxPosition: number;
  /** Enable motor */
  enableMotor: boolean;
  /** Motor target velocity */
  motorVelocity: number;
  /** Maximum motor force */
  maxMotorForce: number;
}

export interface ConeTwistConstraintConfig extends ConstraintConfig {
  type: ConstraintType.ConeTwist;
  /** Twist axis (local to body A) */
  twistAxis: Vec3;
  /** Maximum swing angle X (radians) */
  swingSpanX: number;
  /** Maximum swing angle Y (radians) */
  swingSpanY: number;
  /** Maximum twist angle (radians) */
  twistSpan: number;
  /** Softness (0-1) */
  softness: number;
  /** Bias factor */
  biasFactor: number;
  /** Relaxation factor */
  relaxationFactor: number;
}

export interface SpringConstraintConfig extends ConstraintConfig {
  type?: ConstraintType.Spring;
  /** Anchor point on body A (local space) */
  anchorA: Vec3;
  /** Anchor point on body B (local space) */
  anchorB: Vec3;
  /** Rest length */
  restLength: number;
  /** Spring stiffness */
  stiffness: number;
  /** Damping coefficient */
  damping: number;
}

export interface DistanceConstraintConfig extends ConstraintConfig {
  type?: ConstraintType.Distance;
  /** Anchor point on body A (local space) */
  anchorA: Vec3;
  /** Anchor point on body B (local space) */
  anchorB: Vec3;
  /** Target distance */
  distance: number;
  /** Minimum distance */
  minDistance?: number;
  /** Maximum distance */
  maxDistance?: number;
  /** Stiffness (0-1, 1 = rigid) */
  stiffness?: number;
}

export interface GenericConstraintConfig extends ConstraintConfig {
  type: ConstraintType.Generic;
  /** Linear limits per axis */
  linearLimits: {
    x: { lower: number; upper: number };
    y: { lower: number; upper: number };
    z: { lower: number; upper: number };
  };
  /** Angular limits per axis (radians) */
  angularLimits: {
    x: { lower: number; upper: number };
    y: { lower: number; upper: number };
    z: { lower: number; upper: number };
  };
  /** Linear stiffness per axis */
  linearStiffness: Vec3;
  /** Angular stiffness per axis */
  angularStiffness: Vec3;
}

export type AnyConstraintConfig =
  | FixedConstraintConfig
  | PointConstraintConfig
  | HingeConstraintConfig
  | SliderConstraintConfig
  | ConeTwistConstraintConfig
  | SpringConstraintConfig
  | DistanceConstraintConfig
  | GenericConstraintConfig;

// ============================================================================
// Constraint State
// ============================================================================

export interface Constraint {
  /** Unique ID */
  id: string;
  /** Configuration */
  config: AnyConstraintConfig;
  /** Is currently active */
  isActive: boolean;
  /** Has broken due to force */
  isBroken: boolean;
  /** Current applied impulse */
  appliedImpulse: number;
}

// ============================================================================
// Ragdoll Types
// ============================================================================

export enum RagdollBone {
  Hips = 'hips',
  Spine = 'spine',
  Chest = 'chest',
  Head = 'head',
  LeftUpperArm = 'left_upper_arm',
  LeftLowerArm = 'left_lower_arm',
  LeftHand = 'left_hand',
  RightUpperArm = 'right_upper_arm',
  RightLowerArm = 'right_lower_arm',
  RightHand = 'right_hand',
  LeftUpperLeg = 'left_upper_leg',
  LeftLowerLeg = 'left_lower_leg',
  LeftFoot = 'left_foot',
  RightUpperLeg = 'right_upper_leg',
  RightLowerLeg = 'right_lower_leg',
  RightFoot = 'right_foot',
}

export interface RagdollBoneConfig {
  /** Bone identifier */
  bone: RagdollBone;
  /** Position */
  position: Vec3;
  /** Rotation */
  rotation: Quaternion;
  /** Mass */
  mass: number;
  /** Collider shape */
  shape?: 'capsule' | 'box' | 'sphere';
  /** Shape dimensions */
  dimensions?: Vec3;
  /** Local offset from joint */
  offset?: Vec3;
}

export interface RagdollJointConfig {
  /** Parent bone */
  parentBone: RagdollBone;
  /** Child bone */
  childBone: RagdollBone;
  /** Anchor point */
  anchor: Vec3;
  /** Joint type */
  type?: ConstraintType.Hinge | ConstraintType.ConeTwist;
  /** Twist axis */
  twistAxis?: Vec3;
  /** Swing limit X (radians) */
  swingLimitX?: number;
  /** Swing limit Y (radians) */
  swingLimitY?: number;
  /** Minimum twist (radians) */
  minTwist?: number;
  /** Maximum twist (radians) */
  maxTwist?: number;
}

export interface RagdollConfig {
  /** Ragdoll identifier */
  id: string;
  /** Bone configurations */
  bones: RagdollBoneConfig[];
  /** Joint configurations */
  joints: RagdollJointConfig[];
  /** Global damping */
  damping: number;
  /** Self-collision enabled */
  selfCollision: boolean;
}

export interface RagdollState {
  /** Is ragdoll active */
  isActive: boolean;
  /** Active bones (partial ragdoll) */
  activeBones: Set<RagdollBone>;
  /** Animation blend (0 = full ragdoll, 1 = full animation) */
  animationBlend: number;
  /** Configuration (optional) */
  config?: RagdollConfig;
  /** Blend weight (0 = animation, 1 = physics) - deprecated, use animationBlend */
  blendWeight?: number;
  /** Bone transforms */
  boneTransforms?: Map<RagdollBone, Transform>;
}

// ============================================================================
// Chain / Rope Types
// ============================================================================

export interface ChainLink {
  /** Link index */
  index: number;
  /** Link body */
  body: PhysicsBody;
  /** Link length */
  length?: number;
  /** Constraint to previous link */
  constraint?: Constraint | null;
}

export interface ChainConfig {
  /** Start point */
  startPoint: Vec3;
  /** End point */
  endPoint: Vec3;
  /** Number of segments */
  segments: number;
  /** Mass per segment */
  massPerSegment?: number;
  /** Is first link fixed */
  anchorStart?: boolean;
  /** Is last link fixed */
  anchorEnd?: boolean;
  /** Stiffness (0-1) */
  stiffness?: number;
  /** Damping */
  damping?: number;
}

// ============================================================================
// Soft Body Types
// ============================================================================

export interface SoftBodyNode {
  /** Node index */
  index: number;
  /** Position */
  position: Vec3;
  /** Velocity */
  velocity: Vec3;
  /** Mass */
  mass: number;
  /** Is pinned (fixed) */
  isPinned: boolean;
}

export interface SoftBodyLink {
  /** First node index */
  nodeA: number;
  /** Second node index */
  nodeB: number;
  /** Rest length */
  restLength: number;
  /** Stiffness */
  stiffness: number;
}

export interface SoftBodyConfig {
  /** Nodes (particles) */
  nodes: SoftBodyNode[];
  /** Links (springs) */
  links: SoftBodyLink[];
  /** Pressure for volume preservation */
  pressure: number;
  /** Global damping */
  damping: number;
  /** Solver iterations */
  iterations: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type PhysicsJointEvent =
  | { type: 'constraint_created'; constraintId: string; config: AnyConstraintConfig }
  | { type: 'constraint_broken'; constraintId: string; appliedForce: number }
  | { type: 'constraint_removed'; constraintId: string }
  | { type: 'ragdoll_activated'; ragdollId: string }
  | { type: 'ragdoll_deactivated'; ragdollId: string }
  | { type: 'chain_stretched'; chainId: string; stretch: number };

export type PhysicsJointEventHandler = (event: PhysicsJointEvent) => void;

// ============================================================================
// Manager Config
// ============================================================================

export interface PhysicsJointManagerConfig {
  /** Solver iterations */
  solverIterations: number;
  /** Constraint bias factor */
  biasFactor: number;
  /** Warm starting (use previous impulses) */
  warmStarting: boolean;
  /** Position correction threshold */
  slop: number;
}

/** Constraint solver configuration (alias) */
export type ConstraintSolverConfig = PhysicsJointManagerConfig;

export const DEFAULT_PHYSICS_JOINT_MANAGER_CONFIG: PhysicsJointManagerConfig = {
  solverIterations: 10,
  biasFactor: 0.2,
  warmStarting: true,
  slop: 0.01,
};

// ============================================================================
// Preset Ragdoll Configs
// ============================================================================

const IDENTITY_QUAT = { x: 0, y: 0, z: 0, w: 1 };

export const HUMANOID_RAGDOLL_PRESET: RagdollConfig = {
  id: 'humanoid',
  bones: [
    { bone: RagdollBone.Hips, position: { x: 0, y: 1.0, z: 0 }, rotation: IDENTITY_QUAT, mass: 10, shape: 'box', dimensions: { x: 0.25, y: 0.15, z: 0.15 } },
    { bone: RagdollBone.Spine, position: { x: 0, y: 1.15, z: 0 }, rotation: IDENTITY_QUAT, mass: 8, shape: 'box', dimensions: { x: 0.2, y: 0.15, z: 0.1 } },
    { bone: RagdollBone.Chest, position: { x: 0, y: 1.35, z: 0 }, rotation: IDENTITY_QUAT, mass: 12, shape: 'box', dimensions: { x: 0.25, y: 0.2, z: 0.15 } },
    { bone: RagdollBone.Head, position: { x: 0, y: 1.6, z: 0 }, rotation: IDENTITY_QUAT, mass: 5, shape: 'sphere', dimensions: { x: 0.12, y: 0.12, z: 0.12 } },
    { bone: RagdollBone.LeftUpperArm, position: { x: -0.2, y: 1.4, z: 0 }, rotation: IDENTITY_QUAT, mass: 3, shape: 'capsule', dimensions: { x: 0.05, y: 0.15, z: 0.05 } },
    { bone: RagdollBone.LeftLowerArm, position: { x: -0.35, y: 1.25, z: 0 }, rotation: IDENTITY_QUAT, mass: 2, shape: 'capsule', dimensions: { x: 0.04, y: 0.12, z: 0.04 } },
    { bone: RagdollBone.LeftHand, position: { x: -0.5, y: 1.1, z: 0 }, rotation: IDENTITY_QUAT, mass: 0.5, shape: 'box', dimensions: { x: 0.05, y: 0.08, z: 0.02 } },
    { bone: RagdollBone.RightUpperArm, position: { x: 0.2, y: 1.4, z: 0 }, rotation: IDENTITY_QUAT, mass: 3, shape: 'capsule', dimensions: { x: 0.05, y: 0.15, z: 0.05 } },
    { bone: RagdollBone.RightLowerArm, position: { x: 0.35, y: 1.25, z: 0 }, rotation: IDENTITY_QUAT, mass: 2, shape: 'capsule', dimensions: { x: 0.04, y: 0.12, z: 0.04 } },
    { bone: RagdollBone.RightHand, position: { x: 0.5, y: 1.1, z: 0 }, rotation: IDENTITY_QUAT, mass: 0.5, shape: 'box', dimensions: { x: 0.05, y: 0.08, z: 0.02 } },
    { bone: RagdollBone.LeftUpperLeg, position: { x: -0.1, y: 0.75, z: 0 }, rotation: IDENTITY_QUAT, mass: 6, shape: 'capsule', dimensions: { x: 0.07, y: 0.22, z: 0.07 } },
    { bone: RagdollBone.LeftLowerLeg, position: { x: -0.1, y: 0.4, z: 0 }, rotation: IDENTITY_QUAT, mass: 4, shape: 'capsule', dimensions: { x: 0.05, y: 0.2, z: 0.05 } },
    { bone: RagdollBone.LeftFoot, position: { x: -0.1, y: 0.05, z: 0.05 }, rotation: IDENTITY_QUAT, mass: 1, shape: 'box', dimensions: { x: 0.06, y: 0.04, z: 0.12 } },
    { bone: RagdollBone.RightUpperLeg, position: { x: 0.1, y: 0.75, z: 0 }, rotation: IDENTITY_QUAT, mass: 6, shape: 'capsule', dimensions: { x: 0.07, y: 0.22, z: 0.07 } },
    { bone: RagdollBone.RightLowerLeg, position: { x: 0.1, y: 0.4, z: 0 }, rotation: IDENTITY_QUAT, mass: 4, shape: 'capsule', dimensions: { x: 0.05, y: 0.2, z: 0.05 } },
    { bone: RagdollBone.RightFoot, position: { x: 0.1, y: 0.05, z: 0.05 }, rotation: IDENTITY_QUAT, mass: 1, shape: 'box', dimensions: { x: 0.06, y: 0.04, z: 0.12 } },
  ],
  joints: [
    { parentBone: RagdollBone.Hips, childBone: RagdollBone.Spine, anchor: { x: 0, y: 0.1, z: 0 }, twistAxis: { x: 0, y: 1, z: 0 }, minTwist: -0.2, maxTwist: 0.2 },
    { parentBone: RagdollBone.Spine, childBone: RagdollBone.Chest, anchor: { x: 0, y: 0.1, z: 0 }, twistAxis: { x: 0, y: 1, z: 0 }, minTwist: -0.2, maxTwist: 0.2 },
    { parentBone: RagdollBone.Chest, childBone: RagdollBone.Head, anchor: { x: 0, y: 0.15, z: 0 }, twistAxis: { x: 0, y: 1, z: 0 }, minTwist: -0.7, maxTwist: 0.7 },
    { parentBone: RagdollBone.Chest, childBone: RagdollBone.LeftUpperArm, anchor: { x: -0.15, y: 0.1, z: 0 }, twistAxis: { x: 1, y: 0, z: 0 }, minTwist: -1.5, maxTwist: 1.5 },
    { parentBone: RagdollBone.LeftUpperArm, childBone: RagdollBone.LeftLowerArm, anchor: { x: 0, y: -0.12, z: 0 }, twistAxis: { x: 0, y: 0, z: 1 }, minTwist: 0, maxTwist: 2.5 },
    { parentBone: RagdollBone.LeftLowerArm, childBone: RagdollBone.LeftHand, anchor: { x: 0, y: -0.1, z: 0 }, twistAxis: { x: 1, y: 0, z: 0 }, minTwist: -0.5, maxTwist: 0.5 },
    { parentBone: RagdollBone.Chest, childBone: RagdollBone.RightUpperArm, anchor: { x: 0.15, y: 0.1, z: 0 }, twistAxis: { x: -1, y: 0, z: 0 }, minTwist: -1.5, maxTwist: 1.5 },
    { parentBone: RagdollBone.RightUpperArm, childBone: RagdollBone.RightLowerArm, anchor: { x: 0, y: -0.12, z: 0 }, twistAxis: { x: 0, y: 0, z: 1 }, minTwist: 0, maxTwist: 2.5 },
    { parentBone: RagdollBone.RightLowerArm, childBone: RagdollBone.RightHand, anchor: { x: 0, y: -0.1, z: 0 }, twistAxis: { x: -1, y: 0, z: 0 }, minTwist: -0.5, maxTwist: 0.5 },
    { parentBone: RagdollBone.Hips, childBone: RagdollBone.LeftUpperLeg, anchor: { x: -0.1, y: -0.1, z: 0 }, twistAxis: { x: 0, y: -1, z: 0 }, minTwist: -0.3, maxTwist: 0.3 },
    { parentBone: RagdollBone.LeftUpperLeg, childBone: RagdollBone.LeftLowerLeg, anchor: { x: 0, y: -0.18, z: 0 }, twistAxis: { x: 1, y: 0, z: 0 }, minTwist: 0, maxTwist: 2.5 },
    { parentBone: RagdollBone.LeftLowerLeg, childBone: RagdollBone.LeftFoot, anchor: { x: 0, y: -0.16, z: 0 }, twistAxis: { x: 1, y: 0, z: 0 }, minTwist: -0.5, maxTwist: 0.5 },
    { parentBone: RagdollBone.Hips, childBone: RagdollBone.RightUpperLeg, anchor: { x: 0.1, y: -0.1, z: 0 }, twistAxis: { x: 0, y: -1, z: 0 }, minTwist: -0.3, maxTwist: 0.3 },
    { parentBone: RagdollBone.RightUpperLeg, childBone: RagdollBone.RightLowerLeg, anchor: { x: 0, y: -0.18, z: 0 }, twistAxis: { x: 1, y: 0, z: 0 }, minTwist: 0, maxTwist: 2.5 },
    { parentBone: RagdollBone.RightLowerLeg, childBone: RagdollBone.RightFoot, anchor: { x: 0, y: -0.16, z: 0 }, twistAxis: { x: 1, y: 0, z: 0 }, minTwist: -0.5, maxTwist: 0.5 },
  ],
  damping: 0.5,
  selfCollision: false,
};
