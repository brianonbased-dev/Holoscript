/**
 * @holoscript/core VoiceInput Trait
 *
 * Enables voice-driven interactions for HoloScript+ objects
 * Integrates speech recognition with confidence-based command parsing
 */
/**
 * VoiceInputTrait - Enables speech recognition on HoloScript+ objects
 */
export class VoiceInputTrait {
    constructor(config) {
        this.recognition = null;
        this.isListening = false;
        this.listeners = new Set();
        this.interimTranscript = '';
        this.commandCache = new Map();
        this.config = {
            showTranscript: false,
            audioFeedback: true,
            timeout: 10000,
            ...config,
        };
        this.initializeRecognition();
        this.buildCommandCache();
    }
    /**
     * Initialize Web Speech API
     */
    initializeRecognition() {
        // Use native Web Speech API or polyfill
        const SpeechRecognition = globalThis.SpeechRecognition ||
            globalThis.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error('Web Speech API not supported');
            return;
        }
        this.recognition = new SpeechRecognition();
        this.setupRecognitionHandlers();
    }
    /**
     * Setup Web Speech API event handlers
     */
    setupRecognitionHandlers() {
        if (!this.recognition)
            return;
        this.recognition.continuous = this.config.mode === 'continuous';
        this.recognition.interimResults = true;
        this.recognition.lang = this.config.languages?.[0] || 'en-US';
        this.recognition.onstart = () => {
            this.isListening = true;
            this.interimTranscript = '';
            if (this.config.audioFeedback) {
                this.playBeep('start');
            }
        };
        this.recognition.onresult = (event) => {
            this.interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const confidence = event.results[i][0].confidence;
                const isFinal = event.results[i].isFinal;
                if (isFinal) {
                    this.processVoiceCommand(transcript, confidence);
                }
                else {
                    this.interimTranscript += transcript;
                }
            }
            if (this.config.showTranscript) {
                this.emitEvent({
                    type: 'interim',
                    result: {
                        transcript: this.interimTranscript,
                        confidence: 0,
                        isFinal: false,
                        language: this.recognition.lang,
                        timestamp: Date.now(),
                    },
                    hologramId: '',
                });
            }
        };
        this.recognition.onerror = (_event) => {
            this.emitEvent({
                type: 'error',
                result: {
                    transcript: '',
                    confidence: 0,
                    isFinal: false,
                    language: this.recognition.lang,
                    timestamp: Date.now(),
                },
                hologramId: '',
            });
        };
        this.recognition.onend = () => {
            this.isListening = false;
            if (this.config.audioFeedback) {
                this.playBeep('end');
            }
        };
    }
    /**
     * Process voice command with fuzzy matching
     */
    processVoiceCommand(transcript, confidence) {
        if (confidence < this.config.confidenceThreshold) {
            return;
        }
        const normalized = transcript.toLowerCase().trim();
        let bestMatch = null;
        let bestScore = 0;
        // Try to find matching command
        for (const command of this.config.commands || []) {
            const cmdConfidence = command.confidence || this.config.confidenceThreshold;
            // Exact match
            if (normalized === command.phrase.toLowerCase()) {
                if (confidence >= cmdConfidence) {
                    bestMatch = command;
                    bestScore = 1.0;
                    break;
                }
            }
            // Fuzzy match with aliases
            const allPhrases = [command.phrase, ...(command.aliases || [])];
            for (const phrase of allPhrases) {
                const score = this.fuzzyMatch(normalized, phrase.toLowerCase());
                if (score > bestScore && score >= 0.7) {
                    bestScore = score;
                    bestMatch = command;
                }
            }
        }
        // Emit recognition result
        this.emitEvent({
            type: 'final',
            result: {
                transcript: normalized,
                confidence,
                isFinal: true,
                language: this.recognition.lang,
                matchedCommand: bestMatch || undefined,
                timestamp: Date.now(),
            },
            hologramId: '',
        });
        if (bestMatch) {
            if (this.config.audioFeedback) {
                this.playBeep('success');
            }
        }
    }
    /**
     * Fuzzy string matching (simple Levenshtein-like approach)
     */
    fuzzyMatch(input, target) {
        if (input === target)
            return 1.0;
        if (input.length === 0 || target.length === 0)
            return 0;
        // Check if input is substring of target
        if (target.includes(input)) {
            return Math.min(1.0, input.length / target.length);
        }
        // Simple edit distance estimation
        const distance = Math.abs(input.length - target.length);
        const maxLen = Math.max(input.length, target.length);
        return Math.max(0, 1.0 - distance / maxLen);
    }
    /**
     * Build command index for faster lookup
     */
    buildCommandCache() {
        for (const command of this.config.commands || []) {
            this.commandCache.set(command.phrase.toLowerCase(), command);
            for (const alias of command.aliases || []) {
                this.commandCache.set(alias.toLowerCase(), command);
            }
        }
    }
    /**
     * Start listening for voice input
     */
    startListening() {
        if (!this.recognition || this.isListening)
            return;
        try {
            this.recognition.start();
        }
        catch (error) {
            console.error('Failed to start speech recognition:', error);
        }
    }
    /**
     * Stop listening for voice input
     */
    stopListening() {
        if (!this.recognition || !this.isListening)
            return;
        try {
            this.recognition.stop();
        }
        catch (error) {
            console.error('Failed to stop speech recognition:', error);
        }
    }
    /**
     * Toggle listening state
     */
    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        }
        else {
            this.startListening();
        }
    }
    /**
     * Add command listener
     */
    on(listener) {
        this.listeners.add(listener);
    }
    /**
     * Remove command listener
     */
    off(listener) {
        this.listeners.delete(listener);
    }
    /**
     * Emit voice event to all listeners
     */
    emitEvent(event) {
        for (const listener of this.listeners) {
            listener(event);
        }
    }
    /**
     * Play audio feedback beep
     */
    playBeep(type) {
        // AudioContext beep generation
        try {
            const audioContext = new globalThis.AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            const now = audioContext.currentTime;
            const duration = 0.1;
            // Vary beep frequency by type
            oscillator.frequency.value = type === 'start' ? 800 : type === 'success' ? 1000 : 600;
            gainNode.gain.setValueAtTime(0.3, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);
            oscillator.start(now);
            oscillator.stop(now + duration);
        }
        catch (error) {
            // Silently fail if audio not available
        }
    }
    /**
     * Get current listening state
     */
    isActive() {
        return this.isListening;
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        if (this.recognition) {
            this.recognition.abort();
        }
        this.listeners.clear();
        this.commandCache.clear();
    }
}
/**
 * HoloScript+ @voice_input trait factory
 */
export function createVoiceInputTrait(config) {
    return new VoiceInputTrait(config);
}
