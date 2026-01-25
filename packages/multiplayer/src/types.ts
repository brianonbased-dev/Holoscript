/**
 * @holoscript/multiplayer - Type Definitions
 * VR multiplayer networking system
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quaternion;
  scale: Vec3;
}

// ============================================================================
// Connection Types
// ============================================================================

export enum ConnectionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Reconnecting = 'reconnecting',
  Error = 'error',
}

export enum TransportType {
  WebSocket = 'websocket',
  WebRTC = 'webrtc',
  WebTransport = 'webtransport',
}

export interface ConnectionConfig {
  /** Server URL */
  serverUrl: string;
  /** Transport type */
  transport: TransportType;
  /** Auto reconnect on disconnect */
  autoReconnect: boolean;
  /** Reconnect delay (ms) */
  reconnectDelay: number;
  /** Max reconnect attempts */
  maxReconnectAttempts: number;
  /** Connection timeout (ms) */
  connectionTimeout: number;
  /** Heartbeat interval (ms) */
  heartbeatInterval: number;
  /** Enable compression */
  compression: boolean;
}

export interface ConnectionStats {
  /** Round-trip time (ms) */
  rtt: number;
  /** Jitter (ms) */
  jitter: number;
  /** Packet loss (0-1) */
  packetLoss: number;
  /** Bytes sent */
  bytesSent: number;
  /** Bytes received */
  bytesReceived: number;
  /** Messages sent */
  messagesSent: number;
  /** Messages received */
  messagesReceived: number;
  /** Connected duration (ms) */
  connectedDuration: number;
}

// ============================================================================
// Room Types
// ============================================================================

export enum RoomState {
  Open = 'open',
  Full = 'full',
  InProgress = 'in_progress',
  Closed = 'closed',
}

export interface RoomConfig {
  /** Room ID */
  id: string;
  /** Room name */
  name: string;
  /** Max players */
  maxPlayers: number;
  /** Is private (requires password) */
  isPrivate: boolean;
  /** Password (if private) */
  password?: string;
  /** Room metadata */
  metadata: Record<string, unknown>;
  /** Scene ID to load */
  sceneId: string;
  /** Room region */
  region: string;
  /** Tick rate (updates per second) */
  tickRate: number;
}

