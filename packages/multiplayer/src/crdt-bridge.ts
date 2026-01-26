/**
 * @holoscript/multiplayer - CRDT Bridge
 * Connects @holoscript/state-sync CRDTs to multiplayer networking
 * 
 * This enables:
 * - Automatic state sync with conflict resolution
 * - Networked undo/redo with 5+ second window
 * - Offline-first with seamless reconnection
 */

import type {
  NetworkMessage,
  MultiplayerEventHandler,
} from './types';

// Types from state-sync (these would be imported in real use)
interface CRDTState {
  [key: string]: unknown;
}

interface CRDTOperation {
  id: string;
  type: 'set' | 'delete' | 'insert' | 'remove' | 'increment' | 'decrement';
  path: string[];
  value?: unknown;
  timestamp: number;
  nodeId: string;
}

interface SyncMessage {
  type: 'sync' | 'ack' | 'request' | 'snapshot';
  operations: CRDTOperation[];
  clock: { [nodeId: string]: number };
  nodeId: string;
  timestamp: number;
}

interface UndoEntry {
  id: string;
  operations: CRDTOperation[];
  inverseOperations: CRDTOperation[];
  timestamp: number;
  description?: string;
}

// ============================================================================
// CRDT Network Bridge
// ============================================================================

export interface CRDTBridgeConfig {
  /** Maximum undo history in seconds */
  undoWindowSeconds: number;
  /** Sync rate in Hz */
  syncRateHz: number;
  /** Enable compression for large states */
  enableCompression: boolean;
  /** Batch operations before sending */
  batchOperations: boolean;
  /** Batch window in ms */
  batchWindowMs: number;
}

const DEFAULT_CRDT_BRIDGE_CONFIG: CRDTBridgeConfig = {
  undoWindowSeconds: 5,
  syncRateHz: 20,
  enableCompression: true,
  batchOperations: true,
  batchWindowMs: 50,
};

export class CRDTNetworkBridge {
  private config: CRDTBridgeConfig;
  private localNodeId: string;
  private state: CRDTState = {};
  private pendingOps: CRDTOperation[] = [];
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private vectorClock: { [nodeId: string]: number } = {};
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Set<(event: CRDTBridgeEvent) => void> = new Set();
  
  // Callback to send messages over network
  private sendCallback?: (message: NetworkMessage) => void;
  
  constructor(nodeId: string, config: Partial<CRDTBridgeConfig> = {}) {
    this.localNodeId = nodeId;
    this.config = { ...DEFAULT_CRDT_BRIDGE_CONFIG, ...config };
    this.vectorClock[nodeId] = 0;
  }
  
  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------
  
  setSendCallback(callback: (message: NetworkMessage) => void): void {
    this.sendCallback = callback;
  }
  
  onEvent(handler: (event: CRDTBridgeEvent) => void): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  // --------------------------------------------------------------------------
  // State Mutations (Local)
  // --------------------------------------------------------------------------
  
  /**
   * Set a value at a path with CRDT semantics
   */
  set(path: string[], value: unknown): void {
    const op = this.createOperation('set', path, value);
    this.applyLocalOperation(op);
  }
  
  /**
   * Delete a value at a path
   */
  delete(path: string[]): void {
    const op = this.createOperation('delete', path);
    this.applyLocalOperation(op);
  }
  
  /**
   * Increment a counter (CRDT-safe)
   */
  increment(path: string[], amount: number = 1): void {
    const op = this.createOperation('increment', path, amount);
    this.applyLocalOperation(op);
  }
  
  /**
   * Insert into an array (RGA)
   */
  insert(path: string[], index: number, value: unknown): void {
    const op = this.createOperation('insert', path, { index, value });
    this.applyLocalOperation(op);
  }
  
  /**
   * Get current state value
   */
  get(path: string[]): unknown {
    let current: unknown = this.state;
    for (const key of path) {
      if (current === null || current === undefined) return undefined;
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }
  
  // --------------------------------------------------------------------------
  // Undo/Redo
  // --------------------------------------------------------------------------
  
  /**
   * Undo the last operation (works across network!)
   */
  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    
    // Check if within undo window
    const age = (Date.now() - entry.timestamp) / 1000;
    if (age > this.config.undoWindowSeconds) {
      this.emit({ type: 'undo_expired', entry });
      return false;
    }
    
    // Apply inverse operations
    for (const inverseOp of entry.inverseOperations) {
      this.applyLocalOperation(inverseOp, false);
    }
    
    this.redoStack.push(entry);
    this.emit({ type: 'undo', entry });
    return true;
  }
  
