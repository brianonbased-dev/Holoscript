## [3.0.0] - 2026-02-05

### 🎉 HoloScript 3.0 - Major Release

This is a major release bringing WASM compilation, certified packages, partner SDK, and comprehensive ecosystem tooling.

### Added

#### WASM Compilation (Sprint 3)
- **WebAssembly Target** - Compile HoloScript to WAT format
- JavaScript bindings generation with TypeScript types
- Memory layout management (state, objects, events, strings)
- Optional SIMD and thread support
- CLI: `holoscript compile --target wasm`

#### Certified Packages Program (Sprint 9-10)
- **CertificationChecker** - Automated package quality verification
- Checks across 4 categories: code quality, documentation, security, maintenance
- Letter grades (A-F) based on comprehensive scoring
- **BadgeGenerator** - Create certification badges (SVG, Markdown, HTML, JSON)
- One-year certification validity with certificate IDs

#### Partner SDK (Sprint 9-10)
- **@holoscript/partner-sdk** - Full ecosystem integration SDK
- **RegistryClient** - Programmatic registry access
- **WebhookHandler** - Event processing for package/version/certification events
- **PartnerAnalytics** - Download stats, engagement metrics, health scores
- Express/Koa middleware support
- Rate limiting and retry handling

#### Team Workspaces (Sprint 8)
- **WorkspaceManager** - Collaborative environments
- Role-based access control (Owner, Admin, Developer, Viewer)
- Shared secrets management
- Activity logging and audit trail
- CLI commands: `holoscript workspace create/invite/secret`

#### HoloScript Academy (Sprint 8)
- 30 lessons across 3 levels
- Level 1: Fundamentals (10 lessons)
- Level 2: Intermediate (10 lessons)
- Level 3: Advanced (10 lessons)
- Hands-on exercises and projects

#### Visual Scripting (Sprint 7)
- Node-based visual programming
- 95+ node types
- Real-time preview
- Export to HoloScript code

#### AI-Powered Autocomplete (Sprint 7)
- Context-aware code completion
- Multi-line suggestions
- Trait and property inference

#### IntelliJ Plugin (Sprint 7)
- Full JetBrains IDE support
- Syntax highlighting
- Code completion
- Error checking

#### VS Code Extension Enhancements (Sprint 2)
- Semantic token highlighting
- 72 code snippets
- Inline error diagnostics
- Quick fixes

#### Dead Code Detection (Sprint 5)
- Find unused functions, variables, imports
- Configurable detection rules

#### Deprecation Warnings (Sprint 5)
- Linter rules for deprecated APIs
- Migration suggestions

#### Migration Assistant (Sprint 5)
- Automated version migration
- Code transformation rules
- Detailed migration reports

#### Complexity Metrics (Sprint 5)
- Cyclomatic complexity
- Cognitive complexity
- Maintainability index

#### Package Registry MVP (Sprint 5)
- Scoped packages (@org/name)
- Semantic versioning
- Dependency resolution

### Changed
- Minimum Node.js version: 18.0.0
- TypeScript 5.0+ required
- `parse()` now returns `HSPlusAST` format
- `@networked` trait config restructured
- Improved error messages with suggestions

### Deprecated
- `@legacy_physics` trait - use `@physics` instead
- `compile({ format: 'cjs' })` - CommonJS output
- `HoloScriptParser` class - use `HoloScriptPlusParser`

### Performance
- 50% faster parsing with incremental parsing
- 3x faster rebuilds with compilation caching
- Reduced memory usage in large projects
- Parallel compilation for multi-file projects

### Fixed
- Spread operator in nested objects
- Trait dependency resolution cycles
- Source map generation for complex expressions
- LSP crash on malformed input
- MQTT reconnection handling
- Workspace permission inheritance

---

## [2.5.0] - 2026-02-05

### 🚀 Package Publishing & Access Control (Sprint 6)

Full package publishing and registry integration with access control.

### Added

#### Package Publishing
- **`holoscript publish`** - Publish packages to HoloScript registry
  - Pre-publish validations (package.json, README, LICENSE, semver)
  - Tarball packaging with USTAR format and gzip compression
  - `--dry-run` - Preview without uploading
  - `--tag <tag>` - Version tag (default: "latest")
  - `--access <level>` - public or restricted
  - `--force` - Publish with warnings
  - `--otp <code>` - 2FA one-time password

#### Authentication
- **`holoscript login`** - Log in to HoloScript registry
- **`holoscript logout`** - Log out from registry
- **`holoscript whoami`** - Display current logged-in user

