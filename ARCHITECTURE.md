# HoloScript Architecture

## Overview

HoloScript is a **full programming language** for spatial computing, not just a domain-specific language. It includes its own runtime, compiler, and can execute independently or compile to multiple targets.

## Repository Structure

```
HoloScript/                     # This repo - complete language system
├── packages/
│   ├── core/                   # Parser, AST, validator, 16 compilers
│   ├── runtime/                # Browser runtime, traits, physics, events
│   ├── cli/                    # Command-line tools (32+ commands)
│   ├── lsp/                    # Language Server Protocol
│   ├── mcp-server/             # MCP for AI agent integration
│   ├── vscode-extension/       # VS Code language support
│   ├── formatter/              # Code formatting
│   ├── linter/                 # Static analysis
│   ├── std/                    # Standard library (types, math, collections)
│   ├── fs/                     # Filesystem utilities & file watching
│   ├── benchmark/              # Performance benchmarks
│   ├── test/                   # Testing framework & visual regression
│   ├── holoscript/             # SDK: Smart Assets & HoloHub client
│   ├── compiler-wasm/          # WebAssembly parser for browsers
│   ├── visual/                 # Node-based visual programming editor
│   ├── registry/               # Package registry & team workspace API
│   ├── partner-sdk/            # Partner integration SDK
│   ├── adapter-postgres/       # PostgreSQL database adapter
│   ├── neovim/                 # Neovim plugin
│   ├── intellij/               # IntelliJ / JetBrains plugin
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

### Core Language

| Package                  | Purpose                                    | Version |
| ------------------------ | ------------------------------------------ | ------- |
| `@holoscript/core`       | Parser, AST, validator, 16 compilers       | v3.0.0  |
| `@holoscript/runtime`    | Browser runtime, 50+ traits, physics       | v3.0.0  |
| `@holoscript/std`        | Standard library (types, math, collections)| v3.0.0  |
| `@holoscript/fs`         | Filesystem utilities & file watching       | v3.0.0  |
| `@holoscript/cli`        | Command-line tools (32+ commands)          | v3.0.0  |

### Developer Tools

| Package                    | Purpose                                  | Version |
| -------------------------- | ---------------------------------------- | ------- |
| `@holoscript/lsp`          | Language Server Protocol                 | v3.0.0  |
| `@holoscript/formatter`    | Code formatting                          | v3.0.0  |
| `@holoscript/linter`       | Static analysis                          | v3.0.0  |
| `@holoscript/test`         | Testing framework & visual regression    | v3.0.0  |
| `@holoscript/benchmark`    | Performance benchmarks                   | v3.0.0  |

### Editor Extensions

| Package                    | Purpose                                  | Version |
| -------------------------- | ---------------------------------------- | ------- |
| `holoscript-vscode`        | VS Code extension                        | v3.0.0  |
| `@holoscript/neovim`       | Neovim plugin                            | v3.0.0  |
| `@holoscript/intellij`     | IntelliJ / JetBrains plugin              | v3.0.0  |
| `@holoscript/visual`       | Node-based visual programming editor     | v3.0.0  |

### Integration & Platform

| Package                          | Purpose                                  | Version |
| -------------------------------- | ---------------------------------------- | ------- |
| `@holoscript/mcp-server`         | MCP for AI agent integration (35 tools)  | v3.0.0  |
| `@holoscript/sdk`                | Smart Asset SDK & HoloHub client         | v3.0.0  |
| `@holoscript/wasm`               | WebAssembly parser for browsers          | v3.0.0  |
| `@holoscript/registry`           | Package registry & team workspace API    | v3.0.0  |
| `@holoscript/partner-sdk`        | Partner integration SDK                  | v3.0.0  |
| `@holoscript/adapter-postgres`   | PostgreSQL database adapter              | v3.0.0  |
| `holoscript` (Python)            | Python bindings                          | v3.0.0  |

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
│ @holoscript/mcp-server │  ← 35 MCP tools
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

| HoloScript (this repo)    | Hololand                   |
| ------------------------- | -------------------------- |
| Full programming language | One deployment platform    |
| Native runtime            | Extended platform adapters |
| Compiler (16 targets)     | Brittney AI assistant      |
| Developer tools           | Hosting services           |
| AI integration (MCP)      | Sample applications        |

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

| Extension | Purpose                     | Example                            |
| --------- | --------------------------- | ---------------------------------- |
| `.hs`     | Classic HoloScript          | `orb player { ... }`               |
| `.hsplus` | HoloScript Plus with traits | `object Player @grabbable { ... }` |
| `.holo`   | Declarative compositions    | `composition "Scene" { ... }`      |

## License

All packages in this repo are MIT licensed.

---

See [README.md](README.md) for usage and [CONTRIBUTING.md](CONTRIBUTING.md) for development.
