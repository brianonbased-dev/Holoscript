/**
 * @holoscript/accessibility - Haptics Module
 *
 * Provides haptic feedback for XR accessibility:
 * - Audio-to-haptics conversion for deaf/HoH users
 * - Spatial haptics for navigation
 * - Texture simulation
 * - Pattern library
 */

import { HapticIntensity, HapticPattern, HapticsProfile, ControllerHapticConfig } from '../types';

// WebXR type stub (minimal interface for haptics)
interface XRInputSource {
  handedness: 'left' | 'right' | 'none';
  gamepad?: Gamepad;
}

interface XRSession {
  inputSources: XRInputSource[];
}

/**
 * Haptic pulse definition
 */
export interface HapticPulse {
  /** Start time offset in ms */
  startTime: number;
  /** Duration in ms */
  duration: number;
  /** Intensity 0-1 */
  intensity: number;
}

/**
 * Haptic sequence (multiple pulses)
 */
export interface HapticSequence {
  name: string;
  pulses: HapticPulse[];
  /** Total duration in ms */
  totalDuration: number;
  /** Loop the sequence */
  loop?: boolean;
}

/**
 * Audio frequency band for audio-to-haptics
 */
export interface FrequencyBand {
  lowHz: number;
  highHz: number;
  /** Which haptic actuator to map to */
  actuator: 'left' | 'right' | 'both';
  /** Intensity multiplier */
  intensityScale: number;
}

/**
 * Pre-defined haptic patterns
 */
export const HAPTIC_PATTERNS: Record<HapticPattern, HapticSequence> = {
  [HapticPattern.Tap]: {
    name: 'Tap',
    totalDuration: 50,
    pulses: [{ startTime: 0, duration: 50, intensity: 0.8 }],
  },
  [HapticPattern.DoubleTap]: {
    name: 'Double Tap',
    totalDuration: 200,
    pulses: [
      { startTime: 0, duration: 50, intensity: 0.8 },
      { startTime: 150, duration: 50, intensity: 0.8 },
    ],
  },
  [HapticPattern.Long]: {
    name: 'Long',
    totalDuration: 500,
    pulses: [{ startTime: 0, duration: 500, intensity: 0.6 }],
  },
  [HapticPattern.Pulse]: {
    name: 'Pulse',
    totalDuration: 600,
    pulses: [
      { startTime: 0, duration: 100, intensity: 0.8 },
      { startTime: 200, duration: 100, intensity: 0.8 },
      { startTime: 400, duration: 100, intensity: 0.8 },
    ],
  },
  [HapticPattern.Ramp]: {
    name: 'Ramp',
    totalDuration: 300,
    pulses: [
      { startTime: 0, duration: 100, intensity: 0.3 },
      { startTime: 100, duration: 100, intensity: 0.6 },
      { startTime: 200, duration: 100, intensity: 1.0 },
    ],
  },
  [HapticPattern.Heartbeat]: {
    name: 'Heartbeat',
    totalDuration: 600,
    loop: true,
    pulses: [
      { startTime: 0, duration: 80, intensity: 0.9 },
      { startTime: 120, duration: 60, intensity: 0.7 },
    ],
  },
  [HapticPattern.Success]: {
    name: 'Success',
    totalDuration: 400,
    pulses: [
      { startTime: 0, duration: 50, intensity: 0.5 },
      { startTime: 100, duration: 50, intensity: 0.7 },
      { startTime: 200, duration: 100, intensity: 1.0 },
    ],
  },
  [HapticPattern.Error]: {
    name: 'Error',
    totalDuration: 500,
    pulses: [
      { startTime: 0, duration: 100, intensity: 1.0 },
      { startTime: 150, duration: 100, intensity: 1.0 },
      { startTime: 300, duration: 100, intensity: 1.0 },
    ],
  },
  [HapticPattern.Navigation]: {
    name: 'Navigation',
    totalDuration: 150,
    pulses: [
      { startTime: 0, duration: 30, intensity: 0.6 },
      { startTime: 80, duration: 30, intensity: 0.4 },
    ],
  },
  [HapticPattern.Texture]: {
    name: 'Texture',
    totalDuration: 100,
    loop: true,
    pulses: [
      { startTime: 0, duration: 20, intensity: 0.3 },
      { startTime: 50, duration: 20, intensity: 0.3 },
    ],
  },
};

/**
 * Haptic controller for XR devices
 */
export class HapticsController {
  private profile: HapticsProfile;
  private xrSession: XRSession | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private isAudioToHapticsActive = false;

  constructor(profile?: Partial<HapticsProfile>) {
    this.profile = {
      enabled: profile?.enabled ?? true,
      intensity: profile?.intensity ?? HapticIntensity.Medium,
      audioToHaptics: profile?.audioToHaptics ?? false,
      spatialHaptics: profile?.spatialHaptics ?? true,
      controllers: profile?.controllers ?? {
        left: { enabled: true, intensityMultiplier: 1.0 },
        right: { enabled: true, intensityMultiplier: 1.0 },
      },
    };
  }

