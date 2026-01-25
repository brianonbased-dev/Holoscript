/**
 * @holoscript/gestures
 * Hand gesture and body pose recognition for VR/AR applications
 */

// Types
export type {
  Vec3,
  Quaternion,
  Transform,
  // Hand tracking
  HandData,
  HandJointData,
  HandPose,
  FingerState,
  // Gesture recognition
  GestureResult,
  GestureConfig,
  HandGestureRecognizerConfig,
  // Sequences
  GestureSequence,
  GestureSequenceStep,
  SequenceProgress,
  // Body tracking
  BodyJointData,
  BodyPose,
  BodyGestureResult,
  BodyPoseRecognizerConfig,
  // Events
  GestureEvent,
  GestureEventHandler,
} from './types';

export {
  HandJoint,
  FingerName,
  GestureType,
  BodyJoint,
  BodyGesture,
  BodyStance,
  BodyTrackingMode,
  DEFAULT_HAND_RECOGNIZER_CONFIG,
  DEFAULT_BODY_RECOGNIZER_CONFIG,
  GESTURE_SEQUENCE_PRESETS,
} from './types';

// Hand gesture recognition
export {
  HandGestureRecognizer,
  createHandGestureRecognizer,
  HandPoseAnalyzer,
  StaticGestureDetector,
} from './hand';

// Gesture sequences
export {
  GestureSequenceDetector,
  createGestureSequenceDetector,
  GestureSequenceBuilder,
} from './sequence';

// Body tracking
export {
  BodyPoseAnalyzer,
  createBodyPoseAnalyzer,
  BodyGestureDetector,
  createBodyGestureDetector,
  ThreePointTracker,
  createThreePointTracker,
} from './body';
