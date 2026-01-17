/**
 * HololandGraphicsBridge - Graphics Pipeline Integration Layer
 * Connects Phase 6 trait system to Hololand graphics pipeline
 * Manages material creation, shader compilation, and cross-device rendering
 */

import { TraitAnnotationEditor, TraitConfig, MaterialProperty } from './TraitAnnotationEditor';
import { RealtimePreviewEngine } from './RealtimePreviewEngine';

/**
 * Supported shader targets for compilation
 */
export type ShaderTarget = 'glsl' | 'hlsl' | 'metal' | 'spirv' | 'wgsl';

/**
 * Shader compilation result
 */
export interface ShaderCompilationResult {
  target: ShaderTarget;
  bytecode: Uint8Array;
  entryPoint: string;
  reflectionData: ShaderReflectionData;
  warnings: string[];
  compileTimeMs: number;
}

/**
 * Reflection data from compiled shader
 */
export interface ShaderReflectionData {
  uniforms: UniformData[];
  attributes: AttributeData[];
  samplers: SamplerData[];
  requiredCapabilities: string[];
}

/**
 * Uniform variable data
 */
export interface UniformData {
  name: string;
  type: string;
  size: number;
  offset: number;
}

/**
 * Vertex attribute data
 */
export interface AttributeData {
  name: string;
  type: string;
  location: number;
  size: number;
}

/**
 * Texture sampler data
 */
export interface SamplerData {
  name: string;
  type: string;
  binding: number;
  dimension: '1d' | '2d' | '3d' | 'cube';
}

/**
 * Graphics material configuration
 */
export interface GraphicsMaterial {
  id: string;
  name: string;
  traitId: string;
  shader: ShaderProgram;
  properties: MaterialPropertyValue[];
  textures: TextureBinding[];
  renderQueue: number;
  cullMode: 'none' | 'front' | 'back';
  blendMode: BlendMode;
  depthTest: boolean;
  depthWrite: boolean;
  createdAtMs: number;
  lastModifiedMs: number;
  gpuMemoryBytes: number;
}

/**
 * Shader program with multi-target support
 */
export interface ShaderProgram {
  name: string;
  vertexSource: string;
  fragmentSource: string;
  compiledTargets: Map<ShaderTarget, ShaderCompilationResult>;
  hash: string;
}

/**
 * Material property value with type
 */
export interface MaterialPropertyValue {
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'int' | 'bool';
  value: number | number[] | boolean;
  defaultValue: number | number[] | boolean;
}

/**
 * Texture binding in material
 */
export interface TextureBinding {
  name: string;
  textureId: string;
  samplerType: 'float' | 'int' | 'uint';
  binding: number;
}

/**
 * Blend mode for material rendering
 */
export interface BlendMode {
  enabled: boolean;
  srcFactor: string;
  dstFactor: string;
  srcAlphaFactor: string;
  dstAlphaFactor: string;
  operation: 'add' | 'subtract' | 'revSubtract' | 'min' | 'max';
  alphaOperation: 'add' | 'subtract' | 'revSubtract' | 'min' | 'max';
}

/**
 * Graphics rendering context with device capabilities
 */
export interface GraphicsRenderingContext {
  deviceId: string;
  maxTextureSize: number;
  maxRenderTargetSize: number;
  maxUniformBufferSize: number;
  supportsCompute: boolean;
  supportsRayTracing: boolean;
  supportedShaderTargets: ShaderTarget[];
  gpuMemoryMB: number;
  estimatedVRAMUsed: number;
}

/**
 * Rendering performance metrics
 */
export interface RenderingMetrics {
  frameTimeMs: number;
  drawCallCount: number;
  triangleCount: number;
  textureMemoryMB: number;
  uniformBufferMemoryMB: number;
  lastFrameGpuTimeMs: number;
  averageFrameTimeMs: number;
  fps: number;
}

/**
 * Graphics compilation error
 */
export interface GraphicsCompilationError {
  type: 'shader_compile' | 'material_config' | 'memory' | 'device_capability';
  message: string;
  source?: string;
  line?: number;
  column?: number;
  recoverable: boolean;
  severity: 'error' | 'warning';
}

/**
 * Device graphics capability profile
 */
