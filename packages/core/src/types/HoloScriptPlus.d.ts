/**
 * HoloScript+ Type Definitions
 *
 * Enhanced HoloScript with VR interactions, state management, and TypeScript interop.
 * Backward compatible with original HoloScript - new features are opt-in via @ directives.
 */

// Re-export all researcher/viralist traits
export * from './ResearcherViralistTraits.js';

export type Vector3 = [number, number, number];
export type Vector2 = [number, number];
export type Color = string;
export type Duration = `${number}${'ms' | 's' | 'm'}`;

export interface Transform {
  position: Vector3;
  rotation?: Vector3;
  scale?: Vector3 | number;
}

/**
 * VR interaction types
 */
export interface VRHand {
  id: 'left' | 'right';
  position: Vector3;
  rotation: Vector3;
  velocity: Vector3;
  grip: number;
  trigger: number;
}

export interface ThrowVelocity {
  direction: Vector3;
  magnitude: number;
  angularVelocity: Vector3;
}

export interface CollisionEvent {
  target: HSPlusNode;
  point: Vector3;
  normal: Vector3;
  impulse: number;
  relativeVelocity: Vector3;
}

/**
 * VR Trait Configurations
 */
export interface GrabbableTrait {
  snap_to_hand?: boolean;
  two_handed?: boolean;
  haptic_on_grab?: number;
  grab_points?: Vector3[];
  preserve_rotation?: boolean;
  distance_grab?: boolean;
  max_grab_distance?: number;
}

export interface ThrowableTrait {
  velocity_multiplier?: number;
  gravity?: boolean;
  max_velocity?: number;
  spin?: boolean;
  bounce?: boolean;
  bounce_factor?: number;
}

export interface PointableTrait {
  highlight_on_point?: boolean;
  highlight_color?: Color;
  cursor_style?: 'default' | 'pointer' | 'grab' | 'crosshair';
}

export interface HoverableTrait {
  highlight_color?: Color;
  scale_on_hover?: number;
  show_tooltip?: string | boolean;
  tooltip_offset?: Vector3;
  glow?: boolean;
  glow_intensity?: number;
}

export interface ScalableTrait {
  min_scale?: number;
  max_scale?: number;
  uniform?: boolean;
  pivot?: Vector3;
}

export interface RotatableTrait {
  axis?: 'x' | 'y' | 'z' | 'all';
  snap_angles?: number[];
  speed?: number;
}

export interface StackableTrait {
  stack_axis?: 'x' | 'y' | 'z';
  stack_offset?: number;
  max_stack?: number;
  snap_distance?: number;
}

export interface SnappableTrait {
  snap_points?: Vector3[];
  snap_distance?: number;
  snap_rotation?: boolean;
  magnetic?: boolean;
}

export interface BreakableTrait {
  break_velocity?: number;
  fragments?: number;
  fragment_mesh?: string;
  sound_on_break?: string;
  respawn?: boolean;
  respawn_delay?: Duration;
}

/**
 * @stretchable - Deformable mesh manipulation for molding, building atoms, and creative sculpting
 *
 * Use cases:
 * - Atomic/molecular building (stretch bonds between atoms)
 * - Clay/putty sculpting
 * - Elastic objects that deform under force
 * - Scientific visualization of molecular structures
 *
 * @example
 * ```holoscript
 * sphere#atom @stretchable(mode: "bond", snap_to: "atoms", elasticity: 0.8) {
 *   color: "#ff0000"
 *   @on_stretch(delta) => update_bond_visualization(delta)
 * }
 * ```
 */
