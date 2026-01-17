/**
 * Type definitions for Hololand Cross-Platform Bridge
 * Comprehensive type system for 6-platform deployment and optimization
 */
export type PlatformType = 'ios' | 'android' | 'vr' | 'desktop' | 'web' | 'ar';
export type PlatformCapability = 'low' | 'medium' | 'high' | 'maximum';
export type OptimizationLevel = 'performance' | 'balanced' | 'quality';
export type TargetResolution = 'native' | '720p' | '1080p' | '4k';
export type DeploymentStatus = 'pending' | 'deploying' | 'success' | 'failed';
export type TextureQuality = 'low' | 'medium' | 'high' | 'maximum';
export type MeshComplexity = 'low' | 'medium' | 'high' | 'maximum';
export type EffectQuality = 'minimal' | 'basic' | 'advanced' | 'maximum';
export type ShaderTarget = 'metal' | 'glsl' | 'spir-v' | 'hlsl' | 'wgsl' | 'webgl';
/**
 * Trait configuration for deployment
 */
export interface TraitConfig {
    id: string;
    name: string;
    type: 'material' | 'effect' | 'animation' | 'custom';
    properties: Record<string, any>;
    shader?: {
        vertex: string;
        fragment: string;
        compute?: string;
    };
    textures?: TextureAsset[];
    metadata?: Record<string, any>;
}
/**
 * Texture asset definition
 */
export interface TextureAsset {
    id: string;
    name: string;
    format: 'PNG' | 'JPEG' | 'WEBP' | 'BASIS' | 'KTX2';
    resolution: [number, number];
    mipmaps: boolean;
    sRGB: boolean;
    data?: Uint8Array;
}
/**
 * Platform target specification
 */
export interface PlatformTarget {
    platform: PlatformType;
    capability: PlatformCapability;
    deviceId: string;
    osVersion?: string;
    screenResolution?: [number, number];
    gpuVRAMMB?: number;
    cpuThreadCount?: number;
    supportsARCore?: boolean;
    supportsARKit?: boolean;
    supportsVulkan?: boolean;
    supportsRayTracing?: boolean;
    customProperties?: Record<string, any>;
}
/**
 * Deployment configuration
 */
export interface DeploymentConfig {
    traitId: string;
    platform: PlatformType;
    optimizationLevel: OptimizationLevel;
    targetResolution: TargetResolution;
    enableStreaming: boolean;
    enableCaching: boolean;
    maxRetries: number;
    timeoutMs: number;
    customConfig?: Record<string, any>;
}
/**
 * Deployment metrics
 */
export interface DeploymentMetrics {
    downloadTimeMs: number;
    compilationTimeMs: number;
    optimizationTimeMs: number;
    totalTimeMs: number;
    bandwidthUsedMB: number;
    cpuUsagePercent: number;
    memoryUsageMB: number;
    peakMemoryMB: number;
    gpuBusyPercent?: number;
}
/**
 * Deployment result
 */
export interface DeploymentResult {
    traitId: string;
    platform: PlatformType;
    success: boolean;
    deployedAtMs: number;
    completionTimeMs: number;
    fileSize: number;
    checksum: string;
    warnings: string[];
    errors: string[];
    metrics: DeploymentMetrics;
    deploymentId?: string;
    outputPath?: string;
}
/**
 * Deployment status tracking
 */
export interface DeploymentStatusInfo {
    traitId: string;
    platform: PlatformType;
    status: DeploymentStatus;
    progress: number;
    estimatedRemainingMs?: number;
    result?: DeploymentResult;
    error?: string;
    startedAtMs: number;
}
/**
 * Optimization strategy definition
 */
export interface OptimizationStrategy {
    name: string;
    platforms: PlatformType[];
    targetCapability: PlatformCapability;
    textureQuality: TextureQuality;
    meshComplexity: MeshComplexity;
    effectQuality: EffectQuality;
    targetFPS: number;
    maxMemoryMB: number;
    maxDrawCalls?: number;
    maxPolygons?: number;
    description?: string;
}
/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
    platform: PlatformType;
    shaderTargets: ShaderTarget[];
    maxTextureSize: number;
    maxDrawCalls: number;
    maxPolygons: number;
    gpuMemoryMB: number;
    supportedTextureFormats: string[];
    targetFPS: number;
    supportsCompression: boolean;
    supportsMipmap: boolean;
    supportsNormalMapping: boolean;
    supportsParallaxMapping: boolean;
    supportsRayTracing: boolean;
    supportsComputeShaders: boolean;
    supportsStereoRendering: boolean;
    singlePassStereo?: boolean;
}
/**
 * Platform adapter interface
 */
export interface PlatformAdapter {
    getPlatformType(): PlatformType;
    getCapabilities(): PlatformCapabilities;
    validate(trait: TraitConfig, target: PlatformTarget): ValidationResult;
    compileShader(shader: TraitConfig['shader'], target: PlatformTarget): Promise<ShaderCompilationResult>;
    optimizeAssets(trait: TraitConfig, target: PlatformTarget): Promise<OptimizedAssets>;
    estimateSize(trait: TraitConfig, target: PlatformTarget): number;
}
/**
 * Validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    recommendations?: string[];
}
/**
 * Shader compilation result
 */
