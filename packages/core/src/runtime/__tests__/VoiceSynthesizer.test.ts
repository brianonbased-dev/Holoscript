import { describe, it, expect, beforeEach } from 'vitest';
import { BaseVoiceSynthesizer } from '../BaseVoiceSynthesizer';

describe('BaseVoiceSynthesizer', () => {
  let synthesizer: BaseVoiceSynthesizer;

  beforeEach(() => {
    synthesizer = new BaseVoiceSynthesizer();
  });

  it('should initialize with ElevenLabs config', async () => {
    await synthesizer.initialize({
      backend: 'elevenlabs',
      apiKey: 'test-key',
    });

    const voices = await synthesizer.getVoices();
    expect(voices.length).toBeGreaterThan(0);
    expect(voices[0].provider).toBe('elevenlabs');
  });

  it('should initialize with Azure config', async () => {
    await synthesizer.initialize({
      backend: 'azure',
      apiKey: 'test-key',
    });

    const voices = await synthesizer.getVoices();
    expect(voices.length).toBeGreaterThan(0);
    expect(voices[0].provider).toBe('azure');
  });

  it('should generate audio and use cache', async () => {
    await synthesizer.initialize({ backend: 'local' });

    const request = {
      text: 'Hello HoloLand!',
      voiceId: 'default',
    };

    const audio1 = await synthesizer.generate(request);
    expect(audio1.byteLength).toBe(1024);

    // Call again, should be cached
    const audio2 = await synthesizer.generate(request);
    expect(audio2).toBe(audio1);
  });

  it('should list available voices', async () => {
    await synthesizer.initialize({ backend: 'local' });
    const voices = await synthesizer.getVoices();
    expect(Array.isArray(voices)).toBe(true);
    expect(voices[0].id).toBe('default_local');
  });
});
