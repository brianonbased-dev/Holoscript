/**
 * HololandCrossPlatformBridge - Cross-Platform Trait Deployment
 * Manages multi-platform deployment of traits with device-specific optimization
 */
/**
 * Platform capability levels
 */
export var PlatformCapability;
(function (PlatformCapability) {
    PlatformCapability["LOW"] = "low";
    PlatformCapability["MEDIUM"] = "medium";
    PlatformCapability["HIGH"] = "high";
    PlatformCapability["MAXIMUM"] = "maximum"; // All features available
})(PlatformCapability || (PlatformCapability = {}));
/**
 * HololandCrossPlatformBridge - Main cross-platform deployment class
 */
export class HololandCrossPlatformBridge {
    constructor(parserBridge, graphicsBridge) {
        this.maxCacheSize = 100;
        this.maxHistorySize = 200;
        this.parserBridge = parserBridge;
        this.graphicsBridge = graphicsBridge;
        this.platformAdapters = new Map();
        this.deploymentCache = new Map();
        this.deploymentStatus = new Map();
        this.optimizationStrategies = [];
        this.deploymentHistory = [];
        this.initializePlatformAdapters();
        this.initializeOptimizationStrategies();
    }
    /**
     * Initialize platform-specific adapters
     */
    initializePlatformAdapters() {
        this.platformAdapters.set('ios', this.createiOSAdapter());
        this.platformAdapters.set('android', this.createAndroidAdapter());
        this.platformAdapters.set('vr', this.createVRAdapter());
        this.platformAdapters.set('desktop', this.createDesktopAdapter());
        this.platformAdapters.set('web', this.createWebAdapter());
        this.platformAdapters.set('ar', this.createARAdapter());
    }
    /**
     * Create iOS platform adapter
     */
    createiOSAdapter() {
        return {
            platform: 'ios',
            deploy: async (config, data) => this.executePlatformDeployment('ios', config, data),
            optimize: (trait, target) => this.optimizeForPlatform(trait, 'ios', target),
            validate: (trait, target) => this.validateForPlatform(trait, 'ios', target),
            getCapabilities: () => ({
                maxTextureSize: 4096,
                maxMeshSize: 100000,
                supportedShaders: ['metal'],
                maxDrawCalls: 500,
                maxPolygonCount: 5000000,
                supportsCompute: true,
                supportsRayTracing: false,
                estimatedFPS: 60,
                gpuMemoryMB: 512
            })
        };
    }
    /**
     * Create Android platform adapter
     */
    createAndroidAdapter() {
        return {
            platform: 'android',
            deploy: async (config, data) => this.executePlatformDeployment('android', config, data),
            optimize: (trait, target) => this.optimizeForPlatform(trait, 'android', target),
            validate: (trait, target) => this.validateForPlatform(trait, 'android', target),
            getCapabilities: () => ({
                maxTextureSize: 2048,
                maxMeshSize: 50000,
                supportedShaders: ['glsl', 'spirv'],
                maxDrawCalls: 300,
                maxPolygonCount: 3000000,
                supportsCompute: false,
                supportsRayTracing: false,
                estimatedFPS: 60,
                gpuMemoryMB: 256
            })
        };
    }
    /**
     * Create VR platform adapter
     */
    createVRAdapter() {
        return {
            platform: 'vr',
            deploy: async (config, data) => this.executePlatformDeployment('vr', config, data),
            optimize: (trait, target) => this.optimizeForPlatform(trait, 'vr', target),
            validate: (trait, target) => this.validateForPlatform(trait, 'vr', target),
            getCapabilities: () => ({
                maxTextureSize: 2048,
                maxMeshSize: 75000,
                supportedShaders: ['glsl', 'spirv'],
                maxDrawCalls: 400,
                maxPolygonCount: 4000000,
                supportsCompute: true,
                supportsRayTracing: false,
                estimatedFPS: 90,
                gpuMemoryMB: 1024
            })
        };
    }
    /**
     * Create Desktop platform adapter
     */
    createDesktopAdapter() {
        return {
            platform: 'desktop',
            deploy: async (config, data) => this.executePlatformDeployment('desktop', config, data),
            optimize: (trait, target) => this.optimizeForPlatform(trait, 'desktop', target),
            validate: (trait, target) => this.validateForPlatform(trait, 'desktop', target),
            getCapabilities: () => ({
                maxTextureSize: 16384,
                maxMeshSize: 1000000,
                supportedShaders: ['glsl', 'hlsl', 'spirv', 'wgsl'],
                maxDrawCalls: 2000,
                maxPolygonCount: 50000000,
                supportsCompute: true,
                supportsRayTracing: true,
                estimatedFPS: 240,
                gpuMemoryMB: 8192
            })
        };
    }
    /**
     * Create Web platform adapter
     */
    createWebAdapter() {
        return {
            platform: 'web',
            deploy: async (config, data) => this.executePlatformDeployment('web', config, data),
            optimize: (trait, target) => this.optimizeForPlatform(trait, 'web', target),
            validate: (trait, target) => this.validateForPlatform(trait, 'web', target),
            getCapabilities: () => ({
                maxTextureSize: 2048,
                maxMeshSize: 100000,
                supportedShaders: ['glsl', 'wgsl'],
                maxDrawCalls: 500,
                maxPolygonCount: 5000000,
                supportsCompute: true,
                supportsRayTracing: false,
                estimatedFPS: 60,
                gpuMemoryMB: 2048
            })
        };
    }
    /**
     * Create AR platform adapter
     */
    createARAdapter() {
        return {
            platform: 'ar',
            deploy: async (config, data) => this.executePlatformDeployment('ar', config, data),
            optimize: (trait, target) => this.optimizeForPlatform(trait, 'ar', target),
            validate: (trait, target) => this.validateForPlatform(trait, 'ar', target),
            getCapabilities: () => ({
                maxTextureSize: 2048,
                maxMeshSize: 75000,
                supportedShaders: ['metal', 'glsl', 'spirv'],
                maxDrawCalls: 300,
                maxPolygonCount: 3000000,
                supportsCompute: false,
                supportsRayTracing: false,
                estimatedFPS: 60,
                gpuMemoryMB: 512
            })
        };
    }
    /**
     * Initialize optimization strategies for common scenarios
     */
    initializeOptimizationStrategies() {
        this.optimizationStrategies = [
            {
                name: 'Mobile Performance',
                platforms: ['ios', 'android', 'ar'],
                targetCapability: PlatformCapability.MEDIUM,
                textureQuality: 'medium',
                meshComplexity: 'medium',
                effectQuality: 'basic',
                targetFPS: 60,
                maxMemoryMB: 512
            },
            {
                name: 'VR Quality',
                platforms: ['vr'],
                targetCapability: PlatformCapability.HIGH,
                textureQuality: 'high',
                meshComplexity: 'high',
                effectQuality: 'advanced',
                targetFPS: 90,
                maxMemoryMB: 1024
            },
            {
                name: 'Desktop Maximum',
                platforms: ['desktop', 'web'],
                targetCapability: PlatformCapability.MAXIMUM,
                textureQuality: 'high',
                meshComplexity: 'high',
                effectQuality: 'maximum',
                targetFPS: 240,
                maxMemoryMB: 8192
            },
            {
                name: 'Web Optimized',
                platforms: ['web'],
                targetCapability: PlatformCapability.MEDIUM,
                textureQuality: 'medium',
                meshComplexity: 'low',
                effectQuality: 'basic',
                targetFPS: 60,
                maxMemoryMB: 256
            }
        ];
    }
    /**
     * Deploy trait to platform with optimization
     */
    async deployToManyPlatforms(trait, platforms, config) {
        const results = [];
        for (const platform of platforms) {
            try {
                const result = await this.deployToPlatform(trait, platform, config);
                results.push(result);
            }
            catch (error) {
                results.push({
                    traitId: trait.id,
                    platform: platform.platform,
                    success: false,
                    deployedAtMs: Date.now(),
                    completionTimeMs: 0,
                    fileSize: 0,
                    checksum: '',
                    warnings: [],
                    errors: [error instanceof Error ? error.message : String(error)],
                    metrics: {
                        downloadTimeMs: 0,
                        compilationTimeMs: 0,
                        optimizationTimeMs: 0,
                        totalTimeMs: 0,
                        bandwidthUsedMB: 0,
                        cpuUsagePercent: 0,
                        memoryUsageMB: 0
                    }
                });
            }
        }
        return results;
    }
    /**
     * Deploy trait to specific platform
     */
    async deployToPlatform(trait, target, config) {
        const startTime = performance.now();
        const cacheKey = `${trait.id}_${target.platform}`;
        // Check cache
        if (this.deploymentCache.has(cacheKey)) {
            return this.deploymentCache.get(cacheKey);
        }
        const fullConfig = {
            traitId: trait.id,
            platform: target.platform,
            optimizationLevel: 'balanced',
            targetResolution: 'native',
            enableStreaming: false,
            enableCaching: true,
            maxRetries: 3,
            timeoutMs: 30000,
            ...config
        };
        // Update status
        const statusKey = `${trait.id}_${target.platform}`;
        this.deploymentStatus.set(statusKey, {
            traitId: trait.id,
            platform: target.platform,
            status: 'deploying',
            progress: 0,
            estimatedRemainingMs: 0
        });
        try {
            // Validate trait for platform
            const adapter = this.platformAdapters.get(target.platform);
            const validation = adapter.validate(trait, target);
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }
            // Optimize trait for platform
            const optimizedTrait = adapter.optimize(trait, target);
            // Generate deployment data
            const traitData = this.serializeTraitForPlatform(optimizedTrait, target);
            // Execute deployment
            const result = await adapter.deploy(fullConfig, traitData);
            const completionTime = performance.now() - startTime;
            result.completionTimeMs = completionTime;
            // Cache result
            this.deploymentCache.set(cacheKey, result);
            if (this.deploymentCache.size > this.maxCacheSize) {
                const firstKey = this.deploymentCache.keys().next().value;
                this.deploymentCache.delete(firstKey);
            }
            // Update status
            this.deploymentStatus.set(statusKey, {
                traitId: trait.id,
                platform: target.platform,
                status: result.success ? 'success' : 'failed',
                progress: 100,
                estimatedRemainingMs: 0,
                result
            });
            // Add to history
            this.deploymentHistory.push(result);
            if (this.deploymentHistory.length > this.maxHistorySize) {
                this.deploymentHistory = this.deploymentHistory.slice(-this.maxHistorySize);
            }
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const failureResult = {
                traitId: trait.id,
                platform: target.platform,
                success: false,
                deployedAtMs: Date.now(),
                completionTimeMs: performance.now() - startTime,
                fileSize: 0,
                checksum: '',
                warnings: [],
                errors: [errorMessage],
                metrics: {
                    downloadTimeMs: 0,
                    compilationTimeMs: 0,
                    optimizationTimeMs: 0,
                    totalTimeMs: performance.now() - startTime,
                    bandwidthUsedMB: 0,
                    cpuUsagePercent: 0,
                    memoryUsageMB: 0
                }
            };
            this.deploymentStatus.set(statusKey, {
                traitId: trait.id,
                platform: target.platform,
                status: 'failed',
                progress: 0,
                estimatedRemainingMs: 0,
                result: failureResult
            });
            return failureResult;
        }
    }
    /**
     * Execute platform-specific deployment
     */
    async executePlatformDeployment(platform, config, traitData) {
        const startTime = performance.now();
        const downloadStart = performance.now();
        // Simulate download (in production, would be actual network request)
        const downloadTimeMs = Math.random() * 50 + 10;
        await this.delay(Math.min(downloadTimeMs, 50));
        const actualDownloadTime = performance.now() - downloadStart;
        const compilationStart = performance.now();
        const compilationTimeMs = Math.random() * 80 + 20;
        await this.delay(Math.min(compilationTimeMs, 100));
        const actualCompilationTime = performance.now() - compilationStart;
        const optimizationStart = performance.now();
        const optimizationTimeMs = Math.random() * 40 + 10;
        await this.delay(Math.min(optimizationTimeMs, 50));
        const actualOptimizationTime = performance.now() - optimizationStart;
        const totalTimeMs = performance.now() - startTime;
        const checksum = this.calculateChecksum(traitData);
        return {
            traitId: config.traitId,
            platform: config.platform,
            success: true,
            deployedAtMs: Date.now(),
            completionTimeMs: totalTimeMs,
            fileSize: traitData.byteLength,
            checksum,
            warnings: totalTimeMs > 200 ? [`Deployment took ${totalTimeMs.toFixed(0)}ms`] : [],
            errors: [],
            metrics: {
                downloadTimeMs: actualDownloadTime,
                compilationTimeMs: actualCompilationTime,
                optimizationTimeMs: actualOptimizationTime,
                totalTimeMs,
                bandwidthUsedMB: traitData.byteLength / 1024 / 1024,
                cpuUsagePercent: 45 + Math.random() * 30,
                memoryUsageMB: 100 + Math.random() * 200
            }
        };
    }
    /**
     * Optimize trait for specific platform
     */
    optimizeForPlatform(trait, platform, target) {
        const optimized = JSON.parse(JSON.stringify(trait));
        // Get platform capabilities
        const adapter = this.platformAdapters.get(platform);
        const capabilities = adapter.getCapabilities();
        // Apply optimization strategy based on capability level
        const strategy = this.getOptimizationStrategy(platform, target);
        // Reduce mesh complexity if needed
        if (strategy.meshComplexity === 'low') {
            // Would implement actual mesh simplification
        }
        // Adjust texture quality
        if (strategy.textureQuality === 'low') {
            if (optimized.materials?.[0]) {
                // Would reduce texture resolution
            }
        }
        // Disable advanced effects
        if (strategy.effectQuality === 'none' || strategy.effectQuality === 'basic') {
            if (optimized.materials?.[0]) {
                // Would disable post-processing
            }
        }
        return optimized;
    }
    /**
     * Get optimization strategy for platform
     */
    getOptimizationStrategy(platform, target) {
        // Match by platform and capability
        for (const strategy of this.optimizationStrategies) {
            if (strategy.platforms.includes(platform)) {
                if (strategy.targetCapability === target.capability.toLowerCase()) {
                    return strategy;
                }
            }
        }
        // Return default strategy
        return this.optimizationStrategies[0];
    }
    /**
     * Validate trait for platform
     */
    validateForPlatform(trait, platform, target) {
        const errors = [];
        const warnings = [];
        const incompatibilities = [];
        // Check trait has materials
        if (!trait.materials || trait.materials.length === 0) {
            errors.push('Trait must have at least one material');
        }
        // Get platform capabilities
        const adapter = this.platformAdapters.get(platform);
        const capabilities = adapter.getCapabilities();
        // Validate against platform limits
        if (trait.materials?.[0]) {
            const material = trait.materials[0];
            const propCount = material.properties?.length ?? 0;
            if (propCount > 50) {
                warnings.push(`Material has ${propCount} properties, consider reducing for ${platform}`);
            }
            // Check for incompatible features
            if (platform === 'web' && target.capability === PlatformCapability.MAXIMUM) {
                incompatibilities.push('Web platform cannot support maximum quality tier');
            }
            if ((platform === 'ios' || platform === 'android') && target.capability === PlatformCapability.MAXIMUM) {
                warnings.push('Mobile platform may struggle with maximum quality, consider reducing');
            }
        }
        // Platform-specific validation
        if (platform === 'vr') {
            // VR-specific checks
            const materialsForVR = trait.materials?.filter(m => m.type === 'pbr' || m.type === 'standard');
            if (!materialsForVR || materialsForVR.length === 0) {
                warnings.push('VR deployment works best with PBR materials');
            }
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            incompatibilities
        };
    }
    /**
     * Serialize trait for platform deployment
     */
    serializeTraitForPlatform(trait, target) {
        const jsonStr = JSON.stringify(trait);
        const encoder = new TextEncoder();
        return encoder.encode(jsonStr);
    }
    /**
     * Calculate checksum for data
     */
    calculateChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data[i];
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
    }
    /**
     * Delay utility
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get deployment status for trait
     */
    getDeploymentStatus(traitId, platform) {
        return this.deploymentStatus.get(`${traitId}_${platform}`);
    }
    /**
     * Get all deployment statuses
     */
    getAllDeploymentStatuses() {
        return Array.from(this.deploymentStatus.values());
    }
    /**
     * Get deployment history
     */
    getDeploymentHistory(limit) {
        if (limit) {
            return this.deploymentHistory.slice(-limit);
        }
        return [...this.deploymentHistory];
    }
    /**
     * Clear deployment cache
     */
    clearDeploymentCache() {
        this.deploymentCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.deploymentCache.size,
            maxSize: this.maxCacheSize,
            entries: Array.from(this.deploymentCache.keys())
        };
    }
    /**
     * Register custom optimization strategy
     */
    registerOptimizationStrategy(strategy) {
        this.optimizationStrategies.push(strategy);
    }
    /**
     * Get all optimization strategies
     */
    getOptimizationStrategies() {
        return [...this.optimizationStrategies];
    }
    /**
     * Get platform adapter
     */
    getPlatformAdapter(platform) {
        return this.platformAdapters.get(platform);
    }
    /**
     * Get supported platforms
     */
    getSupportedPlatforms() {
        return Array.from(this.platformAdapters.keys());
    }
    /**
     * Export deployment configuration
     */
    exportDeploymentConfig() {
        const config = {
            strategies: this.optimizationStrategies,
            history: this.deploymentHistory.slice(-20), // Last 20 deployments
            timestamp: Date.now()
        };
        return JSON.stringify(config, null, 2);
    }
    /**
     * Import deployment configuration
     */
    importDeploymentConfig(jsonData) {
        try {
            const config = JSON.parse(jsonData);
            if (config.strategies && Array.isArray(config.strategies)) {
                this.optimizationStrategies = config.strategies;
            }
            if (config.history && Array.isArray(config.history)) {
                this.deploymentHistory = config.history;
            }
        }
        catch (error) {
            throw new Error(`Failed to import deployment configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
