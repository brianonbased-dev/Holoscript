/**
 * @holoscript/core Lighting Trait
 *
 * Enables dynamic lighting with support for multiple light types,
 * shadows, and global illumination
 */
/**
 * LightingTrait - Manages dynamic lighting and illumination
 */
export class LightingTrait {
    constructor(config) {
        this.lights = new Map();
        this.lightIdCounter = 0;
        this.globalIllumination = {
            enabled: true,
            intensity: 1.0,
            skyColor: { r: 0.5, g: 0.7, b: 1.0 },
            skyIntensity: 1.0,
            groundColor: { r: 0.4, g: 0.4, b: 0.4 },
            groundIntensity: 0.5,
            probes: true,
            indirectDiffuse: 1.0,
            indirectSpecular: 1.0,
            aoIntensity: 1.0,
            screenSpaceAO: true,
            ...config,
        };
    }
    /**
     * Add a light to the scene
     */
    addLight(light) {
        const id = light.name || `light_${this.lightIdCounter++}`;
        this.lights.set(id, light);
        return id;
    }
    /**
     * Get light by ID
     */
    getLight(id) {
        return this.lights.get(id);
    }
    /**
     * Get all lights
     */
    getLights() {
        return Array.from(this.lights.values());
    }
    /**
     * Get lights by type
     */
    getLightsByType(type) {
        return Array.from(this.lights.values()).filter(l => l.type === type);
    }
    /**
     * Update light properties
     */
    updateLight(id, updates) {
        const light = this.lights.get(id);
        if (!light)
            return false;
        this.lights.set(id, { ...light, ...updates });
        return true;
    }
    /**
     * Remove light
     */
    removeLight(id) {
        return this.lights.delete(id);
    }
    /**
     * Clear all lights
     */
    clearLights() {
        this.lights.clear();
    }
    /**
     * Get global illumination config
     */
    getGlobalIllumination() {
        return { ...this.globalIllumination };
    }
    /**
     * Update global illumination
     */
    updateGlobalIllumination(updates) {
        this.globalIllumination = {
            ...this.globalIllumination,
            ...updates,
        };
    }
    /**
     * Enable/disable GI
     */
    setGIEnabled(enabled) {
        this.globalIllumination.enabled = enabled;
    }
    /**
     * Set ambient light colors (skybox mode)
     */
    setAmbientLight(skyColor, groundColor, intensity = 1.0) {
        this.globalIllumination.skyColor = skyColor;
        this.globalIllumination.groundColor = groundColor;
        this.globalIllumination.skyIntensity = intensity;
        this.globalIllumination.groundIntensity = intensity * 0.5;
    }
    /**
     * Enable/disable screen-space ambient occlusion
     */
    setScreenSpaceAO(enabled, intensity = 1.0) {
        this.globalIllumination.screenSpaceAO = enabled;
        this.globalIllumination.aoIntensity = intensity;
    }
    /**
     * Create directional light (sun)
     */
    createDirectionalLight(direction, color, intensity = 1.0, castShadows = true) {
        const light = {
            type: 'directional',
            name: `sun_${this.lightIdCounter}`,
            direction,
            color,
            intensity,
            shadow: castShadows
                ? {
                    type: 'soft',
                    resolution: 2048,
                    cascades: 4,
                    softness: 1.0,
                }
                : undefined,
            volumetric: true,
            priority: 100,
        };
        return this.addLight(light);
    }
    /**
     * Create point light
     */
    createPointLight(position, color, intensity, range, castShadows = false) {
        const light = {
            type: 'point',
            name: `point_${this.lightIdCounter}`,
            position,
            color,
            intensity,
            range,
            shadow: castShadows
                ? {
                    type: 'soft',
                    resolution: 512,
                    softness: 0.5,
                }
                : undefined,
            priority: 50,
        };
        return this.addLight(light);
    }
    /**
     * Create spot light
     */
    createSpotLight(position, direction, color, intensity, range, spotAngle = 45, castShadows = true) {
        const light = {
            type: 'spot',
            name: `spot_${this.lightIdCounter}`,
            position,
            direction,
            color,
            intensity,
            range,
            spotAngle,
            innerSpotAngle: spotAngle * 0.5,
            shadow: castShadows
                ? {
                    type: 'soft',
                    resolution: 1024,
                    softness: 0.8,
                }
                : undefined,
            priority: 75,
        };
        return this.addLight(light);
    }
    /**
     * Create area light for soft lighting
     */
    createAreaLight(position, color, intensity, width, height) {
        const light = {
            type: 'area',
            name: `area_${this.lightIdCounter}`,
            position,
            color,
            intensity,
            range: Math.max(width, height) * 2,
            priority: 25,
        };
        return this.addLight(light);
    }
    /**
     * Get shadow-casting lights
     */
    getShadowCastingLights() {
        return Array.from(this.lights.values()).filter(l => l.shadow && l.shadow.type !== 'none');
    }
    /**
     * Get light count by type
     */
    getLightCount() {
        const counts = {
            directional: 0,
            point: 0,
            spot: 0,
            area: 0,
            probe: 0,
        };
        for (const light of this.lights.values()) {
            counts[light.type]++;
        }
        return counts;
    }
    /**
     * Estimate light impact for performance optimization
     */
    getPerformanceImpact() {
        const totalLights = this.lights.size;
        const shadowCasters = this.getShadowCastingLights().length;
        let estimatedGPUCost = 'low';
        if (totalLights > 16 || shadowCasters > 4) {
            estimatedGPUCost = 'high';
        }
        else if (totalLights > 8 || shadowCasters > 2) {
            estimatedGPUCost = 'medium';
        }
        return {
            totalLights,
            shadowCasters,
            estimatedGPUCost,
        };
    }
    /**
     * Get scene complexity info
     */
    getSceneInfo() {
        const counts = this.getLightCount();
        const impact = this.getPerformanceImpact();
        return `Lighting: ${counts.directional} dir, ${counts.point} point, ${counts.spot} spot | ` +
            `Shadows: ${impact.shadowCasters} | GPU: ${impact.estimatedGPUCost}`;
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        this.lights.clear();
    }
}
/**
 * HoloScript+ @lighting trait factory
 */
