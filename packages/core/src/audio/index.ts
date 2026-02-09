/**
 * Audio Module
 *
 * HoloScript audio system with spatial audio, effects processing,
 * and music sequencing capabilities.
 *
 * @module audio
 */

// Types and Interfaces
export {
  // Vector & Orientation
  IVector3,
  IAudioOrientation,

  // Source Types
  AudioSourceType,
  SpatialModel,
  RolloffType,
  IAudioSourceConfig,
  IAudioSourceState,
  PlaybackState,

  // Listener
  IAudioListenerConfig,

  // Effects
  FilterType,
  OscillatorType,
  NoiseType,
  IGainEffect,
  IFilterEffect,
  IReverbEffect,
  IDelayEffect,
  IDistortionEffect,
  ICompressorEffect,
  IEqualizerBand,
  IEqualizerEffect,
  IPanEffect,
  ISpatialEffect,
  AudioEffect,

  // Groups & Buses
  IAudioGroup,
  IAudioBus,

  // Sequencing
  INote,
  IPattern,
  ITrack,
  ISequence,
  SequencerState,
  LoopMode,
  ISequencerConfig,

  // Events
  AudioEventType,
  IAudioEvent,
  AudioEventCallback,

  // System
  IAudioSystemConfig,

  // Interfaces
  IAudioContext,
  ISequencer,

  // Defaults
  AUDIO_DEFAULTS,

  // Helper Functions
  zeroVector,
  defaultOrientation,
  bufferSource,
  oscillatorSource,
  streamSource,
  noiseSource,
  spatialSource,
  gainEffect,
  filterEffect,
  lowpassFilter,
  highpassFilter,
  bandpassFilter,
  reverbEffect,
  delayEffect,
  distortionEffect,
  compressorEffect,
  panEffect,
  eqBand,
  equalizerEffect,
  createNote,
  createPattern,
  createSequence,
  createTrack,

  // MIDI Utilities
  midiToFrequency,
  frequencyToMidi,
  noteNameToMidi,
  midiToNoteName,
} from './AudioTypes';

// Implementation
export { AudioContextImpl, createAudioContext } from './AudioContextImpl';
export { SequencerImpl, createSequencer } from './Sequencer';
