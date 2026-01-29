/**
 * @holoscript/core
 *
 * HoloScript+ - VR language with declarative syntax, state management, and VR interactions.
 * Enhanced version of HoloScript with:
 * - VR interaction traits (@grabbable, @throwable, @hoverable, etc.)
 * - Reactive state management (@state { ... })
 * - Control flow (@for, @if directives)
 * - TypeScript companion imports
 * - Expression interpolation ${...}
 *
 * Fully backward compatible with original HoloScript syntax.
 *
 * @example
 * ```typescript
 * import { HoloScriptPlusParser, HoloScriptPlusRuntime } from '@holoscript/core';
 *
 * const parser = new HoloScriptPlusParser();
 * const result = parser.parse(`
 *   orb#myOrb {
 *     position: [0, 0, 0]
 *     @grabbable(snap_to_hand: true)
 *     @throwable(bounce: true)
 *   }
 * `);
 *
 * const runtime = new HoloScriptPlusRuntime(result.ast);
 * await runtime.mount(document.body);
 * ```
 *
 * @packageDocumentation
 */

// Import for use in utility functions
import { HoloScriptParser } from './HoloScriptParser';
import { HoloScriptRuntime } from './HoloScriptRuntime';

// Constants (New)
export * from './constants';

// Parser
export { HoloScriptParser } from './HoloScriptParser';
export { HoloScript2DParser } from './HoloScript2DParser';
// Editor & Tools
export { HoloScriptValidator, type ValidationError } from './HoloScriptValidator';
export * from './HoloScriptCodeParser';

// HoloScript+ Parser (NEW)
export { HoloScriptPlusParser, createParser, parse as parseHoloScriptPlus } from './parser/HoloScriptPlusParser';

// Rich Error System (NEW - Enhanced error messages with codes, context, suggestions)
export {
  type RichParseError,
  HSPLUS_ERROR_CODES,
  createRichError,
  createTraitError,
  createKeywordError,
  findSimilarTrait,
  findSimilarKeyword,
  getSourceContext,
  formatRichError,
  formatRichErrors,
  getErrorCodeDocumentation,
} from './parser/RichErrors';

// .holo Composition Parser (NEW - Scene-centric declarative format)
export { HoloCompositionParser, parseHolo, parseHoloStrict } from './parser/HoloCompositionParser';
export type {
  HoloComposition,
  HoloEnvironment,
  HoloState,
  HoloTemplate,
  HoloObjectDecl,
  HoloObjectTrait,
  HoloSpatialGroup,
  HoloLight,
  HoloLightProperty,
  HoloEffects,
  HoloEffect,
  HoloCamera,
  HoloCameraProperty,
  HoloLogic,
  HoloAction,
  HoloEventHandler,
  HoloStatement,
  HoloExpression,
  HoloBindExpression,
  HoloImport,
  HoloParseResult,
  HoloParseError,
  HoloParserOptions,
  HoloValue,
  HoloBindValue,
  HoloTimeline,
  HoloTimelineEntry,
  HoloTimelineAction,
  HoloAudio,
  HoloAudioProperty,
  HoloZone,
  HoloZoneProperty,
  HoloUI,
  HoloUIElement,
  HoloUIProperty,
  HoloTransition,
  HoloTransitionProperty,
  HoloConditionalBlock,
  HoloForEachBlock,
} from './parser/HoloCompositionTypes';

// HoloScript+ Enhanced Parser with Trait Annotations (NEW - Phase 3)
export {
  HoloScriptPlusParser as HoloScriptTraitAnnotationParser,
  type MaterialTraitAnnotation,
  type LightingTraitAnnotation,
  type RenderingTraitAnnotation,
  type GraphicsConfiguration,
} from './HoloScriptPlusParser';

// Advanced AST Types (from the new structural parser)
export type {
  ASTProgram,
  HSPlusDirective,
  HSPlusCompileResult,
  HSPlusParserOptions,
  HSPlusNode as HSPlusASTNode,
} from './parser/HoloScriptPlusParser';

// Runtime
export { HoloScriptRuntime } from './HoloScriptRuntime';

