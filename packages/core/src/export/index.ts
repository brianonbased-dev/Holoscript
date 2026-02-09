/**
 * Export Module
 *
 * Scene graph serialization and export functionality for HoloScript.
 * Supports JSON, binary, and streaming formats.
 *
 * @module export
 * @version 3.3.0
 */

// Scene Graph IR
export {
  // Transform types
  IVector3,
  IQuaternion,
  ITransform,

  // Component types
  IComponent,
  IMeshComponent,
  ILightComponent,
  ICameraComponent,
  IColliderComponent,
  IRigidbodyComponent,
  IAudioSourceComponent,
  IAnimationComponent,
  IScriptComponent,

  // Node types
  ISceneNode,

  // Asset types
  IMaterial,
  ITexture,
  IMesh,
  IMeshPrimitive,
  IAnimation,
  IAnimationChannel,
  IAnimationSampler,
  ISkin,
  IJoint,
  IBuffer,
  IBufferView,
  IAccessor,

  // Scene graph
  ISceneGraph,
  ISceneMetadata,

  // Factory functions
  createIdentityTransform,
  createEmptyNode,
  createDefaultMaterial,
  createEmptySceneGraph,

  // Type guards
  isMeshComponent,
  isLightComponent,
  isCameraComponent,
  isColliderComponent,
  isRigidbodyComponent,
} from './SceneGraph';

// Scene Serializer
export {
  ISerializeOptions,
  IDeserializeOptions,
  ISerializeResult,
  ISerializeStats,
  IValidationResult,
  IValidationError,
  SceneSerializer,
  findNodeById,
  findNodesByTag,
  traverseNodes,
  getWorldTransform,
} from './SceneSerializer';

// Binary Serializer
export {
  IBinaryEncoderOptions,
  IBinaryDecoderOptions,
  BinaryWriter,
  BinaryReader,
  BinarySerializer,
} from './BinarySerializer';
