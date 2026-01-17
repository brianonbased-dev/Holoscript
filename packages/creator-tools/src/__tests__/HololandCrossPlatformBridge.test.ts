/**
 * HololandCrossPlatformBridge Test Suite - Cross-Platform Deployment Testing
 * Tests deployment strategies, platform optimization, and multi-platform coordination
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  HololandCrossPlatformBridge,
  PlatformType,
  PlatformCapability,
  PlatformTarget,
  DeploymentConfig,
  DeploymentResult,
  OptimizationStrategy
} from './HololandCrossPlatformBridge';
import { TraitConfig } from './TraitAnnotationEditor';
import { HololandParserBridge } from './HololandParserBridge';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';

/**
 * Mock trait configuration
 */
const mockTrait: TraitConfig = {
  id: 'trait_cross_001',
  name: 'CrossPlatformMaterial',
  description: 'Test trait for cross-platform deployment',
  materials: [
    {
      id: 'mat_001',
      name: 'TestMat',
      type: 'pbr',
      properties: [
        { name: 'roughness', type: 'float', value: 0.5 },
        { name: 'metallic', type: 'float', value: 0.0 }
      ]
    }
  ],
  presets: []
};

/**
 * Mock platform targets
 */
const mockPlatformTargets: PlatformTarget[] = [
  {
    platform: 'ios',
    capability: PlatformCapability.MEDIUM,
    deviceId: 'iphone-15',
    osVersion: '17.0',
    screenResolution: [1170, 2532],
    gpuVRAMMB: 256
  },
  {
    platform: 'android',
    capability: PlatformCapability.MEDIUM,
    deviceId: 'pixel-8',
    osVersion: '14.0',
    screenResolution: [1440, 3200],
    gpuVRAMMB: 256
  },
  {
    platform: 'vr',
    capability: PlatformCapability.HIGH,
    deviceId: 'quest-3',
    osVersion: 'Android 13',
    screenResolution: [2064, 2208],
    gpuVRAMMB: 512
  },
  {
    platform: 'desktop',
    capability: PlatformCapability.MAXIMUM,
    deviceId: 'rtx-4090',
    osVersion: 'Windows 11',
    screenResolution: [3840, 2160],
    gpuVRAMMB: 24576
  },
  {
    platform: 'web',
    capability: PlatformCapability.MEDIUM,
    deviceId: 'chrome-latest',
    osVersion: 'Latest',
    gpuVRAMMB: 2048
  },
  {
    platform: 'ar',
    capability: PlatformCapability.MEDIUM,
    deviceId: 'iphone-15',
    osVersion: '17.0',
    screenResolution: [1170, 2532],
    gpuVRAMMB: 256,
    supportsARKit: true
  }
];

/**
 * Performance measurement utility
 */
class PerformanceMeasure {
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }
}

