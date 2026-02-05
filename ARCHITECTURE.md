# HoloScript Architecture

## Overview

HoloScript is a **full programming language** for spatial computing, not just a domain-specific language. It includes its own runtime, compiler, and can execute independently or compile to multiple targets.

## Repository Structure

```
HoloScript/                     # This repo - complete language system
├── packages/
│   ├── core/                   # Parser, AST, validator, compiler
│   ├── runtime/                # Native HoloScript runtime
│   ├── cli/                    # Command-line tools
│   ├── lsp/                    # Language Server Protocol
│   ├── mcp-server/             # MCP for AI agent integration
│   ├── vscode-extension/       # VS Code language support
│   ├── formatter/              # Code formatting
│   ├── linter/                 # Static analysis
│   ├── std/                    # Standard library
│   ├── fs/                     # Filesystem utilities
│   ├── benchmark/              # Performance benchmarks
│   └── python-bindings/        # Python API
├── services/
│   └── render-service/         # Preview rendering (Render.com)
└── docs/                       # Documentation
```

## Execution Options

HoloScript can run in multiple ways:

### 1. Native Runtime (this repo)
```bash
holoscript run scene.holo
```
Direct execution via `@holoscript/runtime`.

### 2. Compile to JavaScript/TypeScript
```bash
holoscript compile scene.holo --target js
```
Generates standalone JS that runs in any browser.

### 3. Compile to Platform SDKs
```bash
holoscript compile scene.holo --target unity
holoscript compile scene.holo --target unreal
holoscript compile scene.holo --target godot
```
Generates platform-native code.

### 4. Hololand Integration
Hololand is a **consumer** of HoloScript, providing:
- Additional platform adapters
- Brittney AI assistant
- Hosting and deployment

But HoloScript works without Hololand.

## Package Relationships

| Package | Purpose | npm |
|---------|---------|-----|
| `@holoscript/core` | Parser, AST, validator, compiler | ✅ v2.1.0 |
| `@holoscript/runtime` | Native execution engine | ✅ |
| `@holoscript/cli` | Command-line tools | ✅ |
| `@holoscript/lsp` | Language Server Protocol | ✅ |
| `@holoscript/mcp-server` | AI agent integration | ✅ v1.0.2 |
| `@holoscript/vscode` | VS Code extension | Marketplace |

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
    ┌────┴────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼
┌────────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│ Native │ │  Web  │ │ Unity │ │Unreal │ │ Godot │
│Runtime │ │(Three)│ │  SDK  │ │  SDK  │ │  SDK  │
└────────┘ └───────┘ └───────┘ └───────┘ └───────┘
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

## Hololand Relationship

**Hololand** is one platform that uses HoloScript, but HoloScript is independent:

| HoloScript (this repo) | Hololand |
|------------------------|----------|
| Full programming language | One deployment platform |
| Native runtime | Extended platform adapters |
| Compiler (9 targets) | Brittney AI assistant |
| Developer tools | Hosting services |
| AI integration (MCP) | Sample applications |

You can use HoloScript without Hololand. Hololand just provides additional convenience.

## Quick Start

```bash
# Full HoloScript (parse, compile, run)
npm install @holoscript/core @holoscript/cli @holoscript/runtime

# AI integration
npm install @holoscript/mcp-server

# Python bindings
pip install holoscript
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
