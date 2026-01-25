/**
 * @holoscript/gestures - Hand Gesture Recognizer
 * Static and dynamic hand gesture detection for VR/AR
 */

import type {
  Vec3,
  Quaternion,
  HandData,
  HandJointData,
  HandPose,
  FingerState,
  GestureResult,
  GestureConfig,
  HandGestureRecognizerConfig,
  GestureEvent,
  GestureEventHandler,
} from '../types';
import {
  HandJoint,
  FingerName,
  GestureType,
  DEFAULT_HAND_RECOGNIZER_CONFIG,
} from '../types';

// ============================================================================
// Vector Math
// ============================================================================

const Vec3Math = {
  create: (x = 0, y = 0, z = 0): Vec3 => ({ x, y, z }),
  
  sub: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }),
  
  length: (v: Vec3): number => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
  
  distance: (a: Vec3, b: Vec3): number => Vec3Math.length(Vec3Math.sub(a, b)),
  
  normalize: (v: Vec3): Vec3 => {
    const len = Vec3Math.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },
  
  dot: (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z,
  
  cross: (a: Vec3, b: Vec3): Vec3 => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  
  lerp: (a: Vec3, b: Vec3, t: number): Vec3 => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }),
};

// ============================================================================
// Finger Mapping
// ============================================================================

const FINGER_JOINTS: Record<FingerName, { proximal: HandJoint; intermediate?: HandJoint; distal: HandJoint; tip: HandJoint }> = {
  [FingerName.Thumb]: {
    proximal: HandJoint.ThumbProximal,
    distal: HandJoint.ThumbDistal,
    tip: HandJoint.ThumbTip,
  },
  [FingerName.Index]: {
    proximal: HandJoint.IndexProximal,
    intermediate: HandJoint.IndexIntermediate,
    distal: HandJoint.IndexDistal,
    tip: HandJoint.IndexTip,
  },
  [FingerName.Middle]: {
    proximal: HandJoint.MiddleProximal,
    intermediate: HandJoint.MiddleIntermediate,
    distal: HandJoint.MiddleDistal,
    tip: HandJoint.MiddleTip,
  },
  [FingerName.Ring]: {
    proximal: HandJoint.RingProximal,
    intermediate: HandJoint.RingIntermediate,
    distal: HandJoint.RingDistal,
    tip: HandJoint.RingTip,
  },
  [FingerName.Pinky]: {
    proximal: HandJoint.PinkyProximal,
    intermediate: HandJoint.PinkyIntermediate,
    distal: HandJoint.PinkyDistal,
    tip: HandJoint.PinkyTip,
  },
};

// ============================================================================
// Hand Pose Analyzer
// ============================================================================

export class HandPoseAnalyzer {
  private handData: HandData | null = null;
  private smoothingBuffer: HandPose[] = [];
  private smoothingFrames: number = 3;

  constructor(smoothingFrames: number = 3) {
    this.smoothingFrames = smoothingFrames;
  }

  /** Update with new hand data */
  update(handData: HandData): HandPose | null {
    if (!handData.isTracking || handData.joints.size === 0) {
      this.handData = null;
      return null;
    }
    
    this.handData = handData;
    
    const pose = this.calculatePose();
    
    // Smoothing
    this.smoothingBuffer.push(pose);
    if (this.smoothingBuffer.length > this.smoothingFrames) {
      this.smoothingBuffer.shift();
    }
    
    return this.getSmoothedPose();
  }

  /** Calculate hand pose from joint data */
  private calculatePose(): HandPose {
    const fingers = new Map<FingerName, FingerState>();
    const wrist = this.handData!.joints.get(HandJoint.Wrist)!;
    
    // Calculate palm position and direction
    const middleMetacarpal = this.handData!.joints.get(HandJoint.MiddleMetacarpal);
    const palmPosition = middleMetacarpal?.position ?? wrist.position;
    
    // Palm normal (approximate from wrist orientation)
    const palmNormal = this.quaternionToUp(wrist.rotation);
    const palmDirection = this.quaternionToForward(wrist.rotation);
    
    // Analyze each finger
    for (const fingerName of Object.values(FingerName)) {
      const fingerState = this.analyzeFingerState(fingerName);
      fingers.set(fingerName, fingerState);
    }
    
    // Calculate grip strength
    let gripStrength = 0;
    for (const state of fingers.values()) {
      if (state.finger !== FingerName.Thumb) {
        gripStrength += state.curl;
      }
    }
    gripStrength /= 4; // Average of 4 fingers (excluding thumb)
    
    // Determine if hand is open or fist
    const isOpen = gripStrength < 0.3;
    const isFist = gripStrength > 0.7;
    
    return {
      hand: this.handData!.hand,
      fingers,
      palmPosition,
      palmNormal,
      palmDirection,
      wristTransform: {
        position: wrist.position,
        rotation: wrist.rotation,
      },
      isOpen,
      isFist,
      gripStrength,
    };
  }

