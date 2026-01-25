/**
 * @holoscript/spatial-audio - Room Acoustics
 * Reverb, reflections, occlusion, and material absorption
 */

import type {
  Vec3,
  RoomConfig,
  RoomMaterials,
  SurfaceMaterial,
  FrequencyBands,
  ReverbConfig,
  ReflectionPath,
  OcclusionConfig,
  OcclusionResult,
} from '../types';
import {
  DEFAULT_ROOM_CONFIG,
  DEFAULT_REVERB_CONFIG,
  DEFAULT_OCCLUSION_CONFIG,
} from '../types';

// ============================================================================
// Math Utilities
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
  
  reflect: (incident: Vec3, normal: Vec3): Vec3 => {
    const d = 2 * Vec3Math.dot(incident, normal);
    return Vec3Math.sub(incident, Vec3Math.scale(normal, d));
  },
};

// Speed of sound in m/s
const SPEED_OF_SOUND = 343;

// ============================================================================
// Reflection Calculator
// ============================================================================

export class ReflectionCalculator {
  private roomConfig: RoomConfig;
  private sampleRate: number;

  constructor(roomConfig: RoomConfig, sampleRate: number) {
    this.roomConfig = roomConfig;
    this.sampleRate = sampleRate;
  }

  /** Calculate early reflections using image source method */
  calculateReflections(
    sourcePos: Vec3, 
    listenerPos: Vec3, 
    order: number = 2
  ): ReflectionPath[] {
    const reflections: ReflectionPath[] = [];
    const { dimensions, materials } = this.roomConfig;
    
    // Direct path (order 0)
    const directDistance = Vec3Math.distance(sourcePos, listenerPos);
    const directDelay = Math.round((directDistance / SPEED_OF_SOUND) * this.sampleRate);
    const directGain = 1 / Math.max(1, directDistance);
    
    reflections.push({
      delay: directDelay,
      gain: Math.min(1, directGain),
      direction: Vec3Math.normalize(Vec3Math.sub(sourcePos, listenerPos)),
      order: 0,
      surfaces: [],
    });
    
    // First order reflections (from each wall)
    if (order >= 1) {
      const walls: { name: string; normal: Vec3; offset: number; material: SurfaceMaterial }[] = [
        { name: 'left', normal: { x: 1, y: 0, z: 0 }, offset: 0, material: materials.left },
        { name: 'right', normal: { x: -1, y: 0, z: 0 }, offset: dimensions.x, material: materials.right },
        { name: 'front', normal: { x: 0, y: 0, z: 1 }, offset: 0, material: materials.front },
        { name: 'back', normal: { x: 0, y: 0, z: -1 }, offset: dimensions.z, material: materials.back },
        { name: 'floor', normal: { x: 0, y: 1, z: 0 }, offset: 0, material: materials.floor },
        { name: 'ceiling', normal: { x: 0, y: -1, z: 0 }, offset: dimensions.y, material: materials.ceiling },
      ];
      
      for (const wall of walls) {
        // Calculate image source position
        const imageSource = this.calculateImageSource(sourcePos, wall.normal, wall.offset);
        const reflectionDistance = Vec3Math.distance(imageSource, listenerPos);
        
        // Calculate delay and gain
        const delay = Math.round((reflectionDistance / SPEED_OF_SOUND) * this.sampleRate);
        
        // Average absorption across frequency bands
        const avgAbsorption = this.averageAbsorption(wall.material.absorption);
        const reflectionGain = (1 - avgAbsorption) / Math.max(1, reflectionDistance);
        
        reflections.push({
          delay,
          gain: Math.min(1, reflectionGain),
          direction: Vec3Math.normalize(Vec3Math.sub(imageSource, listenerPos)),
          order: 1,
          surfaces: [wall.name],
        });
      }
    }
    
    // Second order reflections (simplified - corner reflections)
    if (order >= 2) {
      // Add a few key second-order reflections (corners)
      const cornerCombinations = [
        ['left', 'floor'], ['left', 'ceiling'],
        ['right', 'floor'], ['right', 'ceiling'],
        ['front', 'floor'], ['front', 'ceiling'],
        ['back', 'floor'], ['back', 'ceiling'],
      ];
      
      for (const [wall1, wall2] of cornerCombinations) {
        const mat1 = materials[wall1 as keyof RoomMaterials];
        const mat2 = materials[wall2 as keyof RoomMaterials];
        
        // Simplified: assume corner reflection adds ~1.5x the average wall distance
        const avgWallDist = (dimensions.x + dimensions.y + dimensions.z) / 3;
        const cornerDistance = avgWallDist * 1.5;
        
        const delay = Math.round((cornerDistance / SPEED_OF_SOUND) * this.sampleRate);
        const absorption1 = 1 - this.averageAbsorption(mat1.absorption);
        const absorption2 = 1 - this.averageAbsorption(mat2.absorption);
        const cornerGain = (absorption1 * absorption2) / Math.max(1, cornerDistance);
        
        reflections.push({
          delay,
          gain: Math.min(1, cornerGain * 0.5), // Attenuate further
          direction: { x: 0, y: 0, z: 0 }, // Diffuse
          order: 2,
          surfaces: [wall1, wall2],
        });
      }
    }
    
    // Sort by delay
    reflections.sort((a, b) => a.delay - b.delay);
    
    return reflections;
  }

