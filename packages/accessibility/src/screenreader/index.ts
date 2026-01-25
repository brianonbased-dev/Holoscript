/**
 * @holoscript/accessibility - Screen Reader Module
 *
 * Provides screen reader support for XR:
 * - ARIA-like roles for 3D objects
 * - Spatial descriptions
 * - Live regions for dynamic content
 * - Navigation announcements
 */

import {
  ScreenReaderConfig,
  AnnouncementPriority,
  SpatialRole,
  SpatialAccessibilityInfo,
} from '../types';

/**
 * Announcement queue item
 */
interface AnnouncementItem {
  text: string;
  priority: AnnouncementPriority;
  timestamp: number;
}

/**
 * Spatial description for an object's position
 */
export interface SpatialDescription {
  /** Object position relative to user */
  direction: 'ahead' | 'behind' | 'left' | 'right' | 'above' | 'below';
  /** Approximate distance */
  distance: 'near' | 'medium' | 'far';
  /** Clock position (1-12) for horizontal direction */
  clockPosition?: number;
  /** Height description */
  height?: 'floor-level' | 'eye-level' | 'overhead';
}

/**
 * Focus history entry
 */
interface FocusHistoryEntry {
  objectId: string;
  timestamp: number;
}

/**
 * Screen reader controller for XR
 */
export class ScreenReaderController {
  private config: ScreenReaderConfig;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private announcementQueue: AnnouncementItem[] = [];
  private objectRegistry: Map<string, SpatialAccessibilityInfo> = new Map();
  private focusedObjectId: string | null = null;
  private focusHistory: FocusHistoryEntry[] = [];
  private isProcessingQueue = false;

  constructor(config?: Partial<ScreenReaderConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      verbosity: config?.verbosity ?? 'normal',
      spatialDescriptions: config?.spatialDescriptions ?? true,
      announceInteractions: config?.announceInteractions ?? true,
      announceNavigation: config?.announceNavigation ?? true,
      speechRate: config?.speechRate ?? config?.rate ?? 1.0,
      rate: config?.rate ?? config?.speechRate ?? 1.0,
      pitch: config?.pitch ?? 1.0,
      language: config?.language ?? 'en-US',
    };

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * Register an object for screen reader access
   */
  public registerObject(info: SpatialAccessibilityInfo): void {
    this.objectRegistry.set(info.id, info);
  }

  /**
   * Unregister an object
   */
  public unregisterObject(id: string): void {
    this.objectRegistry.delete(id);
    if (this.focusedObjectId === id) {
      this.focusedObjectId = null;
    }
  }

