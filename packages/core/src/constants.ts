// Shared Constants for HoloScript Core
// Used by Parser, Runtime, and Language Server

export const VR_TRAITS = [
  // Core VR Interaction Traits
  'grabbable',
  'throwable',
  'pointable',
  'hoverable',
  'scalable',
  'rotatable',
  'stackable',
  'snappable',
  'breakable',
  'stretchable',
  'moldable',

  // Humanoid/Avatar Traits
  'skeleton',
  'body',
  'face',
  'expressive',
  'hair',
  'clothing',
  'hands',
  'character_voice',
  'locomotion',
  'poseable',
  'morph',

  // Networking & AI
  'networked',
  'proactive',
  'ai_driven',
  'agent_protocol',

  // Media Production Traits
  'recordable',
  'streamable',
  'camera',
  'video',

  // Analytics & Research Traits
  'trackable',
  'survey',
  'abtest',
  'heatmap',

  // Social & Viral Traits
  'shareable',
  'embeddable',
  'qr',
  'collaborative',

  // Effects Traits
  'particle',
  'transition',
  'filter',
  'trail',

  // Audio Traits
  'spatial_audio',
  'voice',
  'reactive_audio',

  // AI & Generative Traits
  'narrator',
  'responsive',
  'procedural',
  'captioned',

  // Timeline & Choreography Traits
  'timeline',
  'choreography',

  // Environment Understanding Traits
  'plane_detection',
  'mesh_detection',
  'anchor',
  'persistent_anchor',
  'shared_anchor',
  'geospatial',
  'occlusion',
  'light_estimation',

  // Input Modality Traits
  'eye_tracking',
  'hand_tracking',
  'controller',
  'spatial_accessory',
  'body_tracking',
  'face_tracking',
  'haptic',

  // Accessibility Traits
  'accessible',
  'alt_text',
  'spatial_audio_cue',
  'sonification',
  'haptic_cue',
  'magnifiable',
  'high_contrast',
  'motion_reduced',
  'subtitle',
  'screen_reader',

  // Gaussian Splatting & Volumetric Content Traits
  'gaussian_splat',
  'nerf',
  'volumetric_video',
  'point_cloud',
  'photogrammetry',

  // WebGPU Compute Traits
  'compute',
  'gpu_particle',
  'gpu_physics',
  'gpu_buffer',

  // Digital Twin & IoT Traits
  'sensor',
  'digital_twin',
  'data_binding',
  'alert',
  'heatmap_3d',

  // Autonomous Agent Traits
  'behavior_tree',
  'goal_oriented',
  'llm_agent',
  'memory',
  'perception',
  'emotion',
  'dialogue',
  'faction',
  'patrol',

  // Advanced Spatial Audio Traits
  'ambisonics',
  'hrtf',
  'reverb_zone',
  'audio_occlusion',
  'audio_portal',
  'audio_material',
  'head_tracked_audio',

  // OpenUSD & Interoperability Traits
  'usd',
  'gltf',
  'fbx',
  'material_x',
  'scene_graph',

  // Co-Presence & Shared Experience Traits
  'co_located',
  'remote_presence',
  'shared_world',
  'voice_proximity',
  'avatar_embodiment',
  'lip_sync',
  'emotion_directive',
  'stt',
  'tts',
  'spectator',
  'role',

  // Geospatial & AR Cloud Traits
  'geospatial_anchor',
  'terrain_anchor',
  'rooftop_anchor',
  'vps',
  'poi',

  // Web3 & Ownership Traits
  'nft',
  'token_gated',
  'wallet',
  'marketplace',
  'portable',

  // Physics Expansion Traits
  'cloth',
  'fluid',
  'soft_body',
  'rope',
  'chain',
  'wind',
  'buoyancy',
  'destruction',

  // Simple Modifier Traits
  'animated',
  'billboard',
  'rotating',
  'collidable',
  'clickable',
  'glowing',
  'interactive',
  'lod',
] as const;

export type VRTraitName = (typeof VR_TRAITS)[number];

// ============================================================================
// Structural Directives (non-trait directives that define blocks)
// ============================================================================

export const STRUCTURAL_DIRECTIVES = [
  // Asset & Manifest
  'manifest',
  'asset',
  // Semantic Annotations
  'semantic',
  'annotate',
  'semantic_ref',
  'bindings',
  'artwork_metadata',
  'npc_behavior',
  // World Definition
  'world_metadata',
  'world_config',
  'zones',
  'spawn_points',
  // Environment Lighting
  'skybox',
  'ambient_light',
  'directional_light',
  'fog',
] as const;

export type StructuralDirectiveName = (typeof STRUCTURAL_DIRECTIVES)[number];

