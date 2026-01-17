# Hololand Graphics Pipeline Integration Guide

Complete documentation for connecting Phase 6 trait system to Hololand graphics pipeline through material creation, shader compilation, and cross-device rendering optimization.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Complete API Reference](#complete-api-reference)
4. [Device Optimization](#device-optimization)
5. [Shader Compilation](#shader-compilation)
6. [Material System](#material-system)
7. [Performance Optimization](#performance-optimization)
8. [Error Handling & Recovery](#error-handling--recovery)
9. [Integration Examples](#integration-examples)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Architecture Overview

The HololandGraphicsBridge connects Phase 6's trait annotation system to Hololand's graphics rendering pipeline through a three-stage pipeline:

```
TraitAnnotationEditor (Phase 6)
       ↓
Material Creation Layer
       ↓
Shader Compilation Layer (Multi-target: Metal, GLSL, HLSL, SPIR-V, WGSL)
       ↓
Device Optimization Layer (6 target devices)
       ↓
Graphics Rendering Context
       ↓
Hololand Graphics Pipeline
```

### Key Components

**HololandGraphicsBridge**: Main integration class managing:
- Material creation from trait configurations
- Multi-target shader compilation
- Device-specific rendering optimization
- Performance metrics collection
- Error handling and recovery

**GraphicsMaterial**: Complete material representation including:
- Shader programs with compiled bytecode
- Material properties (roughness, metallic, etc.)
- Texture bindings
- Render state (blending, depth testing, face culling)
- GPU memory estimation

**ShaderProgram**: Multi-target shader support:
- Vertex and fragment source code
- Compiled bytecode for each target (Metal, GLSL, etc.)
- Shader reflection data (uniforms, attributes, samplers)
- Performance metrics

## Quick Start Guide

### Basic Material Creation

```typescript
import { HololandGraphicsBridge } from '@creator-tools/graphics';
import { TraitAnnotationEditor } from '@creator-tools/traits';
import { RealtimePreviewEngine } from '@creator-tools/preview';

// Initialize components
const editor = new TraitAnnotationEditor();
const engine = new RealtimePreviewEngine();
const bridge = new HololandGraphicsBridge(editor, engine);

// Get trait configuration
const trait = editor.getTrait('my-material-trait');

// Create material for specific device
const material = bridge.createMaterialFromTrait(trait, 'iphone-15');

console.log(`Created material: ${material.id}`);
console.log(`GPU Memory: ${material.gpuMemoryBytes / 1024 / 1024}MB`);
```

### Material Optimization

```typescript
// Optimize for device capabilities
bridge.optimizeForDevice(material.id, 'quest-3');

// Register rendering context
bridge.registerRenderingContext('quest-3', {
  maxTextureSize: 2048,
  maxRenderTargetSize: 2048,
  maxUniformBufferSize: 65536,
  supportsCompute: false,
  supportsRayTracing: false,
  supportedShaderTargets: ['glsl', 'spirv'],
  gpuMemoryMB: 512,
  estimatedVRAMUsed: 256
});
```

### Performance Monitoring

```typescript
// Update rendering metrics
bridge.updateRenderingMetrics('quest-3', {
  frameTimeMs: 16.67,
  drawCallCount: 150,
  triangleCount: 750000,
  textureMemoryMB: 256,
  uniformBufferMemoryMB: 16,
  lastFrameGpuTimeMs: 14.2
});

// Retrieve metrics
const metrics = bridge.getRenderingMetrics('quest-3');
console.log(`FPS: ${metrics.fps}`);
console.log(`Average frame time: ${metrics.averageFrameTimeMs}ms`);
```

### Data Persistence

```typescript
// Export graphics data
const json = bridge.exportGraphicsData();
fs.writeFileSync('graphics-data.json', json);

// Import graphics data
const data = fs.readFileSync('graphics-data.json', 'utf-8');
bridge.importGraphicsData(data);
```

### Common Patterns

#### Pattern 1: Multi-Device Material Suite

```typescript
const deviceIds = ['iphone-15', 'ipad-pro', 'quest-3', 'vision-pro', 'hololens-2', 'rtx-4090'];
const materials: Record<string, GraphicsMaterial> = {};

for (const deviceId of deviceIds) {
  const material = bridge.createMaterialFromTrait(trait, deviceId);
  bridge.optimizeForDevice(material.id, deviceId);
  materials[deviceId] = material;
}
```

#### Pattern 2: Quality Tier Selection

```typescript
const qualityTiers = {
  'low': ['iphone-15', 'quest-3'],
  'medium': ['ipad-pro', 'hololens-2'],
  'high': ['vision-pro', 'rtx-4090']
};

for (const [tier, devices] of Object.entries(qualityTiers)) {
  for (const device of devices) {
    const material = bridge.createMaterialFromTrait(trait, device);
    bridge.optimizeForDevice(material.id, device);
  }
}
```

#### Pattern 3: Performance-First Optimization

```typescript
const targetFPS = 60;
const maxFrameTime = 1000 / targetFPS;

for (const device of deviceIds) {
  const material = bridge.createMaterialFromTrait(trait, device);
  bridge.optimizeForDevice(material.id, device);
  
  const metrics = bridge.getRenderingMetrics(device);
  if (metrics && metrics.frameTimeMs > maxFrameTime) {
    // Reduce quality for performance
    adjustQualityForPerformance(material, device);
  }
}
```

#### Pattern 4: Texture Resolution Adaptation

```typescript
const textureResolutions = {
  'iphone-15': 1024,
  'ipad-pro': 2048,
  'quest-3': 1024,
  'vision-pro': 4096,
  'hololens-2': 2048,
  'rtx-4090': 4096
};

for (const [device, resolution] of Object.entries(textureResolutions)) {
  const material = bridge.createMaterialFromTrait(trait, device);
  material.textures.forEach(tex => {
    tex.samplerType = getAppropriateFormat(resolution);
  });
}
```

#### Pattern 5: Progressive Quality Loading

```typescript
async function loadMaterialProgressive(trait: TraitConfig) {
  // Start with low quality
  const lowQuality = bridge.createMaterialFromTrait(trait, 'iphone-15');
  renderer.setMaterial(lowQuality);
  
  // Load medium quality in background
  setTimeout(() => {
    const mediumQuality = bridge.createMaterialFromTrait(trait, 'ipad-pro');
    renderer.setMaterial(mediumQuality);
  }, 100);
  
  // Load high quality when ready
  setTimeout(() => {
    const highQuality = bridge.createMaterialFromTrait(trait, 'rtx-4090');
    renderer.setMaterial(highQuality);
  }, 500);
}
```

## Complete API Reference

### HololandGraphicsBridge Class

#### Constructor

```typescript
constructor(
  traitEditor: TraitAnnotationEditor,
  previewEngine: RealtimePreviewEngine,
  strictMode: boolean = false
)
```

Create a new graphics bridge instance.

**Parameters:**
- `traitEditor`: TraitAnnotationEditor instance for accessing trait configurations
- `previewEngine`: RealtimePreviewEngine for performance monitoring
- `strictMode`: If true, throw errors on performance violations

**Example:**
```typescript
const bridge = new HololandGraphicsBridge(editor, engine, true);
```

#### createMaterialFromTrait()

```typescript
public createMaterialFromTrait(
  traitConfig: TraitConfig,
  deviceId: string
): GraphicsMaterial
```

Create a graphics material from a trait configuration for a specific device.

**Parameters:**
- `traitConfig`: Trait configuration from Phase 6
- `deviceId`: Target device ID ('iphone-15', 'ipad-pro', 'quest-3', 'vision-pro', 'hololens-2', 'rtx-4090')

**Returns:** GraphicsMaterial with compiled shaders and device-specific properties

**Performance:** <80ms typical, <100ms maximum

**Example:**
```typescript
const trait = editor.getTrait('pbr-material');
const material = bridge.createMaterialFromTrait(trait, 'vision-pro');
console.log(`GPU Memory: ${material.gpuMemoryBytes}B`);
```

**Error Handling:**
- Throws if device ID is unknown
- Throws if shader compilation fails in strict mode
- Returns material with warnings in normal mode

#### registerRenderingContext()

```typescript
public registerRenderingContext(
  deviceId: string,
  context: Omit<GraphicsRenderingContext, 'deviceId'>
): void
```

Register a graphics rendering context for a device.

**Parameters:**
- `deviceId`: Device identifier
- `context`: Rendering capabilities and constraints

**Example:**
```typescript
bridge.registerRenderingContext('rtx-4090', {
  maxTextureSize: 16384,
  maxRenderTargetSize: 4096,
  maxUniformBufferSize: 131072,
  supportsCompute: true,
  supportsRayTracing: true,
  supportedShaderTargets: ['glsl', 'hlsl', 'spirv', 'wgsl'],
  gpuMemoryMB: 24576,
  estimatedVRAMUsed: 8192
});
```

#### optimizeForDevice()

```typescript
public optimizeForDevice(
  materialId: string,
  deviceId: string
): void
```

Apply device-specific rendering optimizations to a material.

**Parameters:**
- `materialId`: Material identifier
- `deviceId`: Target device ID

**Performance:** <50ms typical

**Example:**
```typescript
bridge.optimizeForDevice(material.id, 'quest-3');
```

**What It Does:**
- Applies quality tier based on device capability
- Adjusts shader parameters
- Optimizes texture usage
- Updates material timestamps

#### updateRenderingMetrics()

```typescript
public updateRenderingMetrics(
  deviceId: string,
  metrics: Omit<RenderingMetrics, 'averageFrameTimeMs' | 'fps'>
): void
```

Update rendering performance metrics for a device.

**Parameters:**
- `deviceId`: Device identifier
- `metrics`: Current frame metrics

**Example:**
```typescript
bridge.updateRenderingMetrics('iphone-15', {
  frameTimeMs: 16.67,
  drawCallCount: 120,
  triangleCount: 650000,
  textureMemoryMB: 256,
  uniformBufferMemoryMB: 12,
  lastFrameGpuTimeMs: 14.5
});
```

#### getRenderingMetrics()

```typescript
public getRenderingMetrics(
  deviceId: string
): RenderingMetrics | undefined
```

Get rendering metrics for a device.

**Returns:** RenderingMetrics with FPS and average frame time calculated

**Example:**
```typescript
const metrics = bridge.getRenderingMetrics('vision-pro');
if (metrics && metrics.fps < 60) {
  console.warn(`Low FPS detected: ${metrics.fps}`);
}
```

#### getMaterialsForTrait()

```typescript
public getMaterialsForTrait(traitId: string): GraphicsMaterial[]
```

Get all materials created from a specific trait.

**Example:**
```typescript
const materials = bridge.getMaterialsForTrait('pbr-material');
console.log(`Created ${materials.length} device variants`);
```

#### getAllMaterials()

```typescript
public getAllMaterials(): GraphicsMaterial[]
```

Get all materials managed by the bridge.

**Example:**
```typescript
const totalGPUMemory = bridge.getAllMaterials().reduce(
  (sum, m) => sum + m.gpuMemoryBytes,
  0
);
```

#### getErrors()

```typescript
public getErrors(): GraphicsCompilationError[]
```

Get all recorded compilation and validation errors.

**Example:**
```typescript
const errors = bridge.getErrors();
errors.forEach(err => {
  console.error(`[${err.type}] ${err.message}`);
});
```

#### clearErrors()

```typescript
public clearErrors(): void
```

Clear error history.

#### recoverFromError()

```typescript
public recoverFromError(
  error: GraphicsCompilationError
): boolean
```

Attempt recovery from a compilation error.

**Returns:** true if recovery was successful, false otherwise

**Example:**
```typescript
for (const error of bridge.getErrors()) {
  if (error.recoverable) {
    bridge.recoverFromError(error);
  }
}
```

#### exportGraphicsData()

```typescript
public exportGraphicsData(): string
```

Export all graphics data to JSON format.

**Returns:** JSON string with all materials and device profiles

**Example:**
```typescript
const json = bridge.exportGraphicsData();
fs.writeFileSync('graphics-backup.json', json);
```

#### importGraphicsData()

```typescript
public importGraphicsData(jsonData: string): void
```

Import graphics data from JSON.

**Example:**
```typescript
const json = fs.readFileSync('graphics-backup.json', 'utf-8');
bridge.importGraphicsData(json);
```

### Type Definitions

#### GraphicsMaterial

```typescript
interface GraphicsMaterial {
  id: string;                    // Unique material ID
  name: string;                  // Material name
  traitId: string;               // Source trait ID
  shader: ShaderProgram;         // Compiled shader program
  properties: MaterialPropertyValue[];  // Material properties
  textures: TextureBinding[];    // Texture bindings
  renderQueue: number;           // Render order (0-5000)
  cullMode: 'none' | 'front' | 'back';
  blendMode: BlendMode;          // Transparency blend settings
  depthTest: boolean;            // Depth test enabled
  depthWrite: boolean;           // Depth write enabled
  createdAtMs: number;           // Creation timestamp
  lastModifiedMs: number;        // Last modification timestamp
  gpuMemoryBytes: number;        // Estimated GPU memory
}
```

#### ShaderProgram

```typescript
interface ShaderProgram {
  name: string;                  // Shader name
  vertexSource: string;          // GLSL vertex shader source
  fragmentSource: string;        // GLSL fragment shader source
  compiledTargets: Map<ShaderTarget, ShaderCompilationResult>;
  hash: string;                  // Configuration hash for caching
}
```

#### RenderingMetrics

```typescript
interface RenderingMetrics {
  frameTimeMs: number;           // Current frame time
  drawCallCount: number;         // Draw calls per frame
  triangleCount: number;         // Triangles rendered
  textureMemoryMB: number;       // Texture VRAM used
  uniformBufferMemoryMB: number; // Uniform buffer memory
  lastFrameGpuTimeMs: number;    // GPU frame time
  averageFrameTimeMs: number;    // Running average
  fps: number;                   // Calculated FPS
}
```

## Device Optimization

### Target Devices

The bridge optimizes for 6 target devices with specific capabilities:

#### 1. iPhone 15
- **GPU**: Apple A17 Pro
- **Max Texture Size**: 2048×2048
- **Max VRAM**: 256 MB
- **Shader Targets**: Metal
- **Strategy**: Balanced (60 FPS target)
- **Quality Tier**: Medium-High
- **Features**: Basic PBR, limited effects

#### 2. iPad Pro (M2)
- **GPU**: Apple M2
- **Max Texture Size**: 4096×4096
- **Max VRAM**: 512 MB
- **Shader Targets**: Metal
- **Strategy**: Balanced (120 FPS target)
- **Quality Tier**: High
- **Features**: Advanced PBR, post-processing

#### 3. Meta Quest 3
- **GPU**: Adreno 8 Gen 2
- **Max Texture Size**: 2048×2048
- **Max VRAM**: 512 MB
- **Shader Targets**: GLSL, SPIR-V
- **Strategy**: Performance (90 FPS target)
- **Quality Tier**: Medium
- **Features**: Essential rendering only

#### 4. Apple Vision Pro
- **GPU**: Apple M2 + custom GPU
- **Max Texture Size**: 4096×4096
- **Max VRAM**: 2 GB
- **Shader Targets**: Metal
- **Strategy**: Quality (120 FPS target)
- **Quality Tier**: Maximum
- **Features**: Full PBR, advanced effects, ray tracing ready

#### 5. Microsoft HoloLens 2
- **GPU**: Adreno 685
- **Max Texture Size**: 2048×2048
- **Max VRAM**: 1 GB
- **Shader Targets**: HLSL
- **Strategy**: Balanced (60 FPS target)
- **Quality Tier**: High
- **Features**: Advanced rendering with spatial awareness

#### 6. NVIDIA RTX 4090
- **GPU**: Ada Lovelace (16,384 CUDA cores)
- **Max Texture Size**: 16384×16384
- **Max VRAM**: 24 GB
- **Shader Targets**: GLSL, HLSL, SPIR-V, WGSL
- **Strategy**: Quality (240+ FPS target)
- **Quality Tier**: Maximum
- **Features**: Full featured, no limits

### Optimization Strategies

#### Quality Strategy (Vision Pro, RTX 4090)
- Maximum texture resolution
- All post-processing effects enabled
- Advanced lighting calculations
- High-quality normal mapping
- Parallax mapping support
- Ambient occlusion enabled

#### Balanced Strategy (iPhone 15, iPad Pro, HoloLens 2)
- Standard texture resolution (2K-4K)
- Essential post-processing only
- Standard lighting
- Normal mapping with limited quality
- Ambient occlusion disabled
- Moderate draw call budget

#### Performance Strategy (Quest 3)
- Reduced texture resolution (1K-2K)
- Minimal post-processing
- Simplified lighting
- Basic normal mapping
- No ambient occlusion
- Aggressive draw call reduction

### Custom Optimization

```typescript
// Manual device profile creation
const customProfile: DeviceGraphicsProfile = {
  deviceId: 'custom-device',
  deviceName: 'Custom VR Headset',
  maxShaderTargets: ['glsl'],
  maxTextureSize: 2048,
  maxGpuMemoryMB: 1024,
  estimatedFPS: 90,
  supportsAdvancedFeatures: false,
  optimizationStrategy: 'performance'
};

// Apply to bridge
bridge.optimizeForDevice(material.id, 'custom-device');
```

## Shader Compilation

### Multi-Target Compilation

The bridge automatically compiles shaders for multiple targets:

```typescript
// Automatically compiles for device's supported targets
const material = bridge.createMaterialFromTrait(trait, 'rtx-4090');

// Check compiled targets
for (const [target, result] of material.shader.compiledTargets.entries()) {
  console.log(`${target}: ${result.bytecode.byteLength} bytes`);
  console.log(`Compile time: ${result.compileTimeMs}ms`);
}
```

### Shader Reflection

Each compiled shader includes reflection data:

```typescript
const compiled = material.shader.compiledTargets.get('metal');

// Access vertex attributes
compiled.reflectionData.attributes.forEach(attr => {
  console.log(`${attr.name}: ${attr.type} at location ${attr.location}`);
});

// Access uniforms
compiled.reflectionData.uniforms.forEach(uniform => {
  console.log(`${uniform.name}: ${uniform.type}`);
});

// Access samplers
compiled.reflectionData.samplers.forEach(sampler => {
  console.log(`${sampler.name}: ${sampler.dimension}D`);
});
```

### Shader Caching

Identical shader configurations are cached:

```typescript
// Both create materials from same trait, shader is cached
const mat1 = bridge.createMaterialFromTrait(trait, 'iphone-15');
const mat2 = bridge.createMaterialFromTrait(trait, 'ipad-pro');

// Same shader (same hash)
console.log(mat1.shader.hash === mat2.shader.hash); // true
```

## Material System

### Material Properties

Each material has properties that control rendering:

```typescript
interface MaterialPropertyValue {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'int' | 'bool';
  value: number | number[] | boolean;
  defaultValue: number | number[] | boolean;
}
```

### Texture Bindings

Materials support multiple texture bindings:

```typescript
interface TextureBinding {
  name: string;                  // Uniform name in shader
  textureId: string;             // Texture asset ID
  samplerType: 'float' | 'int' | 'uint';
  binding: number;               // Binding index
}
```

### Render State

Control rendering pipeline behavior:

```typescript
// Face culling
material.cullMode = 'back';        // Cull back faces

// Transparency blending
material.blendMode = {
  enabled: true,
  srcFactor: 'src_alpha',
  dstFactor: 'one_minus_src_alpha',
  operation: 'add'
};

// Depth testing
material.depthTest = true;        // Enable depth test
material.depthWrite = true;       // Write to depth buffer

// Render order
material.renderQueue = 2500;      // Render after opaque (2000)
```

## Performance Optimization

### Performance Targets

- Material creation: <80ms
- Shader compilation: <100ms per target
- Device optimization: <50ms
- Rendering: <16.67ms per frame (60 FPS)
- Memory: <200MB GPU VRAM typical

### Monitoring Performance

```typescript
// Track frame time
bridge.updateRenderingMetrics(deviceId, {
  frameTimeMs: performance.now(),
  drawCallCount: renderer.getDrawCallCount(),
  triangleCount: renderer.getTriangleCount(),
  textureMemoryMB: renderer.getTextureMemoryMB(),
  uniformBufferMemoryMB: renderer.getUniformMemoryMB(),
  lastFrameGpuTimeMs: renderer.getGpuFrameTime()
});

// Check if performance is adequate
const metrics = bridge.getRenderingMetrics(deviceId);
if (metrics.fps < 60) {
  console.warn('Performance degradation detected');
  // Reduce quality
  bridge.optimizeForDevice(material.id, deviceId);
}
```

### Memory Management

```typescript
// Check material memory usage
material.textures.forEach(texture => {
  const estimatedSize = material.gpuMemoryBytes / material.textures.length;
  console.log(`Texture memory: ${(estimatedSize / 1024 / 1024).toFixed(1)}MB`);
});

// Monitor total VRAM usage
const totalMemory = bridge.getAllMaterials().reduce(
  (sum, m) => sum + m.gpuMemoryBytes,
  0
);
console.log(`Total GPU memory: ${(totalMemory / 1024 / 1024).toFixed(1)}MB`);
```

## Error Handling & Recovery

### Error Types

The bridge recognizes four error categories:

```typescript
type GraphicsCompilationErrorType = 
  | 'shader_compile'        // Shader compilation failed
  | 'material_config'       // Material configuration invalid
  | 'memory'                // GPU memory exceeded
  | 'device_capability';    // Device cannot support requirement
```

### Error Recovery

```typescript
// Automatic recovery
for (const error of bridge.getErrors()) {
  if (error.recoverable) {
    if (bridge.recoverFromError(error)) {
      console.log('Error recovered');
    }
  } else {
    console.error(`Fatal error: ${error.message}`);
  }
}
```

### Strict Mode

Enable strict mode to throw on performance violations:

```typescript
const strictBridge = new HololandGraphicsBridge(editor, engine, true);

try {
  // Will throw if performance target exceeded
  strictBridge.createMaterialFromTrait(trait, 'iphone-15');
} catch (error) {
  console.error('Performance violation:', error.message);
}
```

## Integration Examples

### React Component Integration

```typescript
import React, { useState, useEffect } from 'react';
import { HololandGraphicsBridge } from '@creator-tools/graphics';

export function MaterialViewer({ traitId }: { traitId: string }) {
  const [material, setMaterial] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [device, setDevice] = useState('iphone-15');

  useEffect(() => {
    const bridge = new HololandGraphicsBridge(editor, engine);
    const trait = editor.getTrait(traitId);
    
    const mat = bridge.createMaterialFromTrait(trait, device);
    bridge.optimizeForDevice(mat.id, device);
    
    setMaterial(mat);
    
    const interval = setInterval(() => {
      const currentMetrics = bridge.getRenderingMetrics(device);
      setMetrics(currentMetrics);
    }, 100);
    
    return () => clearInterval(interval);
  }, [traitId, device]);

  return (
    <div>
      <h2>{material?.name}</h2>
      <p>GPU Memory: {(material?.gpuMemoryBytes / 1024 / 1024).toFixed(1)}MB</p>
      {metrics && <p>FPS: {metrics.fps.toFixed(1)}</p>}
      
      <select value={device} onChange={e => setDevice(e.target.value)}>
        <option value="iphone-15">iPhone 15</option>
        <option value="ipad-pro">iPad Pro</option>
        <option value="quest-3">Quest 3</option>
        <option value="vision-pro">Vision Pro</option>
        <option value="hololens-2">HoloLens 2</option>
        <option value="rtx-4090">RTX 4090</option>
      </select>
    </div>
  );
}
```

### CLI Integration

```typescript
import { HololandGraphicsBridge } from '@creator-tools/graphics';
import * as fs from 'fs';
import * as path from 'path';

async function compileTraitToGraphics(traitPath: string, outputDir: string) {
  // Load trait
  const traitJson = fs.readFileSync(traitPath, 'utf-8');
  const trait = JSON.parse(traitJson);

  const bridge = new HololandGraphicsBridge(editor, engine);
  
  // Compile for each device
  const devices = ['iphone-15', 'ipad-pro', 'quest-3', 'vision-pro', 'hololens-2', 'rtx-4090'];
  
  for (const device of devices) {
    console.log(`Compiling for ${device}...`);
    
    const material = bridge.createMaterialFromTrait(trait, device);
    bridge.optimizeForDevice(material.id, device);
    
    // Save material
    const materialJson = JSON.stringify(material, null, 2);
    const outputPath = path.join(outputDir, `${trait.name}_${device}.json`);
    fs.writeFileSync(outputPath, materialJson);
    
    console.log(`  ✓ ${outputPath}`);
  }

  // Export all data
  const allData = bridge.exportGraphicsData();
  fs.writeFileSync(path.join(outputDir, 'graphics-data.json'), allData);
}
```

## Best Practices

### 1. Pre-optimize for Target Devices
Identify your target devices early and optimize accordingly:

```typescript
const targetDevices = ['iphone-15', 'ipad-pro', 'rtx-4090'];

for (const device of targetDevices) {
  const material = bridge.createMaterialFromTrait(trait, device);
  bridge.optimizeForDevice(material.id, device);
}
```

### 2. Monitor Performance Continuously
Track metrics and respond to degradation:

```typescript
setInterval(() => {
  const metrics = bridge.getRenderingMetrics(deviceId);
  if (metrics && metrics.fps < targetFPS) {
    // Reduce quality
    bridge.optimizeForDevice(material.id, deviceId);
  }
}, 1000);
```

### 3. Use Caching for Identical Shaders
Identical trait configurations automatically cache shaders:

```typescript
// These share the same shader (cached)
const mat1 = bridge.createMaterialFromTrait(trait, 'iphone-15');
const mat2 = bridge.createMaterialFromTrait(trait, 'ipad-pro');
// shader compilation only happens once
```

### 4. Validate Device Capabilities
Check device profile before expecting features:

```typescript
const trait = editor.getTrait('advanced-material');
const material = bridge.createMaterialFromTrait(trait, 'quest-3');

// quest-3 may not support all features
// Check errors and handle degradation
const errors = bridge.getErrors();
if (errors.some(e => e.type === 'device_capability')) {
  console.log('Downgrading to performance mode');
}
```

### 5. Implement Progressive Loading
Load materials progressively from low to high quality:

```typescript
// Load low quality immediately
const lowQual = bridge.createMaterialFromTrait(trait, 'iphone-15');
renderer.setMaterial(lowQual);

// Load high quality after delay
setTimeout(() => {
  const highQual = bridge.createMaterialFromTrait(trait, 'rtx-4090');
  renderer.setMaterial(highQual);
}, 500);
```

## Troubleshooting

### Issue: Material creation takes >80ms

**Cause**: Complex trait configuration or shader compilation overhead

**Solutions**:
1. Simplify trait configuration
2. Reduce number of textures or properties
3. Enable shader caching (identical configs)
4. Use lower quality target device

```typescript
// Check compilation time
const startTime = performance.now();
const material = bridge.createMaterialFromTrait(trait, 'rtx-4090');
const elapsed = performance.now() - startTime;

console.log(`Compilation took ${elapsed}ms`);
if (elapsed > 80) {
  // Try simpler trait
  const simpleTrait = simplifyTrait(trait);
  const simpleMaterial = bridge.createMaterialFromTrait(simpleTrait, 'rtx-4090');
}
```

### Issue: GPU memory exceeded on mobile device

**Cause**: Texture resolution or count too high for device

**Solutions**:
1. Reduce texture size
2. Use compressed texture formats
3. Decrease texture count
4. Apply device optimization

```typescript
const material = bridge.createMaterialFromTrait(trait, 'iphone-15');

if (material.gpuMemoryBytes > 256 * 1024 * 1024) {
  // Reduce texture resolution
  material.textures.forEach(tex => {
    tex.samplerType = 'float'; // Use lower precision
  });
}
```

### Issue: Shader compilation fails for specific target

**Cause**: Shader features not supported on target

**Solutions**:
1. Use fallback shader
2. Disable unsupported features
3. Use device optimization
4. Check device profile capabilities

```typescript
const material = bridge.createMaterialFromTrait(trait, 'quest-3');

if (!material.shader.compiledTargets.has('glsl')) {
  // GLSL compilation failed, check errors
  const errors = bridge.getErrors();
  errors.forEach(e => console.log(e.message));
  
  // Attempt recovery
  const recovered = bridge.recoverFromError(errors[0]);
  if (!recovered) {
    // Use simpler shader
    const fallback = createFallbackShader();
  }
}
```

### Issue: Low FPS on device

**Cause**: Too many draw calls, high triangle count, or expensive shaders

**Solutions**:
1. Reduce shader complexity
2. Lower texture resolution
3. Use LOD (Level of Detail)
4. Optimize material blend mode
5. Enable strict mode to detect issues

```typescript
const metrics = bridge.getRenderingMetrics(deviceId);

if (metrics.fps < 60) {
  console.warn('Performance issues detected');
  console.log(`Frame time: ${metrics.frameTimeMs}ms`);
  console.log(`Draw calls: ${metrics.drawCallCount}`);
  console.log(`Triangles: ${metrics.triangleCount}`);
  
  // Switch to lower quality device profile
  bridge.optimizeForDevice(material.id, 'quest-3');
}
```

### Issue: Shader has compilation warnings

**Cause**: Suboptimal code generation or deprecated features

**Solutions**:
1. Review error messages
2. Update trait configuration
3. Check for deprecated patterns
4. Validate for target version

```typescript
const material = bridge.createMaterialFromTrait(trait, 'iphone-15');
const compiled = material.shader.compiledTargets.get('metal');

if (compiled.warnings.length > 0) {
  console.warn('Shader warnings:');
  compiled.warnings.forEach(w => console.warn(`  - ${w}`));
  
  // Address warnings in trait
}
```

## Version & Support

**Version**: 1.0.0
**Phase 6 Compatibility**: Full
**Hololand Compatibility**: Parser Bridge v1.0+
**Performance Guarantee**: See performance targets above

For issues or questions, see the main documentation or contact support.
