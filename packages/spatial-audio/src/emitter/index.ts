/**
 * @holoscript/spatial-audio - Audio Emitter System
 * 3D sound sources with distance attenuation and directional cones
 */

import type {
  Vec3,
  Quaternion,
  EmitterConfig,
  EmitterState,
  DirectionalCone,
  AudioZone,
  ZoneShape,
  AudioEvent,
  AudioEventHandler,
} from '../types';
import { DistanceModel, DEFAULT_SPATIAL_AUDIO_CONFIG } from '../types';
import { SpatialAudioSource, SpatialAudioContext } from '../context';

// ============================================================================
// Vector Math
// ============================================================================

const Vec3Math = {
  create: (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z }),
  
  sub: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),
  
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  
  distance: (a: Vec3, b: Vec3): number => Vec3Math.length(Vec3Math.sub(a, b)),
  
  normalize: (v: Vec3): Vec3 => {
    const len = Vec3Math.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
};

// ============================================================================
// Audio Emitter
// ============================================================================

export class AudioEmitter {
  private source: SpatialAudioSource;
  private config: EmitterConfig;
  private _position: Vec3;
  private _orientation: Quaternion;
  private listenerPosition: Vec3 = { x: 0, y: 0, z: 0 };

  constructor(source: SpatialAudioSource, config: Partial<EmitterConfig> = {}) {
    this.source = source;
    
    this._position = config.position ?? { x: 0, y: 0, z: 0 };
    this._orientation = config.orientation ?? { x: 0, y: 0, z: 0, w: 1 };
    
    this.config = {
      id: config.id ?? source.id,
      position: this._position,
      orientation: this._orientation,
      distanceModel: config.distanceModel ?? DEFAULT_SPATIAL_AUDIO_CONFIG.distanceModel,
      refDistance: config.refDistance ?? DEFAULT_SPATIAL_AUDIO_CONFIG.refDistance,
      maxDistance: config.maxDistance ?? DEFAULT_SPATIAL_AUDIO_CONFIG.maxDistance,
      rolloffFactor: config.rolloffFactor ?? DEFAULT_SPATIAL_AUDIO_CONFIG.rolloffFactor,
      cone: config.cone,
      volume: config.volume ?? 1,
      playbackRate: config.playbackRate ?? 1,
      loop: config.loop ?? false,
      spatialize: config.spatialize ?? true,
    };
    
    this.applyConfig();
  }

  /** Apply configuration to audio source */
  private applyConfig(): void {
    this.source.setPosition(this._position);
    this.source.setDistanceModel(this.config.distanceModel);
    this.source.setRefDistance(this.config.refDistance);
    this.source.setMaxDistance(this.config.maxDistance);
    this.source.setRolloffFactor(this.config.rolloffFactor);
    this.source.setVolume(this.config.volume);
    this.source.setPlaybackRate(this.config.playbackRate);
    this.source.setLoop(this.config.loop);
    
    if (this.config.cone) {
      this.source.setCone(
        this.config.cone.innerAngle,
        this.config.cone.outerAngle,
        this.config.cone.outerGain
      );
    }
  }

  /** Load audio from URL */
  async load(url: string): Promise<void> {
    await this.source.load(url);
  }

  /** Load audio from ArrayBuffer */
  async loadBuffer(data: ArrayBuffer): Promise<void> {
    await this.source.loadBuffer(data);
  }

  /** Set audio buffer directly */
  setBuffer(buffer: AudioBuffer): void {
    this.source.setBuffer(buffer);
  }

  /** Play audio */
  play(offset?: number): void {
    this.source.play(offset);
  }

  /** Pause audio */
  pause(): void {
    this.source.pause();
  }

  /** Resume audio */
  resume(): void {
    this.source.resume();
  }

  /** Stop audio */
  stop(): void {
    this.source.stop();
  }

  /** Set 3D position */
  setPosition(position: Vec3): void {
    this._position = position;
    this.config.position = position;
    this.source.setPosition(position);
  }

  /** Get position */
  getPosition(): Vec3 {
    return { ...this._position };
  }

  /** Set orientation */
  setOrientation(orientation: Quaternion): void {
    this._orientation = orientation;
    this.config.orientation = orientation;
    
    // Convert quaternion to forward vector
    const forward = this.quaternionToForward(orientation);
    this.source.setOrientation(forward);
  }

  /** Convert quaternion to forward vector */
  private quaternionToForward(q: Quaternion): Vec3 {
    return {
      x: 2 * (q.x * q.z + q.w * q.y),
      y: 2 * (q.y * q.z - q.w * q.x),
      z: 1 - 2 * (q.x * q.x + q.y * q.y),
    };
  }

  /** Set volume */
  setVolume(volume: number): void {
    this.config.volume = volume;
    this.source.setVolume(volume);
  }

  /** Get volume */
  getVolume(): number {
    return this.config.volume;
  }

  /** Set loop */
  setLoop(loop: boolean): void {
    this.config.loop = loop;
    this.source.setLoop(loop);
  }

