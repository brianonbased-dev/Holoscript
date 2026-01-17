/**
 * Phase 6 Hololand Integration Module
 *
 * Main exports for Phase 6 trait system integration with Hololand
 * Provides interfaces, types, and factory functions
 *
 * @module phase6-hololand-integration
 */
export { HololandParserBridge, } from './HololandParserBridge';
export { TraitAnnotationEditor } from './TraitAnnotationEditor';
export { RealtimePreviewEngine } from './RealtimePreviewEngine';
export { TraitEditor } from './TraitEditor';
export { PreviewDashboard } from './PreviewDashboard';
/**
 * Phase 6 Hololand Integration Factory
 *
 * Creates a complete Phase 6 + Hololand integration setup
 */
export function createPhase6HololandIntegration(config) {
    const editor = new TraitAnnotationEditor(config);
    const bridge = new HololandParserBridge(editor);
    const engine = new RealtimePreviewEngine();
    return {
        editor,
        bridge,
        engine,
        generateHoloScriptPlus: (options) => bridge.generateHoloScriptPlusCode(options),
        registerTrait: (id, options) => bridge.registerTraitWithParser(id, options),
        validateCode: (code) => bridge.validateHoloScriptPlus(code),
        registerDevice: (context) => bridge.registerDevice(context),
    };
}