export interface StretchableTrait {
  /** Stretch mode: 'free' | 'axis' | 'bond' | 'surface' | 'volume' */
  mode?: 'free' | 'axis' | 'bond' | 'surface' | 'volume';
  /** Which axis/axes to allow stretching on */
  axis?: 'x' | 'y' | 'z' | 'xy' | 'xz' | 'yz' | 'all';
  /** Minimum stretch factor (0.1 = can shrink to 10%) */
  min_stretch?: number;
  /** Maximum stretch factor (10 = can grow to 1000%) */
  max_stretch?: number;
  /** Elasticity - how much it snaps back (0 = permanent, 1 = fully elastic) */
  elasticity?: number;
  /** Snap distance for connecting to other stretchable objects */
  snap_distance?: number;
  /** Object types/tags this can snap/bond to */
  snap_to?: string | string[];
  /** Whether to preserve volume when stretching (like clay) */
  preserve_volume?: boolean;
  /** Resolution of deformation mesh (higher = smoother but more expensive) */
  mesh_resolution?: number;
  /** Haptic feedback intensity when stretching */
  haptic_feedback?: number;
  /** Sound to play while stretching */
  stretch_sound?: string;
  /** Visual indicator for stretch limits */
  show_stretch_limits?: boolean;
  /** Color gradient for stretch visualization (cold to hot) */
  stretch_colors?: [Color, Color];
  /** Whether two hands are required to stretch */
  two_handed?: boolean;
  /** Bond type for molecular building: 'single' | 'double' | 'triple' | 'ionic' */
  bond_type?: 'single' | 'double' | 'triple' | 'ionic' | 'hydrogen' | 'custom';
  /** Visual style for bonds */
  bond_style?: 'stick' | 'ball-stick' | 'space-fill' | 'wireframe';
}

/**
 * @moldable - Advanced sculpting trait for clay-like deformation
 *
 * @example
 * ```holoscript
 * mesh#clay @moldable(tool: "fingers", softness: 0.7) {
 *   @on_sculpt(region, pressure) => update_mesh(region, pressure)
 * }
 * ```
 */
export interface MoldableTrait {
  /** Sculpting tool type */
  tool?: 'fingers' | 'brush' | 'knife' | 'smooth' | 'pinch' | 'inflate';
  /** How soft/deformable the material is (0 = hard, 1 = very soft) */
  softness?: number;
  /** Brush/tool radius */
  tool_radius?: number;
  /** Pressure sensitivity multiplier */
  pressure_sensitivity?: number;
  /** Whether to enable symmetry sculpting */
  symmetry?: boolean | 'x' | 'y' | 'z';
  /** Maximum deformation depth */
  max_depth?: number;
  /** Enable undo history */
  undo_enabled?: boolean;
  /** Number of undo steps to keep */
  undo_steps?: number;
  /** Auto-smooth after sculpting */
  auto_smooth?: boolean;
  /** Material properties for rendering */
  material?: 'clay' | 'metal' | 'organic' | 'crystal';
}

// ============================================================================
// HUMANOID / AVATAR TRAITS - Building human-like features
// ============================================================================

/**
 * @skeleton - Rigging and skeletal system for humanoid characters
 *
 * @example
 * ```holoscript
 * avatar#player @skeleton(type: "humanoid", ik_enabled: true) {
 *   @on_pose_change(pose) => sync_animation(pose)
 * }
 * ```
 */
export interface SkeletonTrait {
  /** Skeleton type preset */
  type?: 'humanoid' | 'quadruped' | 'bird' | 'spider' | 'custom';
  /** Enable inverse kinematics */
  ik_enabled?: boolean;
  /** IK targets for limbs */
  ik_targets?: {
    left_hand?: string;
    right_hand?: string;
    left_foot?: string;
    right_foot?: string;
    head?: string;
    spine?: string;
  };
  /** Bone constraints */
  constraints?: Record<string, { min: Vector3; max: Vector3 }>;
  /** Root bone name */
  root_bone?: string;
  /** Enable physics-based secondary motion (hair, cloth, etc.) */
  secondary_motion?: boolean;
  /** Retargeting source for animations */
  retarget_source?: string;
}

/**
 * @body - Body configuration for humanoid avatars
 *
 * @example
 * ```holoscript
 * avatar#custom @body(preset: "athletic", height: 1.8, proportions: "realistic") {
 *   skin_tone: "#e8beac"
 *   body_type: "mesomorph"
 * }
 * ```
 */
