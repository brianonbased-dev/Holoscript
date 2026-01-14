/**
 * @holoscript/uaa2-client
 *
 * Thin client for consuming uaa2-service APIs from HoloScript projects.
 *
 * Features:
 * - HoloScript generation from natural language
 * - AI agent avatars with WebSocket communication
 * - Voice-to-HoloScript transcription
 * - Knowledge queries for patterns and suggestions
 * - Spatial coordination for multiplayer
 * - In-world economy transactions
 *
 * @example
 * ```typescript
 * import { UAA2Client } from '@holoscript/uaa2-client';
 *
 * const client = new UAA2Client({
 *   apiKey: process.env.UAA2_API_KEY,
 *   baseUrl: 'https://api.uaa2.io'
 * });
 *
 * // Generate HoloScript from natural language
 * const result = await client.build("Create a forest with pine trees");
 * console.log(result.holoScript);
 *
 * // Spawn an AI agent
 * const agent = await client.agents.spawn({
 *   agentType: 'assistant',
 *   worldId: 'world_123',
 *   avatarConfig: {
 *     displayName: 'Helper Bot',
 *     appearance: { model: 'humanoid', color: '#667eea' }
 *   },
 *   capabilities: ['chat', 'build-assist']
 * });
 *
 * agent.on('message', (msg) => console.log(msg.content));
 * agent.send('Help me build a table');
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { UAA2Client } from './UAA2Client';

// Agent session for WebSocket communication
export { AgentSession } from './AgentSession';

// All types
export type {
  // Config
  UAA2ClientConfig,

  // Auth
  OAuthTokenRequest,
  OAuthTokenResponse,

  // Builder API
  BuildOptions,
  BuildRequest,
  BuildResponse,
  OptimizeRequest,
  OptimizeResponse,
  ExplainRequest,
  ExplainResponse,

  // Agent API
  AgentType,
  AgentCapability,
  AvatarAppearance,
  AvatarConfig,
  SpawnAgentRequest,
  SpawnAgentResponse,
  Vector3,
  AgentMessageContext,
  AgentUserMessage,
  AgentAction,
  AgentResponse,

  // Voice API
  AudioFormat,
  TranscribeResponse,
  VoiceBuildContext,
  VoiceBuildResponse,

  // Knowledge API
  PatternFilters,
  PatternRequest,
  Pattern,
  PatternResponse,
  SuggestionRequest,
  Suggestion,
  SuggestionResponse,

  // Spatial API
  SpatialEntity,
  TargetZone,
  Formation,
  OptimizeFormationRequest,
  OptimizeFormationResponse,
  SafetyZone,
  CrowdEventRequest,
  CrowdEventResponse,

  // Economy API
  TransactionType,
  Currency,
  TransactionItem,
  TransactionRequest,
  TransactionReceipt,
  TransactionResponse,

  // Health API
  ServiceStatus,
  HealthResponse,
  UsagePeriod,
  UsageMetrics,
  UsageLimits,
  UsageResponse,

  // Error
  UAA2Error,

  // Events
  AgentEventType,
  AgentEventMap,
} from './types';

// Version
export const HOLOSCRIPT_UAA2_CLIENT_VERSION = '1.0.0-alpha.1';

// Default export for convenience
import { UAA2Client } from './UAA2Client';
export default UAA2Client;
