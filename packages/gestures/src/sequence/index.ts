/**
 * @holoscript/gestures - Gesture Sequence Detector
 * Multi-gesture sequence and pattern recognition
 */

import type {
  Vec3,
  GestureResult,
  GestureSequence,
  GestureSequenceStep,
  SequenceProgress,
  GestureEvent,
  GestureEventHandler,
} from '../types';
import { GestureType, GESTURE_SEQUENCE_PRESETS } from '../types';

// ============================================================================
// Sequence State
// ============================================================================

interface SequenceState {
  sequence: GestureSequence;
  currentStep: number;
  startTime: number;
  lastStepTime: number;
  activeHand?: 'left' | 'right';
  isComplete: boolean;
  wasCancelled: boolean;
  stepStartPosition?: Vec3;
}

// ============================================================================
// Gesture Sequence Detector
// ============================================================================

export class GestureSequenceDetector {
  private sequences: Map<string, GestureSequence> = new Map();
  private activeSequences: Map<string, SequenceState> = new Map();
  private eventHandlers: Set<GestureEventHandler> = new Set();

  constructor() {
    // Load presets
    for (const preset of Object.values(GESTURE_SEQUENCE_PRESETS)) {
      this.sequences.set(preset.id, preset);
    }
  }

  /** Register a custom sequence */
  registerSequence(sequence: GestureSequence): void {
    this.sequences.set(sequence.id, sequence);
  }

  /** Unregister a sequence */
  unregisterSequence(id: string): boolean {
    this.activeSequences.delete(id);
    return this.sequences.delete(id);
  }

  /** Get a sequence by ID */
  getSequence(id: string): GestureSequence | undefined {
    return this.sequences.get(id);
  }

  /** Get all registered sequences */
  getAllSequences(): GestureSequence[] {
    return Array.from(this.sequences.values());
  }

  /** Update with detected gestures */
  update(gestures: GestureResult[]): SequenceProgress[] {
    const now = performance.now();
    const completedSequences: SequenceProgress[] = [];
    
    // Check for timeout on active sequences
    for (const [id, state] of this.activeSequences) {
      const elapsed = now - state.startTime;
      
      if (elapsed > state.sequence.timeout) {
        // Sequence timed out
        this.emit({
          type: 'sequence_failed',
          sequenceId: id,
          reason: 'timeout',
          timestamp: now,
        });
        this.activeSequences.delete(id);
      }
      
      // Check step timeout
      const step = state.sequence.steps[state.currentStep];
      if (step.maxTimeToNext && now - state.lastStepTime > step.maxTimeToNext) {
        this.emit({
          type: 'sequence_failed',
          sequenceId: id,
          reason: 'step_timeout',
          timestamp: now,
        });
        this.activeSequences.delete(id);
      }
    }
    
    // Process each detected gesture
    for (const gesture of gestures) {
      // Check if this gesture advances any active sequence
      for (const [id, state] of this.activeSequences) {
        if (state.isComplete) continue;
        
        const step = state.sequence.steps[state.currentStep];
        
        if (this.matchesStep(gesture, step, state)) {
          // Advance sequence
          state.currentStep++;
          state.lastStepTime = now;
          
          // Track hand for 'same' steps
          if (step.hand === 'either') {
            state.activeHand = gesture.hand;
          }
          
          this.emit({
            type: 'sequence_progress',
            sequenceId: id,
            step: state.currentStep,
            totalSteps: state.sequence.steps.length,
            timestamp: now,
          });
          
          // Check if sequence is complete
          if (state.currentStep >= state.sequence.steps.length) {
            state.isComplete = true;
            const duration = now - state.startTime;
            
            this.emit({
              type: 'sequence_complete',
              sequenceId: id,
              duration,
              timestamp: now,
            });
            
            completedSequences.push({
              sequenceId: id,
              currentStep: state.currentStep,
              totalSteps: state.sequence.steps.length,
              elapsed: duration,
              activeHand: state.activeHand,
              isComplete: true,
              wasCancelled: false,
            });
            
            this.activeSequences.delete(id);
          }
        } else if (state.sequence.strictOrder) {
          // Wrong gesture in strict mode - cancel sequence
          this.emit({
            type: 'sequence_failed',
            sequenceId: id,
            reason: 'wrong_gesture',
            timestamp: now,
          });
          this.activeSequences.delete(id);
        }
      }
      
      // Check if this gesture starts any new sequence
      for (const [id, sequence] of this.sequences) {
        if (this.activeSequences.has(id)) continue;
        
        const firstStep = sequence.steps[0];
        
        // Create a temporary state for matching
        const tempState: SequenceState = {
          sequence,
          currentStep: 0,
          startTime: now,
          lastStepTime: now,
          isComplete: false,
          wasCancelled: false,
        };
        
        if (this.matchesStep(gesture, firstStep, tempState)) {
          // Start tracking this sequence
          tempState.currentStep = 1;
          
          if (firstStep.hand === 'either') {
            tempState.activeHand = gesture.hand;
          }
          
          tempState.stepStartPosition = gesture.startPosition ?? gesture.endPosition;
          
          this.activeSequences.set(id, tempState);
          
          this.emit({
            type: 'sequence_start',
            sequenceId: id,
            timestamp: now,
          });
          
          // Check if single-step sequence
          if (tempState.currentStep >= sequence.steps.length) {
            tempState.isComplete = true;
            
            this.emit({
              type: 'sequence_complete',
              sequenceId: id,
              duration: 0,
              timestamp: now,
            });
            
            completedSequences.push({
              sequenceId: id,
              currentStep: 1,
              totalSteps: 1,
              elapsed: 0,
              activeHand: tempState.activeHand,
              isComplete: true,
              wasCancelled: false,
            });
            
            this.activeSequences.delete(id);
          }
        }
      }
    }
    
    return completedSequences;
  }

