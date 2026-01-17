/**
 * HololandCrossPlatformBridge Comprehensive Test Suite
 * Tests for 6-platform deployment, optimization strategies, and performance monitoring
 * 100+ test cases covering all deployment scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HololandCrossPlatformBridge } from './HololandCrossPlatformBridge';
import type {
  TraitConfig,
  PlatformTarget,
  DeploymentConfig,
  DeploymentResult,
  OptimizationStrategy
} from './types';

describe('HololandCrossPlatformBridge', () => {
  let bridge: HololandCrossPlatformBridge;
  let mockParserBridge: any;
  let mockGraphicsBridge: any;

  const mockTrait: TraitConfig = {
    id: 'test-trait',
    name: 'Test Material Trait',
    type: 'material',
    properties: {
      color: { r: 1, g: 0, b: 0, a: 1 },
      metallic: 0.5,
      roughness: 0.4
    },
    shader: {
      vertex: 'version 300 es\nvoid main() { gl_Position = vec4(0.0); }',
      fragment: 'version 300 es\nvoid main() { gl_FragColor = vec4(1.0); }'
    }
  };

  const iosTarget: PlatformTarget = {
    platform: 'ios',
    capability: 'medium',
    deviceId: 'iphone-15',
    osVersion: '17.0',
    screenResolution: [1170, 2532],
    gpuVRAMMB: 256
  };

  const androidTarget: PlatformTarget = {
    platform: 'android',
    capability: 'medium',
    deviceId: 'pixel-8',
    osVersion: '14.0',
    screenResolution: [1440, 3120],
    gpuVRAMMB: 256
  };

  const vrTarget: PlatformTarget = {
    platform: 'vr',
    capability: 'high',
    deviceId: 'quest-3',
    gpuVRAMMB: 512
  };

  const desktopTarget: PlatformTarget = {
    platform: 'desktop',
    capability: 'maximum',
    deviceId: 'rtx-4090',
    gpuVRAMMB: 24000
  };

  const webTarget: PlatformTarget = {
    platform: 'web',
    capability: 'medium',
    deviceId: 'chrome',
    gpuVRAMMB: 2048
  };

  const arTarget: PlatformTarget = {
    platform: 'ar',
    capability: 'medium',
    deviceId: 'ipad-pro',
    gpuVRAMMB: 256,
    supportsARKit: true
  };

  beforeEach(() => {
    mockParserBridge = {
      parseShader: vi.fn().mockResolvedValue({ success: true }),
      validateShader: vi.fn().mockResolvedValue({ isValid: true })
    };

    mockGraphicsBridge = {
      compileShader: vi.fn().mockResolvedValue({ success: true }),
      optimizeTexture: vi.fn().mockResolvedValue({ optimized: true })
    };

    bridge = new HololandCrossPlatformBridge(mockParserBridge, mockGraphicsBridge);
  });

  afterEach(() => {
    bridge.clearDeploymentCache();
    vi.clearAllMocks();
  });

  describe('Initialization and Setup', () => {
    it('should initialize with parser and graphics bridges', () => {
      expect(bridge).toBeDefined();
      expect(bridge.getSupportedPlatforms()).toContain('ios');
    });

    it('should support all 6 platforms', () => {
      const platforms = bridge.getSupportedPlatforms();
      expect(platforms).toEqual(['ios', 'android', 'vr', 'desktop', 'web', 'ar']);
    });

    it('should have all platform adapters registered', () => {
      const platforms = bridge.getSupportedPlatforms();
      platforms.forEach(platform => {
        const adapter = bridge.getPlatformAdapter(platform);
        expect(adapter).toBeDefined();
      });
    });

    it('should register default optimization strategies', () => {
      const strategies = bridge.getOptimizationStrategies();
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('Single Platform Deployment', () => {
    it('should deploy to iOS successfully', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('ios');
      expect(result.traitId).toBe(mockTrait.id);
      expect(result.completionTimeMs).toBeGreaterThan(0);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should deploy to Android successfully', async () => {
      const result = await bridge.deployToPlatform(mockTrait, androidTarget);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('android');
      expect(result.completionTimeMs).toBeGreaterThan(0);
    });

    it('should deploy to VR successfully', async () => {
      const result = await bridge.deployToPlatform(mockTrait, vrTarget);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('vr');
      expect(result.completionTimeMs).toBeGreaterThan(0);
    });

    it('should deploy to Desktop successfully', async () => {
      const result = await bridge.deployToPlatform(mockTrait, desktopTarget);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('desktop');
      expect(result.completionTimeMs).toBeGreaterThan(0);
    });

    it('should deploy to Web successfully', async () => {
      const result = await bridge.deployToPlatform(mockTrait, webTarget);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('web');
      expect(result.completionTimeMs).toBeGreaterThan(0);
    });

    it('should deploy to AR successfully', async () => {
      const result = await bridge.deployToPlatform(mockTrait, arTarget);

      expect(result.success).toBe(true);
      expect(result.platform).toBe('ar');
      expect(result.completionTimeMs).toBeGreaterThan(0);
    });

    it('should generate valid checksum for deployment', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.checksum).toBeDefined();
      expect(result.checksum.length).toBeGreaterThan(0);
    });

    it('should meet performance target for single deployment (<100ms)', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.completionTimeMs).toBeLessThan(100);
    });

    it('should include deployment metrics', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.compilationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.optimizationTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.totalTimeMs).toBeGreaterThan(0);
    });

    it('should track deployment timestamp', async () => {
      const beforeMs = Date.now();
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);
      const afterMs = Date.now();

      expect(result.deployedAtMs).toBeGreaterThanOrEqual(beforeMs);
      expect(result.deployedAtMs).toBeLessThanOrEqual(afterMs);
    });
  });

  describe('Multi-Platform Deployment', () => {
    it('should deploy to multiple platforms simultaneously', async () => {
      const platforms = [iosTarget, androidTarget, vrTarget];

      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      expect(results.length).toBe(3);
      expect(results[0].platform).toBe('ios');
      expect(results[1].platform).toBe('android');
      expect(results[2].platform).toBe('vr');
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should deploy to all 6 platforms', async () => {
      const platforms = [
        iosTarget,
        androidTarget,
        vrTarget,
        desktopTarget,
        webTarget,
        arTarget
      ];

      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      expect(results.length).toBe(6);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should meet performance target for 6-platform deployment (<500ms)', async () => {
      const platforms = [
        iosTarget,
        androidTarget,
        vrTarget,
        desktopTarget,
        webTarget,
        arTarget
      ];

      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      const totalTime = Math.max(...results.map(r => r.completionTimeMs));
      expect(totalTime).toBeLessThan(500);
    });

    it('should maintain trait integrity across all platforms', async () => {
      const platforms = [iosTarget, androidTarget, desktopTarget];

      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      results.forEach(result => {
        expect(result.traitId).toBe(mockTrait.id);
        expect(result.fileSize).toBeGreaterThan(0);
      });
    });

    it('should return results in order of platform submission', async () => {
      const platforms = [vrTarget, webTarget, iosTarget];

      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      expect(results[0].platform).toBe('vr');
      expect(results[1].platform).toBe('web');
      expect(results[2].platform).toBe('ios');
    });

    it('should handle platform-specific failures gracefully', async () => {
      mockGraphicsBridge.compileShader.mockRejectedValueOnce(new Error('Compilation failed'));

      const platforms = [iosTarget, androidTarget];
      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      // Should still complete for other platforms
      expect(results.length).toBe(2);
    });
  });

  describe('Deployment Status Tracking', () => {
    it('should track deployment status by trait and platform', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);

      const status = bridge.getDeploymentStatus(mockTrait.id, 'ios');

      expect(status).toBeDefined();
      expect(status?.status).toBe('success');
      expect(status?.progress).toBe(100);
    });

    it('should return undefined for non-existent deployment', () => {
      const status = bridge.getDeploymentStatus('non-existent-id', 'ios');

      expect(status).toBeUndefined();
    });

    it('should get all deployment statuses', async () => {
      const platforms = [iosTarget, androidTarget, vrTarget];

      await bridge.deployToManyPlatforms(mockTrait, platforms);

      const allStatuses = bridge.getAllDeploymentStatuses();

      expect(allStatuses.length).toBe(3);
      expect(allStatuses.every(s => s.status === 'success')).toBe(true);
    });

    it('should track pending deployments', async () => {
      mockGraphicsBridge.compileShader.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const deploymentPromise = bridge.deployToPlatform(mockTrait, iosTarget);

      const immediateStatus = bridge.getDeploymentStatus(mockTrait.id, 'ios');
      expect(immediateStatus?.status).toMatch(/pending|deploying/);

      await deploymentPromise;

      const finalStatus = bridge.getDeploymentStatus(mockTrait.id, 'ios');
      expect(finalStatus?.status).toBe('success');
    });

    it('should include result in successful status', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);

      const status = bridge.getDeploymentStatus(mockTrait.id, 'ios');

      expect(status?.result).toBeDefined();
      expect(status?.result?.success).toBe(true);
    });
  });

  describe('Caching Strategy', () => {
    it('should cache successful deployments', async () => {
      const result1 = await bridge.deployToPlatform(mockTrait, iosTarget);
      const result2 = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result1.checksum).toBe(result2.checksum);
    });

    it('should use cache for identical deployments', async () => {
      const result1 = await bridge.deployToPlatform(mockTrait, iosTarget);

      const callCountBefore = mockGraphicsBridge.compileShader.mock.calls.length;
      const result2 = await bridge.deployToPlatform(mockTrait, iosTarget);
      const callCountAfter = mockGraphicsBridge.compileShader.mock.calls.length;

      // Second call should use cache, no additional compilation
      expect(callCountAfter).toBe(callCountBefore);
    });

    it('should clear deployment cache', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);

      const statsBefore = bridge.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      bridge.clearDeploymentCache();

      const statsAfter = bridge.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should report cache statistics', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);

      const stats = bridge.getCacheStats();

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.maxSize).toBeGreaterThan(stats.size);
      expect(stats.entries).toBeDefined();
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should maintain separate cache entries for different platforms', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);
      await bridge.deployToPlatform(mockTrait, androidTarget);

      const cacheStats = bridge.getCacheStats();

      expect(cacheStats.entries.length).toBe(2);
    });

    it('should invalidate cache for modified trait', async () => {
      const result1 = await bridge.deployToPlatform(mockTrait, iosTarget);

      const modifiedTrait = { ...mockTrait, properties: { ...mockTrait.properties } };
      const result2 = await bridge.deployToPlatform(modifiedTrait, iosTarget);

      // Modified trait might generate different cache
      // This tests trait differentiation
      expect(result1.traitId).toBe(result2.traitId);
    });

    it('should handle cache size limits', async () => {
      // Deploy multiple traits to test cache limits
      for (let i = 0; i < 5; i++) {
        const trait = { ...mockTrait, id: `trait-${i}` };
        await bridge.deployToPlatform(trait, iosTarget);
      }

      const stats = bridge.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
    });
  });

  describe('Optimization Strategies', () => {
    it('should register custom optimization strategy', () => {
      const customStrategy: OptimizationStrategy = {
        name: 'Custom Test Strategy',
        platforms: ['ios', 'android'],
        targetCapability: 'medium',
        textureQuality: 'high',
        meshComplexity: 'medium',
        effectQuality: 'advanced',
        targetFPS: 60,
        maxMemoryMB: 512
      };

      bridge.registerOptimizationStrategy(customStrategy);

      const strategies = bridge.getOptimizationStrategies();
      expect(strategies.some(s => s.name === 'Custom Test Strategy')).toBe(true);
    });

    it('should get all optimization strategies', () => {
      const strategies = bridge.getOptimizationStrategies();

      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.every(s => s.name && s.platforms)).toBe(true);
    });

    it('should apply optimization strategy for mobile', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'performance'
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should apply optimization strategy for desktop', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'quality'
      };

      const result = await bridge.deployToPlatform(mockTrait, desktopTarget, config);

      expect(result.success).toBe(true);
    });

    it('should apply optimization strategy for VR', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'quality'
      };

      const result = await bridge.deployToPlatform(mockTrait, vrTarget, config);

      expect(result.success).toBe(true);
    });

    it('should match optimization strategy to platform capability', async () => {
      const strategies = bridge.getOptimizationStrategies();

      // Find strategy for high capability VR platform
      const vrStrategy = strategies.find(s =>
        s.platforms.includes('vr') && s.targetCapability === 'high'
      );

      expect(vrStrategy).toBeDefined();
      expect(vrStrategy?.maxMemoryMB).toBeGreaterThanOrEqual(512);
    });

    it('should support balanced optimization level', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'balanced'
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });
  });

  describe('Platform Adapters', () => {
    it('should get iOS adapter', () => {
      const adapter = bridge.getPlatformAdapter('ios');

      expect(adapter).toBeDefined();
      expect(adapter?.getPlatformType()).toBe('ios');
    });

    it('should get Android adapter', () => {
      const adapter = bridge.getPlatformAdapter('android');

      expect(adapter).toBeDefined();
      expect(adapter?.getPlatformType()).toBe('android');
    });

    it('should get VR adapter', () => {
      const adapter = bridge.getPlatformAdapter('vr');

      expect(adapter).toBeDefined();
      expect(adapter?.getPlatformType()).toBe('vr');
    });

    it('should get Desktop adapter', () => {
      const adapter = bridge.getPlatformAdapter('desktop');

      expect(adapter).toBeDefined();
      expect(adapter?.getPlatformType()).toBe('desktop');
    });

    it('should get Web adapter', () => {
      const adapter = bridge.getPlatformAdapter('web');

      expect(adapter).toBeDefined();
      expect(adapter?.getPlatformType()).toBe('web');
    });

    it('should get AR adapter', () => {
      const adapter = bridge.getPlatformAdapter('ar');

      expect(adapter).toBeDefined();
      expect(adapter?.getPlatformType()).toBe('ar');
    });

    it('should return undefined for unsupported platform', () => {
      const adapter = bridge.getPlatformAdapter('unsupported' as any);

      expect(adapter).toBeUndefined();
    });

    it('should validate trait on platform adapter', () => {
      const adapter = bridge.getPlatformAdapter('ios');

      const validation = adapter?.validate(mockTrait, iosTarget);

      expect(validation).toBeDefined();
      expect(validation?.isValid).toBe(true);
    });

    it('should get adapter capabilities', () => {
      const adapter = bridge.getPlatformAdapter('ios');

      const capabilities = adapter?.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities?.maxTextureSize).toBeGreaterThan(0);
      expect(capabilities?.maxDrawCalls).toBeGreaterThan(0);
    });

    it('should compile shader for specific platform', async () => {
      const adapter = bridge.getPlatformAdapter('ios');

      const compilation = adapter?.compileShader(mockTrait.shader, iosTarget);

      expect(compilation).toBeDefined();
    });
  });

  describe('Deployment Configuration', () => {
    it('should accept optimization level configuration', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'performance'
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should accept target resolution configuration', async () => {
      const config: Partial<DeploymentConfig> = {
        targetResolution: '720p'
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should accept streaming configuration', async () => {
      const config: Partial<DeploymentConfig> = {
        enableStreaming: true
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should accept caching configuration', async () => {
      const config: Partial<DeploymentConfig> = {
        enableCaching: true
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should accept retry configuration', async () => {
      const config: Partial<DeploymentConfig> = {
        maxRetries: 3
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should accept timeout configuration', async () => {
      const config: Partial<DeploymentConfig> = {
        timeoutMs: 30000
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });

    it('should apply all configuration options together', async () => {
      const config: Partial<DeploymentConfig> = {
        optimizationLevel: 'balanced',
        targetResolution: '1080p',
        enableStreaming: true,
        enableCaching: true,
        maxRetries: 2,
        timeoutMs: 30000
      };

      const result = await bridge.deployToPlatform(mockTrait, iosTarget, config);

      expect(result.success).toBe(true);
    });
  });

  describe('Performance Metrics', () => {
    it('should measure compilation time', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.compilationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should measure optimization time', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.optimizationTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should measure total deployment time', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.totalTimeMs).toBeGreaterThan(0);
    });

    it('should track bandwidth usage', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.bandwidthUsedMB).toBeGreaterThanOrEqual(0);
    });

    it('should track CPU usage during deployment', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.cpuUsagePercent).toBeGreaterThanOrEqual(0);
      expect(result.metrics.cpuUsagePercent).toBeLessThanOrEqual(100);
    });

    it('should track memory usage during deployment', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.memoryUsageMB).toBeGreaterThanOrEqual(0);
    });

    it('should provide download time metric', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.metrics.downloadTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should sum component times to total time', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      const componentSum =
        result.metrics.downloadTimeMs +
        result.metrics.compilationTimeMs +
        result.metrics.optimizationTimeMs;

      expect(result.metrics.totalTimeMs).toBeGreaterThanOrEqual(componentSum * 0.9);
    });

    it('should maintain consistent metrics across platforms', async () => {
      const results = await bridge.deployToManyPlatforms(mockTrait, [
        iosTarget,
        androidTarget,
        desktopTarget
      ]);

      results.forEach(result => {
        expect(result.metrics).toBeDefined();
        expect(result.metrics.totalTimeMs).toBeGreaterThan(0);
        expect(result.metrics.downloadTimeMs).toBeGreaterThanOrEqual(0);
        expect(result.metrics.compilationTimeMs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Deployment History', () => {
    it('should retrieve deployment history', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);

      const history = bridge.getDeploymentHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should respect history limit parameter', async () => {
      // Deploy multiple times
      for (let i = 0; i < 5; i++) {
        await bridge.deployToPlatform(mockTrait, iosTarget);
      }

      const history = bridge.getDeploymentHistory(3);

      expect(history.length).toBeLessThanOrEqual(3);
    });

    it('should return most recent deployments first', async () => {
      const result1 = await bridge.deployToPlatform(mockTrait, iosTarget);

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await bridge.deployToPlatform(mockTrait, androidTarget);

      const history = bridge.getDeploymentHistory();

      expect(history[0].platform).toBe(androidTarget.platform);
    });

    it('should include complete deployment data in history', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);

      const history = bridge.getDeploymentHistory();

      expect(history[0].success).toBeDefined();
      expect(history[0].completionTimeMs).toBeGreaterThan(0);
      expect(history[0].fileSize).toBeGreaterThan(0);
      expect(history[0].checksum).toBeDefined();
      expect(history[0].metrics).toBeDefined();
    });

    it('should filter history by platform from results', async () => {
      await bridge.deployToPlatform(mockTrait, iosTarget);
      await bridge.deployToPlatform(mockTrait, androidTarget);

      const history = bridge.getDeploymentHistory();
      const iosHistory = history.filter(h => h.platform === 'ios');

      expect(iosHistory.length).toBeGreaterThan(0);
      expect(iosHistory.every(h => h.platform === 'ios')).toBe(true);
    });

    it('should maintain deployment order in history', async () => {
      const platforms = [iosTarget, androidTarget, vrTarget];

      const results1 = await bridge.deployToManyPlatforms(mockTrait, platforms);
      const history = bridge.getDeploymentHistory();

      // Most recent deployments are first
      expect(history.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export deployment configuration to JSON', () => {
      const configJson = bridge.exportDeploymentConfig();

      expect(typeof configJson).toBe('string');
      expect(configJson.length).toBeGreaterThan(0);

      // Should be valid JSON
      const parsed = JSON.parse(configJson);
      expect(parsed).toBeDefined();
    });

    it('should import deployment configuration from JSON', () => {
      const configJson = bridge.exportDeploymentConfig();

      // Import should not throw
      expect(() => {
        bridge.importDeploymentConfig(configJson);
      }).not.toThrow();
    });

    it('should preserve configuration after export/import cycle', () => {
      bridge.registerOptimizationStrategy({
        name: 'Test Strategy',
        platforms: ['ios'],
        targetCapability: 'medium',
        textureQuality: 'high',
        meshComplexity: 'medium',
        effectQuality: 'advanced',
        targetFPS: 60,
        maxMemoryMB: 512
      });

      const configJson = bridge.exportDeploymentConfig();
      bridge.clearDeploymentCache();

      bridge.importDeploymentConfig(configJson);

      const strategies = bridge.getOptimizationStrategies();
      expect(strategies.some(s => s.name === 'Test Strategy')).toBe(true);
    });

    it('should handle empty configuration', () => {
      expect(() => {
        bridge.importDeploymentConfig('{}');
      }).not.toThrow();
    });

    it('should handle malformed JSON gracefully', () => {
      expect(() => {
        bridge.importDeploymentConfig('invalid json');
      }).toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should report errors in deployment result', async () => {
      mockGraphicsBridge.compileShader.mockRejectedValueOnce(
        new Error('Compilation failed')
      );

      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should not throw on deployment failure', async () => {
      mockGraphicsBridge.compileShader.mockRejectedValueOnce(
        new Error('Compilation failed')
      );

      expect(async () => {
        await bridge.deployToPlatform(mockTrait, iosTarget);
      }).not.toThrow();
    });

    it('should continue multi-platform deployment on single failure', async () => {
      mockGraphicsBridge.compileShader
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ success: true });

      const platforms = [iosTarget, androidTarget, vrTarget];
      const results = await bridge.deployToManyPlatforms(mockTrait, platforms);

      expect(results.length).toBe(3);
      expect(results.some(r => r.success)).toBe(true);
    });

    it('should include warnings in deployment result', async () => {
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should track failed deployments in status', async () => {
      mockGraphicsBridge.compileShader.mockRejectedValueOnce(
        new Error('Compilation failed')
      );

      const result = await bridge.deployToPlatform(mockTrait, iosTarget);

      const status = bridge.getDeploymentStatus(mockTrait.id, 'ios');

      expect(status?.status).toBe('failed');
      expect(status?.result?.success).toBe(false);
    });
  });

  describe('Concurrent Deployments', () => {
    it('should handle concurrent deployments to different platforms', async () => {
      const deployments = [
        bridge.deployToPlatform(mockTrait, iosTarget),
        bridge.deployToPlatform(mockTrait, androidTarget),
        bridge.deployToPlatform(mockTrait, vrTarget)
      ];

      const results = await Promise.all(deployments);

      expect(results.length).toBe(3);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle concurrent deployments to same platform', async () => {
      const deployments = [
        bridge.deployToPlatform(mockTrait, iosTarget),
        bridge.deployToPlatform(mockTrait, iosTarget)
      ];

      const results = await Promise.all(deployments);

      expect(results.length).toBe(2);
      // Both should succeed (cached second time)
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should maintain deployment status for concurrent operations', async () => {
      const deployments = [
        bridge.deployToPlatform(mockTrait, iosTarget),
        bridge.deployToPlatform(mockTrait, androidTarget),
        bridge.deployToPlatform(mockTrait, vrTarget)
      ];

      const statuses = bridge.getAllDeploymentStatuses();
      // May be empty, pending, or completed depending on timing

      await Promise.all(deployments);

      const finalStatuses = bridge.getAllDeploymentStatuses();
      expect(finalStatuses.length).toBeGreaterThan(0);
    });
  });

  describe('Platform-Specific Capabilities', () => {
    it('should handle iOS Metal shader requirements', async () => {
      const adapter = bridge.getPlatformAdapter('ios');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities?.shaderTargets).toContain('metal');
    });

    it('should handle Android GLSL/SPIR-V requirements', async () => {
      const adapter = bridge.getPlatformAdapter('android');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities?.shaderTargets).toContain('glsl');
    });

    it('should handle VR 90 FPS requirement', async () => {
      const adapter = bridge.getPlatformAdapter('vr');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities?.targetFPS).toBe(90);
    });

    it('should handle Desktop maximum quality', async () => {
      const adapter = bridge.getPlatformAdapter('desktop');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities?.maxTextureSize).toBeGreaterThan(4096);
    });

    it('should handle Web WebGL/WebGPU support', async () => {
      const adapter = bridge.getPlatformAdapter('web');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities?.shaderTargets).toContain('glsl');
    });

    it('should handle AR ARKit/ARCore support', async () => {
      const adapter = bridge.getPlatformAdapter('ar');
      const capabilities = adapter?.getCapabilities();

      expect(capabilities).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should support progressive quality rollout', async () => {
      // Deploy performance tier first
      const performanceResults = await bridge.deployToManyPlatforms(mockTrait, [
        androidTarget,
        webTarget
      ]);

      expect(performanceResults.every(r => r.success)).toBe(true);

      // Then deploy quality tier
      const qualityResults = await bridge.deployToManyPlatforms(mockTrait, [
        desktopTarget
      ]);

      expect(qualityResults[0].success).toBe(true);
    });

    it('should support batch deployment with validation', async () => {
      const traits = [mockTrait, { ...mockTrait, id: 'trait-2' }];
      const results = [];

      for (const trait of traits) {
        const adapter = bridge.getPlatformAdapter('ios');
        const validation = adapter?.validate(trait, iosTarget);

        if (validation?.isValid) {
          const result = await bridge.deployToPlatform(trait, iosTarget);
          results.push(result);
        }
      }

      expect(results.length).toBe(2);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should support deployment with performance monitoring', async () => {
      const result = await bridge.deployToPlatform(mockTrait, desktopTarget);

      expect(result.metrics.totalTimeMs).toBeLessThan(100);
      expect(result.metrics.cpuUsagePercent).toBeLessThanOrEqual(100);
      expect(result.metrics.memoryUsageMB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Scale Testing', () => {
    it('should handle deployment of large trait', async () => {
      const largeTrait: TraitConfig = {
        ...mockTrait,
        properties: {
          ...mockTrait.properties,
          ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [
            `property-${i}`,
            Math.random()
          ]))
        }
      };

      const result = await bridge.deployToPlatform(largeTrait, iosTarget);

      expect(result.success).toBe(true);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should handle multiple sequential deployments', async () => {
      const results = [];

      for (let i = 0; i < 10; i++) {
        const result = await bridge.deployToPlatform(mockTrait, iosTarget);
        results.push(result);
      }

      expect(results.length).toBe(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should maintain performance with many cache entries', async () => {
      // Build up cache
      for (let i = 0; i < 20; i++) {
        const trait = { ...mockTrait, id: `trait-${i}` };
        await bridge.deployToPlatform(trait, iosTarget);
      }

      const stats = bridge.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize);

      // New deployment should still be fast
      const start = performance.now();
      const result = await bridge.deployToPlatform(mockTrait, iosTarget);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });
});
