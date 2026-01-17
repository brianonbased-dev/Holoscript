/**
 * @holoscript/core Material Trait
 *
 * Enables advanced material and shader properties for photorealistic rendering
 * Supports PBR (Physically Based Rendering) workflows
 */
/**
 * MaterialTrait - Enables photorealistic material rendering
 */
export class MaterialTrait {
    constructor(config) {
        this.textureCache = new Map();
        this.material = {
            type: 'pbr',
            ...config,
        };
    }
    /**
     * Get material properties
     */
    getMaterial() {
        return { ...this.material };
    }
    /**
     * Update material property
     */
    setProperty(key, value) {
        this.material[key] = value;
    }
    /**
     * Get PBR properties
     */
    getPBRProperties() {
        return this.material.pbr;
    }
    /**
     * Update PBR material
     */
    updatePBR(pbr) {
        if (!this.material.pbr) {
            this.material.pbr = {
                baseColor: { r: 1, g: 1, b: 1 },
                metallic: 0,
                roughness: 0.5,
            };
        }
        this.material.pbr = { ...this.material.pbr, ...pbr };
    }
    /**
     * Add texture map
     */
    addTexture(texture) {
        if (!this.material.textures) {
            this.material.textures = [];
        }
        this.material.textures.push(texture);
    }
    /**
     * Get all textures
     */
    getTextures() {
        return [...(this.material.textures || [])];
    }
    /**
     * Clear texture cache (for memory optimization)
     */
    clearTextureCache() {
        this.textureCache.clear();
    }
    /**
     * Get shader code if custom
     */
    getCustomShader() {
        return this.material.customShader;
    }
    /**
     * Set custom shader
     */
    setCustomShader(shader) {
        this.material.customShader = shader;
    }
    /**
     * Get optimization hints
     */
    getOptimization() {
        return this.material.optimization;
    }
    /**
     * Enable/disable texture streaming
     */
    setTextureStreaming(enabled) {
        if (!this.material.optimization) {
            this.material.optimization = {};
        }
        this.material.optimization.streamTextures = enabled;
    }
    /**
     * Set texture compression
     */
    setCompression(compression) {
        if (!this.material.optimization) {
            this.material.optimization = {};
        }
        this.material.optimization.compression = compression;
    }
    /**
     * Enable material instancing for performance
     */
    setInstanced(instanced) {
        if (!this.material.optimization) {
            this.material.optimization = {};
        }
        this.material.optimization.instanced = instanced;
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        this.textureCache.clear();
    }
}
/**
 * HoloScript+ @material trait factory
 */
export function createMaterialTrait(config) {
    return new MaterialTrait(config);
}
/**
 * Preset materials for common use cases
 */
export const MATERIAL_PRESETS = {
    /** Shiny metal */
    chrome: () => ({
        type: 'pbr',
        pbr: {
            baseColor: { r: 0.77, g: 0.77, b: 0.77 },
            metallic: 1.0,
            roughness: 0.1,
        },
    }),
    /** Rough plastic */
    plastic: () => ({
        type: 'pbr',
        pbr: {
            baseColor: { r: 1, g: 1, b: 1 },
            metallic: 0,
            roughness: 0.8,
        },
    }),
    /** Wood texture */
    wood: () => ({
        type: 'pbr',
        pbr: {
            baseColor: { r: 0.6, g: 0.4, b: 0.2 },
            metallic: 0,
            roughness: 0.4,
        },
    }),
    /** Glass */
    glass: () => ({
        type: 'transparent',
        blendMode: 'blend',
        pbr: {
            baseColor: { r: 1, g: 1, b: 1, a: 0.3 },
            metallic: 0,
            roughness: 0.0,
            ior: 1.5,
            transmission: 0.9,
        },
    }),
    /** Emissive (glowing) */
    emissive: () => ({
        type: 'pbr',
        pbr: {
            baseColor: { r: 0, g: 1, b: 0 },
            metallic: 0,
            roughness: 1.0,
            emission: {
                color: { r: 0, g: 1, b: 0 },
                intensity: 2.0,
            },
        },
    }),
    /** Skin material */
    skin: () => ({
        type: 'pbr',
        pbr: {
            baseColor: { r: 1, g: 0.8, b: 0.7 },
            metallic: 0,
            roughness: 0.5,
            ambientOcclusion: 0.8,
        },
    }),
};
