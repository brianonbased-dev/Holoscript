/**
 * Demo Application 2: Architectural Visualization
 *
 * Shows a building walkthrough with real-time lighting simulation
 * accessible from mobile/desktop/VR without code changes.
 */
export declare const ARCHITECTURAL_VR_HS = "\n// Modern Office Building Walkthrough\norb buildingScene {\n  position: [0, 0, -5]\n  \n  @material {\n    type: pbr,\n    metallic: 0.2,\n    roughness: 0.6,\n    preset: architectural\n  }\n  \n  @lighting {\n    type: directional,\n    intensity: 1.5,\n    color: { r: 0.95, g: 0.95, b: 1.0 },\n    shadows: true,\n    shadowType: soft,\n    lightProbes: true\n  }\n  \n  @rendering {\n    platform: auto,\n    quality: adaptive,\n    lod: true,\n    culling: true\n  }\n  \n  @state {\n    timeOfDay: 12.0,\n    weatherCondition: \"clear\",\n    showMaterials: true,\n    selectedRoom: null\n  }\n}\n\n// Building exterior\norb exterior {\n  parent: buildingScene,\n  @material { \n    type: pbr,\n    metallic: 0.1,\n    roughness: 0.7,\n    color: { r: 0.8, g: 0.8, b: 0.8 }\n  }\n  \n  @rendering { quality: high, lod: true }\n}\n\n// Windows with reflections\norb windows {\n  parent: buildingScene,\n  @material {\n    type: pbr,\n    metallic: 0.9,\n    roughness: 0.05,\n    transparency: 0.8,\n    color: { r: 0.7, g: 0.9, b: 1.0 }\n  }\n  \n  @rendering { quality: high }\n}\n\n// Interior spaces\norb interiorSpaces {\n  parent: buildingScene,\n  \n  orb lobby {\n    @material { preset: concrete-polished }\n    @lighting { type: point, intensity: 2.0 }\n    @hoverable { detail_level: high }\n  }\n  \n  orb offices {\n    @material { preset: wood-flooring }\n    @lighting { type: point, intensity: 1.5, range: 10 }\n    @pointable { info_display: true }\n  }\n  \n  orb cafeteria {\n    @material { preset: tile-ceramic }\n    @lighting { type: point, intensity: 1.8 }\n  }\n}\n\n// Dynamic lighting for time-of-day simulation\nfunction updateTimeOfDay(hour) {\n  @state.timeOfDay = hour\n  const sunIntensity = calculateSunIntensity(hour)\n  @lighting.intensity = sunIntensity\n  @lighting.color = calculateSunColor(hour)\n}\n\n// Material library showcasing\nfunction showcaseMaterial(materialName) {\n  const selected = getMaterial(materialName)\n  selected.@material { highlighted: true }\n  broadcastDetails(selected)\n}\n\n// Cross-platform state sync\nfunction onClientConnect(client) {\n  broadcastState({\n    scene: @state,\n    materials: getAllMaterials(),\n    lighting: getCurrentLighting()\n  })\n}\n";
/**
 * Architectural Visualization Demo
 * Showcases cross-platform deployment and lighting simulation
 */
export declare class ArchitecturalVisualizationDemo {
    private name;
    private hsCode;
    private traditionalCode;
    private scenarios;
    private platformCapabilities;
    constructor();
    /**
     * Generate demo scene for building type
     */
    generateScene(buildingType: 'office' | 'residential' | 'retail' | 'medical'): string;
    /**
     * Create cross-platform deployment specification
     */
    getCrossPlatformDeployment(): {
        platform: string;
        singleCodebase: boolean;
        autoOptimized: boolean;
        textureQuality: string;
        lightingQuality: string;
        estimatedDevelopment: string;
    }[];
    /**
     * Lighting simulation parameters
     */
    getLightingSimulation(): Record<number, Record<string, unknown>>;
    /**
     * Material showcase library
     */
    getMaterialLibrary(): Record<string, Record<string, unknown>>;
    /**
     * Comparison: Traditional vs HoloScript+
     */
    getImplementationComparison(): {
        aspect: string;
        traditional: string;
        holoscript: string;
        timeSaved: string;
    }[];
    /**
     * Business impact analysis
     */
    getBusinessImpact(): string[];
    /**
     * Real estate use cases
     */
    getRealEstateUseCases(): Record<string, string>;
    /**
     * Private: Calculate sun color for time of day
     */
    private calculateSunColor;
}
export declare function createArchitecturalDemo(): ArchitecturalVisualizationDemo;
