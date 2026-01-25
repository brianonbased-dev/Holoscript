/**
 * @holoscript/accessibility - AccessibilityManager
 *
 * Unified controller for all accessibility features.
 * Manages haptics, screen reader, motor, and vision accommodations.
 */

import { HapticsController, createHapticsController } from './haptics';
import { ScreenReaderController, createScreenReaderController } from './screenreader';
import { MotorController, createMotorController } from './motor';
import { VisionController, createVisionController } from './vision';
import {
  AccessibilityPreferences,
  VisionMode,
  HapticPattern,
  SpatialRole,
  DEFAULT_PREFERENCES,
  AnnouncementPriority,
} from './types';

/**
 * Accessibility event types
 */
export type AccessibilityEventType =
  | 'focus'
  | 'blur'
  | 'announce'
  | 'haptic'
  | 'dwell-start'
  | 'dwell-complete'
  | 'voice-command'
  | 'config-change';

/**
 * Accessibility event
 */
export interface AccessibilityEvent {
  type: AccessibilityEventType;
  target?: string;
  data?: unknown;
  timestamp: number;
}

/**
 * Event listener
 */
export type AccessibilityEventListener = (event: AccessibilityEvent) => void;

/**
 * Unified Accessibility Manager
 */
export class AccessibilityManager {
  public readonly haptics: HapticsController;
  public readonly screenReader: ScreenReaderController;
  public readonly motor: MotorController;
  public readonly vision: VisionController;

  private preferences: AccessibilityPreferences;
  private listeners: Map<AccessibilityEventType, Set<AccessibilityEventListener>> = new Map();
  private isInitialized = false;

  constructor(preferences?: Partial<AccessibilityPreferences>) {
    this.preferences = { ...DEFAULT_PREFERENCES, ...preferences };

    // Initialize controllers
    this.haptics = createHapticsController({
      enabled: this.preferences.haptics.enabled,
      intensity: this.preferences.haptics.intensity,
    });

    this.screenReader = createScreenReaderController({
      enabled: this.preferences.screenReader.enabled,
      verbosity: this.preferences.screenReader.verbosity,
      rate: this.preferences.screenReader.rate,
      pitch: this.preferences.screenReader.pitch,
    });

    this.motor = createMotorController(this.preferences.motor);
    this.vision = createVisionController(this.preferences.vision);

    // Wire up internal events
    this.setupInternalEvents();
  }

  /**
   * Initialize accessibility features
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Apply vision filters
    if (this.preferences.vision.mode !== VisionMode.Normal) {
      this.vision.applyCSSFilter();
    }

    // Start voice recognition if enabled
    if (this.preferences.motor.voiceCommands) {
      await this.motor.startVoiceRecognition();
    }

    // Announce initialization
    if (this.preferences.screenReader.enabled) {
      this.screenReader.announce('Accessibility features initialized');
    }

    this.isInitialized = true;
  }

  /**
   * Shutdown accessibility features
   */
  public shutdown(): void {
    this.motor.stopVoiceRecognition();
    this.vision.removeCSSFilter();
    this.isInitialized = false;
  }

  /**
   * Set up internal event wiring
   */
  private setupInternalEvents(): void {
    // Dwell selection events
    this.motor.setDwellCallbacks(
      (targetId) => {
        this.emit({ type: 'dwell-complete', target: targetId, timestamp: Date.now() });
        if (this.preferences.haptics.enabled) {
          this.haptics.playPattern(HapticPattern.Tap);
        }
        if (this.preferences.screenReader.enabled) {
          this.screenReader.announce('Selected');
        }
      },
      (targetId, progress) => {
        if (progress > 0.5 && this.preferences.haptics.enabled) {
          // Subtle haptic feedback at 50%
          this.haptics.vibrate('left', 0.3, 50);
          this.haptics.vibrate('right', 0.3, 50);
        }
      }
    );
  }

  /**
   * Register an object for accessibility
   */
  public registerObject(
    id: string,
    options: {
      role?: SpatialRole;
      label: string;
      description?: string;
      position?: { x: number; y: number; z: number };
      targetSize?: number;
    }
  ): void {
    // Register with screen reader
    this.screenReader.registerObject({
      id,
      role: options.role || SpatialRole.Static,
      label: options.label,
      description: options.description,
    });

    // Apply motor accommodations to target size
    if (options.targetSize !== undefined) {
      const effectiveSize = this.motor.getEffectiveTargetSize(options.targetSize);
      // Would normally update the object's hitbox here
      console.log(`[A11y] Object ${id} effective target size: ${effectiveSize}`);
    }
  }

  /**
   * Unregister an object
   */
  public unregisterObject(id: string): void {
    this.screenReader.unregisterObject(id);
  }

