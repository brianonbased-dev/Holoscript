/**
 * Physics module
 *
 * Provides rigid body dynamics, collision detection, constraint solving,
 * and spatial queries for the HoloScript engine.
 *
 * @module physics
 */

// Types
export {
  // Vector & Transform
  type IVector3,
  type IQuaternion,
  type ITransform,
  zeroVector,
  identityQuaternion,
  defaultTransform,

  // Collision shapes
  type IBoxShape,
  type ISphereShape,
  type ICapsuleShape,
  type ICylinderShape,
  type IConeShape,
  type IConvexShape,
  type IMeshShape,
  type IHeightfieldShape,
  type ICompoundShape,
  type CollisionShape,

  // Body configuration
  type BodyType,
  type IPhysicsMaterial,
  type ICollisionFilter,
  type IRigidBodyConfig,
  type IRigidBodyState,

  // Constraints
  type IFixedConstraint,
  type IHingeConstraint,
  type ISliderConstraint,
  type IBallConstraint,
  type IConeConstraint,
  type IDistanceConstraint,
  type ISpringConstraint,
  type IGeneric6DOFConstraint,
  type Constraint,

  // Spatial queries
  type IRay,
  type IRaycastHit,
  type IRaycastOptions,
  type IOverlapResult,

  // Events
  type ICollisionEvent,
  type ITriggerEvent,

  // World
  type IPhysicsWorldConfig,
  type IPhysicsWorld,

  // Constants
  PHYSICS_DEFAULTS,
  COLLISION_GROUPS,

  // Helper functions
  boxShape,
  sphereShape,
  capsuleShape,
  defaultMaterial,
  dynamicBody,
  staticBody,
  kinematicBody,
  validateBodyConfig,
} from './PhysicsTypes';

// Body
export { RigidBody } from './PhysicsBody';

// World
export { PhysicsWorldImpl, createPhysicsWorld } from './PhysicsWorldImpl';

// Island detection
export { IslandDetector } from './IslandDetector';