  /**
   * Update object accessibility info
   */
  public updateObject(id: string, updates: Partial<SpatialAccessibilityInfo>): void {
    const existing = this.objectRegistry.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.objectRegistry.set(id, updated);

      // Announce changes for live regions
      if (updated.live && updated.live !== 'off') {
        const priority =
          updated.live === 'assertive'
            ? AnnouncementPriority.Assertive
            : AnnouncementPriority.Polite;
        this.announce(this.buildLiveRegionText(updated), priority);
      }
    }
  }

  /**
   * Set focus to an object
   */
  public setFocus(objectId: string): void {
    const obj = this.objectRegistry.get(objectId);
    if (!obj || obj.role === SpatialRole.Decorative) return;

    // Update focus state
    if (this.focusedObjectId) {
      const prev = this.objectRegistry.get(this.focusedObjectId);
      if (prev) {
        this.objectRegistry.set(this.focusedObjectId, { ...prev, focused: false });
      }
    }

    this.focusedObjectId = objectId;
    this.objectRegistry.set(objectId, { ...obj, focused: true });

    // Add to history
    this.focusHistory.push({ objectId, timestamp: Date.now() });
    if (this.focusHistory.length > 50) {
      this.focusHistory.shift();
    }

    // Announce
    if (this.config.enabled) {
      const description = this.buildObjectDescription(obj);
      this.announce(description, AnnouncementPriority.Polite);
    }
  }

  /**
   * Announce text to screen reader
   */
  public announce(text: string, priority: AnnouncementPriority = AnnouncementPriority.Polite): void {
    if (!this.config.enabled || !text) return;

    const item: AnnouncementItem = {
      text,
      priority,
      timestamp: Date.now(),
    };

    // Handle priority
    if (priority === AnnouncementPriority.Alert) {
      // Interrupt everything
      this.clearQueue();
      this.stop();
      this.announcementQueue.unshift(item);
    } else if (priority === AnnouncementPriority.Assertive) {
      // Interrupt current, add to front
      this.stop();
      this.announcementQueue.unshift(item);
    } else {
      // Polite - add to end
      this.announcementQueue.push(item);
    }

    this.processQueue();
  }

  /**
   * Announce with spatial description
   */
  public announceSpatial(
    text: string,
    spatial: SpatialDescription,
    priority: AnnouncementPriority = AnnouncementPriority.Polite
  ): void {
    if (!this.config.spatialDescriptions) {
      this.announce(text, priority);
      return;
    }

    const spatialText = this.buildSpatialText(spatial);
    this.announce(`${text}. ${spatialText}`, priority);
  }

  /**
   * Build description for an object
   */
  private buildObjectDescription(obj: SpatialAccessibilityInfo): string {
    const parts: string[] = [];

    // Role
    if (obj.role !== SpatialRole.Interactive) {
      parts.push(this.roleToText(obj.role));
    }

    // Label
    parts.push(obj.label);

    // Value
    if (obj.value !== undefined) {
      parts.push(obj.valueText || String(obj.value));
    }

    // State
    if (obj.disabled) parts.push('disabled');
    if (obj.selected) parts.push('selected');
    if (obj.expanded !== undefined) {
      parts.push(obj.expanded ? 'expanded' : 'collapsed');
    }

    // Verbose mode - add description
    if (this.config.verbosity === 'verbose' && obj.description) {
      parts.push(obj.description);
    }

    // Keyboard shortcut
    if (this.config.verbosity !== 'minimal' && obj.keyboardShortcut) {
      parts.push(`Press ${obj.keyboardShortcut}`);
    }

    return parts.join(', ');
  }

  /**
   * Build live region announcement text
   */
  private buildLiveRegionText(obj: SpatialAccessibilityInfo): string {
    if (obj.role === SpatialRole.Status) {
      return `Status: ${obj.label}${obj.value ? `, ${obj.value}` : ''}`;
    }
    if (obj.role === SpatialRole.Progress) {
      return `${obj.label}: ${obj.valueText || obj.value || 0}%`;
    }
    return `${obj.label} updated`;
  }

  /**
   * Convert role to spoken text
   */
  private roleToText(role: SpatialRole): string {
    const roleMap: Record<SpatialRole, string> = {
      [SpatialRole.Interactive]: '',
      [SpatialRole.Static]: '',
      [SpatialRole.Button]: 'button',
      [SpatialRole.Slider]: 'slider',
      [SpatialRole.Toggle]: 'toggle',
      [SpatialRole.Input]: 'text input',
      [SpatialRole.Menu]: 'menu',
      [SpatialRole.MenuItem]: 'menu item',
      [SpatialRole.Dialog]: 'dialog',
      [SpatialRole.Navigation]: 'navigation',
      [SpatialRole.Main]: 'main content',
      [SpatialRole.Decorative]: '',
      [SpatialRole.Live]: 'live region',
      [SpatialRole.Status]: 'status',
      [SpatialRole.Progress]: 'progress',
      [SpatialRole.Tooltip]: 'tooltip',
      [SpatialRole.Image]: 'image',
      [SpatialRole.Model]: '3D model',
      [SpatialRole.Grabbable]: 'grabbable object',
      [SpatialRole.Teleport]: 'teleport destination',
    };
    return roleMap[role] || '';
  }

  /**
   * Build spatial description text
   */
  private buildSpatialText(spatial: SpatialDescription): string {
    const parts: string[] = [];

    // Distance
    const distanceText = {
      near: 'nearby',
      medium: 'at medium distance',
      far: 'far away',
    }[spatial.distance];

    // Direction with clock position
    if (spatial.clockPosition) {
      parts.push(`at ${spatial.clockPosition} o'clock`);
    } else {
      parts.push(spatial.direction);
    }

    parts.push(distanceText);

    // Height
    if (spatial.height) {
      parts.push(spatial.height.replace('-', ' '));
    }

    return parts.join(', ');
  }

  /**
   * Process the announcement queue
   */
  private processQueue(): void {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) return;
    if (!this.speechSynthesis) return;

    this.isProcessingQueue = true;
    const item = this.announcementQueue.shift()!;

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.rate = this.config.speechRate;
    utterance.lang = this.config.language;

    utterance.onend = () => {
      this.currentUtterance = null;
      this.isProcessingQueue = false;
      this.processQueue();
    };

    utterance.onerror = () => {
      this.currentUtterance = null;
      this.isProcessingQueue = false;
      this.processQueue();
    };

    this.currentUtterance = utterance;
    this.speechSynthesis.speak(utterance);
  }

  /**
   * Stop current speech
   */
  public stop(): void {
    if (this.speechSynthesis) {
      this.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.isProcessingQueue = false;
  }

  /**
   * Clear announcement queue
   */
  public clearQueue(): void {
    this.announcementQueue = [];
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<ScreenReaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): ScreenReaderConfig {
    return { ...this.config };
  }

  /**
   * Get all registered objects
   */
  public getObjects(): SpatialAccessibilityInfo[] {
    return Array.from(this.objectRegistry.values());
  }

  /**
   * Get currently focused object
   */
  public getFocusedObject(): SpatialAccessibilityInfo | null {
    if (!this.focusedObjectId) return null;
    return this.objectRegistry.get(this.focusedObjectId) || null;
  }

  /**
   * Navigate focus by role
   */
  public navigateByRole(role: SpatialRole, direction: 'next' | 'previous' = 'next'): void {
    const objects = this.getObjects().filter((o) => o.role === role && !o.disabled);
    if (objects.length === 0) return;

    const currentIndex = this.focusedObjectId
      ? objects.findIndex((o) => o.id === this.focusedObjectId)
      : -1;

    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = currentIndex + 1 >= objects.length ? 0 : currentIndex + 1;
    } else {
      nextIndex = currentIndex - 1 < 0 ? objects.length - 1 : currentIndex - 1;
    }

    this.setFocus(objects[nextIndex].id);
  }
}

/**
 * Factory function
 */
export function createScreenReaderController(
  config?: Partial<ScreenReaderConfig>
): ScreenReaderController {
  return new ScreenReaderController(config);
}

// Re-export types
export type { ScreenReaderConfig, AnnouncementPriority, SpatialRole, SpatialAccessibilityInfo };