  /** Analyze a single finger's state */
  private analyzeFingerState(finger: FingerName): FingerState {
    const joints = FINGER_JOINTS[finger];
    
    const proximal = this.handData!.joints.get(joints.proximal);
    const tip = this.handData!.joints.get(joints.tip);
    const thumbTip = this.handData!.joints.get(HandJoint.ThumbTip);
    const wrist = this.handData!.joints.get(HandJoint.Wrist);
    
    if (!proximal || !tip || !wrist) {
      return {
        finger,
        isExtended: false,
        curl: 0,
        spread: 0,
        pinchToThumb: 1,
      };
    }
    
    // Calculate curl based on distance from tip to proximal
    const extendedLength = this.getFingerLength(finger);
    const currentLength = Vec3Math.distance(tip.position, proximal.position);
    const curl = 1 - Math.min(1, currentLength / (extendedLength * 0.9));
    
    // Is extended if curl is low
    const isExtended = curl < 0.4;
    
    // Calculate spread (angle from palm centerline)
    const toTip = Vec3Math.normalize(Vec3Math.sub(tip.position, wrist.position));
    const palmDirection = this.quaternionToForward(wrist.rotation);
    const spread = Math.acos(Math.max(-1, Math.min(1, Vec3Math.dot(toTip, palmDirection))));
    
    // Pinch distance to thumb
    let pinchToThumb = 1;
    if (thumbTip && finger !== FingerName.Thumb) {
      const thumbDist = Vec3Math.distance(tip.position, thumbTip.position);
      const maxPinchDist = 0.05; // 5cm
      pinchToThumb = Math.min(1, thumbDist / maxPinchDist);
    }
    
    return {
      finger,
      isExtended,
      curl,
      spread,
      pinchToThumb,
    };
  }

  /** Get approximate extended finger length */
  private getFingerLength(finger: FingerName): number {
    // Approximate finger lengths in meters
    const lengths: Record<FingerName, number> = {
      [FingerName.Thumb]: 0.05,
      [FingerName.Index]: 0.08,
      [FingerName.Middle]: 0.09,
      [FingerName.Ring]: 0.08,
      [FingerName.Pinky]: 0.06,
    };
    return lengths[finger];
  }

  /** Convert quaternion to forward vector */
  private quaternionToForward(q: Quaternion): Vec3 {
    return {
      x: 2 * (q.x * q.z + q.w * q.y),
      y: 2 * (q.y * q.z - q.w * q.x),
      z: 1 - 2 * (q.x * q.x + q.y * q.y),
    };
  }

  /** Convert quaternion to up vector */
  private quaternionToUp(q: Quaternion): Vec3 {
    return {
      x: 2 * (q.x * q.y - q.w * q.z),
      y: 1 - 2 * (q.x * q.x + q.z * q.z),
      z: 2 * (q.y * q.z + q.w * q.x),
    };
  }

  /** Get smoothed pose from buffer */
  private getSmoothedPose(): HandPose {
    if (this.smoothingBuffer.length === 1) {
      return this.smoothingBuffer[0];
    }
    
    const latest = this.smoothingBuffer[this.smoothingBuffer.length - 1];
    
    // Average curl values
    const smoothedFingers = new Map<FingerName, FingerState>();
    for (const finger of Object.values(FingerName)) {
      let totalCurl = 0;
      let totalSpread = 0;
      let totalPinch = 0;
      
      for (const pose of this.smoothingBuffer) {
        const state = pose.fingers.get(finger);
        if (state) {
          totalCurl += state.curl;
          totalSpread += state.spread;
          totalPinch += state.pinchToThumb;
        }
      }
      
      const count = this.smoothingBuffer.length;
      const avgCurl = totalCurl / count;
      
      smoothedFingers.set(finger, {
        finger,
        isExtended: avgCurl < 0.4,
        curl: avgCurl,
        spread: totalSpread / count,
        pinchToThumb: totalPinch / count,
      });
    }
    
    return {
      ...latest,
      fingers: smoothedFingers,
    };
  }
}

