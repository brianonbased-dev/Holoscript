/**
 * CRDT State Manager for HoloScript+
 *
 * Implements a Last-Write-Wins (LWW) Register approach for collaborative state.
 * This is suitable for scalar state values in spatial computing scenarios.
 */

export interface CRDTOperation {
  clientId: string;
  timestamp: number;
  key: string;
  value: any;
  seq: number; // Logical sequence for same-millisecond local ops
}

export class CRDTStateManager {
  private clientId: string;
  private registers: Map<string, CRDTOperation> = new Map();
  private localSeq: number = 0;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  /**
   * Create an operation for a local update
   */
  public createOperation(key: string, value: any): CRDTOperation {
    return {
      clientId: this.clientId,
      timestamp: Date.now(),
      key,
      value,
      seq: ++this.localSeq,
    };
  }

  /**
   * Reconcile an incoming operation with the local state.
   * Returns true if the operation resulted in a state change.
   */
  public reconcile(op: CRDTOperation): boolean {
    const current = this.registers.get(op.key);

    if (!current || this.isGreater(op, current)) {
      this.registers.set(op.key, op);
      return true;
    }

    return false;
  }

  /**
   * LWW Conflict Resolution Logic:
   * 1. Higher timestamp wins.
   * 2. If timestamps equal, higher clientId wins (lexicographical).
   * 3. If clientIds equal (local ops), higher sequence wins.
   */
  private isGreater(op1: CRDTOperation, op2: CRDTOperation): boolean {
    if (op1.timestamp !== op2.timestamp) {
      return op1.timestamp > op2.timestamp;
    }
    if (op1.clientId !== op2.clientId) {
      return op1.clientId > op2.clientId;
    }
    return op1.seq > op2.seq;
  }

  /**
   * Get the current value for a key from the LWW register
   */
  public getValue(key: string): any {
    return this.registers.get(key)?.value;
  }

  /**
   * Get a snapshot of all current values
   */
  public getSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    this.registers.forEach((op, key) => {
      snapshot[key] = op.value;
    });
    return snapshot;
  }
}