// HoloScript+ Runtime (NEW)
export { HoloScriptPlusRuntimeImpl, createRuntime } from './runtime/HoloScriptPlusRuntime';
export type { RuntimeOptions, Renderer, NodeInstance } from './runtime/HoloScriptPlusRuntime';

// HoloScript+ State Management (NEW)
export { ReactiveState, createState, reactive, effect, computed, bind } from './state/ReactiveState';

// Core types
export type { HSPlusAST, VRTraitName } from './types';

// HoloScript R3F Compiler (NEW)
export { R3FCompiler, type R3FNode, ENVIRONMENT_PRESETS } from './compiler/R3FCompiler';

// HoloScript Optimization Pass (NEW - Auto-optimization)
export {
  OptimizationPass,
  type OptimizationCategory,
  type OptimizationSeverity,
  type OptimizationHint,
  type LODTier,
  type LODRecommendation,
  type BatchGroup,
  type OptimizationReport,
  type SceneStats,
  type OptimizationOptions,
} from './compiler/OptimizationPass';

// HoloScript Multi-Target Compilers (NEW - Cross-platform)
export { UnityCompiler, type UnityCompilerOptions } from './compiler/UnityCompiler';
export { GodotCompiler, type GodotCompilerOptions } from './compiler/GodotCompiler';
export { VisionOSCompiler, type VisionOSCompilerOptions } from './compiler/VisionOSCompiler';

// HoloScript New Platform Compilers (NEW - Phase 14)
export { WebGPUCompiler, type WebGPUCompilerOptions } from './compiler/WebGPUCompiler';
export { BabylonCompiler, type BabylonCompilerOptions } from './compiler/BabylonCompiler';
export { AndroidXRCompiler, type AndroidXRCompilerOptions } from './compiler/AndroidXRCompiler';
export { OpenXRCompiler, type OpenXRCompilerOptions } from './compiler/OpenXRCompiler';

// HoloScript LSP Service (NEW - IDE integration)
export {
  HoloScriptLSP,
  type LSPDiagnostic,
  type LSPRange,
  type LSPPosition,
  type LSPCompletionItem,
  type CompletionItemKind,
  type LSPHoverResult,
  type LSPDefinitionResult,
  type LSPDocumentSymbol,
  type SymbolKind,
  type LSPSemanticToken,
  type SemanticTokenType,
  type SemanticTokenModifier,
} from './lsp/HoloScriptLSP';

// HoloScript+ VR Traits (NEW)
export { VRTraitRegistry, vrTraitRegistry } from './traits/VRTraitSystem';

// HoloScript+ Expanded Trait Handlers (Phases 1-13)
export {
  // Phase 1: Environment Understanding
  planeDetectionHandler,
  meshDetectionHandler,
  anchorHandler,
  persistentAnchorHandler,
  sharedAnchorHandler,
  geospatialEnvHandler,
  occlusionHandler,
  lightEstimationHandler,
  // Phase 2: Input Modalities
  handTrackingHandler,
  controllerInputHandler,
  bodyTrackingHandler,
  faceTrackingHandler,
  spatialAccessoryHandler,
  // Phase 3: Accessibility
  accessibleHandler,
  altTextHandler,
  spatialAudioCueHandler,
  sonificationHandler,
  hapticCueHandler,
  magnifiableHandler,
  highContrastHandler,
  motionReducedHandler,
  subtitleHandler,
  screenReaderHandler,
  // Phase 4: Gaussian Splatting & Volumetric
  gaussianSplatHandler,
  nerfHandler,
  volumetricVideoHandler,
  pointCloudHandler,
  photogrammetryHandler,
  // Phase 5: WebGPU Compute
  computeHandler,
  gpuParticleHandler,
  gpuPhysicsHandler,
  gpuBufferHandler,
  // Phase 6: Digital Twin & IoT
  sensorHandler,
  digitalTwinHandler,
  dataBindingHandler,
  alertHandler,
  heatmap3dHandler,
  // Phase 7: Autonomous Agents
  behaviorTreeHandler,
  goalOrientedHandler,
  llmAgentHandler,
  neuralLinkHandler,
  memoryHandler,
  perceptionHandler,
  emotionHandler,
  dialogueHandler,
  factionHandler,
  patrolHandler,
  // Phase 8: Advanced Spatial Audio
  ambisonicsHandler,
  hrtfHandler,
  reverbZoneHandler,
  audioOcclusionHandler,
  audioPortalHandler,
  audioMaterialHandler,
  headTrackedAudioHandler,
  // Phase 9: OpenUSD & Interoperability
  usdHandler,
  gltfHandler,
  fbxHandler,
  materialXHandler,
  sceneGraphHandler,
  // Phase 10: Co-Presence & Shared Experiences
  coLocatedHandler,
  remotePresenceHandler,
  sharedWorldHandler,
  voiceProximityHandler,
  avatarEmbodimentHandler,
  spectatorHandler,
  roleHandler,
  // Phase 11: Geospatial & AR Cloud
  geospatialAnchorHandler,
  terrainAnchorHandler,
  rooftopAnchorHandler,
  vpsHandler,
  poiHandler,
  // Phase 12: Web3 & Ownership
  nftHandler,
  tokenGatedHandler,
  walletHandler,
  marketplaceHandler,
  portableHandler,
  // Phase 13: Physics Expansion
  clothHandler,
  fluidHandler,
  softBodyHandler,
  ropeHandler,
  chainHandler,
  windHandler,
  buoyancyHandler,
  destructionHandler,
} from './traits/VRTraitSystem';

