/**
 * @holoscript/haptics - Haptic Pattern System
 * Pattern creation, playback, and waveform generation
 */

import type {
  HapticPattern,
  HapticPulse,
  HapticEffect,
  FingerHapticPattern,
  Finger,
} from '../types';
import {
  HapticWaveform,
  HapticPlaybackState,
  HAPTIC_PATTERN_PRESETS,
} from '../types';

// ============================================================================
// Waveform Generator
// ============================================================================

export class WaveformGenerator {
  private sampleRate: number;

  constructor(sampleRate: number = 1000) {
    this.sampleRate = sampleRate;
  }

  /** Generate intensity values for a pulse */
  generatePulse(pulse: HapticPulse): number[] {
    const samples = Math.ceil((pulse.duration / 1000) * this.sampleRate);
    const values: number[] = new Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const t = i / samples; // Normalized time 0-1
      values[i] = this.sampleWaveform(pulse, t) * pulse.intensity;
    }
    
    return values;
  }

  /** Sample waveform at normalized time t */
  private sampleWaveform(pulse: HapticPulse, t: number): number {
    switch (pulse.waveform) {
      case HapticWaveform.Constant:
        return 1.0;
        
      case HapticWaveform.RampUp:
        return t;
        
      case HapticWaveform.RampDown:
        return 1.0 - t;
        
      case HapticWaveform.Sine: {
        const freq = pulse.frequency ?? 100;
        const cycles = (pulse.duration / 1000) * freq;
        return (Math.sin(t * cycles * Math.PI * 2) + 1) / 2;
      }
      
      case HapticWaveform.Square: {
        const freq = pulse.frequency ?? 100;
        const cycles = (pulse.duration / 1000) * freq;
        return Math.sin(t * cycles * Math.PI * 2) >= 0 ? 1 : 0;
      }
      
      case HapticWaveform.Sawtooth: {
        const freq = pulse.frequency ?? 100;
        const cycles = (pulse.duration / 1000) * freq;
        return (t * cycles) % 1;
      }
      
      case HapticWaveform.Triangle: {
        const freq = pulse.frequency ?? 100;
        const cycles = (pulse.duration / 1000) * freq;
        const phase = (t * cycles) % 1;
        return phase < 0.5 ? phase * 2 : 2 - phase * 2;
      }
      
      case HapticWaveform.Custom:
        if (pulse.envelope && pulse.envelope.length > 0) {
          const idx = Math.floor(t * (pulse.envelope.length - 1));
          return pulse.envelope[Math.min(idx, pulse.envelope.length - 1)];
        }
        return 1.0;
        
      default:
        return 1.0;
    }
  }

  /** Generate full pattern timeline */
  generatePatternTimeline(pattern: HapticPattern): { time: number; intensity: number }[] {
    const timeline: { time: number; intensity: number }[] = [];
    let currentTime = 0;
    
    for (const pulse of pattern.pulses) {
      // Apply delay
      if (pulse.delay) {
        currentTime += pulse.delay;
      }
      
      const samples = this.generatePulse(pulse);
      const dtMs = pulse.duration / samples.length;
      
      for (let i = 0; i < samples.length; i++) {
        timeline.push({
          time: currentTime + i * dtMs,
          intensity: samples[i],
        });
      }
      
      currentTime += pulse.duration;
    }
    
    return timeline;
  }
}

// ============================================================================
// Pattern Builder
// ============================================================================

export class HapticPatternBuilder {
  private id: string;
  private name: string;
  private pulses: HapticPulse[] = [];
  private loop: number = 1;
  private priority: number = 5;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /** Add a constant intensity pulse */
  addPulse(duration: number, intensity: number, delay?: number): this {
    this.pulses.push({
      duration,
      intensity,
      waveform: HapticWaveform.Constant,
      delay,
    });
    return this;
  }

  /** Add a ramp up pulse */
  addRampUp(duration: number, intensity: number, delay?: number): this {
    this.pulses.push({
      duration,
      intensity,
      waveform: HapticWaveform.RampUp,
      delay,
    });
    return this;
  }

  /** Add a ramp down pulse */
  addRampDown(duration: number, intensity: number, delay?: number): this {
    this.pulses.push({
      duration,
      intensity,
      waveform: HapticWaveform.RampDown,
      delay,
    });
    return this;
  }

