# HoloScript

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

**Open source VR/AI-inspired programming language and runtime**

HoloScript is a declarative language for building virtual reality experiences. Code exists as spatial holograms that developers manipulate with voice commands, hand gestures, and spatial reasoning.

## HoloScript+ (NEW)

**Version 1.0** includes HoloScript+, an enhanced version with:

- **9 VR Traits** - `@grabbable`, `@throwable`, `@pointable`, `@hoverable`, `@scalable`, `@rotatable`, `@stackable`, `@snappable`, `@breakable`
- **Reactive State** - `@state { count: 0 }` with automatic UI updates
- **Control Flow** - `@for`, `@if` directives for dynamic content
- **Lifecycle Hooks** - `@on_grab`, `@on_collision`, `@on_mount`, etc.
- **TypeScript Interop** - `@import "./companion.ts"` for advanced logic
- **Expression Interpolation** - `${state.count > 5 ? 'active' : 'inactive'}`

All 100% backward compatible with original HoloScript syntax.

## Features

- **Voice Command Parsing** - Natural language commands like `create orb myOrb`
- **Gesture Recognition** - Hand gestures for object manipulation (pinch, swipe, grab)
- **2D UI Elements** - Define buttons, text inputs, panels, and sliders
- **Spatial Programming** - 3D positioning and connections between code objects
- **AST-based Execution** - Parse HoloScript code into executable Abstract Syntax Trees
- **VR Interactions** (NEW) - Rich hand gestures, haptics, physics-based throwing
- **Reactive State** (NEW) - Fine-grained reactivity with automatic DOM updates

## Packages

| Package | Description |
|---------|-------------|
| [@holoscript/core](./packages/core) | Core parser, runtime, and AST types |
| [@holoscript/cli](./packages/cli) | Command-line interface for HoloScript |
| [@holoscript/infinity-builder-client](./packages/infinity-builder-client) | Client for Infinity Builder service (AI building, agents, component deployment) |

## Quick Start

### Using @holoscript/core (HoloScript+)

```bash
npm install @holoscript/core
```

```typescript
import { HoloScriptPlusParser, HoloScriptPlusRuntime } from '@holoscript/core';

const parser = new HoloScriptPlusParser();
const source = `
  scene {
    orb#myOrb {
      position: [0, 0, -2]
      @grabbable(snap_to_hand: true)
      @hoverable(scale_on_hover: 1.2)
      @throwable(bounce: true)
    }
  }
`;

const result = parser.parse(source);
const runtime = new HoloScriptPlusRuntime(result.ast);
await runtime.mount(document.body);
```

### HoloScript+ Highlights (v1.0.0)

- 9 VR traits: `@grabbable`, `@throwable`, `@pointable`, `@hoverable`, `@scalable`, `@rotatable`, `@stackable`, `@snappable`, `@breakable`
- Reactive state: `@state { ... }`, computed values, lifecycle hooks like `@on_grab`, `@on_collision`
- TypeScript interop: `@import "./companion.ts"` for advanced logic
- Training pipeline examples: see `examples/vr-interactions.hsplus` and Infinity Assistant's Brittney agent (end-to-end VR event logging + export)
- Dual-source model: `@holoscript/core` is canonical; Infinity Assistant maintains an enhanced copy for service-level features

### Using Original HoloScript

```bash
npm install @holoscript/core
```

```typescript
import { HoloScriptParser, HoloScriptRuntime } from '@holoscript/core';

const parser = new HoloScriptParser();
const runtime = new HoloScriptRuntime();

// Parse a voice command
const nodes = parser.parseVoiceCommand({
  command: 'create orb myOrb',
  confidence: 0.95,
  timestamp: Date.now()
});

// Execute the AST
const results = await runtime.executeProgram(nodes);
```

### Using @holoscript/infinity-builder-client

```bash
npm install @holoscript/infinity-builder-client
```

```typescript
import { InfinityBuilderClient } from '@holoscript/infinity-builder-client';

const client = new InfinityBuilderClient({
  apiKey: process.env.INFINITY_BUILDER_API_KEY
});

// Generate HoloScript from natural language
const result = await client.build("Create a cozy living room");
console.log(result.holoScript);

// Spawn an AI assistant in your world
const agent = await client.agents.spawn({
  agentType: 'assistant',
  worldId: 'my-world',
  avatarConfig: {
    displayName: 'Builder Bot',
    appearance: { model: 'humanoid' }
  },
  capabilities: ['chat', 'build-assist']
});

agent.on('message', (msg) => console.log(msg.content));
agent.send('Help me add furniture');
```

## Ecosystem

