/**
 * @holoscript/infinity-builder-client
 * TypeScript types for Infinity Builder service API
 */

// ============================================================================
// Client Configuration
// ============================================================================

export interface InfinityBuilderClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  // Hololand integration
  hololandAuth?: {
    userId: string;
    sessionToken: string;
    hololandApiUrl?: string; // Defaults to Hololand backend
  };
}

// ============================================================================
// Authentication
// ============================================================================

export interface OAuthTokenRequest {
  grant_type: 'client_credentials';
  client_id: string;
  client_secret: string;
  scope: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope: string;
}


// ============================================================================
// HoloScript Builder API
// ============================================================================

export interface BuildOptions {
  style?: 'modern' | 'classic' | 'minimal' | 'realistic';
  complexity?: 'low' | 'medium' | 'high';
  includePhysics?: boolean;
}

export interface BuildRequest {
  prompt: string;
  options?: BuildOptions;
}

export interface BuildResponse {
  success: boolean;
  holoScript: string;
  confidence: number;
  metadata: {
    objectCount: number;
    estimatedPolygons: number;
    buildTime: number;
  };
}

export interface OptimizeRequest {
  holoScript: string;
  target: 'mobile' | 'desktop' | 'vr';
}

export interface OptimizeResponse {
  optimizedScript: string;
  improvements: {
    polygonReduction: string;
    textureOptimization: boolean;
  };
}

export interface ExplainRequest {
  holoScript: string;
}

export interface ExplainResponse {
  explanation: string;
  breakdown: Array<{
    line: number;
    description: string;
  }>;
}

// ============================================================================
// Agent Avatar API
// ============================================================================

export type AgentType = 'assistant' | 'guide' | 'npc' | 'moderator';
export type AgentCapability = 'chat' | 'guide' | 'build-assist' | 'moderate' | 'trade';

export interface AvatarAppearance {
  model: 'humanoid' | 'robot' | 'animal' | 'custom';
  color?: string;
  customModelUrl?: string;
}

export interface AvatarConfig {
  displayName: string;
  appearance: AvatarAppearance;
}

export interface SpawnAgentRequest {
  agentType: AgentType;
  worldId: string;
  avatarConfig: AvatarConfig;
  capabilities: AgentCapability[];
}

export interface SpawnAgentResponse {
  agentSessionId: string;
  avatarId: string;
  websocketUrl: string;
  capabilities: AgentCapability[];
  expiresAt: string;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AgentMessageContext {
  position?: Vector3;
  selectedObjects?: string[];
}

export interface AgentUserMessage {
  type: 'user_message';
  content: string;
  context?: AgentMessageContext;
}

export interface AgentAction {
  type: 'create_object' | 'modify_object' | 'delete_object' | 'emote' | 'move';
  holoScript?: string;
  emoteId?: string;
  targetPosition?: Vector3;
}

export interface AgentResponse {
  type: 'agent_response';
  content: string;
  actions: AgentAction[];
}

// ============================================================================
// Voice Processing API
// ============================================================================

export type AudioFormat = 'webm' | 'wav' | 'mp3';

export interface TranscribeResponse {
  transcript: string;
  confidence: number;
  language: string;
}

export interface VoiceBuildContext {
  currentPosition?: Vector3;
  selectedObjects?: string[];
}

export interface VoiceBuildResponse {
  transcript: string;
  holoScript: string;
  confidence: number;
}

// ============================================================================
// Knowledge Query API
// ============================================================================

export interface PatternFilters {
  minConfidence?: number;
  maxPolygons?: number;
  categories?: string[];
}

export interface PatternRequest {
  query: string;
  limit?: number;
  filters?: PatternFilters;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  preview: string;
  confidence: number;
  usage: number;
}

export interface PatternResponse {
  patterns: Pattern[];
}

export interface SuggestionRequest {
  currentScript: string;
  cursorPosition: number;
}

export interface Suggestion {
  type: 'completion' | 'enhancement' | 'fix';
  text: string;
  confidence: number;
}

export interface SuggestionResponse {
  suggestions: Suggestion[];
}

// ============================================================================
// Spatial Coordination API
// ============================================================================

export interface SpatialEntity {
  id: string;
  position: Vector3;
}

export interface TargetZone {
  center: Vector3;
  radius: number;
}

export type Formation = 'circle' | 'line' | 'grid' | 'scatter' | 'cluster';

export interface OptimizeFormationRequest {
  entities: SpatialEntity[];
  targetZone: TargetZone;
  formation: Formation;
}

export interface OptimizeFormationResponse {
  optimizedPositions: SpatialEntity[];
  metrics: {
    spreadScore: number;
    collisionFree: boolean;
  };
}

export interface SafetyZone {
  center: Vector3;
  radius: number;
  type: 'exit' | 'stage' | 'restricted';
}

export interface CrowdEventRequest {
  eventType: 'concert' | 'meetup' | 'auction' | 'class';
  location: Vector3;
  expectedAttendees: number;
  safetyZones?: SafetyZone[];
}

export interface CrowdEventResponse {
  eventId: string;
  recommendedCapacity: number;
  layoutSuggestions: string[];
}

// ============================================================================
// Economy API
// ============================================================================

export type TransactionType = 'purchase' | 'sale' | 'transfer' | 'tip';
export type Currency = 'HOLO' | 'USD' | 'ETH';

export interface TransactionItem {
  type: 'asset' | 'service' | 'subscription';
  assetId?: string;
  description?: string;
}

export interface TransactionRequest {
  worldId: string;
  type: TransactionType;
  from: string;
  to: string;
  amount: number;
  currency: Currency;
  item: TransactionItem;
}

export interface TransactionReceipt {
  timestamp: string;
  fee: number;
  netAmount: number;
}

export interface TransactionResponse {
  transactionId: string;
  status: 'completed' | 'pending' | 'failed';
  receipt?: TransactionReceipt;
  error?: string;
}

// ============================================================================
// Health & Status API
// ============================================================================

export type ServiceStatus = 'operational' | 'degraded' | 'down';

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  version: string;
  services: {
    builder: ServiceStatus;
    agents: ServiceStatus;
    voice: ServiceStatus;
    knowledge: ServiceStatus;
  };
}

export interface UsagePeriod {
  start: string;
  end: string;
}

export interface UsageMetrics {
  apiCalls: number;
  agentMinutes: number;
  storageGB: number;
}

export interface UsageLimits {
  apiCalls: number;
  agentMinutes: number;
  storageGB: number;
}

export interface UsageResponse {
  tier: 'free' | 'pro' | 'enterprise';
  period: UsagePeriod;
  usage: UsageMetrics;
  limits: UsageLimits;
}

// ============================================================================
// Error Types
// ============================================================================

export interface InfinityBuilderError {
  code: number;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Event Types (for WebSocket)
// ============================================================================

export type AgentEventType = 'message' | 'action' | 'disconnect' | 'error';

export interface AgentEventMap {
  message: AgentResponse;
  action: AgentAction;
  disconnect: { reason: string };
  error: InfinityBuilderError;
}