// HoloScript+ Voice Input Trait (NEW - Phase 1)
export {
  VoiceInputTrait,
  createVoiceInputTrait,
  type VoiceInputConfig,
  type VoiceInputMode,
  type VoiceRecognitionResult,
  type VoiceInputEvent,
} from './traits/VoiceInputTrait';

// HoloScript+ AI Driver NPC Trait (NEW - Phase 1)
export {
  AIDriverTrait,
  createAIDriverTrait,
  BehaviorTreeRunner,
  GOAPPlanner,
  type AIDriverConfig,
  type DecisionMode,
  type BehaviorNode,
  type NPCContext,
  type NPCGoal,
  type BehaviorState,
} from './traits/AIDriverTrait';

// HoloScript+ Material Trait (NEW - Phase 2: Graphics)
export {
  MaterialTrait,
  createMaterialTrait,
  MATERIAL_PRESETS,
  type MaterialType,
  type TextureChannel,
  type TextureMap,
  type PBRMaterial,
  type MaterialConfig,
} from './traits/MaterialTrait';

// HoloScript+ Lighting Trait (NEW - Phase 2: Graphics)
export {
  LightingTrait,
  createLightingTrait,
  LIGHTING_PRESETS,
  type LightType,
  type ShadowType,
  type ShadowConfig,
  type LightSource,
  type GlobalIlluminationConfig,
} from './traits/LightingTrait';

// HoloScript+ Rendering Trait (NEW - Phase 2: Graphics)
export {
  RenderingTrait,
  createRenderingTrait,
  type CullingMode,
  type LodStrategy,
  type GPUResourceTier,
  type LODLevel,
  type CullingConfig,
  type BatchingConfig,
  type TextureOptimization,
  type ShaderOptimization,
  type RenderingOptimization,
} from './traits/RenderingTrait';

// HoloScript+ Shader Trait (NEW - Phase 3: Advanced Graphics)
export {
  ShaderTrait,
  createShaderTrait,
  SHADER_PRESETS,
  SHADER_CHUNKS,
  type ShaderType,
  type UniformType,
  type UniformValue,
  type UniformDefinition,
  type ShaderChunk,
  type InlineShader,
  type ShaderConfig,
} from './traits/ShaderTrait';

// HoloScript+ Networked Trait (NEW - Phase 3: Multiplayer)
export {
  NetworkedTrait,
  createNetworkedTrait,
  type SyncMode,
  type InterpolationType,
  type NetworkAuthority,
  type InterpolationConfig,
  type SyncedProperty,
  type NetworkedConfig,
} from './traits/NetworkedTrait';

