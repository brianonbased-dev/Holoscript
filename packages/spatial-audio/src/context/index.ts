/**
 * @holoscript/spatial-audio - Audio Context System
 * Web Audio API wrapper with spatial audio capabilities
 */

import type {
  Vec3,
  SpatialAudioConfig,
  ListenerConfig,
  ListenerState,
  AudioSourceState,
  AudioEvent,
  AudioEventHandler,
} from '../types';
import { DistanceModel, PanningModel, DEFAULT_SPATIAL_AUDIO_CONFIG } from '../types';

// ============================================================================
// Vector Math Utilities
// ============================================================================

const Vec3Math = {
  create: (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z }),
  
  add: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  }),
  
  sub: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),
  
  scale: (v: Vec3, s: number): Vec3 => ({
    x: v.x * s,
    y: v.y * s,
    z: v.z * s,
  }),
  
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  
  normalize: (v: Vec3): Vec3 => {
    const len = Vec3Math.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return Vec3Math.scale(v, 1 / len);
  },
  
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
  
  distance: (a: Vec3, b: Vec3): number => Vec3Math.length(Vec3Math.sub(a, b)),
};

// ============================================================================
// Audio Source Wrapper
// ============================================================================

export class SpatialAudioSource {
  readonly id: string;
  private context: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private pannerNode: PannerNode;
  private buffer: AudioBuffer | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;
  private _loop: boolean = false;
  private _playbackRate: number = 1;
  private onEndedCallback: (() => void) | null = null;

  constructor(
    id: string,
    context: AudioContext,
    destination: AudioNode,
    config: Partial<SpatialAudioConfig> = {}
  ) {
    this.id = id;
    this.context = context;

    // Create audio graph
    this.gainNode = context.createGain();
    this.pannerNode = context.createPanner();

    // Configure panner with defaults
    const cfg = { ...DEFAULT_SPATIAL_AUDIO_CONFIG, ...config };
    this.pannerNode.distanceModel = cfg.distanceModel;
    this.pannerNode.refDistance = cfg.refDistance;
    this.pannerNode.maxDistance = cfg.maxDistance;
    this.pannerNode.rolloffFactor = cfg.rolloffFactor;
    this.pannerNode.panningModel = cfg.enableHRTF ? PanningModel.HRTF : PanningModel.EqualPower;

    // Connect nodes
    this.pannerNode.connect(this.gainNode);
    this.gainNode.connect(destination);
  }

  /** Load audio from URL */
  async load(url: string): Promise<void> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
  }

  /** Load audio from ArrayBuffer */
  async loadBuffer(data: ArrayBuffer): Promise<void> {
    this.buffer = await this.context.decodeAudioData(data);
  }

  /** Set audio buffer directly */
  setBuffer(buffer: AudioBuffer): void {
    this.buffer = buffer;
  }

  /** Play the audio */
  play(offset: number = 0): void {
    if (!this.buffer) return;
    
    this.stop();
    
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = this._loop;
    this.source.playbackRate.value = this._playbackRate;
    this.source.connect(this.pannerNode);
    
    this.source.onended = () => {
      if (this._isPlaying && !this._isPaused) {
        this._isPlaying = false;
        this.onEndedCallback?.();
      }
    };
    
    this.startTime = this.context.currentTime - offset;
    this.source.start(0, offset);
    this._isPlaying = true;
    this._isPaused = false;
  }

  /** Pause playback */
  pause(): void {
    if (!this._isPlaying || this._isPaused) return;
    
    this.pauseTime = this.context.currentTime - this.startTime;
    this._isPaused = true;
    this.source?.stop();
    this.source = null;
  }

  /** Resume from pause */
  resume(): void {
    if (!this._isPaused) return;
    this.play(this.pauseTime);
    this._isPaused = false;
  }

  /** Stop playback */
  stop(): void {
    this.source?.stop();
    this.source?.disconnect();
    this.source = null;
    this._isPlaying = false;
    this._isPaused = false;
    this.pauseTime = 0;
  }

  /** Set 3D position */
  setPosition(position: Vec3): void {
    this.pannerNode.positionX.value = position.x;
    this.pannerNode.positionY.value = position.y;
    this.pannerNode.positionZ.value = position.z;
  }

  /** Set orientation for directional audio */
  setOrientation(forward: Vec3): void {
    this.pannerNode.orientationX.value = forward.x;
    this.pannerNode.orientationY.value = forward.y;
    this.pannerNode.orientationZ.value = forward.z;
  }

  /** Set directional cone */
  setCone(innerAngle: number, outerAngle: number, outerGain: number): void {
    this.pannerNode.coneInnerAngle = innerAngle;
    this.pannerNode.coneOuterAngle = outerAngle;
    this.pannerNode.coneOuterGain = outerGain;
  }

  /** Set volume */
  setVolume(volume: number): void {
    this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
  }

  /** Get volume */
  getVolume(): number {
    return this.gainNode.gain.value;
  }

  /** Set loop */
  setLoop(loop: boolean): void {
    this._loop = loop;
    if (this.source) {
      this.source.loop = loop;
    }
  }

  /** Set playback rate */
  setPlaybackRate(rate: number): void {
    this._playbackRate = rate;
    if (this.source) {
      this.source.playbackRate.value = rate;
    }
  }

  /** Set distance attenuation */
  setDistanceModel(model: DistanceModel): void {
    this.pannerNode.distanceModel = model;
  }

  /** Set reference distance */
  setRefDistance(distance: number): void {
    this.pannerNode.refDistance = distance;
  }

  /** Set max distance */
  setMaxDistance(distance: number): void {
    this.pannerNode.maxDistance = distance;
  }

  /** Set rolloff factor */
  setRolloffFactor(factor: number): void {
    this.pannerNode.rolloffFactor = factor;
  }

  /** Set panning model */
  setPanningModel(model: PanningModel): void {
    this.pannerNode.panningModel = model;
  }

  /** Set ended callback */
  onEnded(callback: () => void): void {
    this.onEndedCallback = callback;
  }

  /** Get state */
  getState(): AudioSourceState {
    return {
      id: this.id,
      isPlaying: this._isPlaying,
      isPaused: this._isPaused,
      isLooping: this._loop,
      volume: this.gainNode.gain.value,
      playbackRate: this._playbackRate,
      currentTime: this._isPlaying 
        ? (this._isPaused ? this.pauseTime : this.context.currentTime - this.startTime)
        : 0,
      duration: this.buffer?.duration ?? 0,
    };
  }

  /** Clean up */
  dispose(): void {
    this.stop();
    this.pannerNode.disconnect();
    this.gainNode.disconnect();
  }
}

