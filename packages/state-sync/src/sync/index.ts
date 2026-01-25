/**
 * @holoscript/state-sync - Sync Module
 * State synchronization strategies and utilities
 */

import {
  CRDTState,
  CRDTOperation,
  SyncStrategy,
  SyncConfig,
  SyncMessage,
  SyncAck,
  ConflictResolution,
  MerkleNode,
  MerkleTree,
  UndoEntry,
  UndoManager,
  StateSyncEvent,
  StateSyncEventHandler,
  VectorClock,
  DEFAULT_SYNC_CONFIG,
} from '../types';

import { createVectorClock, incrementClock, mergeClock, compareClock } from '../crdt';

// ============================================================================
// Delta Sync Manager
// ============================================================================

export class DeltaSyncManager {
  private pendingOperations: CRDTOperation[] = [];
  private sentOperations: Map<string, CRDTOperation> = new Map();
  private receivedOperations: Set<string> = new Set();
  private clock: VectorClock;
  private nodeId: string;
  private config: SyncConfig;
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private eventHandlers: Set<StateSyncEventHandler> = new Set();
  
  private sendCallback?: (message: SyncMessage) => void;
  
  constructor(nodeId: string, config: Partial<SyncConfig> = {}) {
    this.nodeId = nodeId;
    this.clock = createVectorClock();
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
  }
  
  setSendCallback(callback: (message: SyncMessage) => void): void {
    this.sendCallback = callback;
  }
  
  queueOperation(operation: CRDTOperation): void {
    this.clock = incrementClock(this.clock, this.nodeId);
    
    const op: CRDTOperation = {
      ...operation,
      id: operation.id || `${this.nodeId}:${Date.now()}:${Math.random()}`,
      timestamp: Date.now(),
      nodeId: this.nodeId,
    };
    
    this.pendingOperations.push(op);
    this.emit({ type: 'operation_queued', operation: op });
    
    if (this.config.enableBatching) {
      this.scheduleBatch();
    } else {
      this.flush();
    }
  }
  
  flush(): void {
    if (this.pendingOperations.length === 0) return;
    if (!this.sendCallback) return;
    
    const message: SyncMessage = {
      type: 'sync',
      operations: [...this.pendingOperations],
      clock: this.clock,
      nodeId: this.nodeId,
      timestamp: Date.now(),
    };
    
    // Track sent operations for acknowledgment
    for (const op of this.pendingOperations) {
      this.sentOperations.set(op.id, op);
    }
    
    this.pendingOperations = [];
    this.sendCallback(message);
    
    this.emit({ type: 'sync_sent', message });
  }
  
  receiveMessage(message: SyncMessage): CRDTOperation[] {
    const newOperations: CRDTOperation[] = [];
    
    for (const operation of message.operations) {
      if (!this.receivedOperations.has(operation.id)) {
        this.receivedOperations.add(operation.id);
        newOperations.push(operation);
      }
    }
    
    // Merge clocks
    this.clock = mergeClock(this.clock, message.clock);
    
    // Send acknowledgment
    if (this.sendCallback && newOperations.length > 0) {
      const ack: SyncAck = {
        type: 'ack',
        operationIds: newOperations.map((op) => op.id),
        clock: this.clock,
        nodeId: this.nodeId,
      };
      this.sendCallback({ ...ack, operations: [], timestamp: Date.now() });
    }
    
    this.emit({ type: 'sync_received', operations: newOperations });
    
    return newOperations;
  }
  
  receiveAck(ack: SyncAck): void {
    for (const opId of ack.operationIds) {
      this.sentOperations.delete(opId);
    }
    
    this.clock = mergeClock(this.clock, ack.clock);
  }
  
  getPendingCount(): number {
    return this.pendingOperations.length + this.sentOperations.size;
  }
  
  getClock(): VectorClock {
    return { ...this.clock };
  }
  
