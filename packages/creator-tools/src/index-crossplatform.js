/**
 * Hololand Cross-Platform Bridge - Module Exports
 * Main entry point for cross-platform trait deployment
 */
export { HololandCrossPlatformBridge, PlatformCapability } from './HololandCrossPlatformBridge';
import { HololandCrossPlatformBridge } from './HololandCrossPlatformBridge';
import { HololandParserBridge } from './HololandParserBridge';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';
/**
 * Factory function to create Phase 6 + Cross-Platform Bridge integration
 */
export function createPhase6CrossPlatformIntegration(config) {
    const parserBridge = new HololandParserBridge({}, {}, false);
    const graphicsBridge = new HololandGraphicsBridge({}, {}, false);
    const crossPlatformBridge = new HololandCrossPlatformBridge(parserBridge, graphicsBridge);
    return {
        parserBridge,
        graphicsBridge,
        crossPlatformBridge,
        deployToPlatforms: async (traitId, platforms) => crossPlatformBridge.deployToManyPlatforms({}, platforms),
        getDeploymentStatus: (traitId, platform) => crossPlatformBridge.getDeploymentStatus(traitId, platform),
        getSupportedPlatforms: () => crossPlatformBridge.getSupportedPlatforms(),
        getOptimizationStrategies: () => crossPlatformBridge.getOptimizationStrategies(),
        exportConfig: () => crossPlatformBridge.exportDeploymentConfig()
    };
}
// Re-export related components
export { HololandParserBridge } from './HololandParserBridge';
export { HololandGraphicsBridge } from './HololandGraphicsBridge';
