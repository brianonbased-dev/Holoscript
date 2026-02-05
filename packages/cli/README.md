# @holoscript/cli

Command-line interface for HoloScript development.

## Installation

```bash
npm install -g @holoscript/cli
```

## Commands

### Build

Compile HoloScript files:

```bash
holoscript build src/
holoscript build --target web --output dist/
```

### Lint

Check for issues:

```bash
holoscript lint src/
holoscript lint --fix src/
```

### Format

Format code:

```bash
holoscript fmt src/
```

### Workspace

Manage team workspaces:

```bash
holoscript workspace create my-team
holoscript workspace list
holoscript workspace invite user@example.com
```

### Registry

Manage packages:

```bash
holoscript publish
holoscript login
holoscript search "vr physics"
```

### Dev

Start development server:

```bash
holoscript dev
holoscript dev --port 3000
```

## Configuration

Create `holoscript.config.json`:

```json
{
  "$schema": "https://holoscript.dev/schemas/config.v3.json",
  "version": 3,
  "compiler": {
    "target": "web",
    "strict": true
  }
}
```

## License

MIT