  /** Calculate image source position for a wall */
  private calculateImageSource(source: Vec3, normal: Vec3, wallOffset: number): Vec3 {
    // Distance from source to wall
    const distToWall = Vec3Math.dot(source, normal) - wallOffset;
    // Reflect source across wall
    return Vec3Math.sub(source, Vec3Math.scale(normal, 2 * distToWall));
  }

  /** Calculate average absorption across frequency bands */
  private averageAbsorption(bands: FrequencyBands): number {
    return (
      bands.band125 + bands.band250 + bands.band500 +
      bands.band1000 + bands.band2000 + bands.band4000
    ) / 6;
  }

  /** Update room config */
  setRoomConfig(config: RoomConfig): void {
    this.roomConfig = config;
  }
}

// ============================================================================
// Reverb Processor
// ============================================================================

export class ReverbProcessor {
  private context: AudioContext;
  private convolver: ConvolverNode;
  private wetGain: GainNode;
  private dryGain: GainNode;
  private config: ReverbConfig;
  private roomConfig: RoomConfig;

  constructor(
    context: AudioContext,
    roomConfig?: Partial<RoomConfig>,
    reverbConfig?: Partial<ReverbConfig>
  ) {
    this.context = context;
    this.roomConfig = { ...DEFAULT_ROOM_CONFIG, ...roomConfig };
    this.config = { ...DEFAULT_REVERB_CONFIG, ...reverbConfig };
    
    // Create audio nodes
    this.convolver = context.createConvolver();
    this.wetGain = context.createGain();
    this.dryGain = context.createGain();
    
    this.wetGain.gain.value = this.config.wetMix;
    this.dryGain.gain.value = 1 - this.config.wetMix;
    
    // Generate initial impulse response
    this.generateImpulseResponse();
  }

  /** Generate reverb impulse response based on room parameters */
  private generateImpulseResponse(): void {
    const { decayTime, preDelay, damping, diffusion, roomSize } = this.config;
    const sampleRate = this.context.sampleRate;
    
    // IR length in samples (cover full decay)
    const irLength = Math.ceil(decayTime * sampleRate * 1.5);
    const preDelaySamples = Math.floor((preDelay / 1000) * sampleRate);
    
    // Create stereo IR
    const buffer = this.context.createBuffer(2, irLength, sampleRate);
    const leftChannel = buffer.getChannelData(0);
    const rightChannel = buffer.getChannelData(1);
    
    // Generate diffuse noise with exponential decay
    for (let i = preDelaySamples; i < irLength; i++) {
      const t = (i - preDelaySamples) / sampleRate;
      
      // Exponential decay envelope
      const decay = Math.exp(-3 * t / decayTime);
      
      // High-frequency damping (simple lowpass effect)
      const hfDamping = Math.exp(-t * damping * 10);
      
      // Noise with diffusion
      const noise1 = (Math.random() * 2 - 1) * diffusion;
      const noise2 = (Math.random() * 2 - 1) * diffusion;
      
      // Early reflections (sparse impulses)
      const earlyReflection = this.calculateEarlyReflection(i - preDelaySamples, sampleRate, roomSize);
      
      // Combine
      const amplitude = decay * hfDamping;
      leftChannel[i] = (noise1 + earlyReflection) * amplitude;
      rightChannel[i] = (noise2 + earlyReflection * 0.9) * amplitude;
    }
    
    // Normalize
    this.normalizeBuffer(buffer);
    
    this.convolver.buffer = buffer;
  }

