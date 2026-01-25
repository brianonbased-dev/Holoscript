/**
 * @holoscript/accessibility - Core Types
 *
 * W3C XR Accessibility compliant type definitions
 */

/**
 * Vision accommodation modes for color vision deficiencies
 */
export enum VisionMode {
  /** Normal vision */
  Normal = 'normal',
  /** Red-green color blindness (most common) */
  Deuteranopia = 'deuteranopia',
  /** Red color blindness */
  Protanopia = 'protanopia',
  /** Blue-yellow color blindness */
  Tritanopia = 'tritanopia',
  /** Complete color blindness */
  Achromatopsia = 'achromatopsia',
  /** High contrast mode */
  HighContrast = 'high-contrast',
  /** Reduced motion (for vestibular disorders) */
  ReducedMotion = 'reduced-motion',
  /** Large text mode */
  LargeText = 'large-text',
}

/**
 * Haptic feedback intensity levels
 */
export enum HapticIntensity {
  Off = 0,
  Low = 0.25,
  Medium = 0.5,
  High = 0.75,
  Max = 1.0,
}

/**
 * Haptic pattern types
 */
export enum HapticPattern {
  /** Single short pulse */
  Tap = 'tap',
  /** Double tap */
  DoubleTap = 'double-tap',
  /** Long sustained vibration */
  Long = 'long',
  /** Pulsing pattern */
  Pulse = 'pulse',
  /** Increasing intensity */
  Ramp = 'ramp',
  /** Heartbeat rhythm */
  Heartbeat = 'heartbeat',
  /** Success confirmation */
  Success = 'success',
  /** Error/warning */
  Error = 'error',
  /** Navigation feedback */
  Navigation = 'navigation',
  /** Texture simulation */
  Texture = 'texture',
}

/**
 * Haptic profile configuration
 */
export interface HapticsProfile {
  /** Whether haptics are enabled */
  enabled: boolean;
  /** Global intensity multiplier */
  intensity: HapticIntensity;
  /** Enable audio-to-haptics conversion */
  audioToHaptics: boolean;
  /** Enable spatial haptics */
  spatialHaptics: boolean;
  /** Controller-specific settings */
  controllers: {
    left: ControllerHapticConfig;
    right: ControllerHapticConfig;
  };
}

/**
 * Controller-specific haptic configuration
 */
export interface ControllerHapticConfig {
  enabled: boolean;
  intensityMultiplier: number;
  /** Preferred actuator if multiple available */
  preferredActuator?: string;
}

/**
 * Screen reader announcement priority
 */
export enum AnnouncementPriority {
  /** Polite - wait for current speech */
  Polite = 'polite',
  /** Assertive - interrupt current speech */
  Assertive = 'assertive',
  /** Alert - high priority interruption */
  Alert = 'alert',
}

/**
 * Screen reader configuration
 */
export interface ScreenReaderConfig {
  /** Enable screen reader support */
  enabled: boolean;
  /** Announcement verbosity level */
  verbosity: 'minimal' | 'normal' | 'verbose';
  /** Enable spatial audio descriptions */
  spatialDescriptions: boolean;
  /** Announce object interactions */
  announceInteractions: boolean;
  /** Announce navigation changes */
  announceNavigation: boolean;
  /** Speech rate multiplier */
  speechRate: number;
  /** Speech rate (alias for speechRate) */
  rate: number;
  /** Speech pitch (0.0 - 2.0) */
  pitch: number;
  /** Preferred language */
  language: string;
}

/**
 * Motor accommodation settings
 */
export interface MotorConfig {
  /** One-handed mode */
  oneHandedMode: 'off' | 'left' | 'right';
  /** Dwell/gaze selection instead of click */
  dwellSelect: boolean;
  /** Dwell time in milliseconds */
  dwellTime: number;
  /** Reduced precision mode (larger targets) */
  reducedPrecision: boolean;
  /** Target size multiplier */
  targetSizeMultiplier: number;
  /** Sticky drag (don't require hold) */
  stickyDrag: boolean;
  /** Auto-complete gestures */
  gestureAssist: boolean;
  /** Voice command fallback */
  voiceCommands: boolean;
  /** Adjustable reach/movement speed */
  movementSpeed: number;
  /** Tremor filtering */
  tremorFilter: boolean;
  /** Tremor filter strength */
  tremorFilterStrength: number;
}

/**
 * Vision accommodation settings
 */
export interface VisionConfig {
  /** Active vision mode */
  mode: VisionMode;
  /** Contrast adjustment (1.0 = normal) */
  contrast: number;
  /** Brightness adjustment (1.0 = normal) */
  brightness: number;
  /** Saturation adjustment (1.0 = normal) */
  saturation: number;
  /** Font size multiplier */
  fontSize: number;
  /** High visibility pointer */
  highVisibilityPointer: boolean;
  /** Reduce motion for vestibular disorders */
  reduceMotion: boolean;
  /** Reduce transparency */
  reduceTransparency: boolean;
}