export interface ShaderCompilationResult {
    success: boolean;
    code?: string;
    errors: string[];
    warnings: string[];
    stats?: {
        instructions: number;
        registers: number;
        complexity: number;
    };
}
/**
 * Optimized assets
 */
export interface OptimizedAssets {
    traitId: string;
    platform: PlatformType;
    optimizedShader: string;
    optimizedTextures: OptimizedTexture[];
    metadata: {
        compressionRatio: number;
        originalSize: number;
        optimizedSize: number;
        optimizations: string[];
    };
}
/**
 * Optimized texture
 */
export interface OptimizedTexture {
    id: string;
    format: string;
    resolution: [number, number];
    mipCount: number;
    size: number;
    compressed: boolean;
}
/**
 * Cache statistics
 */
export interface CacheStats {
    size: number;
    maxSize: number;
    entries: string[];
    hitRate: number;
    missRate: number;
}
/**
 * Configuration for export/import
 */
export interface DeploymentConfiguration {
    version: string;
    timestamp: number;
    strategies: OptimizationStrategy[];
    platformConfigs: Record<PlatformType, PlatformConfig>;
    deploymentHistory?: DeploymentResult[];
}
/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
    platform: PlatformType;
    defaultCapability: PlatformCapability;
    defaultOptimization: OptimizationLevel;
    shaderTargets: ShaderTarget[];
    maxTextureSize: number;
    targetResolution: TargetResolution;
    enableStreaming: boolean;
    enableCaching: boolean;
    customSettings?: Record<string, any>;
}
/**
 * Shader type definition
 */
export interface ShaderDefinition {
    vertex: string;
    fragment: string;
    compute?: string;
    geometry?: string;
    tessellationControl?: string;
    tessellationEvaluation?: string;
}
/**
 * Performance target
 */
export interface PerformanceTarget {
    platform: PlatformType;
    maxTimeMs: number;
    targetFPS: number;
    maxMemoryMB: number;
    maxBandwidthMB: number;
}
/**
 * Deployment options
 */
export interface DeploymentOptions {
    validateBeforeDeploy?: boolean;
    useCache?: boolean;
    enableProfiling?: boolean;
    retryOnFailure?: boolean;
    maxRetries?: number;
    timeoutMs?: number;
}
/**
 * Platform statistics
 */
export interface PlatformStatistics {
    platform: PlatformType;
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageTimeMs: number;
    totalBandwidthMB: number;
    cacheHitRate: number;
}
/**
 * Quality settings
 */
export interface QualitySettings {
    textureQuality: TextureQuality;
    meshQuality: MeshComplexity;
    effectQuality: EffectQuality;
    shadowQuality: 'off' | 'low' | 'medium' | 'high';
    reflectionQuality: 'off' | 'low' | 'medium' | 'high';
    antiAliasingQuality: 'off' | '2x' | '4x' | '8x';
    resolutionScale: number;
}
/**
 * Platform-specific quality presets
 */
export interface QualityPreset {
    name: string;
    description: string;
    platform: PlatformType;
    settings: QualitySettings;
    targetMemoryMB: number;
    targetFPS: number;
    estimatedPerformancePercent: number;
}
/**
 * Deployment plan
 */
export interface DeploymentPlan {
    id: string;
    traitId: string;
    platforms: PlatformTarget[];
    totalEstimatedTimeMs: number;
    totalEstimatedBandwidthMB: number;
    steps: DeploymentStep[];
    validations: ValidationResult[];
}
/**
 * Single deployment step
 */
export interface DeploymentStep {
    index: number;
    platform: PlatformType;
    estimatedTimeMs: number;
    estimatedSizeMB: number;
    action: 'compile' | 'optimize' | 'download' | 'install';
}
/**
 * Deployment event
 */
export interface DeploymentEvent {
    type: 'started' | 'progress' | 'completed' | 'failed' | 'cached' | 'warning' | 'error';
    timestamp: number;
    platform: PlatformType;
    traitId: string;
    data?: any;
}
/**
 * Event listener callback
 */
export type DeploymentEventListener = (event: DeploymentEvent) => void;
/**
 * Device information
 */
export interface DeviceInfo {
    id: string;
    name: string;
    platform: PlatformType;
    osVersion: string;
    screenResolution: [number, number];
    gpuVRAMMB: number;
    cpuThreadCount: number;
    capability: PlatformCapability;
    features: {
        supportsARCore?: boolean;
        supportsARKit?: boolean;
        supportsVulkan?: boolean;
        supportsRayTracing?: boolean;
        supportsMetal?: boolean;
    };
}
/**
 * Deployment report
 */
export interface DeploymentReport {
    id: string;
    timestamp: number;
    traitId: string;
    platforms: number;
    successful: number;
    failed: number;
    duration: number;
    totalSize: number;
    totalBandwidth: number;
    results: DeploymentResult[];
    insights: {
        bottlenecks?: string[];
        recommendations?: string[];
        successRate: number;
    };
}
