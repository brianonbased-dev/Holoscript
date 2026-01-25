/**
 * @holoscript/accessibility - Motor Accommodations Module
 *
 * Provides motor accessibility features:
 * - One-handed mode
 * - Dwell/gaze selection
 * - Reduced precision mode
 * - Tremor filtering
 * - Voice commands
 * - Gesture assistance
 */

import { MotorConfig } from '../types';

// Web Speech API type declarations
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

/**
 * Input event with motor filtering applied
 */
export interface FilteredInput {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  originalPosition: { x: number; y: number; z: number };
  originalRotation: { x: number; y: number; z: number; w: number };
  filtered: boolean;
}

/**
 * Dwell target
 */
export interface DwellTarget {
  id: string;
  startTime: number;
  progress: number;
  completed: boolean;
}

/**
 * Voice command definition
 */
export interface VoiceCommand {
  phrase: string;
  aliases?: string[];
  action: () => void;
  description?: string;
}

/**
 * Gesture assist state
 */
export interface GestureAssistState {
  gestureType: string;
  progress: number;
  suggestedCompletion?: { x: number; y: number; z: number };
}

/**
 * Motor accommodations controller
 */
export class MotorController {
  private config: MotorConfig;
  private tremorHistory: Array<{ x: number; y: number; z: number; time: number }> = [];
  private dwellTargets: Map<string, DwellTarget> = new Map();
  private voiceCommands: Map<string, VoiceCommand> = new Map();
  private recognition: SpeechRecognition | null = null;
  private isVoiceActive = false;
  private onDwellComplete?: (targetId: string) => void;
  private onDwellProgress?: (targetId: string, progress: number) => void;

  constructor(config?: Partial<MotorConfig>) {
    this.config = {
      oneHandedMode: config?.oneHandedMode ?? 'off',
      dwellSelect: config?.dwellSelect ?? false,
      dwellTime: config?.dwellTime ?? 1000,
      reducedPrecision: config?.reducedPrecision ?? false,
      targetSizeMultiplier: config?.targetSizeMultiplier ?? 1.0,
      stickyDrag: config?.stickyDrag ?? false,
      gestureAssist: config?.gestureAssist ?? false,
      voiceCommands: config?.voiceCommands ?? false,
      movementSpeed: config?.movementSpeed ?? 1.0,
      tremorFilter: config?.tremorFilter ?? false,
      tremorFilterStrength: config?.tremorFilterStrength ?? 0.5,
    };
  }

  /**
   * Apply tremor filtering to input
   */
  public filterTremor(input: { x: number; y: number; z: number }): FilteredInput {
    const now = Date.now();

    // Add to history
    this.tremorHistory.push({ ...input, time: now });

    // Keep only recent samples (50ms window)
    const windowMs = 50;
    this.tremorHistory = this.tremorHistory.filter((p) => now - p.time < windowMs);

    if (!this.config.tremorFilter || this.tremorHistory.length < 2) {
      return {
        position: { ...input },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        originalPosition: { ...input },
        originalRotation: { x: 0, y: 0, z: 0, w: 1 },
        filtered: false,
      };
    }

    // Weighted moving average (more recent = higher weight)
    let totalWeight = 0;
    const avg = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < this.tremorHistory.length; i++) {
      const weight = (i + 1) * this.config.tremorFilterStrength;
      avg.x += this.tremorHistory[i].x * weight;
      avg.y += this.tremorHistory[i].y * weight;
      avg.z += this.tremorHistory[i].z * weight;
      totalWeight += weight;
    }

    avg.x /= totalWeight;
    avg.y /= totalWeight;
    avg.z /= totalWeight;

