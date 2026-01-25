/**
 * @holoscript/haptics - Type Definitions
 * Haptic feedback system for VR/AR controllers and wearables
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// ============================================================================
// Haptic Device Types
// ============================================================================

export enum HapticDeviceType {
  /** Standard VR controller */
  Controller = 'controller',
  /** Haptic glove */
  Glove = 'glove',
  /** Body-worn haptic vest */
  Vest = 'vest',
  /** Generic gamepad */
  Gamepad = 'gamepad',
  /** Custom haptic device */
  Custom = 'custom',
}

export enum HandSide {
  Left = 'left',
  Right = 'right',
  Both = 'both',
}

export interface HapticDeviceCapabilities {
  /** Supports vibration */
  hasVibration: boolean;
  /** Number of vibration motors */
  motorCount: number;
  /** Supports variable intensity (0-1) */
  hasIntensityControl: boolean;
  /** Supports custom waveforms */
  hasWaveformSupport: boolean;
  /** Maximum duration in ms */
  maxDuration: number;
  /** Minimum duration in ms */
  minDuration: number;
  /** Per-finger haptics (gloves) */
  hasFingerHaptics: boolean;
  /** Force feedback support */
  hasForceFeedback: boolean;
}

export interface HapticDevice {
  /** Unique device ID */
  id: string;
  /** Device type */
  type: HapticDeviceType;
  /** Which hand (if applicable) */
  hand?: HandSide;
  /** Device name */
  name: string;
  /** Is currently connected */
  isConnected: boolean;
  /** Device capabilities */
  capabilities: HapticDeviceCapabilities;
}

// ============================================================================
// Haptic Pattern Types
// ============================================================================

export enum HapticWaveform {
  /** Constant intensity */
  Constant = 'constant',
  /** Linear ramp up */
  RampUp = 'ramp_up',
  /** Linear ramp down */
  RampDown = 'ramp_down',
  /** Sine wave */
  Sine = 'sine',
  /** Square wave */
  Square = 'square',
  /** Sawtooth wave */
  Sawtooth = 'sawtooth',
  /** Triangle wave */
  Triangle = 'triangle',
  /** Custom envelope */
  Custom = 'custom',
}

export interface HapticPulse {
  /** Duration in milliseconds */
  duration: number;
  /** Intensity 0-1 */
  intensity: number;
  /** Waveform type */
  waveform: HapticWaveform;
  /** Frequency for oscillating waveforms (Hz) */
  frequency?: number;
  /** Delay before starting (ms) */
  delay?: number;
  /** Custom intensity envelope (0-1 values over time) */
  envelope?: number[];
}

export interface HapticPattern {
  /** Pattern identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Sequence of pulses */
  pulses: HapticPulse[];
  /** Loop count (0 = infinite, 1 = play once) */
  loop?: number;
  /** Priority (higher = more important) */
  priority?: number;
}

export interface HapticEffect {
  /** Effect identifier */
  id: string;
  /** Pattern to play */
  pattern: HapticPattern;
  /** Target device(s) */
  devices: string[];
  /** Override intensity (0-1) */
  intensityMultiplier?: number;
  /** Current playback state */
  state: HapticPlaybackState;
  /** Start timestamp */
  startTime: number;
  /** Remaining loops */
  remainingLoops: number;
}

export enum HapticPlaybackState {
  Idle = 'idle',
  Playing = 'playing',
  Paused = 'paused',
  Stopping = 'stopping',
}

// ============================================================================
// Spatial Haptics
// ============================================================================

export interface SpatialHapticZone {
  /** Zone identifier */
  id: string;
  /** Zone name */
  name: string;
  /** Center position */
  position: Vec3;
  /** Zone radius */
  radius: number;
  /** Pattern to trigger */
  pattern: HapticPattern;
  /** Intensity falloff (linear, exponential) */
  falloff: 'linear' | 'exponential' | 'none';
  /** Is active */
  enabled: boolean;
}

export interface CollisionHapticConfig {
  /** Base pattern for collision */
  pattern: HapticPattern;
  /** Minimum velocity to trigger (m/s) */
  minVelocity: number;
  /** Maximum velocity for full intensity */
  maxVelocity: number;
  /** Scale intensity by impact force */
  scaleByForce: boolean;
  /** Cooldown between triggers (ms) */
  cooldown: number;
}

export interface TextureHapticConfig {
  /** Texture identifier */
  textureId: string;
  /** Base pattern */
  pattern: HapticPattern;
  /** Roughness (0-1) affects intensity */
  roughness: number;
  /** Frequency based on movement speed */
  frequencyScale: number;
}

// ============================================================================
// Finger Haptics (Gloves)
// ============================================================================

export enum Finger {
  Thumb = 'thumb',
  Index = 'index',
  Middle = 'middle',
  Ring = 'ring',
  Pinky = 'pinky',
}

export interface FingerHapticPulse extends HapticPulse {
  /** Target finger */
  finger: Finger;
}

export interface FingerHapticPattern {
  /** Pattern identifier */
  id: string;
  /** Pattern name */
  name: string;
  /** Per-finger pulses */
  fingers: Map<Finger, HapticPulse[]>;
  /** Palm haptics */
  palm?: HapticPulse[];
  /** Loop count */
  loop?: number;
}

