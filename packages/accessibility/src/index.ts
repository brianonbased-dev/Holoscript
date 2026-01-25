/**
 * @holoscript/accessibility
 *
 * W3C XR Accessibility Guidelines compliant utilities for HoloScript.
 * Provides haptics, screen reader support, motor accommodations, and vision modes.
 *
 * @module @holoscript/accessibility
 * @see https://www.w3.org/TR/xr-accessibility/
 *
 * @example
 * ```typescript
 * import { AccessibilityManager, HapticsProfile, VisionMode } from '@holoscript/accessibility';
 *
 * const a11y = new AccessibilityManager();
 *
 * // Enable colorblind mode
 * a11y.setVisionMode(VisionMode.Deuteranopia);
 *
 * // Configure haptics for deaf users
 * a11y.enableAudioToHaptics();
 *
 * // Enable screen reader announcements
 * a11y.announceToScreenReader('Welcome to the VR experience');
 * ```
 */

// Core types
export * from './types';

// Haptics module
export * from './haptics';

// Screen reader module
export * from './screenreader';

// Motor accommodations module
export * from './motor';

// Vision accommodations module
export * from './vision';

// Main manager
export { AccessibilityManager, createAccessibilityManager } from './AccessibilityManager';
export type { AccessibilityEvent, AccessibilityEventType, AccessibilityEventListener } from './AccessibilityManager';
