/**
 * @holoscript/spatial-audio - HRTF Processor
 * Head-Related Transfer Functions for binaural audio
 */

import type {
  Vec3,
  HRTFConfig,
  HRTFCoefficients,
} from '../types';
import {
  HRTFDataset,
  HRTFInterpolation,
  DEFAULT_HRTF_CONFIG,
} from '../types';

// ============================================================================
// Math Utilities
// ============================================================================

const Vec3Math = {
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  
  normalize: (v: Vec3): Vec3 => {
    const len = Vec3Math.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
};

/** Convert cartesian to spherical coordinates */
function cartesianToSpherical(v: Vec3): { azimuth: number; elevation: number; distance: number } {
  const distance = Vec3Math.length(v);
  if (distance === 0) {
    return { azimuth: 0, elevation: 0, distance: 0 };
  }
  
  const normalized = Vec3Math.normalize(v);
  const azimuth = Math.atan2(normalized.x, -normalized.z) * (180 / Math.PI);
  const elevation = Math.asin(normalized.y) * (180 / Math.PI);
  
  return { azimuth, elevation, distance };
}

/** Normalize angle to -180 to 180 range */
function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

// ============================================================================
// Compact HRTF Dataset (built-in)
// ============================================================================

/** Generate compact HRTF dataset with basic spatial cues */
function generateCompactDataset(sampleRate: number): HRTFCoefficients[] {
  const coefficients: HRTFCoefficients[] = [];
  const irLength = 128; // Impulse response length
  
  // Generate for common directions
  const azimuths = [-180, -135, -90, -45, 0, 45, 90, 135, 180];
  const elevations = [-45, -30, -15, 0, 15, 30, 45, 60, 90];
  
  for (const azimuth of azimuths) {
    for (const elevation of elevations) {
      const leftIR = new Float32Array(irLength);
      const rightIR = new Float32Array(irLength);
      
      // Convert to radians
      const azRad = azimuth * (Math.PI / 180);
      const elRad = elevation * (Math.PI / 180);
      
      // Calculate ITD (Interaural Time Difference)
      const headRadius = 0.0875; // meters
      const speedOfSound = 343; // m/s
      const itdSeconds = (headRadius / speedOfSound) * (azRad + Math.sin(azRad));
      const itdSamples = Math.round(itdSeconds * sampleRate);
      
      // Calculate ILD (Interaural Level Difference)
      // Simplified model: attenuate contralateral ear
      const shadowFactor = 0.5 + 0.5 * Math.cos(azRad);
      const leftGain = azimuth >= 0 ? 1.0 : shadowFactor;
      const rightGain = azimuth <= 0 ? 1.0 : shadowFactor;
      
      // Elevation affects high-frequency content (simplified)
      const elevationFactor = Math.cos(elRad * 0.5);
      
      // Generate basic impulse responses
      // Left ear
      const leftDelay = Math.max(0, -itdSamples);
      leftIR[leftDelay] = leftGain * elevationFactor;
      // Add simple filtering for elevation cue
      if (leftDelay + 1 < irLength) {
        leftIR[leftDelay + 1] = leftGain * 0.3 * (1 - elevationFactor);
      }
      
      // Right ear
      const rightDelay = Math.max(0, itdSamples);
      rightIR[rightDelay] = rightGain * elevationFactor;
      if (rightDelay + 1 < irLength) {
        rightIR[rightDelay + 1] = rightGain * 0.3 * (1 - elevationFactor);
      }
      
      coefficients.push({
        azimuth,
        elevation,
        leftIR,
        rightIR,
        itd: itdSamples,
      });
    }
  }
  
  return coefficients;
}

// ============================================================================
// HRTF Processor
// ============================================================================

export class HRTFProcessor {
  private config: HRTFConfig;
  private context: AudioContext;
  private coefficients: HRTFCoefficients[] = [];
  
  // Convolution nodes for binaural processing
  private leftConvolver: ConvolverNode;
  private rightConvolver: ConvolverNode;
  private merger: ChannelMergerNode;
  private splitter: ChannelSplitterNode;
  
  // Current state
  private currentAzimuth: number = 0;
  private currentElevation: number = 0;
  private isInitialized: boolean = false;

  constructor(context: AudioContext, config: Partial<HRTFConfig> = {}) {
    this.context = context;
    this.config = { ...DEFAULT_HRTF_CONFIG, ...config };
    
    // Create audio nodes
    this.leftConvolver = context.createConvolver();
    this.rightConvolver = context.createConvolver();
    this.merger = context.createChannelMerger(2);
    this.splitter = context.createChannelSplitter(2);
    
    // Will be properly connected after initialization
  }

  /** Initialize HRTF processor with dataset */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Load or generate coefficients based on dataset
    switch (this.config.dataset) {
      case HRTFDataset.Compact:
        this.coefficients = generateCompactDataset(this.context.sampleRate);
        break;
      case HRTFDataset.CIPIC:
      case HRTFDataset.KEMAR:
        // These would load from files - for now use compact
        console.warn(`Dataset ${this.config.dataset} not loaded, using compact`);
        this.coefficients = generateCompactDataset(this.context.sampleRate);
        break;
      case HRTFDataset.Custom:
        // User must provide coefficients
        if (this.coefficients.length === 0) {
          console.warn('Custom dataset empty, using compact');
          this.coefficients = generateCompactDataset(this.context.sampleRate);
        }
        break;
    }
    
    // Set initial position
    this.updatePosition({ x: 0, y: 0, z: -1 });
    
    this.isInitialized = true;
  }

  /** Set custom HRTF coefficients */
  setCoefficients(coefficients: HRTFCoefficients[]): void {
    this.coefficients = coefficients;
    if (this.isInitialized) {
      this.updatePosition({ x: 0, y: 0, z: -1 });
    }
  }

  /** Get input node for connecting sources */
  getInput(): AudioNode {
    return this.splitter;
  }

  /** Get output node for connecting to destination */
  getOutput(): AudioNode {
    return this.merger;
  }

  /** Update HRTF based on source position relative to listener */
  updatePosition(relativePosition: Vec3): void {
    if (!this.config.enabled || this.coefficients.length === 0) return;
    
    const { azimuth, elevation } = cartesianToSpherical(relativePosition);
    
    // Skip if position hasn't changed significantly
    if (
      Math.abs(azimuth - this.currentAzimuth) < 1 &&
      Math.abs(elevation - this.currentElevation) < 1
    ) {
      return;
    }
    
    this.currentAzimuth = azimuth;
    this.currentElevation = elevation;
    
    // Find appropriate HRTF coefficients
    const hrtf = this.interpolateHRTF(azimuth, elevation);
    
    // Update convolver buffers
    this.updateConvolvers(hrtf);
  }

  /** Find and interpolate HRTF coefficients */
  private interpolateHRTF(azimuth: number, elevation: number): HRTFCoefficients {
    switch (this.config.interpolation) {
      case HRTFInterpolation.Nearest:
        return this.findNearestHRTF(azimuth, elevation);
      case HRTFInterpolation.Bilinear:
        return this.bilinearInterpolate(azimuth, elevation);
      case HRTFInterpolation.SphericalHarmonics:
        // Fall back to bilinear for now
        return this.bilinearInterpolate(azimuth, elevation);
      default:
        return this.findNearestHRTF(azimuth, elevation);
    }
  }

  /** Find nearest HRTF coefficient */
  private findNearestHRTF(azimuth: number, elevation: number): HRTFCoefficients {
    let nearest = this.coefficients[0];
    let minDistance = Infinity;
    
    for (const coef of this.coefficients) {
      const azDiff = normalizeAngle(coef.azimuth - azimuth);
      const elDiff = coef.elevation - elevation;
      const distance = azDiff * azDiff + elDiff * elDiff;
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = coef;
      }
    }
    
    return nearest;
  }

  /** Bilinear interpolation of HRTF */
  private bilinearInterpolate(azimuth: number, elevation: number): HRTFCoefficients {
    // Find 4 nearest points for interpolation
    const sorted = [...this.coefficients].sort((a, b) => {
      const aDist = Math.pow(normalizeAngle(a.azimuth - azimuth), 2) + Math.pow(a.elevation - elevation, 2);
      const bDist = Math.pow(normalizeAngle(b.azimuth - azimuth), 2) + Math.pow(b.elevation - elevation, 2);
      return aDist - bDist;
    });
    
    if (sorted.length < 4) {
      return sorted[0];
    }
    
    // Get 4 nearest
    const [p1, p2, p3, p4] = sorted.slice(0, 4);
    
    // Calculate weights based on inverse distance
    const weights: number[] = [];
    let totalWeight = 0;
    
    for (const p of [p1, p2, p3, p4]) {
      const azDiff = normalizeAngle(p.azimuth - azimuth);
      const elDiff = p.elevation - elevation;
      const dist = Math.sqrt(azDiff * azDiff + elDiff * elDiff) + 0.001; // Avoid division by zero
      const weight = 1 / dist;
      weights.push(weight);
      totalWeight += weight;
    }
    
    // Normalize weights
    for (let i = 0; i < weights.length; i++) {
      weights[i] /= totalWeight;
    }
    
    // Interpolate impulse responses
    const irLength = p1.leftIR.length;
    const leftIR = new Float32Array(irLength);
    const rightIR = new Float32Array(irLength);
    
    const sources = [p1, p2, p3, p4];
    for (let i = 0; i < irLength; i++) {
      for (let j = 0; j < 4; j++) {
        leftIR[i] += sources[j].leftIR[i] * weights[j];
        rightIR[i] += sources[j].rightIR[i] * weights[j];
      }
    }
    
    // Interpolate ITD
    let itd = 0;
    for (let j = 0; j < 4; j++) {
      itd += sources[j].itd * weights[j];
    }
    
    return {
      azimuth,
      elevation,
      leftIR,
      rightIR,
      itd: Math.round(itd),
    };
  }

  /** Update convolver nodes with new HRTF */
  private updateConvolvers(hrtf: HRTFCoefficients): void {
    const irLength = hrtf.leftIR.length;
    
    // Create stereo buffer for each ear
    const leftBuffer = this.context.createBuffer(1, irLength, this.context.sampleRate);
    const rightBuffer = this.context.createBuffer(1, irLength, this.context.sampleRate);
    
    leftBuffer.copyToChannel(new Float32Array(hrtf.leftIR), 0);
    rightBuffer.copyToChannel(new Float32Array(hrtf.rightIR), 0);
    
    // Update convolvers
    // Note: In a real implementation, we'd use crossfading to avoid clicks
    this.leftConvolver.buffer = leftBuffer;
    this.rightConvolver.buffer = rightBuffer;
  }

  /** Connect the HRTF processor in the audio graph */
  connect(source: AudioNode, destination: AudioNode): void {
    // Disconnect existing connections
    source.disconnect();
    
    // Source -> Splitter
    source.connect(this.splitter);
    
    // Splitter -> Convolvers
    this.splitter.connect(this.leftConvolver, 0);
    this.splitter.connect(this.rightConvolver, 0);
    
    // Convolvers -> Merger
    this.leftConvolver.connect(this.merger, 0, 0);
    this.rightConvolver.connect(this.merger, 0, 1);
    
    // Merger -> Destination
    this.merger.connect(destination);
  }

  /** Disconnect from audio graph */
  disconnect(): void {
    this.splitter.disconnect();
    this.leftConvolver.disconnect();
    this.rightConvolver.disconnect();
    this.merger.disconnect();
  }

  /** Get current azimuth */
  getAzimuth(): number {
    return this.currentAzimuth;
  }

  /** Get current elevation */
  getElevation(): number {
    return this.currentElevation;
  }

  /** Get config */
  getConfig(): HRTFConfig {
    return { ...this.config };
  }

  /** Update config */
  setConfig(config: Partial<HRTFConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get ear separation distance */
  getEarSeparation(): number {
    return this.config.earSeparation;
  }

  /** Dispose resources */
  dispose(): void {
    this.disconnect();
    this.coefficients = [];
  }
}

// Factory function
export function createHRTFProcessor(
  context: AudioContext,
  config?: Partial<HRTFConfig>
): HRTFProcessor {
  return new HRTFProcessor(context, config);
}

// Re-exports
export { HRTFDataset, HRTFInterpolation } from '../types';
export type { HRTFConfig, HRTFCoefficients };