  /** Set playback rate */
  setPlaybackRate(rate: number): void {
    this.config.playbackRate = rate;
    this.source.setPlaybackRate(rate);
  }

  /** Set directional cone */
  setCone(cone: DirectionalCone): void {
    this.config.cone = cone;
    this.source.setCone(cone.innerAngle, cone.outerAngle, cone.outerGain);
  }

  /** Update internal listener position for distance calculations */
  updateListenerPosition(position: Vec3): void {
    this.listenerPosition = position;
  }

  /** Calculate distance to listener */
  getDistanceToListener(): number {
    return Vec3Math.distance(this._position, this.listenerPosition);
  }

  /** Calculate gain based on distance attenuation */
  calculateGain(): number {
    const distance = this.getDistanceToListener();
    const { refDistance, maxDistance, rolloffFactor, distanceModel } = this.config;
    
    switch (distanceModel) {
      case DistanceModel.Linear:
        return Math.max(0, 1 - rolloffFactor * (distance - refDistance) / (maxDistance - refDistance));
      
      case DistanceModel.Inverse:
        return refDistance / (refDistance + rolloffFactor * (Math.max(distance, refDistance) - refDistance));
      
      case DistanceModel.Exponential:
        return Math.pow(Math.max(distance, refDistance) / refDistance, -rolloffFactor);
      
      default:
        return 1;
    }
  }

  /** Get emitter state */
  getState(): EmitterState {
    const sourceState = this.source.getState();
    return {
      ...this.config,
      sourceId: this.source.id,
      isPlaying: sourceState.isPlaying,
      currentTime: sourceState.currentTime,
      duration: sourceState.duration,
      distanceToListener: this.getDistanceToListener(),
      calculatedGain: this.calculateGain(),
    };
  }

  /** Get underlying audio source */
  getSource(): SpatialAudioSource {
    return this.source;
  }

  /** Set ended callback */
  onEnded(callback: () => void): void {
    this.source.onEnded(callback);
  }

  /** Dispose */
  dispose(): void {
    this.source.dispose();
  }
}

// ============================================================================
// Audio Zone Manager
// ============================================================================

export class AudioZoneManager {
  private zones: Map<string, AudioZone> = new Map();
  private activeZones: Set<string> = new Set();
  private listenerPosition: Vec3 = { x: 0, y: 0, z: 0 };
  private eventHandlers: Set<AudioEventHandler> = new Set();

  /** Add a zone */
  addZone(zone: AudioZone): void {
    this.zones.set(zone.id, zone);
  }

  /** Remove a zone */
  removeZone(id: string): boolean {
    this.activeZones.delete(id);
    return this.zones.delete(id);
  }

  /** Get a zone */
  getZone(id: string): AudioZone | undefined {
    return this.zones.get(id);
  }

  /** Get all zones */
  getAllZones(): AudioZone[] {
    return Array.from(this.zones.values());
  }

  /** Update listener position and check zone transitions */
  updateListenerPosition(position: Vec3): void {
    this.listenerPosition = position;
    
    const currentTime = performance.now();
    
    for (const [id, zone] of this.zones) {
      const isInside = this.isInsideZone(position, zone);
      const wasInside = this.activeZones.has(id);
      
      if (isInside && !wasInside) {
        this.activeZones.add(id);
        this.emit({ type: 'zoneEnter', zoneId: id, time: currentTime });
      } else if (!isInside && wasInside) {
        this.activeZones.delete(id);
        this.emit({ type: 'zoneExit', zoneId: id, time: currentTime });
      }
    }
  }

  /** Check if a point is inside a zone */
  isInsideZone(position: Vec3, zone: AudioZone): boolean {
    const shape = zone.shape;
    
    switch (shape.type) {
      case 'box': {
        const half = { x: shape.size.x / 2, y: shape.size.y / 2, z: shape.size.z / 2 };
        return (
          position.x >= shape.center.x - half.x &&
          position.x <= shape.center.x + half.x &&
          position.y >= shape.center.y - half.y &&
          position.y <= shape.center.y + half.y &&
          position.z >= shape.center.z - half.z &&
          position.z <= shape.center.z + half.z
        );
      }
      
      case 'sphere': {
        const distance = Vec3Math.distance(position, shape.center);
        return distance <= shape.radius;
      }
      
      case 'cylinder': {
        const dx = position.x - shape.center.x;
        const dz = position.z - shape.center.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const halfHeight = shape.height / 2;
        return (
          horizontalDist <= shape.radius &&
          position.y >= shape.center.y - halfHeight &&
          position.y <= shape.center.y + halfHeight
        );
      }
    }
  }

