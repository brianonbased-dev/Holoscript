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
