/**
 * @holoscript/multiplayer - Room Module
 * Room management, joining, and hosting
 */

import {
  ConnectionState,
  ConnectionConfig,
  ConnectionStats,
  TransportType,
  RoomConfig,
  RoomInfo,
  RoomState,
  RoomJoinRequest,
  RoomCreateRequest,
  PlayerInfo,
  PlayerState,
  NetworkMessage,
  MultiplayerEvent,
  MultiplayerEventHandler,
  DEFAULT_CONNECTION_CONFIG,
  DEFAULT_ROOM_CONFIG,
} from '../types';

// ============================================================================
// Connection Manager
// ============================================================================

export class ConnectionManager {
  private config: ConnectionConfig;
  private state: ConnectionState = ConnectionState.Disconnected;
  private socket: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastPingTime: number = 0;
  private eventHandlers: Set<MultiplayerEventHandler> = new Set();
  
  private stats: ConnectionStats = {
    rtt: 0,
    jitter: 0,
    packetLoss: 0,
    bytesSent: 0,
    bytesReceived: 0,
    messagesSent: 0,
    messagesReceived: 0,
    connectedDuration: 0,
  };
  
  private connectStartTime: number = 0;
  private messageQueue: NetworkMessage[] = [];
  
  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONNECTION_CONFIG, ...config };
  }
  
  async connect(): Promise<boolean> {
    if (this.state === ConnectionState.Connected) {
      return true;
    }
    
    this.setState(ConnectionState.Connecting);
    this.connectStartTime = Date.now();
    
    try {
      await this.createConnection();
      this.setState(ConnectionState.Connected);
      this.startHeartbeat();
      this.flushMessageQueue();
      return true;
    } catch (error) {
      this.handleConnectionError(error);
      return false;
    }
  }
  
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.setState(ConnectionState.Disconnected);
  }
  
  send(message: NetworkMessage): void {
    if (this.state !== ConnectionState.Connected) {
      if (message.reliable) {
        this.messageQueue.push(message);
      }
      return;
    }
    
    const data = JSON.stringify(message);
    this.socket?.send(data);
    this.stats.bytesSent += data.length;
    this.stats.messagesSent++;
  }
  
  getState(): ConnectionState {
    return this.state;
  }
  
  getStats(): ConnectionStats {
    return {
      ...this.stats,
      connectedDuration:
        this.state === ConnectionState.Connected
          ? Date.now() - this.connectStartTime
          : 0,
    };
  }
  
  on(handler: MultiplayerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.config.connectionTimeout);
      
      try {
        this.socket = new WebSocket(this.config.serverUrl);
        
        this.socket.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        
        this.socket.onerror = (err) => {
          clearTimeout(timeout);
          reject(err);
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.socket.onclose = () => {
          this.handleDisconnect();
        };
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
  
  private handleMessage(data: string): void {
    try {
      this.stats.bytesReceived += data.length;
      this.stats.messagesReceived++;
      
      const message = JSON.parse(data) as NetworkMessage;
      
      if (message.type === 'pong') {
        const rtt = Date.now() - this.lastPingTime;
        const jitterDelta = Math.abs(rtt - this.stats.rtt);
        this.stats.jitter = this.stats.jitter * 0.9 + jitterDelta * 0.1;
        this.stats.rtt = rtt;
        this.emit({ type: 'latency_updated', latency: rtt });
      }
      
      // Dispatch to handlers
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }
  
  private handleDisconnect(): void {
    this.stopHeartbeat();
    
    if (this.config.autoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.setState(ConnectionState.Reconnecting);
      this.reconnectAttempts++;
      
      setTimeout(() => {
        this.connect();
      }, this.config.reconnectDelay * this.reconnectAttempts);
    } else {
      this.setState(ConnectionState.Disconnected);
    }
  }
  
  private handleConnectionError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.setState(ConnectionState.Error);
    this.emit({
      type: 'error',
      code: 'CONNECTION_ERROR',
      message: errorMessage,
    });
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.lastPingTime = Date.now();
      this.send({
        type: 'ping',
        payload: { timestamp: this.lastPingTime },
        timestamp: this.lastPingTime,
        reliable: false,
        channel: 0,
      });
    }, this.config.heartbeatInterval);
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }
  
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit({ type: 'connection_state_changed', state });
    }
  }
  
  private emit(event: MultiplayerEvent): void {
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
// Room Manager
// ============================================================================

export class RoomManager {
  private connectionManager: ConnectionManager;
  private currentRoom: RoomInfo | null = null;
  private players: Map<string, PlayerState> = new Map();
  private localPlayerId: string | null = null;
  private isHost: boolean = false;
  private eventHandlers: Set<MultiplayerEventHandler> = new Set();
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }
  
  async createRoom(request: RoomCreateRequest): Promise<RoomInfo | null> {
    const config: RoomConfig = {
      id: this.generateRoomId(),
      name: request.config.name || 'New Room',
      ...DEFAULT_ROOM_CONFIG,
      ...request.config,
    } as RoomConfig;
    
    this.connectionManager.send({
      type: 'room_create',
      payload: { config, playerInfo: request.playerInfo },
      timestamp: Date.now(),
      reliable: true,
      channel: 0,
    });
    
    // In real implementation, wait for server response
    const roomInfo: RoomInfo = {
      id: config.id,
      name: config.name,
      playerCount: 1,
      maxPlayers: config.maxPlayers,
      state: RoomState.Open,
      isPrivate: config.isPrivate,
      region: config.region,
      pingEstimate: 0,
      sceneId: config.sceneId,
      metadata: config.metadata,
    };
    
    this.currentRoom = roomInfo;
    this.isHost = true;
    this.localPlayerId = request.playerInfo.id;
    
    this.addLocalPlayer(request.playerInfo);
    this.emit({ type: 'room_joined', roomInfo });
    
    return roomInfo;
  }
  
  async joinRoom(request: RoomJoinRequest): Promise<RoomInfo | null> {
    this.connectionManager.send({
      type: 'room_join',
      payload: request,
      timestamp: Date.now(),
      reliable: true,
      channel: 0,
    });
    
    // In real implementation, wait for server response
    return this.currentRoom;
  }
  
  leaveRoom(): void {
    if (!this.currentRoom) return;
    
    this.connectionManager.send({
      type: 'room_leave',
      payload: { roomId: this.currentRoom.id },
      timestamp: Date.now(),
      reliable: true,
      channel: 0,
    });
    
    this.currentRoom = null;
    this.players.clear();
    this.isHost = false;
    this.emit({ type: 'room_left', reason: 'left' });
  }
  
  async listRooms(filter?: {
    region?: string;
    sceneId?: string;
    includePrivate?: boolean;
  }): Promise<RoomInfo[]> {
    // In real implementation, query server
    return [];
  }
  
  getCurrentRoom(): RoomInfo | null {
    return this.currentRoom;
  }
  
  getPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }
  
  getPlayer(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }
  
  getLocalPlayer(): PlayerState | undefined {
    return this.localPlayerId ? this.players.get(this.localPlayerId) : undefined;
  }
  
  isLocalHost(): boolean {
    return this.isHost;
  }
  
  kickPlayer(playerId: string, reason: string = 'Kicked'): void {
    if (!this.isHost) return;
    
    this.connectionManager.send({
      type: 'room_kick',
      payload: { playerId, reason },
      timestamp: Date.now(),
      reliable: true,
      channel: 0,
    });
  }
  
  transferHost(newHostId: string): void {
    if (!this.isHost) return;
    
    this.connectionManager.send({
      type: 'room_transfer_host',
      payload: { newHostId },
      timestamp: Date.now(),
      reliable: true,
      channel: 0,
    });
    
    this.isHost = false;
    this.emit({ type: 'host_changed', newHostId });
  }
  
  on(handler: MultiplayerEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }
  
  private addLocalPlayer(info: PlayerInfo): void {
    const state: PlayerState = {
      id: info.id,
      info,
      isLocal: true,
      isHost: this.isHost,
      headTransform: {
        position: { x: 0, y: 1.6, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      leftHandTransform: {
        position: { x: -0.3, y: 1, z: -0.3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      rightHandTransform: {
        position: { x: 0.3, y: 1, z: -0.3 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      isVoiceActive: false,
      latency: 0,
      lastUpdateTime: Date.now(),
      customState: {},
    };
    
    this.players.set(info.id, state);
  }
  
  private generateRoomId(): string {
    return 'room_' + Math.random().toString(36).substring(2, 11);
  }
  
  private emit(event: MultiplayerEvent): void {
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
// Room Browser
// ============================================================================

export class RoomBrowser {
  private connectionManager: ConnectionManager;
  private rooms: RoomInfo[] = [];
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  
  constructor(connectionManager: ConnectionManager) {
    this.connectionManager = connectionManager;
  }
  
  async refresh(): Promise<RoomInfo[]> {
    // Query server for room list
    return this.rooms;
  }
  
  getRooms(): RoomInfo[] {
    return [...this.rooms];
  }
  
  filterRooms(filter: {
    name?: string;
    region?: string;
    sceneId?: string;
    hasSlots?: boolean;
  }): RoomInfo[] {
    return this.rooms.filter((room) => {
      if (filter.name && !room.name.toLowerCase().includes(filter.name.toLowerCase())) {
        return false;
      }
      if (filter.region && room.region !== filter.region) {
        return false;
      }
      if (filter.sceneId && room.sceneId !== filter.sceneId) {
        return false;
      }
      if (filter.hasSlots && room.playerCount >= room.maxPlayers) {
        return false;
      }
      return true;
    });
  }
  
  sortRooms(by: 'name' | 'players' | 'ping'): RoomInfo[] {
    const sorted = [...this.rooms];
    
    switch (by) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'players':
        sorted.sort((a, b) => b.playerCount - a.playerCount);
        break;
      case 'ping':
        sorted.sort((a, b) => a.pingEstimate - b.pingEstimate);
        break;
    }
    
    return sorted;
  }
  
  startAutoRefresh(intervalMs: number = 5000): void {
    this.stopAutoRefresh();
    this.refreshInterval = setInterval(() => {
      this.refresh();
    }, intervalMs);
  }
  
  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export function generatePlayerId(): string {
  return 'player_' + Math.random().toString(36).substring(2, 11);
}

export { StateSyncNetworkManager } from './StateSyncNetworkManager';