#### Access Control
- **`holoscript access grant <pkg> <user>`** - Grant access to a package
- **`holoscript access revoke <pkg> <user>`** - Revoke access
- **`holoscript access list <pkg>`** - List package access

#### Organization Management
- **`holoscript org create <name>`** - Create an organization
- **`holoscript org add-member <org> <user>`** - Add member with role
- **`holoscript org remove-member <org> <user>`** - Remove member
- **`holoscript org list-members <org>`** - List organization members

#### Token Management
- **`holoscript token create`** - Create API token for CI/CD
- **`holoscript token revoke <id>`** - Revoke a token
- **`holoscript token list`** - List your tokens
- Token options: `--name`, `--readonly`, `--scope`, `--expires`

### Changed
- Updated all package versions to 2.5.0
- Unified CLI help text with comprehensive examples for all commands

---

## [2.2.1] - 2026-02-05

### 🤖 Grok/X Integration

Enable Grok (xAI) to build, validate, and share HoloScript VR scenes directly in X conversations.

### Added
- **MCP Server** (`@holoscript/mcp-server@1.0.1`) - Full Model Context Protocol server with 16 tools for AI agents
- **Python Bindings** (`pip install holoscript`) - Python package for Grok's execution environment
- **Render Service** (`services/render-service/`) - Preview generation and X sharing endpoints
- **Browser Templates** (`examples/browser-templates/`) - Pre-built HTML templates for instant scene rendering
- **Social Traits** - 3 new traits: `@shareable`, `@collaborative`, `@tweetable`

### MCP Tools
| Tool | Purpose |
|------|---------|  
| `parse_hs` / `parse_holo` | Parse HoloScript files |
| `validate_holoscript` | AI-friendly validation |
| `generate_object` / `generate_scene` | Natural language → code |
| `list_traits` / `explain_trait` | Trait documentation |
| `render_preview` | Generate preview images |
| `create_share_link` | X-optimized share links |

### Python Usage
```python
from holoscript import HoloScript

hs = HoloScript()
scene = hs.generate("forest with glowing mushrooms")
share = hs.share(scene.code, platform="x")
print(share.playground_url)
```

### Links
- npm: https://www.npmjs.com/package/@holoscript/mcp-server
- PyPI: https://pypi.org/project/holoscript/
- Docs: [Grok/X Integration Guide](./docs/GROK_X_IMPLEMENTATION_SUMMARY.md)

---

## [2.2.0] - 2026-01-31

### 🎮 Brittney AI Game Generation Features

Major addition of game development constructs for Brittney AI content generation:

### Added
- **7 New Language Constructs** - RPG and game content definition blocks:
  - `npc "name" { }` - NPC Behavior Trees with types, models, and dialogue references
  - `quest "name" { }` - Quest Definition System with objectives, rewards, and branching
  - `ability "name" { }` - Ability/Spell definitions with class requirements and levels
  - `dialogue "id" { }` - Dialogue Trees with character, emotion, content, and options
  - `state_machine "name" { }` - State Machines for boss phases and complex behaviors
  - `achievement "name" { }` - Achievement System with points and hidden unlocks
  - `talent_tree "name" { }` - Talent Trees with tiers, nodes, and dependency chains

- **New AST Types** - Full type definitions for all game constructs:
  - `HoloNPC`, `HoloBehavior`, `HoloBehaviorAction`
  - `HoloQuest`, `HoloQuestObjective`, `HoloQuestRewards`, `HoloQuestBranch`
  - `HoloAbility`, `HoloAbilityStats`
  - `HoloDialogue`, `HoloDialogueOption`
  - `HoloStateMachine`, `HoloState_Machine`
  - `HoloAchievement`
  - `HoloTalentTree`, `HoloTalentRow`, `HoloTalentNode`

- **Brittney Training Data** - Examples for AI fine-tuning:
  - `brittney-features-examples.hsplus` - 8 comprehensive HoloScript examples
  - `brittney-features-training.jsonl` - 20 prompt/completion pairs

### Changed
- Parser now supports 46 tests (12 new Brittney feature tests)
- HoloComposition interface extended with: `npcs`, `quests`, `abilities`, `dialogues`, `stateMachines`, `achievements`, `talentTrees` arrays

