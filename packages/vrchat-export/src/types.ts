/**
 * @holoscript/vrchat-export - Type Definitions
 *
 * Types for exporting HoloScript+ to VRChat/Unity projects with UdonSharp.
 * Part of the HoloScript open metaverse initiative.
 *
 * @version 1.0.0
 * @license MIT
 */

import type { HSPlusAST, HSPlusNode, VRTraitName } from '@holoscript/core';

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

/**
 * Main configuration for VRChat project export
 */
export interface VRChatExportConfig {
  /** Output directory for the Unity project */
  outputDir: string;

  /** Project name (used for folder naming) */
  projectName?: string;

  /** Generate Unity prefabs for each object */
  generatePrefabs?: boolean;

  /** Generate UdonSharp scripts for traits */
  generateUdonSharp?: boolean;

  /** Generate scene file */
  generateScene?: boolean;

  /** Include README with HoloScript/Hololand marketing */
  includeReadme?: boolean;

  /** Include migration guide to Hololand */
  includeMigrationGuide?: boolean;

  /** Unity version target */
  unityVersion?: '2022.3' | '2021.3' | '2019.4';

  /** VRChat SDK version */
  vrChatSdkVersion?: '3.5' | '3.4' | '3.3';

  /** Include VRChat SDK packages in manifest */
  includeVRChatPackages?: boolean;

  /** Optimization level */
  optimization?: 'none' | 'basic' | 'aggressive';

  /** Debug mode - include source comments */
  debug?: boolean;
}

/**
 * Default export configuration
 */
export const DEFAULT_EXPORT_CONFIG: Required<VRChatExportConfig> = {
  outputDir: './vrchat-export',
  projectName: 'HoloScriptWorld',
  generatePrefabs: true,
  generateUdonSharp: true,
  generateScene: true,
  includeReadme: true,
  includeMigrationGuide: true,
  unityVersion: '2022.3',
  vrChatSdkVersion: '3.5',
  includeVRChatPackages: true,
  optimization: 'basic',
  debug: false,
};

// =============================================================================
// UDON/UDONSHARP TYPES
// =============================================================================

/**
 * UdonSharp sync mode mapping
 */
export type UdonSyncMode = 'None' | 'Linear' | 'Smooth' | 'Manual';

/**
 * UdonSharp network behavior
 */
export type UdonNetworkBehavior = 'NoSerialization' | 'Continuous' | 'Manual';

/**
 * Generated UdonSharp script
 */
export interface UdonSharpScript {
  /** Script filename (without extension) */
  name: string;

  /** Full C# source code */
  source: string;

  /** Associated trait (if any) */
  trait?: VRTraitName;

  /** Required VRChat SDK components */
  requiredComponents: string[];

  /** Synced variables */
  syncedVariables: UdonSyncedVariable[];

  /** Network events */
  networkEvents: string[];

  /** Dependencies on other scripts */
  dependencies: string[];
}

/**
 * Synced variable definition for Udon networking
 */
export interface UdonSyncedVariable {
  name: string;
  type: string;
  syncMode: UdonSyncMode;
  defaultValue?: string;
}

/**
 * Udon event handler
 */
export interface UdonEventHandler {
  /** Event name (e.g., 'Interact', 'OnPickup') */
  eventName: string;

  /** Method body */
  body: string;

  /** Parameters */
  parameters?: Array<{ name: string; type: string }>;
}

// =============================================================================
// UNITY TYPES
// =============================================================================

/**
 * Unity GUID for asset references
 */
export type UnityGUID = string;

/**
 * Unity prefab structure
 */
export interface UnityPrefab {
  /** Prefab name */
  name: string;

  /** YAML content for the prefab file */
  yaml: string;

  /** GUID for cross-references */
  guid: UnityGUID;

  /** Associated meta file content */
  meta: string;

  /** Components attached */
  components: UnityComponent[];
}

/**
 * Unity component on a GameObject
 */
export interface UnityComponent {
  type: string;
  properties: Record<string, unknown>;
}

/**
 * Unity material
 */
