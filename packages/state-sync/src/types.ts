/**
 * @holoscript/state-sync - Type Definitions
 * Distributed state synchronization with CRDTs
 */

// ============================================================================
// Core Types
// ============================================================================

export type Timestamp = number;
export type NodeId = string;
export type OperationId = string;

export interface VectorClock {
  entries: Record<string, number>;
  sum: number;
}

// ============================================================================
// CRDT Base Types
// ============================================================================

export enum CRDTType {
  /** Grow-only counter */
  GCounter = 'g_counter',
  /** Positive-negative counter */
  PNCounter = 'pn_counter',
  /** Grow-only set */
  GSet = 'g_set',
  /** Two-phase set (add/remove) */
  TwoPSet = 'two_p_set',
  /** Last-writer-wins register */
  LWWRegister = 'lww_register',
  /** Multi-value register */
  MVRegister = 'mv_register',
  /** OR-Set (observed-remove) */
  ORSet = 'or_set',
  /** Last-writer-wins map */
  LWWMap = 'lww_map',
  /** Sequence (list) */
  RGASequence = 'rga_sequence',
  /** JSON document */
  JSONDoc = 'json_doc',
}

// ============================================================================
// CRDT State Types
// ============================================================================

export interface CRDTState {
  type: CRDTType;
  id: string;
}

export interface GCounterState extends CRDTState {
  type: CRDTType.GCounter;
  id: string;
  counts: Record<NodeId, number>;
}

export interface PNCounterState extends CRDTState {
  type: CRDTType.PNCounter;
  id: string;
  positive: Record<NodeId, number>;
  negative: Record<NodeId, number>;
}

export interface GSetState extends CRDTState {
  type: CRDTType.GSet;
  id: string;
  elements: string[];
}

export interface TwoPSetState extends CRDTState {
  type: CRDTType.TwoPSet;
  id: string;
  added: string[];
  removed: string[];
}

export interface ORSetState extends CRDTState {
  type: CRDTType.ORSet;
  id: string;
  elements: Record<string, string[]>;
}

export interface LWWRegisterState extends CRDTState {
  type: CRDTType.LWWRegister;
  id: string;
  value: unknown;
  timestamp: Timestamp;
  nodeId: NodeId;
}

export interface MVRegisterState extends CRDTState {
  type: CRDTType.MVRegister;
  id: string;
  values: Array<{ value: unknown; clock: VectorClock }>;
}

export interface LWWMapState extends CRDTState {
  type: CRDTType.LWWMap;
  id: string;
  entries: Record<string, {
    value: unknown;
    timestamp: Timestamp;
    nodeId: NodeId;
    deleted?: boolean;
  }>;
}

export interface RGASequenceState extends CRDTState {
  type: CRDTType.RGASequence;
  id: string;
  vertices: Array<{
    id: string;
    value: unknown;
    timestamp: Timestamp;
    deleted: boolean;
  }>;
  edges: Record<string, string[]>;
}

export interface JSONDocState extends CRDTState {
  type: CRDTType.JSONDoc;
  id: string;
  root: Record<string, unknown>;
  operations: CRDTOperation[];
}

// ============================================================================
// Operations
// ============================================================================

export interface CRDTOperation {
  id: OperationId;
  type: 'set' | 'delete' | 'insert' | 'increment' | 'decrement' | 'add' | 'remove';
  path: string[];
  value?: unknown;
  timestamp: Timestamp;
  nodeId: NodeId;
}

// ============================================================================
// Sync Types
// ============================================================================

export enum SyncStrategy {
  FullState = 'full_state',
  Delta = 'delta',
  Merkle = 'merkle',
  Optimistic = 'optimistic',
}

export interface SyncConfig {
  strategy: SyncStrategy;
  batchSize: number;
  syncInterval: number;
  compression: boolean;
  maxBufferedOps: number;
  conflictTimeout: number;
  enableBatching: boolean;
  batchInterval: number;
  enablePersistence: boolean;
}

export interface SyncMessage {
  type: 'state_request' | 'state_response' | 'delta' | 'ack' | 'sync';
  operations: CRDTOperation[];
  clock: VectorClock;
  nodeId: NodeId;
  timestamp: Timestamp;
}

export interface SyncAck {
  type: 'ack';
  operationIds: string[];
  clock: VectorClock;
  nodeId: NodeId;
}

export enum ConflictResolution {
  LastWriteWins = 'lww',
  FirstWriteWins = 'fww',
  Merge = 'merge',
  Custom = 'custom',
}

// ============================================================================
// Merkle Tree
// ============================================================================

export interface MerkleNode {
  hash: string;
  children: MerkleNode[];
}

export interface MerkleTree {
  root: MerkleNode | null;
  height: number;
  leafCount: number;
}

// ============================================================================
// Undo/Redo
// ============================================================================

export interface UndoEntry {
  id: string;
  operation: CRDTOperation;
  previousState: CRDTState | null;
  newState: CRDTState | null;
  timestamp: Timestamp;
}

export interface UndoManager {
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  maxSize: number;
  position: number;
}

// ============================================================================
// Events
// ============================================================================

export type StateSyncEvent =
  | { type: 'local_update'; crdtId: string; operation: CRDTOperation }
  | { type: 'remote_update'; crdtId: string; operation: CRDTOperation; nodeId: NodeId }
  | { type: 'sync_started'; crdtId: string; strategy: SyncStrategy }
  | { type: 'sync_complete'; crdtId: string; operationsApplied: number }
  | { type: 'sync_conflict'; crdtId: string; conflictingOps: CRDTOperation[] }
  | { type: 'sync_error'; crdtId: string; error: string }
  | { type: 'node_connected'; nodeId: NodeId }
  | { type: 'node_disconnected'; nodeId: NodeId }
  | { type: 'vector_clock_updated'; vectorClock: VectorClock }
  | { type: 'operation_queued'; operation: CRDTOperation }
  | { type: 'sync_sent'; message: SyncMessage }
  | { type: 'sync_received'; operations: CRDTOperation[] }
  | { type: 'operation_applied'; operation: CRDTOperation }
  | { type: 'remote_operation'; operation: CRDTOperation }
  | { type: 'snapshot_restored'; snapshotId: string }
  | { type: 'state_reverted'; entry: UndoEntry }
  | { type: 'state_restored'; entry: UndoEntry };

export type StateSyncEventHandler = (event: StateSyncEvent) => void;

// ============================================================================
// Config Defaults
// ============================================================================

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  strategy: SyncStrategy.Delta,
  batchSize: 100,
  syncInterval: 100,
  compression: true,
  maxBufferedOps: 1000,
  conflictTimeout: 5000,
  enableBatching: true,
  batchInterval: 50,
  enablePersistence: false,
};
