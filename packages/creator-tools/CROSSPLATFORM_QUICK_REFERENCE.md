# Hololand Cross-Platform Bridge - Quick Reference

## Installation

```typescript
import { HololandCrossPlatformBridge } from '@creator-tools/cross-platform';
```

## Basic Usage

### Deploy to Single Platform

```typescript
const bridge = new HololandCrossPlatformBridge(parserBridge, graphicsBridge);

const result = await bridge.deployToPlatform(trait, {
  platform: 'ios',
  capability: 'medium',
  deviceId: 'iphone-15'
});

console.log(`Success: ${result.success}`);
console.log(`Time: ${result.completionTimeMs}ms`);
```

### Deploy to Multiple Platforms

```typescript
const results = await bridge.deployToManyPlatforms(trait, [
  { platform: 'ios', capability: 'medium', deviceId: 'iphone-15' },
  { platform: 'android', capability: 'medium', deviceId: 'pixel-8' },
  { platform: 'vr', capability: 'high', deviceId: 'quest-3' },
  { platform: 'desktop', capability: 'maximum', deviceId: 'rtx-4090' }
]);
```

## Supported Platforms

- **iOS** - Metal shaders, 256MB VRAM, 60 FPS
- **Android** - GLSL/SPIR-V, 256MB VRAM, 60 FPS
- **VR** - GLSL/SPIR-V, 512MB+ VRAM, 90 FPS
- **Desktop** - Multi-target, 8GB+ VRAM, 240+ FPS
- **Web** - GLSL/WGSL, 2GB VRAM, 60 FPS
- **AR** - Multi-target, 256-512MB VRAM, 60 FPS

## Configuration Options

```typescript
const config = {
  optimizationLevel: 'balanced',    // 'performance', 'balanced', 'quality'
  targetResolution: '1080p',        // 'native', '720p', '1080p', '4k'
  enableStreaming: true,            // Stream large deployments
  enableCaching: true,              // Reuse cached data
  maxRetries: 3,                    // Retry on failure
  timeoutMs: 30000                  // 30 second timeout
};

const result = await bridge.deployToPlatform(trait, target, config);
```

## Monitor Progress

```typescript
// Check deployment status
const status = bridge.getDeploymentStatus(traitId, 'ios');
console.log(`Status: ${status.status}`);      // pending, deploying, success, failed
console.log(`Progress: ${status.progress}%`);  // 0-100

// Get all statuses
const allStatuses = bridge.getAllDeploymentStatuses();
```

## Performance Metrics

```typescript
const result = await bridge.deployToPlatform(trait, target);

console.log(`Download: ${result.metrics.downloadTimeMs}ms`);
console.log(`Compilation: ${result.metrics.compilationTimeMs}ms`);
console.log(`Optimization: ${result.metrics.optimizationTimeMs}ms`);
console.log(`Total: ${result.metrics.totalTimeMs}ms`);
console.log(`CPU: ${result.metrics.cpuUsagePercent}%`);
console.log(`Memory: ${result.metrics.memoryUsageMB}MB`);
```

## Caching

```typescript
// Cache is enabled by default
// Check cache statistics
const stats = bridge.getCacheStats();
console.log(`Cache entries: ${stats.size}/${stats.maxSize}`);
console.log(`Hit rate: ${stats.hitRate * 100}%`);

// Clear cache if needed
bridge.clearDeploymentCache();
```

## Optimization Strategies

```typescript
// Get available strategies
const strategies = bridge.getOptimizationStrategies();

// Register custom strategy
bridge.registerOptimizationStrategy({
  name: 'Custom Strategy',
  platforms: ['ios', 'android'],
  targetCapability: 'medium',
  textureQuality: 'high',
  meshComplexity: 'medium',
  effectQuality: 'advanced',
  targetFPS: 60,
  maxMemoryMB: 512
});
```

## Deployment History

```typescript
// Get recent deployments
const history = bridge.getDeploymentHistory(10);

history.forEach(deployment => {
  console.log(`${deployment.platform}: ${deployment.completionTimeMs}ms`);
});
```

## Export/Import Configuration

```typescript
// Export configuration
const configJson = bridge.exportDeploymentConfig();

// Save to file
fs.writeFileSync('deployment-config.json', configJson);

// Later, import configuration
const savedConfig = fs.readFileSync('deployment-config.json', 'utf-8');
bridge.importDeploymentConfig(savedConfig);
```

## Common Patterns

### Progressive Quality Rollout