    return {
      position: avg,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      originalPosition: { ...input },
      originalRotation: { x: 0, y: 0, z: 0, w: 1 },
      filtered: true,
    };
  }

  /**
   * Get effective target size with multiplier
   */
  public getEffectiveTargetSize(originalSize: number): number {
    if (!this.config.reducedPrecision) return originalSize;
    return originalSize * this.config.targetSizeMultiplier;
  }

  /**
   * Start dwell on a target
   */
  public startDwell(targetId: string): void {
    if (!this.config.dwellSelect) return;
    if (this.dwellTargets.has(targetId)) return;

    this.dwellTargets.set(targetId, {
      id: targetId,
      startTime: Date.now(),
      progress: 0,
      completed: false,
    });
  }

  /**
   * Update dwell progress (call each frame)
   */
  public updateDwell(targetId: string): DwellTarget | null {
    if (!this.config.dwellSelect) return null;

    const target = this.dwellTargets.get(targetId);
    if (!target || target.completed) return target || null;

    const elapsed = Date.now() - target.startTime;
    target.progress = Math.min(elapsed / this.config.dwellTime, 1);

    if (this.onDwellProgress) {
      this.onDwellProgress(targetId, target.progress);
    }

    if (target.progress >= 1 && !target.completed) {
      target.completed = true;
      if (this.onDwellComplete) {
        this.onDwellComplete(targetId);
      }
    }

    return target;
  }

  /**
   * Cancel dwell on a target
   */
  public cancelDwell(targetId: string): void {
    this.dwellTargets.delete(targetId);
  }

  /**
   * Set dwell callbacks
   */
  public setDwellCallbacks(
    onComplete?: (targetId: string) => void,
    onProgress?: (targetId: string, progress: number) => void
  ): void {
    this.onDwellComplete = onComplete;
    this.onDwellProgress = onProgress;
  }

  /**
   * Register a voice command
   */
  public registerVoiceCommand(command: VoiceCommand): void {
    this.voiceCommands.set(command.phrase.toLowerCase(), command);
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.voiceCommands.set(alias.toLowerCase(), command);
      }
    }
  }

  /**
   * Unregister a voice command
   */
  public unregisterVoiceCommand(phrase: string): void {
    this.voiceCommands.delete(phrase.toLowerCase());
  }

  /**
   * Start voice recognition
   */
  public async startVoiceRecognition(): Promise<void> {
    if (!this.config.voiceCommands) return;
    if (this.isVoiceActive) return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('[Motor] Speech recognition not supported');
      return;
    }

    const recognition: SpeechRecognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();

      const command = this.voiceCommands.get(transcript);
      if (command) {
        console.log(`[Motor] Voice command recognized: ${transcript}`);
        command.action();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[Motor] Speech recognition error:', event.error);
    };

    recognition.start();
    this.recognition = recognition;
    this.isVoiceActive = true;
  }

  /**
   * Stop voice recognition
   */
  public stopVoiceRecognition(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
    this.isVoiceActive = false;
  }

  /**
   * Map one-handed controls
   */
  public mapOneHandedInput(
    input: { hand: 'left' | 'right'; button: string },
    targetHand?: 'left' | 'right'
  ): { hand: 'left' | 'right'; button: string } | null {
    if (this.config.oneHandedMode === 'off') return input;

    const activeHand = this.config.oneHandedMode;

    // If input is from the disabled hand, ignore it
    if (input.hand !== activeHand) return null;

    // Map buttons for one-handed use
    // This would remap controls so all actions are accessible from one controller
    return {
      hand: targetHand || activeHand,
      button: input.button,
    };
  }

  /**
   * Check if sticky drag is active
   */
  public isStickyDragEnabled(): boolean {
    return this.config.stickyDrag;
  }

  /**
   * Get movement speed multiplier
   */
  public getMovementSpeed(): number {
    return this.config.movementSpeed;
  }

  /**
   * Assist with gesture completion
   */
  public assistGesture(
    currentPosition: { x: number; y: number; z: number },
    gestureType: string,
    targetPosition?: { x: number; y: number; z: number }
  ): GestureAssistState | null {
    if (!this.config.gestureAssist) return null;

    // Calculate gesture progress
    if (!targetPosition) return null;

    const dx = targetPosition.x - currentPosition.x;
    const dy = targetPosition.y - currentPosition.y;
    const dz = targetPosition.z - currentPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // If close enough, suggest completion
    const threshold = 0.1; // 10cm
    if (distance < threshold) {
      return {
        gestureType,
        progress: 1,
        suggestedCompletion: targetPosition,
      };
    }

    return {
      gestureType,
      progress: Math.max(0, 1 - distance),
      suggestedCompletion: targetPosition,
    };
  }

  /**
   * Update configuration
   */
  public setConfig(config: Partial<MotorConfig>): void {
    const wasVoiceEnabled = this.config.voiceCommands;
    this.config = { ...this.config, ...config };

    // Handle voice toggle
    if (config.voiceCommands !== undefined) {
      if (config.voiceCommands && !wasVoiceEnabled) {
        this.startVoiceRecognition();
      } else if (!config.voiceCommands && wasVoiceEnabled) {
        this.stopVoiceRecognition();
      }
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): MotorConfig {
    return { ...this.config };
  }

  /**
   * Get all registered voice commands
   */
  public getVoiceCommands(): VoiceCommand[] {
    const seen = new Set<string>();
    const commands: VoiceCommand[] = [];

    for (const cmd of this.voiceCommands.values()) {
      if (!seen.has(cmd.phrase)) {
        seen.add(cmd.phrase);
        commands.push(cmd);
      }
    }

    return commands;
  }
}

/**
 * Factory function
 */
export function createMotorController(config?: Partial<MotorConfig>): MotorController {
  return new MotorController(config);
}

// Re-export types
export type { MotorConfig };