export interface BodyTrait {
  /** Body preset */
  preset?: 'default' | 'athletic' | 'slim' | 'heavy' | 'child' | 'elderly' | 'custom';
  /** Height in meters */
  height?: number;
  /** Body proportions style */
  proportions?: 'realistic' | 'stylized' | 'cartoon' | 'chibi' | 'heroic';
  /** Body type/somatotype */
  body_type?: 'ectomorph' | 'mesomorph' | 'endomorph' | 'average';
  /** Muscle definition (0-1) */
  muscle_definition?: number;
  /** Body fat percentage visual (0-1) */
  body_fat?: number;
  /** Shoulder width multiplier */
  shoulder_width?: number;
  /** Hip width multiplier */
  hip_width?: number;
  /** Limb length multipliers */
  limb_proportions?: {
    arms?: number;
    legs?: number;
    torso?: number;
    neck?: number;
  };
  /** Gender presentation */
  gender_expression?: 'masculine' | 'feminine' | 'androgynous' | 'neutral';
  /** Age appearance (affects skin, posture, etc.) */
  apparent_age?: number;
}

/**
 * @face - Facial features and structure
 *
 * @example
 * ```holoscript
 * head#playerHead @face(shape: "oval", ethnicity_blend: ["european", "asian"]) {
 *   eye_color: "#3b7a57"
 *   @expressive(auto_blink: true, lip_sync: true)
 * }
 * ```
 */
export interface FaceTrait {
  /** Face shape preset */
  shape?: 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond' | 'triangle';
  /** Ethnicity blend for facial features (can mix multiple) */
  ethnicity_blend?: string[];
  /** Eye settings */
  eyes?: {
    shape?: 'almond' | 'round' | 'hooded' | 'monolid' | 'upturned' | 'downturned';
    color?: Color;
    size?: number;
    spacing?: number;
    iris_detail?: 'simple' | 'detailed' | 'realistic';
    heterochromia?: boolean;
    secondary_color?: Color;
  };
  /** Nose settings */
  nose?: {
    shape?: 'straight' | 'roman' | 'button' | 'aquiline' | 'flat' | 'upturned';
    width?: number;
    length?: number;
    bridge_height?: number;
  };
  /** Mouth/lips settings */
  mouth?: {
    shape?: 'thin' | 'full' | 'bow' | 'wide' | 'small';
    width?: number;
    lip_thickness?: { upper: number; lower: number };
  };
  /** Jaw and chin */
  jaw?: {
    width?: number;
    chin_shape?: 'pointed' | 'rounded' | 'square' | 'cleft';
    chin_prominence?: number;
  };
  /** Cheekbone prominence */
  cheekbones?: number;
  /** Brow settings */
  brow?: {
    thickness?: number;
    arch?: number;
    spacing?: number;
  };
  /** Ear settings */
  ears?: {
    size?: number;
    shape?: 'attached' | 'free' | 'pointed' | 'rounded';
    protrusion?: number;
  };
  /** Forehead height */
  forehead_height?: number;
  /** Facial hair (for applicable characters) */
  facial_hair?: {
    type?: 'none' | 'stubble' | 'beard' | 'mustache' | 'goatee' | 'full';
    density?: number;
    color?: Color;
    style?: string;
  };
  /** Skin details */
  skin?: {
    tone?: Color;
    texture?: 'smooth' | 'normal' | 'rough' | 'weathered';
    freckles?: number;
    moles?: Array<{ position: Vector2; size: number }>;
    wrinkles?: number;
    pores?: number;
    subsurface_scattering?: number;
  };
}

/**
 * @expressive - Facial expressions and emotion system
 *
 * @example
 * ```holoscript
 * avatar#npc @expressive(blend_shapes: true, micro_expressions: true) {
 *   @on_emotion_change(emotion) => play_expression(emotion)
 * }
 * ```
 */