/**
 * Semantic role for spatial objects (ARIA-like for XR)
 */
export enum SpatialRole {
  /** Generic interactive element */
  Interactive = 'interactive',
  /** Non-interactive static element */
  Static = 'static',
  /** Button */
  Button = 'button',
  /** Slider/range */
  Slider = 'slider',
  /** Toggle/checkbox */
  Toggle = 'toggle',
  /** Text input */
  Input = 'input',
  /** Menu container */
  Menu = 'menu',
  /** Menu item */
  MenuItem = 'menuitem',
  /** Dialog/modal */
  Dialog = 'dialog',
  /** Navigation landmark */
  Navigation = 'navigation',
  /** Main content area */
  Main = 'main',
  /** Decorative (skip for screen readers) */
  Decorative = 'decorative',
  /** Live region (announces changes) */
  Live = 'live',
  /** Status message */
  Status = 'status',
  /** Progress indicator */
  Progress = 'progress',
  /** Tooltip */
  Tooltip = 'tooltip',
  /** Image/media */
  Image = 'image',
  /** 3D model */
  Model = 'model',
  /** Grabbable object */
  Grabbable = 'grabbable',
  /** Teleport target */
  Teleport = 'teleport',
}

/**
 * Spatial object accessibility metadata
 */
export interface SpatialAccessibilityInfo {
  /** Object ID */
  id: string;
  /** Semantic role */
  role: SpatialRole;
  /** Human-readable label */
  label: string;
  /** Extended description */
  description?: string;
  /** Current value (for sliders, etc.) */
  value?: string | number;
  /** Value text override */
  valueText?: string;
  /** Is currently focused */
  focused?: boolean;
  /** Is selected */
  selected?: boolean;
  /** Is disabled */
  disabled?: boolean;
  /** Is expanded (for menus) */
  expanded?: boolean;
  /** Has popup */
  hasPopup?: boolean;
  /** Live region settings */
  live?: 'off' | 'polite' | 'assertive';
  /** Keyboard shortcut */
  keyboardShortcut?: string;
  /** Related objects (labelledby, describedby) */
  relationships?: {
    labelledBy?: string[];
    describedBy?: string[];
    controls?: string[];
    owns?: string[];
  };
}

/**
 * Focus ring style configuration
 */
export interface FocusRingStyle {
  /** Ring color */
  color: string;
  /** Ring width */
  width: number;
  /** Ring offset from object */
  offset: number;
  /** Animation style */
  animation: 'none' | 'pulse' | 'glow' | 'outline';
  /** Visibility duration (0 = always visible) */
  duration: number;
}

/**
 * Accessibility event types
 */
export type AccessibilityEventType =
  | 'focus'
  | 'blur'
  | 'select'
  | 'activate'
  | 'deactivate'
  | 'announce'
  | 'mode-change'
  | 'preference-change';

/**
 * Accessibility event payload
 */
export interface AccessibilityEvent {
  type: AccessibilityEventType;
  target?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Accessibility preferences (persisted)
 */
export interface AccessibilityPreferences {
  vision: VisionConfig;
  haptics: HapticsProfile;
  screenReader: ScreenReaderConfig;
  motor: MotorConfig;
  focusRing: FocusRingStyle;
  /** Custom key bindings */
  keyBindings: Record<string, string>;
  /** Reduced transparency */
  reduceTransparency: boolean;
  /** Increased contrast ratio */
  contrastRatio: number;
}

/**
 * Default accessibility preferences
 */
export const DEFAULT_PREFERENCES: AccessibilityPreferences = {
  vision: {
    mode: VisionMode.Normal,
    contrast: 1.0,
    brightness: 1.0,
    saturation: 1.0,
    fontSize: 1.0,
    highVisibilityPointer: false,
    reduceMotion: false,
    reduceTransparency: false,
  },
  haptics: {
    enabled: true,
    intensity: HapticIntensity.Medium,
    audioToHaptics: false,
    spatialHaptics: true,
    controllers: {
      left: { enabled: true, intensityMultiplier: 1.0 },
      right: { enabled: true, intensityMultiplier: 1.0 },
    },
  },
  screenReader: {
    enabled: false,
    verbosity: 'normal',
    spatialDescriptions: true,
    announceInteractions: true,
    announceNavigation: true,
    speechRate: 1.0,
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
  },
  motor: {
    oneHandedMode: 'off',
    dwellSelect: false,
    dwellTime: 1000,
    reducedPrecision: false,
    targetSizeMultiplier: 1.0,
    stickyDrag: false,
    gestureAssist: false,
    voiceCommands: false,
    movementSpeed: 1.0,
    tremorFilter: false,
    tremorFilterStrength: 0.5,
  },
  focusRing: {
    color: '#00d4ff',
    width: 3,
    offset: 0.02,
    animation: 'pulse',
    duration: 0,
  },
  keyBindings: {},
  reduceTransparency: false,
  contrastRatio: 4.5,
};
