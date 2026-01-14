/**
 * @holoscript/uaa2-client
 * Main client for consuming uaa2-service APIs
 */

import { AgentSession } from './AgentSession';
import type {
  UAA2ClientConfig,
  BuildRequest,
  BuildResponse,
  BuildOptions,
  OptimizeRequest,
  OptimizeResponse,
  ExplainRequest,
  ExplainResponse,
  SpawnAgentRequest,
  SpawnAgentResponse,
  TranscribeResponse,
  VoiceBuildContext,
  VoiceBuildResponse,
  PatternRequest,
  PatternResponse,
  SuggestionRequest,
  SuggestionResponse,
  OptimizeFormationRequest,
  OptimizeFormationResponse,
  CrowdEventRequest,
  CrowdEventResponse,
  TransactionRequest,
  TransactionResponse,
  HealthResponse,
  UsageResponse,
  UAA2Error,
} from './types';

const DEFAULT_BASE_URL = 'https://api.uaa2.io';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;

export class UAA2Client {
  private readonly config: Required<UAA2ClientConfig>;
  private activeSessions: Map<string, AgentSession> = new Map();

  constructor(config: UAA2ClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      retries: config.retries || DEFAULT_RETRIES,
    };
  }

  // ==========================================================================
  // HoloScript Builder API
  // ==========================================================================

  /**
   * Build HoloScript from natural language prompt
   */
  async build(prompt: string, options?: BuildOptions): Promise<BuildResponse> {
    const request: BuildRequest = { prompt, options };
    return this.post<BuildResponse>('/api/v1/hololand/build', request);
  }

  /**
   * Optimize HoloScript for a target platform
   */
  async optimize(
    holoScript: string,
    target: 'mobile' | 'desktop' | 'vr'
  ): Promise<OptimizeResponse> {
    const request: OptimizeRequest = { holoScript, target };
    return this.post<OptimizeResponse>('/api/v1/hololand/optimize', request);
  }

  /**
   * Get human-readable explanation of HoloScript
   */
  async explain(holoScript: string): Promise<ExplainResponse> {
    const request: ExplainRequest = { holoScript };
    return this.post<ExplainResponse>('/api/v1/hololand/explain', request);
  }

  // ==========================================================================
  // Agent Avatar API
  // ==========================================================================

  /**
   * Agent management namespace
   */
  readonly agents = {
    /**
     * Spawn an AI agent in a world
     */
    spawn: async (request: SpawnAgentRequest): Promise<AgentSession> => {
      const response = await this.post<SpawnAgentResponse>(
        '/api/v1/agents/spawn',
        request
      );

      const session = new AgentSession(
        response.agentSessionId,
        response.websocketUrl
      );

      await session.connect();
      this.activeSessions.set(response.agentSessionId, session);

      return session;
    },

    /**
     * Terminate an agent session
     */
    terminate: async (sessionId: string): Promise<void> => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.disconnect();
        this.activeSessions.delete(sessionId);
      }

      await this.delete(`/api/v1/agents/${sessionId}`);
    },

    /**
     * Get all active agent sessions
     */
    getActiveSessions: (): AgentSession[] => {
      return Array.from(this.activeSessions.values());
    },
  };

  // ==========================================================================
  // Voice Processing API
  // ==========================================================================

  /**
   * Voice processing namespace
   */
  readonly voice = {
    /**
     * Transcribe audio to text
     */
    transcribe: async (
      audio: Blob,
      format: 'webm' | 'wav' | 'mp3'
    ): Promise<TranscribeResponse> => {
      const formData = new FormData();
      formData.append('audio', audio);
      formData.append('format', format);

      return this.postFormData<TranscribeResponse>(
        '/api/v1/voice/transcribe',
        formData
      );
    },

    /**
     * Transcribe audio and generate HoloScript in one request
     */
    build: async (
      audio: Blob,
      format: 'webm' | 'wav' | 'mp3',
      context?: VoiceBuildContext
    ): Promise<VoiceBuildResponse> => {
      const formData = new FormData();
      formData.append('audio', audio);
      formData.append('format', format);
      if (context) {
        formData.append('worldContext', JSON.stringify(context));
      }

      return this.postFormData<VoiceBuildResponse>(
        '/api/v1/voice/build',
        formData
      );
    },
  };

  // ==========================================================================
  // Knowledge Query API
  // ==========================================================================

  /**
   * Knowledge query namespace
   */
  readonly knowledge = {
    /**
     * Get VR environment patterns matching a query
     */
    patterns: async (request: PatternRequest): Promise<PatternResponse> => {
      return this.post<PatternResponse>('/api/v1/knowledge/patterns', request);
    },

    /**
     * Get contextual suggestions while building
     */
    suggestions: async (
      request: SuggestionRequest
    ): Promise<SuggestionResponse> => {
      return this.post<SuggestionResponse>(
        '/api/v1/knowledge/suggestions',
        request
      );
    },
  };

  // ==========================================================================
  // Spatial Coordination API
  // ==========================================================================

  /**
   * Spatial coordination namespace
   */
  readonly spatial = {
    /**
     * Optimize entity positioning
     */
    optimizeFormation: async (
      request: OptimizeFormationRequest
    ): Promise<OptimizeFormationResponse> => {
      return this.post<OptimizeFormationResponse>(
        '/api/v1/spatial/optimize-formation',
        request
      );
    },

    /**
     * Set up a crowd event
     */
    crowdEvent: async (
      request: CrowdEventRequest
    ): Promise<CrowdEventResponse> => {
      return this.post<CrowdEventResponse>(
        '/api/v1/spatial/crowd-event',
        request
      );
    },
  };

  // ==========================================================================
  // Economy API
  // ==========================================================================

  /**
   * Economy namespace
   */
  readonly economy = {
    /**
     * Process a transaction
     */
    transaction: async (
      request: TransactionRequest
    ): Promise<TransactionResponse> => {
      return this.post<TransactionResponse>(
        '/api/v1/economy/transaction',
        request
      );
    },
  };

  // ==========================================================================
  // Health & Status API
  // ==========================================================================

  /**
   * Check API health
   */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/api/v1/health');
  }

  /**
   * Get usage statistics
   */
  async usage(): Promise<UsageResponse> {
    return this.get<UsageResponse>('/api/v1/usage');
  }

  // ==========================================================================
  // HTTP Methods
  // ==========================================================================

  private async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private async delete(path: string): Promise<void> {
    await this.request<void>('DELETE', path);
  }

  private async postFormData<T>(path: string, formData: FormData): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error: UAA2Error = await response.json().catch(() => ({
        code: response.status,
        message: response.statusText,
      }));
      throw error;
    }

    return response.json();
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;

    let lastError: UAA2Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        );

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.config.apiKey}`,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error: UAA2Error = await response.json().catch(() => ({
            code: response.status,
            message: response.statusText,
          }));

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }

          lastError = error;
          continue;
        }

        // Handle empty responses (like DELETE)
        const text = await response.text();
        if (!text) {
          return undefined as T;
        }

        return JSON.parse(text);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          lastError = { code: 408, message: 'Request timeout' };
        } else if ((err as UAA2Error).code) {
          throw err; // Re-throw UAA2Error
        } else {
          lastError = { code: 500, message: (err as Error).message };
        }
      }
    }

    throw lastError || { code: 500, message: 'Unknown error' };
  }

  /**
   * Clean up all active sessions
   */
  destroy(): void {
    for (const session of this.activeSessions.values()) {
      session.disconnect();
    }
    this.activeSessions.clear();
  }
}