// ============================================================================
// Static Gesture Detector
// ============================================================================

export class StaticGestureDetector {
  /** Detect if hand is in fist pose */
  static isFist(pose: HandPose): { detected: boolean; confidence: number } {
    const fingers = [FingerName.Index, FingerName.Middle, FingerName.Ring, FingerName.Pinky];
    let totalCurl = 0;
    
    for (const finger of fingers) {
      const state = pose.fingers.get(finger);
      totalCurl += state?.curl ?? 0;
    }
    
    const avgCurl = totalCurl / 4;
    return {
      detected: avgCurl > 0.7,
      confidence: avgCurl,
    };
  }

  /** Detect if hand is open */
  static isOpenHand(pose: HandPose): { detected: boolean; confidence: number } {
    let totalExtension = 0;
    
    for (const state of pose.fingers.values()) {
      totalExtension += state.isExtended ? 1 : 0;
    }
    
    const confidence = totalExtension / 5;
    return {
      detected: confidence > 0.8,
      confidence,
    };
  }

  /** Detect pointing gesture (index extended, others curled) */
  static isPointing(pose: HandPose): { detected: boolean; confidence: number } {
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    const indexExtended = index.isExtended ? 1 : 0;
    const othersCurled = (middle.curl + ring.curl + pinky.curl) / 3;
    
    const confidence = (indexExtended + othersCurled) / 2;
    return {
      detected: index.isExtended && othersCurled > 0.6,
      confidence,
    };
  }

  /** Detect peace sign (index and middle extended) */
  static isPeace(pose: HandPose): { detected: boolean; confidence: number } {
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    const indexMiddleExtended = (index.isExtended ? 1 : 0) + (middle.isExtended ? 1 : 0);
    const othersCurled = (ring.curl + pinky.curl) / 2;
    
    const confidence = (indexMiddleExtended / 2 + othersCurled) / 2;
    return {
      detected: index.isExtended && middle.isExtended && othersCurled > 0.6,
      confidence,
    };
  }

  /** Detect thumbs up */
  static isThumbsUp(pose: HandPose): { detected: boolean; confidence: number } {
    const thumb = pose.fingers.get(FingerName.Thumb);
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!thumb || !index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    const thumbUp = thumb.isExtended ? 1 : 0;
    const fingersCurled = (index.curl + middle.curl + ring.curl + pinky.curl) / 4;
    
    // Check if palm is facing appropriate direction (thumb pointing up-ish)
    const palmFacingGood = pose.palmNormal.y < 0.5;
    
    const confidence = (thumbUp + fingersCurled + (palmFacingGood ? 1 : 0)) / 3;
    return {
      detected: thumb.isExtended && fingersCurled > 0.6 && palmFacingGood,
      confidence,
    };
  }

  /** Detect thumbs down */
  static isThumbsDown(pose: HandPose): { detected: boolean; confidence: number } {
    const result = this.isThumbsUp(pose);
    // For thumbs down, palm normal should be inverted
    const isDown = pose.palmNormal.y > 0.5;
    
    if (isDown && result.detected) {
      return { detected: true, confidence: result.confidence };
    }
    return { detected: false, confidence: 0 };
  }

  /** Detect pinch (thumb touching index) */
  static isPinch(pose: HandPose): { detected: boolean; confidence: number } {
    const index = pose.fingers.get(FingerName.Index);
    
    if (!index) {
      return { detected: false, confidence: 0 };
    }
    
    const pinchAmount = 1 - index.pinchToThumb;
    return {
      detected: index.pinchToThumb < 0.3,
      confidence: pinchAmount,
    };
  }

  /** Detect grab gesture (all fingers curled but not fully closed) */
  static isGrab(pose: HandPose): { detected: boolean; confidence: number } {
    const fingers = [FingerName.Index, FingerName.Middle, FingerName.Ring, FingerName.Pinky];
    let totalCurl = 0;
    
    for (const finger of fingers) {
      const state = pose.fingers.get(finger);
      totalCurl += state?.curl ?? 0;
    }
    
    const avgCurl = totalCurl / 4;
    // Grab is between open (< 0.3) and fist (> 0.7)
    const isGrab = avgCurl > 0.4 && avgCurl < 0.8;
    
    return {
      detected: isGrab,
      confidence: isGrab ? 1 - Math.abs(0.6 - avgCurl) * 2 : 0,
    };
  }