export interface RoomInfo {
  /** Room ID */
  id: string;
  /** Room name */
  name: string;
  /** Current player count */
  playerCount: number;
  /** Max players */
  maxPlayers: number;
  /** Room state */
  state: RoomState;
  /** Is private */
  isPrivate: boolean;
  /** Region */
  region: string;
  /** Ping estimate (ms) */
  pingEstimate: number;
  /** Scene ID */
  sceneId: string;
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

export interface RoomJoinRequest {
  /** Room ID to join */
  roomId: string;
  /** Password (if required) */
  password?: string;
  /** Player info */
  playerInfo: PlayerInfo;
}

export interface RoomCreateRequest {
  /** Room configuration */
  config: Partial<RoomConfig>;
  /** Player info */
  playerInfo: PlayerInfo;
}

// ============================================================================
// Player Types
// ============================================================================

export interface PlayerInfo {
  /** Player ID (assigned by server) */
  id: string;
  /** Display name */
  displayName: string;
  /** Avatar configuration */
  avatar: AvatarConfig;
  /** Custom player data */
  customData: Record<string, unknown>;
}

export interface AvatarConfig {
  /** Avatar model ID */
  modelId: string;
  /** Avatar color/tint */
  primaryColor: string;
  /** Secondary color */
  secondaryColor?: string;
  /** Avatar scale */
  scale: number;
  /** Custom avatar properties */
  properties: Record<string, unknown>;
}

export interface PlayerState {
  /** Player ID */
  id: string;
  /** Player info */
  info: PlayerInfo;
  /** Is local player */
  isLocal: boolean;
  /** Is room host */
  isHost: boolean;
  /** Head transform */
  headTransform: Transform;
  /** Left hand transform */
  leftHandTransform: Transform;
  /** Right hand transform */
  rightHandTransform: Transform;
  /** Voice activity */
  isVoiceActive: boolean;
  /** Latency (ms) */
  latency: number;
  /** Last update timestamp */
  lastUpdateTime: number;
  /** Custom state */
  customState: Record<string, unknown>;
}

export interface PlayerInput {
  /** Movement input */
  movement: Vec3;
  /** Look rotation */
  lookRotation: Quaternion;
  /** Button states */
  buttons: Record<string, boolean>;
  /** Axis values */
  axes: Record<string, number>;
  /** Sequence number */
  sequence: number;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export enum SyncPriority {
  Low = 0,
  Normal = 1,
  High = 2,
  Critical = 3,
}

export enum SyncMode {
  /** Owner sends, others receive */
  OwnerToAll = 'owner_to_all',
  /** Server authoritative */
  ServerAuthoritative = 'server_authoritative',
  /** All can modify (with conflict resolution) */
  Shared = 'shared',
  /** One-way broadcast */
  Broadcast = 'broadcast',
}

export interface SyncedObject {
  /** Object ID */
  networkId: string;
  /** Owner player ID */
  ownerId: string;
  /** Sync mode */
  syncMode: SyncMode;
  /** Sync priority */
  priority: SyncPriority;
  /** Object transform */
  transform: Transform;
  /** Synced properties */
  properties: Record<string, unknown>;
  /** Last sync timestamp */
  lastSyncTime: number;
  /** Is interpolating */
  isInterpolating: boolean;
}

export interface SyncUpdate {
  /** Object network ID */
  networkId: string;
  /** Updated properties */
  properties: Record<string, unknown>;
  /** Timestamp */
  timestamp: number;
  /** Sequence number */
  sequence: number;
}

// ============================================================================
// Voice Chat Types
// ============================================================================

export enum VoiceChatMode {
  /** Always transmit */
  OpenMic = 'open_mic',
  /** Push to talk */
  PushToTalk = 'push_to_talk',
  /** Voice activity detection */
  VoiceActivity = 'voice_activity',
}

export interface VoiceChatConfig {
  /** Voice chat mode */
  mode: VoiceChatMode;
  /** Voice activity threshold (0-1) */
  voiceThreshold: number;
  /** Enable spatial audio */
  spatialAudio: boolean;
  /** Max voice distance */
  maxDistance: number;
  /** Audio codec */
  codec: 'opus' | 'pcm';
  /** Sample rate */
  sampleRate: number;
  /** Enable noise suppression */
  noiseSuppression: boolean;
  /** Enable echo cancellation */
  echoCancellation: boolean;
}

export interface VoiceStream {
  /** Player ID */
  playerId: string;
  /** Is speaking */
  isSpeaking: boolean;
  /** Audio level (0-1) */
  audioLevel: number;
  /** Is muted by local user */
  isMutedByLocal: boolean;
  /** Is self-muted */
  isSelfMuted: boolean;
  /** Position for spatial audio */
  position: Vec3;
}

// ============================================================================
// RPC Types
// ============================================================================

export enum RPCTarget {
  /** All players including sender */
  All = 'all',
  /** All players except sender */
  Others = 'others',
  /** Only server */
  Server = 'server',
  /** Specific player */
  Player = 'player',
  /** Room host */
  Host = 'host',
}

export interface RPCCall {
  /** Method name */
  method: string;
  /** Arguments */
  args: unknown[];
  /** Target */
  target: RPCTarget;
  /** Target player ID (if target is Player) */
  targetPlayerId?: string;
  /** Is reliable */
  reliable: boolean;
}

export interface RPCHandler {
  /** Method name */
  method: string;
  /** Handler function */
  handler: (senderId: string, ...args: unknown[]) => void | Promise<void>;
}

// ============================================================================
// Events
// ============================================================================

export type MultiplayerEvent =
  | { type: 'connection_state_changed'; state: ConnectionState; error?: string }
  | { type: 'room_joined'; roomInfo: RoomInfo }
  | { type: 'room_left'; reason: 'disconnected' | 'kicked' | 'room_closed' | 'left' }
  | { type: 'room_state_changed'; roomInfo: RoomInfo }
  | { type: 'player_joined'; player: PlayerState }
  | { type: 'player_left'; playerId: string; reason: string }
  | { type: 'player_updated'; player: PlayerState }
  | { type: 'host_changed'; newHostId: string }
  | { type: 'object_spawned'; object: SyncedObject }
  | { type: 'object_despawned'; networkId: string }
  | { type: 'object_ownership_changed'; networkId: string; newOwnerId: string }
  | { type: 'voice_state_changed'; playerId: string; isSpeaking: boolean }
  | { type: 'rpc_received'; method: string; senderId: string; args: unknown[] }
  | { type: 'latency_updated'; latency: number }
  | { type: 'error'; code: string; message: string };

export type MultiplayerEventHandler = (event: MultiplayerEvent) => void;

// ============================================================================
// Config Defaults
// ============================================================================

export const DEFAULT_CONNECTION_CONFIG: ConnectionConfig = {
  serverUrl: 'wss://localhost:8080',
  transport: TransportType.WebSocket,
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 5,
  connectionTimeout: 10000,
  heartbeatInterval: 5000,
  compression: true,
};

export const DEFAULT_ROOM_CONFIG: Partial<RoomConfig> = {
  maxPlayers: 16,
  isPrivate: false,
  tickRate: 20,
  region: 'auto',
  metadata: {},
};

export const DEFAULT_VOICE_CHAT_CONFIG: VoiceChatConfig = {
  mode: VoiceChatMode.VoiceActivity,
  voiceThreshold: 0.01,
  spatialAudio: true,
  maxDistance: 20,
  codec: 'opus',
  sampleRate: 48000,
  noiseSuppression: true,
  echoCancellation: true,
};

// ============================================================================
// Message Types
// ============================================================================

export interface NetworkMessage {
  /** Message type */
  type: string;
  /** Payload */
  payload: unknown;
  /** Timestamp */
  timestamp: number;
  /** Sender ID */
  senderId?: string;
  /** Is reliable */
  reliable: boolean;
  /** Channel (for prioritization) */
  channel: number;
}

export interface TransformSnapshot {
  /** Position */
  position: Vec3;
  /** Rotation */
  rotation: Quaternion;
  /** Velocity (for prediction) */
  velocity?: Vec3;
  /** Angular velocity (for prediction) */
  angularVelocity?: Vec3;
  /** Timestamp */
  timestamp: number;
}

export interface InterpolationBuffer {
  /** Snapshots */
  snapshots: TransformSnapshot[];
  /** Target delay (ms) */
  delay: number;
  /** Current interpolation time */
  currentTime: number;
}
