# Quick Start

Get up and running with HoloScript in 5 minutes.

## 1. Install VS Code Extension

```bash
ext install holoscript.holoscript-vscode
```

Or search **"HoloScript Enhanced"** in the VS Code extensions marketplace.

After installing, VS Code will show the **Getting Started** walkthrough automatically!

## 2. Create Your First File

Create a file called `hello.holo`:

```holo
composition "My First Scene" {
  environment {
    skybox: "sunset"
    ambient_light: 0.4
  }

  object "FloatingOrb" {
    @grabbable
    @glowing
    
    position: [0, 1.5, -2]
    color: "#00ffff"
    
    on_grab: {
      this.glow_intensity = 2.0
    }
  }
}
```

## 3. Preview Your Scene

Press `Ctrl+Shift+V` (or `Cmd+Shift+V` on Mac) to open the 3D preview.

## 4. Explore the Examples

Open the Command Palette (`Ctrl+Shift+P`) and type **"HoloScript: Open Examples"** to browse progressive tutorials:

| # | Example | What You'll Learn |
|---|---------|-------------------|
| 1 | hello.holo | Basic scene structure |
| 2 | 2-interactive.holo | VR traits, grabbing, physics |
| 3 | 3-physics-playground.holo | Physics, spatial audio, templates |
| 4 | 4-multiplayer-room.holo | Networking, player tracking |
| 5 | 5-escape-room.holo | Full game with puzzles and UI |

## 5. Compile to Target Platform

```bash
# Install CLI
npm install -g @holoscript/cli

# Compile to Three.js
holoscript compile hello.holo --target threejs

# Compile to Unity
holoscript compile hello.holo --target unity

# Compile to VRChat
holoscript compile hello.holo --target vrchat
```

## What's Next?

- [VR Traits](./traits) - Add interactivity with @grabbable, @physics, @networked
- [Compositions](./compositions) - Build complex multi-object scenes
- [Best Practices](../best-practices.md) - Learn the 10 rules for great VR experiences
- [AI Integration](./ai-agents) - Use MCP server with Claude, GPT, or Brittney