```typescript
// Deploy to performance tier first
const performanceResults = await bridge.deployToManyPlatforms(trait, [
  { platform: 'android', capability: 'low', deviceId: 'budget-phone' },
  { platform: 'web', capability: 'medium', deviceId: 'chrome' }
]);

// Then deploy to quality tier
const qualityResults = await bridge.deployToManyPlatforms(trait, [
  { platform: 'desktop', capability: 'maximum', deviceId: 'rtx-4090' },
  { platform: 'vr', capability: 'high', deviceId: 'quest-3' }
]);
```

### Validation Before Deployment

```typescript
const adapter = bridge.getPlatformAdapter(target.platform);
const validation = adapter?.validate(trait, target);

if (!validation?.isValid) {
  console.error('Validation errors:', validation?.errors);
} else {
  const result = await bridge.deployToPlatform(trait, target);
}
```

### Error Handling

```typescript
try {
  const result = await bridge.deployToPlatform(trait, target);

  if (!result.success) {
    console.error('Deployment errors:', result.errors);
    console.warn('Warnings:', result.warnings);
  }
} catch (error) {
  console.error('Deployment failed:', error);
}
```

## Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Single platform | <100ms | ✅ |
| 6 platforms | <500ms | ✅ |
| Validation | <20ms | ✅ |
| Platform selection | <50ms | ✅ |

## Platform Adapters

```typescript
// Get adapter for specific platform
const iOSAdapter = bridge.getPlatformAdapter('ios');

// Get platform capabilities
const capabilities = iOSAdapter?.getCapabilities();
console.log(`Max texture size: ${capabilities?.maxTextureSize}`);
console.log(`Max draw calls: ${capabilities?.maxDrawCalls}`);
console.log(`Target FPS: ${capabilities?.targetFPS}`);

// Get all supported platforms
const platforms = bridge.getSupportedPlatforms();
console.log(`Supported: ${platforms.join(', ')}`);
```

## Advanced Usage

### Batch Deployment with Validation

```typescript
async function deployBatch(traits, platform) {
  const results = [];
  const adapter = bridge.getPlatformAdapter(platform.platform);

  for (const trait of traits) {
    const validation = adapter?.validate(trait, platform);

    if (validation?.isValid) {
      const result = await bridge.deployToPlatform(trait, platform);
      results.push(result);
    }
  }

  return results;
}
```

### Platform-Specific Configuration

```typescript
const configs = {
  ios: { optimizationLevel: 'balanced', targetResolution: '1080p' },
  android: { optimizationLevel: 'performance', targetResolution: '720p' },
  desktop: { optimizationLevel: 'quality', targetResolution: '4k' }
};

const results = await Promise.all(
  Object.entries(configs).map(([platform, config]) =>
    bridge.deployToPlatform(trait, { platform, capability: 'medium', deviceId: platform }, config)
  )
);
```

## Troubleshooting

### Deployment Exceeds Time Target

```typescript
// Use performance optimization
const config = {
  optimizationLevel: 'performance',
  targetResolution: '720p',
  enableStreaming: true
};

const result = await bridge.deployToPlatform(trait, target, config);
```

### Mobile Deployment Fails

```typescript
// Check if platform has required capabilities
const adapter = bridge.getPlatformAdapter('ios');
const validation = adapter?.validate(trait, target);

if (!validation?.isValid) {
  console.error('Requirements not met:', validation?.errors);
}
```

### Cache Issues

```typescript
// Clear cache and redeploy
bridge.clearDeploymentCache();

const result = await bridge.deployToPlatform(trait, target);
```

## API Summary

```typescript
interface HololandCrossPlatformBridge {
  // Deployment
  deployToPlatform(trait, target, config?): Promise<DeploymentResult>
  deployToManyPlatforms(trait, platforms, config?): Promise<DeploymentResult[]>

  // Status Tracking
  getDeploymentStatus(traitId, platform): DeploymentStatusInfo | undefined
  getAllDeploymentStatuses(): DeploymentStatusInfo[]

  // History
  getDeploymentHistory(limit?): DeploymentResult[]

  // Caching
  clearDeploymentCache(): void
  getCacheStats(): CacheStats

  // Optimization
  registerOptimizationStrategy(strategy): void
  getOptimizationStrategies(): OptimizationStrategy[]

  // Platforms
  getPlatformAdapter(platform): PlatformAdapter | undefined
  getSupportedPlatforms(): string[]

  // Configuration
  exportDeploymentConfig(): string
  importDeploymentConfig(jsonData): void
}
```

---

For complete documentation, see [HOLOLAND_CROSSPLATFORM_INTEGRATION_GUIDE.md](./HOLOLAND_CROSSPLATFORM_INTEGRATION_GUIDE.md)
