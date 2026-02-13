/**
 * @holoscript/core Movement Predictor
 *
 * Predicts the player's path based on current velocity and orientation.
 * Used by the AssetStreamer to prioritize background loading.
 */

import { Vector3 } from '../types/HoloScriptPlus';

export interface IntentSignal {
  target: Vector3;
  weight: number; // 0-1 (confidence in intent)
}

export interface PredictiveWindow {
  center: [number, number, number];
  radius: number;
  likelihood: number;
}

export class MovementPredictor {
  private lastPosition: Vector3 = [0, 0, 0];
  private velocity: Vector3 = [0, 0, 0];
  private history: Vector3[] = [];
  private maxHistory: number = 60; // 1 second at 60fps
  private intent: IntentSignal | null = null;

  /**
   * Convert Vector3 to tuple for consistent handling
   */
  private toTuple(v: Vector3): [number, number, number] {
    return Array.isArray(v) ? v : [v.x, v.y, v.z];
  }

  /**
   * Update internal state with current player transform
   */
  public update(position: Vector3, dt: number): void {
    const currentPos = this.toTuple(position);

    if (dt > 0) {
      const lastPos = this.toTuple(this.lastPosition);
      this.velocity = [
        (currentPos[0] - lastPos[0]) / dt,
        (currentPos[1] - lastPos[1]) / dt,
        (currentPos[2] - lastPos[2]) / dt,
      ];
    }

    this.lastPosition = currentPos;

    // Tier 2: Update history buffer
    this.history.push([...currentPos]);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Set the player's current intent signal (Tier 3)
   */
  public setIntent(intent: IntentSignal | null): void {
    this.intent = intent;
  }

  /**
   * Tier 1: Linear Extrapolation
   */
  private predictLinear(lookahead: number): [number, number, number] {
    const lastPosTuple = this.toTuple(this.lastPosition);
    const velTuple = this.toTuple(this.velocity);
    return [
      lastPosTuple[0] + velTuple[0] * lookahead,
      lastPosTuple[1] + velTuple[1] * lookahead,
      lastPosTuple[2] + velTuple[2] * lookahead,
    ];
  }

  /**
   * Tier 2: Recurrent Placeholder (Non-linear pathing)
   * In a full implementation, this would use an LSTM/RNN.
   * Here we simulate it by analyzing the curvature of the history.
   */
  private predictRecurrent(lookahead: number): [number, number, number] {
    if (this.history.length < 10) return this.predictLinear(lookahead);

    // Calculate average acceleration (curvature)
    const midIdx = Math.floor(this.history.length / 2);
    const startPosTuple = this.toTuple(this.history[0]);
    const midPosTuple = this.toTuple(this.history[midIdx]);
    const endPosTuple = this.toTuple(this.history[this.history.length - 1]);

    // Simple spline-like estimation
    const linearPred = this.predictLinear(lookahead);

    // If the path is curving, bias the prediction towards the curve
    const chord1: [number, number, number] = [
      midPosTuple[0] - startPosTuple[0],
      midPosTuple[1] - startPosTuple[1],
      midPosTuple[2] - startPosTuple[2],
    ];
    const chord2: [number, number, number] = [
      endPosTuple[0] - midPosTuple[0],
      endPosTuple[1] - midPosTuple[1],
      endPosTuple[2] - midPosTuple[2],
    ];

    const turnFactor = 0.5; // Simulated RNN weight
    const curveOffset: [number, number, number] = [
      (chord2[0] - chord1[0]) * lookahead * turnFactor,
      (chord2[1] - chord1[1]) * lookahead * turnFactor,
      (chord2[2] - chord1[2]) * lookahead * turnFactor,
    ];

    return [
      linearPred[0] + curveOffset[0],
      linearPred[1] + curveOffset[1],
      linearPred[2] + curveOffset[2],
    ];
  }

  /**
   * Tier 3: Intent-based biasing
   */
  private predictIntent(lookahead: number): [number, number, number] {
    const recurrent = this.predictRecurrent(lookahead);
    if (!this.intent) return recurrent;

    const targetPos = this.intent.target;
    const weight = this.intent.weight;

    // Interpolate between recurrent path and intent target
    const targetPosTuple = this.toTuple(targetPos);
    return [
      recurrent[0] * (1 - weight) + targetPosTuple[0] * weight,
      recurrent[1] * (1 - weight) + targetPosTuple[1] * weight,
      recurrent[2] * (1 - weight) + targetPosTuple[2] * weight,
    ];
  }

  /**
   * Get predictive windows for asset pre-fetching.
   * Combines all tiers into a prioritized set of windows.
   */
  public getPredictiveWindows(lookaheadSeconds: number): PredictiveWindow[] {
    const windows: PredictiveWindow[] = [];

    // 1. Ambient window (Tier 0: Immediate surroundings)
    windows.push({
      center: this.toTuple(this.lastPosition),
      radius: 10,
      likelihood: 1.0,
    });

    const speed = Math.sqrt(
      (this.velocity as any)[0] ** 2 +
        (this.velocity as any)[1] ** 2 +
        (this.velocity as any)[2] ** 2
    );

    if (speed > 0.5) {
      // 2. Linear prediction (High confidence, short term)
      windows.push({
        center: this.predictLinear(lookaheadSeconds),
        radius: speed * lookaheadSeconds * 0.3 + 5,
        likelihood: 0.9,
      });

      // 3. Ensembled/Intent prediction (Tier 3)
      const ensembleCenter = this.predictIntent(lookaheadSeconds);
      windows.push({
        center: ensembleCenter,
        radius: speed * lookaheadSeconds * 0.6 + 8,
        likelihood: 0.7,
      });
    }

    return windows;
  }
}
