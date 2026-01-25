/**
 * @holoscript/haptics - Device Management
 * Haptic device detection, management, and playback
 */

import type {
  Vec3,
  HapticDevice,
  HapticDeviceCapabilities,
  HapticPattern,
  HapticEffect,
  SpatialHapticZone,
  CollisionHapticConfig,
  HapticEvent,
  HapticEventHandler,
  HapticManagerConfig,
} from '../types';
import {
  HapticDeviceType,
  HandSide,
  HapticPlaybackState,
  DEFAULT_HAPTIC_MANAGER_CONFIG,
  HAPTIC_PATTERN_PRESETS,
} from '../types';
import { HapticEffectPlayer } from '../patterns';

// ============================================================================
// WebXR Haptic Actuator Interface
// ============================================================================

interface XRHapticActuator {
  pulse(value: number, duration: number): Promise<boolean>;
}

interface XRInputSourceWithHaptics {
  handedness: 'left' | 'right' | 'none';
  gamepad?: Gamepad;
  profiles: string[];
}

// ============================================================================
// Haptic Device Adapter
// ============================================================================

export abstract class HapticDeviceAdapter {
  abstract readonly device: HapticDevice;
  abstract pulse(intensity: number, duration: number): Promise<boolean>;
  abstract isConnected(): boolean;
  abstract getCapabilities(): HapticDeviceCapabilities;
}

// ============================================================================
// WebXR Controller Adapter
// ============================================================================

export class WebXRControllerAdapter extends HapticDeviceAdapter {
  readonly device: HapticDevice;
  private actuator: XRHapticActuator | null = null;
  private inputSource: XRInputSourceWithHaptics | null = null;

  constructor(hand: HandSide, inputSource?: XRInputSourceWithHaptics) {
    super();
    this.inputSource = inputSource ?? null;
    
    // Try to get haptic actuator from gamepad
    if (inputSource?.gamepad && 'hapticActuators' in inputSource.gamepad) {
      const actuators = (inputSource.gamepad as unknown as { hapticActuators: XRHapticActuator[] }).hapticActuators;
      if (actuators && actuators.length > 0) {
        this.actuator = actuators[0];
      }
    }
    
    this.device = {
      id: `webxr_controller_${hand}`,
      type: HapticDeviceType.Controller,
      hand,
      name: `WebXR Controller (${hand})`,
      isConnected: this.actuator !== null,
      capabilities: this.getCapabilities(),
    };
  }

