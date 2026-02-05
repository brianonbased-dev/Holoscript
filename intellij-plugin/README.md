# HoloScript IntelliJ Plugin

Language support for HoloScript in IntelliJ IDEA and other JetBrains IDEs.

## Features

- **Syntax Highlighting** - Full syntax highlighting for `.holo` and `.hsplus` files
- **LSP Integration** - Connects to `holoscript-lsp` for:
  - Code completions
  - Go to definition
  - Find references
  - Error diagnostics
  - Hover information
  - Code actions
- **Live Templates** - Quick snippets for common patterns
- **File Templates** - New file creation wizards
- **Brace Matching** - Automatic brace/bracket matching
- **Commenting** - Toggle line/block comments

## Requirements

- IntelliJ IDEA 2024.1 or later (or other JetBrains IDE)
- Node.js 18+ (for the LSP server)
- `@holoscript/lsp` package installed globally or in your project

## Installation

### From JetBrains Marketplace

1. Open Settings/Preferences
2. Go to Plugins
3. Search for "HoloScript"
4. Click Install

### From Disk

1. Download the latest release `.zip` file
2. Open Settings/Preferences → Plugins
3. Click the gear icon → Install Plugin from Disk
4. Select the downloaded file

## Building from Source

```bash
# Clone the repository
cd intellij-plugin

# Build the plugin
./gradlew buildPlugin

# Run in a sandbox IDE for testing
./gradlew runIde
```

## Live Templates

| Abbreviation | Description |
|--------------|-------------|
| `comp` | Create a composition |
| `orb` | Create an orb object |
| `entity` | Create an entity |
| `@grab` | Add grabbable trait |
| `@phys` | Add physics trait |
| `@net` | Add networking traits |
| `onGrab` | Add onGrab handler |
| `onClick` | Add onClick handler |
| `npc` | Create an NPC |
| `quest` | Create a quest |
| `dialogue` | Create a dialogue |
| `template` | Create a template |
| `using` | Instantiate a template |

## Color Settings

Customize syntax colors in:
Settings → Editor → Color Scheme → HoloScript

## LSP Configuration

The plugin automatically looks for `holoscript-lsp` in:
1. `node_modules/.bin/holoscript-lsp` (project local)
2. Global PATH (`npx holoscript-lsp`)

Install the LSP server:
```bash
# Global installation
npm install -g @holoscript/lsp

# Or project-local
npm install @holoscript/lsp
```

## Contributing

Contributions are welcome! Please read the main HoloScript [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
