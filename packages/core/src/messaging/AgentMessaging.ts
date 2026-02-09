/**
 * Agent Messaging System
 * Sprint 4 Priority 6 - Agent Communication Channels
 *
 * Provides secure, validated messaging between agents across channels.
 */

import { EventEmitter } from 'events';
import {
  Message,
  MessageAck,
  BroadcastMessage,
  MessageHandler,
  ChannelConfig,
  AgentChannel,
  MessagePriority,
  generateMessageId,
  validateMessageSchema,
  JSONSchema,
} from './MessagingTypes';
import { ChannelManager } from './ChannelManager';

// =============================================================================
// ENCRYPTION UTILITIES (Simulated for now)
// =============================================================================

/**
 * Simulated encryption - in production, use proper crypto libraries
 */
class EncryptionService {
  /**
   * Encrypt a message payload
   */
  static encrypt(payload: unknown, mode: 'aes-256' | 'e2e', key?: string): string {
    // Simulated encryption - just base64 encode for now
    const json = JSON.stringify(payload);
    return Buffer.from(json).toString('base64');
  }

  /**
   * Decrypt a message payload
   */
  static decrypt<T>(encrypted: string, mode: 'aes-256' | 'e2e', key?: string): T {
    // Simulated decryption - just base64 decode
    const json = Buffer.from(encrypted, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  }

  /**
   * Generate encryption key pair
   */
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    // Simulated key generation
    const id = Math.random().toString(36).substring(2, 10);
    return {
      publicKey: `pub_${id}`,
      privateKey: `priv_${id}`,
    };
  }
}

// =============================================================================
// MESSAGE QUEUE
// =============================================================================

interface QueuedMessage<T = unknown> {
  message: Message<T>;
  channelId: string;
  retries: number;
  queuedAt: number;
}

// =============================================================================
// AGENT MESSAGING
// =============================================================================

export interface AgentMessagingConfig {
  /** Maximum retries for failed messages */
  maxRetries: number;
  /** Retry delay in ms */
  retryDelay: number;
  /** Message timeout in ms */
  messageTimeout: number;
  /** Whether to auto-acknowledge messages */
  autoAck: boolean;
  /** Maximum queue size */
  maxQueueSize: number;
}

const DEFAULT_CONFIG: AgentMessagingConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  messageTimeout: 30000,
  autoAck: true,
  maxQueueSize: 1000,
};

/**
 * Agent messaging system for secure channel-based communication
 */
export class AgentMessaging extends EventEmitter {
  private agentId: string;
  private config: AgentMessagingConfig;
  private channelManager: ChannelManager;
  private handlers: Map<string, Set<MessageHandler<unknown>>> = new Map();
  private typeHandlers: Map<string, Set<MessageHandler<unknown>>> = new Map();
  private pendingMessages: Map<string, QueuedMessage> = new Map();
  private messageQueue: QueuedMessage[] = [];
  private keyPair?: { publicKey: string; privateKey: string };

