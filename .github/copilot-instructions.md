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

## 49 VR Traits (Always Consider These)

### Interaction
`@grabbable` `@throwable` `@holdable` `@clickable` `@hoverable` `@draggable`

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
