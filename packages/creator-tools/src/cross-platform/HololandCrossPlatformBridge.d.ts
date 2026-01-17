/**
 * HololandCrossPlatformBridge - Task 12
 * Multi-platform trait deployment with device-specific optimization
 * Supports iOS, Android, VR, Desktop, Web, AR
 * ~600 LOC
 */
import type { TraitConfig, PlatformTarget, DeploymentConfig, DeploymentResult, OptimizationStrategy, PlatformAdapter, DeploymentStatusInfo, CacheStats } from './types';
/**
 * Main cross-platform bridge for multi-device trait deployment
 */
export declare class HololandCrossPlatformBridge {
    private parserBridge;
    private graphicsBridge;
    private platformAdapters;
    private deploymentCache;
    private deploymentStatuses;
    private deploymentHistory;
    private optimizationStrategies;
    private readonly MAX_CACHE_SIZE;
    private readonly CACHE_ENTRY_TTL_MS;
    constructor(parserBridge: any, graphicsBridge: any);
    /**
     * Deploy trait to a single platform
     */
    deployToPlatform(trait: TraitConfig, target: PlatformTarget, config?: Partial<DeploymentConfig>): Promise<DeploymentResult>;
    /**
     * Deploy trait to multiple platforms
     */
    deployToManyPlatforms(trait: TraitConfig, platforms: PlatformTarget[], config?: Partial<DeploymentConfig>): Promise<DeploymentResult[]>;
    /**
     * Get deployment status
     */
    getDeploymentStatus(traitId: string, platform: string): DeploymentStatusInfo | undefined;
    /**
     * Get all deployment statuses
     */
    getAllDeploymentStatuses(): DeploymentStatusInfo[];
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
    getCacheStats(): CacheStats;
    /**
     * Register optimization strategy
     */
    registerOptimizationStrategy(strategy: OptimizationStrategy): void;
    /**
     * Get optimization strategies
     */
    getOptimizationStrategies(): OptimizationStrategy[];
    /**
     * Get platform adapter
     */
    getPlatformAdapter(platform: string): PlatformAdapter | undefined;
    /**
     * Get supported platforms
     */
    getSupportedPlatforms(): string[];
    /**
     * Export deployment configuration
     */
    exportDeploymentConfig(): string;
    /**
     * Import deployment configuration
     */
    importDeploymentConfig(jsonData: string): void;
    private initializePlatformAdapters;
    private createPlatformAdapter;
    private initializeOptimizationStrategies;
    private getCachedDeployment;
    private cacheDeployment;
    private isCacheEntryValid;
    private generateDeploymentId;
    private generateChecksum;
    private hashString;
    private generatePlatformConfigs;
}
