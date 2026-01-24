/**
 * @holoscript/core Networked Trait
 *
 * Enables real-time state synchronization for multiplayer VR/AR experiences.
 * Supports owner-authoritative, shared, and server-authoritative sync modes.
 *
 * @example
 * ```hsplus
 * object "Player" {
 *   @networked {
 *     mode: "owner",
 *     syncProperties: ["position", "rotation", "health"],
 *     syncRate: 20,
 *     interpolation: true
 *   }
 * }
 * ```
 */

export type NetworkSyncMode = 'owner' | 'shared' | 'server';
export type NetworkChannel = 'reliable' | 'unreliable' | 'ordered';

/**
 * Property sync configuration
 */
export interface SyncProperty {
  /** Property name/path */
  name: string;

  /** Sync priority (higher = more frequent) */
  priority?: number;

  /** Delta compression enabled */
  deltaCompression?: boolean;

  /** Quantization bits for floats (reduces bandwidth) */
  quantizationBits?: number;

  /** Custom serializer function name */
  serializer?: string;

  /** Whether to sync on change only */
  onChangeOnly?: boolean;
}

/**
 * Interpolation settings
 */
export interface InterpolationConfig {
  /** Enable interpolation */
  enabled: boolean;

  /** Interpolation delay in ms */
  delay?: number;

  /** Interpolation mode */
  mode?: 'linear' | 'hermite' | 'catmull-rom';

  /** Max extrapolation time in ms */
  maxExtrapolation?: number;

  /** Snap threshold (teleport if delta exceeds) */
  snapThreshold?: number;
}

/**
 * Network authority settings
 */
export interface AuthorityConfig {
  /** Initial owner peer ID */
  owner?: string;

  /** Can ownership be transferred */
  transferable?: boolean;

  /** Request timeout in ms */
  requestTimeout?: number;

  /** Auto-claim on interact */
  autoClaimOnInteract?: boolean;
}

/**
 * Networked trait configuration
 */
export interface NetworkedConfig {
  /** Sync mode */
  mode: NetworkSyncMode;

  /** Properties to sync */
  syncProperties?: (string | SyncProperty)[];

  /** Sync rate in Hz */
  syncRate?: number;

  /** Network channel */
  channel?: NetworkChannel;

  /** Interpolation settings */
  interpolation?: boolean | InterpolationConfig;

  /** Authority settings */
  authority?: AuthorityConfig;

  /** Room/channel for scoping */
  room?: string;

  /** Persistence settings */
  persistence?: {
    enabled: boolean;
    storageKey?: string;
    saveOnDisconnect?: boolean;
  };
}

/**
 * Network event types
 */
export type NetworkEventType =
  | 'connected'
  | 'disconnected'
  | 'peerJoined'
  | 'peerLeft'
  | 'ownershipChanged'
  | 'propertyChanged'
  | 'stateReceived'
  | 'latencyUpdate';

/**
 * Network event payload
 */
export interface NetworkEvent {
  type: NetworkEventType;
  peerId?: string;
  ownerId?: string;
  property?: string;
  value?: unknown;
  latencyMs?: number;
  timestamp: number;
}

/**
 * Network statistics
 */
export interface NetworkStats {
  /** Round-trip time in ms */
  rtt: number;

  /** Packets sent per second */
  packetsSentPerSecond: number;

  /** Packets received per second */
  packetsReceivedPerSecond: number;

  /** Bytes sent per second */
  bytesSentPerSecond: number;

  /** Bytes received per second */
  bytesReceivedPerSecond: number;

  /** Packet loss percentage */
  packetLoss: number;

  /** Connected peers count */
  connectedPeers: number;
}

// ============================================================================
// NetworkedTrait Class
// ============================================================================

/**
 * NetworkedTrait - Enables multiplayer state synchronization
 */
export class NetworkedTrait {
  private config: NetworkedConfig;
  private syncState: Map<string, unknown> = new Map();
  private pendingUpdates: Map<string, unknown> = new Map();
  private lastSyncTime: number = 0;
  private eventListeners: Map<NetworkEventType, ((event: NetworkEvent) => void)[]> = new Map();
  private isOwner: boolean = false;
  private peerId: string = '';
  private connected: boolean = false;

  constructor(config: NetworkedConfig) {
    this.config = {
      mode: config.mode || 'owner',
      syncRate: config.syncRate ?? 20,
      channel: config.channel || 'unreliable',
      interpolation: config.interpolation ?? true,
      syncProperties: config.syncProperties,
      authority: config.authority,
      room: config.room,
      persistence: config.persistence,
    };

    // Normalize syncProperties to SyncProperty[]
    if (this.config.syncProperties) {
      this.config.syncProperties = this.config.syncProperties.map((prop) => {
        if (typeof prop === 'string') {
          return { name: prop };
        }
        return prop;
      });
    }
  }

