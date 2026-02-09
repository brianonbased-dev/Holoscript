/**
 * OpenXR HAL (Hardware Abstraction Layer) Trait
 *
 * Critical foundation for ALL haptic traits - abstracts XR hardware capabilities.
 * Provides unified interface across Quest, Vive, Index, Vision Pro, and future devices.
 *
 * Research Reference: uAA2++ Protocol - "OpenXR HAL blocks ALL haptic traits without it"
 *
 * @version 3.1.0
 * @milestone v3.1 (March 2026)
 */

import type { TraitHandler } from './TraitTypes';

// =============================================================================
// TYPES
// =============================================================================

type XRDeviceType =
  | 'quest_3'
  | 'quest_pro'
  | 'vive_xr_elite'
  | 'valve_index'
  | 'vision_pro'
  | 'pico_4'
  | 'generic_openxr'
  | 'unknown';

type HapticCapability = 'rumble' | 'hd_haptics' | 'force_feedback' | 'thermal' | 'none';
type TrackingCapability = 'controller' | 'hand' | 'eye' | 'body' | 'face';
type RenderCapability = 'passthrough' | 'depth_sensing' | 'mesh_detection' | 'plane_detection';

interface XRDeviceProfile {
  type: XRDeviceType;
  name: string;
  manufacturer: string;
  hapticCapabilities: HapticCapability[];
  trackingCapabilities: TrackingCapability[];
  renderCapabilities: RenderCapability[];
  refreshRates: number[];
  resolution: { width: number; height: number };
  fov: number;
  controllers: {
    left: ControllerProfile | null;
    right: ControllerProfile | null;
  };
}

interface ControllerProfile {
  hapticActuators: number;
  hapticFrequencyRange: [number, number]; // Hz
  maxAmplitude: number;
  supportsHDHaptics: boolean;
  buttonCount: number;
  hasThumbstick: boolean;
  hasTouchpad: boolean;
  hasGripButton: boolean;
  hasTrigger: boolean;
}

interface OpenXRHALState {
  isInitialized: boolean;
  session: unknown | null;
  deviceProfile: XRDeviceProfile | null;
  frameRate: number;
  isPassthroughActive: boolean;
  handTrackingActive: boolean;
  eyeTrackingActive: boolean;
  lastFrameTime: number;
  performanceLevel: 'low' | 'medium' | 'high' | 'max';
}

interface OpenXRHALConfig {
  /** Preferred refresh rate (0 = auto) */
  preferred_refresh_rate: number;
  /** Enable passthrough if available */
  enable_passthrough: boolean;
  /** Enable hand tracking if available */
  enable_hand_tracking: boolean;
  /** Enable eye tracking if available (requires permission) */
  enable_eye_tracking: boolean;
  /** Performance mode */
  performance_mode: 'battery_saver' | 'balanced' | 'performance';
  /** Fallback behavior when OpenXR unavailable */
  fallback_mode: 'simulate' | 'disable' | 'error';
  /** Enable haptic simulation in non-VR mode */
  simulate_haptics: boolean;
  /** Custom device overrides */
  device_overrides: Partial<XRDeviceProfile> | null;
}

// =============================================================================
// DEVICE PROFILES DATABASE
// =============================================================================

const deviceProfiles: Record<string, Partial<XRDeviceProfile>> = {
  'meta quest 3': {
    type: 'quest_3',
    name: 'Meta Quest 3',
    manufacturer: 'Meta',
    hapticCapabilities: ['rumble', 'hd_haptics'],
    trackingCapabilities: ['controller', 'hand', 'eye'],
    renderCapabilities: ['passthrough', 'depth_sensing', 'mesh_detection', 'plane_detection'],
    refreshRates: [72, 90, 120],
    resolution: { width: 2064, height: 2208 },
    fov: 110,
  },
  'meta quest pro': {
    type: 'quest_pro',
    name: 'Meta Quest Pro',
    manufacturer: 'Meta',
    hapticCapabilities: ['rumble', 'hd_haptics', 'force_feedback'],
    trackingCapabilities: ['controller', 'hand', 'eye', 'face'],
    renderCapabilities: ['passthrough', 'depth_sensing', 'mesh_detection', 'plane_detection'],
    refreshRates: [72, 90],
    resolution: { width: 1800, height: 1920 },
    fov: 106,
  },
  'apple vision pro': {
    type: 'vision_pro',
    name: 'Apple Vision Pro',
    manufacturer: 'Apple',
    hapticCapabilities: ['none'], // No controllers, uses hand tracking
    trackingCapabilities: ['hand', 'eye'],
    renderCapabilities: ['passthrough', 'depth_sensing', 'mesh_detection', 'plane_detection'],
    refreshRates: [90, 96, 100],
    resolution: { width: 3660, height: 3200 },
    fov: 120,
  },
  'valve index': {
    type: 'valve_index',
    name: 'Valve Index',
    manufacturer: 'Valve',
    hapticCapabilities: ['rumble', 'hd_haptics', 'force_feedback'],
    trackingCapabilities: ['controller', 'hand'],
    renderCapabilities: [],
    refreshRates: [80, 90, 120, 144],
    resolution: { width: 1440, height: 1600 },
    fov: 130,
  },
  'htc vive xr elite': {
    type: 'vive_xr_elite',
    name: 'HTC Vive XR Elite',
    manufacturer: 'HTC',
    hapticCapabilities: ['rumble'],
    trackingCapabilities: ['controller', 'hand'],
    renderCapabilities: ['passthrough', 'depth_sensing'],
    refreshRates: [90],
    resolution: { width: 1920, height: 1920 },
    fov: 110,
  },
};

