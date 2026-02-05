# HoloScript 3.0 Release Notes

**Release Date:** February 2026

HoloScript 3.0 is a major release that brings powerful new capabilities for VR/XR development, improved tooling, and a complete ecosystem for building and publishing packages.

## Highlights

- **WASM Compilation** - Compile HoloScript to WebAssembly for high-performance edge execution
- **Certified Packages** - Quality assurance program for packages in the registry
- **Partner SDK** - Full SDK for ecosystem partners
- **HoloScript Academy** - Comprehensive learning platform (30 lessons)
- **Team Workspaces** - Collaborative package management with RBAC
- **Visual Scripting** - Node-based programming for non-coders
- **AI-Powered Autocomplete** - Context-aware code completion

---

## New Features

### Parser & Language

#### Spread Operator Support
Full support for JavaScript-style spread operators in arrays and objects:

```hsplus
const merged = [...array1, ...array2]
const combined = { ...base, ...overrides }
```

#### Enhanced Error Recovery
The parser now recovers from errors intelligently and continues parsing, providing comprehensive error reports with suggestions.

#### Rich Error Messages
Detailed error messages with:
- Exact error location with source context
- Similar identifier suggestions for typos
- Code fix suggestions
- Related information links

### Compiler

#### WASM Compilation Target
Compile HoloScript directly to WebAssembly:

```bash
holoscript compile scene.holo --target wasm -o scene.wat
```

Features:
- WAT (WebAssembly Text Format) output
- Automatic JavaScript bindings generation
- Memory layout management
- Optional SIMD and thread support

#### Incremental Compilation
Cache-based incremental compilation for faster rebuilds:
- Full compiler state serialization/deserialization
- Trait configuration change detection
- Semantic diffing for minimal recompilation

#### New Compilation Targets
- **URDF/SDF Export** - ROS 2/Gazebo robotics formats
- **W3C WoT Thing Descriptions** - IoT interoperability
- **DTDL Export** - Azure Digital Twins

### Runtime

#### Headless Runtime Profile
Lightweight server-side runtime for IoT, edge computing, and testing:

```typescript
const runtime = createHeadlessRuntime(composition, {
  profile: 'headless',
  tickRate: 10,
});
```

#### MQTT Protocol Bindings
Native MQTT pub/sub for IoT integration:

```hsplus
orb sensor {
  @mqtt_source {
    topic: "sensors/temperature"
    qos: 1
  }
}
```

### Package Management

#### Certified Packages Program
Quality assurance for packages:
- Automated checks for code quality, documentation, security, and maintenance
- Letter grades (A-F) based on comprehensive scoring
- Certification badges for qualified packages
- One-year certification validity

#### Publishing Workflow
```bash
holoscript publish [--dry-run] [--force] [--tag <tag>]
holoscript login/logout/whoami
```

#### Private Packages & Access Control
- Organization management
- Fine-grained access control (read/write/admin)
- Token-based authentication
- Visibility settings (public/private)

### Team Collaboration

#### Workspaces
Collaborative environments for teams:

```bash
holoscript workspace create "My Team"
holoscript workspace invite user@example.com --role developer
holoscript workspace secret set API_KEY "value"
```

Features:
- Role-based access control (Owner, Admin, Developer, Viewer)
- Shared secrets management
- Activity logging
- Team settings

### Developer Experience

#### Visual Scripting MVP
Node-based visual programming:
- Drag-and-drop node editor
- 95+ node types
- Real-time preview
- Export to HoloScript code

#### AI-Powered Autocomplete
Context-aware code completion:
- Multi-line completion
- Trait suggestion
- Property inference
- Documentation snippets

#### VS Code Extension Enhancements
- Semantic token highlighting
- 72 code snippets
- Inline error diagnostics
- Quick fixes

#### IntelliJ Plugin
Full IDE support for JetBrains products:
- Syntax highlighting
- Code completion
- Error checking
- Navigation

### Analysis Tools

#### Dead Code Detection
Find and remove unused code:

```typescript
const detector = new DeadCodeDetector(ast);
const deadCode = detector.findDeadCode();
```

#### Complexity Metrics
Measure code complexity:
- Cyclomatic complexity
- Cognitive complexity
- Maintainability index

#### Migration Assistant
Automated version migration:

```typescript
const migrator = new MigrationAssistant();
const result = await migrator.migrate(code, '2.0.0', '3.0.0');
```

### Documentation

#### HoloScript Academy
Comprehensive learning platform with 30 lessons across 3 levels:
- **Level 1: Fundamentals** (10 lessons) - Getting started
- **Level 2: Intermediate** (10 lessons) - Advanced features
- **Level 3: Advanced** (10 lessons) - Expert techniques

### Partner Ecosystem

#### Partner SDK
Full SDK for ecosystem partners:

```typescript
import { createPartnerSDK } from '@holoscript/partner-sdk';

const sdk = createPartnerSDK({
  partnerId: 'your-partner-id',
  apiKey: 'your-api-key',
  webhookSecret: 'your-webhook-secret',
});

// API access
const pkg = await sdk.api.getPackage('@org/package');

// Webhook handling
sdk.webhooks.onPackagePublished((event) => {
  console.log('Published:', event.data.name);
});

// Analytics
const stats = await sdk.analytics.getDownloadStats('@org/package');
```

---

## Breaking Changes

### Package.json
- Minimum Node.js version is now 18.0.0
- TypeScript 5.0+ required

### API Changes
- `parse()` now returns `HSPlusAST` instead of legacy format
- Removed deprecated `compile()` options
- `@networked` trait config restructured

### Migration

See [MIGRATION_GUIDE_3.0.md](./MIGRATION_GUIDE_3.0.md) for detailed migration instructions.

---

## Performance Improvements

- **50% faster parsing** with incremental parsing
- **3x faster rebuilds** with compilation caching
- **Reduced memory usage** in large projects
- **Parallel compilation** for multi-file projects

---

## Bug Fixes

- Fixed spread operator in nested objects
- Fixed trait dependency resolution cycles
- Fixed source map generation for complex expressions
- Fixed LSP crash on malformed input
- Fixed MQTT reconnection handling
- Fixed workspace permission inheritance

---

## Deprecations

The following features are deprecated and will be removed in 4.0:

- `@legacy_physics` trait - use `@physics` instead
- `compile({ format: 'cjs' })` - CommonJS output
- `HoloScriptParser` class - use `HoloScriptPlusParser`

---

## Contributors

Thanks to all contributors who made this release possible!

---

## Upgrade Instructions

```bash
# Update CLI
npm install -g @holoscript/cli@3.0.0

# Update project dependencies
npm install @holoscript/core@3.0.0

# Run migration assistant
holoscript migrate --to 3.0.0
```

---

## What's Next

See our [roadmap](./ROADMAP.md) for planned features in future releases.