  constructor(
    agentId: string,
    channelManager: ChannelManager,
    config: Partial<AgentMessagingConfig> = {}
  ) {
    super();
    this.agentId = agentId;
    this.channelManager = channelManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  /**
   * Initialize encryption keys
   */
  initializeEncryption(): { publicKey: string; privateKey: string } {
    this.keyPair = EncryptionService.generateKeyPair();
    return this.keyPair;
  }

  /**
   * Get public key for sharing
   */
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  // ===========================================================================
  // CHANNEL OPERATIONS
  // ===========================================================================

  /**
   * Create a new channel
   */
  createChannel(
    participants: string[],
    config: Partial<ChannelConfig> = {}
  ): AgentChannel {
    const channel = this.channelManager.createChannel(
      this.agentId,
      participants,
      config
    );

    // Register public key if encryption enabled
    if (channel.encryption !== 'none' && this.keyPair) {
      this.channelManager.setPublicKey(
        channel.id,
        this.agentId,
        this.keyPair.publicKey
      );
    }

    return channel;
  }

  /**
   * Join an existing channel
   */
  joinChannel(channelId: string): boolean {
    return this.channelManager.joinChannel(
      channelId,
      this.agentId,
      this.keyPair?.publicKey
    );
  }

  /**
   * Leave a channel
   */
  leaveChannel(channelId: string): boolean {
    // Unsubscribe from channel
    this.handlers.delete(channelId);
    return this.channelManager.leaveChannel(channelId, this.agentId);
  }

  /**
   * Close a channel (owner only)
   */
  closeChannel(channelId: string): boolean {
    this.handlers.delete(channelId);
    return this.channelManager.closeChannel(channelId, this.agentId);
  }

  /**
   * Get channels this agent belongs to
   */
  getChannels(): AgentChannel[] {
    return this.channelManager.getAgentChannels(this.agentId);
  }

  // ===========================================================================
  // SENDING MESSAGES
  // ===========================================================================

  /**
   * Send a message to a specific agent in a channel
   */
  send<T>(
    channelId: string,
    recipientId: string,
    type: string,
    payload: T,
    priority: MessagePriority = 'normal'
  ): Message<T> | null {
    const channel = this.channelManager.getChannel(channelId);
    if (!channel) {
      this.emit('error', { error: 'Channel not found', channelId });
      return null;
    }

    // Verify sender is member
    if (!this.channelManager.isMember(channelId, this.agentId)) {
      this.emit('error', { error: 'Not a member of channel', channelId });
      return null;
    }

    // Verify recipient is member
    if (!this.channelManager.isMember(channelId, recipientId)) {
      this.emit('error', { error: 'Recipient not in channel', recipientId });
      return null;
    }

    // Validate against schema if present
    if (channel.messageSchema) {
      const validation = validateMessageSchema(payload, channel.messageSchema);
      if (!validation.valid) {
        this.emit('error', { error: 'Schema validation failed', errors: validation.errors });
        return null;
      }
    }

    // Create message
    let finalPayload = payload;

    // Apply encryption if needed
    if (channel.encryption !== 'none') {
      const recipientKey = this.channelManager.getPublicKey(channelId, recipientId);
      finalPayload = EncryptionService.encrypt(
        payload,
        channel.encryption,
        recipientKey || undefined
      ) as unknown as T;
    }

    const message: Message<T> = {
      id: generateMessageId(this.agentId),
      channelId,
      senderId: this.agentId,
      recipientId,
      type,
      payload: finalPayload,
      timestamp: Date.now(),
      encrypted: channel.encryption !== 'none',
      priority,
    };

    // Track pending message
    this.pendingMessages.set(message.id, {
      message: message as Message<unknown>,
      channelId,
      retries: 0,
      queuedAt: Date.now(),
    });

    // Emit for delivery
    this.emit('message:sent', message);
    return message;
  }

  /**
   * Broadcast message to all channel members
   */
  broadcast<T>(
    channelId: string,
    type: string,
    payload: T,
    priority: MessagePriority = 'normal'
  ): BroadcastMessage<T> | null {
    const channel = this.channelManager.getChannel(channelId);
    if (!channel) {
      this.emit('error', { error: 'Channel not found', channelId });
      return null;
    }

    // Verify sender is member
    if (!this.channelManager.isMember(channelId, this.agentId)) {
      this.emit('error', { error: 'Not a member of channel', channelId });
      return null;
    }

    // Validate against schema if present
    if (channel.messageSchema) {
      const validation = validateMessageSchema(payload, channel.messageSchema);
      if (!validation.valid) {
        this.emit('error', { error: 'Schema validation failed', errors: validation.errors });
        return null;
      }
    }

    // Get recipients (all members except sender)
    const recipients = channel.participants.filter((p) => p !== this.agentId);

    const broadcast: BroadcastMessage<T> = {
      id: generateMessageId(this.agentId),
      channelId,
      senderId: this.agentId,
      type,
      payload,
      timestamp: Date.now(),
      encrypted: channel.encryption !== 'none',
      priority,
      recipients,
    };

    this.emit('message:broadcast', broadcast);
    return broadcast;
  }

  /**
   * Reply to a message
   */
  reply<T>(
    originalMessage: Message<unknown>,
    type: string,
    payload: T
  ): Message<T> | null {
    return this.send(
      originalMessage.channelId,
      originalMessage.senderId,
      type,
      payload,
      originalMessage.priority
    );
  }

  // ===========================================================================
  // RECEIVING MESSAGES
  // ===========================================================================

  /**
   * Subscribe to all messages on a channel
   */
  subscribe<T = unknown>(
    channelId: string,
    handler: MessageHandler<T>
  ): () => void {
    let handlers = this.handlers.get(channelId);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(channelId, handlers);
    }

    handlers.add(handler as MessageHandler<unknown>);

    // Return unsubscribe function
    return () => {
      handlers?.delete(handler as MessageHandler<unknown>);
      if (handlers?.size === 0) {
        this.handlers.delete(channelId);
      }
    };
  }

