/**
 * @holoscript/voice - SpeechRecognizer
 * Speech-to-text interface with Whisper.cpp and browser fallback
 */

export interface SpeechRecognizerConfig {
  /** Preferred backend: 'whisper' | 'browser' */
  backend: 'whisper' | 'browser' | 'auto';
  /** Language code (e.g., 'en-US') */
  language: string;
  /** Enable continuous recognition */
  continuous: boolean;
  /** Interim results callback */
  interimResults: boolean;
  /** Max alternatives to return */
  maxAlternatives: number;
}

export interface RecognitionResult {
  /** Transcribed text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Is this final or interim */
  isFinal: boolean;
  /** Timestamp */
  timestamp: number;
}

const DEFAULT_CONFIG: SpeechRecognizerConfig = {
  backend: 'auto',
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 3,
};

/**
 * SpeechRecognizer
 * 
 * Unified speech-to-text interface. Auto-selects best available
 * backend (Whisper.cpp WASM or browser SpeechRecognition).
 */
export class SpeechRecognizer {
  private config: SpeechRecognizerConfig;
  private browserRecognition: InstanceType<typeof SpeechRecognition> | null = null;
  private isListening: boolean = false;
  private onResultCallback?: (result: RecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;
  
  constructor(config: Partial<SpeechRecognizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Initialize the recognizer
   */
  async initialize(): Promise<boolean> {
    const backend = this.selectBackend();
    
    if (backend === 'browser') {
      return this.initBrowserRecognition();
    } else if (backend === 'whisper') {
      return this.initWhisperRecognition();
    }
    
    return false;
  }
  
  /**
   * Start listening for speech
   */
  start(): void {
    if (this.isListening) return;
    
    if (this.browserRecognition) {
      this.browserRecognition.start();
      this.isListening = true;
    }
  }
  
  /**
   * Stop listening
   */
  stop(): void {
    if (!this.isListening) return;
    
    if (this.browserRecognition) {
      this.browserRecognition.stop();
    }
    
    this.isListening = false;
  }
  
  /**
   * Check if currently listening
   */
  isActive(): boolean {
    return this.isListening;
  }
  
  /**
   * Set result callback
   */
  onResult(callback: (result: RecognitionResult) => void): void {
    this.onResultCallback = callback;
  }
  
  /**
   * Set error callback
   */
  onError(callback: (error: string) => void): void {
    this.onErrorCallback = callback;
  }
  
  private selectBackend(): 'whisper' | 'browser' | null {
    if (this.config.backend === 'whisper') {
      // Check if whisper.cpp is available
      // For now, fall back to browser
      console.warn('Whisper.cpp backend not yet implemented, using browser fallback');
      return 'browser';
    }
    
    if (this.config.backend === 'browser' || this.config.backend === 'auto') {
      if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        return 'browser';
      }
    }
    
    return null;
  }
  
  private initBrowserRecognition(): boolean {
    try {
      const SpeechRecognitionClass = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognitionClass) {
        return false;
      }
      
      const recognition = new SpeechRecognitionClass() as InstanceType<typeof SpeechRecognition>;
      recognition.continuous = this.config.continuous;
      recognition.interimResults = this.config.interimResults;
      recognition.lang = this.config.language;
      recognition.maxAlternatives = this.config.maxAlternatives;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          const confidence = result[0].confidence || 0;
          
          if (this.onResultCallback) {
            this.onResultCallback({
              transcript,
              confidence,
              isFinal: result.isFinal,
              timestamp: Date.now(),
            });
          }
        }
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(event.error);
        }
      };
      
      recognition.onend = () => {
        this.isListening = false;
        
        // Auto-restart if continuous mode
        if (this.config.continuous && this.isListening) {
          this.start();
        }
      };
      
      this.browserRecognition = recognition;
      
      return true;
    } catch (e) {
      console.error('Failed to initialize browser speech recognition:', e);
      return false;
    }
  }
  
  private async initWhisperRecognition(): Promise<boolean> {
    // Placeholder for whisper.cpp WASM integration
    // Would load whisper model and initialize audio processing
    console.warn('Whisper.cpp integration not yet implemented');
    return false;
  }
}
