# HoloScript 3.0 Migration Guide

This guide helps you migrate from HoloScript 2.x to 3.0.

## Overview

HoloScript 3.0 is a major release that introduces:
- **Visual Scripting** - Build without writing code
- **WASM Compiler** - 10x faster parsing
- **AI Autocomplete** - Intelligent suggestions
- **IntelliJ Plugin** - JetBrains IDE support
- **Team Workspaces** - Collaborative development
- **Certified Packages** - Quality assurance

## Breaking Changes

### 1. Deprecated Traits Removed

The following deprecated traits have been removed:

| Removed Trait | Replacement |
|--------------|-------------|
| `@pickable` | `@grabbable` |
| `@touchable` | `@pointable` |
| `@soundEmitter` | `@spatial_audio` |
| `@physicsEnabled` | `@physics` |
| `@networkSync` | `@networked` |

**Migration:**

```diff
- object Ball @pickable @touchable {
+ object Ball @grabbable @pointable {
    geometry: 'sphere'
  }
```

### 2. Configuration File Format v3

The configuration file format has been updated for better organization.

**Before (v2):**
```json
{
  "holoscript": {
    "target": "web",
    "strict": true,
    "extensions": [".hs", ".hsplus", ".holo"]
  }
}
```

**After (v3):**
```json
{
  "$schema": "https://holoscript.dev/schemas/config.v3.json",
  "version": 3,
  "compiler": {
    "target": "web",
    "strict": true
  },
  "files": {
    "include": ["src/**/*.{hs,hsplus,holo}"],
    "exclude": ["**/node_modules/**"]
  },
  "features": {
    "wasm": true,
    "visualScripting": false
  }
}
```

**Auto-migration:**
```bash
npx @holoscript/cli migrate-config
```

### 3. Runtime API Changes

The runtime API has been reorganized for consistency.

**Before (v2):**
```typescript
import { parse, validate, compile } from '@holoscript/core';

const ast = parse(source);
const errors = validate(ast);
const output = compile(ast, { target: 'web' });
```

**After (v3):**
```typescript
import { HoloScript } from '@holoscript/core';

const hs = new HoloScript({
  target: 'web',
  useWasm: true, // New: WASM acceleration
});

const result = await hs.compile(source);
// result = { ast, errors, output, diagnostics }
```

**Compatibility layer:**
```typescript
// Use legacy API (deprecated, will be removed in 4.0)
import { parse, validate, compile } from '@holoscript/core/legacy';
```

### 4. Plugin API v2

Plugin system has been redesigned for better extensibility.

**Before (v2):**
```typescript
export default function myPlugin(api) {
  api.onParse((ast) => {
    // modify AST
  });
}
```

**After (v3):**
```typescript
import { definePlugin, type PluginContext } from '@holoscript/core';

export default definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  
  hooks: {
    'parse:before': (source: string, ctx: PluginContext) => {
      return source; // Optionally transform
    },
    
    'parse:after': (ast, ctx: PluginContext) => {
      return ast; // Optionally transform
    },
    
    'compile:target': (output, target, ctx: PluginContext) => {
      return output;
    },
  },
});
```

## New Features

### Visual Scripting

Create scenes without code using the visual editor:

```typescript
import { VisualEditor } from '@holoscript/visual';

const editor = new VisualEditor(container, {
  theme: 'dark',
  snapToGrid: true,
});

// Load existing .holo file
await editor.load('scene.holo');

// Export to code
const source = editor.toHoloScript();
```

### WASM Compiler

Enable WASM for faster parsing:

```typescript
import { initWasm, parseWasm } from '@holoscript/wasm';

await initWasm();

// 10x faster than JavaScript parser
const ast = parseWasm(source);
```

### AI Autocomplete

Get intelligent suggestions in your editor:

```typescript
import { createAutocomplete } from '@holoscript/lsp';

const autocomplete = createAutocomplete({
  provider: 'copilot', // or 'local'
  context: 'vr-game',
});

const suggestions = await autocomplete.suggest(position, document);
```

### Team Workspaces

Collaborate with your team:

```bash
# Create workspace
holoscript workspace create my-team

# Invite members
holoscript workspace invite user@example.com --role editor

# Sync packages
holoscript workspace sync
```

## Automated Migration

Run the migration CLI:

```bash
# Analyze your project
npx @holoscript/cli@3 migrate --analyze

# Perform migration
npx @holoscript/cli@3 migrate --apply

# Verify migration
npx @holoscript/cli@3 migrate --verify
```

## Package Version Updates

| Package | 2.x → 3.0 |
|---------|-----------|
| @holoscript/core | 2.x → 3.0.0 |
| @holoscript/cli | 2.x → 3.0.0 |
| @holoscript/lsp | 2.x → 3.0.0 |
| @holoscript/linter | 2.x → 3.0.0 |
| @holoscript/formatter | 2.x → 3.0.0 |
| @holoscript/vscode | 2.x → 3.0.0 |

**New packages in 3.0:**
- @holoscript/visual (1.0.0) - Visual scripting
- @holoscript/wasm (1.0.0) - WASM compiler
- @holoscript/intellij (1.0.0) - IntelliJ plugin
- @holoscript/partner-sdk (1.0.0) - Partner tools

## Getting Help

- [Migration FAQ](https://holoscript.dev/docs/migration/faq)
- [Discord #help-migration](https://discord.gg/holoscript)
- [GitHub Discussions](https://github.com/holoscript/holoscript/discussions)

## Rollback

If you encounter issues, rollback to 2.x:

```bash
# Lock to last 2.x version
npm install @holoscript/core@^2
```

The 2.x branch will receive security updates until December 2025.
