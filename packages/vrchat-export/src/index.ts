/**
 * @holoscript/vrchat-export
 *
 * Export HoloScript+ projects to VRChat/Unity with UdonSharp.
 * Bridge to bring VRChat creators to the open metaverse.
 *
 * @example
 * ```typescript
 * import { HoloScriptPlusParser } from '@holoscript/core';
 * import { exportToVRChat } from '@holoscript/vrchat-export';
 *
 * const parser = new HoloScriptPlusParser();
 * const { ast } = parser.parse(`
 *   orb#ball @grabbable @throwable {
 *     color: "#ff0000"
 *     position: [0, 1, 0]
 *   }
 * `);
 *
 * const result = await exportToVRChat(ast, {
 *   outputDir: './my-vrchat-world',
 *   projectName: 'MyWorld',
 * });
 *
 * console.log(`Exported ${result.stats.prefabCount} prefabs`);
 * console.log(`Generated ${result.stats.scriptCount} UdonSharp scripts`);
 * ```
 *
 * @version 1.0.0
 * @license MIT
 */

// Main export function
export { exportToVRChat, writeExportToFilesystem } from './exporter.js';

// Types
export type {
  VRChatExportConfig,
  VRChatExportResult,
  ExportContext,
  ExportStats,
  ExportWarning,
  ExportError,
  GeneratedFile,
  TraitMapping,
  TraitGenerator,
  UdonSharpScript,
  UdonSyncedVariable,
  UdonEventHandler,
  UdonSyncMode,
  UdonNetworkBehavior,
  UnityPrefab,
  UnityMaterial,
  UnityScene,
  UnityComponent,
  UnityGameObject,
  UnityTransform,
  UnityGUID,
  VRChatFeature,
} from './types.js';

export { DEFAULT_EXPORT_CONFIG } from './types.js';

// Generators (for advanced usage)
export {
  traitGenerators,
  generateTraitMappings,
  getRequiredFeatures,
  getRequiredComponents,
  mergePrefabModifications,
} from './generators/index.js';

export { generateGrabbable } from './generators/grabbable.js';
export { generateThrowable } from './generators/throwable.js';
export { generatePointable } from './generators/pointable.js';
export { generateHoverable } from './generators/hoverable.js';
export { generateScalable } from './generators/scalable.js';
export { generateRotatable } from './generators/rotatable.js';
export { generateStackable } from './generators/stackable.js';
export { generateSnappable } from './generators/snappable.js';
export { generateBreakable } from './generators/breakable.js';

// Unity generators (for advanced usage)
export { generateGUID, generateFileId, generateMetaFile } from './unity/guid.js';
export { generatePrefab } from './unity/prefab.js';
export { generateMaterial } from './unity/material.js';

// Templates
export { generateReadme, generateMigrationGuide } from './templates/readme.js';

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Supported HoloScript traits
 */
export const SUPPORTED_TRAITS = [
  'grabbable',
  'throwable',
  'pointable',
  'hoverable',
  'scalable',
  'rotatable',
  'stackable',
  'snappable',
  'breakable',
] as const;

/**
 * Trait to VRChat component mapping summary
 */
export const TRAIT_COMPONENT_MAP = {
  grabbable: ['VRC_Pickup', 'VRC_ObjectSync', 'Rigidbody', 'Collider'],
  throwable: ['VRC_Pickup', 'VRC_ObjectSync', 'Rigidbody', 'Collider'],
  pointable: ['Collider', 'VRC_Interactable'],
  hoverable: ['Collider'],
  scalable: ['VRC_Pickup', 'VRC_ObjectSync'],
  rotatable: ['VRC_Pickup', 'VRC_ObjectSync'],
  stackable: ['VRC_Pickup', 'VRC_ObjectSync', 'Rigidbody', 'Collider'],
  snappable: ['VRC_Pickup', 'VRC_ObjectSync', 'Rigidbody', 'Collider'],
  breakable: ['Rigidbody', 'Collider', 'AudioSource'],
} as const;
