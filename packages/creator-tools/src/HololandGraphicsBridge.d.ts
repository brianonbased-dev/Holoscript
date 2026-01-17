/**
 * HololandGraphicsBridge - Graphics Pipeline Integration Layer
 * Connects Phase 6 trait system to Hololand graphics pipeline
 * Manages material creation, shader compilation, and cross-device rendering
 */
import { TraitAnnotationEditor, TraitConfig } from './TraitAnnotationEditor';
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
export declare class HololandGraphicsBridge {
    private traitEditor;
    private previewEngine;
    private materials;
    private shaderPrograms;
    private renderingContexts;
    private compilationErrors;
    private performanceMetrics;
    private deviceProfiles;
    private maxErrorHistory;
    private strictMode;
    constructor(traitEditor: TraitAnnotationEditor, previewEngine: RealtimePreviewEngine, strictMode?: boolean);
    /**
     * Initialize device graphics profiles for 6 target devices
     */
    private initializeDeviceProfiles;
    /**
     * Create graphics material from trait configuration
     * @param traitConfig - Trait configuration from Phase 6
     * @param deviceId - Target device ID
     * @returns Created graphics material
     */
    createMaterialFromTrait(traitConfig: TraitConfig, deviceId: string): GraphicsMaterial;
    /**
     * Generate shader program with multi-target compilation
     */
    private generateShaderProgram;
    /**
     * Generate vertex shader from trait configuration
     */
    private generateVertexShader;
    /**
     * Generate fragment shader from trait configuration
     */
    private generateFragmentShader;
    /**
     * Compile shader to target format
     */
    private compileShader;
    /**
     * Generate mock bytecode for shader (placeholder for real compiler)
     */
    private generateMockBytecode;
    /**
     * Extract shader reflection data (uniforms, attributes, samplers)
     */
    private extractShaderReflectionData;
    /**
     * Get size of GLSL type in bytes
     */
    private getTypeSize;
    /**
     * Extract material properties from trait configuration
     */
    private extractMaterialProperties;
    /**
     * Extract texture bindings from trait configuration
     */
    private extractTextureBindings;
    /**
     * Estimate GPU memory usage for material
     */
    private estimateGpuMemory;
    /**
     * Create default blend mode
     */
    private createDefaultBlendMode;
    /**
     * Validate material for device constraints
     */
    private validateMaterialForDevice;
    /**
     * Register graphics rendering context for device
     */
    registerRenderingContext(deviceId: string, context: Omit<GraphicsRenderingContext, 'deviceId'>): void;
    /**
     * Apply device-specific rendering optimizations
     */
    optimizeForDevice(materialId: string, deviceId: string): void;
    /**
     * Get rendering metrics for device
     */
    getRenderingMetrics(deviceId: string): RenderingMetrics | undefined;
    /**
     * Update rendering metrics
     */
    updateRenderingMetrics(deviceId: string, metrics: Omit<RenderingMetrics, 'averageFrameTimeMs' | 'fps'>): void;
    /**
     * Get all materials for trait
     */
    getMaterialsForTrait(traitId: string): GraphicsMaterial[];
    /**
     * Get all registered materials
     */
    getAllMaterials(): GraphicsMaterial[];
    /**
     * Clear compilation errors
     */
    clearErrors(): void;
    /**
     * Get all compilation errors
     */
    getErrors(): GraphicsCompilationError[];
    /**
     * Attempt recovery from error
     */
    recoverFromError(error: GraphicsCompilationError): boolean;
    /**
     * Export all graphics data to JSON
     */
    exportGraphicsData(): string;
    /**
     * Import graphics data from JSON
     */
    importGraphicsData(jsonData: string): void;
    /**
     * Add error to history
     */
    private addError;
    /**
     * Add warning
     */
    private addWarning;
    /**
     * Hash trait configuration for caching
     */
    private hashTraitConfig;
    /**
     * Simple string hash function
     */
    private hashString;
}