### Example
```hsplus
composition "Starting Village" {
  npc "Elder Aldric" {
    npc_type: "quest_giver"
    dialogue_tree: "elder_intro"
  }

  quest "Goblin Menace" {
    giver: "Elder Aldric"
    level: 1
    type: "defeat"
    objectives: [
      { id: "defeat_goblins", type: "defeat", target: "goblin", count: 10 }
    ]
    rewards: { experience: 500, gold: 100 }
  }

  dialogue "elder_intro" {
    character: "Elder Aldric"
    emotion: "friendly"
    content: "Welcome, traveler. These are troubling times..."
    options: [
      { text: "What troubles the village?", next: "elder_troubles" }
    ]
  }

  achievement "Village Hero" {
    description: "Complete the Goblin Menace quest"
    points: 50
  }
}
```

---

## [2.1.1] - 2026-01-28

### 🔧 Parser Enhancements

Major HoloScript+ parser improvements for semantic scene descriptions:

### Added
- **16 Structural Directives** - Scene-level metadata and configuration
  - `@manifest` - Scene manifest with title, version, author
  - `@semantic` - Semantic description blocks
  - `@world_metadata` - World-level settings (theme, mood, time_of_day)
  - `@zones` - Named spatial zones with purposes
  - `@spawn_points` - Player spawn locations
  - `@skybox` - Skybox configuration (preset, time, clouds)
  - `@ambient_light` - Global ambient lighting
  - `@directional_light` - Sun/moon directional lights
  - `@fog` - Volumetric fog settings
  - `@post_processing` - Post-process effects
  - `@audio_zones` - 3D audio regions
  - `@navigation` - NavMesh configuration
  - `@physics_world` - Physics simulation settings
  - `@network_config` - Multiplayer networking
  - `@performance` - LOD and culling hints
  - `@accessibility` - A11y configuration

- **8 Simple Traits** - Concise object behavior modifiers
  - `@animated` - Mark objects for animation
  - `@billboard` - Always face camera
  - `@rotating` - Continuous rotation
  - `@collidable` - Physics collision
  - `@clickable` - Click interaction
  - `@glowing` - Emissive glow effect
  - `@interactive` - General interactivity
  - `@lod` - Level of detail switching

- **Logic Block Parsing** - Embedded scripting support
  - Function definitions with parameters
  - `on_tick` handlers for frame updates
  - `on_scene_load` initialization handlers
  - Event handlers for interactions

- **Template System** - Reusable object definitions
  - Named template blocks (`template "Name" { ... }`)
  - `using` syntax for template instantiation
  - Property overrides on instantiation

- **Environment Block** - Scene-wide lighting and atmosphere
  - Lighting directives within environment blocks
  - Skybox and fog configuration
  - Ambient and directional light settings

### Fixed
- Child node parsing for `logic`, `template`, `environment` blocks
  - Blocks now correctly parsed as children instead of properties
  - Fixed disambiguation between `logic: value` and `logic { ... }`

### Changed
- Parser now supports 687 tests (up from 679)
- Removed 3 outdated todo tests (features implemented in new parser)
- Unskipped 4 `parseObjectLiteral` tests

---

## [1.3.0] - 2026-01-26 (VS Code Extension)

### 🎓 Onboarding & Walkthrough

- **Getting Started Walkthrough** - 6-step interactive walkthrough for new users
  - Welcome to HoloScript introduction
  - Create Your First Scene guide
  - VR Traits tutorial (@grabbable, @physics, etc.)
  - Preview & Shortcuts documentation
  - AI Integration with MCP servers
  - Next Steps & Resources

- **Progressive Quickstart Examples** - 5 examples from basics to full games
  - `hello.holo` - Simple compositor, one interactive object
  - `2-interactive.holo` - VR traits, physics, interactions
  - `3-physics-playground.holo` - Templates, spatial audio
  - `4-multiplayer-room.holo` - Networking, player tracking
  - `5-escape-room.holo` - Complete puzzle game with UI

- **Welcome Message** - First-activation greeting with quick actions
- **New Commands** - Open Examples, Show Walkthrough, Open Documentation

---

## [2.2.0] - 2026-01-25

### 🚀 VR Runtime Packages

Three major new packages for building production VR experiences:

### Added
- **@holoscript/spatial-audio** - 3D positional audio for VR/AR
  - HRTF binaural processing with multiple datasets (CIPIC, KEMAR)
  - Room acoustics simulation (reflections, reverb, occlusion)
  - Spatial audio emitters with distance attenuation
  - Audio zone management for different acoustic regions
  - Full Web Audio API integration