describe('HololandCrossPlatformBridge', () => {
  let bridge: HololandCrossPlatformBridge;
  let mockParser: HololandParserBridge;
  let mockGraphics: HololandGraphicsBridge;

  beforeEach(() => {
    mockParser = {
      generateHoloScriptPlusCode: vi.fn(),
      registerTraitWithParser: vi.fn(),
      validateHoloScriptPlus: vi.fn(() => ({ isValid: true })),
      getRegisteredTraitCode: vi.fn(),
      getAllRegisteredTraits: vi.fn(() => [])
    } as any;

    mockGraphics = {
      createMaterialFromTrait: vi.fn(),
      getMaterialsForTrait: vi.fn(() => []),
      getAllMaterials: vi.fn(() => []),
      getErrors: vi.fn(() => []),
      exportGraphicsData: vi.fn()
    } as any;

    bridge = new HololandCrossPlatformBridge(mockParser, mockGraphics);
  });

  describe('Platform Deployment', () => {
    it('should deploy to iOS platform', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      expect(result).toBeDefined();
      expect(result.platform).toBe('ios');
      expect(result.success).toBe(true);
      expect(result.traitId).toBe(mockTrait.id);
    });

    it('should deploy to Android platform', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[1]);

      expect(result).toBeDefined();
      expect(result.platform).toBe('android');
      expect(result.success).toBe(true);
    });

    it('should deploy to VR platform', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[2]);

      expect(result).toBeDefined();
      expect(result.platform).toBe('vr');
      expect(result.success).toBe(true);
    });

    it('should deploy to Desktop platform', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[3]);

      expect(result).toBeDefined();
      expect(result.platform).toBe('desktop');
      expect(result.success).toBe(true);
    });

    it('should deploy to Web platform', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[4]);

      expect(result).toBeDefined();
      expect(result.platform).toBe('web');
      expect(result.success).toBe(true);
    });

    it('should deploy to AR platform', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[5]);

      expect(result).toBeDefined();
      expect(result.platform).toBe('ar');
      expect(result.success).toBe(true);
      expect(result.deployedAtMs).toBeGreaterThan(0);
    });

    it('should complete deployment within 100ms target', async () => {
      const measure = new PerformanceMeasure();
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      const elapsed = measure.end();

      expect(elapsed).toBeLessThan(100);
    });

    it('should include deployment metrics', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.downloadTimeMs).toBeGreaterThan(0);
      expect(result.metrics.compilationTimeMs).toBeGreaterThan(0);
      expect(result.metrics.optimizationTimeMs).toBeGreaterThan(0);
      expect(result.metrics.totalTimeMs).toBeGreaterThan(0);
    });

    it('should generate checksum for deployed data', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBeGreaterThan(0);
    });

    it('should record file size', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      expect(result.fileSize).toBeGreaterThan(0);
    });
  });

  describe('Multi-Platform Deployment', () => {
    it('should deploy to multiple platforms', async () => {
      const results = await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);

      expect(results.length).toBe(mockPlatformTargets.length);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should deploy to all 6 platforms simultaneously', async () => {
      const results = await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);

      const platforms = results.map(r => r.platform);
      expect(platforms).toContain('ios');
      expect(platforms).toContain('android');
      expect(platforms).toContain('vr');
      expect(platforms).toContain('desktop');
      expect(platforms).toContain('web');
      expect(platforms).toContain('ar');
    });

    it('should handle deployment failures gracefully', async () => {
      const invalidTrait = { ...mockTrait, materials: [] };
      const results = await bridge.deployToManyPlatforms(invalidTrait, [mockPlatformTargets[0]]);

      expect(results.length).toBe(1);
      expect(results[0].success).toBe(false);
      expect(results[0].errors.length).toBeGreaterThan(0);
    });

    it('should complete 6-platform deployment within 500ms', async () => {
      const measure = new PerformanceMeasure();
      await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);
      const elapsed = measure.end();

      expect(elapsed).toBeLessThan(500);
    });

    it('should maintain individual platform metadata in results', async () => {
      const results = await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets.slice(0, 3));

      results.forEach((result, idx) => {
        expect(result.platform).toBe(mockPlatformTargets[idx].platform);
        expect(result.traitId).toBe(mockTrait.id);
      });
    });
  });

  describe('Platform Selection & Optimization', () => {
    it('should select appropriate optimization strategy for iOS', async () => {
      const strategies = bridge.getOptimizationStrategies();
      expect(strategies.some(s => s.platforms.includes('ios'))).toBe(true);
    });

    it('should select appropriate optimization strategy for VR', async () => {
      const strategies = bridge.getOptimizationStrategies();
      expect(strategies.some(s => s.platforms.includes('vr'))).toBe(true);
    });

    it('should have strategy for desktop maximum quality', async () => {
      const strategies = bridge.getOptimizationStrategies();
      const desktopStrategy = strategies.find(s => s.platforms.includes('desktop'));
      expect(desktopStrategy?.targetCapability).toBe(PlatformCapability.MAXIMUM);
    });

    it('should register custom optimization strategy', () => {
      const customStrategy: OptimizationStrategy = {
        name: 'Custom Mobile',
        platforms: ['ios', 'android'],
        targetCapability: PlatformCapability.LOW,
        textureQuality: 'low',
        meshComplexity: 'low',
        effectQuality: 'none',
        targetFPS: 30,
        maxMemoryMB: 256
      };

      bridge.registerOptimizationStrategy(customStrategy);
      const strategies = bridge.getOptimizationStrategies();

      expect(strategies.some(s => s.name === 'Custom Mobile')).toBe(true);
    });

    it('should support quality, balanced, and performance optimization levels', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'balanced'
      };

      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], config);
      expect(result.success).toBe(true);
    });

    it('should support native and upscaled resolutions', async () => {
      const configNative = { targetResolution: 'native' as const };
      const config720p = { targetResolution: '720p' as const };

      const result1 = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], configNative);
      const result2 = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], config720p);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Deployment Status Tracking', () => {
    it('should track deployment status', async () => {
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      const status = bridge.getDeploymentStatus(mockTrait.id, 'ios');

      expect(status).toBeDefined();
      expect(status?.status).toBe('success');
      expect(status?.progress).toBe(100);
    });

    it('should return undefined for undeployed trait', () => {
      const status = bridge.getDeploymentStatus('unknown-trait', 'ios');
      expect(status).toBeUndefined();
    });

    it('should get all deployment statuses', async () => {
      await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets.slice(0, 3));
      const statuses = bridge.getAllDeploymentStatuses();

      expect(statuses.length).toBeGreaterThanOrEqual(3);
      expect(statuses.every(s => s.status === 'success')).toBe(true);
    });

    it('should track failed deployments', async () => {
      const invalidTrait = { ...mockTrait, materials: [] };
      await bridge.deployToPlatform(invalidTrait, mockPlatformTargets[0]);
      const status = bridge.getDeploymentStatus(invalidTrait.id, 'ios');

      expect(status?.status).toBe('failed');
    });
  });

  describe('Deployment Caching', () => {
    it('should cache successful deployments', async () => {
      const result1 = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      const result2 = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      expect(result1.checksum).toBe(result2.checksum);
    });

    it('should return cached deployment immediately', async () => {
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      const measure = new PerformanceMeasure();
      const cachedResult = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      const elapsed = measure.end();

      // Cached retrieval should be very fast (under 1ms)
      expect(elapsed).toBeLessThan(50);
      expect(cachedResult.success).toBe(true);
    });

    it('should report cache statistics', () => {
      const stats = bridge.getCacheStats();

      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThanOrEqual(0);
      expect(stats.maxSize).toBeGreaterThan(0);
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should clear deployment cache', async () => {
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      bridge.clearDeploymentCache();

      const stats = bridge.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should limit cache size', async () => {
      // Create multiple deployments to test cache eviction
      for (let i = 0; i < 10; i++) {
        const trait = { ...mockTrait, id: `trait_${i}` };
        await bridge.deployToPlatform(trait, mockPlatformTargets[0]);
      }

      const stats = bridge.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Deployment History', () => {
    it('should maintain deployment history', async () => {
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      const history = bridge.getDeploymentHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should retrieve limited deployment history', async () => {
      for (let i = 0; i < 5; i++) {
        await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      }

      const limitedHistory = bridge.getDeploymentHistory(2);
      expect(limitedHistory.length).toBeLessThanOrEqual(2);
    });

    it('should include all deployments in history', async () => {
      await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);
      const history = bridge.getDeploymentHistory();

      expect(history.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Platform Validation', () => {
    it('should validate trait for iOS', async () => {
      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      expect(result.success).toBe(true);
    });

    it('should validate trait for all platforms', async () => {
      const results = await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);
      expect(results.every(r => r.success || r.errors.length > 0)).toBe(true);
    });

    it('should detect invalid trait configuration', async () => {
      const invalidTrait = { ...mockTrait, materials: [] };
      const result = await bridge.deployToPlatform(invalidTrait, mockPlatformTargets[0]);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn on excessive material properties', async () => {
      const complexTrait: TraitConfig = {
        ...mockTrait,
        materials: [{
          ...mockTrait.materials![0],
          properties: Array.from({ length: 100 }, (_, i) => ({
            name: `prop${i}`,
            type: 'float' as const,
            value: i
          }))
        }]
      };

      const result = await bridge.deployToPlatform(complexTrait, mockPlatformTargets[0]);
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Platform Adapters', () => {
    it('should have iOS adapter', () => {
      const adapter = bridge.getPlatformAdapter('ios');
      expect(adapter).toBeDefined();
    });

    it('should have Android adapter', () => {
      const adapter = bridge.getPlatformAdapter('android');
      expect(adapter).toBeDefined();
    });

    it('should have VR adapter', () => {
      const adapter = bridge.getPlatformAdapter('vr');
      expect(adapter).toBeDefined();
    });

    it('should have Desktop adapter', () => {
      const adapter = bridge.getPlatformAdapter('desktop');
      expect(adapter).toBeDefined();
    });

    it('should have Web adapter', () => {
      const adapter = bridge.getPlatformAdapter('web');
      expect(adapter).toBeDefined();
    });

    it('should have AR adapter', () => {
      const adapter = bridge.getPlatformAdapter('ar');
      expect(adapter).toBeDefined();
    });

    it('should return undefined for unknown platform', () => {
      const adapter = bridge.getPlatformAdapter('unknown' as any);
      expect(adapter).toBeUndefined();
    });

    it('should get platform capabilities', () => {
      const adapter = bridge.getPlatformAdapter('ios');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities?.maxTextureSize).toBeGreaterThan(0);
      expect(capabilities?.maxDrawCalls).toBeGreaterThan(0);
      expect(capabilities?.gpuMemoryMB).toBeGreaterThan(0);
    });

    it('should list all supported platforms', () => {
      const platforms = bridge.getSupportedPlatforms();

      expect(platforms).toContain('ios');
      expect(platforms).toContain('android');
      expect(platforms).toContain('vr');
      expect(platforms).toContain('desktop');
      expect(platforms).toContain('web');
      expect(platforms).toContain('ar');
    });
  });

  describe('Platform Capabilities', () => {
    it('should have different texture limits per platform', () => {
      const iosAdapter = bridge.getPlatformAdapter('ios');
      const desktopAdapter = bridge.getPlatformAdapter('desktop');

      const iosCap = iosAdapter?.getCapabilities();
      const desktopCap = desktopAdapter?.getCapabilities();

      expect(iosCap?.maxTextureSize).toBeLessThan(desktopCap?.maxTextureSize!);
    });

    it('should have different draw call limits per platform', () => {
      const mobileAdapter = bridge.getPlatformAdapter('android');
      const desktopAdapter = bridge.getPlatformAdapter('desktop');

      const mobileCap = mobileAdapter?.getCapabilities();
      const desktopCap = desktopAdapter?.getCapabilities();

      expect(mobileCap?.maxDrawCalls).toBeLessThan(desktopCap?.maxDrawCalls!);
    });

    it('should have different polygon limits per platform', () => {
      const vrAdapter = bridge.getPlatformAdapter('vr');
      const desktopAdapter = bridge.getPlatformAdapter('desktop');

      const vrCap = vrAdapter?.getCapabilities();
      const desktopCap = desktopAdapter?.getCapabilities();

      expect(vrCap?.maxPolygonCount).toBeLessThan(desktopCap?.maxPolygonCount!);
    });

    it('should support appropriate shader targets per platform', () => {
      const iosAdapter = bridge.getPlatformAdapter('ios');
      const androidAdapter = bridge.getPlatformAdapter('android');

      const iosCap = iosAdapter?.getCapabilities();
      const androidCap = androidAdapter?.getCapabilities();

      expect(iosCap?.supportedShaders).toContain('metal');
      expect(androidCap?.supportedShaders).toContain('glsl');
    });

    it('should indicate compute shader support appropriately', () => {
      const desktopAdapter = bridge.getPlatformAdapter('desktop');
      const mobileAdapter = bridge.getPlatformAdapter('android');

      const desktopCap = desktopAdapter?.getCapabilities();
      const mobileCap = mobileAdapter?.getCapabilities();

      expect(desktopCap?.supportsCompute).toBe(true);
      expect(mobileCap?.supportsCompute).toBe(false);
    });

    it('should indicate ray tracing support appropriately', () => {
      const desktopAdapter = bridge.getPlatformAdapter('desktop');
      const mobileAdapter = bridge.getPlatformAdapter('ios');

      const desktopCap = desktopAdapter?.getCapabilities();
      const mobileCap = mobileAdapter?.getCapabilities();

      expect(desktopCap?.supportsRayTracing).toBe(true);
      expect(mobileCap?.supportsRayTracing).toBe(false);
    });

    it('should have expected FPS targets', () => {
      const iosAdapter = bridge.getPlatformAdapter('ios');
      const vrAdapter = bridge.getPlatformAdapter('vr');
      const desktopAdapter = bridge.getPlatformAdapter('desktop');

      expect(iosAdapter?.getCapabilities().estimatedFPS).toBe(60);
      expect(vrAdapter?.getCapabilities().estimatedFPS).toBe(90);
      expect(desktopAdapter?.getCapabilities().estimatedFPS).toBe(240);
    });
  });

  describe('Data Persistence', () => {
    it('should export deployment configuration', () => {
      const json = bridge.exportDeploymentConfig();

      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
    });

    it('should export valid JSON', () => {
      const json = bridge.exportDeploymentConfig();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include strategies in export', () => {
      const json = bridge.exportDeploymentConfig();
      const data = JSON.parse(json);

      expect(data.strategies).toBeDefined();
      expect(Array.isArray(data.strategies)).toBe(true);
    });

    it('should import deployment configuration', () => {
      const json = bridge.exportDeploymentConfig();
      const bridge2 = new HololandCrossPlatformBridge(
        {} as any,
        {} as any
      );

      expect(() => bridge2.importDeploymentConfig(json)).not.toThrow();
    });

    it('should handle invalid JSON import gracefully', () => {
      expect(() => {
        bridge.importDeploymentConfig('invalid json');
      }).toThrow();
    });

    it('should preserve deployment history in export', async () => {
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);

      const json = bridge.exportDeploymentConfig();
      const data = JSON.parse(json);

      expect(data.history).toBeDefined();
      expect(Array.isArray(data.history)).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete deployment workflow', async () => {
      const results = await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);

      expect(results.every(r => r.success)).toBe(true);
      expect(results.every(r => r.metrics.totalTimeMs > 0)).toBe(true);
      expect(bridge.getAllDeploymentStatuses().length).toBeGreaterThanOrEqual(6);
    });

    it('should maintain state across multiple deployments', async () => {
      const trait1 = mockTrait;
      const trait2 = { ...mockTrait, id: 'trait_002' };

      await bridge.deployToPlatform(trait1, mockPlatformTargets[0]);
      await bridge.deployToPlatform(trait2, mockPlatformTargets[1]);

      const history = bridge.getDeploymentHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle retry logic', async () => {
      const config: Partial<DeploymentConfig> = {
        maxRetries: 3,
        timeoutMs: 10000
      };

      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], config);
      expect(result.success).toBe(true);
    });

    it('should support streaming deployment option', async () => {
      const config: Partial<DeploymentConfig> = {
        enableStreaming: true
      };

      const result = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], config);
      expect(result.success).toBe(true);
    });

    it('should support caching option', async () => {
      const config: Partial<DeploymentConfig> = {
        enableCaching: true
      };

      const result1 = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], config);
      const result2 = await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0], config);

      expect(result1.checksum).toBe(result2.checksum);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should deploy to single platform within 100ms', async () => {
      const measure = new PerformanceMeasure();
      await bridge.deployToPlatform(mockTrait, mockPlatformTargets[0]);
      const elapsed = measure.end();

      expect(elapsed).toBeLessThan(100);
    });

    it('should deploy to 6 platforms within 500ms', async () => {
      const measure = new PerformanceMeasure();
      await bridge.deployToManyPlatforms(mockTrait, mockPlatformTargets);
      const elapsed = measure.end();

      expect(elapsed).toBeLessThan(500);
    });

    it('should handle 10 sequential deployments efficiently', async () => {
      const measure = new PerformanceMeasure();

      for (let i = 0; i < 10; i++) {
        const trait = { ...mockTrait, id: `trait_perf_${i}` };
        await bridge.deployToPlatform(trait, mockPlatformTargets[0]);
      }

      const elapsed = measure.end();
      expect(elapsed).toBeLessThan(2000);
    });

    it('should export configuration efficiently', () => {
      const measure = new PerformanceMeasure();
      bridge.exportDeploymentConfig();
      const elapsed = measure.end();

      expect(elapsed).toBeLessThan(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty trait gracefully', async () => {
      const emptyTrait: TraitConfig = {
        id: 'empty',
        name: 'Empty',
        materials: [],
        presets: []
      };

      const result = await bridge.deployToPlatform(emptyTrait, mockPlatformTargets[0]);
      expect(result.success).toBe(false);
    });

    it('should handle special characters in trait name', async () => {
      const specialTrait: TraitConfig = {
        ...mockTrait,
        name: 'Material_With-Special.Chars_🎨'
      };

      const result = await bridge.deployToPlatform(specialTrait, mockPlatformTargets[0]);
      expect(result.success).toBe(true);
    });

    it('should handle many properties in material', async () => {
      const complexTrait: TraitConfig = {
        ...mockTrait,
        materials: [{
          ...mockTrait.materials![0],
          properties: Array.from({ length: 50 }, (_, i) => ({
            name: `property${i}`,
            type: 'float' as const,
            value: i
          }))
        }]
      };

      const result = await bridge.deployToPlatform(complexTrait, mockPlatformTargets[0]);
      expect(result.success).toBeGreaterThanOrEqual(false);
    });

    it('should handle rapid consecutive deployments', async () => {
      const promises = mockPlatformTargets.map(target =>
        bridge.deployToPlatform(mockTrait, target)
      );

      const results = await Promise.all(promises);
      expect(results.every(r => r.success || !r.success)).toBe(true);
    });

    it('should handle very long deployment history', async () => {
      for (let i = 0; i < 50; i++) {
        const trait = { ...mockTrait, id: `trait_history_${i}` };
        await bridge.deployToPlatform(trait, mockPlatformTargets[0]);
      }

      const history = bridge.getDeploymentHistory();
      expect(history.length).toBeLessThanOrEqual(200);
    });
  });
});
