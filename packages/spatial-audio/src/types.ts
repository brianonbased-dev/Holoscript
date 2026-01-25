/**
 * @holoscript/spatial-audio - Type Definitions
 * 3D positional audio with HRTF and room acoustics
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
}

// ============================================================================
// Audio Context Types
// ============================================================================

export interface SpatialAudioConfig {
  /** Maximum number of concurrent audio sources */
  maxSources: number;
  /** Default distance model for attenuation */
  distanceModel: DistanceModel;
  /** Default reference distance for attenuation */
  refDistance: number;
  /** Default max distance for attenuation */
  maxDistance: number;
  /** Default rolloff factor */
  rolloffFactor: number;
  /** Enable HRTF processing */
  enableHRTF: boolean;
  /** Enable room acoustics simulation */
  enableRoomAcoustics: boolean;
  /** Sample rate (default: native) */
  sampleRate?: number;
}

export enum DistanceModel {
  Linear = 'linear',
  Inverse = 'inverse',
  Exponential = 'exponential',
}

export enum PanningModel {
  EqualPower = 'equalpower',
  HRTF = 'HRTF',
}

export interface AudioSourceState {
  id: string;
  isPlaying: boolean;
  isPaused: boolean;
  isLooping: boolean;
  volume: number;
  playbackRate: number;
  currentTime: number;
  duration: number;
}

// ============================================================================
// Listener Types
// ============================================================================

export interface ListenerConfig {
  /** Position in 3D space */
  position: Vec3;
  /** Orientation (forward and up vectors) */
  forward: Vec3;
  up: Vec3;
  /** Velocity for Doppler effect */
  velocity?: Vec3;
}

export interface ListenerState extends ListenerConfig {
  /** Gain adjustment */
  gain: number;
}

// ============================================================================
// HRTF Types
// ============================================================================

export interface HRTFConfig {
  /** Enable binaural processing */
  enabled: boolean;
  /** HRTF dataset to use */
  dataset: HRTFDataset;
  /** Ear separation distance (meters) */
  earSeparation: number;
  /** Crossfade duration when switching positions (ms) */
  crossfadeDuration: number;
  /** Interpolation quality */
  interpolation: HRTFInterpolation;
}

export enum HRTFDataset {
  /** Compact built-in HRTF */
  Compact = 'compact',
  /** Full CIPIC dataset */
  CIPIC = 'cipic',
  /** MIT KEMAR dataset */
  KEMAR = 'kemar',
  /** Custom user-provided */
  Custom = 'custom',
}

export enum HRTFInterpolation {
  /** Nearest neighbor (fastest) */
  Nearest = 'nearest',
  /** Bilinear interpolation */
  Bilinear = 'bilinear',
  /** Spherical harmonics (highest quality) */
  SphericalHarmonics = 'spherical',
}

export interface HRTFCoefficients {
  /** Azimuth angle (-180 to 180 degrees) */
  azimuth: number;
  /** Elevation angle (-90 to 90 degrees) */
  elevation: number;
  /** Left ear impulse response */
  leftIR: Float32Array;
  /** Right ear impulse response */
  rightIR: Float32Array;
  /** Interaural time difference (samples) */
  itd: number;
}

// ============================================================================
// Room Acoustics Types
// ============================================================================

export interface RoomConfig {
  /** Room dimensions in meters */
  dimensions: Vec3;
  /** Wall materials for each surface */
  materials: RoomMaterials;
  /** Enable early reflections */
  enableReflections: boolean;
  /** Enable late reverb */
  enableReverb: boolean;
  /** Maximum reflection order */
  reflectionOrder: number;
  /** Air absorption coefficient */
  airAbsorption: number;
}

export interface RoomMaterials {
  left: SurfaceMaterial;
  right: SurfaceMaterial;
  front: SurfaceMaterial;
  back: SurfaceMaterial;
  floor: SurfaceMaterial;
  ceiling: SurfaceMaterial;
}

export interface SurfaceMaterial {
  /** Material name */
  name: string;
  /** Absorption coefficients per frequency band */
  absorption: FrequencyBands;
  /** Scattering coefficient (0-1) */
  scattering: number;
  /** Transmission coefficient (0-1) */
  transmission: number;
}

export interface FrequencyBands {
  /** 125 Hz */
  band125: number;
  /** 250 Hz */
  band250: number;
  /** 500 Hz */
  band500: number;
  /** 1000 Hz */
  band1000: number;
  /** 2000 Hz */
  band2000: number;
  /** 4000 Hz */
  band4000: number;
}

