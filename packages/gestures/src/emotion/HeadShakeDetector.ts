/**
 * @holoscript/gestures - HeadShakeDetector
 * Detects frustration through rapid head shaking patterns
 */

export interface HeadShakeConfig {
  /** Minimum angular velocity threshold (rad/s) */
  minAngularVelocity: number;
  /** Number of direction changes required */
  directionChangesRequired: number;
  /** Time window for detection (ms) */
  timeWindow: number;
  /** Cooldown after detection (ms) */
  cooldown: number;
}

export interface HeadRotationSample {
  /** Rotation around Y axis (yaw) in radians */
  yaw: number;
  /** Rotation around X axis (pitch) in radians */
  pitch: number;
  /** Timestamp */
  timestamp: number;
}

const DEFAULT_CONFIG: HeadShakeConfig = {
  minAngularVelocity: 2.0, // ~115 deg/s
  directionChangesRequired: 3,
  timeWindow: 800,
  cooldown: 2000,
};

/**
 * HeadShakeDetector
 * 
 * Analyzes head rotation history to detect rapid side-to-side
 * oscillation patterns indicative of frustration or disagreement.
 */
export class HeadShakeDetector {
  private config: HeadShakeConfig;
  private samples: HeadRotationSample[] = [];
  private lastShakeTime: number = 0;
  private onShakeDetected?: (confidence: number) => void;
  
  constructor(config: Partial<HeadShakeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Add a head rotation sample
   */
  addSample(yaw: number, pitch: number): boolean {
    const now = Date.now();
    
    this.samples.push({ yaw, pitch, timestamp: now });
    
    // Prune old samples
    this.samples = this.samples.filter(
      s => now - s.timestamp < this.config.timeWindow
    );
    
    // Check for shake pattern
    return this.detectShake();
  }
  
  /**
   * Set callback for shake detection
   */
  onDetected(callback: (confidence: number) => void): void {
    this.onShakeDetected = callback;
  }
  
  /**
   * Get current frustration estimate (0-1)
   */
  getFrustrationEstimate(): number {
    const now = Date.now();
    
    // If recently shook, return high estimate with decay
    if (now - this.lastShakeTime < this.config.cooldown) {
      const elapsed = now - this.lastShakeTime;
      return Math.max(0, 1 - elapsed / this.config.cooldown);
    }
    
    // Otherwise check partial shake patterns
    if (this.samples.length < 3) return 0;
    
    const directionChanges = this.countDirectionChanges();
    return Math.min(1, directionChanges / this.config.directionChangesRequired);
  }
  
  /**
   * Reset the detector state
   */
  reset(): void {
    this.samples = [];
    this.lastShakeTime = 0;
  }
  
  private detectShake(): boolean {
    const now = Date.now();
    
    // Cooldown check
    if (now - this.lastShakeTime < this.config.cooldown) {
      return false;
    }
    
    if (this.samples.length < 4) return false;
    
    // Count direction changes
    const directionChanges = this.countDirectionChanges();
    
    // Check angular velocity
    const maxVelocity = this.getMaxAngularVelocity();
    
    if (
      directionChanges >= this.config.directionChangesRequired &&
      maxVelocity >= this.config.minAngularVelocity
    ) {
      this.lastShakeTime = now;
      const confidence = Math.min(1, maxVelocity / (this.config.minAngularVelocity * 2));
      
      if (this.onShakeDetected) {
        this.onShakeDetected(confidence);
      }
      
      return true;
    }
    
    return false;
  }
  
  private countDirectionChanges(): number {
    if (this.samples.length < 3) return 0;
    
    let changes = 0;
    let lastDelta = 0;
    
    for (let i = 1; i < this.samples.length; i++) {
      const delta = this.samples[i].yaw - this.samples[i - 1].yaw;
      
      // Skip near-zero deltas
      if (Math.abs(delta) < 0.01) continue;
      
      // Check for sign change
      if (lastDelta !== 0 && Math.sign(delta) !== Math.sign(lastDelta)) {
        changes++;
      }
      
      lastDelta = delta;
    }
    
    return changes;
  }
  
  private getMaxAngularVelocity(): number {
    if (this.samples.length < 2) return 0;
    
    let maxVelocity = 0;
    
    for (let i = 1; i < this.samples.length; i++) {
      const dt = (this.samples[i].timestamp - this.samples[i - 1].timestamp) / 1000;
      if (dt <= 0) continue;
      
      const dyaw = Math.abs(this.samples[i].yaw - this.samples[i - 1].yaw);
      const velocity = dyaw / dt;
      
      maxVelocity = Math.max(maxVelocity, velocity);
    }
    
    return maxVelocity;
  }
}
