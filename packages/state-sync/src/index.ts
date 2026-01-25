/**
 * @holoscript/state-sync
 * CRDT-based state synchronization
 */

// Types
export * from './types';

// CRDT
export {
  createVectorClock,
  incrementClock,
  mergeClock,
  compareClock,
  GCounter,
  PNCounter,
  GSet,
  TwoPSet,
  ORSet,
  LWWRegister,
  MVRegister,
  LWWMap,
  RGASequence,
  JSONDoc,
  createCRDT,
} from './crdt';

// Sync
export {
  DeltaSyncManager,
  MerkleTreeSync,
  ConflictResolver,
  StateUndoManager,
  SnapshotManager,
  SyncCoordinator,
} from './sync';
