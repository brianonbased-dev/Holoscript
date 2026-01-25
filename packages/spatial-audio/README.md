# @holoscript/spatial-audio

**3D positional audio with HRTF and room acoustics for HoloScript VR/AR**

## Features

- 🎧 **HRTF Processing** — Binaural audio with head-related transfer functions
- 🏠 **Room Acoustics** — Reflections, reverb, and occlusion simulation
- 📍 **Spatial Emitters** — 3D positioned audio sources with distance attenuation
- 🎛️ **Audio Zones** — Define regions with different acoustic properties
- 🎮 **VR/AR Ready** — Designed for immersive spatial audio experiences

## Installation

```bash
npm install @holoscript/spatial-audio
```

## Quick Start

```typescript
import { createSpatialAudioContext, createEmitter } from '@holoscript/spatial-audio';

// Create audio context
const ctx = createSpatialAudioContext({
  maxSources: 32,
  enableHRTF: true,
  enableRoomAcoustics: true,
});

// Create a spatial audio emitter
const emitter = createEmitter(ctx, {
  position: { x: 5, y: 1.5, z: -3 },
  maxDistance: 50,
  rolloffFactor: 1.0,
});

// Load and play audio
await emitter.load('ambient-music.mp3');
emitter.play();
```

## HRTF Processing

Enable binaural audio for realistic spatial perception:

```typescript
import { createHRTFProcessor, HRTFDataset } from '@holoscript/spatial-audio';

const hrtfProcessor = createHRTFProcessor({
  enabled: true,
  dataset: HRTFDataset.CIPIC,
  earSeparation: 0.215, // meters
  interpolation: HRTFInterpolation.SphericalHarmonics,
});

// Process audio with HRTF
hrtfProcessor.setSourcePosition({ x: 2, y: 0, z: -1 });
hrtfProcessor.processAudio(audioBuffer);
```

## Room Acoustics

Simulate realistic room acoustics:

```typescript
import { createRoomAcoustics, RoomAcousticsManager } from '@holoscript/spatial-audio';

const room = createRoomAcoustics({
  dimensions: { x: 10, y: 3, z: 8 }, // Room size in meters
  materials: {
    walls: { absorption: 0.3, diffusion: 0.5 },
    floor: { absorption: 0.1, diffusion: 0.2 },
    ceiling: { absorption: 0.4, diffusion: 0.6 },
  },
});

// Enable features
room.enableReflections();
room.enableReverb();
room.enableOcclusion();
```

## Audio Zones

Define regions with distinct acoustic properties:

```typescript
import { createZoneManager } from '@holoscript/spatial-audio';

const zones = createZoneManager();

// Define a concert hall zone
zones.addZone({
  id: 'concert-hall',
  bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 50, y: 20, z: 30 } },
  reverb: { decay: 2.5, wetMix: 0.7 },
  ambient: 'crowd-ambience.mp3',
});

// Define an outdoor zone
zones.addZone({
  id: 'outdoor',
  bounds: { min: { x: -100, y: 0, z: -100 }, max: { x: 100, y: 50, z: 100 } },
  reverb: { decay: 0.1, wetMix: 0.1 },
});
```

## Emitter Management

Manage multiple audio sources efficiently:

```typescript
import { createEmitterManager } from '@holoscript/spatial-audio';

const manager = createEmitterManager(ctx);

// Create emitters for game objects
const npcVoice = manager.createEmitter('npc-1', {
  position: { x: 10, y: 1.6, z: 5 },
  maxDistance: 20,
});

const ambientSound = manager.createEmitter('ambient', {
  position: { x: 0, y: 5, z: 0 },
  isLooping: true,
});

// Update listener position (player)
manager.updateListener({
  position: { x: 0, y: 1.6, z: 0 },
  forward: { x: 0, y: 0, z: -1 },
  up: { x: 0, y: 1, z: 0 },
});
```

## Distance Models

Configure how audio attenuates with distance:

```typescript
import { DistanceModel } from '@holoscript/spatial-audio';

const emitter = createEmitter(ctx, {
  distanceModel: DistanceModel.Exponential,
  refDistance: 1,
  maxDistance: 100,
  rolloffFactor: 2.0,
});
```

| Model | Description |
|-------|-------------|
| `Linear` | Linear falloff between ref and max distance |
| `Inverse` | Realistic inverse-square falloff |
| `Exponential` | Steep exponential falloff |

## Integration with HoloScript

Use with `@spatial_audio` trait in `.hsplus` files:

```hsplus
orb speaker @spatial_audio {
  position: [5, 1.5, -3]
  audio_source: "background-music.mp3"
  max_distance: 50
  enable_hrtf: true
  room_acoustics: true
}
```

## API Reference

### Context

- `createSpatialAudioContext(config)` — Create main audio context
- `SpatialAudioContext` — Core context class

### HRTF

- `createHRTFProcessor(config)` — Create HRTF processor
- `HRTFProcessor` — Binaural processing class

### Room Acoustics

- `createRoomAcoustics(config)` — Create room acoustics manager
- `ReflectionCalculator` — Calculate early reflections
- `ReverbProcessor` — Late reverb processing
- `OcclusionProcessor` — Audio occlusion

### Emitters

- `createEmitter(ctx, config)` — Create spatial audio source
- `createEmitterManager(ctx)` — Manage multiple emitters
- `createZoneManager()` — Manage acoustic zones

## Types

```typescript
import type {
  Vec3,
  SpatialAudioConfig,
  HRTFConfig,
  RoomConfig,
  AudioSourceState,
  ListenerConfig,
} from '@holoscript/spatial-audio';
```

## License

MIT © Brian Joseph