  async pulse(intensity: number, duration: number): Promise<boolean> {
    if (!this.actuator) {
      // Fallback to Gamepad API vibration
      if (this.inputSource?.gamepad && 'vibrationActuator' in this.inputSource.gamepad) {
        const vibrator = (this.inputSource.gamepad as unknown as { vibrationActuator: { playEffect: (type: string, params: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<string> } }).vibrationActuator;
        if (vibrator) {
          try {
            await vibrator.playEffect('dual-rumble', {
              duration,
              strongMagnitude: intensity,
              weakMagnitude: intensity * 0.5,
            });
            return true;
          } catch {
            return false;
          }
        }
      }
      return false;
    }
    
    try {
      return await this.actuator.pulse(intensity, duration);
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.actuator !== null || this.inputSource?.gamepad !== undefined;
  }

  getCapabilities(): HapticDeviceCapabilities {
    return {
      hasVibration: true,
      motorCount: 1,
      hasIntensityControl: true,
      hasWaveformSupport: false,
      maxDuration: 5000,
      minDuration: 1,
      hasFingerHaptics: false,
      hasForceFeedback: false,
    };
  }

  /** Update input source (when XR session reconnects) */
  updateInputSource(inputSource: XRInputSourceWithHaptics): void {
    this.inputSource = inputSource;
    
    if (inputSource.gamepad && 'hapticActuators' in inputSource.gamepad) {
      const actuators = (inputSource.gamepad as unknown as { hapticActuators: XRHapticActuator[] }).hapticActuators;
      if (actuators && actuators.length > 0) {
        this.actuator = actuators[0];
      }
    }
    
    this.device.isConnected = this.isConnected();
  }
}

// ============================================================================
// Gamepad Adapter
// ============================================================================

export class GamepadAdapter extends HapticDeviceAdapter {
  readonly device: HapticDevice;
  private gamepadIndex: number;

  constructor(gamepad: Gamepad) {
    super();
    this.gamepadIndex = gamepad.index;
    
    this.device = {
      id: `gamepad_${gamepad.index}`,
      type: HapticDeviceType.Gamepad,
      name: gamepad.id || `Gamepad ${gamepad.index}`,
      isConnected: gamepad.connected,
      capabilities: this.getCapabilities(),
    };
  }

  async pulse(intensity: number, duration: number): Promise<boolean> {
    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    if (!gamepad) return false;
    
    if ('vibrationActuator' in gamepad) {
      const vibrator = (gamepad as unknown as { vibrationActuator: { playEffect: (type: string, params: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<string> } }).vibrationActuator;
      if (vibrator) {
        try {
          await vibrator.playEffect('dual-rumble', {
            duration,
            strongMagnitude: intensity,
            weakMagnitude: intensity * 0.5,
          });
          return true;
        } catch {
          return false;
        }
      }
    }
    
    return false;
  }

  isConnected(): boolean {
    const gamepad = navigator.getGamepads()[this.gamepadIndex];
    return gamepad?.connected ?? false;
  }

  getCapabilities(): HapticDeviceCapabilities {
    return {
      hasVibration: true,
      motorCount: 2,
      hasIntensityControl: true,
      hasWaveformSupport: false,
      maxDuration: 5000,
      minDuration: 1,
      hasFingerHaptics: false,
      hasForceFeedback: false,
    };
  }
}

// ============================================================================
// Haptic Manager
// ============================================================================

export class HapticManager {
  private config: HapticManagerConfig;
  private devices: Map<string, HapticDeviceAdapter> = new Map();
  private effectPlayer: HapticEffectPlayer;
  private zones: Map<string, SpatialHapticZone> = new Map();
  private collisionConfigs: Map<string, CollisionHapticConfig> = new Map();
  private eventHandlers: Set<HapticEventHandler> = new Set();
  private lastCollisionTime: Map<string, number> = new Map();

  constructor(config?: Partial<HapticManagerConfig>) {
    this.config = { ...DEFAULT_HAPTIC_MANAGER_CONFIG, ...config };
    this.effectPlayer = new HapticEffectPlayer();
    
    if (this.config.autoDetectDevices) {
      this.autoDetectDevices();
    }
  }

  /** Auto-detect available haptic devices */
  private autoDetectDevices(): void {
    // Detect gamepads
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (const gamepad of gamepads) {
        if (gamepad) {
          this.registerDevice(new GamepadAdapter(gamepad));
        }
      }
      
      // Listen for gamepad connections
      window.addEventListener('gamepadconnected', (e) => {
        const gamepadEvent = e as GamepadEvent;
        const adapter = new GamepadAdapter(gamepadEvent.gamepad);
        this.registerDevice(adapter);
        this.emit({ type: 'device_connected', device: adapter.device });
      });
      
      window.addEventListener('gamepaddisconnected', (e) => {
        const gamepadEvent = e as GamepadEvent;
        const deviceId = `gamepad_${gamepadEvent.gamepad.index}`;
        this.unregisterDevice(deviceId);
        this.emit({ type: 'device_disconnected', deviceId });
      });
    }
  }

  /** Register a haptic device */
  registerDevice(adapter: HapticDeviceAdapter): void {
    this.devices.set(adapter.device.id, adapter);
  }

  /** Unregister a device */
  unregisterDevice(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  /** Get a device by ID */
  getDevice(deviceId: string): HapticDevice | undefined {
    return this.devices.get(deviceId)?.device;
  }

  /** Get all registered devices */
  getAllDevices(): HapticDevice[] {
    return Array.from(this.devices.values()).map(a => a.device);
  }

  /** Get devices by hand */
  getDevicesByHand(hand: HandSide): HapticDevice[] {
    return this.getAllDevices().filter(d => 
      d.hand === hand || d.hand === HandSide.Both || hand === HandSide.Both
    );
  }

  /** Play a pattern on specified devices */
  async playPattern(
    pattern: HapticPattern,
    deviceIds: string[],
    intensityMultiplier?: number
  ): Promise<string> {
    if (!this.config.enabled) return '';
    
    const effect = this.effectPlayer.createEffect(pattern, deviceIds, {
      intensity: (intensityMultiplier ?? 1.0) * this.config.globalIntensity,
    });
    
    this.effectPlayer.play(effect.id);
    this.emit({ type: 'effect_started', effectId: effect.id, patternId: pattern.id });
    
    // Send pulses to devices
    this.processEffectPulses(effect);
    
    return effect.id;
  }

  /** Play a preset pattern */
  async playPreset(
    presetId: string,
    deviceIds: string[],
    intensityMultiplier?: number
  ): Promise<string> {
    const pattern = HAPTIC_PATTERN_PRESETS[presetId];
    if (!pattern) {
      throw new Error(`Unknown preset: ${presetId}`);
    }
    return this.playPattern(pattern, deviceIds, intensityMultiplier);
  }

  /** Play on hand (convenience method) */
  async playOnHand(
    hand: HandSide,
    pattern: HapticPattern,
    intensityMultiplier?: number
  ): Promise<string> {
    const devices = this.getDevicesByHand(hand);
    const deviceIds = devices.map(d => d.id);
    return this.playPattern(pattern, deviceIds, intensityMultiplier);
  }

  /** Simple pulse on hand */
  async pulseHand(
    hand: HandSide,
    intensity: number,
    duration: number
  ): Promise<void> {
    if (!this.config.enabled) return;
    
    const devices = this.getDevicesByHand(hand);
    const scaledIntensity = intensity * this.config.globalIntensity;
    
    const promises = devices.map(d => {
      const adapter = this.devices.get(d.id);
      return adapter?.pulse(scaledIntensity, duration);
    });
    
    await Promise.all(promises);
  }

  /** Process effect pulses and send to devices */
  private async processEffectPulses(effect: HapticEffect): Promise<void> {
    const pattern = effect.pattern;
    let time = 0;
    
    for (const pulse of pattern.pulses) {
      if (pulse.delay) {
        await this.delay(pulse.delay);
        time += pulse.delay;
      }
      
      const intensity = pulse.intensity * (effect.intensityMultiplier ?? 1.0);
      
      // Send to all target devices
      for (const deviceId of effect.devices) {
        const adapter = this.devices.get(deviceId);
        if (adapter) {
          adapter.pulse(intensity, pulse.duration);
        }
      }
      
      await this.delay(pulse.duration);
      time += pulse.duration;
    }
    
    // Handle looping
    if (effect.remainingLoops > 1 || effect.remainingLoops === 0) {
      if (effect.remainingLoops > 0) {
        effect.remainingLoops--;
      }
      if (effect.state === HapticPlaybackState.Playing) {
        this.processEffectPulses(effect);
      }
    } else {
      effect.state = HapticPlaybackState.Idle;
      this.emit({ type: 'effect_stopped', effectId: effect.id, reason: 'completed' });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Stop an effect */
  stopEffect(effectId: string): void {
    const effect = this.effectPlayer.getEffect(effectId);
    if (effect) {
      this.effectPlayer.stop(effectId);
      this.emit({ type: 'effect_stopped', effectId, reason: 'cancelled' });
    }
  }

  /** Stop all effects */
  stopAll(): void {
    for (const effect of this.effectPlayer.getActiveEffects()) {
      this.stopEffect(effect.id);
    }
  }

  // =========================================================================
  // Spatial Haptics
  // =========================================================================

  /** Register a spatial haptic zone */
  registerZone(zone: SpatialHapticZone): void {
    this.zones.set(zone.id, zone);
  }

  /** Unregister a zone */
  unregisterZone(zoneId: string): boolean {
    return this.zones.delete(zoneId);
  }

  /** Check hand position against zones */
  checkZones(hand: HandSide, position: Vec3): void {
    for (const zone of this.zones.values()) {
      if (!zone.enabled) continue;
      
      const distance = Math.sqrt(
        (position.x - zone.position.x) ** 2 +
        (position.y - zone.position.y) ** 2 +
        (position.z - zone.position.z) ** 2
      );
      
      if (distance <= zone.radius) {
        let intensity = 1.0;
        
        // Apply falloff
        switch (zone.falloff) {
          case 'linear':
            intensity = 1.0 - (distance / zone.radius);
            break;
          case 'exponential':
            intensity = Math.pow(1.0 - (distance / zone.radius), 2);
            break;
          case 'none':
            intensity = 1.0;
            break;
        }
        
        // Play zone pattern
        const devices = this.getDevicesByHand(hand);
        this.playPattern(zone.pattern, devices.map(d => d.id), intensity);
        
        this.emit({ type: 'zone_entered', zoneId: zone.id, hand });
      }
    }
  }

  // =========================================================================
  // Collision Haptics
  // =========================================================================

  /** Register collision haptic config for an object */
  registerCollisionConfig(objectId: string, config: CollisionHapticConfig): void {
    this.collisionConfigs.set(objectId, config);
  }

  /** Trigger collision haptic */
  triggerCollision(
    objectId: string,
    hand: HandSide,
    velocity: number
  ): void {
    const config = this.collisionConfigs.get(objectId);
    if (!config) return;
    
    // Check cooldown
    const lastTime = this.lastCollisionTime.get(objectId) ?? 0;
    const now = performance.now();
    if (now - lastTime < config.cooldown) return;
    
    // Check velocity threshold
    if (velocity < config.minVelocity) return;
    
    this.lastCollisionTime.set(objectId, now);
    
    // Calculate intensity
    let intensity = 1.0;
    if (config.scaleByForce) {
      intensity = Math.min(1.0, (velocity - config.minVelocity) / (config.maxVelocity - config.minVelocity));
    }
    
    // Play collision pattern
    const devices = this.getDevicesByHand(hand);
    this.playPattern(config.pattern, devices.map(d => d.id), intensity);
    
    this.emit({ type: 'collision', objectId, velocity, hand });
  }

  // =========================================================================
  // Configuration
  // =========================================================================

  /** Set global intensity */
  setGlobalIntensity(intensity: number): void {
    this.config.globalIntensity = Math.max(0, Math.min(1, intensity));
  }

  /** Enable/disable haptics */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
  }

  /** Get current config */
  getConfig(): HapticManagerConfig {
    return { ...this.config };
  }

  // =========================================================================
  // Events
  // =========================================================================

  /** Add event handler */
  addEventListener(handler: HapticEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /** Remove event handler */
  removeEventListener(handler: HapticEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /** Emit event */
  private emit(event: HapticEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Haptic event handler error:', e);
      }
    }
  }

  /** Update (call each frame) */
  update(): void {
    this.effectPlayer.update();
  }
}

// Factory function
export function createHapticManager(config?: Partial<HapticManagerConfig>): HapticManager {
  return new HapticManager(config);
}

// Re-exports
export { HapticDeviceType, HandSide, DEFAULT_HAPTIC_MANAGER_CONFIG } from '../types';
export type { HapticDevice, HapticDeviceCapabilities, HapticManagerConfig };
