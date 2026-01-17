/**
 * Demo Application 4: Collaborative VR
 *
 * Shows multi-user real-time collaboration in VR with synchronized state,
 * gesture recognition, and persistent annotations across sessions.
 */
export declare const COLLABORATIVE_VR_HS = "\n// Multi-user Collaborative Design Session\norb collaborativeSpace {\n  position: [0, 0, 0]\n  \n  @material {\n    type: pbr,\n    metallic: 0.1,\n    roughness: 0.8,\n    preset: studio-white\n  }\n  \n  @lighting {\n    type: point,\n    intensity: 2.0,\n    range: 50,\n    shadows: true,\n    shadowType: soft\n  }\n  \n  @rendering {\n    platform: auto,\n    quality: adaptive,\n    multiuser: true,\n    networkSync: true\n  }\n  \n  @state {\n    users: [],\n    selectedObject: null,\n    drawingMode: false,\n    annotationMode: true,\n    recordingSession: false\n  }\n}\n\n// Shared design canvas\norb designCanvas {\n  parent: collaborativeSpace,\n  \n  @material { \n    type: pbr,\n    metallic: 0.0,\n    roughness: 0.05,\n    color: { r: 0.95, g: 0.95, b: 1.0 }\n  }\n  \n  @pointable { allow_drawing: true, allow_annotation: true }\n}\n\n// User avatars\norb userAvatars {\n  parent: collaborativeSpace,\n  \n  for(user in @state.users) {\n    orb userAvatar {\n      position: user.position,\n      rotation: user.rotation,\n      \n      @material { color: user.colorTag }\n      @state { \n        userName: user.name,\n        isPointing: user.pointerActive,\n        annotation: user.currentAnnotation\n      }\n    }\n  }\n}\n\n// Synchronized drawing layer\norb drawingLayer {\n  parent: designCanvas,\n  \n  @rendering { \n    renderMode: additive,\n    blendMode: screen,\n    depthWrite: false\n  }\n  \n  @material {\n    type: transparent-accumulation,\n    preserveStrokes: true,\n    networkSync: true\n  }\n}\n\n// Session recording and playback\nfunction startSessionRecording() {\n  @state.recordingSession = true\n  recordAllUserActions()\n  syncToCloud()\n}\n\n// Gesture-based commands\nfunction onGestureRecognized(gestureType) {\n  match gestureType {\n    POINT_AND_HOLD -> @state.annotationMode = true\n    CIRCULAR_MOTION -> clearCurrentAnnotations()\n    PINCH -> scaleSelectedObject()\n    TWO_HAND_ROTATE -> rotateSharedObject()\n  }\n}\n\n// Real-time state broadcast\nfunction broadcastUserState(user) {\n  @state.users.update(user.id, {\n    position: user.position,\n    rotation: user.rotation,\n    pointerActive: user.isPointing,\n    currentAnnotation: user.annotation\n  })\n  \n  broadcast(@state)\n}\n\n// Persistent annotations\nfunction createPersistentAnnotation(text, position, color) {\n  createAnnotation({\n    text,\n    position,\n    color,\n    persistent: true,\n    visible_to: all_users,\n    timestamp: now(),\n    creator: getCurrentUser()\n  })\n}\n";
/**
 * Collaborative VR Demo
 * Multi-user real-time collaboration system
 */
export declare class CollaborativeVRDemo {
    private name;
    private hsCode;
    private traditionalCode;
    private collaborationScenarios;
    private networkSpecs;
    constructor();
    /**
     * Multi-user session configuration
     */
    getSessionConfiguration(): {
        maxUsers: number;
        roles: Record<string, string[]>;
        permissions: Record<string, string[]>;
        bandwidth: string;
        latencyTarget: string;
    };
    /**
     * Real-time state synchronization specification
     */
    getStateSyncSpecification(): {
        update: string;
        frequency: number;
        bandwidth: string;
        compression: string;
        recovery: string;
    }[];
    /**
     * Gesture recognition system
     */
    getGestureRecognitionSystem(): Record<string, Record<string, unknown>>;
    /**
     * Annotation system specification
     */
    getAnnotationSystem(): {
        type: string;
        lifetime: string;
        visibility: string;
        persistence: string;
        features: string[];
    }[];
    /**
     * Session use cases
     */
    getSessionUseCases(): Record<string, Record<string, unknown>>;
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
     * Technical requirements
     */
    getTechnicalRequirements(): {
        component: string;
        traditional: number | string;
        holoscript: number | string;
        improvement: string;
    }[];
    /**
     * ROI and business impact
     */
    getBusinessImpact(): string[];
    /**
     * Cross-platform device matrix
     */
    getCrossPlatformMatrix(): {
        device: string;
        participants: number;
        latency: string;
        gestures: string;
        annotations: string;
        recording: string;
    }[];
}
export declare function createCollaborativeDemo(): CollaborativeVRDemo;
