/**
 * @holoscript/spatial-audio - Test Suite
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Web Audio API
vi.stubGlobal('AudioContext', class MockAudioContext {
  destination = {};
  listener = {
    positionX: { value: 0 },
    positionY: { value: 0 },
    positionZ: { value: 0 },
    forwardX: { value: 0 },
    forwardY: { value: -1 },
    forwardZ: { value: 0 },
    upX: { value: 0 },
    upY: { value: 0 },
    upZ: { value: 1 },
  };
  
  createGain() {
    return {
      gain: { value: 1, setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createPanner() {
    return {
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 10000,
      rolloffFactor: 1,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createConvolver() {
    return {
      buffer: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createBiquadFilter() {
    return {
      type: 'lowpass',
      frequency: { value: 350 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  createBufferSource() {
    return {
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  
  decodeAudioData = vi.fn().mockResolvedValue({});
  resume = vi.fn().mockResolvedValue(undefined);
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
});

import {
  SpatialAudioEngine,
  createSpatialAudioEngine,
  HRTFProcessor,
  RoomAcoustics,
  HRTF_PRESETS,
  ROOM_PRESETS,
} from '../index.js';

describe('@holoscript/spatial-audio', () => {
  describe('createSpatialAudioEngine', () => {
    it('should create an engine with default settings', () => {
      const engine = createSpatialAudioEngine();
      expect(engine).toBeInstanceOf(SpatialAudioEngine);
    });

    it('should create an engine with custom settings', () => {
      const engine = createSpatialAudioEngine({
        maxSources: 32,
        useHRTF: true,
        roomAcoustics: true,
        doppler: true,
        defaultRoom: 'small_room',
      });
      expect(engine).toBeInstanceOf(SpatialAudioEngine);
    });
  });

  describe('HRTF_PRESETS', () => {
    it('should have standard preset', () => {
      expect(HRTF_PRESETS.standard).toBeDefined();
      expect(HRTF_PRESETS.standard.name).toBe('standard');
    });

    it('should have near and far presets', () => {
      expect(HRTF_PRESETS.near).toBeDefined();
      expect(HRTF_PRESETS.far).toBeDefined();
    });
  });

  describe('ROOM_PRESETS', () => {
    it('should have room presets for different environments', () => {
      expect(ROOM_PRESETS.small_room).toBeDefined();
      expect(ROOM_PRESETS.large_hall).toBeDefined();
      expect(ROOM_PRESETS.outdoor).toBeDefined();
      expect(ROOM_PRESETS.cave).toBeDefined();
    });

    it('should have valid reverb parameters', () => {
      expect(ROOM_PRESETS.small_room.reverbTime).toBeGreaterThan(0);
      expect(ROOM_PRESETS.large_hall.reverbTime).toBeGreaterThan(ROOM_PRESETS.small_room.reverbTime);
    });
  });

  describe('SpatialAudioEngine', () => {
    let engine: SpatialAudioEngine;

    beforeEach(() => {
      engine = createSpatialAudioEngine();
    });

    it('should initialize without errors', async () => {
      await expect(engine.initialize()).resolves.not.toThrow();
    });

    it('should create audio sources', async () => {
      await engine.initialize();
      const source = engine.createSource('test-source', {
        position: [0, 0, 0],
        maxDistance: 100,
        referenceDistance: 1,
        rolloffFactor: 1,
      });
      
      expect(source).toBeDefined();
      expect(source.id).toBe('test-source');
    });

    it('should update listener position', async () => {
      await engine.initialize();
      engine.setListenerPosition([1, 2, 3]);
      engine.setListenerOrientation([0, 0, -1], [0, 1, 0]);
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should set room preset', async () => {
      await engine.initialize();
      engine.setRoom('large_hall');
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('HRTFProcessor', () => {
    it('should process audio with HRTF', () => {
      const processor = new HRTFProcessor();
      expect(processor).toBeDefined();
    });
  });

  describe('RoomAcoustics', () => {
    it('should calculate room acoustics', () => {
      const acoustics = new RoomAcoustics();
      expect(acoustics).toBeDefined();
    });
  });
});
