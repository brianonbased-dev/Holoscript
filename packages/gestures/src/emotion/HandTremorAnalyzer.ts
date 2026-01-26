/**
 * @holoscript/gestures - HandTremorAnalyzer
 * Detects frustration through hand tremor patterns
 */

export interface HandTremorConfig {
  /** Minimum jitter frequency (Hz) */
  minFrequency: number;
  /** Maximum jitter frequency (Hz) */
  maxFrequency: number;
  /** Minimum amplitude threshold (meters) */
  minAmplitude: number;
  /** Sample window (ms) */
  sampleWindow: number;
  /** Smoothing factor for estimation */
  smoothingFactor: number;
}

export interface HandPositionSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

const DEFAULT_CONFIG: HandTremorConfig = {
  minFrequency: 4, // 4 Hz
  maxFrequency: 12, // 12 Hz
  minAmplitude: 0.002, // 2mm
  sampleWindow: 500, // 500ms
  smoothingFactor: 0.3,
};

/**
 * HandTremorAnalyzer
 * 
 * Analyzes hand position variance to detect high-frequency jitter
 * patterns that may indicate frustration, anxiety, or fatigue.
 */
export class HandTremorAnalyzer {
  private config: HandTremorConfig;
  private leftSamples: HandPositionSample[] = [];
  private rightSamples: HandPositionSample[] = [];
  private tremorEstimate: number = 0;
  private onTremorDetected?: (hand: 'left' | 'right', intensity: number) => void;
  
  constructor(config: Partial<HandTremorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Add a hand position sample
   */
  addSample(hand: 'left' | 'right', x: number, y: number, z: number): void {
    const now = Date.now();
    const sample: HandPositionSample = { x, y, z, timestamp: now };
    
    const samples = hand === 'left' ? this.leftSamples : this.rightSamples;
    samples.push(sample);
    
    // Prune old samples
    const cutoff = now - this.config.sampleWindow;
    if (hand === 'left') {
      this.leftSamples = this.leftSamples.filter(s => s.timestamp > cutoff);
    } else {
      this.rightSamples = this.rightSamples.filter(s => s.timestamp > cutoff);
    }
    
    // Analyze tremor
    this.analyzeTremor(hand);
  }
  
  /**
   * Set callback for tremor detection
   */
  onDetected(callback: (hand: 'left' | 'right', intensity: number) => void): void {
    this.onTremorDetected = callback;
  }
  
  /**
   * Get combined tremor estimate (0-1)
   */
  getTremorEstimate(): number {
    return this.tremorEstimate;
  }
  
  /**
   * Get tremor estimate for specific hand (0-1)
   */
  getHandTremorEstimate(hand: 'left' | 'right'): number {
    const samples = hand === 'left' ? this.leftSamples : this.rightSamples;
    return this.calculateTremorIntensity(samples);
  }
  
  /**
   * Reset all samples
   */
  reset(): void {
    this.leftSamples = [];
    this.rightSamples = [];
    this.tremorEstimate = 0;
  }
  
  private analyzeTremor(hand: 'left' | 'right'): void {
    const samples = hand === 'left' ? this.leftSamples : this.rightSamples;
    
    if (samples.length < 10) return;
    
    const intensity = this.calculateTremorIntensity(samples);
    
    // Smooth the estimate
    this.tremorEstimate = 
      this.tremorEstimate * (1 - this.config.smoothingFactor) +
      intensity * this.config.smoothingFactor;
    
    // Trigger callback if significant tremor detected
    if (intensity > 0.5 && this.onTremorDetected) {
      this.onTremorDetected(hand, intensity);
    }
  }
  
  private calculateTremorIntensity(samples: HandPositionSample[]): number {
    if (samples.length < 5) return 0;
    
    // Calculate position variance
    const variance = this.calculateVariance(samples);
    
    // Estimate dominant frequency via zero-crossing rate
    const frequency = this.estimateFrequency(samples);
    
    // Check if frequency is in tremor range
    if (frequency < this.config.minFrequency || frequency > this.config.maxFrequency) {
      return 0;
    }
    
    // Amplitude check
    const amplitude = Math.sqrt(variance);
    if (amplitude < this.config.minAmplitude) {
      return 0;
    }
    
    // Normalize intensity
    const amplitudeScore = Math.min(1, amplitude / (this.config.minAmplitude * 10));
    const frequencyScore = 1 - Math.abs(frequency - 8) / 8; // Peak at 8 Hz
    
    return amplitudeScore * frequencyScore;
  }
  
  private calculateVariance(samples: HandPositionSample[]): number {
    const n = samples.length;
    if (n < 2) return 0;
    
    // Calculate mean position
    let meanX = 0, meanY = 0, meanZ = 0;
    for (const s of samples) {
      meanX += s.x;
      meanY += s.y;
      meanZ += s.z;
    }
    meanX /= n;
    meanY /= n;
    meanZ /= n;
    
    // Calculate variance
    let variance = 0;
    for (const s of samples) {
      const dx = s.x - meanX;
      const dy = s.y - meanY;
      const dz = s.z - meanZ;
      variance += dx * dx + dy * dy + dz * dz;
    }
    
    return variance / n;
  }
  
  private estimateFrequency(samples: HandPositionSample[]): number {
    if (samples.length < 4) return 0;
    
    // Simple zero-crossing rate on velocity
    let crossings = 0;
    let lastVelocity = 0;
    
    for (let i = 1; i < samples.length; i++) {
      const dt = (samples[i].timestamp - samples[i - 1].timestamp) / 1000;
      if (dt <= 0) continue;
      
      const dx = samples[i].x - samples[i - 1].x;
      const velocity = dx / dt;
      
      if (lastVelocity !== 0 && Math.sign(velocity) !== Math.sign(lastVelocity)) {
        crossings++;
      }
      
      lastVelocity = velocity;
    }
    
    // Duration in seconds
    const duration = (samples[samples.length - 1].timestamp - samples[0].timestamp) / 1000;
    if (duration <= 0) return 0;
    
    // Zero-crossing rate gives half the frequency
    return (crossings / 2) / duration;
  }
}
