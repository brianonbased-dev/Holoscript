/**
 * @holoscript/infinity-builder-client
 *
 * Client for building universal apps with Infinity Builder from HoloScript.
 * Build once with HoloScript, compile to 9 platforms via Infinity Builder.
 *
 * Features:
 * - Create components (forms, data display, navigation, feedback, layout)
 * - Compile to web, mobile (4), desktop (2), VR/AR (2)
 * - Multi-language build profiles (Core, Plus, VR)
 * - AI-assisted building and optimization
 * - Real-time deployment and updates
 *
 * @example
 * ```typescript
 * import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';
 *
 * const client = new InfinityBuilderClient({
 *   apiKey: process.env.INFINITY_BUILDER_API_KEY,
 *   baseUrl: 'https://api.infinityassistant.io'
 * });
 *
 * // Build a component
 * const component = await client.components.create({
 *   type: 'form',
 *   holoScript: `form#login { input#email { } input#password { } }`,
 *   targets: ['web', 'mobile-react-native', 'vr']
 * });
 *
 * // Compile to all platforms
 * const builds = await client.components.compileToAllPlatforms(
 *   component.id,
 *   { optimize: true }
 * );
 *
 * // Deploy
 * await client.deploy({ componentId: component.id, environment: 'production' });
 * ```
 *
 * @packageDocumentation
 */

// Main client
export { UAA2Client } from './UAA2Client';

// Agent InfinityBuilderClient } from './InfinityBuilderClient';

// Component builder session
export { ComponentBuilderSession } from './ComponentBuilder
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

// Default export for coINFINITY_BUILDER_CLIENT_VERSION = '1.0.0';

// Default export for convenience
import { InfinityBuilderClient } from './InfinityBuilderClient';
export default InfinityBuilder