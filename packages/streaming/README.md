# @holoscript/streaming

**Asset and world streaming for HoloScript VR/AR**

Progressive loading, LOD streaming, and smart caching for large VR worlds.

## Features

- 📦 **Progressive Loading** — Load assets in priority order
- 🎯 **LOD Streaming** — Stream level-of-detail based on camera distance
- 🗄️ **Smart Caching** — Memory + IndexedDB with automatic eviction
- 📊 **Memory Budget** — Stay within hardware limits
- 🔗 **Bundle Support** — Load asset bundles efficiently

## Installation

```bash
npm install @holoscript/streaming
```

## Quick Start

```typescript
import { AssetLoader, CacheManager } from '@holoscript/streaming';

// Create loader with caching
const cache = new CacheManager({
  maxMemoryMB: 512,
  indexedDBName: 'holoscript-assets',
});

const loader = new AssetLoader({ cache });

// Load an asset
const model = await loader.load({
  id: 'character-model',
  url: '/models/character.glb',
  type: AssetType.Model,
  priority: LoadPriority.High,
});
```

## Asset Loading

### Basic Loading

```typescript
import { AssetLoader, AssetType, LoadPriority } from '@holoscript/streaming';

const loader = new AssetLoader();

// Load with priority
const texture = await loader.load({
  id: 'hero-texture',
  url: '/textures/hero.png',
  type: AssetType.Texture,
  priority: LoadPriority.Immediate,
});

// Load in background
const ambientAudio = await loader.load({
  id: 'ambient-sound',
  url: '/audio/forest.mp3',
  type: AssetType.Audio,
  priority: LoadPriority.Background,
});
```

### Progress Tracking

```typescript
const asset = await loader.load({
  id: 'large-model',
  url: '/models/world.glb',
  type: AssetType.Model,
  priority: LoadPriority.Normal,
  onProgress: (progress) => {
    console.log(`${progress.phase}: ${(progress.progress * 100).toFixed(1)}%`);
    console.log(`ETA: ${progress.estimatedTimeRemaining}ms`);
  },
});
```

### Queue Management

```typescript
import { LoadQueue } from '@holoscript/streaming';

const queue = new LoadQueue({
  maxConcurrentDownloads: 4,
  maxConcurrentProcessing: 2,
  timeout: 30000,
});

// Add multiple assets
queue.enqueue([
  { id: 'tex1', url: '/t1.png', type: AssetType.Texture, priority: LoadPriority.High },
  { id: 'tex2', url: '/t2.png', type: AssetType.Texture, priority: LoadPriority.Normal },
  { id: 'tex3', url: '/t3.png', type: AssetType.Texture, priority: LoadPriority.Low },
]);

// Higher priority assets load first
await queue.processAll();
```

## Progressive Loading

Load assets in stages for faster initial display:

```typescript
import { ProgressiveLoader } from '@holoscript/streaming';

const progressive = new ProgressiveLoader();

// Load low-res first, then upgrade
const model = await progressive.loadProgressive({
  id: 'terrain',
  stages: [
    { url: '/terrain-low.glb', lodLevel: 2 },
    { url: '/terrain-med.glb', lodLevel: 1 },
    { url: '/terrain-high.glb', lodLevel: 0 },
  ],
  onStageComplete: (stage, data) => {
    scene.updateTerrain(data); // Show each stage as it loads
  },
});
```

## Bundle Loading

Load related assets together:

```typescript
import { BundleLoader } from '@holoscript/streaming';

const bundleLoader = new BundleLoader();

// Load a complete character bundle
const characterBundle = await bundleLoader.loadBundle({
  id: 'player-character',
  url: '/bundles/player.bundle',
  manifest: {
    model: 'character.glb',
    textures: ['diffuse.png', 'normal.png'],
    animations: ['idle.anim', 'walk.anim', 'run.anim'],
  },
});

// Access individual assets
const model = characterBundle.get('model');
const walkAnim = characterBundle.get('animations/walk.anim');
```

## Caching

### Memory Cache

Fast in-memory cache:

```typescript
import { MemoryCache } from '@holoscript/streaming';

const memCache = new MemoryCache({
  maxSizeMB: 256,
  evictionPolicy: 'lru', // Least recently used
});

memCache.set('texture-1', textureData);
const cached = memCache.get('texture-1');
```

### IndexedDB Cache

Persistent browser storage:

```typescript
import { IndexedDBCache } from '@holoscript/streaming';

const dbCache = new IndexedDBCache({
  dbName: 'holoscript-cache',
  maxSizeMB: 1024,
});

await dbCache.set('model-1', modelData);
const cached = await dbCache.get('model-1');
```

### Cache Manager

Unified cache with automatic tiering:

```typescript
import { CacheManager } from '@holoscript/streaming';

const cache = new CacheManager({
  maxMemoryMB: 512,
  maxDiskMB: 2048,
  indexedDBName: 'my-game-cache',
});

// Automatically uses memory first, falls back to disk
const asset = await cache.get('large-asset');

// Clear old entries
await cache.evict({ olderThan: Date.now() - 86400000 }); // 24 hours
```

## Memory Budget

Stay within hardware limits:

```typescript
import { MemoryBudgetMonitor } from '@holoscript/streaming';

const monitor = new MemoryBudgetMonitor({
  budgetMB: 512,
  warningThreshold: 0.8, // 80%
  criticalThreshold: 0.95, // 95%
});

monitor.onWarning(() => {
  console.log('Memory usage high, reducing quality');
  loader.setMaxLOD(1); // Limit to medium quality
});

monitor.onCritical(() => {
  console.log('Memory critical, unloading distant assets');
  loader.unloadDistant(playerPosition, 100); // Unload assets > 100m away
});

// Check current usage
console.log(`Memory: ${monitor.usedMB}MB / ${monitor.budgetMB}MB`);
```

## Asset Types

| Type | Description | Extensions |
|------|-------------|------------|
| `Mesh` | 3D geometry | .obj, .fbx |
| `Model` | Complete 3D model | .glb, .gltf |
| `Texture` | 2D images | .png, .jpg, .webp |
| `Material` | Material definitions | .mat |
| `Audio` | Sound files | .mp3, .ogg, .wav |
| `Animation` | Animation clips | .anim |
| `Script` | HoloScript files | .hs, .hsplus, .holo |
| `Scene` | Complete scenes | .scene |
| `Prefab` | Reusable objects | .prefab |
| `Shader` | Custom shaders | .glsl, .wgsl |

## Load Priorities

| Priority | Value | Use Case |
|----------|-------|----------|
| `Background` | 0 | Prefetching, non-visible |
| `Low` | 1 | Distant objects |
| `Normal` | 2 | Default priority |
| `High` | 3 | Player-facing content |
| `Immediate` | 4 | Blocking, must-have |

## Integration with HoloScript

Use with streaming traits in `.hsplus` files:

```hsplus
composition "Large World" {
  assets {
    bundle "environment" {
      progressive: true
      lod_levels: 3
      preload_distance: 100
    }
  }
  
  spatial_group "Zone_A" @streaming {
    load_distance: 200
    unload_distance: 300
    lod_bias: 1
  }
}
```

## Types

```typescript
import type {
  AssetType,
  AssetState,
  AssetInfo,
  LoadedAsset,
  LoadPriority,
  LoadRequest,
  LoadProgress,
} from '@holoscript/streaming';
```

## License

MIT © Brian Joseph
