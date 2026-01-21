/**
 * VRChat Export Pipeline
 *
 * Main orchestrator for converting HoloScript AST to VRChat/Unity project.
 */

import type { HSPlusAST, HSPlusNode } from '@holoscript/core';
import type {
  VRChatExportConfig,
  VRChatExportResult,
  ExportContext,
  ExportStats,
  GeneratedFile,
  UnityPrefab,
  UnityMaterial,
  UdonSharpScript,
  TraitMapping,
} from './types.js';
import { DEFAULT_EXPORT_CONFIG } from './types.js';
import { generateTraitMappings } from './generators/index.js';
import { generatePrefab } from './unity/prefab.js';
import { generateMaterial } from './unity/material.js';
import { resetFileIdCounter } from './unity/guid.js';
import { generateReadme, generateMigrationGuide } from './templates/readme.js';

/**
 * Main export function - converts HoloScript AST to VRChat project
 */
export async function exportToVRChat(
  ast: HSPlusAST,
  config: Partial<VRChatExportConfig> = {}
): Promise<VRChatExportResult> {
  const startTime = Date.now();

  // Merge with defaults
  const fullConfig: Required<VRChatExportConfig> = {
    ...DEFAULT_EXPORT_CONFIG,
    ...config,
  };

  // Initialize context
  const context: ExportContext = {
    config: fullConfig,
    ast,
    guidRegistry: new Map(),
    fileIdCounter: 100000,
    warnings: [],
    errors: [],
  };

  // Reset file ID counter for deterministic output
  resetFileIdCounter();

  // Collect results
  const files: GeneratedFile[] = [];
  const prefabs: UnityPrefab[] = [];
  const scripts: UdonSharpScript[] = [];
  const materials: UnityMaterial[] = [];
  const manualSetupRequired: string[] = [];

  // Process all nodes in the AST
  const allNodes = collectNodes(ast.root);

  for (const node of allNodes) {
    // Generate trait mappings
    const traitMappings = generateTraitMappings(node, context);

    // Generate prefab if the node has traits or properties
    if (traitMappings.length > 0 || hasVisibleProperties(node)) {
      // Generate prefab
      if (fullConfig.generatePrefabs) {
        const prefab = generatePrefab(node, traitMappings, context);
        prefabs.push(prefab);
        files.push({
          path: `Assets/Prefabs/${prefab.name}.prefab`,
          type: 'prefab',
          size: prefab.yaml.length,
        });
        files.push({
          path: `Assets/Prefabs/${prefab.name}.prefab.meta`,
          type: 'meta',
          size: prefab.meta.length,
        });
      }

      // Generate UdonSharp scripts
      if (fullConfig.generateUdonSharp) {
        for (const mapping of traitMappings) {
          if (mapping.udonScript) {
            scripts.push(mapping.udonScript);
            files.push({
              path: `Assets/Scripts/${mapping.udonScript.name}.cs`,
              type: 'script',
              size: mapping.udonScript.source.length,
            });

            // Check for manual setup requirements
            if (mapping.trait === 'breakable') {
              manualSetupRequired.push(
                `@breakable on "${node.id}": Create fragment objects and assign to fragmentPool array`
              );
            }
            if (mapping.trait === 'snappable') {
              const snapConfig = node.traits?.get('snappable') as Record<string, unknown> | undefined;
              if (!snapConfig?.snap_points || (snapConfig.snap_points as unknown[]).length === 0) {
                manualSetupRequired.push(
                  `@snappable on "${node.id}": Define snap points in inspector or create child Transform objects`
                );
              }
            }
          }
        }
      }

      // Generate material if node has color
      if (node.properties.color) {
        const materialName = `${node.id || 'Object'}_Material`;
        const glow = node.properties.glow as boolean | undefined;
        const glowIntensity = node.properties.glow_intensity as number | undefined;
        const material = generateMaterial(
          materialName,
          node.properties.color as string,
          glow,
          glowIntensity,
          fullConfig.projectName
        );
        materials.push(material);
        files.push({
          path: `Assets/Materials/${materialName}.mat`,
          type: 'material',
          size: material.yaml.length,
        });
        files.push({
          path: `Assets/Materials/${materialName}.mat.meta`,
          type: 'meta',
          size: material.meta.length,
        });
      }
    }
  }

  // Generate project structure files
  const manifestContent = generatePackageManifest(fullConfig);
  files.push({
    path: 'Packages/manifest.json',
    type: 'manifest',
    size: manifestContent.length,
  });

  // Generate README
  const stats: ExportStats = {
    objectCount: allNodes.length,
    scriptCount: scripts.length,
    prefabCount: prefabs.length,
    materialCount: materials.length,
    traitsMapped: scripts.length,
    manualSetupRequired,
    estimatedSize: formatBytes(files.reduce((sum, f) => sum + f.size, 0)),
    duration: Date.now() - startTime,
  };

  if (fullConfig.includeReadme) {
    const readme = generateReadme(fullConfig.projectName, fullConfig, stats);
    files.push({
      path: 'README.md',
      type: 'readme',
      size: readme.length,
    });
  }

  if (fullConfig.includeMigrationGuide) {
    const guide = generateMigrationGuide();
    files.push({
      path: 'MIGRATION_GUIDE.md',
      type: 'readme',
      size: guide.length,
    });
  }

  return {
    success: context.errors.filter(e => e.fatal).length === 0,
    outputPath: fullConfig.outputDir,
    files,
    prefabs,
    scripts,
    materials,
    warnings: context.warnings,
    errors: context.errors,
    stats,
  };
}