export interface ReverbConfig {
  /** Decay time (T60) in seconds */
  decayTime: number;
  /** Pre-delay in milliseconds */
  preDelay: number;
  /** High-frequency damping (0-1) */
  damping: number;
  /** Diffusion (0-1) */
  diffusion: number;
  /** Wet/dry mix (0-1) */
  wetMix: number;
  /** Room size factor */
  roomSize: number;
}

export interface ReflectionPath {
  /** Delay in samples */
  delay: number;
  /** Gain (0-1) */
  gain: number;
  /** Direction of arrival */
  direction: Vec3;
  /** Reflection order (0 = direct) */
  order: number;
  /** Which surfaces were hit */
  surfaces: string[];
}

// ============================================================================
// Emitter Types
// ============================================================================

export interface EmitterConfig {
  /** Unique identifier */
  id: string;
  /** Position in 3D space */
  position: Vec3;
  /** Orientation for directional sources */
  orientation?: Quaternion;
  /** Distance attenuation model */
  distanceModel: DistanceModel;
  /** Reference distance */
  refDistance: number;
  /** Maximum distance */
  maxDistance: number;
  /** Rolloff factor */
  rolloffFactor: number;
  /** Directional cone (for spotlights) */
  cone?: DirectionalCone;
  /** Volume (0-1) */
  volume: number;
  /** Playback rate */
  playbackRate: number;
  /** Loop audio */
  loop: boolean;
  /** Enable spatialization */
  spatialize: boolean;
}

export interface DirectionalCone {
  /** Inner cone angle (degrees, full volume) */
  innerAngle: number;
  /** Outer cone angle (degrees, attenuated) */
  outerAngle: number;
  /** Gain outside outer cone (0-1) */
  outerGain: number;
}

export interface EmitterState extends EmitterConfig {
  /** Current audio source */
  sourceId: string | null;
  /** Is currently playing */
  isPlaying: boolean;
  /** Current playback time */
  currentTime: number;
  /** Audio duration */
  duration: number;
  /** Distance to listener */
  distanceToListener: number;
  /** Calculated gain after attenuation */
  calculatedGain: number;
}

// ============================================================================
// Occlusion Types
// ============================================================================

export interface OcclusionConfig {
  /** Enable occlusion detection */
  enabled: boolean;
  /** Occlusion detection method */
  method: OcclusionMethod;
  /** Number of rays for raycast method */
  rayCount: number;
  /** Occlusion filter frequency */
  filterFrequency: number;
  /** Transition smoothing time (ms) */
  smoothingTime: number;
}

export enum OcclusionMethod {
  /** Simple line-of-sight */
  Raycast = 'raycast',
  /** Multiple rays for partial occlusion */
  MultiRay = 'multiray',
  /** Geometry-based diffraction */
  Diffraction = 'diffraction',
}

export interface OcclusionResult {
  /** Occlusion factor (0 = fully occluded, 1 = clear) */
  factor: number;
  /** Frequency-dependent attenuation */
  frequencyAttenuation: FrequencyBands;
  /** Is diffracted around edges */
  isDiffracted: boolean;
}

// ============================================================================
// Audio Zone Types
// ============================================================================

export interface AudioZone {
  /** Unique identifier */
  id: string;
  /** Zone name */
  name: string;
  /** Zone shape */
  shape: ZoneShape;
  /** Room acoustics for this zone */
  roomConfig: RoomConfig;
  /** Reverb settings */
  reverbConfig: ReverbConfig;
  /** Background/ambient audio */
  ambientAudio?: string;
  /** Ambient volume */
  ambientVolume: number;
  /** Transition blend distance */
  blendDistance: number;
}

export type ZoneShape = 
  | { type: 'box'; center: Vec3; size: Vec3 }
  | { type: 'sphere'; center: Vec3; radius: number }
  | { type: 'cylinder'; center: Vec3; radius: number; height: number };

// ============================================================================
// Event Types
// ============================================================================

export type AudioEvent = 
  | { type: 'play'; emitterId: string; time: number }
  | { type: 'pause'; emitterId: string; time: number }
  | { type: 'stop'; emitterId: string; time: number }
  | { type: 'ended'; emitterId: string; time: number }
  | { type: 'zoneEnter'; zoneId: string; time: number }
  | { type: 'zoneExit'; zoneId: string; time: number }
  | { type: 'error'; emitterId?: string; error: string; time: number };

