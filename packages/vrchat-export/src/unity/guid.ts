/**
 * Unity GUID Generator
 *
 * Generates deterministic GUIDs for Unity assets to ensure
 * consistent cross-references between files.
 */

/**
 * Generate a Unity-compatible GUID (32 hex characters, lowercase)
 */
export function generateGUID(seed: string): string {
  // Simple deterministic hash for consistent GUIDs
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to hex and pad
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');

  // Generate more segments from variations
  let hash2 = hash ^ 0x12345678;
  let hash3 = hash ^ 0x87654321;
  let hash4 = hash ^ 0xDEADBEEF;

  for (let i = 0; i < seed.length; i++) {
    hash2 = ((hash2 << 3) + hash2) + seed.charCodeAt(i);
    hash3 = ((hash3 << 7) - hash3) ^ seed.charCodeAt(i);
    hash4 = ((hash4 << 2) + hash4) - seed.charCodeAt(i);
  }

  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash3).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash4).toString(16).padStart(8, '0');

  return (hex1 + hex2 + hex3 + hex4).slice(0, 32).toLowerCase();
}

/**
 * Generate a Unity file ID (positive integer)
 */
let fileIdCounter = 100000;
export function generateFileId(): number {
  return fileIdCounter++;
}

/**
 * Reset file ID counter (useful for testing)
 */
export function resetFileIdCounter(start = 100000): void {
  fileIdCounter = start;
}

/**
 * Generate a meta file for a Unity asset
 */
export function generateMetaFile(guid: string, assetType: 'prefab' | 'script' | 'material' | 'scene'): string {
  const importerSettings = getImporterSettings(assetType);

  return `fileFormatVersion: 2
guid: ${guid}
${importerSettings}
`;
}

function getImporterSettings(assetType: string): string {
  switch (assetType) {
    case 'prefab':
      return `PrefabImporter:
  externalObjects: {}
  userData:
  assetBundleName:
  assetBundleVariant:`;

    case 'script':
      return `MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData:
  assetBundleName:
  assetBundleVariant:`;

    case 'material':
      return `NativeFormatImporter:
  externalObjects: {}
  mainObjectFileID: 2100000
  userData:
  assetBundleName:
  assetBundleVariant:`;

    case 'scene':
      return `DefaultImporter:
  externalObjects: {}
  userData:
  assetBundleName:
  assetBundleVariant:`;

    default:
      return `DefaultImporter:
  externalObjects: {}
  userData:
  assetBundleName:
  assetBundleVariant:`;
  }
}