export function createLightingTrait(config) {
    return new LightingTrait(config);
}
/**
 * Preset lighting configurations
 */
export const LIGHTING_PRESETS = {
    /** Neutral studio lighting */
    studio: () => ({
        enabled: true,
        intensity: 1.0,
        skyColor: { r: 0.5, g: 0.5, b: 0.5 },
        skyIntensity: 0.5,
        groundColor: { r: 0.3, g: 0.3, b: 0.3 },
        groundIntensity: 0.3,
    }),
    /** Bright outdoor lighting */
    outdoor: () => ({
        enabled: true,
        intensity: 1.2,
        skyColor: { r: 0.7, g: 0.85, b: 1.0 },
        skyIntensity: 1.0,
        groundColor: { r: 0.4, g: 0.4, b: 0.35 },
        groundIntensity: 0.6,
        indirectDiffuse: 1.2,
    }),
    /** Dim interior lighting */
    interior: () => ({
        enabled: true,
        intensity: 0.6,
        skyColor: { r: 0.3, g: 0.3, b: 0.35 },
        skyIntensity: 0.4,
        groundColor: { r: 0.2, g: 0.2, b: 0.2 },
        groundIntensity: 0.2,
    }),
    /** Night scene */
    night: () => ({
        enabled: true,
        intensity: 0.3,
        skyColor: { r: 0.01, g: 0.01, b: 0.02 },
        skyIntensity: 0.1,
        groundColor: { r: 0.02, g: 0.02, b: 0.02 },
        groundIntensity: 0.05,
        screenSpaceAO: false,
    }),
    /** Sunset/golden hour */
    sunset: () => ({
        enabled: true,
        intensity: 1.1,
        skyColor: { r: 1.0, g: 0.7, b: 0.3 },
        skyIntensity: 1.0,
        groundColor: { r: 0.6, g: 0.4, b: 0.2 },
        groundIntensity: 0.8,
    }),
};