/**
 * Collect all nodes from AST recursively
 */
function collectNodes(node: HSPlusNode): HSPlusNode[] {
  const nodes: HSPlusNode[] = [node];

  for (const child of node.children) {
    nodes.push(...collectNodes(child));
  }

  return nodes;
}

/**
 * Check if node has visible properties (should generate prefab)
 */
function hasVisibleProperties(node: HSPlusNode): boolean {
  const visibleProps = ['color', 'position', 'scale', 'rotation', 'mesh', 'model'];
  return visibleProps.some(prop => node.properties[prop] !== undefined);
}

/**
 * Generate Unity package manifest
 */
function generatePackageManifest(config: Required<VRChatExportConfig>): string {
  const manifest: Record<string, unknown> = {
    dependencies: {
      'com.unity.textmeshpro': '3.0.6',
      'com.unity.timeline': '1.7.5',
    },
  };

  if (config.includeVRChatPackages) {
    (manifest.dependencies as Record<string, string>)['com.vrchat.worlds'] = '3.5.0';
  }

  return JSON.stringify(manifest, null, 2);
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Write export result to filesystem
 */
export async function writeExportToFilesystem(
  result: VRChatExportResult,
  fs: {
    mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
    writeFile: (path: string, content: string) => Promise<void>;
  }
): Promise<void> {
  const { outputPath, prefabs, scripts, materials, files } = result;

  // Create directory structure
  await fs.mkdir(`${outputPath}/Assets/Prefabs`, { recursive: true });
  await fs.mkdir(`${outputPath}/Assets/Scripts`, { recursive: true });
  await fs.mkdir(`${outputPath}/Assets/Materials`, { recursive: true });
  await fs.mkdir(`${outputPath}/Assets/Scenes`, { recursive: true });
  await fs.mkdir(`${outputPath}/Packages`, { recursive: true });

  // Write prefabs
  for (const prefab of prefabs) {
    await fs.writeFile(`${outputPath}/Assets/Prefabs/${prefab.name}.prefab`, prefab.yaml);
    await fs.writeFile(`${outputPath}/Assets/Prefabs/${prefab.name}.prefab.meta`, prefab.meta);
  }

  // Write scripts
  for (const script of scripts) {
    await fs.writeFile(`${outputPath}/Assets/Scripts/${script.name}.cs`, script.source);
  }

  // Write materials
  for (const material of materials) {
    await fs.writeFile(`${outputPath}/Assets/Materials/${material.name}.mat`, material.yaml);
    await fs.writeFile(`${outputPath}/Assets/Materials/${material.name}.mat.meta`, material.meta);
  }

  // Write other files (README, manifest, etc.)
  const readmeFile = files.find(f => f.path === 'README.md');
  if (readmeFile) {
    const config = result.stats as unknown as { projectName: string };
    const readme = generateReadme(
      config.projectName || 'HoloScriptWorld',
      {} as VRChatExportConfig,
      result.stats
    );
    await fs.writeFile(`${outputPath}/README.md`, readme);
  }

  const migrationFile = files.find(f => f.path === 'MIGRATION_GUIDE.md');
  if (migrationFile) {
    await fs.writeFile(`${outputPath}/MIGRATION_GUIDE.md`, generateMigrationGuide());
  }

  // Write manifest
  const manifestFile = files.find(f => f.path === 'Packages/manifest.json');
  if (manifestFile) {
    await fs.writeFile(
      `${outputPath}/Packages/manifest.json`,
      generatePackageManifest({} as Required<VRChatExportConfig>)
    );
  }
}

export default exportToVRChat;