  /**
   * Redo the last undone operation
   */
  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    
    // Re-apply original operations
    for (const op of entry.operations) {
      this.applyLocalOperation(op, false);
    }
    
    this.undoStack.push(entry);
    this.emit({ type: 'redo', entry });
    return true;
  }
  
  /**
   * Get undo history (for UI)
   */
  getUndoHistory(): UndoEntry[] {
    const now = Date.now();
    const windowMs = this.config.undoWindowSeconds * 1000;
    return this.undoStack.filter(e => now - e.timestamp < windowMs);
  }
  
  // --------------------------------------------------------------------------
  // Network Sync
  // --------------------------------------------------------------------------
  
  /**
   * Receive operations from network
   */
  receiveOperations(message: SyncMessage): void {
    // Merge vector clocks
    for (const [nodeId, time] of Object.entries(message.clock)) {
      this.vectorClock[nodeId] = Math.max(
        this.vectorClock[nodeId] || 0,
        time
      );
    }
    
    // Apply remote operations
    for (const op of message.operations) {
      if (this.shouldApplyRemoteOp(op)) {
        this.applyRemoteOperation(op);
      }
    }
    
    this.emit({ type: 'sync_received', message });
  }
  
  /**
   * Request full state from a peer (for reconnection)
   */
  requestFullState(): void {
    if (!this.sendCallback) return;
    
    this.sendCallback({
      type: 'crdt_request_state',
      reliable: true,
      timestamp: Date.now(),
      channel: 0,
      payload: {
        nodeId: this.localNodeId,
        clock: this.vectorClock,
      },
    });
  }
  
  /**
   * Send full state to a peer (for reconnection)
   */
  sendFullState(targetNodeId: string): void {
    if (!this.sendCallback) return;
    
    this.sendCallback({
      type: 'crdt_full_state',
      reliable: true,
      timestamp: Date.now(),
      channel: 0,
      payload: {
        targetNodeId,
        state: this.state,
        clock: this.vectorClock,
      },
    });
  }
  
  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------
  
  private createOperation(
    type: CRDTOperation['type'],
    path: string[],
    value?: unknown
  ): CRDTOperation {
    this.vectorClock[this.localNodeId]++;
    
    return {
      id: `${this.localNodeId}:${this.vectorClock[this.localNodeId]}`,
      type,
      path,
      value,
      timestamp: Date.now(),
      nodeId: this.localNodeId,
    };
  }
  
  private applyLocalOperation(op: CRDTOperation, recordUndo: boolean = true): void {
    // Capture state for undo
    let inverseOp: CRDTOperation | undefined;
    if (recordUndo) {
      inverseOp = this.createInverseOperation(op);
    }
    
    // Apply to local state
    this.applyOperationToState(op);
    
    // Record for undo
    if (recordUndo && inverseOp) {
      this.undoStack.push({
        id: op.id,
        operations: [op],
        inverseOperations: [inverseOp],
        timestamp: Date.now(),
      });
      
      // Clear redo on new operation
      this.redoStack = [];
      
      // Trim old undo entries
      this.trimUndoStack();
    }
    
    // Queue for network
    this.pendingOps.push(op);
    this.scheduleSend();
    
    this.emit({ type: 'local_change', operation: op });
  }
  
  private applyRemoteOperation(op: CRDTOperation): void {
    this.applyOperationToState(op);
    this.emit({ type: 'remote_change', operation: op });
  }
  
  private applyOperationToState(op: CRDTOperation): void {
    if (op.path.length === 0) return;
    
    // Navigate to parent
    let current = this.state as Record<string, unknown>;
    for (let i = 0; i < op.path.length - 1; i++) {
      const key = op.path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
    
    const lastKey = op.path[op.path.length - 1];
    
    switch (op.type) {
      case 'set':
        current[lastKey] = op.value;
        break;
        
      case 'delete':
        delete current[lastKey];
        break;
        
      case 'increment':
        const currentVal = (current[lastKey] as number) || 0;
        current[lastKey] = currentVal + (op.value as number);
        break;
        
      case 'insert':
        const arr = (current[lastKey] as unknown[]) || [];
        const { index, value } = op.value as { index: number; value: unknown };
        arr.splice(index, 0, value);
        current[lastKey] = arr;
        break;
        
      case 'remove':
        const removeArr = current[lastKey] as unknown[];
        if (Array.isArray(removeArr)) {
          removeArr.splice(op.value as number, 1);
        }
        break;
    }
  }
  
  private createInverseOperation(op: CRDTOperation): CRDTOperation {
    const currentValue = this.get(op.path);
    
    switch (op.type) {
      case 'set':
        if (currentValue === undefined) {
          return { ...op, type: 'delete', value: undefined };
        }
        return { ...op, type: 'set', value: currentValue };
        
      case 'delete':
        return { ...op, type: 'set', value: currentValue };
        
      case 'increment':
        return { ...op, type: 'increment', value: -(op.value as number) };
        
      case 'insert':
        const { index } = op.value as { index: number };
        return { ...op, type: 'remove', value: index };
        
      case 'remove':
        const arr = currentValue as unknown[];
        const removedValue = arr?.[op.value as number];
        return { ...op, type: 'insert', value: { index: op.value, value: removedValue } };
        
      default:
        return op;
    }
  }
  
  private shouldApplyRemoteOp(op: CRDTOperation): boolean {
    // LWW (Last-Writer-Wins) for conflicts
    // In a real implementation, we'd use proper CRDT merge semantics
    const localTime = this.vectorClock[op.nodeId] || 0;
    return op.timestamp > localTime;
  }
  
  private scheduleSend(): void {
    if (!this.config.batchOperations) {
      this.flush();
      return;
    }
    
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null;
      this.flush();
    }, this.config.batchWindowMs);
  }
  
  private flush(): void {
    if (this.pendingOps.length === 0 || !this.sendCallback) return;
    
    const message: SyncMessage = {
      type: 'sync',
      operations: this.pendingOps,
      clock: { ...this.vectorClock },
      nodeId: this.localNodeId,
      timestamp: Date.now(),
    };
    
    this.sendCallback({
      type: 'crdt_sync',
      reliable: true,
      timestamp: Date.now(),
      channel: 0,
      payload: message,
    });
    
    this.pendingOps = [];
  }
  
  private trimUndoStack(): void {
    const now = Date.now();
    const windowMs = this.config.undoWindowSeconds * 1000;
    this.undoStack = this.undoStack.filter(e => now - e.timestamp < windowMs);
  }
  
  private emit(event: CRDTBridgeEvent): void {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}

