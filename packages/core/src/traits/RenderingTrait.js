/**
 * @holoscript/core Rendering Trait
 *
 * Enables GPU optimization directives, level of detail management,
 * and rendering performance tuning
 */
/**
 * RenderingTrait - Manages GPU optimization and rendering performance
 */
export class RenderingTrait {
    constructor(config) {
        this.optimization = {
            lodStrategy: 'automatic',
            culling: {
                mode: 'back',
                frustum: true,
                occlusion: true,
            },
            batching: {
                static: true,
                dynamic: true,
                instancing: true,
                maxInstanceCount: 1000,
            },
            textures: {
                streaming: true,
                compression: 'auto',
                mipmaps: true,
                maxResolution: 2048,
            },
            shaders: {
                simplifiedShaders: true,
                lodBias: 0,
            },
            targetGPUTier: 'high',
            adaptiveQuality: true,
            targetFrameRate: 60,
            ...config,
        };
    }
    /**
     * Get rendering optimization config
     */
    getOptimization() {
        return JSON.parse(JSON.stringify(this.optimization));
    }
    /**
     * Update rendering configuration
     */
    updateOptimization(updates) {
        this.optimization = { ...this.optimization, ...updates };
    }
    /**
     * Setup LOD levels (3 levels is typical)
     */
    setupLODLevels(strategy = 'automatic') {
        const levels = [
            {
                level: 0,
                screenRelativeSize: 0.5,
                polygonReduction: 1.0,
                textureScale: 1.0,
            },
            {
                level: 1,
                screenRelativeSize: 0.25,
                polygonReduction: 0.6,
                disabledFeatures: ['specular'],
                textureScale: 0.5,
            },
            {
                level: 2,
                screenRelativeSize: 0.1,
                polygonReduction: 0.3,
                disabledFeatures: ['specular', 'normals'],
                textureScale: 0.25,
            },
        ];
        this.optimization.lodStrategy = strategy;
        this.optimization.lodLevels = levels;
    }
    /**
     * Get LOD levels
     */
    getLODLevels() {
        return [...(this.optimization.lodLevels || [])];
    }
    /**
     * Configure culling
     */
    setCulling(config) {
        this.optimization.culling = {
            ...this.optimization.culling,
            ...config,
        };
    }
    /**
     * Enable frustum culling
     */
    setFrustumCulling(enabled) {
        if (!this.optimization.culling) {
            this.optimization.culling = { mode: 'back' };
        }
        this.optimization.culling.frustum = enabled;
    }
    /**
     * Enable occlusion culling
     */
    setOcclusionCulling(enabled, distance) {
        if (!this.optimization.culling) {
            this.optimization.culling = { mode: 'back' };
        }
        this.optimization.culling.occlusion = enabled;
        if (distance) {
            this.optimization.culling.occlusionDistance = distance;
        }
    }
    /**
     * Configure batching
     */
    setBatching(config) {
        this.optimization.batching = {
            ...this.optimization.batching,
            ...config,
        };
    }
    /**
     * Enable GPU instancing
     */
    setInstancing(enabled, maxInstances) {
        if (!this.optimization.batching) {
            this.optimization.batching = {};
        }
        this.optimization.batching.instancing = enabled;
        if (maxInstances) {
            this.optimization.batching.maxInstanceCount = maxInstances;
        }
    }
    /**
     * Configure texture optimization
     */
    setTextureOptimization(config) {
        this.optimization.textures = {
            ...this.optimization.textures,
            ...config,
        };
    }
    /**
     * Enable texture streaming
     */
    setTextureStreaming(enabled, budgetMB) {
        if (!this.optimization.textures) {
            this.optimization.textures = {};
        }
        this.optimization.textures.streaming = enabled;
        if (budgetMB) {
            this.optimization.textures.streamingBudget = budgetMB;
        }
    }
    /**
     * Set texture compression
     */
    setTextureCompression(compression) {
        if (!this.optimization.textures) {
            this.optimization.textures = {};
        }
        this.optimization.textures.compression = compression;
    }
    /**
     * Set max texture resolution
     */
    setMaxTextureResolution(resolution) {
        if (!this.optimization.textures) {
            this.optimization.textures = {};
        }
        this.optimization.textures.maxResolution = resolution;
    }
    /**
     * Configure shader optimization
     */
    setShaderOptimization(config) {
        this.optimization.shaders = {
            ...this.optimization.shaders,
            ...config,
        };
    }
    /**
     * Set target GPU tier
     */
    setTargetGPUTier(tier) {
        this.optimization.targetGPUTier = tier;
    }
    /**
     * Enable adaptive quality (adjust based on frame rate)
     */
    setAdaptiveQuality(enabled, targetFrameRate) {
        this.optimization.adaptiveQuality = enabled;
        if (targetFrameRate) {
            this.optimization.targetFrameRate = targetFrameRate;
        }
    }
    /**
     * Set fixed timestep for VR/AR
     */
    setFixedTimestep(timestep) {
        this.optimization.fixedTimestep = timestep;
    }
    /**
     * Get rendering preset for quality level
     */
    getPresetForQuality(quality) {
        const presets = {
            low: {
                targetGPUTier: 'low',
                lodStrategy: 'automatic',
                culling: { mode: 'back', frustum: true, occlusion: false },
                batching: { instancing: true, maxInstanceCount: 500 },
                textures: {
                    compression: 'astc',
                    maxResolution: 512,
                    streaming: true,
                    streamingBudget: 128,
                },
                adaptiveQuality: true,
                targetFrameRate: 30,
            },
            medium: {
                targetGPUTier: 'medium',
                lodStrategy: 'automatic',
                culling: { mode: 'back', frustum: true, occlusion: true },
                batching: { instancing: true, maxInstanceCount: 1000 },
                textures: {
                    compression: 'basis',
                    maxResolution: 1024,
                    streaming: true,
                    streamingBudget: 256,
                },
                adaptiveQuality: true,
                targetFrameRate: 60,
            },
            high: {
                targetGPUTier: 'high',
                lodStrategy: 'automatic',
                culling: { mode: 'back', frustum: true, occlusion: true },
                batching: { instancing: true, maxInstanceCount: 2000 },
                textures: {
                    compression: 'dxt',
                    maxResolution: 2048,
                    streaming: true,
                    streamingBudget: 512,
                },
                adaptiveQuality: false,
                targetFrameRate: 60,
            },
            ultra: {
                targetGPUTier: 'ultra',
                lodStrategy: 'manual',
                culling: {
                    mode: 'back',
                    frustum: true,
                    occlusion: true,
                    hierarchicalZ: true,
                },
                batching: { instancing: true, maxInstanceCount: 5000 },
                textures: {
                    compression: 'none',
                    maxResolution: 4096,
                    virtualTexturing: true,
                    streaming: true,
                    streamingBudget: 1024,
                },
                adaptiveQuality: false,
                targetFrameRate: 120,
            },
        };
        return { ...this.optimization, ...presets[quality] };
    }
    /**
     * Apply quality preset
     */
    applyQualityPreset(quality) {
        const preset = this.getPresetForQuality(quality);
        this.optimization = preset;
    }
    /**
     * Estimate GPU memory usage
     */
    estimateGPUMemory() {
        let textureMemory = 0;
        let vertexBuffers = 0;
        // Estimate texture memory based on max resolution
        // Assuming RGBA format at 4 bytes per pixel
        const maxRes = this.optimization.textures?.maxResolution || 2048;
        textureMemory = (maxRes * maxRes * 4) / (1024 * 1024); // MB
        // Estimate based on instancing
        // Typical mesh: 10K vertices, position (12) + normal (12) + UV (8) + color (4) = 36 bytes
        const instanceCount = this.optimization.batching?.maxInstanceCount || 1000;
        const verticesPerMesh = 10000;
        vertexBuffers = ((verticesPerMesh * 36 * instanceCount) / (1024 * 1024)) * 0.1; // 10% for practical estimate
        return {
            textureMemory: Math.round(textureMemory),
            vertexBuffers: Math.max(1, Math.round(vertexBuffers)), // At least 1MB
            estimatedTotal: Math.round(textureMemory + Math.max(1, vertexBuffers)),
        };
    }
    /**
     * Get rendering statistics/info
     */
    getInfo() {
        const tier = this.optimization.targetGPUTier;
        const lod = this.optimization.lodStrategy;
        const culling = this.optimization.culling?.mode;
        const instancing = this.optimization.batching?.instancing ? 'yes' : 'no';
        const memory = this.estimateGPUMemory();
        return `Rendering: tier=${tier} | LOD=${lod} | culling=${culling} | instancing=${instancing} | ` +
            `memory=${memory.estimatedTotal}MB`;
    }
    /**
     * Optimize for VR/AR (fixed timestep, fast culling)
     */
    optimizeForVRAR(targetFPS = 90) {
        this.optimization.fixedTimestep = 1 / targetFPS;
        this.optimization.targetFrameRate = targetFPS;
        this.setOcclusionCulling(true, 50);
        this.setInstancing(true, 5000);
        this.setAdaptiveQuality(true, targetFPS);
    }
    /**
     * Optimize for mobile (lower resources)
     */
    optimizeForMobile() {
        this.applyQualityPreset('low');
        this.setTextureCompression('astc');
        this.setInstancing(true, 256);
    }
    /**
     * Optimize for desktop (higher resources)
     */
    optimizeForDesktop() {
        this.applyQualityPreset('ultra');
        this.setTextureCompression('none');
        this.setInstancing(true, 5000);
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        // Cleanup if needed
    }
}
/**
 * HoloScript+ @rendering trait factory
 */
export function createRenderingTrait(config) {
    return new RenderingTrait(config);
}
