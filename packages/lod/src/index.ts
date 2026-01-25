/**
 * @holoscript/lod
 * Level of Detail system for VR performance optimization
 */

// Types
export * from './types';

// Manager
export {
  LODManager,
  LODGroupManager,
  AdaptiveLODController,
  FrustumBuilder,
  vec3Distance,
  sphereInFrustum,
  calculateScreenCoverage,
} from './manager';

// Culling
export {
  FrustumCuller,
  DistanceCuller,
  OcclusionCuller,
  SmallObjectCuller,
  CullingSystem,
  VisibilityQuery,
  boundingBoxFromSphere,
} from './culling';
