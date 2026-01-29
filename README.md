# HoloScript

**Write less code. Build more.**

A declarative, open-source language that compiles to 9 platforms from one source.

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="MIT License"></a>
  <a href="https://www.npmjs.com/package/@holoscript/core"><img src="https://img.shields.io/npm/v/@holoscript/core?style=for-the-badge&label=core" alt="npm"></a>
  <a href="#-vrchat-alpha"><img src="https://img.shields.io/badge/VRChat_Alpha-NOW_AVAILABLE-ff6600?style=for-the-badge" alt="VRChat Alpha"></a>
</p>

<p align="center">
  <img src="docs/assets/gifs/holoscript-compile-demo.gif" alt="HoloScript compiling to multiple platforms" width="650">
  <br>
  <em>One file → Web, VR, AR, iOS, Android, Desktop</em>
</p>

---

## 📁 File Types

| Format | What | When |
|--------|------|------|
| `.holo` | Graph | Worlds, agents, UI, objects, events |
| `.hsplus` | Code | Systems, networking, behaviors |

**.holo** — Worlds, agents, UI panels, traits, dialogue, AR anchors, templates  
**.hsplus** — Game systems, networking, physics, procedural generation

**Both AI-writable.** Use together.

---

> 💬 **Talk or type to build.** Powered by [Infinity Assistant](https://infinityassistant.io).
>
> - 🥽 **VR:** "Create a coffee shop with a counter and menu board"
> - 🌍 **VRR (Virtual Reality Reality):** "Scan my storefront and make it a virtual showroom" *(coming soon)*
> - 📱 **AR:** "Place a 3D model of this chair in my living room"

```holoscript
form#login @grabbable {
  input#email { placeholder: "Email" }
  input#password { type: "password" }
  button#submit { 
    text: "Sign In"
    @on_click: () -> { await api.login() }
  }
}
```

One component. Runs on **Web, VR, AR, iOS, Android, Desktop**. No rewrites.

**Real result:** We reduced our own service codebase by **90%** using HoloScript.

## Why HoloScript?

HoloScript stands alone as a purpose-built language for spatial computing, rather than a library or wrapper.

- **Multi-Target Compilation:** Write once, compile to R3F, WebGPU, native Quest/Vision Pro, or server-side simulations.
- **AI-Native Design:** Constrained grammar leads to higher LLM accuracy and fewer hallucinations.
- **Compiler Optimizations:** Spatial semantics allow for automatic LOD, trait fusion, and dead environment culling.
- **SQL of Spatial Computing:** A declarative standard that any tool can target, renderer-agnostic and platform-independent.
- **Future-Proof:** Runtime independence means your code survives even if the underlying rendering framework changes.

[**Read the full vision: Why HoloScript?**](./docs/WHY_HOLOSCRIPT.md)

## 🚀 What's New (January 2026)

### 🔊 Spatial Audio
`@holoscript/spatial-audio` — 3D positional audio with HRTF and room acoustics. Perfect for immersive VR experiences.

### 🔄 State Sync
`@holoscript/state-sync` — CRDTs for multiplayer. Conflict-free data structures that automatically merge across peers.

### 📦 Asset Streaming
`@holoscript/streaming` — Progressive loading, LOD streaming, and smart caching for large VR worlds.

### 🤖 AI Integration
- **Brittney MCP** — Full integration with Quantum MCP Mesh Orchestrator for high-fidelity generation.
- **Claude Desktop/Code** — `.claude/settings.json` pre-configured
- **GitHub Copilot** — `.github/copilot-instructions.md` with MCP guidance

### 🧠 Run Locally (GGUF)
To run Brittney locally for free inference:
1.  Download the **[.GGUF Model](https://huggingface.co/brianonbased-dev/brittney-v4-expert)**.
2.  Load into Ollama: `ollama run brittney-v4-expert`
3.  Configure `HoloScript MCP` to use local endpoint.

### ⚡ Unified Event System
`@holoscript/events` — Global Event Bubbling and Physics-Haptics bridging.

## 📚 Guides
- **[Best Practices Guide](./docs/guides/best-practices.md)** — 10 Rules for Ergonomics & Performance (New!)
- [VRChat Export](./docs/integration/VRCHAT_UNITY_GUIDE.md) — Export to Udon

## Install

```bash
npm install @holoscript/core
```

## Quick Start

```typescript
import { HoloScriptPlusParser } from '@holoscript/core';

const parser = new HoloScriptPlusParser();
const result = parser.parse(`
  orb#sphere @grabbable @throwable {
    color: "#00ffff"
    glow: true
  }
`);
```

## Features

### 🕹️ Trait System (157 traits across 18 domains)

| Domain | Example Traits |
|--------|----------------|
| **Interaction** | `@grabbable`, `@throwable`, `@pointable`, `@stretchable`, `@moldable`, `@haptic` |
| **Humanoid/Avatar** | `@skeleton`, `@body`, `@face`, `@expressive`, `@hair`, `@clothing`, `@hands` |
| **Spatial** | `@plane_detection`, `@mesh_detection`, `@anchor`, `@persistent_anchor`, `@geospatial`, `@occlusion` |
| **Input Modality** | `@eye_tracking`, `@hand_tracking`, `@controller`, `@spatial_accessory` |
| **Accessibility** | `@accessible`, `@alt_text`, `@spatial_audio_cue`, `@sonification`, `@subtitle` |
| **Compute & GPU** | `@compute`, `@gpu_particle`, `@gpu_physics`, `@gpu_buffer` |
| **Autonomous Agents** | `@behavior_tree`, `@goal_oriented`, `@llm_agent`, `@memory`, `@perception` |
| **Animation/Phys** | `@cloth`, `@fluid`, `@soft_body`, `@destruction`, `@rigidbody`, `@joint`, `@ik` |
| **Social/Multi** | `@co_located`, `@remote_presence`, `@shared_world`, `@voice_proximity` |
| **Web3 & Ownership** | `@nft`, `@token_gated`, `@wallet`, `@marketplace`, `@portable` |
| **Audio** | `@ambisonics`, `@hrtf`, `@reverb_zone`, `@audio_occlusion`, `@spatial_audio` |
| **State & Logic** | `@state`, `@reactive`, `@observable`, `@computed`, `@synced`, `@persistent` |

### 🛠️ Language Features
- **@world Configuration** - Declarative scene setup in `.hsplus` files
- **Scale Magnitude** - Build from `galactic` to `atomic` scale with seamless transitions
- **Reactive State** - `@state { count: 0 }` with automatic updates
- **Control Flow** - `@for`, `@if`, `while`, `forEach`, `on_break` loops
- **Expression Interpolation** - `${variable}` in strings and properties
- **Module System** - `@import "./other.hsplus"` for code organization
- **Native Game Logic** - `@npc "Name" { ... }` and `@dialog` definitions
- **TypeScript Interop** - Export and import between `.hsplus` and `.ts`

### 🧰 Tooling
- **LSP Support** - Full IDE integration with completions, hover, and diagnostics
- **Voice Commands** - Build by speaking (Web Speech API)
- **AI Building** - Natural language to code via [infinityassistant.io](https://infinityassistant.io)
- **MCP Server** - AI agents can create and manage VR worlds

## Packages

### Core Language (This Repo)

| Package | Version | What it does | Status |
|---------|---------|--------------|--------|
| `@holoscript/core` | 2.1.0 | Parser, runtime, types, trait definitions | ✅ |
| `@holoscript/runtime` | 2.1.0 | Execution engine | ✅ |
| `@holoscript/cli` | 2.1.0 | Command line tools | ✅ |
| `@holoscript/formatter` | 2.0.0 | Code formatting | ✅ |
| `@holoscript/linter` | 2.0.0 | Static analysis | ✅ |
| `@holoscript/lsp` | 1.0.0 | Language Server Protocol | ✅ |
| `@holoscript/std` | 1.0.0 | Standard library | ✅ |
| `@holoscript/fs` | 1.0.0 | File system utilities | ✅ |

### Migrated to Hololand (Jan 2026)

The following runtime/platform packages have been migrated to the [Hololand](https://github.com/brianonbased-dev/Hololand) repo where they belong as platform services. The HoloScript versions are deprecated.

| Former Package | Migrated To | Migration Type |
|---------------|-------------|----------------|
| `@holoscript/network` | `@hololand/network` | Merged (transports) |
| `@holoscript/multiplayer` | `@hololand/network` | Merged (player sync) |
| `@holoscript/state-sync` | `@hololand/network` | Merged (CRDT sync) |
| `@holoscript/spatial-audio` | `@hololand/audio` | Merged (spatial traits) |
| `@holoscript/streaming` | `@hololand/streaming` | Moved |
| `@holoscript/gpu` | `@hololand/renderer` | Merged (GPU compute) |
| `@holoscript/ik` | `@hololand/animation` | Merged (IK solvers) |
| `@holoscript/physics-joints` | `@hololand/world` | Merged (joints/ragdoll) |
| `@holoscript/haptics` | `@hololand/haptics` | Moved |
| `@holoscript/navigation` | `@hololand/navigation` | Moved |
| `@holoscript/pcg` | `@hololand/pcg` | Moved |
| `@holoscript/portals` | `@hololand/portals` | Moved |
| `@holoscript/accessibility` | `@hololand/accessibility` | Moved |
| `@holoscript/lod` | `@hololand/lod` | Moved |
| `@holoscript/voice` | `@hololand/voice` | Moved |
| `@holoscript/gestures` | `@hololand/gestures` | Moved |
| `@holoscript/llm` | `@hololand/ai` | Merged (LLM inference) |

### Platform Adapters ([Hololand Repo](https://github.com/brianonbased-dev/Hololand))

| Package | What it does | Status |
|---------|--------------|--------|
| `@hololand/three-adapter` | Three.js 3D world + physics + audio | ✅ |
| `@hololand/babylon-adapter` | Babylon.js 3D world | ✅ |
| `@hololand/playcanvas-adapter` | PlayCanvas 3D world | ✅ |
| `@hololand/unity-adapter` | Unity C# + XR export | ✅ |
| `@hololand/vrchat-export` | VRChat/UdonSharp export | 🟡 *alpha* |
| `@hololand/creator-tools` | Visual editors | ✅ |

## 🌐 Three.js World Integration

> **NEW!** Run HoloScript directly in Three.js with full VR/XR support.

```bash
npm install @hololand/three-adapter three
```

```typescript
import { createWorld } from '@hololand/three-adapter';

const world = createWorld({
  container: document.getElementById('app')!,
  xrEnabled: true,
});

// Load from .hsplus files
await world.loadFile('/scenes/main.hsplus');
world.start();
```

**Declarative world config with `@world` trait:**

```hsplus
@world {
  backgroundColor: "#16213e"
  fog: { type: "linear", color: "#16213e", near: 10, far: 100 }
  shadows: "high"
  lighting: "outdoor"
  camera: { position: [0, 2, 10], fov: 60 }
}

orb#player @grabbable {
  position: [0, 1, 0]
  color: "#00ffff"
}
```

**Three loading patterns:**

```typescript
// 1. Load single file
await world.loadFile('/scenes/main.hsplus');

// 2. Auto-load index.hsplus from directory
await world.loadDirectory('/scenes/level1');

// 3. Load from config manifest
await world.loadConfig('/project/holoscript.config.hsplus');
```

---

## 🌐 Multiplayer Networking

> **NEW!** Sync `@networked` entities across clients with WebSocket/WebRTC.

```bash
npm install @hololand/network
```

```typescript
import { createNetworkManager } from '@hololand/network';

const network = createNetworkManager();

// Connect to a multiplayer session
const roomId = await network.connect({
  serverUrl: 'wss://your-server.com',
  transport: 'websocket', // or 'webrtc'
  syncRate: 20,
});

// Register networked entities
const networkId = network.registerEntity(playerMesh, 'player', {
  sync: 'owner',
  properties: ['position', 'rotation'],
});

// Listen for remote events
network.on('peerJoined', (event) => {
  console.log('Player joined:', event.peer.peerId);
});

network.on('entitySpawned', (event) => {
  // Create visual for remote entity
  createRemotePlayer(event.entity);
});
```

**HoloScript+ `@networked` trait:**

```hsplus
orb#player @networked @grabbable {
  position: [0, 1, 0]
  color: "#00ffff"
}

cube#shared_object @networked { sync: "shared" } {
  position: [5, 0, 0]
}
```

**Example signaling server included** in `examples/network-server/`.

---

## 🎮 VRChat Alpha

> **NEW!** Export HoloScript directly to VRChat worlds. Write once, deploy to VRChat.

```bash
npm install @hololand/vrchat-export
```

```holoscript
// Define a VRChat-ready world
world#my_club @vrchat {
  spawn_point: [0, 0, 0]
  max_players: 32
  
  object#dance_floor @grabbable @synced {
    position: [0, 0, 0]
    material: "neon_tiles"
    on_step: trigger_lights()
  }
  
  npc#dj @talkable {
    dialog: "Welcome to the club!"
    animations: ["idle", "wave", "dance"]
  }
}
```

```bash
# Export to VRChat SDK
holoscript export --target vrchat my_world.hsplus

# Output: Unity project with Udon scripts ready for upload
```

**What's included:**
- ✅ Automatic Udon graph generation
- ✅ Synced object state (multiplayer-ready)
- ✅ Trait mapping (`@grabbable` → VRC_Pickup)
- ✅ NPC dialog system with voice support
- 🟡 Custom shaders (coming soon)
- 🟡 Avatar interactions (coming soon)

[📖 VRChat Export Guide](./docs/integration/VRCHAT_UNITY_GUIDE.md) | [🎥 Demo Video](#)

---

## 🧪 Experimental
| Package | Status | Description |
|---------|--------|-------------|
| `@hololand/vrchat-export` | 🎮 **Alpha** | Compile HoloScript to VRChat Udon |
| `@holoscript/commerce` | 🧪 | In-world payments & inventory |

## Build with AI

```typescript
import { InfinityBuilderClient } from '@infinity-assistant/sdk';

const client = new InfinityBuilderClient({ 
  apiKey: process.env.INFINITY_BUILDER_API_KEY 
});

const result = await client.build("Create a login form");
console.log(result.holoScript); // Ready to deploy
```

## Deploy Targets

| Platform | Status |
|----------|--------|
| Web (React/Vue/Angular) | ✅ |
| WebXR (VR) | ✅ |
| WebAR | ✅ |
| React Native | ✅ |
| Flutter | 🟡 *coming soon* |
| iOS (SwiftUI) | 🟡 *coming soon* |
| Android (Jetpack) | 🟡 *coming soon* |
| Electron | ✅ |
| Tauri | 🟡 *coming soon* |

## Examples

```holoscript
// Interactive counter with VR support
component#counter @state { count: 0 } @grabbable {
  p { "Count: ${state.count}" }
  button { 
    text: "+"
    @on_click: () -> { state.count++ }
  }
  
  @on_grab: (hand) -> {
    haptics.pulse(hand, 0.5)
  }
}
```

```holoscript
// Shopping cart
component#cart @state { items: [] } {
  @for item in state.items {
    div.item { ${item.name} - $${item.price} }
  }
  div.total { "Total: $${state.items.reduce((a,b) => a + b.price, 0)}" }
}
```

```holoscript
// Scale magnitude - universe to atom
scale galactic {
  orb#sun { color: "#ffcc00", glow: true }
  orb#earth { position: [50, 0, 0] }
}

focus sun {
  scale atomic {
    orb#nucleus { color: "#ff0000" }
    orb#electron { position: [1, 0, 0], scale: 0.1 }
  }
}
```

## Ecosystem

HoloScript is open source. Infrastructure and platform services are separately licensed:

| Layer | What | License |
|-------|------|---------|
| **HoloScript Core** | Language, parser, 139 traits, 8 compilers, CLI, runtime | MIT |
| **Infrastructure** | Networking, multiplayer, state sync, streaming, LSP, MCP | ELv2 |
| **[Hololand](https://github.com/brianonbased-dev/Hololand)** | VR/AR platform — cloud anchors, asset CDN, marketplace | Commercial |
| **[Infinity Assistant](https://infinityassistant.io)** | AI building — natural language to .holo, agent orchestration | Commercial |

Write `.holo` anywhere for free. Use infrastructure packages in your apps. Deploy on Hololand. Build with Infinity Assistant.

## CLI

```bash
npm install -g @holoscript/cli

holoscript run app.hsplus       # Run a file
holoscript parse app.hsplus     # Show AST
holoscript repl                 # Interactive mode
```

## 🛠️ Tools

### VS Code Extension
The official **HoloScript** extension provides:
- Syntax highlighting for `.holo` and `.hsplus`
- IntelliSense for Traits (`@grabbable`, `@npc`)
- Snippets for common patterns

**Install**: Search "HoloScript" in VS Code Marketplace or install from `.vsix`.

## Contributing

MIT license. PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup and guidelines.

```bash
git clone https://github.com/brianonbased-dev/holoscript.git
cd HoloScript
pnpm install
pnpm build
pnpm test
```

## License

HoloScript is **MIT licensed** — use it anywhere, for anything. See [LICENSE](./LICENSE).

The following packages use the **Elastic License 2.0** (ELv2) — free to use and modify, but cannot be offered as a managed service competing with Hololand or Infinity Assistant:

`@holoscript/lsp` `@holoscript/network` `@holoscript/multiplayer` `@holoscript/state-sync` `@holoscript/streaming` `@holoscript/mcp-server`

All other packages (core, runtime, traits, compilers, CLI, std, etc.) are MIT. See [NOTICE](./NOTICE) for full details.

---

**Questions?** Open an [issue](https://github.com/brianonbased-dev/holoscript/issues) or visit [infinityassistant.io](https://infinityassistant.io)