// ============================================================================
// Force Feedback
// ============================================================================

export interface ForceFeedbackEffect {
  /** Effect ID */
  id: string;
  /** Force vector (direction and magnitude) */
  force: Vec3;
  /** Duration in ms (-1 = continuous) */
  duration: number;
  /** Ramp time to full force */
  rampTime: number;
}

export interface ResistanceEffect {
  /** Effect ID */
  id: string;
  /** Resistance coefficient (0-1) */
  resistance: number;
  /** Axis to apply resistance */
  axis: 'x' | 'y' | 'z' | 'all';
  /** Is spring (returns to center) */
  isSpring: boolean;
  /** Spring constant (if spring) */
  springConstant?: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type HapticEvent =
  | { type: 'device_connected'; device: HapticDevice }
  | { type: 'device_disconnected'; deviceId: string }
  | { type: 'effect_started'; effectId: string; patternId: string }
  | { type: 'effect_stopped'; effectId: string; reason: 'completed' | 'cancelled' | 'preempted' }
  | { type: 'zone_entered'; zoneId: string; hand: HandSide }
  | { type: 'zone_exited'; zoneId: string; hand: HandSide }
  | { type: 'collision'; objectId: string; velocity: number; hand: HandSide };

export type HapticEventHandler = (event: HapticEvent) => void;

// ============================================================================
// Manager Config
// ============================================================================

export interface HapticManagerConfig {
  /** Maximum concurrent effects per device */
  maxConcurrentEffects: number;
  /** Global intensity multiplier */
  globalIntensity: number;
  /** Enable haptics globally */
  enabled: boolean;
  /** Default priority for effects */
  defaultPriority: number;
  /** Auto-detect devices */
  autoDetectDevices: boolean;
}

export const DEFAULT_HAPTIC_MANAGER_CONFIG: HapticManagerConfig = {
  maxConcurrentEffects: 4,
  globalIntensity: 1.0,
  enabled: true,
  defaultPriority: 5,
  autoDetectDevices: true,
};

// ============================================================================
// Preset Patterns
// ============================================================================

export const HAPTIC_PATTERN_PRESETS: Record<string, HapticPattern> = {
  click: {
    id: 'click',
    name: 'Click',
    pulses: [{ duration: 10, intensity: 0.8, waveform: HapticWaveform.Constant }],
  },
  double_click: {
    id: 'double_click',
    name: 'Double Click',
    pulses: [
      { duration: 10, intensity: 0.8, waveform: HapticWaveform.Constant },
      { duration: 10, intensity: 0.8, waveform: HapticWaveform.Constant, delay: 100 },
    ],
  },
  buzz: {
    id: 'buzz',
    name: 'Buzz',
    pulses: [{ duration: 100, intensity: 0.5, waveform: HapticWaveform.Sine, frequency: 150 }],
  },
  success: {
    id: 'success',
    name: 'Success',
    pulses: [
      { duration: 50, intensity: 0.6, waveform: HapticWaveform.RampUp },
      { duration: 100, intensity: 0.8, waveform: HapticWaveform.Constant, delay: 50 },
    ],
  },
  error: {
    id: 'error',
    name: 'Error',
    pulses: [
      { duration: 100, intensity: 1.0, waveform: HapticWaveform.Constant },
      { duration: 50, intensity: 0.3, waveform: HapticWaveform.Constant, delay: 50 },
      { duration: 100, intensity: 1.0, waveform: HapticWaveform.Constant, delay: 50 },
    ],
  },
  grab: {
    id: 'grab',
    name: 'Grab Object',
    pulses: [{ duration: 30, intensity: 0.7, waveform: HapticWaveform.RampDown }],
  },
  release: {
    id: 'release',
    name: 'Release Object',
    pulses: [{ duration: 20, intensity: 0.4, waveform: HapticWaveform.RampUp }],
  },
  impact_light: {
    id: 'impact_light',
    name: 'Light Impact',
    pulses: [{ duration: 15, intensity: 0.4, waveform: HapticWaveform.Constant }],
  },
  impact_medium: {
    id: 'impact_medium',
    name: 'Medium Impact',
    pulses: [{ duration: 30, intensity: 0.7, waveform: HapticWaveform.Constant }],
  },
  impact_heavy: {
    id: 'impact_heavy',
    name: 'Heavy Impact',
    pulses: [
      { duration: 50, intensity: 1.0, waveform: HapticWaveform.Constant },
      { duration: 100, intensity: 0.3, waveform: HapticWaveform.RampDown },
    ],
  },
  heartbeat: {
    id: 'heartbeat',
    name: 'Heartbeat',
    pulses: [
      { duration: 100, intensity: 0.8, waveform: HapticWaveform.RampDown },
      { duration: 80, intensity: 0.6, waveform: HapticWaveform.RampDown, delay: 200 },
    ],
    loop: 0,
  },
  texture_rough: {
    id: 'texture_rough',
    name: 'Rough Texture',
    pulses: [{ duration: 20, intensity: 0.5, waveform: HapticWaveform.Square, frequency: 80 }],
    loop: 0,
  },
  texture_smooth: {
    id: 'texture_smooth',
    name: 'Smooth Texture',
    pulses: [{ duration: 50, intensity: 0.2, waveform: HapticWaveform.Sine, frequency: 200 }],
    loop: 0,
  },
};