// HoloScript+ Joint Trait (NEW - Phase 3: Physics)
export {
  JointTrait,
  createJointTrait,
  type JointType,
  type JointLimit,
  type JointMotor,
  type JointDrive,
  type JointSpring,
  type JointConfig,
} from './traits/JointTrait';

// HoloScript+ IK Trait (NEW - Phase 3: Animation)
export {
  IKTrait,
  createIKTrait,
  type IKSolverType,
  type BoneConstraint,
  type IKChain,
  type IKTarget,
  type IKConfig,
} from './traits/IKTrait';

// HoloScript+ Rigidbody Trait (NEW - Phase 4: Physics)
export {
  RigidbodyTrait,
  createRigidbodyTrait,
  type BodyType,
  type ForceMode,
  type CollisionDetectionMode,
  type ColliderShape,
  type ColliderConfig,
  type PhysicsMaterialConfig,
  type RigidbodyConfig,
} from './traits/RigidbodyTrait';

// HoloScript+ Trigger Trait (NEW - Phase 4: Collision)
export {
  TriggerTrait,
  createTriggerTrait,
  type TriggerShape,
  type TriggerEvent,
  type TriggerEventType,
  type TriggerAction,
  type TriggerConfig,
} from './traits/TriggerTrait';

// HoloScript+ Skeleton Trait (NEW - Phase 4: Animation)
export {
  SkeletonTrait as SkeletonAnimationTrait,
  createSkeletonTrait,
  type SkeletonRigType,
  type BlendTreeType,
  type AnimationEvent,
  type BlendTreeNode,
  type AnimationLayer,
  type HumanoidBoneMap,
  type SkeletonConfig,
} from './traits/SkeletonTrait';

// HoloScript+ Lobby Trait (NEW - Phase 4: Multiplayer)
export {
  LobbyTrait,
  createLobbyTrait,
  type LobbyState,
  type LobbyVisibility,
  type MatchmakingMode,
  type PlayerInfo,
  type TeamConfig,
  type MatchmakingConfig,
  type LobbyConfig,
} from './traits/LobbyTrait';

// HoloScript+ Dialog Trait (NEW - Phase 5: AI/NPC)
export {
  DialogTrait,
  createDialogTrait,
  type DialogNodeType,
  type DialogCondition,
  type DialogAction,
  type DialogChoice,
  type DialogNode,
  type DialogTree,
  type DialogConfig,
  type DialogState,
  type DialogEvent,
} from './traits/DialogTrait';

// HoloScript+ Voice Output Trait (NEW - Phase 5: AI/NPC)
export {
  VoiceOutputTrait,
  createVoiceOutputTrait,
  type VoiceGender,
  type VoiceSynthEngine,
  type VoiceStyle,
  type VoiceDefinition,
  type SpeechSegment,
  type SpeechRequest,
  type VoiceOutputConfig,
} from './traits/VoiceOutputTrait';

// HoloScript+ Character Trait (NEW - Phase 5: Character Controller)
export {
  CharacterTrait,
  createCharacterTrait,
  type MovementMode,
  type GroundState,
  type MovementInput,
  type GroundHit,
  type StepInfo,
  type CharacterState,
  type CharacterConfig,
} from './traits/CharacterTrait';

// HoloScript+ Morph Trait (NEW - Phase 5: Blend Shapes)
export {
  MorphTrait as BlendShapeTrait,
  createMorphTrait as createBlendShapeTrait,
  type MorphTarget as BlendShapeTarget,
  type MorphPreset as BlendShapePreset,
  type MorphKeyframe as BlendShapeKeyframe,
  type MorphClip as BlendShapeClip,
  type MorphConfig as BlendShapeConfig,
  type MorphEvent as BlendShapeEvent,
} from './traits/MorphTrait';

// HoloScript+ Animation Trait (NEW - Phase 5: Animation)
export {
  AnimationTrait,
  createAnimationTrait,
  type AnimationWrapMode,
  type AnimationBlendMode,
  type AnimationClipDef,
  type AnimationEventDef,
  type AnimationStateDef,
  type TransitionCondition,
  type AnimationTransition,
  type AnimationParameter,
  type AnimationLayer as AnimationTraitLayer,
  type AnimationEventType,
  type AnimationEvent as AnimationTraitEvent,
  type AnimationConfig,
} from './traits/AnimationTrait';

