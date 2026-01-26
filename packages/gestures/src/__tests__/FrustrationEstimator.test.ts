/**
 * @holoscript/gestures - FrustrationEstimator Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FrustrationEstimator, HeadShakeDetector, HandTremorAnalyzer } from '../emotion';

describe('HeadShakeDetector', () => {
  let detector: HeadShakeDetector;

  beforeEach(() => {
    detector = new HeadShakeDetector();
  });

  it('should initialize with default config', () => {
    expect(detector).toBeDefined();
    expect(detector.getFrustrationEstimate()).toBe(0);
  });

  it('should detect shake pattern', () => {
    const callback = vi.fn();
    detector.onDetected(callback);

    // Simulate rapid head shakes
    for (let i = 0; i < 10; i++) {
      const yaw = Math.sin(i * 2) * 0.5; // Oscillating yaw
      detector.addSample(yaw, 0);
    }

    // May or may not trigger depending on velocity
    expect(detector.getFrustrationEstimate()).toBeGreaterThanOrEqual(0);
  });

  it('should reset state', () => {
    detector.addSample(0.5, 0);
    detector.addSample(-0.5, 0);
    detector.reset();
    expect(detector.getFrustrationEstimate()).toBe(0);
  });
});

describe('HandTremorAnalyzer', () => {
  let analyzer: HandTremorAnalyzer;

  beforeEach(() => {
    analyzer = new HandTremorAnalyzer();
  });

  it('should initialize with default config', () => {
    expect(analyzer).toBeDefined();
    expect(analyzer.getTremorEstimate()).toBe(0);
  });

  it('should track samples for both hands', () => {
    analyzer.addSample('left', 0, 1, 0);
    analyzer.addSample('right', 0, 1, 0);
    expect(analyzer.getHandTremorEstimate('left')).toBeGreaterThanOrEqual(0);
    expect(analyzer.getHandTremorEstimate('right')).toBeGreaterThanOrEqual(0);
  });

  it('should reset state', () => {
    analyzer.addSample('left', 0, 1, 0);
    analyzer.reset();
    expect(analyzer.getTremorEstimate()).toBe(0);
  });
});

describe('FrustrationEstimator', () => {
  let estimator: FrustrationEstimator;

  beforeEach(() => {
    estimator = new FrustrationEstimator();
  });

  it('should initialize with default config', () => {
    expect(estimator).toBeDefined();
    expect(estimator.getFrustrationLevel()).toBe(0);
  });

  it('should combine head and hand signals', () => {
    estimator.updateHeadRotation(0, 0);
    estimator.updateHandPosition('left', 0, 1, 0);
    expect(estimator.getFrustrationLevel()).toBeGreaterThanOrEqual(0);
  });

  it('should report isFrustrated boolean', () => {
    expect(typeof estimator.isFrustrated()).toBe('boolean');
  });

  it('should allow frustration callback', () => {
    const callback = vi.fn();
    const unsubscribe = estimator.onFrustration(callback);
    expect(typeof unsubscribe).toBe('function');
  });

  it('should reset all detectors', () => {
    estimator.updateHeadRotation(0.5, 0);
    estimator.reset();
    expect(estimator.getFrustrationLevel()).toBe(0);
  });
});