  /** Detect gun gesture (index and thumb extended, like finger gun) */
  static isGun(pose: HandPose): { detected: boolean; confidence: number } {
    const thumb = pose.fingers.get(FingerName.Thumb);
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!thumb || !index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    const extended = (thumb.isExtended ? 1 : 0) + (index.isExtended ? 1 : 0);
    const curled = (middle.curl + ring.curl + pinky.curl) / 3;
    
    const confidence = (extended / 2 + curled) / 2;
    return {
      detected: thumb.isExtended && index.isExtended && curled > 0.6,
      confidence,
    };
  }

  /** Detect OK gesture (thumb and index touching, forming circle) */
  static isOK(pose: HandPose): { detected: boolean; confidence: number } {
    const thumb = pose.fingers.get(FingerName.Thumb);
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!thumb || !index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    // Thumb and index form circle (both somewhat curled, touching)
    const touching = index.pinchToThumb < 0.2;
    const othersExtended = (middle.isExtended ? 1 : 0) + (ring.isExtended ? 1 : 0) + (pinky.isExtended ? 1 : 0);
    
    const confidence = (touching ? 0.5 : 0) + (othersExtended / 6);
    return {
      detected: touching && othersExtended >= 2,
      confidence,
    };
  }

  /** Detect rock gesture (index and pinky extended, like metal horns) */
  static isRock(pose: HandPose): { detected: boolean; confidence: number } {
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    const extended = (index.isExtended ? 1 : 0) + (pinky.isExtended ? 1 : 0);
    const curled = (middle.curl + ring.curl) / 2;
    
    const confidence = (extended / 2 + curled) / 2;
    return {
      detected: index.isExtended && pinky.isExtended && curled > 0.6,
      confidence,
    };
  }

  /** Detect call gesture (thumb and pinky extended, like phone) */
  static isCall(pose: HandPose): { detected: boolean; confidence: number } {
    const thumb = pose.fingers.get(FingerName.Thumb);
    const index = pose.fingers.get(FingerName.Index);
    const middle = pose.fingers.get(FingerName.Middle);
    const ring = pose.fingers.get(FingerName.Ring);
    const pinky = pose.fingers.get(FingerName.Pinky);
    
    if (!thumb || !index || !middle || !ring || !pinky) {
      return { detected: false, confidence: 0 };
    }
    
    const extended = (thumb.isExtended ? 1 : 0) + (pinky.isExtended ? 1 : 0);
    const curled = (index.curl + middle.curl + ring.curl) / 3;
    
    const confidence = (extended / 2 + curled) / 2;
    return {
      detected: thumb.isExtended && pinky.isExtended && curled > 0.6,
      confidence,
    };
  }
}

// ============================================================================
// Hand Gesture Recognizer
// ============================================================================

export class HandGestureRecognizer {
  private config: HandGestureRecognizerConfig;
  private leftAnalyzer: HandPoseAnalyzer;
  private rightAnalyzer: HandPoseAnalyzer;
  private leftPose: HandPose | null = null;
  private rightPose: HandPose | null = null;
  
  // Gesture tracking
  private activeGestures: Map<string, { gesture: GestureType; hand: 'left' | 'right'; startTime: number }> = new Map();
  private lastGestureTime: Map<string, number> = new Map();
  private eventHandlers: Set<GestureEventHandler> = new Set();

  constructor(config?: Partial<HandGestureRecognizerConfig>) {
    this.config = { ...DEFAULT_HAND_RECOGNIZER_CONFIG, ...config };
    this.leftAnalyzer = new HandPoseAnalyzer(this.config.smoothingFrames);
    this.rightAnalyzer = new HandPoseAnalyzer(this.config.smoothingFrames);
  }

  /** Update with new hand data */
  update(leftHand: HandData | null, rightHand: HandData | null): GestureResult[] {
    const results: GestureResult[] = [];
    const now = performance.now();
    
    // Update poses
    if (this.config.leftHand && leftHand) {
      this.leftPose = this.leftAnalyzer.update(leftHand);
      if (this.leftPose) {
        results.push(...this.detectGestures(this.leftPose, 'left', now));
      }
    }
    
    if (this.config.rightHand && rightHand) {
      this.rightPose = this.rightAnalyzer.update(rightHand);
      if (this.rightPose) {
        results.push(...this.detectGestures(this.rightPose, 'right', now));
      }
    }
    
    return results;
  }