  /**
   * Subscribe to messages of a specific type
   */
  subscribeToType<T = unknown>(
    type: string,
    handler: MessageHandler<T>
  ): () => void {
    let handlers = this.typeHandlers.get(type);
    if (!handlers) {
      handlers = new Set();
      this.typeHandlers.set(type, handlers);
    }

    handlers.add(handler as MessageHandler<unknown>);

    return () => {
      handlers?.delete(handler as MessageHandler<unknown>);
      if (handlers?.size === 0) {
        this.typeHandlers.delete(type);
      }
    };
  }

  /**
   * Process a received message
   */
  handleMessage<T>(message: Message<T>): MessageAck {
    // Verify this is the intended recipient
    if (message.recipientId && message.recipientId !== this.agentId) {
      return {
        messageId: message.id,
        recipientId: this.agentId,
        status: 'failed',
        timestamp: Date.now(),
        error: 'Not intended recipient',
      };
    }

    // Decrypt if needed
    let payload = message.payload;
    if (message.encrypted && this.keyPair) {
      const channel = this.channelManager.getChannel(message.channelId);
      if (channel && channel.encryption !== 'none') {
        try {
          payload = EncryptionService.decrypt<T>(
            message.payload as unknown as string,
            channel.encryption,
            this.keyPair.privateKey
          );
        } catch (error) {
          return {
            messageId: message.id,
            recipientId: this.agentId,
            status: 'failed',
            timestamp: Date.now(),
            error: 'Decryption failed',
          };
        }
      }
    }

    const decryptedMessage: Message<T> = {
      ...message,
      payload,
    };

    // Invoke channel handlers
    const channelHandlers = this.handlers.get(message.channelId);
    if (channelHandlers) {
      for (const handler of channelHandlers) {
        try {
          handler(decryptedMessage);
        } catch (error) {
          this.emit('handler:error', { message, error });
        }
      }
    }

    // Invoke type handlers
    const typeHandlers = this.typeHandlers.get(message.type);
    if (typeHandlers) {
      for (const handler of typeHandlers) {
        try {
          handler(decryptedMessage);
        } catch (error) {
          this.emit('handler:error', { message, error });
        }
      }
    }

    // Emit general event
    this.emit('message:received', decryptedMessage);

    return {
      messageId: message.id,
      recipientId: this.agentId,
      status: 'delivered',
      timestamp: Date.now(),
    };
  }

  // ===========================================================================
  // ACKNOWLEDGEMENT
  // ===========================================================================

  /**
   * Handle message acknowledgement
   */
  handleAck(ack: MessageAck): void {
    const pending = this.pendingMessages.get(ack.messageId);
    if (!pending) return;

    if (ack.status === 'delivered' || ack.status === 'read') {
      this.pendingMessages.delete(ack.messageId);
      this.emit('message:acked', ack);
    } else if (ack.status === 'failed') {
      // Retry logic
      if (pending.retries < this.config.maxRetries) {
        pending.retries++;
        this.queueForRetry(pending);
      } else {
        this.pendingMessages.delete(ack.messageId);
        this.emit('message:failed', { message: pending.message, ack });
      }
    }
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: string): MessageAck {
    return {
      messageId,
      recipientId: this.agentId,
      status: 'read',
      timestamp: Date.now(),
    };
  }

  // ===========================================================================
  // QUEUE MANAGEMENT
  // ===========================================================================

  private queueForRetry(pending: QueuedMessage): void {
    if (this.messageQueue.length >= this.config.maxQueueSize) {
      this.emit('queue:full', { dropped: pending });
      return;
    }

    setTimeout(() => {
      // Re-send the message
      this.emit('message:retry', pending.message);
    }, this.config.retryDelay * pending.retries);
  }

  /**
   * Get pending message count
   */
  getPendingCount(): number {
    return this.pendingMessages.size;
  }

  /**
   * Get message from pending
   */
  getPendingMessage(messageId: string): Message<unknown> | null {
    return this.pendingMessages.get(messageId)?.message || null;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clear all subscriptions
   */
  clearSubscriptions(): void {
    this.handlers.clear();
    this.typeHandlers.clear();
  }

  /**
   * Cleanup expired pending messages
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, pending] of this.pendingMessages) {
      if (now - pending.queuedAt > this.config.messageTimeout) {
        this.pendingMessages.delete(id);
        this.emit('message:expired', pending.message);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Dispose of messaging system
   */
  dispose(): void {
    this.clearSubscriptions();
    this.pendingMessages.clear();
    this.messageQueue = [];
    this.removeAllListeners();
  }
}