export interface ExpressiveTrait {
  /** Enable blend shape morphs */
  blend_shapes?: boolean;
  /** Emotion presets available */
  emotions?: Array<'happy' | 'sad' | 'angry' | 'surprised' | 'disgusted' | 'fearful' | 'neutral' | 'contempt'>;
  /** Custom blend shape mappings */
  blend_shape_map?: Record<string, string>;
  /** Auto-blink behavior */
  auto_blink?: boolean;
  /** Blink frequency (per minute) */
  blink_rate?: number;
  /** Enable micro-expressions for realism */
  micro_expressions?: boolean;
  /** Eye movement behavior */
  eye_behavior?: {
    look_at_target?: boolean;
    saccades?: boolean;
    pupil_dilation?: boolean;
  };
  /** Lip sync configuration */
  lip_sync?: boolean | {
    method?: 'viseme' | 'phoneme' | 'ai';
    smoothing?: number;
    exaggeration?: number;
  };
  /** Breathing animation */
  breathing?: boolean;
  /** Current emotion state */
  default_emotion?: string;
  /** Emotion transition speed */
  transition_speed?: number;
}

/**
 * @hair - Hair and hairstyle system
 *
 * @example
 * ```holoscript
 * hair#playerHair @hair(style: "long_wavy", physics: true) {
 *   color: "#2c1810"
 *   highlights: "#4a3728"
 * }
 * ```
 */
export interface HairTrait {
  /** Hair style preset */
  style?: string; // 'short' | 'medium' | 'long' | 'buzz' | 'bald' | 'afro' | 'braids' | 'ponytail' | etc.
  /** Primary hair color */
  color?: Color;
  /** Highlight/secondary color */
  highlights?: Color;
  /** Hair texture */
  texture?: 'straight' | 'wavy' | 'curly' | 'coily' | 'kinky';
  /** Hair thickness/density */
  density?: number;
  /** Strand thickness */
  thickness?: number;
  /** Hair length (0-1 normalized) */
  length?: number;
  /** Enable physics simulation */
  physics?: boolean;
  /** Physics stiffness */
  stiffness?: number;
  /** Wind/movement response */
  wind_response?: number;
  /** Hair shine/specular */
  shine?: number;
  /** Render method */
  render_method?: 'cards' | 'strands' | 'mesh';
  /** LOD levels for performance */
  lod_levels?: number;
}

/**
 * @clothing - Clothing and outfit system
 *
 * @example
 * ```holoscript
 * outfit#casual @clothing(type: "full_body", physics: "cloth") {
 *   style: "casual_modern"
 *   fit: "relaxed"
 * }
 * ```
 */
export interface ClothingTrait {
  /** Clothing slot type */
  type?: 'full_body' | 'top' | 'bottom' | 'shoes' | 'accessory' | 'hat' | 'glasses' | 'jewelry';
  /** Clothing style category */
  style?: string;
  /** Fit type */
  fit?: 'tight' | 'fitted' | 'relaxed' | 'loose' | 'oversized';
  /** Primary color/material */
  color?: Color;
  /** Material type */
  material?: 'cotton' | 'silk' | 'leather' | 'denim' | 'wool' | 'synthetic' | 'metal';
  /** Physics simulation type */
  physics?: 'none' | 'cloth' | 'rigid' | 'soft_body';
  /** Cloth simulation settings */
  cloth_settings?: {
    stiffness?: number;
    damping?: number;
    collision_margin?: number;
    wind_response?: number;
  };
  /** Layer order (for layered clothing) */
  layer?: number;
  /** Body parts this hides/masks */
  masks_body?: string[];
  /** Pattern/texture overlay */
  pattern?: string;
}

/**
 * @hands - Detailed hand configuration and gestures
 *
 * @example
 * ```holoscript
 * hands#playerHands @hands(tracking: "full", gestures: true) {
 *   @on_gesture(type) => handle_gesture(type)
 * }
 * ```
 */
export interface HandsTrait {
  /** Hand tracking mode */
  tracking?: 'controller' | 'skeletal' | 'full' | 'none';
  /** Enable gesture recognition */
  gestures?: boolean;
  /** Available gestures */
  gesture_set?: Array<'point' | 'fist' | 'open' | 'pinch' | 'thumbs_up' | 'peace' | 'ok' | 'custom'>;
  /** Custom gesture definitions */
  custom_gestures?: Record<string, unknown>;
  /** Finger curl tracking precision */
  finger_precision?: 'low' | 'medium' | 'high';
  /** Hand size multiplier */
  size?: number;
  /** Nail appearance */
  nails?: {
    length?: 'short' | 'medium' | 'long';
    shape?: 'square' | 'rounded' | 'pointed' | 'almond';
    color?: Color;
  };
  /** Skin details for hands */
  skin_detail?: 'low' | 'medium' | 'high';
  /** Ring/jewelry attachment points */
  accessory_slots?: string[];
}

