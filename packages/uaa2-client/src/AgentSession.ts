/**
 * @holoscript/infinity-builder-client
 * Agent session for real-time WebSocket communication
 */

import { EventEmitter } from 'eventemitter3';
import type {
  AgentEventMap,
  AgentUserMessage,
  AgentMessageContext,
  AgentResponse,
  InfinityBuilderError,
} from './types';

export class AgentSession extends EventEmitter<AgentEventMap> {
  private ws: WebSocket | null = null;
  private readonly sessionId: string;
  private readonly websocketUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor(sessionId: string, websocketUrl: string) {
    super();
    this.sessionId = sessionId;
    this.websocketUrl = websocketUrl;
  }

  /**
   * Connect to the agent WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.websocketUrl);

        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch {
            this.emit('error', {
              code: 500,
              message: 'Failed to parse WebSocket message',
            });
          }
        };

        this.ws.onerror = () => {
          const error: InfinityBuilderError = {
            code: 500,
            message: 'WebSocket connection error',
          };
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          this.emit('disconnect', { reason: event.reason || 'Connection closed' });
          this.attemptReconnect();
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Send a message to the agent
   */
  send(content: string, context?: AgentMessageContext): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const message: AgentUserMessage = {
      type: 'user_message',
      content,
      context,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Disconnect from the agent
   */
  disconnect(): void {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Get the session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: unknown): void {
    const response = data as AgentResponse;

    if (response.type === 'agent_response') {
      this.emit('message', response);

      // Also emit individual actions
      if (response.actions) {
        for (const action of response.actions) {
          this.emit('action', action);
        }
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }
}
