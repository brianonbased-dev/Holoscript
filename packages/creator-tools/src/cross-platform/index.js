/**
 * Cross-Platform Bridge Module Exports
 * Clean API for multi-platform trait deployment
 */
export { HololandCrossPlatformBridge } from './HololandCrossPlatformBridge';
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