  /** Add a vibration pulse */
  addVibration(duration: number, intensity: number, frequency: number, delay?: number): this {
    this.pulses.push({
      duration,
      intensity,
      waveform: HapticWaveform.Sine,
      frequency,
      delay,
    });
    return this;
  }

  /** Add a buzz pulse */
  addBuzz(duration: number, intensity: number, frequency: number = 150, delay?: number): this {
    this.pulses.push({
      duration,
      intensity,
      waveform: HapticWaveform.Square,
      frequency,
      delay,
    });
    return this;
  }

  /** Add a custom envelope pulse */
  addCustom(duration: number, envelope: number[], delay?: number): this {
    this.pulses.push({
      duration,
      intensity: 1.0,
      waveform: HapticWaveform.Custom,
      envelope,
      delay,
    });
    return this;
  }

  /** Add a gap (silence) */
  addGap(duration: number): this {
    this.pulses.push({
      duration: 0,
      intensity: 0,
      waveform: HapticWaveform.Constant,
      delay: duration,
    });
    return this;
  }

  /** Set loop count (0 = infinite) */
  setLoop(count: number): this {
    this.loop = count;
    return this;
  }

  /** Set priority */
  setPriority(priority: number): this {
    this.priority = priority;
    return this;
  }

  /** Build the pattern */
  build(): HapticPattern {
    return {
      id: this.id,
      name: this.name,
      pulses: [...this.pulses],
      loop: this.loop,
      priority: this.priority,
    };
  }

