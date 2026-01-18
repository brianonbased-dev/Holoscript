# HoloScript

**Write less code. Build more.**

A declarative language that compiles to 9 platforms from one source.

> 💬 **Talk or type to build.** Powered by [Infinity Assistant](https://infinityassistant.io).
>
> - 🥽 **VR:** "Create a coffee shop with a counter and menu board"
> - 🌍 **VRR:** "Scan my storefront and make it a virtual showroom"
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

## Why HoloScript?

| Before | After |
|--------|-------|
| 9 separate codebases | 1 HoloScript file |
| ~50,000 lines across platforms | ~500 lines |
| Months of maintenance | Build once, deploy everywhere |

**Real result:** We reduced our own service codebase by **90%** using HoloScript.

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

- **9 VR Traits** - `@grabbable`, `@throwable`, `@pointable`, `@hoverable`, `@scalable`, `@rotatable`, `@stackable`, `@snappable`, `@breakable`
- **Reactive State** - `@state { count: 0 }` with automatic updates
- **TypeScript Interop** - `@import "./logic.ts"`
- **Voice Commands** - Build by speaking
- **AI Building** - Natural language to code via [infinityassistant.io](https://infinityassistant.io)

## Packages

| Package | What it does |
|---------|--------------|
| `@holoscript/core` | Parser, runtime, types |
| `@holoscript/cli` | Command line tools |
| `@holoscript/infinityassistant` | AI building client |
| `@holoscript/creator-tools` | Visual editors |

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
| Flutter | ✅ |
| iOS (SwiftUI) | ✅ |
| Android (Jetpack) | ✅ |
| Electron | ✅ |
| Tauri | ✅ |

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

## Ecosystem

- **[Hololand](https://github.com/brianonbased-dev/Hololand)** - VR/AR platform built on HoloScript
- **[Infinity Assistant](https://infinityassistant.io)** - AI-powered building and deployment

## CLI

```bash
npm install -g @holoscript/cli

holoscript run app.hs       # Run a file
holoscript parse app.hs     # Show AST
holoscript repl             # Interactive mode
```

## Contributing

MIT license. PRs welcome.

```bash
git clone https://github.com/brianonbased-dev/HoloScript.git
cd HoloScript
pnpm install
pnpm build
pnpm test
```

## License

MIT - Use it anywhere, for anything.

---

**Questions?** Open an issue or visit [infinityassistant.io](https://infinityassistant.io)
