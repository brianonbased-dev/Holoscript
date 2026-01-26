/**
 * @holoscript/gestures - FrustrationEstimator
 * Combines head shake and hand tremor analysis
 */

import { HeadShakeDetector, HeadShakeConfig } from './HeadShakeDetector';
import { HandTremorAnalyzer, HandTremorConfig } from './HandTremorAnalyzer';

export interface FrustrationConfig {
  headShake?: Partial<HeadShakeConfig>;
  handTremor?: Partial<HandTremorConfig>;
  /** Weight for head shake in combined score */
  headShakeWeight: number;
  /** Weight for hand tremor in combined score */
  handTremorWeight: number;
  /** Threshold for triggering frustration event */
  frustrationThreshold: number;
}

const DEFAULT_CONFIG: FrustrationConfig = {
  headShakeWeight: 0.6,
  handTremorWeight: 0.4,
  frustrationThreshold: 0.6,
};

/**
 * FrustrationEstimator
 * 
 * Unified API for detecting user frustration through
 * multiple input signals: head shake and hand tremor.
 */
export class FrustrationEstimator {
  private headShakeDetector: HeadShakeDetector;
  private handTremorAnalyzer: HandTremorAnalyzer;
  private config: FrustrationConfig;
  private frustrationCallbacks: Set<(level: number) => void> = new Set();
  
  constructor(config: Partial<FrustrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.headShakeDetector = new HeadShakeDetector(config.headShake);
    this.handTremorAnalyzer = new HandTremorAnalyzer(config.handTremor);
    
    // Wire up internal detectors
    this.headShakeDetector.onDetected((_confidence) => {
      this.checkFrustration();
    });
    
    this.handTremorAnalyzer.onDetected((_hand, _intensity) => {
      this.checkFrustration();
    });
  }
  
  /**
   * Update with VR headset rotation data
   */
  updateHeadRotation(yaw: number, pitch: number): void {
    this.headShakeDetector.addSample(yaw, pitch);
  }
  
  /**
   * Update with hand position data
   */
  updateHandPosition(hand: 'left' | 'right', x: number, y: number, z: number): void {
    this.handTremorAnalyzer.addSample(hand, x, y, z);
  }
  
  /**
   * Get current frustration level (0-1)
   */
  getFrustrationLevel(): number {
    const headScore = this.headShakeDetector.getFrustrationEstimate();
    const tremorScore = this.handTremorAnalyzer.getTremorEstimate();
    
    const combined = 
      headScore * this.config.headShakeWeight +
      tremorScore * this.config.handTremorWeight;
    
    return Math.min(1, combined);
  }
  
  /**
   * Check if user is currently frustrated
   */
  isFrustrated(): boolean {
    return this.getFrustrationLevel() >= this.config.frustrationThreshold;
  }
  
  /**
   * Subscribe to frustration events
   */
  onFrustration(callback: (level: number) => void): () => void {
    this.frustrationCallbacks.add(callback);
    return () => this.frustrationCallbacks.delete(callback);
  }
  
  /**
   * Reset all detectors
   */
  reset(): void {
    this.headShakeDetector.reset();
    this.handTremorAnalyzer.reset();
  }
  
  private checkFrustration(): void {
    const level = this.getFrustrationLevel();
    
    if (level >= this.config.frustrationThreshold) {
      for (const callback of this.frustrationCallbacks) {
        try {
          callback(level);
        } catch (e) {
          console.error('Frustration callback error:', e);
        }
      }
    }
  }
}

// Re-export sub-detectors
export { HeadShakeDetector, HeadShakeConfig } from './HeadShakeDetector';
export { HandTremorAnalyzer, HandTremorConfig } from './HandTremorAnalyzer';