// HoloScript+ Lip Sync Trait (NEW - AI Avatar Embodiment)
export {
  LipSyncTrait,
  createLipSyncTrait,
  DEFAULT_FREQUENCY_BANDS,
  OCULUS_VISEME_MAP,
  ARKIT_MOUTH_SHAPES,
  type LipSyncMethod,
  type BlendShapeSet,
  type OculusViseme,
  type ARKitViseme,
  type VisemeTimestamp,
  type FrequencyBand,
  type LipSyncSession,
  type LipSyncEventType,
  type LipSyncEvent,
  type LipSyncConfig,
} from './traits/LipSyncTrait';

// HoloScript+ Emotion Directive Trait (NEW - AI Avatar Embodiment)
export {
  EmotionDirectiveTrait,
  createEmotionDirectiveTrait,
  DEFAULT_EXPRESSION_PRESETS,
  DEFAULT_ANIMATION_MAP,
  type ExpressionPresetName,
  type AnimationPresetName,
  type DirectiveType,
  type ConditionalDirective,
  type TriggeringDirective,
  type EmotionTaggedSegment,
  type EmotionTaggedResponse,
  type EmotionState,
  type EmotionDirectiveEventType,
  type EmotionDirectiveEvent,
  type EmotionDirectiveConfig,
} from './traits/EmotionDirectiveTrait';

// HoloScript+ Avatar Embodiment Types (NEW - AI Avatar Embodiment)
export type {
  AvatarTrackingSource,
  AvatarIKMode,
  PipelineStage,
  AvatarPersonality,
  AvatarEmbodimentConfig,
  AvatarEmbodimentState,
  AvatarEmbodimentEventType,
  AvatarEmbodimentEvent,
} from './traits/AvatarEmbodimentTrait';

// Performance Telemetry (NEW - Phase 1)
export {
  PerformanceTelemetry,
  getPerformanceTelemetry,
  type Metric,
  type MetricType,
  type SeverityLevel,
  type PerformanceBudget,
  type FrameTiming,
  type MemorySnapshot,
  type AnalyticsExporter,
} from './runtime/PerformanceTelemetry';

// Hololand Graphics Pipeline Service (NEW - Phase 4)
export {
  HololandGraphicsPipelineService,
  type MaterialAsset,
  type TextureAsset,
  type ShaderProgram,
  type PlatformConfig,
  type GPUMemoryEstimate,
  type PerformanceMetrics,
} from './services/HololandGraphicsPipelineService';

// Platform Performance Optimizer (NEW - Phase 5)
export {
  PlatformPerformanceOptimizer,
  type DeviceInfo,
  type PerformanceProfile,
  type AdaptiveQualitySettings,
  type BenchmarkResult,
  type DeviceCapabilities,
  type CompressionFormat,
  type PerformanceRecommendation,
} from './services/PlatformPerformanceOptimizer';

// Type Checker
export {
  HoloScriptTypeChecker,
  createTypeChecker,
  type TypeCheckResult,
  type TypeInfo,
  type TypeDiagnostic,
} from './HoloScriptTypeChecker';

// Debugger
export {
  HoloScriptDebugger,
  createDebugger,
  type Breakpoint,
  type StackFrame,
  type DebugState,
  type DebugEvent,
  type StepMode,
} from './HoloScriptDebugger';

// Logger
export {
  logger,
  setHoloScriptLogger,
  enableConsoleLogging,
  resetLogger,
  NoOpLogger,
  ConsoleLogger,
  type HoloScriptLogger,
} from './logger';