/**
 * @voice - Voice and speech synthesis for characters
 *
 * @example
 * ```holoscript
 * avatar#assistant @voice(type: "synthesis", voice_id: "aria") {
 *   @on_speak(text) => animate_lip_sync(text)
 * }
 * ```
 */
export interface CharacterVoiceTrait {
  /** Voice type */
  type?: 'recorded' | 'synthesis' | 'clone' | 'realtime';
  /** Voice ID for synthesis */
  voice_id?: string;
  /** Voice preset characteristics */
  preset?: 'male_deep' | 'male_tenor' | 'female_alto' | 'female_soprano' | 'child' | 'robot' | 'custom';
  /** Pitch adjustment (-1 to 1) */
  pitch?: number;
  /** Speaking rate (0.5 to 2) */
  rate?: number;
  /** Voice warmth/coldness */
  warmth?: number;
  /** Breathiness */
  breathiness?: number;
  /** Accent/dialect */
  accent?: string;
  /** Language */
  language?: string;
  /** Enable emotion in voice */
  emotional?: boolean;
  /** SSML support */
  ssml_enabled?: boolean;
}

/**
 * @locomotion - Movement and animation system
 *
 * @example
 * ```holoscript
 * avatar#player @locomotion(style: "realistic", root_motion: true) {
 *   walk_speed: 1.4
 *   run_speed: 5.0
 * }
 * ```
 */
export interface LocomotionTrait {
  /** Movement style */
  style?: 'realistic' | 'stylized' | 'robotic' | 'floaty' | 'heavy';
  /** Use root motion from animations */
  root_motion?: boolean;
  /** Walking speed (m/s) */
  walk_speed?: number;
  /** Running speed (m/s) */
  run_speed?: number;
  /** Jump height (m) */
  jump_height?: number;
  /** Turn speed (degrees/second) */
  turn_speed?: number;
  /** Acceleration */
  acceleration?: number;
  /** Enable procedural foot placement (IK) */
  foot_ik?: boolean;
  /** Terrain adaptation */
  terrain_adaptation?: boolean;
  /** Idle animations */
  idle_variations?: number;
  /** Breathing motion in idle */
  idle_breathing?: boolean;
  /** Weight shift in idle */
  weight_shift?: boolean;
  /** Stamina system */
  stamina?: {
    max?: number;
    drain_rate?: number;
    recovery_rate?: number;
  };
}

/**
 * @poseable - Manual posing system for characters
 *
 * @example
 * ```holoscript
 * avatar#model @poseable(mode: "ik", snap_to_presets: true) {
 *   @on_pose_save(pose) => save_to_library(pose)
 * }
 * ```
 */
export interface PoseableTrait {
  /** Posing mode */
  mode?: 'fk' | 'ik' | 'hybrid';
  /** Enable preset pose snapping */
  snap_to_presets?: boolean;
  /** Preset poses available */
  presets?: string[];
  /** Symmetry posing */
  symmetry?: boolean;
  /** Pin/lock specific bones */
  pinned_bones?: string[];
  /** Enable physics preview */
  physics_preview?: boolean;
  /** Pose blending between presets */
  blend_enabled?: boolean;
  /** Save custom poses */
  custom_poses?: Record<string, unknown>;
}

/**
 * @morph - Shape morphing and body customization
 *
 * @example
 * ```holoscript
 * avatar#custom @morph(targets: ["body_shape", "face_detail"]) {
 *   @on_morph_change(target, value) => update_avatar(target, value)
 * }
 * ```
 */
export interface MorphTrait {
  /** Available morph targets */
  targets?: string[];
  /** Morph target values (0-1) */
  values?: Record<string, number>;
  /** Morph presets */
  presets?: Record<string, Record<string, number>>;
  /** Enable real-time preview */
  realtime_preview?: boolean;
  /** Morph transition speed */
  transition_speed?: number;
  /** Clamp values to valid ranges */
  clamp_values?: boolean;
  /** Linked morphs (one affects another) */
  linked_morphs?: Record<string, string[]>;
}

