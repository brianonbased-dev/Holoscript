# HoloScript IntelliJ Plugin

Full HoloScript language support for IntelliJ IDEA, WebStorm, PyCharm, and other JetBrains IDEs.

## Features

- **Syntax Highlighting** - Beautiful color-coded syntax for all HoloScript files
- **Code Completion** - Smart completions for keywords, traits, properties, and events
- **Error Checking** - Real-time diagnostics and error detection
- **Navigation** - Go to definition, find references, file structure
- **Formatting** - Automatic code formatting
- **Live Templates** - Code snippets for common patterns

## Supported File Types

| Extension | Description |
|-----------|-------------|
| `.hs` | Classic HoloScript |
| `.hsplus` | HoloScript Plus (with VR traits) |
| `.holo` | Declarative Composition |

## Installation

### From JetBrains Marketplace

1. Open your IDE
2. Go to **Settings** → **Plugins** → **Marketplace**
3. Search for "HoloScript"
4. Click **Install**
5. Restart your IDE

### From Disk

1. Download the latest `.zip` from [Releases](https://github.com/holoscript/holoscript/releases)
2. Go to **Settings** → **Plugins** → ⚙️ → **Install Plugin from Disk**
3. Select the downloaded ZIP file
4. Restart your IDE

## LSP Integration

The plugin connects to `holoscript-lsp` for advanced language features.

### Installing the LSP Server

```bash
npm install -g @holoscript/lsp
```

The plugin will automatically find the LSP server if it's installed globally.

## Development

### Prerequisites

- JDK 17+
- Gradle 8+

### Building

```bash
cd packages/intellij
./gradlew build
```

### Running in Development

```bash
./gradlew runIde
```

This will start a sandboxed IntelliJ instance with the plugin installed.

### Testing

```bash
./gradlew test
```

### Building for Distribution

```bash
./gradlew buildPlugin
```

The plugin ZIP will be in `build/distributions/`.

## Color Scheme

The plugin provides custom colors for:

| Element | Default Color |
|---------|---------------|
| Keywords | Purple |
| Traits (@annotations) | Yellow |
| Object names | Blue |
| Properties | Cyan |
| Events | Green |
| Strings | Orange |
| Numbers | Blue |
| Comments | Gray |

Colors can be customized in **Settings** → **Editor** → **Color Scheme** → **HoloScript**.

## Live Templates

The plugin includes live templates for common patterns:

| Abbreviation | Expansion |
|--------------|-----------|
| `orb` | New orb object |
| `grab` | Grabbable object |
| `anim` | Animation block |
| `on` | Event handler |

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Format File | `Ctrl+Alt+Shift+H` |
| New HoloScript File | Available in New menu |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `./gradlew test`
5. Submit a pull request

## License

Apache-2.0
