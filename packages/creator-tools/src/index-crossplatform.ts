/**
 * Hololand Cross-Platform Bridge - Module Exports
 * Main entry point for cross-platform trait deployment
 */

export {
  HololandCrossPlatformBridge,
  PlatformType,
  PlatformCapability,
  PlatformTarget,
  DeploymentConfig,
  DeploymentResult,
  DeploymentMetrics,
  DeploymentStatus,
  PlatformAdapter,
  PlatformCapabilities,
  ValidationResult,
  OptimizationStrategy
} from './HololandCrossPlatformBridge';

import { HololandCrossPlatformBridge } from './HololandCrossPlatformBridge';
import { HololandParserBridge } from './HololandParserBridge';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';

/**
 * Factory function to create Phase 6 + Cross-Platform Bridge integration
 */
export function createPhase6CrossPlatformIntegration(config?: {
  enableCaching?: boolean;
}) {
  const parserBridge = new HololandParserBridge(
    {} as any,
    {} as any,
    false
  );
  const graphicsBridge = new HololandGraphicsBridge(
    {} as any,
    {} as any,
    false
  );
  const crossPlatformBridge = new HololandCrossPlatformBridge(
    parserBridge,
    graphicsBridge
  );

  return {
    parserBridge,
    graphicsBridge,
    crossPlatformBridge,
    deployToPlatforms: async (traitId: string, platforms: any[]) =>
      crossPlatformBridge.deployToManyPlatforms({} as any, platforms),
    getDeploymentStatus: (traitId: string, platform: string) =>
      crossPlatformBridge.getDeploymentStatus(traitId, platform as any),
    getSupportedPlatforms: () => crossPlatformBridge.getSupportedPlatforms(),
    getOptimizationStrategies: () => crossPlatformBridge.getOptimizationStrategies(),
    exportConfig: () => crossPlatformBridge.exportDeploymentConfig()
  };
}

// Re-export related components
export { HololandParserBridge } from './HololandParserBridge';
export { HololandGraphicsBridge } from './HololandGraphicsBridge';
export type { TraitConfig } from './TraitAnnotationEditor';
