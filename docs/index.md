---
layout: home

hero:
  name: "HoloScript"
  text: "Spatial Programming Language"
  tagline: One source → 9 platforms. Built for humans and AI.
  image:
    src: /logo.svg
    alt: HoloScript
  actions:
    - theme: brand
      text: Get Started
      link: /guides/
    - theme: alt
      text: View on GitHub
      link: https://github.com/brianonbased-dev/holoscript
    - theme: alt
      text: VS Code Extension
      link: https://marketplace.visualstudio.com/items?itemName=holoscript.holoscript-vscode

features:
  - icon: 🌐
    title: Write Once, Deploy Everywhere
    details: Compile to Web, Unity, Unreal, VRChat, iOS, Android, Desktop, and more from a single source.
  - icon: 🤖
    title: AI-Native
    details: Designed for AI agents to understand and generate. Natural language → spatial code → any platform.
  - icon: 🎮
    title: 139 Traits Built-in
    details: "@grabbable, @physics, @networked, @spatial_audio - everything you need for immersive experiences."
  - icon: ⚡
    title: 50,000 → 500 Lines
    details: Declarative syntax eliminates boilerplate. Focus on what, not how.
  - icon: 🔧
    title: VS Code Extension
    details: Syntax highlighting, IntelliSense, live preview, and AI integration out of the box.
  - icon: 🛠️
    title: MCP Server
    details: Connect AI agents directly to HoloScript for generation, validation, and explanation.
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #00ffff 30%, #ff00ff);
}
</style>

## Quick Example

```holo
composition "Interactive Demo" {
  environment {
    skybox: "nebula"
    ambient_light: 0.3
  }

  object "ControlOrb" {
    @grabbable
    @throwable
    @glowing
    
    position: [0, 1.5, -2]
    color: "#00ffff"
    
    on_grab: { pulse_glow() }
    on_throw: { teleport_user(throw_target) }
  }
}
```

This compiles to **Three.js**, **Unity**, **VRChat**, **Unreal**, and more.

## Three File Formats

| Format | Purpose | Syntax |
|--------|---------|--------|
| `.hs` | Classic HoloScript | `orb player { }` |
| `.hsplus` | With VR traits | `orb player { @grabbable }` |
| `.holo` | Scene composition | `composition "Scene" { }` |

## Install

```bash
# VS Code Extension
ext install holoscript.holoscript-vscode

# CLI tools
npm install -g @holoscript/cli

# For AI agents
npm install @holoscript/mcp-server
```

## Join the Community

- [GitHub Discussions](https://github.com/brianonbased-dev/holoscript/discussions)
- [Discord](https://discord.gg/holoscript)
- [Twitter/X](https://x.com/holoscript)
