/**
 * Demo Application 1: Medical VR Training
 *
 * Demonstrates revolutionary code reduction in VR medical training.
 * Same application: Traditional (~5,000 LOC) vs HoloScript+ (~50 LOC)
 */
export declare const MEDICAL_VR_TRAINING_HS = "\n// Anatomy model with interactive parts and surgical training\norb anatomyScene {\n  position: [0, 0, -2]\n  \n  @material {\n    type: pbr,\n    metallic: 0.3,\n    roughness: 0.7,\n    transparency: procedural\n  }\n  \n  @lighting {\n    type: point,\n    intensity: 1.8,\n    color: { r: 1.0, g: 1.0, b: 1.0 },\n    shadows: true\n  }\n  \n  @rendering {\n    platform: vr,\n    quality: high,\n    maxLights: 4,\n    targetFPS: 90\n  }\n  \n  @state {\n    activeRegion: null,\n    selectedTool: \"scalpel\",\n    simulationActive: false\n  }\n}\n\n// Interactive heart model\norb heart {\n  parent: anatomyScene,\n  position: [0, 0, 0],\n  \n  @material { preset: anatomical-tissue }\n  @rendering { quality: high, lod: true }\n  \n  @grabbable { snap_to_hand: true }\n  @hoverable { highlight: true }\n  @pointable { detail_level: high }\n}\n\n// Surgical tools\norb scalpel {\n  parent: anatomyScene,\n  position: [0.5, 0, 0],\n  \n  @material { type: pbr, metallic: 0.95, roughness: 0.05 }\n  @grabbable { snap_to_hand: true }\n  @throwable { bounce: false }\n}\n\nfunction onSurgicalAction() {\n  if (@state.simulationActive) {\n    broadcastMetrics()\n    assessPerformance()\n  }\n}\n";
export declare const MEDICAL_VR_TRAINING_TRADITIONAL = "\n// Traditional approach requires:\n\n// 1. WebGL Context Setup (200+ LOC)\n// - Initialize WebGL 2.0 context\n// - Create render loop\n// - Setup frame buffering\n// - Handle context loss\n\n// 2. Shader Programming (800+ LOC)\n// - Vertex shaders for anatomy\n// - Fragment shaders for PBR rendering\n// - Transparency/procedural effects\n// - Shadow mapping\n// - Normal mapping\n\n// 3. Model Loading (300+ LOC)\n// - Parse medical model formats\n// - Build mesh hierarchy\n// - Create LOD levels\n// - Setup material instances\n\n// 4. Physics System (400+ LOC)\n// - Collision detection\n// - Rigid body dynamics\n// - Grabbing/interaction\n// - Throwing mechanics\n\n// 5. Input Handling (300+ LOC)\n// - VR controller tracking\n// - Gesture recognition\n// - Tool selection\n// - Manipulation matrices\n\n// 6. GPU Memory Management (400+ LOC)\n// - Texture streaming\n// - Geometry batching\n// - Draw call optimization\n// - Memory budgeting\n\n// 7. Performance Optimization (500+ LOC)\n// - Level of detail system\n// - Frustum culling\n// - Occlusion culling\n// - Quality presets per device\n\n// 8. State Management (300+ LOC)\n// - Scene state tracking\n// - Undo/redo system\n// - User interaction history\n// - Performance metrics\n\n// 9. Device Support (400+ LOC)\n// - Meta Quest 3 optimization\n// - Apple Vision Pro support\n// - Desktop fallback\n// - Compression format selection\n\n// 10. Testing/Debugging (500+ LOC)\n// - Performance profiling\n// - Memory leak detection\n// - Frame rate analysis\n// - Device-specific testing\n\n// TOTAL: 5,000-10,000 lines of code\n";
/**
 * Medical VR Training Application
 * Showcases revolutionary complexity reduction
 */
export declare class MedicalVRTrainingDemo {
    private name;
    private hsVersion;
    private traditionalVersion;
    private codeReduction;
    private features;
    constructor();
    /**
     * Get comparison metrics
     */
    getComparison(): {
        name: string;
        hsCode: number;
        traditionalCode: number;
        reduction: number;
        developmentTime: string;
        cost: string;
        teamSize: string;
    };
    /**
     * Get feature matrix
     */
    getFeatureMatrix(): Record<string, {
        holoscript: string;
        traditional: string;
        effort: string;
    }>;
    /**
     * Generate example training scenario
     */
    generateTrainingScenario(difficulty: 'beginner' | 'intermediate' | 'advanced'): string;
    /**
     * Compare learning curve
     */
    getLearningCurve(): {
        traditional: Record<string, string>;
        holoscript: Record<string, string>;
    };
    /**
     * ROI analysis for medical VR deployment
     */
    analyzeROI(): {
        trainingMethod: string;
        developmentCost: string;
        timeToMarket: string;
        maintenanceCost: string;
        scalability: string;
        deviceSupport: string;
    };
    /**
     * Societal impact
     */
    getSocietalImpact(): string[];
}
export declare function createMedicalTrainingDemo(): MedicalVRTrainingDemo;
