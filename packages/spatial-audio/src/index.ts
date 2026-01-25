/**
 * @holoscript/spatial-audio - Main Entry Point
 * 3D positional audio with HRTF and room acoustics for VR/AR
 */

// Context
export {
  SpatialAudioContext,
  SpatialAudioSource,
  createSpatialAudioContext,
  Vec3Math,
} from './context';

// HRTF
export {
  HRTFProcessor,
  createHRTFProcessor,
} from './hrtf';

// Room Acoustics
export {
  ReflectionCalculator,
  ReverbProcessor,
  OcclusionProcessor,
  RoomAcousticsManager,
  createRoomAcoustics,
} from './room';

// Emitters
export {
  AudioEmitter,
  AudioZoneManager,
  EmitterManager,
  createEmitter,
  createEmitterManager,
  createZoneManager,
} from './emitter';

// Re-export all types
export * from './types';
