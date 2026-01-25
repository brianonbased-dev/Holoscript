# @holoscript/mcp-server

Model Context Protocol server for HoloScript language tooling. Enables AI agents to parse, validate, and generate HoloScript code.

## Features

| Tool | Description |
|------|-------------|
| `parse_hs` | Parse .hs/.hsplus code → AST |
| `parse_holo` | Parse .holo composition → AST |
| `validate_holoscript` | Validate syntax with errors/warnings |
| `list_traits` | List all 49 VR traits |
| `explain_trait` | Get trait documentation |
| `suggest_traits` | AI-powered trait suggestions |
| `generate_object` | Natural language → HoloScript object |
| `generate_scene` | Description → .holo scene |
| `get_syntax_reference` | Syntax documentation |
| `get_examples` | Code examples for patterns |
| `analyze_code` | Code stats & suggestions |
| `explain_code` | Plain English explanation |

## Installation

```bash
cd packages/mcp-server
pnpm install
pnpm build
```

## Usage

### VS Code / Copilot

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "holoscript": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "packages/mcp-server/src/index.ts"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "holoscript": {
    "command": "npx",
    "args": ["tsx", "packages/mcp-server/src/index.ts"],
    "cwd": "/path/to/HoloScript"
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "holoscript": {
      "command": "npx",
      "args": ["tsx", "/path/to/HoloScript/packages/mcp-server/src/index.ts"]
    }
  }
}
```

## Development

```bash
# Run in development mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test
```

## Tool Examples

### Parse HoloScript
```
parse_hs({ code: "orb player { position: [0, 1, 0] @grabbable }" })
```

### Validate Code
```
validate_holoscript({ code: "...", format: "hsplus" })
```

### Suggest Traits
```
suggest_traits({ description: "a sword the player can pick up and swing" })
// Returns: ["@grabbable", "@equippable", "@collidable"]
```

### Generate Object
```
generate_object({ description: "a glowing blue orb that can be grabbed" })
// Returns HoloScript code
```

## License

MIT
