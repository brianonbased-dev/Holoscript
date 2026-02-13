import { describe, it, expect, beforeEach } from 'vitest';
import { LocalEmotionDetector } from '../LocalEmotionDetector';

describe('LocalEmotionDetector', () => {
  let detector: LocalEmotionDetector;

  beforeEach(async () => {
    detector = new LocalEmotionDetector();
    await detector.initialize({ mode: 'active' });
  });

  it('should detect neutral state for stable signals', () => {
    const signals = {
      headStability: 1.0,
      handStability: 1.0,
      interactionIntensity: 0.2,
      behavioralStressing: 0.1,
    };

    const inference = detector.infer(signals);
    expect(inference.primaryState).toBe('neutral');
    expect(inference.frustration).toBeLessThan(0.3);
  });

  it('should detect frustration on head shaking and stress', () => {
    const signals = {
      headStability: 0.3, // Shaking
      handStability: 1.0,
      interactionIntensity: 0.5,
      behavioralStressing: 0.8, // High stress
    };

    // Feed a few samples to fill the window
    for (let i = 0; i < 5; i++) {
      detector.infer(signals);
    }

    const inference = detector.infer(signals);
    expect(inference.primaryState).toBe('frustrated');
    expect(inference.frustration).toBeGreaterThan(0.7);
  });

  it('should detect confusion on hand tremors', () => {
    const signals = {
      headStability: 1.0,
      handStability: 0.2, // Tremor
      interactionIntensity: 1.0, // Increased to ensure confusion > 0.7
      behavioralStressing: 0.2,
    };

    for (let i = 0; i < 5; i++) {
      detector.infer(signals);
    }

    const inference = detector.infer(signals);
    expect(inference.primaryState).toBe('confused');
    expect(inference.confusion).toBeGreaterThan(0.6);
  });

  it('should detect engagement on high activity', () => {
    const signals = {
      headStability: 0.9,
      handStability: 0.9,
      interactionIntensity: 0.9, // High focus/activity
      behavioralStressing: 0.1,
    };

    const inference = detector.infer(signals);
    expect(inference.engagement).toBeGreaterThan(0.7);
    expect(inference.primaryState).toBe('happy'); // Engaged is happy in our model
  });
});
