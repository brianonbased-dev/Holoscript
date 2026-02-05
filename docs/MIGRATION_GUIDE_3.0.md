# Migration Guide: HoloScript 2.x to 3.0

This guide helps you upgrade your HoloScript projects from version 2.x to 3.0.

## Quick Start

For most projects, the migration can be automated:

```bash
# Install the latest CLI
npm install -g @holoscript/cli@3.0.0

# Run the migration assistant
holoscript migrate --to 3.0.0

# Review changes and test
holoscript dev
```

## Prerequisites

Before migrating, ensure you have:
- Node.js 18.0.0 or later
- TypeScript 5.0.0 or later (if using TypeScript)
- All tests passing on 2.x

## Breaking Changes

### 1. Parser API Changes

**Before (2.x):**
```typescript
import { HoloScriptParser } from '@holoscript/core';

const parser = new HoloScriptParser();
const ast = parser.parse(code);
```

**After (3.0):**
```typescript
import { HoloScriptPlusParser } from '@holoscript/core';

const parser = new HoloScriptPlusParser();
const ast = parser.parse(code);
```

The `HoloScriptPlusParser` returns an enhanced AST with additional metadata.

### 2. Networked Trait Configuration

**Before (2.x):**
```hsplus
orb player {
  @networked { sync: "position,rotation" }
}
```

**After (3.0):**
```hsplus
orb player {
  @networked {
    syncedProperties: ["position", "rotation"]
    interpolation: true
  }
}
```

### 3. Physics Trait Configuration

**Before (2.x):**
```hsplus
orb ball {
  @physics { gravity: true }
}
```

**After (3.0):**
```hsplus
orb ball {
  @physics {
    useGravity: true
    mass: 1.0
  }
}
```

### 4. Compile Options

**Before (2.x):**
```typescript
compile(ast, {
  format: 'cjs',
  target: 'es5'
});
```

**After (3.0):**
```typescript
compile(ast, {
  format: 'esm', // CJS no longer supported
  target: 'es2022'
});
```

### 5. Event Handler Syntax

**Before (2.x):**
```hsplus
orb button {
  onClick: () => {
    // handler
  }
}
```

**After (3.0):**
Both syntaxes are supported, but the block syntax is preferred:
```hsplus
orb button {
  onClick: {
    // handler
  }
}
```

## New Features to Adopt

### Spread Operators

Take advantage of the new spread operator support:

```hsplus
const defaults = { color: "red", scale: 1.0 }
const custom = { ...defaults, color: "blue" }
```

### Headless Testing

Use the headless runtime for testing:

```typescript
import { createHeadlessRuntime } from '@holoscript/core';

const runtime = createHeadlessRuntime(composition);
runtime.tick(100); // Run 100ms
expect(runtime.getState('player.position')).toBeDefined();
```

### Incremental Compilation

Enable caching for faster builds:

```typescript
const compiler = new IncrementalCompiler();

// First compile - stores cache
const result1 = await compiler.compile(ast);

// Subsequent compiles - uses cache
const result2 = await compiler.compile(modifiedAst);
```

## Deprecation Warnings

The following will show deprecation warnings in 3.0:

### @legacy_physics

```hsplus
// Deprecated
orb ball {
  @legacy_physics { bounce: 0.5 }
}

// Use instead
orb ball {
  @physics { restitution: 0.5 }
}
```

### CommonJS Output

```typescript
// Deprecated - will warn
compile(ast, { format: 'cjs' });

// Use instead
compile(ast, { format: 'esm' });
```

## Package.json Updates

Update your dependencies:

```json
{
  "dependencies": {
    "@holoscript/core": "^3.0.0",
    "@holoscript/cli": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

## IDE Configuration

### VS Code

Update the extension for 3.0 features:

1. Open VS Code
2. Go to Extensions
3. Search for "HoloScript"
4. Click "Update"

### IntelliJ/WebStorm

Install the new HoloScript plugin:

1. Open Settings → Plugins
2. Search for "HoloScript"
3. Install and restart

## Testing Your Migration

After migration, verify everything works:

```bash
# Run all tests
holoscript test

# Check for deprecation warnings
holoscript lint --strict

# Build the project
holoscript build

# Run in development mode
holoscript dev
```

## Common Issues

### Issue: "Cannot find module '@holoscript/core'"

**Solution:** Clear node_modules and reinstall:
```bash
rm -rf node_modules
npm install
```

### Issue: Parser errors after migration

**Solution:** Run the migration assistant with verbose output:
```bash
holoscript migrate --to 3.0.0 --verbose
```

### Issue: Trait configuration errors

**Solution:** Check the trait documentation for new config format:
```bash
holoscript docs @physics
```

## Getting Help

If you encounter issues:

1. Check the [FAQ](./FAQ.md)
2. Search [GitHub Issues](https://github.com/brianonbased-dev/HoloScript/issues)
3. Ask in [Discord](https://discord.gg/holoscript)
4. Open a new issue with reproduction steps

## Rollback

If you need to rollback to 2.x:

```bash
npm install @holoscript/core@2.5.0 @holoscript/cli@2.5.0
```

Note: Features using 3.0-only syntax will not work after rollback.
