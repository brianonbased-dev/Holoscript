/**
 * Ambient module declarations for optional @holoscript/* packages
 * that are dynamically imported by BuiltinRegistry.
 * These packages are not yet published — declarations allow the core
 * package to compile without them installed.
 */

declare module '@holoscript/voice' {
  export class SpeechRecognizer {
    constructor(opts: { backend: string });
    initialize(): Promise<void>;
  }
  export class TextToSpeech {
    constructor(opts: { backend: string; apiKey?: string });
  }
}

declare module '@holoscript/gpu' {
  export class FlowFieldCompute {
    constructor(opts: { width: number; height: number; cellSize: number });
    initialize(): Promise<void>;
  }
  export class GPUContext {
    constructor(opts: { powerPreference: string });
    initialize(): Promise<void>;
    destroy(): void;
  }
}

declare module '@holoscript/navigation' {
  export class FlowFieldGenerator {
    constructor(opts: { width: number; height: number; cellSize: number });
  }
}

declare module '@holoscript/gestures' {
  export class FrustrationEstimator {
    constructor(opts: { frustrationThreshold: number });
  }
}
