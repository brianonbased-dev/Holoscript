import { describe, it, expect, beforeEach } from 'vitest';
import { MovementPredictor } from '../runtime/MovementPredictor';
import { Vector3 } from '../types/HoloScriptPlus';

describe('MovementPredictor', () => {
  let predictor: MovementPredictor;

  beforeEach(() => {
    predictor = new MovementPredictor();
  });

  it('should generate an ambient window around the current position', () => {
    predictor.update([10, 0, 10], 0.1);
    const windows = predictor.getPredictiveWindows(1);

    expect(windows.length).toBeGreaterThanOrEqual(1);
    expect(windows[0].center).toEqual([10, 0, 10]);
    expect(windows[0].radius).toBe(10);
    expect(windows[0].likelihood).toBe(1.0);
  });

  it('should predict a linear path (Tier 1)', () => {
    // Move from 0,0,0 to 1,0,0 in 0.1s (Velocity: 10,0,0)
    predictor.update([0, 0, 0], 0);
    predictor.update([1, 0, 0], 0.1);

    const windows = predictor.getPredictiveWindows(1.0); // Lookahead 1s

    // Window 1: Ambient (1,0,0)
    // Window 2: Linear (1 + 10*0.5, 0, 0) = (6, 0, 0)
    expect(windows.length).toBeGreaterThanOrEqual(2);
    expect(windows[1].center[0]).toBeCloseTo(6);
    expect(windows[1].likelihood).toBe(0.9);
  });

  it('should detect a curved path and apply recurrent biasing (Tier 2)', () => {
    // Simulate a circular turn in XZ plane
    for (let i = 0; i <= 20; i++) {
      const angle = (i / 20) * (Math.PI / 2); // 0 to 90 degrees
      const x = Math.sin(angle) * 10;
      const z = Math.cos(angle) * 10;
      predictor.update([x, 0, z], 0.1);
    }

    const lookahead = 1.0;
    const windows = predictor.getPredictiveWindows(lookahead);

    // Window 3 is the ensembled/recurrent/intent window
    expect(windows.length).toBe(3);
    const linearCenter = windows[1].center;
    const recurrentCenter = windows[2].center;

    // In a right turn, the recurrent prediction should be offset from the linear tangent
    // Our linear tangent should be roughly along the X axis at the end of the turn (90 deg)
    // but the curve turns it back towards negative Z.
    expect(recurrentCenter[2]).not.toBe(linearCenter[2]);
  });

  it('should bias prediction towards an intent target (Tier 3)', () => {
    // Moving along X axis
    predictor.update([0, 0, 0], 0);
    predictor.update([1, 0, 0], 0.1);

    const target: Vector3 = [5, 0, 10]; // Target is "off to the side"
    predictor.setIntent({ target, weight: 0.5 });

    const windows = predictor.getPredictiveWindows(1.0);
    const intentCenter = windows[2].center;

    // Without intent, linear prediction for 1s would be [11, 0, 0]
    // With 0.5 weight towards [5, 0, 10], it should be biased towards Z=10
    expect(intentCenter[2]).toBeGreaterThan(0);
    expect(intentCenter[0]).toBeLessThan(11);
  });
});
