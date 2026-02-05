# Infinitus Dev Terminal Enhancement Roadmap

**Status**: Research Complete
**Date**: 2026-02-05

---

## Overview

The **Infinitus Dev Terminal** is the AI-powered command-line interface for HoloScript, integrating the 7-phase Infinity Protocol with modern terminal development features.

---

## Current Architecture

```
packages/cli/src/
├── cli.ts           # Main CLI entry (validate, repl, pack, diff, etc.)
├── repl.ts          # Basic REPL with .help, .vars, .load, .history
├── traits.ts        # Trait documentation
└── generator.ts     # Object/scene generation

services/llm-service/
├── src/server.ts          # Express API for LLM
├── src/services/
│   ├── OllamaService.ts   # Local LLM inference
│   └── BuildService.ts    # HoloScript generation
└── public/index.html      # Web UI

packages/core/src/lib/
└── infinity-protocol.hs   # ∞++ Protocol (7 phases, compression)
```

---

## Enhancement Priorities

### P0: Must Have

| Feature | Description | Effort |
|---------|-------------|--------|
| **Tab Completion** | Keywords, traits, properties, files | 3 days |
| **Syntax Highlighting** | Real-time colorization as you type | 2 days |
| **`.ai` Command** | Generate HoloScript from natural language | 3 days |
| **Streaming Output** | Real-time LLM token display | 2 days |

### P1: Should Have

| Feature | Description | Effort |
|---------|-------------|--------|
| **Rich TUI (Ink)** | React-based terminal interface | 1 week |
| **Multi-pane Layout** | Code + Preview + Output split | 1 week |
| **Phase Indicator** | Show current Infinity Protocol phase | 2 days |
| **`.explain`/`.fix`** | AI-assisted debugging | 3 days |

### P2: Nice to Have

| Feature | Description | Effort |
|---------|-------------|--------|
| **Plugin System** | Extensible command hooks | 1 week |
| **VR Preview** | Launch Three.js preview from terminal | 1 week |
| **Git Integration** | Auto-commit generated code | 3 days |

---

## Quick Wins (Immediate Implementation)

### 1. Add Tab Completion

```typescript
// packages/cli/src/repl.ts - Update createInterface
const COMPLETIONS = [
  // Keywords
  'orb', 'composition', 'template', 'state', 'connect', 'function',
  // Traits (top 20)
  '@grabbable', '@physics', '@collidable', '@networked', '@sensor',
  '@digital_twin', '@behavior_tree', '@glowing', '@animated', '@spatial_audio',
  // Properties
  'position:', 'rotation:', 'scale:', 'color:', 'geometry:',
];

const completer = (line: string) => {
  const lastWord = line.split(/\s+/).pop() || '';
  const hits = COMPLETIONS.filter(c => c.startsWith(lastWord));
  return [hits.length ? hits : COMPLETIONS, lastWord];
};

this.rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  completer,  // Add this
  prompt: this.getPrompt(),
});
```

### 2. Add Syntax Highlighting

```typescript
// packages/cli/src/highlight.ts
import chalk from 'chalk';

const PATTERNS = {
  keyword: /\b(orb|composition|template|state|connect|function|if|for|while)\b/g,
  trait: /@\w+/g,
  string: /"[^"]*"|'[^']*'/g,
  number: /\b\d+(\.\d+)?\b/g,
  comment: /\/\/.*$/gm,
  property: /\w+(?=:)/g,
};

export function highlight(code: string): string {
  return code
    .replace(PATTERNS.comment, m => chalk.dim(m))
    .replace(PATTERNS.keyword, m => chalk.magenta(m))
    .replace(PATTERNS.trait, m => chalk.cyan.bold(m))
    .replace(PATTERNS.string, m => chalk.green(m))
    .replace(PATTERNS.number, m => chalk.yellow(m))
    .replace(PATTERNS.property, m => chalk.blue(m));
}
```

