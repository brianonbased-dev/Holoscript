/**
 * Hololand Cross-Platform Bridge - Module Exports
 * Main entry point for cross-platform trait deployment
 */
export { HololandCrossPlatformBridge, PlatformType, PlatformCapability, PlatformTarget, DeploymentConfig, DeploymentResult, DeploymentMetrics, DeploymentStatus, PlatformAdapter, PlatformCapabilities, ValidationResult, OptimizationStrategy } from './HololandCrossPlatformBridge';
import { HololandCrossPlatformBridge } from './HololandCrossPlatformBridge';
import { HololandParserBridge } from './HololandParserBridge';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';
/**
 * Factory function to create Phase 6 + Cross-Platform Bridge integration
 */
export declare function createPhase6CrossPlatformIntegration(config?: {
    enableCaching?: boolean;
}): {
    parserBridge: HololandParserBridge;
    graphicsBridge: HololandGraphicsBridge;
    crossPlatformBridge: HololandCrossPlatformBridge;
    deployToPlatforms: (traitId: string, platforms: any[]) => Promise<import("./HololandCrossPlatformBridge").DeploymentResult[]>;
    getDeploymentStatus: (traitId: string, platform: string) => import("./HololandCrossPlatformBridge").DeploymentStatus | undefined;
    getSupportedPlatforms: () => import("./HololandCrossPlatformBridge").PlatformType[];
    getOptimizationStrategies: () => import("./HololandCrossPlatformBridge").OptimizationStrategy[];
    exportConfig: () => string;
};
export { HololandParserBridge } from './HololandParserBridge';
export { HololandGraphicsBridge } from './HololandGraphicsBridge';
export type { TraitConfig } from './TraitAnnotationEditor';
