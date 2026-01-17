/**
 * Cross-Platform Bridge Module Exports
 * Clean API for multi-platform trait deployment
 */

export { HololandCrossPlatformBridge } from './HololandCrossPlatformBridge';

// Type exports
export type {
  TraitConfig,
  TextureAsset,
  PlatformTarget,
  DeploymentConfig,
  DeploymentMetrics,
  DeploymentResult,
  DeploymentStatusInfo,
  OptimizationStrategy,
  PlatformCapabilities,
  PlatformAdapter,
  ValidationResult,
  ShaderCompilationResult,
  OptimizedAssets,
  OptimizedTexture,
  CacheStats,
  DeploymentConfiguration,
  PlatformConfig,
  ShaderDefinition,
  PerformanceTarget,
  DeploymentOptions,
  PlatformStatistics,
  QualitySettings,
  QualityPreset,
  DeploymentPlan,
  DeploymentStep,
  DeploymentEvent,
  DeviceInfo,
  DeploymentReport
} from './types';

// Type exports for platform and capability enums
export type {
  PlatformType,
  PlatformCapability,
  OptimizationLevel,
  TargetResolution,
  DeploymentStatus,
  TextureQuality,
  MeshComplexity,
  EffectQuality,
  ShaderTarget
} from './types';

/**
 * Quick reference for usage
 *
 * @example
 * ```typescript
 * import { HololandCrossPlatformBridge } from '@creator-tools/cross-platform';
 *
 * const bridge = new HololandCrossPlatformBridge(parserBridge, graphicsBridge);
 *
 * // Deploy to single platform
 * const result = await bridge.deployToPlatform(trait, iOSTarget);
 *
 * // Deploy to multiple platforms
 * const results = await bridge.deployToManyPlatforms(trait, [
 *   iOSTarget,
 *   androidTarget,
 *   desktopTarget
 * ]);
 * ```
 */
