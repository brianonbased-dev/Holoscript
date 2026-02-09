/**
 * Network Module
 *
 * HoloScript network synchronization system with peer connections,
 * state sync, entity replication, and RPC support.
 *
 * @module network
 */

// Types and Interfaces
export {
  // Vector types
  IVector3,
  IQuaternion,

  // Connection
  ConnectionState,
  NetworkTopology,
  IPeerInfo,
  IConnectionConfig,

  // Messages
  DeliveryMode,
  MessageTarget,
  INetworkMessage,
  MessageHandler,

  // State Sync
  SyncMode,
  SyncFrequency,
  StateOrigin,
  ISyncStateEntry,
  IStateSnapshot,
  ISyncConfig,

  // Entity Replication
  IReplicatedComponent,
  IReplicatedEntity,
  ISpawnRequest,
  IEntityDelta,

  // RPC
  RPCTarget,
  IRPCConfig,
  IRPCInvocation,
  IRPCResult,
  RPCHandler,

  // Clock
  IClockSync,

  // Input Prediction
  IInputCommand,
  IPredictionState,

  // Events
  NetworkEventType,
  INetworkEvent,
  NetworkEventCallback,

  // Configuration
  INetworkConfig,
  INetworkStats,

  // Interfaces
  INetworkClient,
  IStateSynchronizer,
  IEntityReplicator,
  IRPCManager,
  IClockSynchronizer,
  IInputPredictor,

  // Defaults
  NETWORK_DEFAULTS,
  CONNECTION_DEFAULTS,
  SYNC_DEFAULTS,

  // Helper Functions
  generateMessageId,
  generatePeerId,
  generateEntityId,
  createMessage,
  createPeerInfo,
  createSpawnRequest,
  createReplicatedEntity,
  createEntityDelta,
  createRPCInvocation,
  createInputCommand,
  lerpVector3,
  slerpQuaternion,
  distanceVector3,
  isMessageForPeer,
  serializeState,
  deserializeState,
  validateConnectionConfig,
} from './NetworkTypes';

// Implementations
export { NetworkClientImpl, createNetworkClient } from './NetworkClientImpl';
export { StateSynchronizerImpl, createStateSynchronizer } from './StateSynchronizerImpl';