### 3. Add `.ai` Command

```typescript
// packages/cli/src/repl.ts - Add to handleCommand
case '.ai': {
  const prompt = parts.slice(1).join(' ');
  if (!prompt) {
    console.log(`${COLORS.red}Usage: .ai <description>${COLORS.reset}`);
    break;
  }

  console.log(`${COLORS.dim}Generating...${COLORS.reset}`);

  try {
    const response = await fetch('http://localhost:8000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: prompt })
    });

    const { code } = await response.json();
    console.log(`\n${highlight(code)}\n`);
  } catch (e) {
    console.log(`${COLORS.red}LLM service not available. Run: npm run dev:llm${COLORS.reset}`);
  }
  break;
}
```

---

## Target User Experience

### Before (Current)
```
$ holoscript repl
hs> orb myObject { color: "#ff0000" }
=> { type: "orb", ... }
hs>
```

### After (Enhanced)
```
$ holoscript

╔════════════════════════════════════════════════════════════════╗
║         ∞ INFINITUS DEV TERMINAL v2.0.0 ∞                      ║
║                                                                 ║
║  Commands: .ai <prompt>  .help  .vars  .∞ (compression stats)  ║
╚════════════════════════════════════════════════════════════════╝

Phase: READY  │  Compression: --  │  LLM: ✓ Ollama

hs> .ai a red sphere that bounces when grabbed
Generating... ●●●○○○

orb bouncingSphere @grabbable @physics {
  geometry: "sphere"
  color: "#ff0000"

  @on_grab: () => {
    animate position to [0, 2, 0] over 200ms
    animate position to [0, 1, 0] over 200ms
  }
}

✓ Generated (1 orb, 2 traits, 1 handler)

hs> [Tab]
@grabbable    @physics    @networked    @sensor    ...

hs>
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "ink": "^4.4.0",
    "ink-text-input": "^5.0.0",
    "ink-spinner": "^5.0.0",
    "chalk": "^5.3.0",
    "figlet": "^1.7.0"
  }
}
```

---

## Integration with Infinity Protocol

The terminal should reflect the 7-phase workflow:

| Phase | Terminal Feature |
|-------|-----------------|
| **INTAKE** | `.ai` - gather requirements from user |
| **REFLECT** | Parse and analyze code, show AST |
| **EXECUTE** | Run code, show results |
| **COMPRESS** | `.∞` - show compression stats |
| **GROW** | Suggest related traits/patterns |
| **RE-INTAKE** | Load and review previous code |
| **EVOLVE** | `.optimize` - improve code quality |

---

## Competitive Positioning

| Feature | Claude Code | Aider | Gemini CLI | **Infinitus** |
|---------|-------------|-------|------------|---------------|
| Autocomplete | ✅ | ✅ | ✅ | 🔜 |
| Syntax Highlighting | ✅ | ✅ | ✅ | 🔜 |
| AI Generation | ✅ | ✅ | ✅ | 🔜 |
| Streaming | ✅ | ✅ | ✅ | 🔜 |
| **Domain-Specific (VR/IoT)** | ❌ | ❌ | ❌ | ✅ |
| **165+ Built-in Traits** | ❌ | ❌ | ❌ | ✅ |
| **Compression Protocol** | ❌ | ❌ | ❌ | ✅ |

**Unique advantage**: HoloScript-specific AI that understands VR, IoT, and digital twin domains with 165+ built-in traits.

---

## Related Documents

- [Full Research](file:///C:/Users/josep/Documents/GitHub/AI_Workspace/uAA2++_Protocol/4.GROW/research/2026-02-05_infinitus-dev-terminal-enhancements.md)
- [Infinity Protocol](../packages/core/src/lib/infinity-protocol.hs)
- [LLM Service Architecture](../services/llm-service/ARCHITECTURE.md)

---

*Research conducted via uAA2++ Protocol v3.0*
