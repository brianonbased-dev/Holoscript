/**
 * Phase 6 Hololand Integration Module
 *
 * Main exports for Phase 6 trait system integration with Hololand
 * Provides interfaces, types, and factory functions
 *
 * @module phase6-hololand-integration
 */
export { HololandParserBridge, type ParserRegistrationResult, type ParserValidationError, type DeviceOptimizationContext, type CodeGenerationOptions, } from './HololandParserBridge';
export { TraitAnnotationEditor } from './TraitAnnotationEditor';
export { RealtimePreviewEngine } from './RealtimePreviewEngine';
export { TraitEditor } from './TraitEditor';
export { PreviewDashboard } from './PreviewDashboard';
export type { TraitConfig, TraitProperty, PresetDefinition } from './types';
/**
 * Phase 6 Hololand Integration Factory
 *
 * Creates a complete Phase 6 + Hololand integration setup
 */
export declare function createPhase6HololandIntegration(config: any): {
    editor: any;
    bridge: any;
    engine: any;
    generateHoloScriptPlus: (options?: any) => any;
    registerTrait: (id: string, options?: any) => any;
    validateCode: (code: string) => any;
    registerDevice: (context: any) => any;
};