// =============================================================================
// HANDLER
// =============================================================================

export const openXRHALHandler: TraitHandler<OpenXRHALConfig> = {
  name: 'openxr_hal' as any,

  defaultConfig: {
    preferred_refresh_rate: 0,
    enable_passthrough: false,
    enable_hand_tracking: true,
    enable_eye_tracking: false,
    performance_mode: 'balanced',
    fallback_mode: 'simulate',
    simulate_haptics: true,
    device_overrides: null,
  },

  onAttach(node, config, context) {
    const state: OpenXRHALState = {
      isInitialized: false,
      session: null,
      deviceProfile: null,
      frameRate: 90,
      isPassthroughActive: false,
      handTrackingActive: false,
      eyeTrackingActive: false,
      lastFrameTime: 0,
      performanceLevel: 'medium',
    };
    (node as any).__openxrHALState = state;

    initializeOpenXR(node, state, config, context);
  },

  onDetach(node, _config, context) {
    const state = (node as any).__openxrHALState as OpenXRHALState;
    if (state?.session) {
      context.emit?.('openxr_session_end', { node });
    }
    delete (node as any).__openxrHALState;
  },

  onUpdate(node, config, context, delta) {
    const state = (node as any).__openxrHALState as OpenXRHALState;
    if (!state || !state.isInitialized) return;

    state.lastFrameTime = delta;

    // Update performance level based on frame timing
    if (delta > 16.67) {
      state.performanceLevel = 'low';
    } else if (delta > 11.11) {
      state.performanceLevel = 'medium';
    } else if (delta > 8.33) {
      state.performanceLevel = 'high';
    } else {
      state.performanceLevel = 'max';
    }

    // Emit frame data for dependent traits
    context.emit?.('openxr_frame', {
      node,
      delta,
      deviceProfile: state.deviceProfile,
      performanceLevel: state.performanceLevel,
    });
  },

  onEvent(node, config, context, event) {
    const state = (node as any).__openxrHALState as OpenXRHALState;
    if (!state) return;

    if (event.type === 'xr_session_start') {
      detectDevice(state, config);
      state.isInitialized = true;
      context.emit?.('openxr_ready', {
        node,
        deviceProfile: state.deviceProfile,
        capabilities: getCapabilities(state),
      });
    }

    // Request to start XR session
    if (event.type === 'request_xr_session') {
      const mode = (event.payload?.mode as 'immersive-vr' | 'immersive-ar' | 'inline') || 'immersive-vr';
      requestXRSession(state, config, context, node, mode);
    }

    // End XR session
    if (event.type === 'end_xr_session') {
      if (state.session && (state.session as any).end) {
        (state.session as any).end();
      }
    }

    // Trigger haptic feedback
    if (event.type === 'trigger_haptic') {
      const hand = (event.payload?.hand as 'left' | 'right') || 'right';
      const intensity = (event.payload?.intensity as number) ?? 1.0;
      const duration = (event.payload?.duration as number) ?? 100;
      const success = triggerHaptic(state, hand, intensity, duration);
      context.emit?.('haptic_triggered', {
        node,
        hand,
        intensity,
        duration,
        success,
        simulated: (state.session as any)?.simulated === true,
      });
    }

    if (event.type === 'request_haptic_capability') {
      const capability = event.payload?.capability as HapticCapability;
      const supported = state.deviceProfile?.hapticCapabilities.includes(capability) ?? false;
      context.emit?.('haptic_capability_response', {
        node,
        capability,
        supported,
        fallback: config.simulate_haptics && config.fallback_mode === 'simulate',
      });
    }

    // Query device profile
    if (event.type === 'get_device_profile') {
      context.emit?.('device_profile_response', {
        node,
        deviceProfile: state.deviceProfile,
        isSimulated: (state.session as any)?.simulated === true,
      });
    }
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Request and start an XR session
 */
async function requestXRSession(
  state: OpenXRHALState,
  config: OpenXRHALConfig,
  context: any,
  node: any,
  mode: 'immersive-vr' | 'immersive-ar' | 'inline' = 'immersive-vr'
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('xr' in navigator)) {
    if (config.fallback_mode === 'simulate') {
      createSimulatedSession(state, config);
      return true;
    }
    return false;
  }

  try {
    const xr = (navigator as any).xr;
    const sessionInit: any = {
      optionalFeatures: [],
    };

    // Request optional features based on config
    if (config.enable_hand_tracking) {
      sessionInit.optionalFeatures.push('hand-tracking');
    }
    if (config.enable_passthrough && mode === 'immersive-ar') {
      sessionInit.optionalFeatures.push('dom-overlay');
    }

    const session = await xr.requestSession(mode, sessionInit);

    state.session = session;
    state.isInitialized = true;

    // Set frame rate if supported
    if (config.preferred_refresh_rate > 0 && session.updateTargetFrameRate) {
      try {
        await session.updateTargetFrameRate(config.preferred_refresh_rate);
        state.frameRate = config.preferred_refresh_rate;
      } catch {
        // Frame rate not supported at requested value
      }
    }

    // Setup session event handlers
    session.addEventListener('end', () => {
      state.session = null;
      state.isInitialized = false;
      context.emit?.('openxr_session_end', { node });
    });

    // Detect device from session
    detectDeviceFromSession(state, session, config);

    context.emit?.('openxr_session_start', {
      node,
      mode,
      deviceProfile: state.deviceProfile,
    });

    return true;
  } catch (error) {
    if (config.fallback_mode === 'simulate') {
      createSimulatedSession(state, config);
      context.emit?.('openxr_simulated', { node, reason: String(error) });
      return true;
    } else if (config.fallback_mode === 'error') {
      context.emit?.('openxr_error', { node, error: String(error) });
    }
    return false;
  }
}

/**
 * Detect device profile from active XR session
 */
function detectDeviceFromSession(
  state: OpenXRHALState,
  session: any,
  config: OpenXRHALConfig
): void {
  // Try to get input sources for device detection
  const inputSources = session.inputSources || [];

  // Check for common device patterns
  let detectedProfile: Partial<XRDeviceProfile> | null = null;

  for (const source of inputSources) {
    const profiles = source.profiles || [];

    for (const profileName of profiles) {
      // Match against known device strings
      const profileLower = profileName.toLowerCase();

      for (const [key, profile] of Object.entries(deviceProfiles)) {
        if (profileLower.includes(key.toLowerCase().split(' ')[0])) {
          detectedProfile = profile;
          break;
        }
      }
      if (detectedProfile) break;
    }
    if (detectedProfile) break;
  }

  // Build final profile
  state.deviceProfile = {
    type: detectedProfile?.type || 'generic_openxr',
    name: detectedProfile?.name || 'Generic OpenXR Device',
    manufacturer: detectedProfile?.manufacturer || 'Unknown',
    hapticCapabilities: detectedProfile?.hapticCapabilities || ['rumble'],
    trackingCapabilities: detectedProfile?.trackingCapabilities || ['controller'],
    renderCapabilities: detectedProfile?.renderCapabilities || [],
    refreshRates: detectedProfile?.refreshRates || [90],
    resolution: detectedProfile?.resolution || { width: 1920, height: 1080 },
    fov: detectedProfile?.fov || 90,
    controllers: {
      left: createSimulatedController(),
      right: createSimulatedController(),
    },
    ...config.device_overrides,
  };
}

/**
 * Trigger haptic feedback on controller
 */
function triggerHaptic(
  state: OpenXRHALState,
  hand: 'left' | 'right',
  intensity: number = 1.0,
  durationMs: number = 100
): boolean {
  if (!state.session || !state.isInitialized) return false;

  const session = state.session as any;
  const inputSources = session.inputSources || [];

  for (const source of inputSources) {
    if (source.handedness === hand && source.gamepad?.hapticActuators) {
      const actuators = source.gamepad.hapticActuators;
      if (actuators.length > 0) {
        // Standard Gamepad haptic API
        actuators[0].pulse?.(intensity, durationMs);
        return true;
      }
    }
  }

  return false;
}

function initializeOpenXR(
  node: any,
  state: OpenXRHALState,
  config: OpenXRHALConfig,
  context: any
): void {
  // Check for WebXR support
  if (typeof navigator !== 'undefined' && 'xr' in navigator) {
    (navigator as any).xr?.isSessionSupported('immersive-vr').then((supported: boolean) => {
      if (supported) {
        context.emit?.('openxr_available', { node, mode: 'immersive-vr' });
      } else if (config.fallback_mode === 'simulate') {
        createSimulatedSession(state, config);
        context.emit?.('openxr_simulated', { node });
      } else if (config.fallback_mode === 'error') {
        context.emit?.('openxr_error', { node, error: 'WebXR not supported' });
      }
    });
  } else if (config.fallback_mode === 'simulate') {
    createSimulatedSession(state, config);
    context.emit?.('openxr_simulated', { node });
  }
}

function createSimulatedSession(state: OpenXRHALState, config: OpenXRHALConfig): void {
  state.isInitialized = true;
  state.session = { simulated: true };
  state.deviceProfile = {
    type: 'generic_openxr',
    name: 'Simulated XR Device',
    manufacturer: 'HoloScript',
    hapticCapabilities: config.simulate_haptics ? ['rumble'] : ['none'],
    trackingCapabilities: ['controller'],
    renderCapabilities: [],
    refreshRates: [60, 90],
    resolution: { width: 1920, height: 1080 },
    fov: 90,
    controllers: {
      left: createSimulatedController(),
      right: createSimulatedController(),
    },
  };
  state.frameRate = 90;
}

function createSimulatedController(): ControllerProfile {
  return {
    hapticActuators: 1,
    hapticFrequencyRange: [0, 500],
    maxAmplitude: 1.0,
    supportsHDHaptics: false,
    buttonCount: 6,
    hasThumbstick: true,
    hasTouchpad: false,
    hasGripButton: true,
    hasTrigger: true,
  };
}

function detectDevice(state: OpenXRHALState, config: OpenXRHALConfig): void {
  // In real implementation, query navigator.xr.requestSession for device info
  // For now, use a simulation or device overrides
  if (config.device_overrides) {
    state.deviceProfile = {
      type: 'generic_openxr',
      name: 'Custom Device',
      manufacturer: 'Unknown',
      hapticCapabilities: ['rumble'],
      trackingCapabilities: ['controller'],
      renderCapabilities: [],
      refreshRates: [90],
      resolution: { width: 1920, height: 1080 },
      fov: 90,
      controllers: { left: null, right: null },
      ...config.device_overrides,
    };
  }
}

function getCapabilities(state: OpenXRHALState): Record<string, boolean> {
  const profile = state.deviceProfile;
  if (!profile) return {};

  return {
    hasRumble: profile.hapticCapabilities.includes('rumble'),
    hasHDHaptics: profile.hapticCapabilities.includes('hd_haptics'),
    hasForceFeedback: profile.hapticCapabilities.includes('force_feedback'),
    hasThermal: profile.hapticCapabilities.includes('thermal'),
    hasHandTracking: profile.trackingCapabilities.includes('hand'),
    hasEyeTracking: profile.trackingCapabilities.includes('eye'),
    hasBodyTracking: profile.trackingCapabilities.includes('body'),
    hasFaceTracking: profile.trackingCapabilities.includes('face'),
    hasPassthrough: profile.renderCapabilities.includes('passthrough'),
    hasDepthSensing: profile.renderCapabilities.includes('depth_sensing'),
    hasMeshDetection: profile.renderCapabilities.includes('mesh_detection'),
    hasPlaneDetection: profile.renderCapabilities.includes('plane_detection'),
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  OpenXRHALConfig,
  OpenXRHALState,
  XRDeviceProfile,
  HapticCapability,
  TrackingCapability,
  RenderCapability,
  ControllerProfile,
  XRDeviceType,
};

// Export device profiles for external use
export { deviceProfiles };

// Export utility functions
export { getCapabilities, createSimulatedController };