  /**
   * Initialize with XR session
   */
  public initialize(session: XRSession): void {
    this.xrSession = session;
  }

  /**
   * Play a haptic pattern
   */
  public async playPattern(
    pattern: HapticPattern,
    hand: 'left' | 'right' | 'both' = 'both'
  ): Promise<void> {
    const sequence = HAPTIC_PATTERNS[pattern];
    if (!sequence) return;

    await this.playSequence(sequence, hand);
  }

  /**
   * Play a custom haptic sequence
   */
  public async playSequence(
    sequence: HapticSequence,
    hand: 'left' | 'right' | 'both' = 'both'
  ): Promise<void> {
    const hands = hand === 'both' ? ['left', 'right'] : [hand];

    for (const h of hands) {
      const config = this.profile.controllers[h as 'left' | 'right'];
      if (!config.enabled) continue;

      const intensity = this.profile.intensity * config.intensityMultiplier;

      for (const pulse of sequence.pulses) {
        setTimeout(() => {
          this.vibrate(h as 'left' | 'right', pulse.intensity * intensity, pulse.duration);
        }, pulse.startTime);
      }
    }
  }

  /**
   * Vibrate a specific controller
   */
  public vibrate(hand: 'left' | 'right', intensity: number, duration: number): void {
    if (!this.xrSession) {
      // Fallback to navigator.vibrate for non-XR
      if (navigator.vibrate) {
        navigator.vibrate(duration);
      }
      return;
    }

    // XR haptic actuation would go here
    // This requires access to XRInputSource.gamepad.hapticActuators
    console.log(`[Haptics] ${hand} hand: intensity=${intensity}, duration=${duration}ms`);
  }

  /**
   * Enable audio-to-haptics conversion
   */
  public async enableAudioToHaptics(audioSource?: MediaStream): Promise<void> {
    if (this.isAudioToHapticsActive) return;

    this.audioContext = new AudioContext();
    this.audioAnalyser = this.audioContext.createAnalyser();
    this.audioAnalyser.fftSize = 256;

    if (audioSource) {
      const source = this.audioContext.createMediaStreamSource(audioSource);
      source.connect(this.audioAnalyser);
    }

    this.frequencyData = new Uint8Array(this.audioAnalyser.frequencyBinCount);
    this.isAudioToHapticsActive = true;

    this.processAudioToHaptics();
  }

  /**
   * Disable audio-to-haptics conversion
   */
  public disableAudioToHaptics(): void {
    this.isAudioToHapticsActive = false;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Process audio and convert to haptics
   */
  private processAudioToHaptics(): void {
    if (!this.isAudioToHapticsActive || !this.audioAnalyser || !this.frequencyData) return;

    this.audioAnalyser.getByteFrequencyData(this.frequencyData);

    // Map frequency bands to haptic feedback
    // Low frequencies (bass) -> stronger haptics
    const freqArray = Array.from(this.frequencyData);
    const bassSum = freqArray.slice(0, 4).reduce((a, b) => a + b, 0);
    const midSum = freqArray.slice(4, 16).reduce((a, b) => a + b, 0);

    const bassIntensity = Math.min(bassSum / 1024, 1);
    const midIntensity = Math.min(midSum / 3072, 1);

    if (bassIntensity > 0.1) {
      this.vibrate('left', bassIntensity * this.profile.intensity, 16);
      this.vibrate('right', bassIntensity * this.profile.intensity, 16);
    }

    if (midIntensity > 0.1) {
      this.vibrate('right', midIntensity * this.profile.intensity * 0.5, 16);
    }

    requestAnimationFrame(() => this.processAudioToHaptics());
  }

  /**
   * Spatial haptics - vibrate based on 3D direction
   */
  public playSpatialHaptic(
    direction: { x: number; y: number; z: number },
    intensity: number,
    duration: number
  ): void {
    if (!this.profile.spatialHaptics) return;

    // Map direction to controller intensity
    // Objects on left -> left controller, objects on right -> right controller
    const leftIntensity = Math.max(0, -direction.x) * intensity;
    const rightIntensity = Math.max(0, direction.x) * intensity;

    if (leftIntensity > 0.05) {
      this.vibrate('left', leftIntensity * this.profile.intensity, duration);
    }
    if (rightIntensity > 0.05) {
      this.vibrate('right', rightIntensity * this.profile.intensity, duration);
    }
  }

  /**
   * Update profile
   */
  public setProfile(profile: Partial<HapticsProfile>): void {
    this.profile = { ...this.profile, ...profile };
  }

  /**
   * Get current profile
   */
  public getProfile(): HapticsProfile {
    return { ...this.profile };
  }
}

/**
 * Factory function
 */
export function createHapticsController(profile?: Partial<HapticsProfile>): HapticsController {
  return new HapticsController(profile);
}

// Re-export types
export type { HapticIntensity, HapticPattern, HapticsProfile, ControllerHapticConfig };