  /** Check if a gesture matches a sequence step */
  private matchesStep(gesture: GestureResult, step: GestureSequenceStep, state: SequenceState): boolean {
    // Check gesture type
    if (gesture.gesture !== step.gesture) {
      return false;
    }
    
    // Check hand
    if (step.hand === 'left' && gesture.hand !== 'left') return false;
    if (step.hand === 'right' && gesture.hand !== 'right') return false;
    if (step.hand === 'same' && state.activeHand && gesture.hand !== state.activeHand) return false;
    
    // Check hold time
    if (step.holdTime && gesture.duration < step.holdTime) {
      return false;
    }
    
    // Check direction for swipes (if specified)
    if (step.direction && gesture.velocity) {
      const dot = (
        step.direction.x * gesture.velocity.x +
        step.direction.y * gesture.velocity.y +
        step.direction.z * gesture.velocity.z
      );
      if (dot < 0.7) return false; // Must be mostly in the right direction
    }
    
    return true;
  }

  /** Get progress for all active sequences */
  getActiveSequences(): SequenceProgress[] {
    const now = performance.now();
    return Array.from(this.activeSequences.entries()).map(([id, state]) => ({
      sequenceId: id,
      currentStep: state.currentStep,
      totalSteps: state.sequence.steps.length,
      elapsed: now - state.startTime,
      activeHand: state.activeHand,
      isComplete: state.isComplete,
      wasCancelled: state.wasCancelled,
    }));
  }

  /** Cancel a specific sequence */
  cancelSequence(id: string): boolean {
    const state = this.activeSequences.get(id);
    if (state) {
      state.wasCancelled = true;
      this.emit({
        type: 'sequence_failed',
        sequenceId: id,
        reason: 'cancelled',
        timestamp: performance.now(),
      });
      this.activeSequences.delete(id);
      return true;
    }
    return false;
  }

  /** Cancel all active sequences */
  cancelAll(): void {
    const now = performance.now();
    for (const id of this.activeSequences.keys()) {
      this.emit({
        type: 'sequence_failed',
        sequenceId: id,
        reason: 'cancelled',
        timestamp: now,
      });
    }
    this.activeSequences.clear();
  }

  /** Add event handler */
  addEventListener(handler: GestureEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /** Remove event handler */
  removeEventListener(handler: GestureEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /** Emit event */
  private emit(event: GestureEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Sequence event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Sequence Builder
// ============================================================================

export class GestureSequenceBuilder {
  private id: string;
  private name: string;
  private steps: GestureSequenceStep[] = [];
  private timeout: number = 3000;
  private strictOrder: boolean = true;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /** Add a gesture step */
  addStep(
    gesture: GestureType,
    hand: 'left' | 'right' | 'either' | 'same' = 'either',
    options: Partial<Omit<GestureSequenceStep, 'gesture' | 'hand'>> = {}
  ): this {
    this.steps.push({
      gesture,
      hand,
      ...options,
    });
    return this;
  }

  /** Set total sequence timeout */
  setTimeout(ms: number): this {
    this.timeout = ms;
    return this;
  }

  /** Set strict order mode */
  setStrictOrder(strict: boolean): this {
    this.strictOrder = strict;
    return this;
  }

  /** Build the sequence */
  build(): GestureSequence {
    return {
      id: this.id,
      name: this.name,
      steps: [...this.steps],
      timeout: this.timeout,
      strictOrder: this.strictOrder,
    };
  }

  /** Create a new builder */
  static create(id: string, name: string): GestureSequenceBuilder {
    return new GestureSequenceBuilder(id, name);
  }
}

// Factory function
export function createGestureSequenceDetector(): GestureSequenceDetector {
  return new GestureSequenceDetector();
}

// Re-exports
export { GESTURE_SEQUENCE_PRESETS } from '../types';
export type { GestureSequence, GestureSequenceStep, SequenceProgress };
