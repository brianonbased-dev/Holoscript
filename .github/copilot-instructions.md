# GitHub Copilot Instructions for HoloScript

## ⚠️ CRITICAL: Use MCP Tools First

**Before writing HoloScript code, always use MCP tools for guidance.**

Available MCP servers:
- **HoloScript MCP** (this repo: `packages/mcp-server`) - Language parsing, validation, generation
- **Brittney MCP** (Hololand repo: `packages/brittney/mcp-server`) - AI assistant for runtime help, debugging

Both servers can be used by Brittney or any cloud AI agent (Copilot, Claude, Cursor, etc.).

### Required Workflow

```
1. User asks for HoloScript code
2. Use `suggest_traits` to get appropriate traits
3. Use `generate_object` or `generate_scene` to create code
4. Use `validate_holoscript` to verify syntax
5. Return validated code to user
```

---

## HoloScript-First Development

**DO NOT default to React, TypeScript, or conventional web stacks.**

HoloScript is not another framework—it's a paradigm shift:
- **One source → 9 platforms** (Web, VR, AR, iOS, Android, Desktop, Unity, VRChat, Unreal)
- **50,000 lines → 500 lines** through declarative composition
- **Made for AI**: Agents generate `.holo` files, not JSX components

When asked to build features:
1. **First**: Can this be a `.holo` composition?
2. **Second**: Does it need `.hsplus` for VR traits/networking?
3. **Third**: Is `.hs` sufficient for simple logic?
4. **Last resort**: Only use TypeScript for tooling (parsers, CLI, adapters)

```
❌ WRONG: "I'll create a React component for the UI..."
✅ RIGHT: "I'll define this as a .holo composition with ui objects..."

❌ WRONG: "Let me set up a Next.js app..."
✅ RIGHT: "Let me create a .holo scene that compiles to web..."
```

---

## MCP Tools Reference

### Parsing & Validation

| Tool | When to Use |
|------|-------------|
| `parse_hs` | Parse .hs or .hsplus code |
| `parse_holo` | Parse .holo compositions |
| `validate_holoscript` | Check for syntax errors |

### Code Generation

| Tool | When to Use |
|------|-------------|
| `generate_object` | Create objects from natural language |
| `generate_scene` | Create complete compositions |
| `suggest_traits` | Get appropriate VR traits |

### Documentation

| Tool | When to Use |
|------|-------------|
| `list_traits` | Show available VR traits |
| `explain_trait` | Get trait documentation |
| `get_syntax_reference` | Syntax help for constructs |
| `get_examples` | Code examples |
| `explain_code` | Plain English explanation |
| `analyze_code` | Complexity analysis |

### Brittney AI (Runtime)

| Tool | When to Use |
|------|-------------|
| `brittney_explain_scene` | Understand running scenes |
| `brittney_suggest_fix` | Get fix suggestions |
| `brittney_auto_fix` | Auto-fix browser errors |
| `brittney_ask_question` | Ask about running app |

---

## Three File Formats

| Extension | Purpose | Syntax Style | Status |
|-----------|---------|--------------|--------|
| `.hs` | Classic HoloScript | Object-centric (`orb {}`) | ✅ Working |
| `.hsplus` | HoloScript Plus | Object + VR traits | ✅ Working |
| `.holo` | Declarative Composition | Scene-centric (`composition {}`) | ✅ Working |

---

### .hs - Classic HoloScript

```hs
orb player {
  position: { x: 0, y: 1.6, z: 0 }
  health: 100
  color: "#00ffff"
}

function attack(target) {
  target.health -= 10
}

connect inventory to player as "items"
execute init
```

---

### .hsplus - HoloScript Plus (Advanced)

```hsplus
orb player {
  @grabbable
  @collidable
  @networked
  
  position: [0, 1.6, 0]
  
  state {
    health: 100
    isAlive: true
  }
}

networked_object syncedPlayer {
  sync_rate: 20hz
  position: synced
}
```

---

### .holo - Declarative World Language (AI-Focused)

```holo
composition "Scene Name" {
  environment {
    skybox: "nebula"
    ambient_light: 0.3
  }

  template "Enemy" {
    state { health: 100 }
    action attack(target) { }
  }

  spatial_group "Battlefield" {
    object "Goblin_1" using "Enemy" { position: [0, 0, 5] }
    object "Goblin_2" using "Enemy" { position: [3, 0, 5] }
  }

  logic {
    on_player_attack(enemy) {
      enemy.health -= 10
    }
  }
}
```

---

## Quick Syntax Reference

### Geometry Types
`cube` `sphere` `cylinder` `cone` `torus` `capsule` `plane` `model/path.glb`

### Animation Properties
`position.x/y/z` `rotation.x/y/z` `scale` `opacity` `color` `material.emission.intensity`