// Types
export type {
  // Spatial
  SpatialPosition,
  Position2D,
  Size2D,

  // Hologram
  HologramShape,
  HologramProperties,

  // Input
  VoiceCommand,
  GestureType,
  HandType,
  GestureData,

  // AST Nodes
  ASTNode,
  OrbNode,
  MethodNode,
  ParameterNode,
  ConnectionNode,
  GateNode,
  StreamNode,
  TransformationNode,
  GenericASTNode,

  // VR Types
  Vector3,
  SpatialVector3,
  Vector2,
  Color,
  Duration,
  Transform,
  VRHand,
  ThrowVelocity,
  CollisionEvent,

  // VR Traits (Core)
  GrabbableTrait,
  ThrowableTrait,
  PointableTrait,
  HoverableTrait,
  ScalableTrait,
  RotatableTrait,
  StackableTrait,
  SnappableTrait,
  BreakableTrait,
  StretchableTrait,
  MoldableTrait,

  // Humanoid/Avatar Traits
  SkeletonTrait,
  BodyTrait,
  FaceTrait,
  ExpressiveTrait,
  HairTrait,
  ClothingTrait,
  HandsTrait,
  CharacterVoiceTrait,
  LocomotionTrait,
  PoseableTrait,
  MorphTrait,

  // NetworkedTrait is exported separately with createNetworkedTrait
  ProactiveTrait,

  // Media Production Traits
  RecordableTrait,
  StreamableTrait,
  CameraTrait,
  VideoTrait,

  // Analytics & Research Traits
  TrackableTrait,
  SurveyTrait,
  ABTestTrait,
  HeatmapTrait,

  // Social & Viral Traits
  ShareableTrait,
  EmbeddableTrait,
  QRTrait,
  CollaborativeTrait,

  // Effects Traits
  ParticleTrait,
  TransitionTrait,
  FilterTrait,
  TrailTrait,

  // Audio Traits
  SpatialAudioTrait,
  VoiceTrait,
  ReactiveAudioTrait,

  // AI & Generative Traits
  NarratorTrait,
  ResponsiveTrait,
  ProceduralTrait,
  CaptionedTrait,

  // Timeline & Choreography Traits
  TimelineTrait,
  ChoreographyTrait,

  // Environment Understanding Traits
  PlaneDetectionTrait,
  MeshDetectionTrait,
  AnchorTrait,
  PersistentAnchorTrait,
  SharedAnchorTrait,
  GeospatialTrait,
  OcclusionTrait,
  LightEstimationTrait,

  // Input Modality Traits
  EyeTrackingTrait,
  HandTrackingTrait,
  ControllerTrait,
  SpatialAccessoryTrait,
  BodyTrackingTrait,
  FaceTrackingTrait,

  // Accessibility Traits
  AccessibleTrait,
  AltTextTrait,
  SpatialAudioCueTrait,
  SonificationTrait,
  HapticCueTrait,
  MagnifiableTrait,
  HighContrastTrait,
  MotionReducedTrait,
  SubtitleTrait,
  ScreenReaderTrait,

  // Gaussian Splatting & Volumetric Content Traits
  GaussianSplatTrait,
  NerfTrait,
  VolumetricVideoTrait,
  PointCloudTrait,
  PhotogrammetryTrait,

  // WebGPU Compute Traits
  ComputeTrait,
  GPUParticleTrait,
  GPUPhysicsTrait,
  GPUBufferTrait,

  // Digital Twin & IoT Traits
  SensorTrait,
  DigitalTwinTrait,
  DataBindingTrait,
  AlertTrait,
  Heatmap3DTrait,

  // Autonomous Agent Traits
  BehaviorTreeTrait,
  GoalOrientedTrait,
  LLMAgentTrait,
  MemoryTrait,
  PerceptionTrait,
  EmotionTrait,
  DialogueTrait,
  FactionTrait,
  PatrolTrait,

  // Advanced Spatial Audio Traits
  AmbisonicsTrait,
  HRTFTrait,
  ReverbZoneTrait,
  AudioOcclusionTrait,
  AudioPortalTrait,
  AudioMaterialTrait,
  HeadTrackedAudioTrait,

  // OpenUSD & Interoperability Traits
  USDTrait,
  GLTFTrait,
  FBXTrait,
  MaterialXTrait,
  SceneGraphTrait,

  // Co-Presence & Shared Experience Traits
  CoLocatedTrait,
  RemotePresenceTrait,
  SharedWorldTrait,
  VoiceProximityTrait,
  AvatarEmbodimentTrait,
  SpectatorTrait,
  RoleTrait,

  // Geospatial & AR Cloud Traits
  GeospatialAnchorTrait,
  TerrainAnchorTrait,
  RooftopAnchorTrait,
  VPSTrait,
  POITrait,

  // Web3 & Ownership Traits
  NFTTrait,
  TokenGatedTrait,
  WalletTrait,
  MarketplaceTrait,
  PortableTrait,

  // Physics Expansion Traits
  ClothTrait,
  FluidTrait,
  SoftBodyTrait,
  RopeTrait,
  ChainTrait,
  WindTrait,
  BuoyancyTrait,
  DestructionTrait,

  // Lifecycle Hooks
  AllLifecycleHooks,
  MediaLifecycleHook,
  AnalyticsLifecycleHook,
  SocialLifecycleHook,
  EffectsLifecycleHook,
  AudioLifecycleHook,
  AILifecycleHook,
  TimelineLifecycleHook,

  // Expanded Lifecycle Hooks
  EnvironmentLifecycleHook,
  InputModalityLifecycleHook,
  AccessibilityLifecycleHook,
  VolumetricLifecycleHook,
  ComputeLifecycleHook,
  DigitalTwinLifecycleHook,
  AgentLifecycleHook,
  SpatialAudioLifecycleHook,
  InteropLifecycleHook,
  CoPresenceLifecycleHook,
  GeospatialLifecycleHook,
  Web3LifecycleHook,
  PhysicsExpansionLifecycleHook,

  // Builtin Types
  RecordingClip,
  ShareContent,
  ShareResult,
  ParticleConfig,

  // Phase 2: Loop Nodes
  ForLoopNode,
  WhileLoopNode,
  ForEachLoopNode,

  // Phase 2: Module Nodes
  ImportNode,
  ExportNode,
  ImportLoader,

  // Phase 2: Variable Nodes
  VariableDeclarationNode,

  // 2D UI
  UIElementType,
  UI2DNode,
  UIStyle,

  // Runtime
  RuntimeContext,
  ExecutionResult,
  HoloScriptValue,
  ParticleSystem,

  // Config
  SecurityConfig,
  RuntimeSecurityLimits,
} from './types';