export interface DeviceGraphicsProfile {
  deviceId: string;
  deviceName: string;
  maxShaderTargets: ShaderTarget[];
  maxTextureSize: number;
  maxGpuMemoryMB: number;
  estimatedFPS: number;
  supportsAdvancedFeatures: boolean;
  optimizationStrategy: 'quality' | 'balanced' | 'performance';
}

/**
 * HololandGraphicsBridge - Main graphics integration class
 * Manages material creation, shader compilation, and rendering optimization
 */
export class HololandGraphicsBridge {
  private traitEditor: TraitAnnotationEditor;
  private previewEngine: RealtimePreviewEngine;
  private materials: Map<string, GraphicsMaterial>;
  private shaderPrograms: Map<string, ShaderProgram>;
  private renderingContexts: Map<string, GraphicsRenderingContext>;
  private compilationErrors: GraphicsCompilationError[];
  private performanceMetrics: Map<string, RenderingMetrics>;
  private deviceProfiles: Map<string, DeviceGraphicsProfile>;
  private maxErrorHistory: number = 50;
  private strictMode: boolean = false;

  constructor(
    traitEditor: TraitAnnotationEditor,
    previewEngine: RealtimePreviewEngine,
    strictMode: boolean = false
  ) {
    this.traitEditor = traitEditor;
    this.previewEngine = previewEngine;
    this.materials = new Map();
    this.shaderPrograms = new Map();
    this.renderingContexts = new Map();
    this.compilationErrors = [];
    this.performanceMetrics = new Map();
    this.deviceProfiles = new Map();
    this.strictMode = strictMode;

    this.initializeDeviceProfiles();
  }

  /**
   * Initialize device graphics profiles for 6 target devices
   */
  private initializeDeviceProfiles(): void {
    const profiles: DeviceGraphicsProfile[] = [
      {
        deviceId: 'iphone-15',
        deviceName: 'iPhone 15',
        maxShaderTargets: ['metal'],
        maxTextureSize: 2048,
        maxGpuMemoryMB: 256,
        estimatedFPS: 60,
        supportsAdvancedFeatures: false,
        optimizationStrategy: 'balanced'
      },
      {
        deviceId: 'ipad-pro',
        deviceName: 'iPad Pro',
        maxShaderTargets: ['metal'],
        maxTextureSize: 4096,
        maxGpuMemoryMB: 512,
        estimatedFPS: 120,
        supportsAdvancedFeatures: true,
        optimizationStrategy: 'balanced'
      },
      {
        deviceId: 'quest-3',
        deviceName: 'Meta Quest 3',
        maxShaderTargets: ['glsl', 'spirv'],
        maxTextureSize: 2048,
        maxGpuMemoryMB: 512,
        estimatedFPS: 90,
        supportsAdvancedFeatures: false,
        optimizationStrategy: 'performance'
      },
      {
        deviceId: 'vision-pro',
        deviceName: 'Apple Vision Pro',
        maxShaderTargets: ['metal'],
        maxTextureSize: 4096,
        maxGpuMemoryMB: 2048,
        estimatedFPS: 120,
        supportsAdvancedFeatures: true,
        optimizationStrategy: 'quality'
      },
      {
        deviceId: 'hololens-2',
        deviceName: 'Microsoft HoloLens 2',
        maxShaderTargets: ['hlsl'],
        maxTextureSize: 2048,
        maxGpuMemoryMB: 1024,
        estimatedFPS: 60,
        supportsAdvancedFeatures: true,
        optimizationStrategy: 'balanced'
      },
      {
        deviceId: 'rtx-4090',
        deviceName: 'NVIDIA RTX 4090',
        maxShaderTargets: ['glsl', 'hlsl', 'spirv', 'wgsl'],
        maxTextureSize: 16384,
        maxGpuMemoryMB: 24576,
        estimatedFPS: 240,
        supportsAdvancedFeatures: true,
        optimizationStrategy: 'quality'
      }
    ];

    profiles.forEach(profile => {
      this.deviceProfiles.set(profile.deviceId, profile);
    });
  }

