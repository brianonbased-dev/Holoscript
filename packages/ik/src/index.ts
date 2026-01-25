/**
 * @holoscript/ik - Inverse Kinematics for VR/AR
 * Main entry point
 */

// Solvers
export {
  Vec3Math,
  QuatMath,
  FABRIKSolver,
  CCDSolver,
  TwoBoneSolver,
  LookAtSolver,
  createSolver,
} from './solvers';

// Constraints
export {
  ConstraintManager,
  HingeConstraint,
  BallSocketConstraint,
  TwistConstraint,
} from './constraints';

// Full-body IK
export {
  FullBodyIKController,
  SkeletonBuilder,
  DEFAULT_FULLBODY_CONFIG,
} from './fullbody';

// Re-export all types
export * from './types';