// Version
export const HOLOSCRIPT_VERSION = '1.0.0-alpha.1';

// Supported Platforms
export const HOLOSCRIPT_SUPPORTED_PLATFORMS = [
  'WebXR',
  'Oculus Quest',
  'HTC Vive',
  'Valve Index',
  'Apple Vision Pro',
  'Windows Mixed Reality',
] as const;

// Voice Commands Reference
export const HOLOSCRIPT_VOICE_COMMANDS = [
  // 3D VR Commands
  'create orb [name]',
  'summon function [name]',
  'connect [from] to [to]',
  'execute [function]',
  'debug program',
  'visualize [data]',
  'gate [condition]',
  'stream [source] through [transformations]',
  // 2D UI Commands
  'create button [name]',
  'add textinput [name]',
  'create panel [name]',
  'add slider [name]',
] as const;

// Gesture Reference
export const HOLOSCRIPT_GESTURES = [
  'pinch - create object',
  'swipe - connect objects',
  'rotate - modify properties',
  'grab - select object',
  'spread - expand view',
  'fist - execute action',
] as const;

// Demo Scripts
export const HOLOSCRIPT_DEMO_SCRIPTS = {
  helloWorld: `orb greeting {
  message: "Hello, HoloScript World!"
  color: "#00ffff"
  glow: true
}

function displayGreeting() {
  show greeting
}`,

  aiAgent: `orb agentCore {
  personality: "helpful"
  capabilities: ["conversation", "problem_solving", "learning"]
  energy: 100
}

function processQuery(query: string): string {
  analyze query
  generate response
  return response
}`,

  neuralNetwork: `orb inputLayer { neurons: 784 }
orb hiddenLayer { neurons: 128 }
orb outputLayer { neurons: 10 }

connect inputLayer to hiddenLayer as "weights"
connect hiddenLayer to outputLayer as "weights"

function trainNetwork(data: array): object {
  forward_pass data
  calculate_loss
  backward_pass
  update_weights
  return metrics
}`,

  loginForm: `button loginBtn {
  text: "Login"
  x: 100
  y: 150
  width: 200
  height: 40
  onClick: handleLogin
}

textinput usernameInput {
  placeholder: "Username"
  x: 100
  y: 50
  width: 200
  height: 36
}

textinput passwordInput {
  placeholder: "Password"
  x: 100
  y: 100
  width: 200
  height: 36
}`,

  dashboard: `panel sidebar {
  x: 0
  y: 0
  width: 200
  height: 600
  backgroundColor: "#2c3e50"
}

text title {
  content: "Dashboard"
  x: 220
  y: 20
  fontSize: 24
  color: "#34495e"
}

button refreshBtn {
  text: "Refresh Data"
  x: 220
  y: 60
  onClick: refreshData
}`,
} as const;

