# holoscript

Combined HoloScript package for easy installation.

## Installation

```bash
npm install holoscript
```

This installs all HoloScript packages:
- `@holoscript/core` - Parser and compiler
- `@holoscript/cli` - Command-line tools
- `@holoscript/linter` - Code linting
- `@holoscript/formatter` - Code formatting

## Quick Start

```bash
# Create a new project
npx holoscript init my-project
cd my-project

# Start development
npx holoscript dev

# Build for production
npx holoscript build
```

## Usage

```typescript
import { Parser, compile } from 'holoscript';

const parser = new Parser();
const ast = parser.parse(`
  orb player {
    position: [0, 1.6, 0]
    @grabbable
    @physics
  }
`);

const output = compile(ast, { target: 'web' });
```

## Documentation

- [Getting Started](https://holoscript.dev/docs/getting-started)
- [Language Reference](https://holoscript.dev/docs/reference)
- [API Docs](https://holoscript.dev/api)

## License

MIT
