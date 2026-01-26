/**
 * @holoscript/voice - TextToSpeech
 * Text-to-speech with browser and neural API support
 */

export interface TextToSpeechConfig {
  /** Preferred backend: 'browser' | 'elevenlabs' | 'azure' */
  backend: 'browser' | 'elevenlabs' | 'azure';
  /** Voice identifier (browser voice name or API voice ID) */
  voiceId?: string;
  /** Speech rate (0.1 - 10) */
  rate: number;
  /** Pitch (0 - 2) */
  pitch: number;
  /** Volume (0 - 1) */
  volume: number;
  /** Language code */
  language: string;
  /** API key for cloud services */
  apiKey?: string;
}

export interface SpeechOptions {
  /** Override voice for this utterance */
  voiceId?: string;
  /** Override rate */
  rate?: number;
  /** Override pitch */
  pitch?: number;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

const DEFAULT_CONFIG: TextToSpeechConfig = {
  backend: 'browser',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  language: 'en-US',
};

/**
 * TextToSpeech
 * 
 * Unified text-to-speech interface supporting browser synthesis
 * and neural TTS APIs (ElevenLabs, Azure).
 */
export class TextToSpeech {
  private config: TextToSpeechConfig;
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  
  constructor(config: Partial<TextToSpeechConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
    }
  }
  
  /**
   * Speak text
   */
  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    if (this.config.backend === 'browser') {
      return this.speakBrowser(text, options);
    } else if (this.config.backend === 'elevenlabs') {
      return this.speakElevenLabs(text, options);
    } else if (this.config.backend === 'azure') {
      return this.speakAzure(text, options);
    }
  }
  
  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
  }
  
  /**
   * Pause speech
   */
  pause(): void {
    if (this.synth) {
      this.synth.pause();
    }
  }
  
  /**
   * Resume speech
   */
  resume(): void {
    if (this.synth) {
      this.synth.resume();
    }
  }
  
  /**
   * Check if currently speaking
   */
  isBusy(): boolean {
    return this.isSpeaking;
  }
  
  /**
   * Get available browser voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
  
  /**
   * Set voice by name or index
   */
  setVoice(voiceIdOrIndex: string | number): void {
    if (typeof voiceIdOrIndex === 'number') {
      this.config.voiceId = this.voices[voiceIdOrIndex]?.name;
    } else {
      this.config.voiceId = voiceIdOrIndex;
    }
  }
  
  private loadVoices(): void {
    if (!this.synth) return;
    
    this.voices = this.synth.getVoices();
    
    // Voices may load async
    if (this.voices.length === 0) {
      this.synth.onvoiceschanged = () => {
        this.voices = this.synth!.getVoices();
      };
    }
  }
  
  private async speakBrowser(text: string, options: SpeechOptions): Promise<void> {
    if (!this.synth) {
      options.onError?.('Speech synthesis not available');
      return;
    }
    
    const synth = this.synth;
    
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set voice
      const voiceId = options.voiceId || this.config.voiceId;
      if (voiceId) {
        const voice = this.voices.find(v => v.name === voiceId);
        if (voice) utterance.voice = voice;
      }
      
      // Set properties
      utterance.rate = options.rate ?? this.config.rate;
      utterance.pitch = options.pitch ?? this.config.pitch;
      utterance.volume = this.config.volume;
      utterance.lang = this.config.language;
      
      utterance.onstart = () => {
        this.isSpeaking = true;
        options.onStart?.();
      };
      
      utterance.onend = () => {
        this.isSpeaking = false;
        options.onEnd?.();
        resolve();
      };
      
      utterance.onerror = (event) => {
        this.isSpeaking = false;
        options.onError?.(event.error);
        reject(new Error(event.error));
      };
      
      this.currentUtterance = utterance;
      synth.speak(utterance);
    });
  }
  
  private async speakElevenLabs(text: string, options: SpeechOptions): Promise<void> {
    if (!this.config.apiKey) {
      options.onError?.('ElevenLabs API key not configured');
      return;
    }
    
    try {
      options.onStart?.();
      this.isSpeaking = true;
      
      const voiceId = options.voiceId || this.config.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel voice
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.config.apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        this.isSpeaking = false;
        URL.revokeObjectURL(audioUrl);
        options.onEnd?.();
      };
      
      audio.onerror = () => {
        this.isSpeaking = false;
        options.onError?.('Audio playback error');
      };
      
      await audio.play();
    } catch (error) {
      this.isSpeaking = false;
      options.onError?.(error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  private async speakAzure(text: string, options: SpeechOptions): Promise<void> {
    // Placeholder for Azure Cognitive Services TTS
    console.warn('Azure TTS not yet implemented');
    options.onError?.('Azure TTS not yet implemented');
  }
}
