/**
 * Demo Application 3: Manufacturing Design
 *
 * Shows a product assembly walkthrough with real-time quality inspection
 * and stress visualization accessible from factory floor, office, and remote locations.
 */
export declare const MANUFACTURING_DESIGN_HS = "\n// Precision Manufacturing - Assembly Line Visualization\norb manufacturingScene {\n  position: [0, 0, 0]\n  \n  @material {\n    type: pbr,\n    metallic: 0.7,\n    roughness: 0.3,\n    preset: industrial-metal\n  }\n  \n  @lighting {\n    type: directional,\n    intensity: 1.8,\n    color: { r: 1.0, g: 1.0, b: 1.0 },\n    shadows: true,\n    shadowType: sharp,\n    lightProbes: true\n  }\n  \n  @rendering {\n    platform: auto,\n    quality: adaptive,\n    lod: true,\n    culling: true\n  }\n  \n  @state {\n    assemblyStep: 0,\n    toleranceMode: \"nominal\",\n    stressVisualization: false,\n    selectedComponent: null\n  }\n}\n\n// Assembly workstation\norb workstation {\n  parent: manufacturingScene,\n  \n  @material { \n    type: pbr,\n    metallic: 0.6,\n    roughness: 0.4,\n    color: { r: 0.8, g: 0.8, b: 0.8 }\n  }\n  \n  @lighting { type: task-lighting, intensity: 2.0 }\n}\n\n// Product assembly - Engine block example\norb engineBlock {\n  parent: manufacturingScene,\n  \n  orb crankshaft {\n    @material { type: pbr, metallic: 0.9, roughness: 0.2 }\n    @hoverable { detail_level: full, tolerance: true }\n  }\n  \n  orb pistonAssembly {\n    @material { type: pbr, metallic: 0.8, roughness: 0.25 }\n    @pointable { info_display: true, stress_display: true }\n  }\n  \n  orb cylinderHead {\n    @material { type: pbr, metallic: 0.7, roughness: 0.3 }\n    @hoverable { cross_section: true, material_layers: true }\n  }\n}\n\n// Stress visualization overlay\nfunction visualizeStress(component) {\n  component.@rendering {\n    overlay: stress-heatmap,\n    colorScale: stress-intensity\n  }\n}\n\n// Quality inspection mode\nfunction inspectionMode(enabled) {\n  if (enabled) {\n    @rendering.overlay = tolerance-zones\n    @lighting.intensity = 2.5\n    @material { roughness: 0.1, highlight: true }\n  }\n}\n\n// Step-by-step assembly walkthrough\nfunction nextAssemblyStep() {\n  @state.assemblyStep += 1\n  highlightComponent(getComponent(@state.assemblyStep))\n  centerCamera(getComponent(@state.assemblyStep))\n}\n\n// Remote collaborative annotation\nfunction annotateIssue(position, severity, description) {\n  createAnnotation({\n    position,\n    severity,\n    description,\n    timestamp: now(),\n    userId: getCurrentUser()\n  })\n}\n";
/**
 * Manufacturing Design Demo
 * Showcases precision engineering, stress analysis, and remote collaboration
 */
export declare class ManufacturingDesignDemo {
    private name;
    private hsCode;
    private traditionalCode;
    private industries;
    private deviceScenarios;
    constructor();
    /**
     * Generate product assembly specification
     */
    generateAssemblySpecification(productType: 'engine' | 'phone' | 'prosthetic' | 'turbine'): {
        component: string;
        quantity: number;
        material: string;
        tolerance: string;
        estimatedTime: string;
    }[];
    /**
     * Stress analysis visualization modes
     */
    getStressVisualizationModes(): Record<string, Record<string, unknown>>;
    /**
     * Assembly step-by-step procedure
     */
    getAssemblyProcedure(productType: 'engine' | 'phone' | 'prosthetic' | 'turbine'): {
        step: number;
        action: string;
        component: string;
        expectedTime: string;
        qualityCriteria: string[];
        warningPoints: string[];
    }[];
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
     * Cross-platform deployment
     */
    getCrossPlatformDeployment(): {
        location: string;
        devices: string[];
        buildTime: string;
        updateTime: string;
        trainTime: string;
    }[];
    /**
     * Manufacturing use cases
     */
    getUseCases(): Record<string, string>;
    /**
     * ROI Analysis
     */
    getROIAnalysis(): {
        metric: string;
        traditional: string;
        holoscript: string;
        improvement: string;
    }[];
}
export declare function createManufacturingDemo(): ManufacturingDesignDemo;
