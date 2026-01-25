/**
 * @holoscript/gestures - Type Definitions
 * Hand gesture and body pose recognition for VR/AR
 */

// ============================================================================
// Core Types
// ============================================================================

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quaternion;
}

// ============================================================================
// Hand Joint Types (WebXR Hand Tracking)
// ============================================================================

export enum HandJoint {
  Wrist = 'wrist',
  ThumbMetacarpal = 'thumb-metacarpal',
  ThumbProximal = 'thumb-phalanx-proximal',
  ThumbDistal = 'thumb-phalanx-distal',
  ThumbTip = 'thumb-tip',
  IndexMetacarpal = 'index-finger-metacarpal',
  IndexProximal = 'index-finger-phalanx-proximal',
  IndexIntermediate = 'index-finger-phalanx-intermediate',
  IndexDistal = 'index-finger-phalanx-distal',
  IndexTip = 'index-finger-tip',
  MiddleMetacarpal = 'middle-finger-metacarpal',
  MiddleProximal = 'middle-finger-phalanx-proximal',
  MiddleIntermediate = 'middle-finger-phalanx-intermediate',
  MiddleDistal = 'middle-finger-phalanx-distal',
  MiddleTip = 'middle-finger-tip',
  RingMetacarpal = 'ring-finger-metacarpal',
  RingProximal = 'ring-finger-phalanx-proximal',
  RingIntermediate = 'ring-finger-phalanx-intermediate',
  RingDistal = 'ring-finger-phalanx-distal',
  RingTip = 'ring-finger-tip',
  PinkyMetacarpal = 'pinky-finger-metacarpal',
  PinkyProximal = 'pinky-finger-phalanx-proximal',
  PinkyIntermediate = 'pinky-finger-phalanx-intermediate',
  PinkyDistal = 'pinky-finger-phalanx-distal',
  PinkyTip = 'pinky-finger-tip',
}

export interface HandJointData {
  joint: HandJoint;
  position: Vec3;
  rotation: Quaternion;
  radius: number;
}

export interface HandData {
  hand: 'left' | 'right';
  isTracking: boolean;
  joints: Map<HandJoint, HandJointData>;
  timestamp: number;
}

// ============================================================================
// Finger State Types
// ============================================================================

export interface FingerState {
  /** Finger name */
  finger: FingerName;
  /** Is finger extended (not curled) */
  isExtended: boolean;
  /** Curl amount (0 = straight, 1 = fully curled) */
  curl: number;
  /** Spread from palm centerline */
  spread: number;
  /** Pinch distance to thumb (normalized 0-1) */
  pinchToThumb: number;
}

export enum FingerName {
  Thumb = 'thumb',
  Index = 'index',
  Middle = 'middle',
  Ring = 'ring',
  Pinky = 'pinky',
}

export interface HandPose {
  /** Hand laterality */
  hand: 'left' | 'right';
  /** All finger states */
  fingers: Map<FingerName, FingerState>;
  /** Palm position */
  palmPosition: Vec3;
  /** Palm normal direction */
  palmNormal: Vec3;
  /** Palm facing direction */
  palmDirection: Vec3;
  /** Wrist transform */
  wristTransform: Transform;
  /** Is hand open */
  isOpen: boolean;
  /** Is fist closed */
  isFist: boolean;
  /** Grip strength (0-1) */
  gripStrength: number;
}

// ============================================================================
// Gesture Types
// ============================================================================

export enum GestureType {
  // Static hand poses
  Fist = 'fist',
  OpenHand = 'open_hand',
  Point = 'point',
  Peace = 'peace',
  ThumbsUp = 'thumbs_up',
  ThumbsDown = 'thumbs_down',
  PinchHold = 'pinch_hold',
  Grab = 'grab',
  Gun = 'gun',
  Rock = 'rock',
  Call = 'call',
  OK = 'ok',
  
  // Dynamic gestures
  Swipe = 'swipe',
  Wave = 'wave',
  Pinch = 'pinch',
  Release = 'release',
  Flick = 'flick',
  Rotate = 'rotate',
  Spread = 'spread',
  Squeeze = 'squeeze',
}

export interface GestureConfig {
  /** Gesture type to detect */
  type: GestureType;
  /** Confidence threshold (0-1) */
  threshold: number;
  /** Minimum hold time (ms) for static gestures */
  holdTime: number;
  /** Cooldown between detections (ms) */
  cooldown: number;
  /** Hand(s) to detect on */
  hands: 'left' | 'right' | 'both' | 'either';
}

