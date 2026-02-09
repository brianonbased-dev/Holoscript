/**
 * Audio.test.ts
 *
 * Comprehensive tests for HoloScript audio system including
 * audio context, sources, effects, and sequencer.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // Types
  AUDIO_DEFAULTS,
  zeroVector,
  defaultOrientation,

  // Source Helpers
  bufferSource,
  oscillatorSource,
  streamSource,
  noiseSource,
  spatialSource,

  // Effect Helpers
  gainEffect,
  filterEffect,
  lowpassFilter,
  highpassFilter,
  bandpassFilter,
  reverbEffect,
  delayEffect,
  distortionEffect,
  compressorEffect,
  panEffect,
  eqBand,
  equalizerEffect,

  // Sequencing Helpers
  createNote,
  createPattern,
  createSequence,
  createTrack,

  // MIDI Utilities
  midiToFrequency,
  frequencyToMidi,
  noteNameToMidi,
  midiToNoteName,

  // Implementation
  createAudioContext,
  createSequencer,
  AudioContextImpl,
  SequencerImpl,
} from '../audio';

// ============================================================================
// Helper Type Tests
// ============================================================================

describe('Audio Helper Types', () => {
  describe('zeroVector', () => {
    it('should return vector with all zeros', () => {
      const v = zeroVector();
      expect(v.x).toBe(0);
      expect(v.y).toBe(0);
      expect(v.z).toBe(0);
    });
  });

  describe('defaultOrientation', () => {
    it('should return forward facing -Z, up Y', () => {
      const o = defaultOrientation();
      expect(o.forward).toEqual({ x: 0, y: 0, z: -1 });
      expect(o.up).toEqual({ x: 0, y: 1, z: 0 });
    });
  });

  describe('AUDIO_DEFAULTS', () => {
    it('should have sensible default values', () => {
      expect(AUDIO_DEFAULTS.masterVolume).toBe(1.0);
      expect(AUDIO_DEFAULTS.sampleRate).toBe(44100);
      expect(AUDIO_DEFAULTS.maxSources).toBeGreaterThan(0);
      expect(AUDIO_DEFAULTS.spatialEnabled).toBe(true);
    });
  });
});

// ============================================================================
// Source Helper Tests
// ============================================================================

describe('Audio Source Helpers', () => {
  describe('bufferSource', () => {
    it('should create buffer source config', () => {
      const source = bufferSource('sfx1', 'sounds/explosion.wav');
      expect(source.id).toBe('sfx1');
      expect(source.type).toBe('buffer');
      expect(source.url).toBe('sounds/explosion.wav');
      expect(source.volume).toBe(1);
    });

    it('should accept optional parameters', () => {
      const source = bufferSource('sfx2', 'sound.wav', { volume: 0.5, loop: true });
      expect(source.volume).toBe(0.5);
      expect(source.loop).toBe(true);
    });
  });

  describe('oscillatorSource', () => {
    it('should create oscillator source config', () => {
      const source = oscillatorSource('osc1', 'sine', 440);
      expect(source.id).toBe('osc1');
      expect(source.type).toBe('oscillator');
      expect(source.oscillatorType).toBe('sine');
      expect(source.frequency).toBe(440);
    });

    it('should support different waveforms', () => {
      const square = oscillatorSource('o1', 'square', 220);
      const saw = oscillatorSource('o2', 'sawtooth', 330);
      expect(square.oscillatorType).toBe('square');
      expect(saw.oscillatorType).toBe('sawtooth');
    });
  });

  describe('streamSource', () => {
    it('should create stream source config', () => {
      const source = streamSource('stream1', 'http://radio.example.com/live');
      expect(source.id).toBe('stream1');
      expect(source.type).toBe('stream');
      expect(source.url).toBe('http://radio.example.com/live');
    });
  });

  describe('noiseSource', () => {
    it('should create noise source config', () => {
      const white = noiseSource('n1', 'white');
      const pink = noiseSource('n2', 'pink');
      expect(white.noiseType).toBe('white');
      expect(pink.noiseType).toBe('pink');
    });
  });

  describe('spatialSource', () => {
    it('should add spatial properties to source', () => {
      const base = bufferSource('s1', 'sound.wav');
      const spatial = spatialSource(base, { x: 10, y: 0, z: -5 });
      expect(spatial.spatial).toBe(true);
      expect(spatial.position).toEqual({ x: 10, y: 0, z: -5 });
    });
  });
});

// ============================================================================
// Effect Helper Tests
// ============================================================================

describe('Audio Effect Helpers', () => {
  describe('gainEffect', () => {
    it('should create gain effect', () => {
      const effect = gainEffect('g1', 0.8);
      expect(effect.id).toBe('g1');
      expect(effect.type).toBe('gain');
      expect(effect.gain).toBe(0.8);
    });
  });

  describe('filterEffect', () => {
    it('should create filter effect', () => {
      const effect = filterEffect('f1', 'lowpass', 1000);
      expect(effect.type).toBe('filter');
      expect(effect.filterType).toBe('lowpass');
      expect(effect.frequency).toBe(1000);
    });
  });

  describe('filter shortcuts', () => {
    it('should create lowpass filter', () => {
      const lp = lowpassFilter('lp1', 2000, 1);
      expect(lp.filterType).toBe('lowpass');
      expect(lp.frequency).toBe(2000);
      expect(lp.Q).toBe(1);
    });

    it('should create highpass filter', () => {
      const hp = highpassFilter('hp1', 500);
      expect(hp.filterType).toBe('highpass');
      expect(hp.frequency).toBe(500);
    });

    it('should create bandpass filter', () => {
      const bp = bandpassFilter('bp1', 1000, 2);
      expect(bp.filterType).toBe('bandpass');
      expect(bp.frequency).toBe(1000);
    });
  });

  describe('reverbEffect', () => {
    it('should create reverb effect', () => {
      const reverb = reverbEffect('rev1', 2.0, 0.5);
      expect(reverb.type).toBe('reverb');
      expect(reverb.decay).toBe(2.0);
      expect(reverb.wet).toBe(0.5);
    });
  });

  describe('delayEffect', () => {
    it('should create delay effect', () => {
      const delay = delayEffect('del1', 0.25, 0.5);
      expect(delay.type).toBe('delay');
      expect(delay.time).toBe(0.25);
      expect(delay.feedback).toBe(0.5);
    });
  });

  describe('distortionEffect', () => {
    it('should create distortion effect', () => {
      const dist = distortionEffect('dist1', 50);
      expect(dist.type).toBe('distortion');
      expect(dist.amount).toBe(50);
    });
  });

  describe('compressorEffect', () => {
    it('should create compressor effect', () => {
      const comp = compressorEffect('comp1', -24, 4, 5, 100);
      expect(comp.type).toBe('compressor');
      expect(comp.threshold).toBe(-24);
      expect(comp.ratio).toBe(4);
    });
  });

  describe('panEffect', () => {
    it('should create pan effect', () => {
      const left = panEffect('panL', -1);
      const right = panEffect('panR', 1);
      expect(left.pan).toBe(-1);
      expect(right.pan).toBe(1);
    });
  });

  describe('equalizerEffect', () => {
    it('should create EQ with bands', () => {
      const bands = [
        eqBand(100, 0.7, 3),
        eqBand(1000, 1, -2),
        eqBand(10000, 0.7, 1),
      ];
      const eq = equalizerEffect('eq1', bands);
      expect(eq.type).toBe('equalizer');
      expect(eq.bands).toHaveLength(3);
      expect(eq.bands[0].frequency).toBe(100);
    });
  });
});

// ============================================================================
// MIDI Utility Tests
// ============================================================================

describe('MIDI Utilities', () => {
  describe('midiToFrequency', () => {
    it('should convert A4 (69) to 440Hz', () => {
      expect(midiToFrequency(69)).toBeCloseTo(440, 2);
    });

    it('should convert C4 (60) correctly', () => {
      expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
    });

    it('should handle octave relationships', () => {
      const f60 = midiToFrequency(60);
      const f72 = midiToFrequency(72);
      expect(f72 / f60).toBeCloseTo(2, 4); // octave = 2x frequency
    });
  });

  describe('frequencyToMidi', () => {
    it('should convert 440Hz to 69', () => {
      expect(frequencyToMidi(440)).toBe(69);
    });

    it('should round to nearest MIDI note', () => {
      expect(frequencyToMidi(442)).toBe(69);
      expect(frequencyToMidi(460)).toBe(70);
    });
  });

  describe('noteNameToMidi', () => {
    it('should convert note names to MIDI', () => {
      expect(noteNameToMidi('C4')).toBe(60);
      expect(noteNameToMidi('A4')).toBe(69);
      expect(noteNameToMidi('C5')).toBe(72);
    });

    it('should handle sharps', () => {
      expect(noteNameToMidi('C#4')).toBe(61);
      expect(noteNameToMidi('F#4')).toBe(66);
    });

    it('should handle flats', () => {
      expect(noteNameToMidi('Bb3')).toBe(58);
      expect(noteNameToMidi('Eb4')).toBe(63);
    });
  });

  describe('midiToNoteName', () => {
    it('should convert MIDI to note names', () => {
      expect(midiToNoteName(60)).toBe('C4');
      expect(midiToNoteName(69)).toBe('A4');
    });

    it('should use sharps by default', () => {
      expect(midiToNoteName(61)).toBe('C#4');
    });
  });
});

// ============================================================================
// Sequencing Helper Tests
// ============================================================================

describe('Sequencing Helpers', () => {
  describe('createNote', () => {
    it('should create note with defaults', () => {
      const note = createNote(60, 0, 0.5);
      expect(note.pitch).toBe(60);
      expect(note.start).toBe(0);
      expect(note.duration).toBe(0.5);
      expect(note.velocity).toBe(100);
    });

    it('should accept custom velocity', () => {
      const note = createNote(64, 1, 1, 80);
      expect(note.velocity).toBe(80);
    });
  });

  describe('createPattern', () => {
    it('should create pattern with notes', () => {
      const notes = [createNote(60, 0, 0.5), createNote(64, 0.5, 0.5)];
      const pattern = createPattern('pat1', notes);
      expect(pattern.id).toBe('pat1');
      expect(pattern.notes).toHaveLength(2);
    });

    it('should set bars and beats per bar', () => {
      const pattern = createPattern('pat2', [], { bars: 4, beatsPerBar: 3 });
      expect(pattern.bars).toBe(4);
      expect(pattern.beatsPerBar).toBe(3);
    });
  });

  describe('createSequence', () => {
    it('should create sequence with patterns', () => {
      const seq = createSequence('seq1', ['pat1', 'pat2'], ['track1']);
      expect(seq.id).toBe('seq1');
      expect(seq.patternOrder).toEqual(['pat1', 'pat2']);
      expect(seq.tracks).toEqual(['track1']);
    });

    it('should set BPM', () => {
      const seq = createSequence('seq2', [], [], { bpm: 140 });
      expect(seq.bpm).toBe(140);
    });
  });

  describe('createTrack', () => {
    it('should create track with patterns', () => {
      const track = createTrack('track1', ['pat1']);
      expect(track.id).toBe('track1');
      expect(track.patterns).toEqual(['pat1']);
    });

    it('should accept volume and pan', () => {
      const track = createTrack('track2', [], { volume: 0.8, pan: -0.5 });
      expect(track.volume).toBe(0.8);
      expect(track.pan).toBe(-0.5);
    });
  });
});

// ============================================================================
// AudioContext Tests
// ============================================================================

describe('AudioContext', () => {
  let ctx: AudioContextImpl;

  beforeEach(() => {
    ctx = new AudioContextImpl();
  });

  afterEach(() => {
    ctx.dispose();
  });

  describe('lifecycle', () => {
    it('should start in suspended state', () => {
      expect(ctx.state).toBe('suspended');
    });

    it('should initialize to running state', async () => {
      await ctx.initialize();
      expect(ctx.state).toBe('running');
    });

    it('should suspend and resume', async () => {
      await ctx.initialize();
      await ctx.suspend();
      expect(ctx.state).toBe('suspended');
      await ctx.resume();
      expect(ctx.state).toBe('running');
    });

    it('should dispose cleanly', async () => {
      await ctx.initialize();
      ctx.dispose();
      expect(ctx.state).toBe('closed');
    });
  });

  describe('master volume', () => {
    it('should set master volume', () => {
      ctx.setMasterVolume(0.5);
      expect(ctx.getMasterVolume()).toBe(0.5);
    });

    it('should clamp volume to 0-1 range', () => {
      ctx.setMasterVolume(-0.5);
      expect(ctx.getMasterVolume()).toBe(0);
      ctx.setMasterVolume(1.5);
      expect(ctx.getMasterVolume()).toBe(1);
    });

    it('should mute and unmute', () => {
      ctx.setMasterVolume(0.8);
      ctx.mute();
      expect(ctx.getMasterVolume()).toBe(0);
      expect(ctx.isMuted).toBe(true);
      ctx.unmute();
      expect(ctx.getMasterVolume()).toBe(0.8);
      expect(ctx.isMuted).toBe(false);
    });
  });

  describe('listener', () => {
    it('should set listener position', () => {
      ctx.setListenerPosition({ x: 10, y: 5, z: -3 });
      const config = ctx.getListenerConfig();
      expect(config.position).toEqual({ x: 10, y: 5, z: -3 });
    });

    it('should set listener orientation', () => {
      const orientation = { forward: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } };
      ctx.setListenerOrientation(orientation);
      const config = ctx.getListenerConfig();
      expect(config.orientation.forward).toEqual({ x: 1, y: 0, z: 0 });
    });

    it('should set listener velocity', () => {
      ctx.setListenerVelocity({ x: 5, y: 0, z: -2 });
      const config = ctx.getListenerConfig();
      expect(config.velocity).toEqual({ x: 5, y: 0, z: -2 });
    });
  });

  describe('source management', () => {
    it('should create source', async () => {
      const id = await ctx.createSource(bufferSource('s1', 'test.wav'));
      expect(id).toBe('s1');
    });

    it('should get source state', async () => {
      await ctx.createSource(bufferSource('s1', 'test.wav'));
      const state = ctx.getSource('s1');
      expect(state).toBeDefined();
      expect(state!.id).toBe('s1');
      expect(state!.state).toBe('stopped');
    });

    it('should list all sources', async () => {
      await ctx.createSource(bufferSource('s1', 'a.wav'));
      await ctx.createSource(bufferSource('s2', 'b.wav'));
      const sources = ctx.getAllSources();
      expect(sources).toHaveLength(2);
    });

    it('should remove source', async () => {
      await ctx.createSource(bufferSource('s1', 'test.wav'));
      expect(ctx.removeSource('s1')).toBe(true);
      expect(ctx.getSource('s1')).toBeUndefined();
    });

    it('should throw on duplicate source id', async () => {
      await ctx.createSource(bufferSource('s1', 'test.wav'));
      await expect(ctx.createSource(bufferSource('s1', 'other.wav'))).rejects.toThrow();
    });
  });

  describe('playback control', () => {
    beforeEach(async () => {
      await ctx.initialize();
      await ctx.createSource(bufferSource('s1', 'test.wav'));
    });

    it('should play source', () => {
      ctx.play('s1');
      const state = ctx.getSource('s1');
      expect(state!.state).toBe('playing');
    });

    it('should stop source', () => {
      ctx.play('s1');
      ctx.stop('s1');
      const state = ctx.getSource('s1');
      expect(state!.state).toBe('stopped');
    });

    it('should pause source', () => {
      ctx.play('s1');
      ctx.pause('s1');
      const state = ctx.getSource('s1');
      expect(state!.state).toBe('paused');
    });

    it('should resume paused source', () => {
      ctx.play('s1');
      ctx.pause('s1');
      ctx.resumeSource('s1');
      const state = ctx.getSource('s1');
      expect(state!.state).toBe('playing');
    });
  });

  describe('source properties', () => {
    beforeEach(async () => {
      await ctx.createSource(bufferSource('s1', 'test.wav'));
    });

    it('should set volume', () => {
      ctx.setVolume('s1', 0.5);
      expect(ctx.getSource('s1')!.volume).toBe(0.5);
    });

    it('should set pitch', () => {
      ctx.setPitch('s1', 1.5);
      expect(ctx.getSource('s1')!.pitch).toBe(1.5);
    });

    it('should set loop', () => {
      ctx.setLoop('s1', true);
      expect(ctx.getSource('s1')!.loop).toBe(true);
    });

    it('should set position', () => {
      ctx.setPosition('s1', { x: 5, y: 0, z: -10 });
      expect(ctx.getSource('s1')!.position).toEqual({ x: 5, y: 0, z: -10 });
    });
  });

  describe('effects', () => {
    it('should create effect', () => {
      const id = ctx.createEffect(gainEffect('g1', 0.8));
      expect(id).toBe('g1');
    });

    it('should get effect', () => {
      ctx.createEffect(reverbEffect('rev1', 2.0, 0.5));
      const effect = ctx.getEffect('rev1');
      expect(effect).toBeDefined();
      expect(effect!.type).toBe('reverb');
    });

    it('should remove effect', () => {
      ctx.createEffect(gainEffect('g1', 0.8));
      expect(ctx.removeEffect('g1')).toBe(true);
      expect(ctx.getEffect('g1')).toBeUndefined();
    });

    it('should connect source to effect', async () => {
      await ctx.createSource(bufferSource('s1', 'test.wav'));
      ctx.createEffect(reverbEffect('rev1', 2.0, 0.5));
      ctx.connectSourceToEffect('s1', 'rev1');
      // No error thrown = success
    });

    it('should disconnect source from effect', async () => {
      await ctx.createSource(bufferSource('s1', 'test.wav'));
      ctx.createEffect(reverbEffect('rev1', 2.0, 0.5));
      ctx.connectSourceToEffect('s1', 'rev1');
      ctx.disconnectSourceFromEffect('s1', 'rev1');
      // No error thrown = success
    });
  });

  describe('groups', () => {
    it('should create group', () => {
      const id = ctx.createGroup({ id: 'music', volume: 0.8 });
      expect(id).toBe('music');
    });

    it('should get group', () => {
      ctx.createGroup({ id: 'sfx', volume: 1.0 });
      const group = ctx.getGroup('sfx');
      expect(group).toBeDefined();
      expect(group!.volume).toBe(1.0);
    });

    it('should set group volume', () => {
      ctx.createGroup({ id: 'music', volume: 1.0 });
      ctx.setGroupVolume('music', 0.5);
      expect(ctx.getGroup('music')!.volume).toBe(0.5);
    });

    it('should mute group', () => {
      ctx.createGroup({ id: 'music', volume: 1.0 });
      ctx.setGroupMuted('music', true);
      expect(ctx.getGroup('music')!.muted).toBe(true);
    });

    it('should solo group', () => {
      ctx.createGroup({ id: 'music', volume: 1.0 });
      ctx.setGroupSolo('music', true);
      expect(ctx.getGroup('music')!.solo).toBe(true);
    });
  });

  describe('buffer management', () => {
    it('should load buffer', async () => {
      const buffer = await ctx.loadBuffer('test.wav');
      expect(buffer).toBeInstanceOf(ArrayBuffer);
    });

    it('should cache buffer', async () => {
      await ctx.loadBuffer('test.wav');
      const cached = ctx.getCachedBuffer('test.wav');
      expect(cached).toBeDefined();
    });

    it('should clear buffer cache', async () => {
      await ctx.loadBuffer('test.wav');
      ctx.clearBufferCache();
      expect(ctx.getCachedBuffer('test.wav')).toBeUndefined();
    });
  });

  describe('events', () => {
    it('should register and emit events', async () => {
      await ctx.initialize();
      const callback = vi.fn();
      ctx.on('sourceStarted', callback);

      await ctx.createSource(bufferSource('s1', 'test.wav'));
      ctx.play('s1');

      expect(callback).toHaveBeenCalled();
    });

    it('should unregister events', () => {
      const callback = vi.fn();
      ctx.on('sourceStarted', callback);
      ctx.off('sourceStarted', callback);

      ctx.emit({ type: 'sourceStarted', timestamp: 0, sourceId: 's1' });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('spatial audio', () => {
    it('should calculate spatial gain based on distance', () => {
      ctx.setListenerPosition({ x: 0, y: 0, z: 0 });

      const nearGain = ctx.calculateSpatialGain({ x: 1, y: 0, z: 0 });
      const farGain = ctx.calculateSpatialGain({ x: 50, y: 0, z: 0 });

      expect(nearGain).toBeGreaterThan(farGain);
    });

    it('should return full gain at reference distance', () => {
      ctx.setListenerPosition({ x: 0, y: 0, z: 0 });
      const gain = ctx.calculateSpatialGain({ x: 0.5, y: 0, z: 0 }); // Within ref distance
      expect(gain).toBe(1.0);
    });
  });
});

// ============================================================================
// Sequencer Tests
// ============================================================================

describe('Sequencer', () => {
  let ctx: AudioContextImpl;
  let seq: SequencerImpl;

  beforeEach(async () => {
    ctx = new AudioContextImpl();
    await ctx.initialize();
    seq = new SequencerImpl(ctx);
  });

  afterEach(() => {
    seq.dispose();
    ctx.dispose();
  });

  describe('lifecycle', () => {
    it('should start in stopped state', () => {
      expect(seq.state).toBe('stopped');
    });

    it('should start playback', () => {
      seq.createSequence(createSequence('seq1', [], []));
      seq.loadSequence('seq1');
      seq.start();
      expect(seq.state).toBe('playing');
    });

    it('should stop playback', () => {
      seq.createSequence(createSequence('seq1', [], []));
      seq.loadSequence('seq1');
      seq.start();
      seq.stop();
      expect(seq.state).toBe('stopped');
    });

    it('should pause playback', () => {
      seq.createSequence(createSequence('seq1', [], []));
      seq.loadSequence('seq1');
      seq.start();
      seq.pause();
      expect(seq.state).toBe('paused');
    });
  });

  describe('transport properties', () => {
    it('should set BPM', () => {
      seq.bpm = 140;
      expect(seq.bpm).toBe(140);
    });

    it('should reject invalid BPM', () => {
      seq.bpm = -50;
      expect(seq.bpm).toBe(120); // Default unchanged
    });

    it('should set swing', () => {
      seq.swing = 0.5;
      expect(seq.swing).toBe(0.5);
    });

    it('should clamp swing to 0-1', () => {
      seq.swing = 1.5;
      expect(seq.swing).toBe(1);
      seq.swing = -0.5;
      expect(seq.swing).toBe(0);
    });

    it('should set loop mode', () => {
      seq.loopMode = 'sequence';
      expect(seq.loopMode).toBe('sequence');
    });

    it('should toggle metronome', () => {
      seq.metronomeEnabled = true;
      expect(seq.metronomeEnabled).toBe(true);
    });

    it('should set count-in bars', () => {
      seq.countInBars = 2;
      expect(seq.countInBars).toBe(2);
    });
  });

  describe('sequence management', () => {
    it('should create sequence', () => {
      const id = seq.createSequence(createSequence('seq1', ['pat1'], ['track1']));
      expect(id).toBe('seq1');
    });

    it('should get sequence', () => {
      seq.createSequence(createSequence('seq1', ['pat1', 'pat2'], ['track1']));
      const s = seq.getSequence('seq1');
      expect(s).toBeDefined();
      expect(s!.patternOrder).toEqual(['pat1', 'pat2']);
    });

    it('should update sequence', () => {
      seq.createSequence(createSequence('seq1', [], []));
      seq.updateSequence('seq1', { bpm: 140 });
      expect(seq.getSequence('seq1')!.bpm).toBe(140);
    });

    it('should remove sequence', () => {
      seq.createSequence(createSequence('seq1', [], []));
      expect(seq.removeSequence('seq1')).toBe(true);
      expect(seq.getSequence('seq1')).toBeUndefined();
    });

    it('should load sequence', () => {
      seq.createSequence(createSequence('seq1', [], []));
      expect(seq.loadSequence('seq1')).toBe(true);
      expect(seq.getCurrentSequence()).toBeDefined();
    });
  });

  describe('pattern management', () => {
    it('should create pattern', () => {
      const notes = [createNote(60, 0, 0.5), createNote(64, 1, 0.5)];
      const id = seq.createPattern(createPattern('pat1', notes));
      expect(id).toBe('pat1');
    });

    it('should get pattern', () => {
      seq.createPattern(createPattern('pat1', [createNote(60, 0, 0.5)]));
      const p = seq.getPattern('pat1');
      expect(p).toBeDefined();
      expect(p!.notes).toHaveLength(1);
    });

    it('should update pattern', () => {
      seq.createPattern(createPattern('pat1', [], { bars: 1 }));
      seq.updatePattern('pat1', { bars: 4 });
      expect(seq.getPattern('pat1')!.bars).toBe(4);
    });

    it('should remove pattern', () => {
      seq.createPattern(createPattern('pat1', []));
      expect(seq.removePattern('pat1')).toBe(true);
    });

    it('should add note to pattern', () => {
      seq.createPattern(createPattern('pat1', []));
      seq.addNoteToPattern('pat1', createNote(67, 2, 0.25));
      expect(seq.getPattern('pat1')!.notes).toHaveLength(1);
    });

    it('should remove note from pattern', () => {
      seq.createPattern(createPattern('pat1', [createNote(60, 0, 0.5)]));
      seq.removeNoteFromPattern('pat1', 0);
      expect(seq.getPattern('pat1')!.notes).toHaveLength(0);
    });

    it('should quantize pattern', () => {
      seq.createPattern(
        createPattern('pat1', [{ pitch: 60, start: 0.12, duration: 0.4, velocity: 100 }])
      );
      seq.quantizePattern('pat1', 4); // Quarter note quantize
      const p = seq.getPattern('pat1');
      expect(p!.notes[0].start).toBeCloseTo(0, 4);
    });
  });

  describe('track management', () => {
    it('should create track', () => {
      const id = seq.createTrack(createTrack('track1', ['pat1']));
      expect(id).toBe('track1');
    });

    it('should get track', () => {
      seq.createTrack(createTrack('track1', ['pat1', 'pat2']));
      const t = seq.getTrack('track1');
      expect(t).toBeDefined();
      expect(t!.patterns).toEqual(['pat1', 'pat2']);
    });

    it('should update track', () => {
      seq.createTrack(createTrack('track1', []));
      seq.updateTrack('track1', { volume: 0.7, pan: -0.3 });
      const t = seq.getTrack('track1');
      expect(t!.volume).toBe(0.7);
      expect(t!.pan).toBe(-0.3);
    });

    it('should remove track', () => {
      seq.createTrack(createTrack('track1', []));
      expect(seq.removeTrack('track1')).toBe(true);
    });

    it('should mute track', () => {
      seq.createTrack(createTrack('track1', []));
      seq.setTrackMuted('track1', true);
      expect(seq.getTrack('track1')!.muted).toBe(true);
    });

    it('should solo track', () => {
      seq.createTrack(createTrack('track1', []));
      seq.setTrackSolo('track1', true);
      expect(seq.getTrack('track1')!.solo).toBe(true);
    });
  });

  describe('timing utilities', () => {
    it('should convert beats to seconds', () => {
      seq.bpm = 120; // 120 BPM = 2 beats per second
      expect(seq.beatsToSeconds(4)).toBeCloseTo(2, 4);
    });

    it('should convert seconds to beats', () => {
      seq.bpm = 120;
      expect(seq.secondsToBeats(2)).toBeCloseTo(4, 4);
    });

    it('should convert bars to seconds', () => {
      seq.bpm = 120; // 4 beats per bar at 120 BPM = 2 seconds per bar
      expect(seq.barsToSeconds(1)).toBeCloseTo(2, 4);
    });

    it('should convert seconds to bars', () => {
      seq.bpm = 120;
      expect(seq.secondsToBars(4)).toBeCloseTo(2, 4);
    });

    it('should get MIDI frequency', () => {
      expect(seq.getMidiFrequency(69)).toBeCloseTo(440, 2);
    });

    it('should convert note name to MIDI', () => {
      expect(seq.getNoteToMidi('C4')).toBe(60);
    });
  });

  describe('transport controls', () => {
    it('should set loop range', () => {
      seq.setLoopRange(4, 8);
      const range = seq.getLoopRange();
      expect(range.start).toBe(4);
      expect(range.end).toBe(8);
    });

    it('should get playback position', () => {
      const pos = seq.getPlaybackPosition();
      expect(pos.beat).toBe(0);
      expect(pos.bar).toBe(0);
      expect(pos.pattern).toBe(0);
    });

    it('should seek to position', () => {
      seq.createSequence(createSequence('seq1', [], []));
      seq.loadSequence('seq1');
      seq.seek(2, 1);
      const pos = seq.getPlaybackPosition();
      expect(pos.beat).toBe(2);
      expect(pos.bar).toBe(1);
    });
  });

  describe('events', () => {
    it('should register event listeners', () => {
      const callback = vi.fn();
      seq.on('sequencerStarted', callback);
      seq.createSequence(createSequence('seq1', [], []));
      seq.loadSequence('seq1');
      seq.start();
      expect(callback).toHaveBeenCalled();
    });

    it('should unregister event listeners', () => {
      const callback = vi.fn();
      seq.on('sequencerStarted', callback);
      seq.off('sequencerStarted', callback);
      seq.createSequence(createSequence('seq1', [], []));
      seq.loadSequence('seq1');
      seq.start();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should register note trigger callbacks', () => {
      const callback = vi.fn();
      seq.onNoteTrigger('track1', callback);
      // Callback registered, no error thrown
    });

    it('should unregister note trigger callbacks', () => {
      const callback = vi.fn();
      seq.onNoteTrigger('track1', callback);
      seq.offNoteTrigger('track1', callback);
      // No error thrown
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
  it('createAudioContext should return AudioContextImpl', () => {
    const ctx = createAudioContext();
    expect(ctx).toBeInstanceOf(AudioContextImpl);
    ctx.dispose();
  });

  it('createSequencer should return SequencerImpl', async () => {
    const ctx = createAudioContext();
    await ctx.initialize();
    const seq = createSequencer(ctx);
    expect(seq).toBeInstanceOf(SequencerImpl);
    seq.dispose();
    ctx.dispose();
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Audio Integration', () => {
  it('should create full audio pipeline', async () => {
    const ctx = createAudioContext();
    await ctx.initialize();

    // Create effects
    ctx.createEffect(reverbEffect('reverb', 2.0, 0.3));
    ctx.createEffect(compressorEffect('comp', -20, 4, 10, 100));

    // Create sources
    await ctx.createSource(spatialSource(bufferSource('ambient', 'forest.wav'), { x: 0, y: 0, z: 0 }));
    await ctx.createSource(bufferSource('music', 'bgm.wav', { loop: true }));

    // Connect effects
    ctx.connectSourceToEffect('music', 'reverb');
    ctx.connectSourceToEffect('music', 'comp');

    // Create groups
    ctx.createGroup({ id: 'music', volume: 0.8 });

    // Play sources
    ctx.play('ambient');
    ctx.play('music');

    expect(ctx.getSource('ambient')!.state).toBe('playing');
    expect(ctx.getSource('music')!.state).toBe('playing');

    ctx.dispose();
  });

  it('should create and run sequencer', async () => {
    const ctx = createAudioContext();
    await ctx.initialize();
    const seq = createSequencer(ctx);

    // Create pattern with notes
    seq.createPattern(
      createPattern('drums', [
        createNote(36, 0, 0.25), // Kick on 1
        createNote(38, 1, 0.25), // Snare on 2
        createNote(36, 2, 0.25), // Kick on 3
        createNote(38, 3, 0.25), // Snare on 4
      ])
    );

    // Create track
    seq.createTrack(createTrack('drums-track', ['drums']));

    // Create sequence
    seq.createSequence(createSequence('main', ['drums'], ['drums-track'], { bpm: 120 }));

    // Load and play
    seq.loadSequence('main');
    seq.bpm = 140;
    seq.start();

    expect(seq.state).toBe('playing');
    expect(seq.bpm).toBe(140);

    seq.dispose();
    ctx.dispose();
  });
});
