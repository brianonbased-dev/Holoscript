/**
 * Undo Manager for HoloScript+
 *
 * Tracks local operation history and provides undo/redo capabilities
 * with causal consistency in collaborative sessions.
 */

import { CRDTOperation } from './CRDTStateManager';

export interface UndoStep {
  redo: CRDTOperation;
  undo: CRDTOperation;
}

export class UndoManager {
  private undoStack: UndoStep[] = [];
  private redoStack: UndoStep[] = [];
  private maxStack: number = 100;

  /**
   * Record a new step in the history
   */
  public push(undoOp: CRDTOperation, redoOp: CRDTOperation): void {
    this.undoStack.push({ undo: undoOp, redo: redoOp });
    this.redoStack = []; // Clear redo stack on new operation

    if (this.undoStack.length > this.maxStack) {
      this.undoStack.shift();
    }
  }

  /**
   * Pop most recent step for undoing
   */
  public undo(): UndoStep | null {
    const step = this.undoStack.pop();
    if (step) {
      this.redoStack.push(step);
      return step;
    }
    return null;
  }

  /**
   * Pop most recent step for redoing
   */
  public redo(): UndoStep | null {
    const step = this.redoStack.pop();
    if (step) {
      this.undoStack.push(step);
      return step;
    }
    return null;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