export interface GestureResult {
  /** Detected gesture type */
  gesture: GestureType;
  /** Which hand triggered it */
  hand: 'left' | 'right';
  /** Detection confidence (0-1) */
  confidence: number;
  /** Duration held (for static gestures) */
  duration: number;
  /** Start position (for dynamic gestures) */
  startPosition?: Vec3;
  /** End/current position */
  endPosition?: Vec3;
  /** Velocity (for swipes, etc) */
  velocity?: Vec3;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Gesture Sequence Types
// ============================================================================

export interface GestureSequenceStep {
  /** Expected gesture */
  gesture: GestureType;
  /** Which hand */
  hand: 'left' | 'right' | 'either' | 'same';
  /** Minimum hold time (ms) */
  holdTime?: number;
  /** Maximum time to next gesture (ms) */
  maxTimeToNext?: number;
  /** Optional: specific direction for swipes */
  direction?: Vec3;
}

export interface GestureSequence {
  /** Unique identifier */
  id: string;
  /** Sequence name */
  name: string;
  /** Steps in the sequence */
  steps: GestureSequenceStep[];
  /** Total timeout for entire sequence (ms) */
  timeout: number;
  /** Allow cancellation on wrong gesture */
  strictOrder: boolean;
}

export interface SequenceProgress {
  /** Sequence being tracked */
  sequenceId: string;
  /** Current step index */
  currentStep: number;
  /** Total steps */
  totalSteps: number;
  /** Time elapsed since start */
  elapsed: number;
  /** Which hand is being used (for 'same' steps) */
  activeHand?: 'left' | 'right';
  /** Is complete */
  isComplete: boolean;
  /** Was cancelled */
  wasCancelled: boolean;
}

// ============================================================================
// Body Pose Types
// ============================================================================

export enum BodyJoint {
  Head = 'head',
  Neck = 'neck',
  Chest = 'chest',
  Spine = 'spine',
  Hips = 'hips',
  LeftShoulder = 'left_shoulder',
  LeftElbow = 'left_elbow',
  LeftWrist = 'left_wrist',
  RightShoulder = 'right_shoulder',
  RightElbow = 'right_elbow',
  RightWrist = 'right_wrist',
  LeftHip = 'left_hip',
  LeftKnee = 'left_knee',
  LeftAnkle = 'left_ankle',
  RightHip = 'right_hip',
  RightKnee = 'right_knee',
  RightAnkle = 'right_ankle',
}

export interface BodyJointData {
  joint: BodyJoint;
  position: Vec3;
  rotation?: Quaternion;
  confidence: number;
}

/** Simple position-only body joint map for 3-point tracking */
export type BodyJointPositions = Partial<Record<BodyJoint, Vec3>>;

export interface BodyPose {
  /** All tracked joints */
  joints: BodyJointPositions;
  /** Center of mass position */
  centerOfMass: Vec3;
  /** Facing direction */
  facingDirection: Vec3;
  /** Current velocity */
  velocity: Vec3;
  /** Is currently moving */
  isMoving: boolean;
  /** Detected stance */
  stance: BodyStance;
  /** Arms raised above shoulder */
  armsRaised: boolean;
  /** Arms extended forward */
  armsForward: boolean;
}

export type BodyStance = 
  | 'standing'
  | 'crouching'
  | 'sitting'
  | 'jumping'
  | 'lying'
  | 'leaning_forward'
  | 'leaning_back'
  | 'leaning_left'
  | 'leaning_right';

/** Alias for BodyPoseRecognizerConfig */
export type BodyRecognizerConfig = BodyPoseRecognizerConfig;

export enum BodyGesture {
  Stand = 'stand',
  Jump = 'jump',
  Crouch = 'crouch',
  Duck = 'duck',
  Prone = 'prone',
  LeanLeft = 'lean_left',
  LeanRight = 'lean_right',
  LeanForward = 'lean_forward',
  LeanBack = 'lean_back',
  DuckLeft = 'duck_left',
  DuckRight = 'duck_right',
  ArmsRaised = 'arms_raised',
  TPose = 't_pose',
  SpinLeft = 'spin_left',
  SpinRight = 'spin_right',
  ArmsCrossed = 'arms_crossed',
  HandsOnHips = 'hands_on_hips',
  RaiseHand = 'raise_hand',
  Wave = 'wave',
  Shrug = 'shrug',
}

export interface BodyGestureResult {
  /** Detected gesture */
  gesture: BodyGesture;
  /** Detection confidence */
  confidence: number;
  /** Duration */
  duration: number;
  /** Magnitude (for lean strength, etc) */
  magnitude?: number;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Recognizer Config Types
// ============================================================================

export interface HandGestureRecognizerConfig {
  /** Enable left hand detection */
  leftHand: boolean;
  /** Enable right hand detection */
  rightHand: boolean;
  /** Gestures to detect */
  enabledGestures: GestureType[];
  /** Smoothing window size (frames) */
  smoothingFrames: number;
  /** Minimum confidence threshold */
  confidenceThreshold: number;
  /** Hold time for static gestures (ms) */
  staticHoldTime: number;
  /** Cooldown between same gesture (ms) */
  gestureCooldown: number;
}

export interface BodyPoseRecognizerConfig {
  /** Enable body tracking */
  enabled: boolean;
  /** Use 3-point (head + hands) or full body */
  trackingMode: BodyTrackingMode;
  /** Smoothing window size (frames) */
  smoothingFrames: number;
  /** Minimum confidence for joint */
  jointConfidenceThreshold: number;
  /** Gestures to detect */
  enabledGestures: BodyGesture[];
  /** Floor height for stance detection */
  floorHeight: number;
}

export enum BodyTrackingMode {
  /** Head + hands only (VR controllers) */
  ThreePoint = 'three_point',
  /** Full body with additional trackers */
  FullBody = 'full_body',
  /** Inferred from IK */
  Inferred = 'inferred',
}

// ============================================================================
// Event Types
// ============================================================================

export type GestureEvent = 
  | { type: 'gesture_start'; gesture: GestureType; hand: 'left' | 'right'; timestamp: number }
  | { type: 'gesture_hold'; gesture: GestureType; hand: 'left' | 'right'; duration: number; timestamp: number }
  | { type: 'gesture_end'; gesture: GestureType; hand: 'left' | 'right'; duration: number; timestamp: number }
  | { type: 'gesture_cancelled'; gesture: GestureType; hand: 'left' | 'right'; reason: string; timestamp: number }
  | { type: 'sequence_start'; sequenceId: string; timestamp: number }
  | { type: 'sequence_progress'; sequenceId: string; step: number; totalSteps: number; timestamp: number }
  | { type: 'sequence_complete'; sequenceId: string; duration: number; timestamp: number }
  | { type: 'sequence_failed'; sequenceId: string; reason: string; timestamp: number }
  | { type: 'body_gesture'; gesture: BodyGesture; confidence: number; timestamp: number }
  | { type: 'body_gesture_start'; gesture: BodyGesture; timestamp: number }
  | { type: 'body_gesture_end'; gesture: BodyGesture; duration: number; timestamp: number };

export type GestureEventHandler = (event: GestureEvent) => void;

// ============================================================================
// Default Configurations
// ============================================================================

export const DEFAULT_HAND_RECOGNIZER_CONFIG: HandGestureRecognizerConfig = {
  leftHand: true,
  rightHand: true,
  enabledGestures: [
    GestureType.Fist,
    GestureType.OpenHand,
    GestureType.Point,
    GestureType.ThumbsUp,
    GestureType.Pinch,
    GestureType.Grab,
  ],
  smoothingFrames: 3,
  confidenceThreshold: 0.7,
  staticHoldTime: 300,
  gestureCooldown: 200,
};

export const DEFAULT_BODY_RECOGNIZER_CONFIG: BodyPoseRecognizerConfig = {
  enabled: true,
  trackingMode: BodyTrackingMode.ThreePoint,
  smoothingFrames: 5,
  jointConfidenceThreshold: 0.5,
  enabledGestures: [
    BodyGesture.Crouch,
    BodyGesture.LeanLeft,
    BodyGesture.LeanRight,
    BodyGesture.RaiseHand,
  ],
  floorHeight: 0,
};

// ============================================================================
// Preset Gesture Sequences
// ============================================================================

export const GESTURE_SEQUENCE_PRESETS: Record<string, GestureSequence> = {
  spell_cast: {
    id: 'spell_cast',
    name: 'Spell Cast',
    steps: [
      { gesture: GestureType.OpenHand, hand: 'either', holdTime: 200 },
      { gesture: GestureType.Fist, hand: 'same', holdTime: 100, maxTimeToNext: 500 },
      { gesture: GestureType.Point, hand: 'same', holdTime: 100 },
    ],
    timeout: 2000,
    strictOrder: true,
  },
  teleport: {
    id: 'teleport',
    name: 'Teleport',
    steps: [
      { gesture: GestureType.Point, hand: 'either', holdTime: 500 },
      { gesture: GestureType.ThumbsUp, hand: 'same', holdTime: 200 },
    ],
    timeout: 1500,
    strictOrder: true,
  },
  menu_open: {
    id: 'menu_open',
    name: 'Menu Open',
    steps: [
      { gesture: GestureType.OpenHand, hand: 'left', holdTime: 300 },
    ],
    timeout: 1000,
    strictOrder: true,
  },
  grab_and_throw: {
    id: 'grab_and_throw',
    name: 'Grab and Throw',
    steps: [
      { gesture: GestureType.Grab, hand: 'either', holdTime: 100 },
      { gesture: GestureType.Fist, hand: 'same', holdTime: 200 },
      { gesture: GestureType.OpenHand, hand: 'same', holdTime: 50 },
    ],
    timeout: 1500,
    strictOrder: true,
  },
};
