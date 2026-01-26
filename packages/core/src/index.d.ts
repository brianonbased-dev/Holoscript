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
export * from './constants';
export { HoloScriptParser } from './HoloScriptParser';
export { HoloScript2DParser } from './HoloScript2DParser';
export * from './HoloScriptValidator';
export * from './HoloScriptCodeParser';
export { HoloScriptPlusParser, createParser, parse as parseHoloScriptPlus } from './parser/HoloScriptPlusParser';
export { HoloCompositionParser, parseHolo, parseHoloStrict } from './parser/HoloCompositionParser';
export type { HoloComposition, HoloEnvironment, HoloState, HoloTemplate, HoloObjectDecl, HoloSpatialGroup, HoloLogic, HoloAction, HoloEventHandler, HoloStatement, HoloExpression, HoloImport, HoloParseResult, HoloParseError, HoloParserOptions, HoloValue, } from './parser/HoloCompositionTypes';
export { HoloScriptPlusParser as HoloScriptTraitAnnotationParser, type MaterialTraitAnnotation, type LightingTraitAnnotation, type RenderingTraitAnnotation, type GraphicsConfiguration, } from './HoloScriptPlusParser';
export type { ASTProgram, HSPlusDirective, HSPlusCompileResult, HSPlusParserOptions, HSPlusNode as HSPlusASTNode, } from './parser/HoloScriptPlusParser';
export { HoloScriptRuntime } from './HoloScriptRuntime';
export { HoloScriptPlusRuntimeImpl, createRuntime } from './runtime/HoloScriptPlusRuntime';
export type { RuntimeOptions, Renderer, NodeInstance } from './runtime/HoloScriptPlusRuntime';
export { ReactiveState, createState, reactive, effect, computed, bind } from './state/ReactiveState';
export { VRTraitRegistry, vrTraitRegistry } from './traits/VRTraitSystem';
export { VoiceInputTrait, createVoiceInputTrait, type VoiceInputConfig, type VoiceInputMode, type VoiceRecognitionResult, type VoiceInputEvent, } from './traits/VoiceInputTrait';
export { AIDriverTrait, createAIDriverTrait, BehaviorTreeRunner, GOAPPlanner, type AIDriverConfig, type DecisionMode, type BehaviorNode, type NPCContext, type NPCGoal, type BehaviorState, } from './traits/AIDriverTrait';
export { MaterialTrait, createMaterialTrait, MATERIAL_PRESETS, type MaterialType, type TextureChannel, type TextureMap, type PBRMaterial, type MaterialConfig, } from './traits/MaterialTrait';
export { LightingTrait, createLightingTrait, LIGHTING_PRESETS, type LightType, type ShadowType, type ShadowConfig, type LightSource, type GlobalIlluminationConfig, } from './traits/LightingTrait';
export { RenderingTrait, createRenderingTrait, type CullingMode, type LodStrategy, type GPUResourceTier, type LODLevel, type CullingConfig, type BatchingConfig, type TextureOptimization, type ShaderOptimization, type RenderingOptimization, } from './traits/RenderingTrait';
export { ShaderTrait, createShaderTrait, SHADER_PRESETS, SHADER_CHUNKS, type ShaderType, type UniformType, type UniformValue, type UniformDefinition, type ShaderChunk, type InlineShader, type ShaderConfig, } from './traits/ShaderTrait';
export { NetworkedTrait, createNetworkedTrait, type SyncMode, type InterpolationType, type NetworkAuthority, type InterpolationConfig, type SyncedProperty, type NetworkedConfig, } from './traits/NetworkedTrait';
export { JointTrait, createJointTrait, type JointType, type JointLimit, type JointMotor, type JointDrive, type JointSpring, type JointConfig, } from './traits/JointTrait';
export { IKTrait, createIKTrait, type IKSolverType, type BoneConstraint, type IKChain, type IKTarget, type IKConfig, } from './traits/IKTrait';
export { RigidbodyTrait, createRigidbodyTrait, type BodyType, type ForceMode, type CollisionDetectionMode, type ColliderShape, type ColliderConfig, type PhysicsMaterialConfig, type RigidbodyConfig, } from './traits/RigidbodyTrait';
export { TriggerTrait, createTriggerTrait, type TriggerShape, type TriggerEvent, type TriggerEventType, type TriggerAction, type TriggerConfig, } from './traits/TriggerTrait';
export { SkeletonTrait as SkeletonAnimationTrait, createSkeletonTrait, type SkeletonRigType, type BlendTreeType, type AnimationEvent, type BlendTreeNode, type AnimationLayer, type HumanoidBoneMap, type SkeletonConfig, } from './traits/SkeletonTrait';
export { LobbyTrait, createLobbyTrait, type LobbyState, type LobbyVisibility, type MatchmakingMode, type PlayerInfo, type TeamConfig, type MatchmakingConfig, type LobbyConfig, } from './traits/LobbyTrait';
export { DialogTrait, createDialogTrait, type DialogNodeType, type DialogCondition, type DialogAction, type DialogChoice, type DialogNode, type DialogTree, type DialogConfig, type DialogState, type DialogEvent, } from './traits/DialogTrait';
export { VoiceOutputTrait, createVoiceOutputTrait, type VoiceGender, type VoiceSynthEngine, type VoiceStyle, type VoiceDefinition, type SpeechSegment, type SpeechRequest, type VoiceOutputConfig, } from './traits/VoiceOutputTrait';
export { CharacterTrait, createCharacterTrait, type MovementMode, type GroundState, type MovementInput, type GroundHit, type StepInfo, type CharacterState, type CharacterConfig, } from './traits/CharacterTrait';
export { MorphTrait as BlendShapeTrait, createMorphTrait as createBlendShapeTrait, type MorphTarget as BlendShapeTarget, type MorphPreset as BlendShapePreset, type MorphKeyframe as BlendShapeKeyframe, type MorphClip as BlendShapeClip, type MorphConfig as BlendShapeConfig, type MorphEvent as BlendShapeEvent, } from './traits/MorphTrait';
export { AnimationTrait, createAnimationTrait, type AnimationWrapMode, type AnimationBlendMode, type AnimationClipDef, type AnimationEventDef, type AnimationStateDef, type TransitionCondition, type AnimationTransition, type AnimationParameter, type AnimationLayer as AnimationTraitLayer, type AnimationEventType, type AnimationEvent as AnimationTraitEvent, type AnimationConfig, } from './traits/AnimationTrait';
export { PerformanceTelemetry, getPerformanceTelemetry, type Metric, type MetricType, type SeverityLevel, type PerformanceBudget, type FrameTiming, type MemorySnapshot, type AnalyticsExporter, } from './runtime/PerformanceTelemetry';
export { HololandGraphicsPipelineService, type MaterialAsset, type TextureAsset, type ShaderProgram, type PlatformConfig, type GPUMemoryEstimate, type PerformanceMetrics, } from './services/HololandGraphicsPipelineService';
export { PlatformPerformanceOptimizer, type DeviceInfo, type PerformanceProfile, type AdaptiveQualitySettings, type BenchmarkResult, type DeviceCapabilities, type CompressionFormat, type PerformanceRecommendation, } from './services/PlatformPerformanceOptimizer';
export { HoloScriptTypeChecker, createTypeChecker, type TypeCheckResult, type TypeInfo, type TypeDiagnostic, } from './HoloScriptTypeChecker';
export { HoloScriptDebugger, createDebugger, type Breakpoint, type StackFrame, type DebugState, type DebugEvent, type StepMode, } from './HoloScriptDebugger';
export { logger, setHoloScriptLogger, enableConsoleLogging, resetLogger, NoOpLogger, ConsoleLogger, type HoloScriptLogger, } from './logger';
export type { SpatialPosition, Position2D, Size2D, HologramShape, HologramProperties, VoiceCommand, GestureType, HandType, GestureData, ASTNode, OrbNode, MethodNode, ParameterNode, ConnectionNode, GateNode, StreamNode, TransformationNode, GenericASTNode, Vector3, SpatialVector3, Vector2, Color, Duration, Transform, VRHand, ThrowVelocity, CollisionEvent, GrabbableTrait, ThrowableTrait, PointableTrait, HoverableTrait, ScalableTrait, RotatableTrait, StackableTrait, SnappableTrait, BreakableTrait, StretchableTrait, MoldableTrait, SkeletonTrait, BodyTrait, FaceTrait, ExpressiveTrait, HairTrait, ClothingTrait, HandsTrait, CharacterVoiceTrait, LocomotionTrait, PoseableTrait, MorphTrait, ProactiveTrait, RecordableTrait, StreamableTrait, CameraTrait, VideoTrait, TrackableTrait, SurveyTrait, ABTestTrait, HeatmapTrait, ShareableTrait, EmbeddableTrait, QRTrait, CollaborativeTrait, ParticleTrait, TransitionTrait, FilterTrait, TrailTrait, SpatialAudioTrait, VoiceTrait, ReactiveAudioTrait, NarratorTrait, ResponsiveTrait, ProceduralTrait, CaptionedTrait, TimelineTrait, ChoreographyTrait, AllLifecycleHooks, MediaLifecycleHook, AnalyticsLifecycleHook, SocialLifecycleHook, EffectsLifecycleHook, AudioLifecycleHook, AILifecycleHook, TimelineLifecycleHook, RecordingClip, ShareContent, ShareResult, ParticleConfig, ForLoopNode, WhileLoopNode, ForEachLoopNode, ImportNode, ExportNode, ImportLoader, VariableDeclarationNode, UIElementType, UI2DNode, UIStyle, RuntimeContext, ExecutionResult, HoloScriptValue, ParticleSystem, SecurityConfig, RuntimeSecurityLimits, } from './types';
export declare const HOLOSCRIPT_VERSION = "1.0.0-alpha.1";
export declare const HOLOSCRIPT_SUPPORTED_PLATFORMS: readonly ["WebXR", "Oculus Quest", "HTC Vive", "Valve Index", "Apple Vision Pro", "Windows Mixed Reality"];
export declare const HOLOSCRIPT_VOICE_COMMANDS: readonly ["create orb [name]", "summon function [name]", "connect [from] to [to]", "execute [function]", "debug program", "visualize [data]", "gate [condition]", "stream [source] through [transformations]", "create button [name]", "add textinput [name]", "create panel [name]", "add slider [name]"];
export declare const HOLOSCRIPT_GESTURES: readonly ["pinch - create object", "swipe - connect objects", "rotate - modify properties", "grab - select object", "spread - expand view", "fist - execute action"];
export declare const HOLOSCRIPT_DEMO_SCRIPTS: {
    readonly helloWorld: "orb greeting {\n  message: \"Hello, HoloScript World!\"\n  color: \"#00ffff\"\n  glow: true\n}\n\nfunction displayGreeting() {\n  show greeting\n}";
    readonly aiAgent: "orb agentCore {\n  personality: \"helpful\"\n  capabilities: [\"conversation\", \"problem_solving\", \"learning\"]\n  energy: 100\n}\n\nfunction processQuery(query: string): string {\n  analyze query\n  generate response\n  return response\n}";
    readonly neuralNetwork: "orb inputLayer { neurons: 784 }\norb hiddenLayer { neurons: 128 }\norb outputLayer { neurons: 10 }\n\nconnect inputLayer to hiddenLayer as \"weights\"\nconnect hiddenLayer to outputLayer as \"weights\"\n\nfunction trainNetwork(data: array): object {\n  forward_pass data\n  calculate_loss\n  backward_pass\n  update_weights\n  return metrics\n}";
    readonly loginForm: "button loginBtn {\n  text: \"Login\"\n  x: 100\n  y: 150\n  width: 200\n  height: 40\n  onClick: handleLogin\n}\n\ntextinput usernameInput {\n  placeholder: \"Username\"\n  x: 100\n  y: 50\n  width: 200\n  height: 36\n}\n\ntextinput passwordInput {\n  placeholder: \"Password\"\n  x: 100\n  y: 100\n  width: 200\n  height: 36\n}";
    readonly dashboard: "panel sidebar {\n  x: 0\n  y: 0\n  width: 200\n  height: 600\n  backgroundColor: \"#2c3e50\"\n}\n\ntext title {\n  content: \"Dashboard\"\n  x: 220\n  y: 20\n  fontSize: 24\n  color: \"#34495e\"\n}\n\nbutton refreshBtn {\n  text: \"Refresh Data\"\n  x: 220\n  y: 60\n  onClick: refreshData\n}";
};
/**
 * Create a pre-configured HoloScript environment
 */