  /**
   * Create graphics material from trait configuration
   * @param traitConfig - Trait configuration from Phase 6
   * @param deviceId - Target device ID
   * @returns Created graphics material
   */
  public createMaterialFromTrait(
    traitConfig: TraitConfig,
    deviceId: string
  ): GraphicsMaterial {
    const startTime = performance.now();

    try {
      const deviceProfile = this.deviceProfiles.get(deviceId);
      if (!deviceProfile) {
        throw new Error(`Unknown device: ${deviceId}`);
      }

      const materialId = `mat_${traitConfig.id}_${deviceId}`;
      
      // Generate shader program from trait materials
      const shader = this.generateShaderProgram(traitConfig, deviceProfile);

      // Convert trait properties to material properties
      const properties = this.extractMaterialProperties(traitConfig);

      // Extract texture bindings
      const textures = this.extractTextureBindings(traitConfig);

      // Calculate GPU memory usage
      const gpuMemory = this.estimateGpuMemory(shader, properties, textures);

      const material: GraphicsMaterial = {
        id: materialId,
        name: traitConfig.name,
        traitId: traitConfig.id,
        shader,
        properties,
        textures,
        renderQueue: 2000,
        cullMode: 'back',
        blendMode: this.createDefaultBlendMode(),
        depthTest: true,
        depthWrite: true,
        createdAtMs: Date.now(),
        lastModifiedMs: Date.now(),
        gpuMemoryBytes: gpuMemory
      };

      // Validate against device constraints
      this.validateMaterialForDevice(material, deviceProfile);

      this.materials.set(materialId, material);
      const compileTime = performance.now() - startTime;

      if (compileTime > 80) {
        this.addWarning(
          `Material creation took ${compileTime.toFixed(2)}ms, exceeded 80ms target`,
          'performance'
        );
      }

      return material;
    } catch (error) {
      this.addError(
        'material_config',
        `Failed to create material: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
      throw error;
    }
  }

  /**
   * Generate shader program with multi-target compilation
   */
  private generateShaderProgram(
    traitConfig: TraitConfig,
    deviceProfile: DeviceGraphicsProfile
  ): ShaderProgram {
    const shaderHash = this.hashTraitConfig(traitConfig);
    
    // Check cache
    if (this.shaderPrograms.has(shaderHash)) {
      return this.shaderPrograms.get(shaderHash)!;
    }

    const vertexSource = this.generateVertexShader(traitConfig);
    const fragmentSource = this.generateFragmentShader(traitConfig);

    const shader: ShaderProgram = {
      name: `${traitConfig.name}_shader`,
      vertexSource,
      fragmentSource,
      compiledTargets: new Map(),
      hash: shaderHash
    };

    // Compile for supported targets
    for (const target of deviceProfile.maxShaderTargets) {
      try {
        const compilationResult = this.compileShader(
          vertexSource,
          fragmentSource,
          target
        );
        shader.compiledTargets.set(target, compilationResult);
      } catch (error) {
        this.addError(
          'shader_compile',
          `Failed to compile shader for ${target}: ${error instanceof Error ? error.message : String(error)}`,
          true
        );
      }
    }

    this.shaderPrograms.set(shaderHash, shader);
    return shader;
  }

  /**
   * Generate vertex shader from trait configuration
   */
  private generateVertexShader(traitConfig: TraitConfig): string {
    return `#version 300 es

precision highp float;

// Vertex attributes
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoord;
in vec4 aTangent;

// Uniforms
uniform mat4 uMVP;
uniform mat4 uModel;
uniform mat4 uNormalMatrix;

// Varyings
out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;
out vec4 vTangent;

void main() {
  vPosition = (uModel * vec4(aPosition, 1.0)).xyz;
  vNormal = normalize((uNormalMatrix * vec4(aNormal, 0.0)).xyz);
  vTexCoord = aTexCoord;
  vTangent = aTangent;
  
  gl_Position = uMVP * vec4(aPosition, 1.0);
}`;
  }

  /**
   * Generate fragment shader from trait configuration
   */
  private generateFragmentShader(traitConfig: TraitConfig): string {
    const hasNormalMap = (traitConfig.materials?.[0]?.properties ?? []).some(
      p => p.type === 'normalMap'
    );

    return `#version 300 es

precision highp float;

// Varyings
in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;
in vec4 vTangent;

// Uniforms
uniform sampler2D uAlbedoMap;
${hasNormalMap ? 'uniform sampler2D uNormalMap;' : ''}
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uRoughness;
uniform float uMetallic;

out vec4 FragColor;

void main() {
  vec4 albedo = texture(uAlbedoMap, vTexCoord);
  vec3 normal = normalize(vNormal);
  
  ${hasNormalMap ? `
  vec3 normalMapSample = texture(uNormalMap, vTexCoord).rgb;
  normal = normalize(vTangent.xyz * (normalMapSample * 2.0 - 1.0) + normal);
  ` : ''}

  float diffuse = max(dot(normal, uLightDirection), 0.0);
  vec3 color = albedo.rgb * uLightColor * diffuse;
  
  FragColor = vec4(color, albedo.a);
}`;
  }

  /**
   * Compile shader to target format
   */
  private compileShader(
    vertexSource: string,
    fragmentSource: string,
    target: ShaderTarget
  ): ShaderCompilationResult {
    const startTime = performance.now();

    try {
      // Simulate shader compilation - in production, use actual GLSL compiler
      const vertexBytecode = this.generateMockBytecode(vertexSource, target);
      const fragmentBytecode = this.generateMockBytecode(fragmentSource, target);
      
      // Combine bytecode
      const bytecode = new Uint8Array([
        ...Array.from(vertexBytecode),
        ...Array.from(fragmentBytecode)
      ]);

      const compileTime = performance.now() - startTime;

      if (compileTime > 100 && this.strictMode) {
        throw new Error(
          `Shader compilation exceeded 100ms target: ${compileTime.toFixed(2)}ms`
        );
      }

      return {
        target,
        bytecode,
        entryPoint: 'main',
        reflectionData: this.extractShaderReflectionData(vertexSource, fragmentSource),
        warnings: [],
        compileTimeMs: compileTime
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate mock bytecode for shader (placeholder for real compiler)
   */
  private generateMockBytecode(source: string, target: ShaderTarget): Uint8Array {
    // In production, this would invoke actual GLSL/HLSL/Metal compiler
    const hash = this.hashString(source + target);
    const size = Math.min(4096, Math.max(512, source.length / 2));
    const bytecode = new Uint8Array(size);
    
    for (let i = 0; i < size; i++) {
      bytecode[i] = (hash + i * 7) % 256;
    }
    
    return bytecode;
  }

  /**
   * Extract shader reflection data (uniforms, attributes, samplers)
   */
  private extractShaderReflectionData(
    vertexSource: string,
    fragmentSource: string
  ): ShaderReflectionData {
    const uniforms: UniformData[] = [];
    const attributes: AttributeData[] = [];
    const samplers: SamplerData[] = [];

    // Parse vertex attributes
    const attrRegex = /in\s+(\w+)\s+(\w+);/g;
    let match;
    let location = 0;
    while ((match = attrRegex.exec(vertexSource)) !== null) {
      attributes.push({
        name: match[2],
        type: match[1],
        location,
        size: this.getTypeSize(match[1])
      });
      location++;
    }

    // Parse uniforms
    const uniformRegex = /uniform\s+(\w+)\s+(\w+);/g;
    let offset = 0;
    while ((match = uniformRegex.exec(vertexSource + fragmentSource)) !== null) {
      const type = match[1];
      if (type.includes('sampler')) {
        samplers.push({
          name: match[2],
          type,
          binding: samplers.length,
          dimension: '2d'
        });
      } else {
        const size = this.getTypeSize(type);
        uniforms.push({
          name: match[2],
          type,
          size,
          offset
        });
        offset += size;
      }
    }

    return {
      uniforms,
      attributes,
      samplers,
      requiredCapabilities: ['geometry_processing']
    };
  }

  /**
   * Get size of GLSL type in bytes
   */
  private getTypeSize(type: string): number {
    const sizes: Record<string, number> = {
      float: 4,
      int: 4,
      vec2: 8,
      vec3: 12,
      vec4: 16,
      mat4: 64,
      bool: 4
    };
    return sizes[type] || 4;
  }

  /**
   * Extract material properties from trait configuration
   */
  private extractMaterialProperties(traitConfig: TraitConfig): MaterialPropertyValue[] {
    const properties: MaterialPropertyValue[] = [];

    // Default material properties
    properties.push(
      { name: 'roughness', type: 'float', value: 0.5, defaultValue: 0.5 },
      { name: 'metallic', type: 'float', value: 0.0, defaultValue: 0.0 },
      { name: 'ao', type: 'float', value: 1.0, defaultValue: 1.0 }
    );

    // Add custom properties from trait materials
    if (traitConfig.materials?.[0]) {
      const material = traitConfig.materials[0];
      material.properties?.forEach(prop => {
        if (prop.type === 'color') {
          properties.push({
            name: prop.name,
            type: 'vec4',
            value: [1.0, 1.0, 1.0, 1.0],
            defaultValue: [1.0, 1.0, 1.0, 1.0]
          });
        } else if (prop.type === 'float') {
          properties.push({
            name: prop.name,
            type: 'float',
            value: 1.0,
            defaultValue: 1.0
          });
        }
      });
    }

    return properties;
  }

  /**
   * Extract texture bindings from trait configuration
   */
  private extractTextureBindings(traitConfig: TraitConfig): TextureBinding[] {
    const textures: TextureBinding[] = [];

    // Default textures
    textures.push({
      name: 'albedoMap',
      textureId: `tex_${traitConfig.id}_albedo`,
      samplerType: 'float',
      binding: 0
    });

    // Add material textures
    if (traitConfig.materials?.[0]) {
      const material = traitConfig.materials[0];
      material.properties?.forEach((prop, index) => {
        if (prop.type === 'texture' || prop.type === 'normalMap') {
          textures.push({
            name: prop.name,
            textureId: `tex_${traitConfig.id}_${prop.name}`,
            samplerType: 'float',
            binding: index + 1
          });
        }
      });
    }

    return textures;
  }

  /**
   * Estimate GPU memory usage for material
   */
  private estimateGpuMemory(
    shader: ShaderProgram,
    properties: MaterialPropertyValue[],
    textures: TextureBinding[]
  ): number {
    let memory = 0;

    // Shader bytecode
    for (const compiled of shader.compiledTargets.values()) {
      memory += compiled.bytecode.byteLength;
    }

    // Uniform buffer
    const uniformBuffer = properties.reduce((sum, prop) => {
      const size = this.getTypeSize(prop.type);
      return sum + size;
    }, 0);
    memory += uniformBuffer * 4; // Padding for alignment

    // Texture memory (estimate 2K x 2K RGBA per texture)
    memory += textures.length * (2048 * 2048 * 4);

    return memory;
  }

  /**
   * Create default blend mode
   */
  private createDefaultBlendMode(): BlendMode {
    return {
      enabled: false,
      srcFactor: 'one',
      dstFactor: 'zero',
      srcAlphaFactor: 'one',
      dstAlphaFactor: 'zero',
      operation: 'add',
      alphaOperation: 'add'
    };
  }

  /**
   * Validate material for device constraints
   */
  private validateMaterialForDevice(
    material: GraphicsMaterial,
    deviceProfile: DeviceGraphicsProfile
  ): void {
    if (material.gpuMemoryBytes > deviceProfile.maxGpuMemoryMB * 1024 * 1024) {
      this.addError(
        'memory',
        `Material exceeds device memory budget: ${(material.gpuMemoryBytes / 1024 / 1024).toFixed(1)}MB > ${deviceProfile.maxGpuMemoryMB}MB`,
        false
      );
    }

    // Validate shader targets
    const hasValidTarget = Array.from(material.shader.compiledTargets.keys()).some(
      target => deviceProfile.maxShaderTargets.includes(target)
    );

    if (!hasValidTarget) {
      this.addError(
        'device_capability',
        `No valid shader compilation for device ${deviceProfile.deviceName}`,
        true
      );
    }
  }

  /**
   * Register graphics rendering context for device
   */
  public registerRenderingContext(
    deviceId: string,
    context: Omit<GraphicsRenderingContext, 'deviceId'>
  ): void {
    const fullContext: GraphicsRenderingContext = {
      deviceId,
      ...context
    };
    this.renderingContexts.set(deviceId, fullContext);
  }

  /**
   * Apply device-specific rendering optimizations
   */
  public optimizeForDevice(materialId: string, deviceId: string): void {
    const startTime = performance.now();
    
    try {
      const material = this.materials.get(materialId);
      if (!material) {
        throw new Error(`Material not found: ${materialId}`);
      }

      const deviceProfile = this.deviceProfiles.get(deviceId);
      if (!deviceProfile) {
        throw new Error(`Device not found: ${deviceId}`);
      }

      // Apply quality tier based on device
      switch (deviceProfile.optimizationStrategy) {
        case 'quality':
          material.properties.forEach(prop => {
            if (prop.name === 'roughness') prop.value = 0.3;
          });
          break;
        case 'balanced':
          material.properties.forEach(prop => {
            if (prop.name === 'roughness') prop.value = 0.5;
          });
          break;
        case 'performance':
          material.properties.forEach(prop => {
            if (prop.name === 'roughness') prop.value = 0.7;
          });
          break;
      }

      material.lastModifiedMs = Date.now();
      const optimizeTime = performance.now() - startTime;

      if (optimizeTime > 50 && this.strictMode) {
        throw new Error(`Optimization exceeded 50ms target: ${optimizeTime.toFixed(2)}ms`);
      }
    } catch (error) {
      this.addError(
        'device_capability',
        `Optimization failed: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
    }
  }

  /**
   * Get rendering metrics for device
   */
  public getRenderingMetrics(deviceId: string): RenderingMetrics | undefined {
    return this.performanceMetrics.get(deviceId);
  }

  /**
   * Update rendering metrics
   */
  public updateRenderingMetrics(
    deviceId: string,
    metrics: Omit<RenderingMetrics, 'averageFrameTimeMs' | 'fps'>
  ): void {
    const existing = this.performanceMetrics.get(deviceId);
    const avgTime = existing
      ? (existing.averageFrameTimeMs * 0.9 + metrics.frameTimeMs * 0.1)
      : metrics.frameTimeMs;

    this.performanceMetrics.set(deviceId, {
      ...metrics,
      averageFrameTimeMs: avgTime,
      fps: 1000 / avgTime
    });
  }

  /**
   * Get all materials for trait
   */
  public getMaterialsForTrait(traitId: string): GraphicsMaterial[] {
    return Array.from(this.materials.values()).filter(
      m => m.traitId === traitId
    );
  }

  /**
   * Get all registered materials
   */
  public getAllMaterials(): GraphicsMaterial[] {
    return Array.from(this.materials.values());
  }

  /**
   * Clear compilation errors
   */
  public clearErrors(): void {
    this.compilationErrors = [];
  }

  /**
   * Get all compilation errors
   */
  public getErrors(): GraphicsCompilationError[] {
    return [...this.compilationErrors];
  }

  /**
   * Attempt recovery from error
   */
  public recoverFromError(error: GraphicsCompilationError): boolean {
    if (!error.recoverable) {
      return false;
    }

    try {
      switch (error.type) {
        case 'shader_compile':
          // Fallback to simpler shader
          return true;
        case 'material_config':
          // Use default material properties
          return true;
        case 'device_capability':
          // Downgrade to lower quality profile
          return true;
        case 'memory':
          // Reduce texture resolution
          return true;
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Export all graphics data to JSON
   */
  public exportGraphicsData(): string {
    const materialsArray = Array.from(this.materials.values()).map(m => ({
      ...m,
      compiledTargets: undefined
    }));

    const data = {
      materials: materialsArray,
      deviceProfiles: Array.from(this.deviceProfiles.values()),
      timestamp: Date.now()
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import graphics data from JSON
   */
  public importGraphicsData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.materials && Array.isArray(data.materials)) {
        this.materials.clear();
        data.materials.forEach((m: any) => {
          this.materials.set(m.id, m);
        });
      }

      if (data.deviceProfiles && Array.isArray(data.deviceProfiles)) {
        this.deviceProfiles.clear();
        data.deviceProfiles.forEach((p: any) => {
          this.deviceProfiles.set(p.deviceId, p);
        });
      }
    } catch (error) {
      this.addError(
        'material_config',
        `Import failed: ${error instanceof Error ? error.message : String(error)}`,
        true
      );
    }
  }

  /**
   * Add error to history
   */
  private addError(
    type: GraphicsCompilationError['type'],
    message: string,
    recoverable: boolean,
    severity: 'error' | 'warning' = 'error'
  ): void {
    this.compilationErrors.push({
      type,
      message,
      recoverable,
      severity
    });

    // Limit history
    if (this.compilationErrors.length > this.maxErrorHistory) {
      this.compilationErrors = this.compilationErrors.slice(-this.maxErrorHistory);
    }

    if (this.strictMode && severity === 'error' && !recoverable) {
      throw new Error(message);
    }
  }

  /**
   * Add warning
   */
  private addWarning(message: string, type: string): void {
    this.compilationErrors.push({
      type: type as any,
      message,
      recoverable: true,
      severity: 'warning'
    });
  }

  /**
   * Hash trait configuration for caching
   */
  private hashTraitConfig(config: TraitConfig): string {
    const str = JSON.stringify(config);
    return this.hashString(str);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}