export type AudioEventHandler = (event: AudioEvent) => void;

// ============================================================================
// Preset Materials
// ============================================================================

export const MATERIAL_PRESETS: Record<string, SurfaceMaterial> = {
  concrete: {
    name: 'Concrete',
    absorption: { band125: 0.01, band250: 0.01, band500: 0.02, band1000: 0.02, band2000: 0.02, band4000: 0.03 },
    scattering: 0.1,
    transmission: 0.0,
  },
  brick: {
    name: 'Brick',
    absorption: { band125: 0.03, band250: 0.03, band500: 0.03, band1000: 0.04, band2000: 0.05, band4000: 0.07 },
    scattering: 0.2,
    transmission: 0.0,
  },
  wood: {
    name: 'Wood',
    absorption: { band125: 0.15, band250: 0.11, band500: 0.10, band1000: 0.07, band2000: 0.06, band4000: 0.07 },
    scattering: 0.1,
    transmission: 0.05,
  },
  glass: {
    name: 'Glass',
    absorption: { band125: 0.35, band250: 0.25, band500: 0.18, band1000: 0.12, band2000: 0.07, band4000: 0.04 },
    scattering: 0.05,
    transmission: 0.3,
  },
  carpet: {
    name: 'Carpet',
    absorption: { band125: 0.08, band250: 0.24, band500: 0.57, band1000: 0.69, band2000: 0.71, band4000: 0.73 },
    scattering: 0.4,
    transmission: 0.0,
  },
  curtain: {
    name: 'Curtain',
    absorption: { band125: 0.07, band250: 0.31, band500: 0.49, band1000: 0.75, band2000: 0.70, band4000: 0.60 },
    scattering: 0.5,
    transmission: 0.1,
  },
  acoustic_tile: {
    name: 'Acoustic Tile',
    absorption: { band125: 0.10, band250: 0.20, band500: 0.60, band1000: 0.80, band2000: 0.90, band4000: 0.95 },
    scattering: 0.3,
    transmission: 0.0,
  },
  metal: {
    name: 'Metal',
    absorption: { band125: 0.01, band250: 0.01, band500: 0.01, band1000: 0.02, band2000: 0.02, band4000: 0.02 },
    scattering: 0.05,
    transmission: 0.0,
  },
  grass: {
    name: 'Grass/Outdoor',
    absorption: { band125: 0.11, band250: 0.26, band500: 0.60, band1000: 0.69, band2000: 0.92, band4000: 0.99 },
    scattering: 0.6,
    transmission: 0.0,
  },
  water: {
    name: 'Water',
    absorption: { band125: 0.01, band250: 0.01, band500: 0.01, band1000: 0.02, band2000: 0.02, band4000: 0.03 },
    scattering: 0.02,
    transmission: 0.5,
  },
};

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_SPATIAL_AUDIO_CONFIG: SpatialAudioConfig = {
  maxSources: 32,
  distanceModel: DistanceModel.Inverse,
  refDistance: 1,
  maxDistance: 100,
  rolloffFactor: 1,
  enableHRTF: true,
  enableRoomAcoustics: true,
};

export const DEFAULT_HRTF_CONFIG: HRTFConfig = {
  enabled: true,
  dataset: HRTFDataset.Compact,
  earSeparation: 0.215,
  crossfadeDuration: 50,
  interpolation: HRTFInterpolation.Bilinear,
};

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  dimensions: { x: 10, y: 3, z: 10 },
  materials: {
    left: MATERIAL_PRESETS.concrete,
    right: MATERIAL_PRESETS.concrete,
    front: MATERIAL_PRESETS.concrete,
    back: MATERIAL_PRESETS.concrete,
    floor: MATERIAL_PRESETS.concrete,
    ceiling: MATERIAL_PRESETS.acoustic_tile,
  },
  enableReflections: true,
  enableReverb: true,
  reflectionOrder: 2,
  airAbsorption: 0.0002,
};

export const DEFAULT_REVERB_CONFIG: ReverbConfig = {
  decayTime: 1.2,
  preDelay: 20,
  damping: 0.5,
  diffusion: 0.7,
  wetMix: 0.3,
  roomSize: 0.8,
};

export const DEFAULT_OCCLUSION_CONFIG: OcclusionConfig = {
  enabled: true,
  method: OcclusionMethod.MultiRay,
  rayCount: 5,
  filterFrequency: 2000,
  smoothingTime: 100,
};