export interface NetworkedTrait {
  sync_mode?: 'reliable' | 'unreliable' | 'state-only';
  authority?: 'client' | 'server' | 'owner';
  sync_interval?: number;
  interpolated?: boolean;
}

export interface ProactiveTrait {
  intelligence_tier?: 'basic' | 'advanced' | 'quantum';
  observation_range?: number;
  learning_rate?: number;
  auto_suggest?: boolean;
  context_window?: number;
}

/**
 * State Management
 */
export interface StateDeclaration {
  [key: string]: unknown;
}

export interface ReactiveState<T extends StateDeclaration> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  subscribe(callback: (state: T) => void): () => void;
}

/**
 * Lifecycle Hooks
 */
export type LifecycleHook = 'on_mount' | 'on_unmount' | 'on_update' | 'on_data_update';
export type VRLifecycleHook = 'on_grab' | 'on_release' | 'on_hover_enter' | 'on_hover_exit' | 'on_point_enter' | 'on_point_exit' | 'on_collision' | 'on_trigger_enter' | 'on_trigger_exit' | 'on_click' | 'on_double_click';
export type ControllerHook = 'on_controller_button' | 'on_trigger_hold' | 'on_trigger_release' | 'on_grip_hold' | 'on_grip_release';

// Media Production Hooks
export type MediaLifecycleHook = 'on_record_start' | 'on_record_stop' | 'on_record_pause' | 'on_stream_start' | 'on_stream_stop' | 'on_viewer_join' | 'on_viewer_leave' | 'on_chat_message' | 'on_camera_switch' | 'on_video_end' | 'on_video_error';

// Analytics Hooks
export type AnalyticsLifecycleHook = 'on_track_event' | 'on_survey_start' | 'on_survey_complete' | 'on_survey_skip' | 'on_variant_assigned' | 'on_conversion' | 'on_hotspot_detected';

// Social Hooks
export type SocialLifecycleHook = 'on_share' | 'on_share_complete' | 'on_embed' | 'on_scan' | 'on_user_join' | 'on_user_leave' | 'on_draw_stroke' | 'on_object_lock' | 'on_object_unlock';

// Effects Hooks
export type EffectsLifecycleHook = 'on_particle_spawn' | 'on_particle_death' | 'on_transition_start' | 'on_transition_complete' | 'on_filter_change';

// Audio Hooks
export type AudioLifecycleHook = 'on_audio_start' | 'on_audio_end' | 'on_voice_command' | 'on_speech_start' | 'on_speech_end' | 'on_beat' | 'on_frequency_peak';

// AI Hooks
export type AILifecycleHook = 'on_narration_start' | 'on_narration_end' | 'on_user_question' | 'on_response_ready' | 'on_emotion_change' | 'on_generation_complete';

// Timeline Hooks
export type TimelineLifecycleHook = 'on_timeline_start' | 'on_timeline_complete' | 'on_keyframe_hit' | 'on_keyframe_add' | 'on_beat_sync' | 'on_move_complete';

// Combined hook type for all lifecycle hooks
export type AllLifecycleHooks =
  | LifecycleHook
  | VRLifecycleHook
  | ControllerHook
  | MediaLifecycleHook
  | AnalyticsLifecycleHook
  | SocialLifecycleHook
  | EffectsLifecycleHook
  | AudioLifecycleHook
  | AILifecycleHook
  | TimelineLifecycleHook;

/**
 * AST Node Types
 */
export type HSPlusDirective =
  | { type: 'state'; body: StateDeclaration }
  | { type: 'for'; variable: string; iterable: string; body: HSPlusNode[] }
  | { type: 'forEach'; variable: string; collection: string; body: HSPlusNode[] }
  | { type: 'while'; condition: string; body: HSPlusNode[] }
  | { type: 'if'; condition: string; body: HSPlusNode[]; else?: HSPlusNode[] }
  | { type: 'import'; path: string; alias: string }
  | { type: 'lifecycle'; hook: AllLifecycleHooks; params?: string[]; body: string }
  | { type: 'trait'; name: VRTraitName; config: Record<string, unknown> }
  | { type: 'external_api'; url: string; method?: string; interval?: string }
  | { type: 'generate'; prompt: string; context?: string; target?: string };