  /** Calculate early reflection contribution at a sample */
  private calculateEarlyReflection(sample: number, sampleRate: number, roomSize: number): number {
    // Simple early reflection pattern based on room size
    const reflectionDelays = [
      0.01, 0.02, 0.035, 0.05, 0.07, 0.09, 0.12
    ].map(t => Math.floor(t * roomSize * sampleRate));
    
    const reflectionGains = [0.8, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2];
    
    for (let i = 0; i < reflectionDelays.length; i++) {
      if (sample >= reflectionDelays[i] && sample < reflectionDelays[i] + 10) {
        return reflectionGains[i] * (1 - (sample - reflectionDelays[i]) / 10);
      }
    }
    
    return 0;
  }

  /** Normalize buffer to prevent clipping */
  private normalizeBuffer(buffer: AudioBuffer): void {
    let maxAmp = 0;
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
        maxAmp = Math.max(maxAmp, Math.abs(data[i]));
      }
    }
    
    if (maxAmp > 0) {
      const scale = 0.9 / maxAmp;
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++) {
          data[i] *= scale;
        }
      }
    }
  }

  /** Connect reverb in audio graph */
  connect(source: AudioNode, destination: AudioNode): void {
    // Dry path
    source.connect(this.dryGain);
    this.dryGain.connect(destination);
    
    // Wet path (through reverb)
    source.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.wetGain.connect(destination);
  }

  /** Disconnect from audio graph */
  disconnect(): void {
    this.dryGain.disconnect();
    this.convolver.disconnect();
    this.wetGain.disconnect();
  }

  /** Set wet/dry mix */
  setWetMix(mix: number): void {
    this.config.wetMix = Math.max(0, Math.min(1, mix));
    this.wetGain.gain.value = this.config.wetMix;
    this.dryGain.gain.value = 1 - this.config.wetMix;
  }

  /** Update reverb config and regenerate IR */
  setReverbConfig(config: Partial<ReverbConfig>): void {
    this.config = { ...this.config, ...config };
    this.generateImpulseResponse();
  }

  /** Update room config and regenerate IR */
  setRoomConfig(config: Partial<RoomConfig>): void {
    this.roomConfig = { ...this.roomConfig, ...config };
    
    // Recalculate reverb based on room
    const volume = this.roomConfig.dimensions.x * 
                   this.roomConfig.dimensions.y * 
                   this.roomConfig.dimensions.z;
    
    // Sabine equation for RT60
    const avgAbsorption = this.calculateAverageRoomAbsorption();
    const surfaceArea = 2 * (
      this.roomConfig.dimensions.x * this.roomConfig.dimensions.y +
      this.roomConfig.dimensions.y * this.roomConfig.dimensions.z +
      this.roomConfig.dimensions.z * this.roomConfig.dimensions.x
    );
    
    const rt60 = 0.161 * volume / (surfaceArea * avgAbsorption);
    this.config.decayTime = Math.min(10, Math.max(0.1, rt60));
    
    this.generateImpulseResponse();
  }

  /** Calculate average room absorption */
  private calculateAverageRoomAbsorption(): number {
    const { materials, dimensions } = this.roomConfig;
    
    // Surface areas
    const wallArea = dimensions.x * dimensions.y;
    const floorCeilingArea = dimensions.x * dimensions.z;
    const frontBackArea = dimensions.y * dimensions.z;
    
    const totalArea = 2 * (wallArea + floorCeilingArea + frontBackArea);
    
    // Weighted average absorption
    const avgBand = (m: SurfaceMaterial) => (
      m.absorption.band125 + m.absorption.band250 + m.absorption.band500 +
      m.absorption.band1000 + m.absorption.band2000 + m.absorption.band4000
    ) / 6;
    
    const weightedAbsorption = (
      frontBackArea * avgBand(materials.left) +
      frontBackArea * avgBand(materials.right) +
      wallArea * avgBand(materials.front) +
      wallArea * avgBand(materials.back) +
      floorCeilingArea * avgBand(materials.floor) +
      floorCeilingArea * avgBand(materials.ceiling)
    ) / totalArea;
    
    return weightedAbsorption;
  }

  /** Get current config */
  getConfig(): ReverbConfig {
    return { ...this.config };
  }

  /** Dispose resources */
  dispose(): void {
    this.disconnect();
  }
}

