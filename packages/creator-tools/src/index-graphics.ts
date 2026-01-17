/**
 * Hololand Graphics Bridge - Module Exports
 * Main entry point for graphics pipeline integration
 */

export {
  HololandGraphicsBridge,
  ShaderTarget,
  ShaderCompilationResult,
  ShaderReflectionData,
  UniformData,
  AttributeData,
  SamplerData,
  GraphicsMaterial,
  ShaderProgram,
  MaterialPropertyValue,
  TextureBinding,
  BlendMode,
  GraphicsRenderingContext,
  RenderingMetrics,
  GraphicsCompilationError,
  DeviceGraphicsProfile
} from './HololandGraphicsBridge';

import { HololandGraphicsBridge } from './HololandGraphicsBridge';
import { TraitAnnotationEditor } from './TraitAnnotationEditor';
import { RealtimePreviewEngine } from './RealtimePreviewEngine';

/**
 * Factory function to create Phase 6 + Graphics Bridge integration
 */
export function createPhase6GraphicsIntegration(config?: {
  strictMode?: boolean;
}) {
  const editor = new TraitAnnotationEditor();
  const engine = new RealtimePreviewEngine();
  const bridge = new HololandGraphicsBridge(
    editor,
    engine,
    config?.strictMode ?? false
  );

  return {
    editor,
    engine,
    bridge,
    createMaterialFromTrait: (traitId: string, deviceId: string) =>
      bridge.createMaterialFromTrait(editor.getTrait(traitId)!, deviceId),
    getMaterials: () => bridge.getAllMaterials(),
    exportData: () => bridge.exportGraphicsData(),
    importData: (json: string) => bridge.importGraphicsData(json)
  };
}

// Re-export Phase 6 components for convenience
export { TraitAnnotationEditor } from './TraitAnnotationEditor';
export { RealtimePreviewEngine } from './RealtimePreviewEngine';
export type { TraitConfig, MaterialProperty } from './TraitAnnotationEditor';
export type { PerformanceMetrics } from './RealtimePreviewEngine';