  /** Detect all enabled gestures for a hand pose */
  private detectGestures(pose: HandPose, hand: 'left' | 'right', now: number): GestureResult[] {
    const results: GestureResult[] = [];
    
    for (const gestureType of this.config.enabledGestures) {
      const detection = this.detectGesture(gestureType, pose);
      
      if (detection.detected && detection.confidence >= this.config.confidenceThreshold) {
        const key = `${hand}_${gestureType}`;
        const lastTime = this.lastGestureTime.get(key) ?? 0;
        
        // Check cooldown
        if (now - lastTime < this.config.gestureCooldown) continue;
        
        // Track active gesture
        if (!this.activeGestures.has(key)) {
          this.activeGestures.set(key, { gesture: gestureType, hand, startTime: now });
          this.emit({ type: 'gesture_start', gesture: gestureType, hand, timestamp: now });
        }
        
        const active = this.activeGestures.get(key)!;
        const duration = now - active.startTime;
        
        // Hold event
        if (duration > this.config.staticHoldTime) {
          this.emit({ type: 'gesture_hold', gesture: gestureType, hand, duration, timestamp: now });
        }
        
        results.push({
          gesture: gestureType,
          hand,
          confidence: detection.confidence,
          duration,
          endPosition: pose.palmPosition,
          timestamp: now,
        });
      } else {
        // Gesture ended
        const key = `${hand}_${gestureType}`;
        const active = this.activeGestures.get(key);
        
        if (active) {
          const duration = now - active.startTime;
          this.emit({ type: 'gesture_end', gesture: gestureType, hand, duration, timestamp: now });
          this.activeGestures.delete(key);
          this.lastGestureTime.set(key, now);
        }
      }
    }
    
    return results;
  }

  /** Detect a specific gesture */
  private detectGesture(type: GestureType, pose: HandPose): { detected: boolean; confidence: number } {
    switch (type) {
      case GestureType.Fist:
        return StaticGestureDetector.isFist(pose);
      case GestureType.OpenHand:
        return StaticGestureDetector.isOpenHand(pose);
      case GestureType.Point:
        return StaticGestureDetector.isPointing(pose);
      case GestureType.Peace:
        return StaticGestureDetector.isPeace(pose);
      case GestureType.ThumbsUp:
        return StaticGestureDetector.isThumbsUp(pose);
      case GestureType.ThumbsDown:
        return StaticGestureDetector.isThumbsDown(pose);
      case GestureType.PinchHold:
      case GestureType.Pinch:
        return StaticGestureDetector.isPinch(pose);
      case GestureType.Grab:
        return StaticGestureDetector.isGrab(pose);
      case GestureType.Gun:
        return StaticGestureDetector.isGun(pose);
      case GestureType.OK:
        return StaticGestureDetector.isOK(pose);
      case GestureType.Rock:
        return StaticGestureDetector.isRock(pose);
      case GestureType.Call:
        return StaticGestureDetector.isCall(pose);
      default:
        return { detected: false, confidence: 0 };
    }
  }

  /** Get current pose for a hand */
  getPose(hand: 'left' | 'right'): HandPose | null {
    return hand === 'left' ? this.leftPose : this.rightPose;
  }

  /** Get active gestures */
  getActiveGestures(): Array<{ gesture: GestureType; hand: 'left' | 'right'; duration: number }> {
    const now = performance.now();
    return Array.from(this.activeGestures.values()).map(g => ({
      gesture: g.gesture,
      hand: g.hand,
      duration: now - g.startTime,
    }));
  }

  /** Add event handler */
  addEventListener(handler: GestureEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /** Remove event handler */
  removeEventListener(handler: GestureEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /** Emit event */
  private emit(event: GestureEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (e) {
        console.error('Gesture event handler error:', e);
      }
    }
  }

  /** Update config */
  setConfig(config: Partial<HandGestureRecognizerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get config */
  getConfig(): HandGestureRecognizerConfig {
    return { ...this.config };
  }
}

// Factory function
export function createHandGestureRecognizer(
  config?: Partial<HandGestureRecognizerConfig>
): HandGestureRecognizer {
  return new HandGestureRecognizer(config);
}

// Re-exports
export { HandJoint, FingerName, GestureType } from '../types';
export type {
  HandData,
  HandJointData,
  HandPose,
  FingerState,
  GestureResult,
  GestureConfig,
  HandGestureRecognizerConfig,
};