export type VRTraitName =
  // Core VR Interaction Traits
  | 'grabbable'
  | 'throwable'
  | 'pointable'
  | 'hoverable'
  | 'scalable'
  | 'rotatable'
  | 'stackable'
  | 'snappable'
  | 'breakable'
  | 'stretchable'
  | 'moldable'
  // Humanoid/Avatar Traits
  | 'skeleton'
  | 'body'
  | 'face'
  | 'expressive'
  | 'hair'
  | 'clothing'
  | 'hands'
  | 'character_voice'
  | 'locomotion'
  | 'poseable'
  | 'morph'
  | 'networked'
  | 'proactive'
  // Media Production Traits
  | 'recordable'
  | 'streamable'
  | 'camera'
  | 'video'
  // Analytics & Research Traits
  | 'trackable'
  | 'survey'
  | 'abtest'
  | 'heatmap'
  // Social & Viral Traits
  | 'shareable'
  | 'embeddable'
  | 'qr'
  | 'collaborative'
  // Effects Traits
  | 'particle'
  | 'transition'
  | 'filter'
  | 'trail'
  // Audio Traits
  | 'spatial_audio'
  | 'voice'
  | 'reactive_audio'
  // AI & Generative Traits
  | 'narrator'
  | 'responsive'
  | 'procedural'
  | 'captioned'
  // Timeline & Choreography Traits
  | 'timeline'
  | 'choreography';

export interface HSPlusNode {
  type: string;
  id?: string;
  properties: Record<string, unknown>;
  directives: HSPlusDirective[];
  children: HSPlusNode[];
  traits: Map<VRTraitName, unknown>;
  loc?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

export interface HSPlusAST {
  version: '1.0';
  root: HSPlusNode;
  imports: Array<{ path: string; alias: string }>;
  hasState: boolean;
  hasVRTraits: boolean;
  hasControlFlow: boolean;
}

/**
 * Runtime Context
 */
export interface HSPlusRuntimeContext {
  data: unknown;
  state: ReactiveState<StateDeclaration>;
  vr: {
    hands: { left: VRHand | null; right: VRHand | null };
    headset: { position: Vector3; rotation: Vector3 };
    controllers: { left: unknown; right: unknown };
  };
  scripts: Record<string, (...args: unknown[]) => unknown>;
  builtins: HSPlusBuiltins;
}

export interface HSPlusBuiltins {
  // Core utilities
  Math: typeof Math;
  range: (start: number, end: number, step?: number) => number[];
  interpolate_color: (t: number, from: Color, to: Color) => Color;
  distance_to: (point: Vector3) => number;
  distance_to_viewer: () => number;

  // VR hand tracking
  hand_position: (handId: string) => Vector3;
  hand_velocity: (handId: string) => Vector3;
  dominant_hand: () => VRHand;

  // Audio & haptics
  play_sound: (source: string, options?: { volume?: number; spatial?: boolean }) => void;
  haptic_feedback: (hand: VRHand | string, intensity: number) => void;
  haptic_pulse: (intensity: number) => void;
  play_spatial_audio?: (sourceId: string) => void;
  stop_spatial_audio?: (sourceId: string) => void;

  // Object manipulation
  apply_velocity: (node: HSPlusNode, velocity: Vector3) => void;
  spawn: (template: string, position: Vector3) => HSPlusNode;
  destroy: (node: HSPlusNode) => void;

  // AI & generation
  assistant_generate: (prompt: string, context?: string) => void;
  generate_response?: (question: string) => Promise<string>;
  speak?: (text: string, options?: { voice?: string; emotion?: string }) => void;

  // API & networking
  api_call: (url: string, method: string, body?: unknown) => Promise<unknown>;