  /** Get distance to zone boundary (negative if inside) */
  distanceToZone(position: Vec3, zone: AudioZone): number {
    const shape = zone.shape;
    
    switch (shape.type) {
      case 'sphere': {
        return Vec3Math.distance(position, shape.center) - shape.radius;
      }
      
      case 'box': {
        const half = { x: shape.size.x / 2, y: shape.size.y / 2, z: shape.size.z / 2 };
        const dx = Math.max(Math.abs(position.x - shape.center.x) - half.x, 0);
        const dy = Math.max(Math.abs(position.y - shape.center.y) - half.y, 0);
        const dz = Math.max(Math.abs(position.z - shape.center.z) - half.z, 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
      
      case 'cylinder': {
        const dx = position.x - shape.center.x;
        const dz = position.z - shape.center.z;
        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
        const halfHeight = shape.height / 2;
        
        const radialDist = horizontalDist - shape.radius;
        const verticalDist = Math.max(
          Math.abs(position.y - shape.center.y) - halfHeight,
          0
        );
        
        return Math.sqrt(radialDist * radialDist + verticalDist * verticalDist);
      }
    }
  }

  /** Calculate blend factor for zone transition (0-1) */
  getZoneBlendFactor(zone: AudioZone): number {
    const distance = this.distanceToZone(this.listenerPosition, zone);
    
    if (distance <= 0) {
      return 1; // Fully inside
    } else if (distance >= zone.blendDistance) {
      return 0; // Fully outside blend range
    } else {
      return 1 - (distance / zone.blendDistance);
    }
  }

  /** Get active zones */
  getActiveZones(): AudioZone[] {
    return Array.from(this.activeZones)
      .map(id => this.zones.get(id))
      .filter((z): z is AudioZone => z !== undefined);
  }

  /** Get zones sorted by blend factor */
  getZonesByProximity(): Array<{ zone: AudioZone; blendFactor: number }> {
    return Array.from(this.zones.values())
      .map(zone => ({
        zone,
        blendFactor: this.getZoneBlendFactor(zone),
      }))
      .filter(z => z.blendFactor > 0)
      .sort((a, b) => b.blendFactor - a.blendFactor);
  }

  /** Add event handler */
  addEventListener(handler: AudioEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /** Remove event handler */
  removeEventHandler(handler: AudioEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /** Emit event */
  private emit(event: AudioEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Zone event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Emitter Manager
// ============================================================================

export class EmitterManager {
  private audioContext: SpatialAudioContext;
  private emitters: Map<string, AudioEmitter> = new Map();
  private audioBufferCache: Map<string, AudioBuffer> = new Map();

  constructor(audioContext: SpatialAudioContext) {
    this.audioContext = audioContext;
  }

  /** Create a new emitter */
  async createEmitter(id: string, config?: Partial<EmitterConfig>): Promise<AudioEmitter> {
    if (this.emitters.has(id)) {
      throw new Error(`Emitter '${id}' already exists`);
    }
    
    const source = this.audioContext.createSource(id);
    const emitter = new AudioEmitter(source, { id, ...config });
    
    this.emitters.set(id, emitter);
    return emitter;
  }

  /** Get an emitter */
  getEmitter(id: string): AudioEmitter | undefined {
    return this.emitters.get(id);
  }

  /** Remove an emitter */
  removeEmitter(id: string): boolean {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.dispose();
      this.emitters.delete(id);
      this.audioContext.removeSource(id);
      return true;
    }
    return false;
  }

  /** Load and cache an audio buffer */
  async loadAudio(id: string, url: string): Promise<AudioBuffer> {
    if (this.audioBufferCache.has(id)) {
      return this.audioBufferCache.get(id)!;
    }
    
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.getAudioContext().decodeAudioData(arrayBuffer);
    
    this.audioBufferCache.set(id, audioBuffer);
    return audioBuffer;
  }

  /** Get cached audio buffer */
  getAudioBuffer(id: string): AudioBuffer | undefined {
    return this.audioBufferCache.get(id);
  }

  /** Update all emitters with new listener position */
  updateListenerPosition(position: Vec3): void {
    for (const emitter of this.emitters.values()) {
      emitter.updateListenerPosition(position);
    }
  }

  /** Get all emitter states */
  getEmitterStates(): Map<string, EmitterState> {
    const states = new Map<string, EmitterState>();
    for (const [id, emitter] of this.emitters) {
      states.set(id, emitter.getState());
    }
    return states;
  }

  /** Get emitters sorted by distance to listener */
  getEmittersByDistance(): AudioEmitter[] {
    return Array.from(this.emitters.values())
      .sort((a, b) => a.getDistanceToListener() - b.getDistanceToListener());
  }

  /** Stop all emitters */
  stopAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.stop();
    }
  }

  /** Dispose all resources */
  dispose(): void {
    this.stopAll();
    for (const emitter of this.emitters.values()) {
      emitter.dispose();
    }
    this.emitters.clear();
    this.audioBufferCache.clear();
  }
}

// Factory functions
export function createEmitter(
  source: SpatialAudioSource,
  config?: Partial<EmitterConfig>
): AudioEmitter {
  return new AudioEmitter(source, config);
}

export function createEmitterManager(
  audioContext: SpatialAudioContext
): EmitterManager {
  return new EmitterManager(audioContext);
}

export function createZoneManager(): AudioZoneManager {
  return new AudioZoneManager();
}

// Re-exports
export type { EmitterConfig, EmitterState, DirectionalCone, AudioZone, ZoneShape };
