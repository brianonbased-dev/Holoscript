/**
 * @holoscript/multiplayer - State Sync Network Manager
 * Bridges @holoscript/state-sync CRDTs with network transport
 */

import {
  NetworkMessage,
  MultiplayerEvent,
  MultiplayerEventHandler,
} from '../types';

// Re-export from state-sync when available
// For now, define minimal interfaces for the bridge

export interface SyncMessage {
  type: 'sync' | 'ack';
  operations: CRDTOperation[];
  clock: Record<string, number>;
  nodeId: string;
  timestamp: number;
}

export interface CRDTOperation {
  id: string;
  type: 'set' | 'delete' | 'increment' | 'decrement' | 'insert' | 'remove';
  path: string[];
  value?: unknown;
  timestamp: number;
  nodeId: string;
}

export interface StateSyncNetworkConfig {
  /** Enable batching of operations */
  enableBatching: boolean;
  /** Batch interval in ms */
  batchInterval: number;
  /** Reliable delivery for state sync */
  reliable: boolean;
  /** Network channel to use */
  channel: number;
}

const DEFAULT_CONFIG: StateSyncNetworkConfig = {
  enableBatching: true,
  batchInterval: 50,
  reliable: true,
  channel: 3,
};

/**
 * StateSyncNetworkManager
 * 
 * Bridges the SyncCoordinator from @holoscript/state-sync with
 * the network transport layer in @holoscript/multiplayer.
 */
export class StateSyncNetworkManager {
  private config: StateSyncNetworkConfig;
  private localNodeId: string;
  private sendCallback?: (message: NetworkMessage) => void;
  private eventHandlers: Set<MultiplayerEventHandler> = new Set();
  
  // Pending operations for batching
  private pendingOperations: CRDTOperation[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Received operation tracking (deduplication)
  private receivedOperationIds: Set<string> = new Set();
  
  constructor(nodeId: string, config: Partial<StateSyncNetworkConfig> = {}) {
    this.localNodeId = nodeId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Set the callback for sending network messages
   */
  setSendCallback(callback: (message: NetworkMessage) => void): void {
    this.sendCallback = callback;
  }
  
  /**
   * Queue a local CRDT operation to be sent to peers
   */
  queueOperation(operation: Omit<CRDTOperation, 'id' | 'timestamp' | 'nodeId'>): void {
    const fullOperation: CRDTOperation = {
      ...operation,
      id: `${this.localNodeId}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      nodeId: this.localNodeId,
    };
    
    this.pendingOperations.push(fullOperation);
    
    if (this.config.enableBatching) {
      this.scheduleBatch();
    } else {
      this.flush();
    }
  }
  
  /**
   * Flush all pending operations to the network
   */
  flush(): void {
    if (this.pendingOperations.length === 0) return;
    if (!this.sendCallback) return;
    
    const syncMessage: SyncMessage = {
      type: 'sync',
      operations: [...this.pendingOperations],
      clock: {}, // Would be populated by actual VectorClock
      nodeId: this.localNodeId,
      timestamp: Date.now(),
    };
    
    this.sendCallback({
      type: 'state_sync',
      payload: syncMessage,
      timestamp: Date.now(),
      reliable: this.config.reliable,
      channel: this.config.channel,
    });
    
    this.pendingOperations = [];
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
  
  /**
   * Handle incoming state sync message from a peer
   * Returns new operations that should be applied locally
   */
  receiveMessage(message: SyncMessage): CRDTOperation[] {
    const newOperations: CRDTOperation[] = [];
    
    for (const operation of message.operations) {
      // Deduplicate
      if (this.receivedOperationIds.has(operation.id)) {
        continue;
      }
      
      this.receivedOperationIds.add(operation.id);
      newOperations.push(operation);
    }
    
    // Emit event for each new operation
    for (const op of newOperations) {
      this.emit({
        type: 'rpc_received',
        method: 'state_sync_operation',
        senderId: message.nodeId,
        args: [op],
      });
    }
    
    // Prune old operation IDs (keep last 10000)
    if (this.receivedOperationIds.size > 10000) {
      const arr = Array.from(this.receivedOperationIds);
      this.receivedOperationIds = new Set(arr.slice(-5000));
    }
    
    return newOperations;
  }
  
  /**
   * Handle incoming network message (route to receiveMessage if state_sync)
   */
  handleNetworkMessage(message: NetworkMessage): CRDTOperation[] {
    if (message.type !== 'state_sync') {
      return [];
    }
    
    const syncMessage = message.payload as SyncMessage;
    return this.receiveMessage(syncMessage);
  }
  
  /**
   * Get the local node ID
   */
  getNodeId(): string {
    return this.localNodeId;
  }
  
  /**
   * Get pending operation count
   */
  getPendingCount(): number {
    return this.pendingOperations.length;
  }
  
  /**
   * Subscribe to events
   */
  on(handler: MultiplayerEventHandler): () => void {
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
  
  private emit(event: MultiplayerEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('StateSyncNetworkManager event handler error:', e);
      }
    }
  }
}
