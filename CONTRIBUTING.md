# Contributing to HoloScript

HoloScript is open source under the MIT license. We welcome contributions from the community.

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

## Getting Started

```bash
git clone https://github.com/brianonbased-dev/holoscript.git
cd HoloScript
pnpm install
pnpm build
pnpm test
```

**Requirements:** Node.js >= 18, pnpm 8+

## Repository Structure

```
packages/
  core/           # Parser, types, traits, compilers, LSP
  runtime/        # React Three Fiber execution engine
  cli/            # Command-line tools
  lsp/            # Language Server Protocol server
  formatter/      # Code formatter
  linter/         # Static analysis
  std/            # Standard library
  vscode-extension/ # VS Code extension
  ...             # 20+ additional packages
```

## What to Contribute

**High-value contributions:**
- New trait implementations (see `packages/core/src/traits/`)
- Compiler target improvements (see `packages/core/src/compiler/`)
- LSP features (completions, diagnostics, hover info)
- Documentation and examples
- Bug fixes with test coverage
- Performance improvements

**Before starting large features**, open an issue to discuss the approach.

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make changes and add tests
4. Run checks: `pnpm build && pnpm test`
5. Submit a pull request

## Adding a New Trait

Every trait follows the same pattern across these files:

| Step | File | Action |
|------|------|--------|
| 1 | `core/src/types/HoloScriptPlus.d.ts` | Add trait interface |
| 2 | `core/src/constants.ts` | Add to `VR_TRAITS` and `LIFECYCLE_HOOKS` |
| 3 | `core/src/types.ts` | Add lifecycle hook type unions |
| 4 | `core/src/traits/YourTrait.ts` | Create handler with `TraitHandler<T>` |
| 5 | `core/src/traits/VRTraitSystem.ts` | Import and register handler |
| 6 | `core/src/index.ts` | Export handler and types |
| 7 | `core/src/lsp/HoloScriptLSP.ts` | Add completion entry |
| 8 | `core/src/compiler/*.ts` | Add mappings to each compiler |

See any existing trait file in `core/src/traits/` for the template pattern.

## Code Style

- TypeScript strict mode (`noUnusedLocals: true`)
- Prefer `import type` for type-only imports
- Use `as const` for literal union types
- No default exports except in trait files (convention)
- Run `pnpm lint` before submitting
- Run `pnpm format` to auto-format code with Prettier

Configuration files: `.eslintrc.json` (linting rules), `.prettierrc` (formatting), `.editorconfig` (editor settings).

For VR development patterns, see the [Best Practices Guide](./docs/guides/best-practices.md).

## Commit Messages

Use conventional commits:
- `feat:` New feature or trait
- `fix:` Bug fix
- `docs:` Documentation
- `refactor:` Code restructuring
- `test:` Test additions
- `chore:` Build/tooling changes

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Commercial Ecosystem

HoloScript is fully open source. The commercial products **Hololand** (platform) and **Infinity Assistant** (AI) are built on top of HoloScript and are separately maintained. See the [NOTICE](./NOTICE) file for details.

## Questions?

- Open an [issue](https://github.com/brianonbased-dev/holoscript/issues)
- Visit [infinityassistant.io](https://infinityassistant.io) for AI-powered help