// ============================================================================
// Occlusion Processor
// ============================================================================

export class OcclusionProcessor {
  private config: OcclusionConfig;
  private context: AudioContext;
  private lowpassFilter: BiquadFilterNode;
  private gainNode: GainNode;
  
  private currentOcclusion: number = 0;
  private targetOcclusion: number = 0;
  private smoothingRate: number;

  constructor(context: AudioContext, config?: Partial<OcclusionConfig>) {
    this.context = context;
    this.config = { ...DEFAULT_OCCLUSION_CONFIG, ...config };
    
    // Create audio nodes
    this.lowpassFilter = context.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 20000; // Start fully open
    
    this.gainNode = context.createGain();
    
    // Connect
    this.lowpassFilter.connect(this.gainNode);
    
    // Calculate smoothing rate
    this.smoothingRate = 1000 / this.config.smoothingTime;
  }

  /** Get input node */
  getInput(): BiquadFilterNode {
    return this.lowpassFilter;
  }

  /** Get output node */
  getOutput(): GainNode {
    return this.gainNode;
  }

  /** Set occlusion level (0 = fully occluded, 1 = clear) */
  setOcclusion(factor: number): OcclusionResult {
    this.targetOcclusion = Math.max(0, Math.min(1, factor));
    
    // Calculate frequency-dependent attenuation
    // High frequencies are attenuated more when occluded
    const frequencyAttenuation: FrequencyBands = {
      band125: 1 - (1 - factor) * 0.3,
      band250: 1 - (1 - factor) * 0.4,
      band500: 1 - (1 - factor) * 0.5,
      band1000: 1 - (1 - factor) * 0.6,
      band2000: 1 - (1 - factor) * 0.75,
      band4000: 1 - (1 - factor) * 0.9,
    };
    
    return {
      factor,
      frequencyAttenuation,
      isDiffracted: factor > 0 && factor < 1,
    };
  }

  /** Update occlusion smoothly (call each frame) */
  update(deltaTime: number): void {
    if (!this.config.enabled) return;
    
    // Smooth transition
    const diff = this.targetOcclusion - this.currentOcclusion;
    const maxChange = this.smoothingRate * deltaTime;
    
    if (Math.abs(diff) < maxChange) {
      this.currentOcclusion = this.targetOcclusion;
    } else {
      this.currentOcclusion += Math.sign(diff) * maxChange;
    }
    
    // Apply to filter
    // Map occlusion (0-1) to filter frequency (500-20000 Hz)
    const minFreq = 500;
    const maxFreq = 20000;
    const filterFreq = minFreq + this.currentOcclusion * (maxFreq - minFreq);
    
    this.lowpassFilter.frequency.linearRampToValueAtTime(
      filterFreq,
      this.context.currentTime + deltaTime
    );
    
    // Also attenuate gain slightly when occluded
    const gainValue = 0.3 + this.currentOcclusion * 0.7;
    this.gainNode.gain.linearRampToValueAtTime(
      gainValue,
      this.context.currentTime + deltaTime
    );
  }