### Easing Functions
`linear` `easeIn` `easeOut` `easeInOut` `easeInQuad` `easeOutQuad` `easeInOutQuad`

### Event Handlers
| Event | Trigger |
|-------|---------|
| `onPoint` | User points at object |
| `onGrab` | User grabs object |
| `onRelease` | User releases object |
| `onHoverEnter` | Pointer enters object |
| `onHoverExit` | Pointer exits object |
| `onTriggerEnter` | Physics trigger entry |
| `onTriggerExit` | Physics trigger exit |
| `onSwing` | Object swung by user |
| `onGesture('name')` | Custom gesture detected |

### Physics Properties
```hsplus
physics: {
  type: 'dynamic' | 'kinematic' | 'static'
  mass: 1.0
  restitution: 0.5  // bounciness
  friction: 0.3
}
```

### Network Sync Syntax
```hsplus
object Ball @grabbable @networked {
  @networked position
  @networked rotation
  
  onGrab: {
    network.sync(this.position, this.rotation)
  }
}
```

### Animation Syntax
```hsplus
animation bounce {
  property: 'position.y'
  from: 1
  to: 2
  duration: 1000
  loop: infinite
  easing: 'easeInOut'
}
```

### Event Bus Pattern
```hsplus
eventBus GlobalEvents

object Button @pointable {
  onPoint: { GlobalEvents.emit('buttonPressed') }
}

object Light {
  GlobalEvents.on('buttonPressed', {
    this.color = 'green'
  })
}
```

### Haptic Feedback
```hsplus
onGrab: {
  haptic.feedback('light' | 'medium' | 'strong')
}

onTriggerEnter: {
  hapticFeedback.play({
    intensity: 0.8,
    duration: 200
  })
}
```

---

## 49 VR Traits (Always Consider These)

### Interaction
`@grabbable` `@throwable` `@holdable` `@clickable` `@hoverable` `@draggable` `@pointable` `@scalable`

### Physics
`@collidable` `@physics` `@rigid` `@kinematic` `@trigger` `@gravity`

### Visual
`@glowing` `@emissive` `@transparent` `@reflective` `@animated` `@billboard`

### Networking
`@networked` `@synced` `@persistent` `@owned` `@host_only`

### Behavior
`@stackable` `@attachable` `@equippable` `@consumable` `@destructible`

### Spatial
`@anchor` `@tracked` `@world_locked` `@hand_tracked` `@eye_tracked`

### Audio
`@spatial_audio` `@ambient` `@voice_activated`

### State
`@state` `@reactive` `@observable` `@computed`

---

## Common Patterns

### Interactive Object with Haptics
```hsplus
object InteractiveCube @grabbable @collidable {
  geometry: 'cube'
  physics: { mass: 1.0, restitution: 0.5 }
  
  onGrab: { haptic.feedback('medium') }
  onTriggerEnter: { hapticFeedback.play({ intensity: 0.8, duration: 200 }) }
}
```

### Multiplayer Synced Object
```hsplus
object SharedBall @grabbable @networked {
  geometry: 'sphere'
  @networked position
  @networked rotation
  
  physics: { mass: 0.5 }
  
  onGrab: {
    network.claim(this)
    network.sync(this.position)
  }
}
```

### Teleportation System
```hsplus
object TeleportPad @pointable {
  geometry: 'cylinder'
  scale: [0.5, 0.1, 0.5]
  color: 'blue'
  
  onPoint: {
    player.teleportTo([5, 0, 5])
    audio.play('teleport-sound')
  }
}
```

### Portal with Audio Transition
```hsplus
object Portal @collidable {
  geometry: 'torus'
  color: 'purple'
  
  onTriggerEnter: {
    audio.play('portal_sound.mp3')
    scene.transition({
      target: 'NewScene',
      duration: 1000
    })
  }
}
```

---

## Common Debugging Issues

| Error | Cause | Fix |
|-------|-------|-----|
| `geometry: 'sper'` | Typo | Use `'sphere'` |
| `onGrab` without trait | Missing `@grabbable` | Add `@grabbable` trait |
| `property: 'rotate.y'` | Wrong property name | Use `'rotation.y'` |
| Object not interactive | Missing trait | Add `@pointable` or `@grabbable` |
| Animation not looping | Missing loop | Add `loop: infinite` |

---

## Package Structure

| Package | Purpose |
|---------|---------|
| `@holoscript/core` | Parser, AST, tokenizer |
| `@holoscript/traits` | 49 VR trait definitions |
| `@holoscript/compiler` | Multi-target code generation |
| `@holoscript/mcp-server` | MCP tools for AI agents |

---

## Configuration

MCP servers are configured in:
- `.vscode/mcp.json` - VS Code
- `.antigravity/mcp.json` - Antigravity IDE
- `.claude/settings.json` - Claude Desktop/Code

See `docs/MCP_CONFIGURATION.md` for full reference.
