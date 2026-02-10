# MCP Server Guide

The HoloScript MCP (Model Context Protocol) server enables AI agents to generate, validate, and manipulate HoloScript code.

## Overview

The MCP server provides tools that AI assistants (Claude, GPT, Cursor) can use to:

- Generate HoloScript from natural language
- Validate code for errors
- Suggest appropriate VR traits
- Explain code in plain English
- Parse and analyze HoloScript files

---

## Installation

### For Claude Desktop

1. Install the server:

```bash
npm install -g @holoscript/mcp-server
```

2. Add to Claude config (`~/.claude/settings.json` or Claude Desktop settings):

```json
{
  "mcpServers": {
    "holoscript": {
      "command": "npx",
      "args": ["@holoscript/mcp-server"]
    }
  }
}
```

3. Restart Claude Desktop

### For VS Code + Copilot

Add to `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "holoscript": {
      "command": "npx",
      "args": ["@holoscript/mcp-server"]
    }
  }
}
```

### For Cursor

Add to Cursor settings or `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "holoscript": {
      "command": "npx",
      "args": ["@holoscript/mcp-server"]
    }
  }
}
```

---

## Available Tools

### generate_object

Generate a HoloScript object from a natural language description.

**Input:**

```json
{
  "description": "a glowing blue composition that can be grabbed and thrown",
  "format": "hsplus"
}
```

**Output:**

```hsplus
composition glowing_composition {
  @grabbable
  @throwable
  @glowing

  position: [0, 1.5, -2]
  color: "#0088ff"
  glow_intensity: 1.5

  on_grab: {
    this.glow_intensity = 2.5
  }

  on_release: {
    this.glow_intensity = 1.5
  }
}
```

---

### generate_scene

Generate a complete `.holo` composition from a description.

**Input:**

```json
{
  "description": "A medieval marketplace with NPC vendors selling potions and weapons",
  "format": "holo"
}
```

**Output:** A complete composition with environment, templates, objects, and logic.

---

### validate_holoscript

Check code for syntax errors and semantic issues.

**Input:**

```json
{
  "code": "composition test { @grabbble position: [0, 1, 0] }",
  "format": "hsplus"
}
```

**Output:**

```json
{
  "valid": false,
  "errors": [
    {
      "line": 1,
      "message": "Unknown trait '@grabbble'. Did you mean '@grabbable'?",
      "severity": "error"
    }
  ],
  "warnings": []
}
```

---

### suggest_traits

Get appropriate VR traits for an object or use case.

**Input:**

```json
{
  "description": "a sword the player can pick up and use as a weapon"
}
```

**Output:**

```json
{
  "traits": [
    { "name": "@grabbable", "reason": "Player needs to pick up the sword" },
    { "name": "@holdable", "reason": "Sword stays in hand during combat" },
    { "name": "@physics", "reason": "Realistic sword physics when dropped" },
    { "name": "@collidable", "reason": "Detect hits on enemies" },
    { "name": "@spatial_audio", "reason": "Sword swing and impact sounds" }
  ]
}
```

---

### explain_code

Get a plain English explanation of HoloScript code.

**Input:**

```json
{
  "code": "composition portal { @trigger @glowing on_trigger_enter(player) { teleport(player, destination) } }"
}
```

**Output:**

```
This code creates a glowing portal object:

1. The portal uses @trigger to detect when objects enter it
2. It glows visually with @glowing
3. When a player enters the trigger zone, they are teleported to a destination

This is commonly used for level transitions or fast travel points.
```

---

### list_traits

List all available VR traits with descriptions.

**Output:**

```json
{
  "categories": {
    "interaction": ["@grabbable", "@throwable", "@clickable", ...],
    "physics": ["@collidable", "@physics", "@rigid", ...],
    "visual": ["@glowing", "@emissive", "@animated", ...],
    "networking": ["@networked", "@synced", "@persistent", ...],
    ...
  }
}
```

---

### explain_trait

Get detailed documentation for a specific trait.

**Input:**

```json
{
  "trait": "grabbable"
}
```

**Output:**

```json
{
  "name": "@grabbable",
  "description": "Makes an object pickable with hands or controllers",
  "category": "interaction",
  "parameters": {
    "snap_to_hand": { "type": "boolean", "default": false },
    "haptic_on_grab": { "type": "number", "default": 0, "range": [0, 1] },
    "two_handed": { "type": "boolean", "default": false }
  },
  "events": ["on_grab", "on_release", "on_grab_start", "on_grab_end"],
  "example": "@grabbable(snap_to_hand: true, haptic_on_grab: 0.5)"
}
```

---

### get_syntax_reference

Get syntax reference for HoloScript constructs.

**Input:**

```json
{
  "topic": "composition"
}
```

**Output:** Detailed syntax documentation with examples.

---

### parse_hs

Parse `.hs` or `.hsplus` code and return the AST.

**Input:**

```json
{
  "code": "composition ball { position: [0, 1, 0] }"
}
```

**Output:** Abstract Syntax Tree representation.

---

### parse_holo

Parse `.holo` composition code and return the AST.

---

## Usage Examples

### Generate a Complete VR Game Level

```
User: Create a VR escape room with puzzles

AI uses: generate_scene
Output: Complete .holo file with rooms, puzzles, triggers, and logic
```

### Debug Code Issues

```
User: Why doesn't this work? [code]

AI uses: validate_holoscript
Output: Specific error messages with suggestions
```

### Learn Best Practices

```
User: What traits should I use for a basketball?

AI uses: suggest_traits
Output: @grabbable, @throwable, @physics with reasoning
```

---

## Running Standalone

You can run the MCP server directly for testing:

```bash
npx @holoscript/mcp-server --port 8080
```

Then connect via HTTP or stdio.

---

## API Reference

The MCP server implements the [Model Context Protocol](https://modelcontextprotocol.io) specification.

All tools are exposed via:

- **stdio** (default) - For Claude Desktop, Cursor
- **HTTP** - With `--port` flag

---

## Troubleshooting

### Server Not Found

```bash
# Reinstall globally
npm install -g @holoscript/mcp-server

# Or use npx (no install needed)
npx @holoscript/mcp-server
```

### Tools Not Appearing

1. Restart your AI client
2. Check the config path is correct
3. Verify with: `npx @holoscript/mcp-server --test`

### Slow Responses

The first request may be slow as the parser initializes. Subsequent requests are fast.
