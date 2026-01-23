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

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 

## [2.0.1] - 2026-01-18

### Added
- 

### Changed
- 

### Fixed
- 

### Removed
- 

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