export const LIFECYCLE_HOOKS = [
  // Standard lifecycle
  'on_mount',
  'on_unmount',
  'on_update',
  'on_data_update',

  // VR lifecycle
  'on_grab',
  'on_release',
  'on_hover_enter',
  'on_hover_exit',
  'on_point_enter',
  'on_point_exit',
  'on_collision',
  'on_trigger_enter',
  'on_trigger_exit',
  'on_click',
  'on_double_click',

  // Controller hooks
  'on_controller_button',
  'on_trigger_hold',
  'on_trigger_release',
  'on_grip_hold',
  'on_grip_release',

  // Stretchable/Moldable hooks
  'on_stretch',
  'on_sculpt',

  // Humanoid/Avatar hooks
  'on_pose_change',
  'on_expression_change',
  'on_gesture',
  'on_speak',
  'on_pose_save',
  'on_morph_change',

  // Media Production hooks
  'on_record_start',
  'on_record_stop',
  'on_record_pause',
  'on_stream_start',
  'on_stream_stop',
  'on_viewer_join',
  'on_viewer_leave',
  'on_chat_message',
  'on_camera_switch',
  'on_video_end',
  'on_video_error',

  // Analytics hooks
  'on_track_event',
  'on_survey_start',
  'on_survey_complete',
  'on_survey_skip',
  'on_variant_assigned',
  'on_conversion',
  'on_hotspot_detected',

  // Social hooks
  'on_share',
  'on_share_complete',
  'on_embed',
  'on_scan',
  'on_user_join',
  'on_user_leave',
  'on_draw_stroke',
  'on_object_lock',
  'on_object_unlock',

  // Effects hooks
  'on_particle_spawn',
  'on_particle_death',
  'on_transition_start',
  'on_transition_complete',
  'on_filter_change',

  // Audio hooks
  'on_audio_start',
  'on_audio_end',
  'on_voice_command',
  'on_speech_start',
  'on_speech_end',
  'on_beat',
  'on_frequency_peak',

  // AI hooks
  'on_narration_start',
  'on_narration_end',
  'on_user_question',
  'on_response_ready',
  'on_emotion_change',
  'on_generation_complete',

  // Timeline hooks
  'on_timeline_start',
  'on_timeline_complete',
  'on_keyframe_hit',
  'on_keyframe_add',
  'on_beat_sync',
  'on_move_complete',

  // Environment Understanding hooks
  'on_plane_detected',
  'on_plane_lost',
  'on_plane_updated',
  'on_mesh_detected',
  'on_mesh_updated',
  'on_anchor_created',
  'on_anchor_resolved',
  'on_anchor_lost',
  'on_anchor_shared',
  'on_light_estimated',
  'on_occlusion_updated',

  // Input Modality hooks
  'on_gaze_enter',
  'on_gaze_exit',
  'on_gaze_dwell',
  'on_hand_gesture',
  'on_hand_pinch',
  'on_hand_lost',
  'on_body_pose_update',
  'on_face_expression',
  'on_controller_vibrate',
  'on_accessory_input',

  // Accessibility hooks
  'on_accessibility_announce',
  'on_subtitle_display',
  'on_magnify',
  'on_contrast_change',
  'on_motion_reduce',
  'on_screen_reader_focus',
  'on_sonification_update',

  // Gaussian Splatting & Volumetric hooks
  'on_splat_loaded',
  'on_nerf_ready',
  'on_volume_frame',
  'on_point_cloud_loaded',
  'on_capture_complete',

  // WebGPU Compute hooks
  'on_compute_complete',
  'on_buffer_ready',
  'on_gpu_error',

  // Digital Twin & IoT hooks
  'on_sensor_update',
  'on_data_change',
  'on_alert_triggered',
  'on_twin_sync',
  'on_heatmap_update',

  // Autonomous Agent hooks
  'on_goal_completed',
  'on_goal_failed',
  'on_perception_change',
  'on_emotion_shift',
  'on_faction_change',
  'on_patrol_waypoint',
  'on_llm_response',
  'on_memory_recalled',
  'on_dialogue_start',
  'on_dialogue_end',

  // Advanced Spatial Audio hooks
  'on_reverb_enter',
  'on_reverb_exit',
  'on_audio_occluded',
  'on_audio_portal_enter',

  // OpenUSD & Interoperability hooks
  'on_asset_loaded',
  'on_format_converted',
  'on_scene_composed',

  // Co-Presence & Shared Experience hooks
  'on_co_presence_joined',
  'on_co_presence_left',
  'on_voice_proximity_change',
  'on_role_change',
  'on_spectator_join',
  'on_avatar_sync',

  // Geospatial & AR Cloud hooks
  'on_vps_localized',
  'on_poi_proximity',
  'on_terrain_resolved',
  'on_rooftop_resolved',

  // Web3 & Ownership hooks
  'on_wallet_connected',
  'on_token_verified',
  'on_nft_transferred',
  'on_purchase_complete',
  'on_asset_ported',

  // Physics Expansion hooks
  'on_cloth_tear',
  'on_fluid_splash',
  'on_soft_body_deform',
  'on_rope_snap',
  'on_wind_change',
  'on_submerge',
  'on_destruction_complete',
] as const;

export type LifecycleHookName = typeof LIFECYCLE_HOOKS[number];