// Utility Functions

/**
 * Create a pre-configured HoloScript environment
 */
export function createHoloScriptEnvironment() {
  return {
    parser: new HoloScriptParser(),
    runtime: new HoloScriptRuntime(),
    version: HOLOSCRIPT_VERSION,
  };
}

/**
 * Check if the current environment supports VR/XR
 */
export function isHoloScriptSupported(): boolean {
  if (typeof globalThis === 'undefined') return false;
  const win = globalThis as { window?: { navigator?: { xr?: unknown; getVRDisplays?: unknown }; webkitGetUserMedia?: unknown } };
  if (!win.window) return false;

  return !!(
    win.window.navigator?.xr ||
    win.window.navigator?.getVRDisplays ||
    win.window.webkitGetUserMedia
  );
}

// Source Maps
export {
  SourceMapGenerator,
  SourceMapConsumer,
  combineSourceMaps,
  type SourceMap,
  type MappingSegment,
  type LineMapping,
} from './SourceMapGenerator';

// Incremental Parsing
export {
  IncrementalParser,
  createIncrementalParser,
} from './IncrementalParser';

// Tree Shaking
export {
  TreeShaker,
  treeShake,
  eliminateDeadCode,
  type TreeShakeOptions,
  type TreeShakeResult,
} from './TreeShaker';

// =============================================================================
// AI Integration (Provider-Agnostic)
// =============================================================================

export {
  // Core adapter interface
  type AIAdapter,
  type GenerateResult,
  type ExplainResult,
  type OptimizeResult,
  type FixResult,
  type GenerateOptions,

  // Registry functions
  registerAIAdapter,
  getAIAdapter,
  getDefaultAIAdapter,
  setDefaultAIAdapter,
  listAIAdapters,
  unregisterAIAdapter,

  // Convenience functions
  generateHoloScript,
  explainHoloScript,
  optimizeHoloScript,
  fixHoloScript,

  // Built-in adapters
  OpenAIAdapter,
  AnthropicAdapter,
  OllamaAdapter,
  LMStudioAdapter,
  GeminiAdapter,
  XAIAdapter,
  TogetherAdapter,
  FireworksAdapter,
  NVIDIAAdapter,

  // Semantic Search
  SemanticSearchService,
  type SearchResult,

  // Config types
  type OpenAIAdapterConfig,
  type AnthropicAdapterConfig,
  type OllamaAdapterConfig,
  type LMStudioAdapterConfig,
  type GeminiAdapterConfig,
  type XAIAdapterConfig,
  type TogetherAdapterConfig,
  type FireworksAdapterConfig,
  type NVIDIAAdapterConfig,

  // Factory functions
  useOpenAI,
  useAnthropic,
  useOllama,
  useLMStudio,
  useGemini,
  useXAI,
  useGrok,
  useTogether,
  useFireworks,
  useNVIDIA,
} from './ai';

// =============================================================================
// Asset System (Hololand Integration)
// =============================================================================

export * from './assets';

// =============================================================================
// Semantic Annotation System (Hololand Integration)
// =============================================================================

export * from './semantics';

// =============================================================================
// Hololand Runtime Integration
// =============================================================================

export * from './hololand';