  // UI
  open_modal: (modalId: string) => void;
  close_modal: (modalId: string) => void;
  show_toast?: (message: string, options?: { duration?: number; type?: string }) => void;

  // Timers
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (id: number) => void;

  // === Media Production Builtins (Optional - Researcher/Viralist features) ===
  start_recording?: (options?: { format?: string; quality?: string }) => void;
  stop_recording?: () => RecordingClip;
  pause_recording?: () => void;
  resume_recording?: () => void;
  capture_screenshot?: (options?: { format?: string; resolution?: Vector2 }) => string;
  start_streaming?: (platform: string) => void;
  stop_streaming?: () => void;
  toggle_recording?: () => void;
  stop_all_recordings?: () => void;

  // === Analytics Builtins (Optional - Researcher/Viralist features) ===
  track_event?: (eventName: string, properties?: Record<string, unknown>) => void;
  track_conversion?: (experimentId: string, value?: number) => void;
  initialize_analytics?: (projectId: string) => void;
  flush_analytics?: () => void;
  sync_analytics?: () => void;
  start_heatmap_tracking?: () => void;
  stop_heatmap_tracking?: () => void;
  update_engagement_score?: () => void;

  // === Social Builtins (Optional - Researcher/Viralist features) ===
  share_to_platform?: (platform: string, content?: ShareContent) => Promise<ShareResult>;
  generate_qr?: (data: string) => string;
  send_notification?: (target: unknown, message: string) => void;
  unlock_feature?: (featureId: string) => void;

  // === Effects Builtins (Optional - Researcher/Viralist features) ===
  emit_particles?: (type: string | ParticleConfig, position: Vector3) => void;
  start_particles?: () => void;
  stop_particles?: () => void;
  start_transition?: (from: string, to: string) => void;
  apply_filter?: (filterType: string, intensity?: number) => void;
  remove_filter?: () => void;
  cycle_filter?: () => void;
  trigger_random_effect?: () => void;

  // === Timeline Builtins (Optional - Researcher/Viralist features) ===
  play_timeline?: (timelineId: string) => void;
  pause_timeline?: (timelineId: string) => void;
  seek_timeline?: (timelineId: string, time: number) => void;
  toggle_timeline_playback?: () => void;
  toggle_playback?: () => void;

  // === Collaboration Builtins (Optional - Researcher/Viralist features) ===
  save_collaboration_state?: () => void;
  broadcast_to_collaborators?: (event: string, data: unknown) => void;

  // === Navigation Builtins (Optional - Researcher/Viralist features) ===
  teleport_to?: (zoneId: string) => void;
}

// Supporting types for builtins
export interface RecordingClip {
  id: string;
  duration: number;
  format: string;
  url: string;
  thumbnail?: string;
}

export interface ShareContent {
  title?: string;
  description?: string;
  url?: string;
  media?: string;
}

export interface ShareResult {
  success: boolean;
  platform: string;
  shareUrl?: string;
  error?: string;
}

export interface ParticleConfig {
  type: string;
  rate?: number;
  color?: Color | Color[];
  size?: number;
  lifetime?: number;
}

export interface HSPlusParserOptions {
  enableVRTraits?: boolean;
  enableTypeScriptImports?: boolean;
  strict?: boolean;
  sourcePath?: string;
}

export interface HSPlusCompileResult {
  ast: HSPlusAST;
  compiledExpressions: Map<string, string>;
  requiredCompanions: string[];
  features: {
    state: boolean;
    vrTraits: boolean;
    loops: boolean;
    conditionals: boolean;
    lifecycleHooks: boolean;
  };
  warnings: Array<{ message: string; line: number; column: number }>;
  errors: Array<{ message: string; line: number; column: number }>;
}

export interface HSPlusRuntime {
  mount: (container: unknown) => void;
  unmount: () => void;
  updateData: (data: unknown) => void;
  getState: () => StateDeclaration;
  setState: (updates: Partial<StateDeclaration>) => void;
  emit: (event: string, payload?: unknown) => void;
  updateEntity: (id: string, properties: Partial<Record<string, unknown>>) => boolean;
  on: (event: string, handler: (payload: unknown) => void) => () => void;
}
