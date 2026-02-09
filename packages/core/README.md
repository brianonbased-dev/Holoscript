# @holoscript/core

Core HoloScript parser, AST, compiler infrastructure, and trait system.

## Installation

```bash
npm install @holoscript/core
```

## Usage

```typescript
// Parse HoloScript+ files (.hsplus)
import { HoloScriptPlusParser } from '@holoscript/core';

const parser = new HoloScriptPlusParser();
const result = parser.parse(source);

// Parse .holo composition files
import { HoloCompositionParser } from '@holoscript/core';

const holoParser = new HoloCompositionParser();
const result = holoParser.parseHolo(source);

// Compile to a specific target
import { UnityCompiler } from '@holoscript/core';

const compiler = new UnityCompiler();
const output = compiler.compile(ast);
```

## Features

- **Multi-format Parser** - Supports `.hs`, `.hsplus`, and `.holo` files
- **Complete AST** - Full abstract syntax tree representation
- **Validation** - Comprehensive error checking with recovery
- **15+ Compile Targets** - Web (R3F, Babylon), Unity, Unreal, Godot, iOS, Android, Vision Pro, WebGPU, WASM, VRChat, OpenXR, URDF, DTDL, SDF
- **1,525+ Traits** - Modularized across 61 category files covering VR interactions, physics, networking, AI, animation, nature, magic, sci-fi, emotions, and more
- **AI Integration** - Adapters for OpenAI, Anthropic, Gemini, Ollama, and more
- **Reactive State** - `reactive()`, `computed()`, `effect()`, `bind()`

## Parsers

| Parser | File Types | Use Case |
|--------|-----------|----------|
| `HoloScriptPlusParser` | `.hsplus` | Extended syntax with TypeScript modules |
| `HoloCompositionParser` | `.holo` | Scene-centric composition files |
| `HoloScript2DParser` | `.hs` | Basic logic and protocols |
| `HoloScriptParser` | `.hs` | Legacy parser |

## Compilers

| Compiler | Target | Status |
|----------|--------|--------|
| `R3FCompiler` | React Three Fiber (Web) | Production |
| `BabylonCompiler` | Babylon.js (Web) | Production |
| `UnityCompiler` | Unity Engine | Production |
| `UnrealCompiler` | Unreal Engine 5 | Production |
| `GodotCompiler` | Godot 4 | Production |
| `IOSCompiler` | iOS / ARKit | Production |
| `AndroidCompiler` | Android / ARCore | Production |
| `VisionOSCompiler` | Apple Vision Pro | Production |
| `WebGPUCompiler` | WebGPU Compute | Production |
| `WASMCompiler` | WebAssembly | Production |
| `VRChatCompiler` | VRChat | Alpha |
| `OpenXRCompiler` | OpenXR Standard | Production |
| `AndroidXRCompiler` | Android XR | Production |
| `URDFCompiler` | Robotics (URDF) | Production |
| `DTDLCompiler` | Digital Twins (DTDL) | Production |
| `SDFCompiler` | SDF Robotics | Production |

## Trait System

VR traits are modularized into 61 category files under `src/traits/constants/`:

| Category        | File                     | Traits                                  |
| --------------- | ------------------------ | --------------------------------------- |
| Core VR         | `core-vr-interaction.ts` | grabbable, throwable, pointable, ...    |
| Humanoid        | `humanoid-avatar.ts`     | skeleton, body, face, ...               |
| Game Mechanics  | `game-mechanics.ts`      | collectible, destructible, healable, .. |
| Magic & Fantasy | `magic-fantasy.ts`       | enchantable, cursed, blessed, ...       |
| Animals         | `animals.ts`             | cat, dog, horse, dragon, ...            |
| ...             | _58 more categories_     | See `src/traits/constants/index.ts`     |

Import individual categories or the combined set:

```typescript
import { VR_TRAITS } from '@holoscript/core';           // All 1,525+ traits
import { AUDIO_TRAITS } from '@holoscript/core';         // Just audio traits
import { MAGIC_FANTASY_TRAITS } from '@holoscript/core'; // Just magic/fantasy
```

## License

MIT