- **@holoscript/state-sync** - Distributed state with CRDTs
  - Conflict-free replicated data types (GCounter, PNCounter, ORSet, etc.)
  - Delta synchronization for bandwidth efficiency
  - Merkle tree sync for state verification
  - Undo/redo with state history
  - Snapshot capture and restore
  - Perfect for multiplayer VR state management

- **@holoscript/streaming** - Asset and world streaming
  - Progressive loading with priority queues
  - LOD (Level of Detail) streaming
  - Memory + IndexedDB caching with smart eviction
  - Memory budget monitoring
  - Bundle loading for related assets

- **Debug Scripts** - Parser debugging utilities in `/scripts/`
- **AI Assistant Configuration** - Claude Desktop and Copilot integration

### Removed
- **@holoscript/llm** - Migrated to `@hololand/ai` (LLM inference is a platform service, not language tooling). AI trait definitions (`@llm_agent`, `@dialogue`, etc.) remain in `@holoscript/core`.

---

## [2.1.0] - 2026-01-22

### 🏗️ Repository Reorganization

Major structural change: HoloScript is now the dedicated language repository, separate from Hololand platform.

### Added
- **Dev Tools** - Consolidated all language tooling in this repo:
  - `@holoscript/formatter` - Code formatting (from Hololand)
  - `@holoscript/linter` - Static analysis (from Hololand)
  - `@holoscript/lsp` - Language Server Protocol (from Hololand)
  - `@holoscript/std` - Standard library (from Hololand)
  - `@holoscript/fs` - File system utilities (from Hololand)

### Removed
- Platform adapters moved to Hololand repo:
  - `@holoscript/babylon-adapter` → `@hololand/babylon-adapter`
  - `@holoscript/three-adapter` → `@hololand/three-adapter`
  - `@holoscript/playcanvas-adapter` → `@hololand/playcanvas-adapter`
  - `@holoscript/unity-adapter` → `@hololand/unity-adapter`
  - `@holoscript/vrchat-export` → `@hololand/vrchat-export`
  - `@holoscript/creator-tools` → `@hololand/creator-tools`

### Changed
- HoloScript is now the **language repo** (parser, runtime, dev tools)
- Hololand is now the **platform repo** (adapters, Brittney AI, apps)
- Updated LSP dependency from `@hololand/core` to `@holoscript/core`

### Fixed
- Runtime timing.ts TypeScript error with `requestIdleCallback` narrowing

## [2.0.2] - 2026-01-18

### Fixed
- Minor bug fixes and stability improvements following 2.0.0 release

## [2.0.1] - 2026-01-18

### Fixed
- Post-release patch for 2.0.0

## [2.0.0] - 2026-01-17

### Added
- Comprehensive test suite with 108+ tests (VoiceInputTrait, AIDriverTrait, TypeChecker, Runtime)
- VoiceInputTrait with Web Speech API integration, fuzzy matching, and event handling
- AIDriverTrait with behavior trees, GOAP planning, and 4 decision modes (reactive, goal-driven, learning, hybrid)
- Enhanced type inference system with support for all HoloScript types
- Runtime optimization with object pooling and caching
- DeveloperExperience tools with enhanced error formatting and REPL support
- Full CI/CD pipeline with GitHub Actions for automated testing and publishing
- Version management scripts for semantic versioning
- Complete NPM publishing infrastructure

### Changed
- Improved error messaging with source code context
- Enhanced CLI with better formatting and help text
- Optimized parser with better error recovery
- Type system now supports complex inference patterns

### Fixed
- Parser duplicate return statement (line 1067)
- Test suite alignment with actual implementation APIs
- Web Speech API graceful degradation in test environments

### Removed
- Removed aspirational test files that referenced non-existent APIs
- Cleaned up hanging test implementations

## [1.0.0-alpha.2] - 2026-01-16

### Changed
- Improved error messaging and source code context
- Enhanced CLI with better formatting

### Fixed
- Parser error handling and recovery

## [1.0.0-alpha.2] - 2026-01-16

### Added
- AIDriverTrait implementation with behavior trees
- Enhanced type system with inference
- Performance telemetry system
- Commerce system integration

### Fixed
- Test suite alignment with actual APIs
- Parser duplicate return statement

## [1.0.0-alpha.1] - 2026-01-16

### Added
- Initial HoloScript+ release
- VoiceInputTrait with Web Speech API
- Type checker with inference
- REPL and CLI tools
- Runtime execution engine
- Trait system for extensibility