  /**
   * Get configuration
   */
  public getConfig(): NetworkedConfig {
    return { ...this.config };
  }

  /**
   * Set property value (will be synced)
   */
  public setProperty(name: string, value: unknown): void {
    this.syncState.set(name, value);
    this.pendingUpdates.set(name, value);

    this.emit('propertyChanged', {
      type: 'propertyChanged',
      property: name,
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Get property value
   */
  public getProperty(name: string): unknown {
    return this.syncState.get(name);
  }

  /**
   * Get all synced properties
   */
  public getState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const [key, value] of this.syncState) {
      state[key] = value;
    }
    return state;
  }

  /**
   * Apply received state (from network)
   */
  public applyState(state: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(state)) {
      this.syncState.set(key, value);
    }

    this.emit('stateReceived', {
      type: 'stateReceived',
      timestamp: Date.now(),
    });
  }

  /**
   * Check if should sync (based on rate limiting)
   */
  public shouldSync(): boolean {
    const now = Date.now();
    const interval = 1000 / (this.config.syncRate || 20);
    if (now - this.lastSyncTime >= interval) {
      this.lastSyncTime = now;
      return this.pendingUpdates.size > 0;
    }
    return false;
  }

  /**
   * Get pending updates and clear
   */
  public flushUpdates(): Record<string, unknown> {
    const updates: Record<string, unknown> = {};
    for (const [key, value] of this.pendingUpdates) {
      updates[key] = value;
    }
    this.pendingUpdates.clear();
    return updates;
  }

  /**
   * Request ownership of this entity
   */
  public requestOwnership(): Promise<boolean> {
    if (!this.config.authority?.transferable) {
      return Promise.resolve(false);
    }

    // In real implementation, this would send a network request
    return Promise.resolve(true);
  }

  /**
   * Release ownership
   */
  public releaseOwnership(): void {
    if (this.isOwner) {
      this.isOwner = false;
      this.emit('ownershipChanged', {
        type: 'ownershipChanged',
        ownerId: undefined,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Check if local peer is owner
   */
  public isLocalOwner(): boolean {
    return this.isOwner;
  }

  /**
   * Set owner status (called by network layer)
   */
  public setOwner(isOwner: boolean, ownerId?: string): void {
    this.isOwner = isOwner;
    this.emit('ownershipChanged', {
      type: 'ownershipChanged',
      ownerId,
      timestamp: Date.now(),
    });
  }

  /**
   * Add event listener
   */
  public on(event: NetworkEventType, callback: (event: NetworkEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: NetworkEventType, callback: (event: NetworkEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   */
  private emit(type: NetworkEventType, event: NetworkEvent): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      for (const callback of listeners) {
        callback(event);
      }
    }
  }

  /**
   * Serialize state for network transmission
   */
  public serialize(): ArrayBuffer {
    const state = this.getState();
    const json = JSON.stringify(state);
    const encoder = new TextEncoder();
    return encoder.encode(json).buffer;
  }

  /**
   * Deserialize state from network
   */
  public deserialize(buffer: ArrayBuffer): void {
    const decoder = new TextDecoder();
    const json = decoder.decode(buffer);
    const state = JSON.parse(json);
    this.applyState(state);
  }

  /**
   * Get interpolation config
   */
  public getInterpolationConfig(): InterpolationConfig {
    if (typeof this.config.interpolation === 'boolean') {
      return {
        enabled: this.config.interpolation,
        delay: 100,
        mode: 'linear',
        maxExtrapolation: 200,
        snapThreshold: 5,
      };
    }
    return this.config.interpolation || { enabled: false };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Set connection status
   */
  public setConnected(connected: boolean, peerId?: string): void {
    this.connected = connected;
    if (peerId) {
      this.peerId = peerId;
    }

    this.emit(connected ? 'connected' : 'disconnected', {
      type: connected ? 'connected' : 'disconnected',
      peerId: this.peerId,
      timestamp: Date.now(),
    });
  }
}

/**
 * HoloScript+ @networked trait factory
 */
export function createNetworkedTrait(config?: Partial<NetworkedConfig>): NetworkedTrait {
  return new NetworkedTrait({
    mode: config?.mode || 'owner',
    syncRate: config?.syncRate ?? 20,
    interpolation: config?.interpolation ?? true,
    ...config,
  });
}

// Re-export type aliases for index.ts
export type SyncMode = NetworkSyncMode;
export type InterpolationType = InterpolationConfig;
export type SyncedProperty = SyncProperty;
export type NetworkAuthority = AuthorityConfig;

export default NetworkedTrait;
