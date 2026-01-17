/**
 * Demo Application 5: AR/VR Unified Experience
 *
 * Shows seamless transitions between AR and VR modes,
 * physical-digital blending, and context-aware auto-optimization.
 */
export declare const AR_VR_UNIFIED_HS = "\n// Unified AR/VR Experience - Physical World Blending\norb unifiedExperience {\n  position: [0, 0, 0]\n  \n  @rendering {\n    platform: auto,\n    mode: ar-vr-adaptive,\n    qualityPreset: dynamic,\n    contextAware: true\n  }\n  \n  @state {\n    currentMode: \"auto\",\n    cameraMode: \"world\",\n    physicalEnvironment: \"unknown\",\n    lightingSource: \"auto-detect\",\n    userDistance: 0.0\n  }\n}\n\n// AR mode - blended with physical world\norb arLayer {\n  parent: unifiedExperience,\n  visible: @state.currentMode in [auto, ar],\n  \n  @material {\n    type: translucent-pbr,\n    transparency: 0.0,\n    blendMode: screen\n  }\n  \n  @lighting {\n    type: environment-capture,\n    estimateLighting: true,\n    shadowPlanes: [floor, walls]\n  }\n  \n  @rendering {\n    mode: ar,\n    occlusionCulling: true,\n    depthAwareness: true,\n    physicalRaycast: true\n  }\n}\n\n// VR mode - full immersive environment\norb vrEnvironment {\n  parent: unifiedExperience,\n  visible: @state.currentMode in [auto, vr],\n  \n  @material {\n    type: pbr,\n    metallic: 0.2,\n    roughness: 0.6\n  }\n  \n  @lighting {\n    type: directional,\n    intensity: 1.5,\n    environmentMap: dynamic,\n    shadowType: soft\n  }\n  \n  @rendering {\n    mode: vr,\n    targetFPS: 90,\n    foveatedRendering: true,\n    multiViewRendering: true\n  }\n}\n\n// Adaptive content based on mode\nfunction updateContentVisibility() {\n  match @state.currentMode {\n    ar -> {\n      hideFullEnvironment()\n      showPhysicalAnchorPoints()\n      enableOcclusion()\n    }\n    vr -> {\n      showFullEnvironment()\n      hidePhysicalElements()\n      disableOcclusion()\n    }\n    auto -> {\n      detectPhysicalEnvironment()\n      if (physicalEnvironmentDetected()) {\n        switchToAR()\n      } else {\n        switchToVR()\n      }\n    }\n  }\n}\n\n// Physical anchor system\norb physicalAnchors {\n  parent: unifiedExperience,\n  \n  @state { detectionMode: spatial }\n  \n  for(anchor in detectPhysicalSurfaces()) {\n    orb anchor {\n      position: anchor.position,\n      normal: anchor.normal,\n      @material { transparency: 0.0 }\n      @rendering { occlusionGeometry: true }\n    }\n  }\n}\n\n// Transition between modes with context preservation\nfunction transitionMode(targetMode) {\n  // Save current state\n  saveViewState()\n  saveObjectStates()\n  \n  // Fade out current mode\n  fadeOut(300ms)\n  \n  // Update rendering mode\n  @state.currentMode = targetMode\n  \n  // Fade in new mode with preserved state\n  fadeIn(300ms)\n  \n  restoreViewState()\n}\n\n// Context-aware LOD\nfunction selectLODLevel() {\n  const distance = @state.userDistance\n  const mode = @state.currentMode\n  \n  match (mode, distance) {\n    (ar, < 1m) -> selectLOD(high_detail, low_triangle_count)\n    (ar, 1-5m) -> selectLOD(medium_detail, medium_triangle_count)\n    (ar, > 5m) -> selectLOD(billboard, low_triangle_count)\n    (vr, any) -> selectLOD(high_detail, high_triangle_count)\n  }\n}\n";
/**
 * AR/VR Unified Demo
 * Seamless AR/VR transitions with physical environment awareness
 */
export declare class ARVRUnifiedDemo {
    private name;
    private hsCode;
    private traditionalCode;
    private useCases;
    private deviceCapabilities;
    constructor();
    /**
     * Mode detection and adaptation
     */
    getAutoModeDetection(): {
        signal: string;
        threshold: string;
        confidence: string;
        action: string;
    }[];
    /**
     * Seamless transition scenarios
     */
    getTransitionScenarios(): {
        scenario: string;
        startMode: string;
        endMode: string;
        preservedState: string[];
        transitionTime: string;
    }[];
    /**
     * Physical environment adaptation
     */
    getPhysicalEnvironmentAdaptation(): Record<string, Record<string, unknown>>;
    /**
     * Occlusion handling across devices
     */
    getOcclusionStrategy(): {
        device: string;
        occlusionType: string;
        precision: string;
        updateRate: number;
        fallback: string;
    }[];
    /**
     * Lighting environment capture
     */
    getLightingEnvironmentSystem(): {
        method: string;
        device: string;
        updateFrequency: string;
        parameters: string[];
        fallback: string;
    }[];
    /**
     * Use case implementations
     */
    getUseImplementations(): Record<string, Record<string, unknown>>;
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
     * Technical requirements comparison
     */
    getTechnicalComparison(): {
        component: string;
        traditional: number | string;
        holoscript: number | string;
        reduction: string;
    }[];
    /**
     * Device matrix showing AR/VR capabilities
     */
    getDeviceMatrix(): {
        device: string;
        nativeAR: boolean;
        nativeVR: boolean;
        autoMode: boolean;
        occlusionQuality: string;
        recommendedMode: string;
    }[];
}
export declare function createARVRUnifiedDemo(): ARVRUnifiedDemo;
