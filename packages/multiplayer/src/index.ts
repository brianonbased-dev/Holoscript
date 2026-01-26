/**
 * @holoscript/multiplayer
 * VR multiplayer networking system
 */

// Types
export * from './types';

// Room
export {
  ConnectionManager,
  RoomManager,
  RoomBrowser,
  generatePlayerId,
  StateSyncNetworkManager,
} from './room';

// Player
export {
  TransformInterpolator,
  PlayerSyncManager,
  VoiceChatManager,
  RPCManager,
  ObjectSyncManager,
} from './player';

// CRDT Bridge (connects @holoscript/state-sync to networking)
export {
  CRDTNetworkBridge,
  createCRDTBridge,
  type CRDTBridgeConfig,
  type CRDTBridgeEvent,
} from './crdt-bridge';