export declare function createHoloScriptEnvironment(): {
    parser: any;
    runtime: any;
    version: string;
};
/**
 * Check if the current environment supports VR/XR
 */
export declare function isHoloScriptSupported(): boolean;
export { SourceMapGenerator, SourceMapConsumer, combineSourceMaps, type SourceMap, type MappingSegment, type LineMapping, } from './SourceMapGenerator';
export { IncrementalParser, createIncrementalParser, } from './IncrementalParser';
export { TreeShaker, treeShake, eliminateDeadCode, type TreeShakeOptions, type TreeShakeResult, } from './TreeShaker';
export { type AIAdapter, type GenerateResult, type ExplainResult, type OptimizeResult, type FixResult, type GenerateOptions, registerAIAdapter, getAIAdapter, getDefaultAIAdapter, setDefaultAIAdapter, listAIAdapters, unregisterAIAdapter, generateHoloScript, explainHoloScript, optimizeHoloScript, fixHoloScript, OpenAIAdapter, AnthropicAdapter, OllamaAdapter, LMStudioAdapter, type OpenAIAdapterConfig, type AnthropicAdapterConfig, type OllamaAdapterConfig, type LMStudioAdapterConfig, useOpenAI, useAnthropic, useOllama, useLMStudio, } from './ai';
//# sourceMappingURL=index.d.ts.map