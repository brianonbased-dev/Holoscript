import { MaterialTrait, LightingTrait, RenderingTrait } from '@holoscript/core';
/**
 * Example 1: Creating a Photorealistic Metal Sphere
 *
 * Demonstrates:
 * - PBR material setup
 * - Texture mapping
 * - Material instancing for performance
 */
export declare function createMetalSphere(): any;
/**
 * Example 2: Realistic Wood Material
 *
 * Demonstrates:
 * - Using material presets
 * - Custom texture configuration
 * - Anisotropic filtering for detail
 */
export declare function createWoodMaterial(): any;
/**
 * Example 3: Glass/Transparent Material
 *
 * Demonstrates:
 * - Transparency and IOR (Index of Refraction)
 * - Custom shaders for special effects
 * - Transmission properties
 */
export declare function createGlassMaterial(): any;
/**
 * Example 4: Professional Studio Lighting
 *
 * Demonstrates:
 * - Three-point lighting setup
 * - Shadow configuration
 * - Performance optimization
 */
export declare function setupStudioLighting(): any;
/**
 * Example 5: Dynamic Day/Night Lighting
 *
 * Demonstrates:
 * - Time-based lighting changes
 * - Preset application
 * - Performance monitoring
 */
export declare class DayNightLighting {
    private lighting;
    private sunId;
    private ambientId;
    constructor();
    private initializeDay;
    updateTime(timeOfDay: number): void;
    getPerformanceStats(): {
        lights: any;
        shadowCasters: any;
        gpuCost: any;
    };
}
/**
 * Example 6: Mobile vs Desktop Rendering
 *
 * Demonstrates:
 * - Platform-specific optimization
 * - Quality presets
 * - Performance tuning
 */
export declare function setupRenderingForPlatform(platform: 'mobile' | 'vr' | 'desktop'): any;
/**
 * Example 7: Complete Scene Setup
 *
 * Demonstrates:
 * - Integration of all three trait systems
 * - Performance monitoring
 * - Real-world usage pattern
 */
export declare class RealisticScene {
    private materials;
    private lighting;
    private rendering;
    constructor(targetPlatform: 'mobile' | 'vr' | 'desktop');
    private setupMaterials;
    private setupLighting;
    getMaterial(name: string): MaterialTrait | undefined;
    getLighting(): LightingTrait;
    getRendering(): RenderingTrait;
    getPerformanceReport(): {
        lighting: {
            totalLights: any;
            shadowCasters: any;
            gpuCost: any;
        };
        rendering: {
            estimatedMemory: any;
            textureMemory: any;
            geometryMemory: any;
        };
        materials: {
            count: number;
            instancingEnabled: boolean;
        };
    };
}
/**
 * Example 8: Interactive Material Editor
 *
 * Demonstrates:
 * - Dynamic material adjustment
 * - Real-time updates
 * - Material property inspection
 */
export declare class MaterialEditor {
    private material;
    constructor();
    updateMetallic(value: number): void;
    updateRoughness(value: number): void;
    updateColor(r: number, g: number, b: number): void;
    addNormalMap(path: string): void;
    addRoughnessMap(path: string): void;
    getCurrentConfig(): any;
    applyPreset(presetName: string): void;
}