  on(handler: StateSyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private scheduleBatch(): void {
    if (this.batchTimeout) return;
    
    this.batchTimeout = setTimeout(() => {
      this.batchTimeout = null;
      this.flush();
    }, this.config.batchInterval);
  }
  
  private emit(event: StateSyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Merkle Tree Sync
// ============================================================================

function hashString(str: string): string {
  // Simple hash for demo - use proper crypto hash in production
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export class MerkleTreeSync {
  private tree: MerkleTree;
  private dataStore: Map<string, CRDTState> = new Map();
  private nodeId: string;
  
  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.tree = {
      root: null,
      height: 0,
      leafCount: 0,
    };
  }
  
  updateData(key: string, state: CRDTState): void {
    this.dataStore.set(key, state);
    this.rebuildTree();
  }
  
  removeData(key: string): void {
    this.dataStore.delete(key);
    this.rebuildTree();
  }
  
  getRootHash(): string | null {
    return this.tree.root?.hash ?? null;
  }
  
  getProof(key: string): string[] {
    // Return hashes needed to verify key's inclusion
    const proof: string[] = [];
    // Implementation would traverse tree and collect sibling hashes
    return proof;
  }
  
  findDifferences(otherRootHash: string, queryCallback: (ranges: string[]) => Map<string, string>): string[] {
    const differences: string[] = [];
    
    if (this.tree.root?.hash === otherRootHash) {
      return differences;
    }
    
    // Would recursively query and compare subtrees
    // Return keys that differ
    
    return Array.from(this.dataStore.keys());
  }
  
  getState(key: string): CRDTState | undefined {
    return this.dataStore.get(key);
  }
  
  getAllKeys(): string[] {
    return Array.from(this.dataStore.keys());
  }
  
  getTree(): MerkleTree {
    return this.tree;
  }
  
  private rebuildTree(): void {
    const keys = Array.from(this.dataStore.keys()).sort();
    
    if (keys.length === 0) {
      this.tree = { root: null, height: 0, leafCount: 0 };
      return;
    }
    
    // Build leaf nodes
    const leaves: MerkleNode[] = keys.map((key) => {
      const state = this.dataStore.get(key)!;
      const hash = hashString(key + JSON.stringify(state));
      return { hash, children: [] };
    });
    
    // Build tree bottom-up
    let currentLevel = leaves;
    let height = 0;
    
    while (currentLevel.length > 1) {
      const nextLevel: MerkleNode[] = [];
      
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || left;
        
        const combinedHash = hashString(left.hash + right.hash);
        nextLevel.push({
          hash: combinedHash,
          children: [left, right],
        });
      }
      
      currentLevel = nextLevel;
      height++;
    }
    
    this.tree = {
      root: currentLevel[0],
      height,
      leafCount: keys.length,
    };
  }
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export class ConflictResolver {
  private resolution: ConflictResolution;
  
  constructor(resolution: ConflictResolution = ConflictResolution.LastWriteWins) {
    this.resolution = resolution;
  }
  
  resolve<T>(
    local: { value: T; timestamp: number; nodeId: string },
    remote: { value: T; timestamp: number; nodeId: string }
  ): T {
    switch (this.resolution) {
      case ConflictResolution.LastWriteWins:
        if (remote.timestamp > local.timestamp) return remote.value;
        if (remote.timestamp < local.timestamp) return local.value;
        // Tie-break by nodeId
        return remote.nodeId > local.nodeId ? remote.value : local.value;
        
      case ConflictResolution.FirstWriteWins:
        if (remote.timestamp < local.timestamp) return remote.value;
        if (remote.timestamp > local.timestamp) return local.value;
        return remote.nodeId < local.nodeId ? remote.value : local.value;
        
      case ConflictResolution.Merge:
        // For objects, merge properties; for primitives, use LWW
        if (
          typeof local.value === 'object' &&
          local.value !== null &&
          typeof remote.value === 'object' &&
          remote.value !== null
        ) {
          return { ...local.value, ...remote.value } as T;
        }
        return remote.timestamp >= local.timestamp ? remote.value : local.value;
        
      case ConflictResolution.Custom:
        // Default to LWW if no custom handler provided
        return remote.timestamp >= local.timestamp ? remote.value : local.value;
        
      default:
        return remote.value;
    }
  }
}

// ============================================================================
// Undo Manager
// ============================================================================

export class StateUndoManager {
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private maxHistory: number;
  private eventHandlers: Set<StateSyncEventHandler> = new Set();
  
  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }
  
  record(entry: Omit<UndoEntry, 'id' | 'timestamp'>): void {
    const fullEntry: UndoEntry = {
      ...entry,
      id: `undo_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };
    
    this.undoStack.push(fullEntry);
    this.redoStack = []; // Clear redo stack on new action
    
    // Limit history size
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }
  
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  undo(): UndoEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    
    this.redoStack.push(entry);
    this.emit({ type: 'state_reverted', entry });
    
    return entry;
  }
  
  redo(): UndoEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    
    this.undoStack.push(entry);
    this.emit({ type: 'state_restored', entry });
    
    return entry;
  }
  
  getUndoStack(): UndoEntry[] {
    return [...this.undoStack];
  }
  
  getRedoStack(): UndoEntry[] {
    return [...this.redoStack];
  }
  
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  on(handler: StateSyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private emit(event: StateSyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// State Snapshot Manager
// ============================================================================

export class SnapshotManager {
  private snapshots: Map<string, {
    state: Map<string, CRDTState>;
    clock: VectorClock;
    timestamp: number;
  }> = new Map();
  
  private maxSnapshots: number;
  
  constructor(maxSnapshots: number = 10) {
    this.maxSnapshots = maxSnapshots;
  }
  
  createSnapshot(
    id: string,
    state: Map<string, CRDTState>,
    clock: VectorClock
  ): void {
    this.snapshots.set(id, {
      state: new Map(state),
      clock: { ...clock },
      timestamp: Date.now(),
    });
    
    // Trim old snapshots
    if (this.snapshots.size > this.maxSnapshots) {
      const oldestKey = this.snapshots.keys().next().value;
      if (oldestKey) {
        this.snapshots.delete(oldestKey);
      }
    }
  }
  
  getSnapshot(id: string): Map<string, CRDTState> | null {
    const snapshot = this.snapshots.get(id);
    return snapshot ? new Map(snapshot.state) : null;
  }
  
  listSnapshots(): Array<{ id: string; timestamp: number }> {
    return Array.from(this.snapshots.entries()).map(([id, data]) => ({
      id,
      timestamp: data.timestamp,
    }));
  }
  
  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }
}

// ============================================================================
// Sync Coordinator
// ============================================================================

export class SyncCoordinator {
  private deltaSyncManager: DeltaSyncManager;
  private merkleTreeSync: MerkleTreeSync;
  private conflictResolver: ConflictResolver;
  private undoManager: StateUndoManager;
  private snapshotManager: SnapshotManager;
  
  private state: Map<string, CRDTState> = new Map();
  private strategy: SyncStrategy;
  private nodeId: string;
  private eventHandlers: Set<StateSyncEventHandler> = new Set();
  
  constructor(
    nodeId: string,
    strategy: SyncStrategy = SyncStrategy.Optimistic,
    config: Partial<SyncConfig> = {}
  ) {
    this.nodeId = nodeId;
    this.strategy = strategy;
    
    this.deltaSyncManager = new DeltaSyncManager(nodeId, config);
    this.merkleTreeSync = new MerkleTreeSync(nodeId);
    this.conflictResolver = new ConflictResolver();
    this.undoManager = new StateUndoManager();
    this.snapshotManager = new SnapshotManager();
    
    this.setupEventForwarding();
  }
  
  setSendCallback(callback: (message: SyncMessage) => void): void {
    this.deltaSyncManager.setSendCallback(callback);
  }
  
  applyOperation(operation: CRDTOperation): void {
    // Record for undo
    const key = operation.path.join('.');
    const previousState = this.state.get(key);
    
    this.undoManager.record({
      operation,
      previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
      newState: null, // Will be set after apply
    });
    
    // Queue for sync
    this.deltaSyncManager.queueOperation(operation);
    
    this.emit({ type: 'operation_applied', operation });
  }
  
  receiveSync(message: SyncMessage): void {
    const newOperations = this.deltaSyncManager.receiveMessage(message);
    
    for (const operation of newOperations) {
      // Apply remote operations
      this.emit({ type: 'remote_operation', operation });
    }
  }
  
  createSnapshot(id?: string): string {
    const snapshotId = id || `snapshot_${Date.now()}`;
    this.snapshotManager.createSnapshot(
      snapshotId,
      this.state,
      this.deltaSyncManager.getClock()
    );
    return snapshotId;
  }
  
  restoreSnapshot(id: string): boolean {
    const snapshot = this.snapshotManager.getSnapshot(id);
    if (!snapshot) return false;
    
    this.state = snapshot;
    this.emit({ type: 'snapshot_restored', snapshotId: id });
    return true;
  }
  
  undo(): boolean {
    const entry = this.undoManager.undo();
    if (!entry) return false;
    
    // Restore previous state
    // Implementation depends on CRDT type
    
    return true;
  }
  
  redo(): boolean {
    const entry = this.undoManager.redo();
    if (!entry) return false;
    
    // Reapply operation
    
    return true;
  }
  
  getState(): Map<string, CRDTState> {
    return new Map(this.state);
  }
  
  getClock(): VectorClock {
    return this.deltaSyncManager.getClock();
  }
  
  getPendingCount(): number {
    return this.deltaSyncManager.getPendingCount();
  }
  
  on(handler: StateSyncEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private setupEventForwarding(): void {
    this.deltaSyncManager.on((event) => this.emit(event));
    this.undoManager.on((event) => this.emit(event));
  }
  
  private emit(event: StateSyncEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Event handler error:', e);
      }
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  createVectorClock,
  incrementClock,
  mergeClock,
  compareClock,
} from '../crdt';