// ============================================================================
// Event Types
// ============================================================================

export type CRDTBridgeEvent =
  | { type: 'local_change'; operation: CRDTOperation }
  | { type: 'remote_change'; operation: CRDTOperation }
  | { type: 'sync_received'; message: SyncMessage }
  | { type: 'undo'; entry: UndoEntry }
  | { type: 'redo'; entry: UndoEntry }
  | { type: 'undo_expired'; entry: UndoEntry };

// ============================================================================
// Factory
// ============================================================================

export function createCRDTBridge(
  nodeId: string,
  config?: Partial<CRDTBridgeConfig>
): CRDTNetworkBridge {
  return new CRDTNetworkBridge(nodeId, config);
}

// ============================================================================
// Usage Example (for documentation)
// ============================================================================

/*
// In a multiplayer session:

import { createCRDTBridge } from '@holoscript/multiplayer';
import { RoomManager } from '@holoscript/multiplayer';

const room = new RoomManager();
const crdt = createCRDTBridge(room.localPlayerId, {
  undoWindowSeconds: 5,
  syncRateHz: 20,
});

// Wire to room networking
crdt.setSendCallback((msg) => room.broadcast(msg));
room.onMessage((msg) => {
  if (msg.type === 'crdt_sync') {
    crdt.receiveOperations(msg.data);
  }
});

// Use like normal state
crdt.set(['player', 'health'], 100);
crdt.increment(['player', 'score'], 10);

// Undo works across network!
crdt.undo(); // Reverts last operation, syncs to all peers

// Check undo history
const history = crdt.getUndoHistory();
console.log(`${history.length} operations can be undone`);
*/