HoloScript is the open source foundation for VR development:

```text
+------------------+     +------------------+     +------------------------------+
|    HoloScript    | --> |     Hololand     | --> |  Infinity Assistant Service  |
|   (Open Source)  |     | (Elastic 2.0)    |     |      (Public API)            |
|                  |     |                  |     |                              |
|  - Language spec |     |  - Full platform |     |  - HoloScript building       |
|  - Runtime       |     |  - Networking    |     |  - Multi-platform deploy     |
|  - API clients   |     |  - Social        |     |  - AI agents & voice         |
+------------------+     +------------------+     +------------------------------+
```

- **HoloScript** (MIT): Language, runtime, and tooling anyone can use
- **Hololand** (Elastic 2.0): Full metaverse platform built on HoloScript
- **Infinity Assistant** (Public API): Universal app building service with HoloScript + AI

## HoloScript Syntax

### Orbs (Data Objects)

```holoscript
orb greeting {
  message: "Hello, HoloScript World!"
  color: "#00ffff"
  glow: true
}
```

### Functions

```holoscript
function processQuery(query: string): string {
  analyze query
  generate response
  return response
}
```

### Connections

```holoscript
orb inputLayer { neurons: 784 }
orb outputLayer { neurons: 10 }

connect inputLayer to outputLayer as "weights"
```

### Gates (Conditional Logic)

```holoscript
gate isAuthenticated {
  condition: user.loggedIn
  onTrue: showDashboard
  onFalse: showLogin
}
```

### Streams (Data Flow)

```holoscript
stream dataFlow {
  source: apiEndpoint
  through: [validate, transform, cache]
  to: displayComponent
}
```

### 2D UI Elements

```holoscript
button loginBtn {
  text: "Login"
  x: 100
  y: 150
  width: 200
  height: 40
  onClick: handleLogin
}

textinput usernameInput {
  placeholder: "Username"
  x: 100
  y: 50
  width: 200
  height: 36
}
```

## Voice Commands

| Command | Description |
| ------- | ----------- |
| `create orb [name]` | Create a new data orb |
| `summon function [name]` | Create a new function |
| `connect [from] to [to]` | Connect two objects |
| `execute [function]` | Run a function |
| `debug program` | Enter debug mode |
| `visualize [data]` | Display data visualization |
| `gate [condition]` | Create conditional logic |
| `stream [source] through [transforms]` | Create data stream |
| `create button [name]` | Create a 2D button |
| `add textinput [name]` | Add a text input field |

## Gestures

| Gesture | Action |
| ------- | ------ |
| Pinch | Create object |
| Swipe | Connect objects |
| Rotate | Modify properties |
| Grab | Select object |
| Spread | Expand view |
| Fist | Execute action |

## Supported Platforms

- WebXR
- Oculus Quest
- HTC Vive
- Valve Index
- Apple Vision Pro
- Windows Mixed Reality

## API Reference

### HoloScriptParser

```typescript
const parser = new HoloScriptParser();

// Parse voice commands
parser.parseVoiceCommand(command: VoiceCommand): ASTNode[];

// Parse gesture input
parser.parseGesture(gesture: GestureData): ASTNode[];

// Parse HoloScript code
parser.parse(code: string): ASTNode[];

// Get current AST
parser.getAST(): ASTNode[];

// Find node by name
parser.findNode(name: string): ASTNode | null;

// Clear parser state
parser.clear(): void;
```

### HoloScriptRuntime

```typescript
const runtime = new HoloScriptRuntime();

// Execute a program (array of AST nodes)
runtime.executeProgram(nodes: ASTNode[]): Promise<ExecutionResult[]>;

// Execute a single node
runtime.executeNode(node: ASTNode): Promise<ExecutionResult>;

// Get runtime context
runtime.getContext(): RuntimeContext;
```

### HoloScriptCodeParser

```typescript
import { HoloScriptCodeParser } from '@holoscript/core';

const codeParser = new HoloScriptCodeParser();
const result = codeParser.parse(`
  orb myData {
    value: 42
  }
`);

if (result.success) {
  console.log(result.ast);
} else {
  console.error(result.errors);
}
```

## CLI Usage

```bash
# Install CLI globally
npm install -g @holoscript/cli

# Run a HoloScript file
holoscript run script.hs

# Parse and show AST
holoscript parse script.hs --ast

# Interactive REPL
holoscript repl
```

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/HoloScript.git
cd HoloScript

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Contributing

HoloScript is open source under the MIT license. Contributions welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT - see [LICENSE](LICENSE) for details.

---

HoloScript is part of the Hololand ecosystem