  /**
   * Handle object focus
   */
  public focusObject(id: string): void {
    this.screenReader.setFocus(id);
    this.emit({ type: 'focus', target: id, timestamp: Date.now() });

    // Start dwell if enabled
    if (this.preferences.motor.dwellSelect) {
      this.motor.startDwell(id);
    }
  }

  /**
   * Handle object blur
   */
  public blurObject(id: string): void {
    this.motor.cancelDwell(id);
    this.emit({ type: 'blur', target: id, timestamp: Date.now() });
  }

  /**
   * Announce a message
   */
  public announce(
    message: string,
    options?: { priority?: 'polite' | 'assertive'; haptic?: HapticPattern }
  ): void {
    const announcePriority = options?.priority === 'assertive' 
      ? AnnouncementPriority.Assertive 
      : AnnouncementPriority.Polite;
    this.screenReader.announce(message, announcePriority);
    this.emit({ type: 'announce', data: message, timestamp: Date.now() });

    if (options?.haptic && this.preferences.haptics.enabled) {
      this.haptics.playPattern(options.haptic);
    }
  }

  /**
   * Play haptic feedback
   */
  public haptic(pattern: HapticPattern): void {
    if (this.preferences.haptics.enabled) {
      this.haptics.playPattern(pattern);
      this.emit({ type: 'haptic', data: pattern, timestamp: Date.now() });
    }
  }

  /**
   * Process input with motor accommodations
   */
  public processInput(position: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const filtered = this.motor.filterTremor(position);
    return filtered.position;
  }

  /**
   * Update preferences
   */
  public setPreferences(preferences: Partial<AccessibilityPreferences>): void {
    // Merge preferences
    if (preferences.haptics) {
      this.preferences.haptics = { ...this.preferences.haptics, ...preferences.haptics };
    }
    if (preferences.screenReader) {
      this.preferences.screenReader = { ...this.preferences.screenReader, ...preferences.screenReader };
    }
    if (preferences.motor) {
      this.preferences.motor = { ...this.preferences.motor, ...preferences.motor };
      this.motor.setConfig(this.preferences.motor);
    }
    if (preferences.vision) {
      this.preferences.vision = { ...this.preferences.vision, ...preferences.vision };
      this.vision.setConfig(this.preferences.vision);
      if (this.isInitialized) {
        this.vision.applyCSSFilter();
      }
    }

    this.emit({ type: 'config-change', data: this.preferences, timestamp: Date.now() });
  }

  /**
   * Get current preferences
   */
  public getPreferences(): AccessibilityPreferences {
    return JSON.parse(JSON.stringify(this.preferences));
  }

  /**
   * Add event listener
   */
  public addEventListener(type: AccessibilityEventType, listener: AccessibilityEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(type: AccessibilityEventType, listener: AccessibilityEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  /**
   * Emit event
   */
  private emit(event: AccessibilityEvent): void {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
  }

  /**
   * Register common voice commands
   */
  public registerCommonVoiceCommands(actions: {
    select?: () => void;
    back?: () => void;
    menu?: () => void;
    help?: () => void;
    teleport?: () => void;
  }): void {
    if (actions.select) {
      this.motor.registerVoiceCommand({
        phrase: 'select',
        aliases: ['click', 'activate', 'press'],
        action: actions.select,
        description: 'Select the focused object',
      });
    }

    if (actions.back) {
      this.motor.registerVoiceCommand({
        phrase: 'back',
        aliases: ['go back', 'return'],
        action: actions.back,
        description: 'Go back to previous screen',
      });
    }

    if (actions.menu) {
      this.motor.registerVoiceCommand({
        phrase: 'menu',
        aliases: ['open menu', 'pause'],
        action: actions.menu,
        description: 'Open the menu',
      });
    }

    if (actions.help) {
      this.motor.registerVoiceCommand({
        phrase: 'help',
        aliases: ['what can i say', 'commands'],
        action: actions.help,
        description: 'List available voice commands',
      });
    }

    if (actions.teleport) {
      this.motor.registerVoiceCommand({
        phrase: 'teleport',
        aliases: ['go to', 'move to'],
        action: actions.teleport,
        description: 'Teleport to location',
      });
    }
  }

  /**
   * Check if animations should be reduced
   */
  public shouldReduceMotion(): boolean {
    return this.vision.shouldReduceMotion();
  }

  /**
   * Get accessible color for current vision mode
   */
  public getAccessibleColor(color: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
    return this.vision.daltonize(color);
  }

  /**
   * Check if colors are distinguishable
   */
  public areColorsDistinguishable(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number }
  ): boolean {
    return this.vision.areColorsDistinguishable(color1, color2);
  }
}

/**
 * Factory function
 */
export function createAccessibilityManager(
  preferences?: Partial<AccessibilityPreferences>
): AccessibilityManager {
  return new AccessibilityManager(preferences);
}

// Re-export everything for convenience
export * from './types';
export * from './haptics';
export * from './screenreader';
export * from './motor';
export * from './vision';
