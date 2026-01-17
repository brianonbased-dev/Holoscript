/**
 * HololandCrossPlatformBridge - Cross-Platform Trait Deployment
 * Manages multi-platform deployment of traits with device-specific optimization
 */
import { TraitConfig } from './TraitAnnotationEditor';
import { HololandParserBridge } from './HololandParserBridge';
import { HololandGraphicsBridge } from './HololandGraphicsBridge';
/**
 * Supported deployment platforms
 */
export type PlatformType = 'ios' | 'android' | 'vr' | 'desktop' | 'web' | 'ar';
/**
 * Platform capability levels
 */
export declare enum PlatformCapability {
    LOW = "low",// Basic rendering only
    MEDIUM = "medium",// Standard features
    HIGH = "high",// Advanced features
    MAXIMUM = "maximum"
}
/**
 * Platform deployment target
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
}
/**
 * Deployment configuration for a platform
 */
export interface DeploymentConfig {
    traitId: string;
    platform: PlatformType;
    optimizationLevel: 'quality' | 'balanced' | 'performance';
    targetResolution: 'native' | '720p' | '1080p' | '4k';
    enableStreaming: boolean;
    enableCaching: boolean;
    maxRetries: number;
    timeoutMs: number;
}
/**
 * Deployment result with metrics
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
}
/**
 * Deployment performance metrics
 */
export interface DeploymentMetrics {
    downloadTimeMs: number;
    compilationTimeMs: number;
    optimizationTimeMs: number;
    totalTimeMs: number;
    bandwidthUsedMB: number;
    cpuUsagePercent: number;
    memoryUsageMB: number;
}
/**
 * Platform adapter interface
 */
export interface PlatformAdapter {
    platform: PlatformType;
    deploy(config: DeploymentConfig, traitData: Uint8Array): Promise<DeploymentResult>;
    optimize(trait: TraitConfig, target: PlatformTarget): TraitConfig;
    validate(trait: TraitConfig, target: PlatformTarget): ValidationResult;
    getCapabilities(): PlatformCapabilities;
}
/**
 * Platform capabilities
 */
export interface PlatformCapabilities {
    maxTextureSize: number;
    maxMeshSize: number;
    supportedShaders: string[];
    maxDrawCalls: number;
    maxPolygonCount: number;
    supportsCompute: boolean;
    supportsRayTracing: boolean;
    estimatedFPS: number;
    gpuMemoryMB: number;
}
/**
 * Validation result
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    incompatibilities: string[];
}
/**
 * Platform deployment status
 */
export interface DeploymentStatus {
    traitId: string;
    platform: PlatformType;
    status: 'pending' | 'deploying' | 'success' | 'failed' | 'cached';
    progress: number;
    estimatedRemainingMs: number;
    result?: DeploymentResult;
}
/**
 * Cross-platform optimization strategy
 */
export interface OptimizationStrategy {
    name: string;
    platforms: PlatformType[];
    targetCapability: PlatformCapability;
    textureQuality: 'low' | 'medium' | 'high';
    meshComplexity: 'low' | 'medium' | 'high';
    effectQuality: 'none' | 'basic' | 'advanced' | 'maximum';
    targetFPS: number;
    maxMemoryMB: number;
}
/**
 * HololandCrossPlatformBridge - Main cross-platform deployment class
 */
export declare class HololandCrossPlatformBridge {
    private parserBridge;
    private graphicsBridge;
    private platformAdapters;
    private deploymentCache;
    private deploymentStatus;
    private optimizationStrategies;
    private deploymentHistory;
    private maxCacheSize;
    private maxHistorySize;
    constructor(parserBridge: HololandParserBridge, graphicsBridge: HololandGraphicsBridge);
    /**
     * Initialize platform-specific adapters
     */
    private initializePlatformAdapters;
    /**
     * Create iOS platform adapter
     */
    private createiOSAdapter;
    /**
     * Create Android platform adapter
     */
    private createAndroidAdapter;
    /**
     * Create VR platform adapter
     */
    private createVRAdapter;
    /**
     * Create Desktop platform adapter
     */
    private createDesktopAdapter;
    /**
     * Create Web platform adapter
     */
    private createWebAdapter;
    /**
     * Create AR platform adapter
     */
    private createARAdapter;
    /**
     * Initialize optimization strategies for common scenarios
     */
    private initializeOptimizationStrategies;
    /**
     * Deploy trait to platform with optimization
     */
    deployToManyPlatforms(trait: TraitConfig, platforms: PlatformTarget[], config?: Partial<DeploymentConfig>): Promise<DeploymentResult[]>;
    /**
     * Deploy trait to specific platform
     */
    deployToPlatform(trait: TraitConfig, target: PlatformTarget, config?: Partial<DeploymentConfig>): Promise<DeploymentResult>;
    /**
     * Execute platform-specific deployment
     */
    private executePlatformDeployment;
    /**
     * Optimize trait for specific platform
     */
    private optimizeForPlatform;
    /**
     * Get optimization strategy for platform
     */
    private getOptimizationStrategy;
    /**
     * Validate trait for platform
     */
    private validateForPlatform;
    /**
     * Serialize trait for platform deployment
     */
    private serializeTraitForPlatform;
    /**
     * Calculate checksum for data
     */
    private calculateChecksum;
    /**
     * Delay utility
     */
    private delay;
    /**
     * Get deployment status for trait
     */
    getDeploymentStatus(traitId: string, platform: PlatformType): DeploymentStatus | undefined;
    /**
     * Get all deployment statuses
     */
    getAllDeploymentStatuses(): DeploymentStatus[];
    /**
     * Get deployment history
     */
    getDeploymentHistory(limit?: number): DeploymentResult[];
    /**
     * Clear deployment cache
     */
    clearDeploymentCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        entries: string[];
    };
    /**
     * Register custom optimization strategy
     */
    registerOptimizationStrategy(strategy: OptimizationStrategy): void;
    /**
     * Get all optimization strategies
     */
    getOptimizationStrategies(): OptimizationStrategy[];
    /**
     * Get platform adapter
     */
    getPlatformAdapter(platform: PlatformType): PlatformAdapter | undefined;
    /**
     * Get supported platforms
     */
    getSupportedPlatforms(): PlatformType[];
    /**
     * Export deployment configuration
     */
    exportDeploymentConfig(): string;
    /**
     * Import deployment configuration
     */
    importDeploymentConfig(jsonData: string): void;
}