  /** Raycast-based occlusion check (simplified) */
  checkOcclusion(
    sourcePos: Vec3, 
    listenerPos: Vec3, 
    obstacles: Array<{ position: Vec3; radius: number }>
  ): number {
    if (!this.config.enabled) return 1;
    
    const direction = Vec3Math.normalize(Vec3Math.sub(listenerPos, sourcePos));
    const totalDistance = Vec3Math.distance(sourcePos, listenerPos);
    
    let occlusionFactor = 1;
    
    for (const obstacle of obstacles) {
      // Simple sphere intersection test
      const toObstacle = Vec3Math.sub(obstacle.position, sourcePos);
      const projectedDist = Vec3Math.dot(toObstacle, direction);
      
      if (projectedDist < 0 || projectedDist > totalDistance) continue;
      
      // Closest point on ray to obstacle center
      const closestPoint = Vec3Math.add(sourcePos, Vec3Math.scale(direction, projectedDist));
      const distToCenter = Vec3Math.distance(closestPoint, obstacle.position);
      
      if (distToCenter < obstacle.radius) {
        // Full occlusion
        occlusionFactor *= 0.1;
      } else if (distToCenter < obstacle.radius * 2) {
        // Partial occlusion (diffraction zone)
        const diffraction = (distToCenter - obstacle.radius) / obstacle.radius;
        occlusionFactor *= 0.1 + diffraction * 0.9;
      }
    }
    
    return occlusionFactor;
  }

  /** Get current occlusion level */
  getCurrentOcclusion(): number {
    return this.currentOcclusion;
  }

  /** Update config */
  setConfig(config: Partial<OcclusionConfig>): void {
    this.config = { ...this.config, ...config };
    this.smoothingRate = 1000 / this.config.smoothingTime;
  }

  /** Dispose resources */
  dispose(): void {
    this.lowpassFilter.disconnect();
    this.gainNode.disconnect();
  }
}

// ============================================================================
// Room Acoustics Manager
// ============================================================================

export class RoomAcousticsManager {
  private _context: AudioContext;
  private roomConfig: RoomConfig;
  private reflectionCalculator: ReflectionCalculator;
  private reverbProcessor: ReverbProcessor;
  private occlusionProcessor: OcclusionProcessor;

  constructor(
    context: AudioContext,
    roomConfig?: Partial<RoomConfig>,
    reverbConfig?: Partial<ReverbConfig>
  ) {
    this._context = context;
    this.roomConfig = { ...DEFAULT_ROOM_CONFIG, ...roomConfig };
    
    this.reflectionCalculator = new ReflectionCalculator(this.roomConfig, context.sampleRate);
    this.reverbProcessor = new ReverbProcessor(context, this.roomConfig, reverbConfig);
    this.occlusionProcessor = new OcclusionProcessor(context);
  }

  /** Get reflection calculator */
  getReflectionCalculator(): ReflectionCalculator {
    return this.reflectionCalculator;
  }

  /** Get reverb processor */
  getReverbProcessor(): ReverbProcessor {
    return this.reverbProcessor;
  }

  /** Get occlusion processor */
  getOcclusionProcessor(): OcclusionProcessor {
    return this.occlusionProcessor;
  }

  /** Update room configuration */
  setRoomConfig(config: Partial<RoomConfig>): void {
    this.roomConfig = { ...this.roomConfig, ...config };
    this.reflectionCalculator.setRoomConfig(this.roomConfig);
    this.reverbProcessor.setRoomConfig(config);
  }

  /** Get current room config */
  getRoomConfig(): RoomConfig {
    return { ...this.roomConfig };
  }

  /** Get audio context */
  getAudioContext(): AudioContext {
    return this._context;
  }

  /** Dispose all resources */
  dispose(): void {
    this.reverbProcessor.dispose();
    this.occlusionProcessor.dispose();
  }
}

// Factory function
export function createRoomAcoustics(
  context: AudioContext,
  roomConfig?: Partial<RoomConfig>,
  reverbConfig?: Partial<ReverbConfig>
): RoomAcousticsManager {
  return new RoomAcousticsManager(context, roomConfig, reverbConfig);
}

// Re-exports
export { MATERIAL_PRESETS, OcclusionMethod } from '../types';
export type { RoomConfig, RoomMaterials, SurfaceMaterial, FrequencyBands, ReverbConfig, ReflectionPath, OcclusionConfig, OcclusionResult };
