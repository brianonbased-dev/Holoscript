/**
 * @holoscript/haptics
 * Haptic feedback system for VR controllers, gloves, and wearables
 */

// Types
export * from './types';

// Pattern system
export {
  WaveformGenerator,
  HapticPatternBuilder,
  FingerHapticPatternBuilder,
  HapticEffectPlayer,
  createPatternBuilder,
  createFingerPatternBuilder,
  createEffectPlayer,
} from './patterns';

// Device management
export {
  HapticDeviceAdapter,
  WebXRControllerAdapter,
  GamepadAdapter,
  HapticManager,
  createHapticManager,
} from './devices';
