# @holoscript/mcp-server

Model Context Protocol (MCP) server for HoloScript AI assistance.

## Installation

```bash
npm install @holoscript/mcp-server
```

## Configuration

Add to your MCP configuration:

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

## Available Tools

### Parsing & Validation

| Tool | Description |
|------|-------------|
| `parse_hs` | Parse .hs or .hsplus code |
| `parse_holo` | Parse .holo compositions |
| `validate_holoscript` | Check for syntax errors |

### Code Generation

| Tool | Description |
|------|-------------|
| `generate_object` | Create objects from natural language |
| `generate_scene` | Create complete compositions |
| `suggest_traits` | Get appropriate VR traits |

### Documentation

| Tool | Description |
|------|-------------|
| `list_traits` | Show available VR traits |
| `explain_trait` | Get trait documentation |
| `get_syntax_reference` | Syntax help |
| `get_examples` | Code examples |

## Usage with Claude

```typescript
// Claude will automatically use the MCP tools
"Create a VR scene with a grabbable ball and physics"
```

## Usage with Copilot

The MCP server integrates with GitHub Copilot in VS Code.

## License

MIT