  /** Create from preset and modify */
  static fromPreset(presetId: string): HapticPatternBuilder {
    const preset = HAPTIC_PATTERN_PRESETS[presetId];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetId}`);
    }
    
    const builder = new HapticPatternBuilder(preset.id + '_modified', preset.name + ' (Modified)');
    builder.pulses = [...preset.pulses];
    builder.loop = preset.loop ?? 1;
    builder.priority = preset.priority ?? 5;
    return builder;
  }
}

// ============================================================================
// Finger Haptic Pattern Builder
// ============================================================================

export class FingerHapticPatternBuilder {
  private id: string;
  private name: string;
  private fingers: Map<Finger, HapticPulse[]> = new Map();
  private palm: HapticPulse[] = [];
  private loop: number = 1;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /** Add pulse to specific finger */
  addFingerPulse(finger: Finger, pulse: HapticPulse): this {
    if (!this.fingers.has(finger)) {
      this.fingers.set(finger, []);
    }
    this.fingers.get(finger)!.push(pulse);
    return this;
  }

  /** Add pulse to all fingers */
  addAllFingersPulse(pulse: HapticPulse): this {
    const fingers: Finger[] = ['thumb', 'index', 'middle', 'ring', 'pinky'] as Finger[];
    for (const finger of fingers) {
      this.addFingerPulse(finger, pulse);
    }
    return this;
  }

  /** Add palm pulse */
  addPalmPulse(pulse: HapticPulse): this {
    this.palm.push(pulse);
    return this;
  }

  /** Set loop count */
  setLoop(count: number): this {
    this.loop = count;
    return this;
  }

  /** Build the pattern */
  build(): FingerHapticPattern {
    return {
      id: this.id,
      name: this.name,
      fingers: new Map(this.fingers),
      palm: this.palm.length > 0 ? [...this.palm] : undefined,
      loop: this.loop,
    };
  }
}

// ============================================================================
// Effect Player
// ============================================================================

export interface EffectPlayerOptions {
  /** Intensity multiplier */
  intensity?: number;
  /** Speed multiplier */
  speed?: number;
  /** Start offset (ms) */
  startOffset?: number;
}

export class HapticEffectPlayer {
  private effects: Map<string, HapticEffect> = new Map();
  private generator: WaveformGenerator;
  private nextEffectId: number = 0;

  constructor() {
    this.generator = new WaveformGenerator();
  }

  /** Create an effect from a pattern */
  createEffect(
    pattern: HapticPattern,
    devices: string[],
    options?: EffectPlayerOptions
  ): HapticEffect {
    const id = `effect_${this.nextEffectId++}`;
    
    const effect: HapticEffect = {
      id,
      pattern,
      devices,
      intensityMultiplier: options?.intensity ?? 1.0,
      state: HapticPlaybackState.Idle,
      startTime: 0,
      remainingLoops: pattern.loop ?? 1,
    };
    
    this.effects.set(id, effect);
    return effect;
  }

  /** Start playing an effect */
  play(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) return false;
    
    effect.state = HapticPlaybackState.Playing;
    effect.startTime = performance.now();
    effect.remainingLoops = effect.pattern.loop ?? 1;
    
    return true;
  }

  /** Pause an effect */
  pause(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect || effect.state !== HapticPlaybackState.Playing) return false;
    
    effect.state = HapticPlaybackState.Paused;
    return true;
  }

  /** Resume a paused effect */
  resume(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect || effect.state !== HapticPlaybackState.Paused) return false;
    
    effect.state = HapticPlaybackState.Playing;
    return true;
  }

  /** Stop an effect */
  stop(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) return false;
    
    effect.state = HapticPlaybackState.Stopping;
    return true;
  }

  /** Remove an effect */
  remove(effectId: string): boolean {
    return this.effects.delete(effectId);
  }

  /** Get current intensity for an effect */
  getCurrentIntensity(effectId: string): number {
    const effect = this.effects.get(effectId);
    if (!effect || effect.state !== HapticPlaybackState.Playing) {
      return 0;
    }
    
    const elapsed = performance.now() - effect.startTime;
    const timeline = this.generator.generatePatternTimeline(effect.pattern);
    
    if (timeline.length === 0) return 0;
    
    const patternDuration = timeline[timeline.length - 1].time;
    const loopTime = elapsed % patternDuration;
    
    // Find the intensity at current time
    let intensity = 0;
    for (let i = 0; i < timeline.length - 1; i++) {
      if (timeline[i].time <= loopTime && timeline[i + 1].time > loopTime) {
        // Interpolate
        const t = (loopTime - timeline[i].time) / (timeline[i + 1].time - timeline[i].time);
        intensity = timeline[i].intensity + (timeline[i + 1].intensity - timeline[i].intensity) * t;
        break;
      }
    }
    
    return intensity * (effect.intensityMultiplier ?? 1.0);
  }

  /** Get effect state */
  getEffect(effectId: string): HapticEffect | undefined {
    return this.effects.get(effectId);
  }

  /** Get all active effects */
  getActiveEffects(): HapticEffect[] {
    return Array.from(this.effects.values()).filter(
      e => e.state === HapticPlaybackState.Playing
    );
  }

  /** Update effects (call each frame) */
  update(): void {
    const now = performance.now();
    
    for (const effect of this.effects.values()) {
      if (effect.state !== HapticPlaybackState.Playing) continue;
      
      const elapsed = now - effect.startTime;
      const timeline = this.generator.generatePatternTimeline(effect.pattern);
      
      if (timeline.length === 0) {
        effect.state = HapticPlaybackState.Idle;
        continue;
      }
      
      const patternDuration = timeline[timeline.length - 1].time + 
        (effect.pattern.pulses[effect.pattern.pulses.length - 1]?.duration ?? 0);
      
      // Check if loop completed
      if (elapsed >= patternDuration) {
        if (effect.remainingLoops === 0) {
          // Infinite loop, reset
          effect.startTime = now;
        } else {
          effect.remainingLoops--;
          if (effect.remainingLoops <= 0) {
            effect.state = HapticPlaybackState.Idle;
          } else {
            effect.startTime = now;
          }
        }
      }
    }
  }
}

// Factory functions
export function createPatternBuilder(id: string, name: string): HapticPatternBuilder {
  return new HapticPatternBuilder(id, name);
}

export function createFingerPatternBuilder(id: string, name: string): FingerHapticPatternBuilder {
  return new FingerHapticPatternBuilder(id, name);
}

export function createEffectPlayer(): HapticEffectPlayer {
  return new HapticEffectPlayer();
}

// Re-exports
export { HAPTIC_PATTERN_PRESETS, HapticWaveform, HapticPlaybackState } from '../types';
export type { HapticPattern, HapticPulse, HapticEffect, FingerHapticPattern };
