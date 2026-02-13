import { describe, it, expect, beforeEach } from 'vitest';
import { LipSyncTrait } from '../../traits/LipSyncTrait';
import { MockSpeechRecognizer } from '../MockSpeechRecognizer';

describe('LipSync End-to-End Flow', () => {
  let trait: LipSyncTrait;
  let recognizer: MockSpeechRecognizer;

  beforeEach(async () => {
    // Phase 16: Use phoneme method and fast smoothing for testing
    trait = new LipSyncTrait({
      method: 'phoneme',
      smoothing: 0.01, // Fast response
    });
    recognizer = new MockSpeechRecognizer();
    await recognizer.initialize({ backend: 'whisper.cpp' });
  });

  it('should drive lip sync from speech recognition phonemes', async () => {
    // 1. Mock Transcription Segments
    const segments = await recognizer.transcribe(new ArrayBuffer(0), {
      phonemeMode: true,
      timestamps: true,
    });

    const phonemes = segments[0].phonemes;
    expect(phonemes).toBeDefined();

    // 2. Start Lip Sync Session with Phoneme Data
    trait.startSession({ phonemeData: phonemes });

    // 3. Update to t=0.075s (middle of first phoneme "hh" -> "kk")
    // Note: startSession sets currentTime to 0.
    // Call update(0.075) to sample at 0.075.
    let weights = trait.update(0.075);

    // "hh" maps to "kk" viseme -> "viseme_kk"
    // With smoothing, it might not be perfect 0.85 yet, but should be > 0.5
    expect(weights['viseme_kk']).toBeGreaterThan(0.5);

    // 4. Update further to t=0.225s (+0.15s)
    // Next phoneme is "eh" -> "E" ("viseme_E")
    weights = trait.update(0.15);
    expect(weights['viseme_E']).toBeGreaterThan(0.5);

    // Previous viseme "kk" should be fading out
    expect(weights['viseme_kk'] || 0).toBeLessThan(0.3);

    trait.endSession();
  });
});
