# HoloScript Roadmap

**The language for spatial computing.**

HoloScript is a declarative language that compiles to 9+ platforms from a single source. This roadmap covers language features, tooling, and developer experience.

> 📦 **Platform adapters** (Three.js, Babylon, Unity, VRChat) are in [Hololand](https://github.com/brianonbased-dev/Hololand).

---

## Current Status (v2.1.0 - January 2026)

### ✅ Core Language
- [x] `.hsplus` parser with full trait support (49 VR traits)
- [x] `.holo` parser for simpler syntax
- [x] Type system with inference
- [x] Runtime execution engine
- [x] Module system (`@import`)
- [x] Expression interpolation (`${var}`)
- [x] Control flow (`@for`, `@if`, `while`)

### ✅ Developer Tools
- [x] `@holoscript/formatter` - Code formatting
- [x] `@holoscript/linter` - Static analysis (5 rules)
- [x] `@holoscript/lsp` - Language Server Protocol
- [x] `@holoscript/cli` - Command line tools

### ✅ Standard Library
- [x] `@holoscript/std` - Core utilities
- [x] `@holoscript/fs` - File system
- [x] `@holoscript/network` - Networking primitives

---

## Phase 1: Language Maturity 🔄 (Q1-Q2 2026)

**Goal**: Production-ready language with excellent error messages.

### 1.1: Parser Improvements
- [ ] Better error recovery - continue parsing after errors
- [ ] Source maps - map compiled output to original `.hsplus`
- [ ] Incremental parsing - only re-parse changed sections
- [ ] Parse validation caching - faster repeated builds

### 1.2: Type System
- [x] Generic types - `Collection<T>` ✅ (TypeAnnotationParser)
- [x] Union types - `string | number` ✅ (TypeAnnotationParser)
- [x] Optional chaining - `obj?.prop` ✅ (OptionalChainingParser)
- [ ] Null coalescing - `value ?? default`
- [ ] Type guards - `is` keyword

### 1.3: Error Messages
- [ ] Rich error context - show surrounding code
- [ ] Fix suggestions - "Did you mean `@grabbable`?"
- [ ] Error codes - documented error reference
- [ ] Multi-error reporting - don't stop at first error

### 1.4: Runtime Optimizations
- [ ] Object pooling - reduce GC pressure
- [ ] Hot path caching - frequently accessed values
- [ ] Lazy evaluation - defer computation
- [ ] Tree shaking - remove unused code

---

## Phase 2: Tooling Excellence 🔮 (Q2-Q3 2026)

**Goal**: Best-in-class developer experience.

### 2.1: Linter Enhancements
- [ ] 20+ built-in rules
- [ ] Auto-fix for all fixable rules
- [ ] Custom rule plugins
- [ ] Rule severity configuration
- [ ] Project-wide analysis

### 2.2: Formatter Updates
- [ ] Prettier-style opinionated formatting
- [ ] Config inheritance (extend configs)
- [ ] Editor integration (format on save)
- [ ] Range formatting (format selection)

### 2.3: LSP Features
- [x] Go to definition ✅ (server.ts)
- [x] Find all references ✅ (server.ts)
- [ ] Rename symbol
- [ ] Code actions (quick fixes)
- [ ] Workspace-wide diagnostics
- [x] Semantic highlighting ✅ (SemanticTokensProvider)

### 2.4: VS Code Extension
- [ ] Publish to marketplace
- [ ] Syntax highlighting (complete)
- [ ] Snippet library (50+ snippets)
- [ ] Trait documentation on hover
- [ ] Live preview panel
- [ ] Debug adapter

---

## Phase 3: Advanced Features 🌐 (Q3-Q4 2026)

**Goal**: Features for complex applications.

### 3.1: Networking Traits
- [x] `@networked` - automatic state sync ✅ (NetworkedTrait.ts)
- [x] `@replicated` - owner-authoritative sync ✅ (NetworkedTrait syncMode: 'owner')
- [x] `@rpc` - remote procedure calls ✅ (Parser support)
- [ ] `@lobby` - room/session management

### 3.2: AI Integration
- [ ] `@ai_driver` - behavior tree AI
- [ ] `@dialog` - conversational NPCs
- [ ] `@voice_input` - speech recognition
- [ ] `@voice_output` - text-to-speech

### 3.3: Physics Traits
- [ ] `@rigidbody` - physics simulation
- [x] `@joint` - connected bodies ✅ (JointTrait.ts - 7 joint types)
- [ ] `@trigger` - collision events
- [ ] `@character` - character controller

### 3.4: Animation Traits
- [ ] `@skeleton` - bone-based animation
- [ ] `@morph` - blend shapes
- [ ] `@animation` - animation clips
- [x] `@ik` - inverse kinematics ✅ (IKTrait.ts - FABRIK solver)

---

## Phase 4: Ecosystem 🚀 (2027+)

**Goal**: Thriving community and ecosystem.

### 4.1: Package Manager
- [ ] `holoscript add <package>` - install packages
- [ ] Package registry - publish/discover packages
- [ ] Dependency resolution
- [ ] Version management
- [ ] Lockfiles

### 4.2: Build System
- [ ] `holoscript build` - production builds
- [ ] Bundle optimization
- [ ] Code splitting
- [ ] Asset optimization
- [ ] Multi-target builds (web, native, VR)

### 4.3: Documentation
- [ ] docs.holoscript.dev
- [ ] Interactive tutorials
- [ ] API reference
- [ ] Cookbook/recipes
- [ ] Video courses

### 4.4: Testing
- [ ] `@holoscript/test` - unit testing
- [ ] VR scene testing
- [ ] Visual regression tests
- [ ] Performance benchmarks

---

## Packages

### Current (v2.1.0)

| Package | Purpose | Status |
|---------|---------|--------|
| `@holoscript/core` | Parser, AST, types | ✅ Production |
| `@holoscript/runtime` | Execution engine | ✅ Production |
| `@holoscript/cli` | Command line tools | ✅ Production |
| `@holoscript/formatter` | Code formatting | ✅ Production |
| `@holoscript/linter` | Static analysis | ✅ Production |
| `@holoscript/lsp` | Language Server | ✅ Production |
| `@holoscript/std` | Standard library | ✅ Production |
| `@holoscript/fs` | File system | ✅ Production |
| `@holoscript/network` | Networking | ✅ Production |
| `@holoscript/llm` | LLM integration | ✅ Production |

### Planned

| Package | Purpose | Target |
|---------|---------|--------|
| `@holoscript/test` | Testing framework | Q3 2026 |
| `@holoscript/bundler` | Build/bundle tool | Q4 2026 |
| `@holoscript/vscode` | VS Code extension | Q2 2026 |

---

## Contributing

```bash
git clone https://github.com/brianonbased-dev/HoloScript.git
cd HoloScript
pnpm install
pnpm build
pnpm test
```

### Priority Areas
1. **Parser improvements** - Error recovery, incremental parsing
2. **Linter rules** - More built-in rules
3. **LSP features** - Go to definition, find references
4. **Documentation** - Tutorials, API docs

---

## Related

- **[Hololand](https://github.com/brianonbased-dev/Hololand)** - VR/AR platform using HoloScript
- **[Infinity Assistant](https://infinityassistant.io)** - AI building assistant

---

*Last updated: 2026-01-24*
