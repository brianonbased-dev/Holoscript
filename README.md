# HoloScript

**Write less code. Build more.**

A declarative language that compiles to 9 platforms from one source.

<p align="center">
  <a href="#-vrchat-alpha">
    <img src="https://img.shields.io/badge/🎮_VRChat_Alpha-NOW_AVAILABLE-ff6600?style=for-the-badge" alt="VRChat Alpha">
  </a>
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
- [VRChat Export](./docs/VRCHAT_EXPORT.md) — Export to Udon

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

### 🕹️ VR Traits (49 total)
| Category | Traits |
|----------|--------|
| **Interaction** | `@grabbable`, `@throwable`, `@pointable`, `@teleportable` |
| **Spatial** | `@stackable`, `@snappable`, `@rotatable`, `@scaleable` |
| **Animation** | `@skeleton`, `@animation`, `@morph`, `@pose` |
| **Materials** | `@material`, `@lighting`, `@rendering`, `@shader` |
| **Physics** | `@physics`, `@collider`, `@rigidbody`, `@trigger` |
| **AI/NPCs** | `@npc`, `@talkable`, `@patrol`, `@dialog` |

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
| `@holoscript/core` | 2.1.0 | Parser, runtime, types | ✅ |
| `@holoscript/runtime` | 2.1.0 | Execution engine | ✅ |
| `@holoscript/cli` | 2.1.0 | Command line tools | ✅ |
| `@holoscript/formatter` | 2.0.0 | Code formatting | ✅ |
| `@holoscript/linter` | 2.0.0 | Static analysis | ✅ |
| `@holoscript/lsp` | 1.0.0 | Language Server Protocol | ✅ |
| `@holoscript/std` | 1.0.0 | Standard library | ✅ |
| `@holoscript/fs` | 1.0.0 | File system utilities | ✅ |
| `@holoscript/network` | 1.0.0 | Multiplayer networking | ✅ |
| `@holoscript/llm` | 1.0.0 | AI/LLM integration | ✅ |
| `@holoscript/spatial-audio` | 1.0.0 | 3D audio with HRTF & room acoustics | ✅ |
| `@holoscript/state-sync` | 1.0.0 | CRDTs for distributed state | ✅ |
| `@holoscript/streaming` | 1.0.0 | Asset streaming & LOD | ✅ |

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
npm install @holoscript/three-adapter three
```

```typescript
import { createWorld } from '@holoscript/three-adapter';

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
npm install @holoscript/network
```

```typescript
import { createNetworkManager } from '@holoscript/network';

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
npm install @holoscript/vrchat-export
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

[📖 VRChat Export Guide](./docs/VRCHAT_EXPORT.md) | [🎥 Demo Video](#)

---

## 🧪 Experimental
| Package | Status | Description |
|---------|--------|-------------|
| `@holoscript/vrchat-export` | 🎮 **Alpha** | Compile HoloScript to VRChat Udon |
| `@holoscript/commerce` | 🧪 | In-world payments & inventory |
| `@holoscript/llm` | 🧪 | Local LLM inference bindings |

## Build with AI

```typescript
import { InfinityBuilderClient } from '@holoscript/infinityassistant';

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

- **[Hololand](https://github.com/brianonbased-dev/Hololand)** - VR/AR platform built on HoloScript
- **[Infinity Assistant](https://infinityassistant.io)** - AI-powered building and deployment

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

MIT license. PRs welcome.

```bash
git clone https://github.com/brianonbased-dev/holoscript.git
cd HoloScript
pnpm install
pnpm build
pnpm test
```

## License

MIT - Use it anywhere, for anything.

---

**Questions?** Open an issue or visit [infinityassistant.io](https://infinityassistant.io)
