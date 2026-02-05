# @holoscript/core

Core HoloScript parser, AST, and compiler infrastructure.

## Installation

```bash
npm install @holoscript/core
```

## Usage

```typescript
import { Parser, tokenize, compile } from '@holoscript/core';

// Parse HoloScript source
const parser = new Parser();
const ast = parser.parse(source);

// Compile to target
const output = compile(ast, { target: 'web' });
```

## Features

- 🔍 **Multi-format Parser** - Supports .hs, .hsplus, and .holo files
- 🌳 **Complete AST** - Full abstract syntax tree representation
- ✅ **Validation** - Comprehensive error checking
- 🔧 **Compile Targets** - Web, VR, AR, Unity, Unreal, Godot

## API Reference

### Parser

```typescript
class Parser {
  parse(source: string): AST;
  parseHolo(source: string): HoloAST;
  parseHSPlus(source: string): HSPlusAST;
}
```

### Tokenizer

```typescript
function tokenize(source: string): Token[];
```

### Compiler

```typescript
function compile(ast: AST, options: CompileOptions): CompileResult;
```

## License

MIT