export interface UnityMaterial {
  name: string;
  shader: string;
  properties: Record<string, unknown>;
  yaml: string;
  meta: string;
  guid: UnityGUID;
}

/**
 * Unity scene structure
 */
export interface UnityScene {
  name: string;
  yaml: string;
  meta: string;
  guid: UnityGUID;
  gameObjects: UnityGameObject[];
}

/**
 * Unity GameObject
 */
export interface UnityGameObject {
  name: string;
  fileId: number;
  transform: UnityTransform;
  components: UnityComponent[];
  children: UnityGameObject[];
}

/**
 * Unity Transform component
 */
export interface UnityTransform {
  position: [number, number, number];
  rotation: [number, number, number, number]; // Quaternion
  scale: [number, number, number];
}

// =============================================================================
// TRAIT MAPPING TYPES
// =============================================================================

/**
 * Mapping result from HoloScript trait to VRChat components
 */
export interface TraitMapping {
  /** Original HoloScript trait */
  trait: VRTraitName;

  /** VRChat/Unity components to add */
  components: string[];

  /** UdonSharp script to generate */
  udonScript?: UdonSharpScript;

  /** Additional prefab modifications */
  prefabModifications?: Record<string, unknown>;

  /** Required VRChat SDK features */
  requiredFeatures: VRChatFeature[];
}

/**
 * VRChat SDK features that may be required
 */
export type VRChatFeature =
  | 'VRC_Pickup'
  | 'VRC_ObjectSync'
  | 'VRC_Interactable'
  | 'VRC_Station'
  | 'VRC_Trigger'
  | 'VRC_ObjectPool'
  | 'UdonBehaviour';

// =============================================================================
// EXPORT RESULT TYPES
// =============================================================================

/**
 * Complete export result
 */
export interface VRChatExportResult {
  /** Whether export was successful */
  success: boolean;

  /** Output directory path */
  outputPath: string;

  /** Generated files */
  files: GeneratedFile[];

  /** Generated prefabs */
  prefabs: UnityPrefab[];

  /** Generated scripts */
  scripts: UdonSharpScript[];

  /** Generated materials */
  materials: UnityMaterial[];

  /** Generated scene (if enabled) */
  scene?: UnityScene;

  /** Warnings during export */
  warnings: ExportWarning[];

  /** Errors during export */
  errors: ExportError[];

  /** Statistics */
  stats: ExportStats;
}

/**
 * Generated file reference
 */
export interface GeneratedFile {
  /** Relative path from output directory */
  path: string;

  /** File type */
  type: 'prefab' | 'script' | 'material' | 'scene' | 'meta' | 'manifest' | 'readme' | 'other';

  /** File size in bytes */
  size: number;
}

/**
 * Export warning
 */
export interface ExportWarning {
  code: string;
  message: string;
  node?: HSPlusNode;
  suggestion?: string;
}

/**
 * Export error
 */
export interface ExportError {
  code: string;
  message: string;
  node?: HSPlusNode;
  fatal: boolean;
}

/**
 * Export statistics
 */
export interface ExportStats {
  /** Total objects exported */
  objectCount: number;

  /** Scripts generated */
  scriptCount: number;

  /** Prefabs generated */
  prefabCount: number;

  /** Materials generated */
  materialCount: number;

  /** Traits mapped */
  traitsMapped: number;

  /** Features requiring manual setup */
  manualSetupRequired: string[];

  /** Estimated Unity project size */
  estimatedSize: string;

  /** Export duration in ms */
  duration: number;
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

/**
 * Internal context passed through the export pipeline
 */
export interface ExportContext {
  config: Required<VRChatExportConfig>;
  ast: HSPlusAST;
  guidRegistry: Map<string, UnityGUID>;
  fileIdCounter: number;
  warnings: ExportWarning[];
  errors: ExportError[];
}

/**
 * Node visitor for AST traversal
 */
export type NodeVisitor = (
  node: HSPlusNode,
  context: ExportContext
) => void | Promise<void>;

/**
 * Trait generator function signature
 */
export type TraitGenerator = (
  node: HSPlusNode,
  traitConfig: Record<string, unknown>,
  context: ExportContext
) => TraitMapping;
