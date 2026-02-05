# @holoscript/lsp

Language Server Protocol implementation for HoloScript.

## Installation

```bash
npm install @holoscript/lsp
```

## Features

- 🎯 **Autocomplete** - Intelligent code completion
- 🔍 **Hover** - Documentation on hover
- 📍 **Go to Definition** - Navigate to declarations
- 🔎 **Find References** - Find all usages
- ✏️ **Rename** - Safe symbol renaming
- 🔧 **Code Actions** - Quick fixes and refactors
- 🎨 **Semantic Highlighting** - Rich syntax coloring
- ⚠️ **Diagnostics** - Real-time error reporting

## Usage

### As a Server

```typescript
import { startServer } from '@holoscript/lsp';

startServer({
  connection: createConnection(),
  documents: new TextDocuments(TextDocument),
});
```

### With VS Code

The LSP is bundled with [@holoscript/vscode](https://marketplace.visualstudio.com/items?itemName=holoscript.vscode-holoscript).

### With Neovim

```lua
require('lspconfig').holoscript.setup({
  cmd = { 'holoscript-lsp', '--stdio' },
})
```

## AI Autocomplete

Enable AI-powered suggestions:

```typescript
import { createAutocomplete } from '@holoscript/lsp';

const autocomplete = createAutocomplete({
  provider: 'copilot',
  context: 'vr-game',
});
```

## License

MIT
