# HoloScript Architecture

## Overview

HoloScript is a declarative VR/AR scene description language with multi-target compilation. This document describes the package architecture and how components relate.

## Repository Structure

```
HoloScript/                     # This repo - language tooling
├── packages/
│   ├── core/                   # Parser, AST, validator, compiler
│   ├── cli/                    # Command-line tools
│   ├── lsp/                    # Language Server Protocol
│   ├── mcp-server/             # MCP for AI agent integration
│   ├── vscode-extension/       # VS Code language support
│   ├── formatter/              # Code formatting
│   ├── linter/                 # Static analysis
│   ├── runtime/                # Execution runtime (stub)
│   ├── std/                    # Standard library
│   ├── fs/                     # Filesystem utilities
│   ├── benchmark/              # Performance benchmarks
│   └── python-bindings/        # Python API
├── services/
│   └── render-service/         # Preview rendering (Render.com)
└── docs/                       # Documentation

Hololand/                       # Separate repo - runtime & platforms
├── packages/
│   ├── runtime/                # Full execution engine
│   ├── adapters/               # Platform-specific code
│   │   ├── web/               # Browser (Three.js)
│   │   ├── unity/             # Unity SDK
│   │   ├── unreal/            # Unreal SDK
│   │   ├── godot/             # Godot SDK
│   │   └── react-native/      # Mobile
│   └── brittney/               # AI assistant
│       └── mcp-server/         # Brittney's MCP tools
└── examples/                   # Sample applications
```

## Package Relationships

### Core Packages (this repo)

| Package | Purpose | npm |
|---------|---------|-----|
| `@holoscript/core` | Parser, AST, validator, compiler | ✅ v2.1.0 |
| `@holoscript/cli` | Command-line tools | ✅ |
| `@holoscript/lsp` | Language Server Protocol | ✅ |
| `@holoscript/mcp-server` | AI agent integration | ✅ v1.0.2 |
| `@holoscript/vscode` | VS Code extension | Marketplace |

### Platform Packages (Hololand repo)

| Package | Purpose | Status |
|---------|---------|--------|
| `@hololand/runtime` | Execution engine | Active |
| `@hololand/web` | Browser adapter | Active |
| `@hololand/unity` | Unity SDK | In progress |
| `@hololand/brittney` | AI assistant | Active |

## Data Flow

```
.holo/.hsplus files
       │
       ▼
┌─────────────────┐
│ @holoscript/core │  ← Parser, AST, Validator
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Compiler      │  ← Multi-target code generation
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│  Web  │ │ Unity │ │Unreal │ │ React │
│(Three)│ │  SDK  │ │  SDK  │ │Native │
└───────┘ └───────┘ └───────┘ └───────┘
```

## AI Integration

HoloScript is designed for AI agents to generate and manipulate:

```
AI Agent (Grok/Claude/Copilot)
         │
         ▼
┌─────────────────────┐
│ @holoscript/mcp-server │  ← 15 MCP tools
└────────┬────────────┘
         │ parse, validate, generate
         ▼
┌─────────────────┐
│ @holoscript/core │
└─────────────────┘
```

### MCP Tools Available

- `parse_hs`, `parse_holo` - Parse code to AST
- `validate_holoscript` - Syntax validation
- `generate_object`, `generate_scene` - Code generation
- `list_traits`, `explain_trait`, `suggest_traits` - Trait docs
- `render_preview`, `create_share_link` - Sharing

## Why Two Repos?

**HoloScript** (this repo) contains:
- Language specification
- Parsing and compilation
- Developer tooling (CLI, LSP, extensions)
- AI integration (MCP)

**Hololand** contains:
- Runtime execution
- Platform adapters (Unity, Unreal, Web)
- Sample applications
- Brittney AI assistant

This separation allows:
1. Language tooling to be lightweight (~1MB)
2. Runtime to include heavy dependencies (Three.js, etc.)
3. Platform SDKs to have platform-specific builds
4. Independent versioning and release cycles

## Quick Start

```bash
# Language tools
npm install @holoscript/core @holoscript/cli

# AI integration
npm install @holoscript/mcp-server

# Python bindings
pip install holoscript

# Full runtime (from Hololand)
npm install @hololand/runtime @hololand/web
```

## File Formats

| Extension | Purpose | Example |
|-----------|---------|---------|
| `.hs` | Classic HoloScript | `orb player { ... }` |
| `.hsplus` | HoloScript Plus with traits | `object Player @grabbable { ... }` |
| `.holo` | Declarative compositions | `composition "Scene" { ... }` |

## License

All packages in this repo are MIT licensed.

---

See [README.md](README.md) for usage and [CONTRIBUTING.md](CONTRIBUTING.md) for development.