// ============================================================================
// Spatial Audio Context Manager
// ============================================================================

export class SpatialAudioContext {
  private context: AudioContext;
  private masterGain: GainNode;
  private sources: Map<string, SpatialAudioSource> = new Map();
  private config: SpatialAudioConfig;
  private eventHandlers: Set<AudioEventHandler> = new Set();
  private _listenerState: ListenerState;

  constructor(config: Partial<SpatialAudioConfig> = {}) {
    this.config = { ...DEFAULT_SPATIAL_AUDIO_CONFIG, ...config };
    
    this.context = new AudioContext({
      sampleRate: this.config.sampleRate,
    });

    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);

    this._listenerState = {
      position: { x: 0, y: 0, z: 0 },
      forward: { x: 0, y: 0, z: -1 },
      up: { x: 0, y: 1, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      gain: 1,
    };
  }

  /** Get the audio context */
  getAudioContext(): AudioContext {
    return this.context;
  }

  /** Resume audio context (required after user interaction) */
  async resume(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /** Suspend audio context */
  async suspend(): Promise<void> {
    await this.context.suspend();
  }

  /** Create a new audio source */
  createSource(id: string): SpatialAudioSource {
    if (this.sources.has(id)) {
      throw new Error(`Audio source '${id}' already exists`);
    }

    if (this.sources.size >= this.config.maxSources) {
      throw new Error(`Maximum audio sources (${this.config.maxSources}) reached`);
    }

    const source = new SpatialAudioSource(id, this.context, this.masterGain, this.config);
    
    source.onEnded(() => {
      this.emit({ type: 'ended', emitterId: id, time: this.context.currentTime });
    });
    
    this.sources.set(id, source);
    return source;
  }

  /** Get an existing source */
  getSource(id: string): SpatialAudioSource | undefined {
    return this.sources.get(id);
  }

  /** Remove a source */
  removeSource(id: string): boolean {
    const source = this.sources.get(id);
    if (source) {
      source.dispose();
      this.sources.delete(id);
      return true;
    }
    return false;
  }

  /** Set listener position and orientation */
  setListener(config: ListenerConfig): void {
    const listener = this.context.listener;

    // Position
    if (listener.positionX) {
      listener.positionX.value = config.position.x;
      listener.positionY.value = config.position.y;
      listener.positionZ.value = config.position.z;
    } else {
      listener.setPosition(config.position.x, config.position.y, config.position.z);
    }

    // Orientation
    if (listener.forwardX) {
      listener.forwardX.value = config.forward.x;
      listener.forwardY.value = config.forward.y;
      listener.forwardZ.value = config.forward.z;
      listener.upX.value = config.up.x;
      listener.upY.value = config.up.y;
      listener.upZ.value = config.up.z;
    } else {
      listener.setOrientation(
        config.forward.x, config.forward.y, config.forward.z,
        config.up.x, config.up.y, config.up.z
      );
    }

    // Update internal state
    this._listenerState = {
      ...this._listenerState,
      ...config,
    };
  }

  /** Get listener state */
  getListenerState(): ListenerState {
    return { ...this._listenerState };
  }

  /** Set master volume */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    this._listenerState.gain = volume;
  }

  /** Get master volume */
  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }

  /** Calculate distance to listener */
  distanceToListener(position: Vec3): number {
    return Vec3Math.distance(position, this._listenerState.position);
  }

  /** Add event handler */
  addEventListener(handler: AudioEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /** Remove event handler */
  removeEventListener(handler: AudioEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /** Emit event to all handlers */
  private emit(event: AudioEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Audio event handler error:', e);
      }
    }
  }

  /** Get all source states */
  getSourceStates(): Map<string, AudioSourceState> {
    const states = new Map<string, AudioSourceState>();
    for (const [id, source] of this.sources) {
      states.set(id, source.getState());
    }
    return states;
  }

  /** Stop all audio */
  stopAll(): void {
    for (const source of this.sources.values()) {
      source.stop();
    }
  }

  /** Dispose of all resources */
  dispose(): void {
    this.stopAll();
    for (const source of this.sources.values()) {
      source.dispose();
    }
    this.sources.clear();
    this.context.close();
  }

  /** Get current time */
  get currentTime(): number {
    return this.context.currentTime;
  }

  /** Get sample rate */
  get sampleRate(): number {
    return this.context.sampleRate;
  }

  /** Get audio context state */
  get state(): AudioContextState {
    return this.context.state;
  }
}

// Factory function
export function createSpatialAudioContext(
  config?: Partial<SpatialAudioConfig>
): SpatialAudioContext {
  return new SpatialAudioContext(config);
}

// Re-exports
export { Vec3Math };
export { DistanceModel, PanningModel } from '../types';
