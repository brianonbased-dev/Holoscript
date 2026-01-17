/**
 * Hololand Graphics Bridge - Module Exports
 * Main entry point for graphics pipeline integration
 */
export { HololandGraphicsBridge, ShaderTarget, ShaderCompilationResult, ShaderReflectionData, UniformData, AttributeData, SamplerData, GraphicsMaterial, ShaderProgram, MaterialPropertyValue, TextureBinding, BlendMode, GraphicsRenderingContext, RenderingMetrics, GraphicsCompilationError, DeviceGraphicsProfile } from './HololandGraphicsBridge';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';
import { TraitAnnotationEditor } from './TraitAnnotationEditor';
import { RealtimePreviewEngine } from './RealtimePreviewEngine';
/**
 * Factory function to create Phase 6 + Graphics Bridge integration
 */
export declare function createPhase6GraphicsIntegration(config?: {
    strictMode?: boolean;
}): {
    editor: TraitAnnotationEditor;
    engine: RealtimePreviewEngine;
    bridge: HololandGraphicsBridge;
    createMaterialFromTrait: (traitId: string, deviceId: string) => import("./HololandGraphicsBridge").GraphicsMaterial;
    getMaterials: () => import("./HololandGraphicsBridge").GraphicsMaterial[];
    exportData: () => string;
    importData: (json: string) => void;
};
export { TraitAnnotationEditor } from './TraitAnnotationEditor';
export { RealtimePreviewEngine } from './RealtimePreviewEngine';
export type { TraitConfig, MaterialProperty } from './TraitAnnotationEditor';
export type { PerformanceMetrics } from './RealtimePreviewEngine';
