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
