# HoloScript Version Alignment Plan

**Date**: February 3, 2026  
**Current State**: Versions misaligned, only 2 packages published to npm  
**Target State**: All packages at 2.1.0+ with consistent versions, all published to npm

---

## 📊 Current Status Matrix

| Package | Local Version | NPM Published | Status |
| --------- | --------------- | --------------- | -------- |
| @holoscript/core | 2.1.0 | ✅ Yes (2.1.0) | Aligned |
| @holoscript/cli | 2.1.0 | ✅ Yes (2.1.0) | Aligned |
| @holoscript/runtime | 2.1.0 | 🔴 No | Ready to publish |
| @holoscript/formatter | 2.0.0 | 🔴 No | **Needs bump to 2.1.0** |
| @holoscript/linter | 2.0.0 | 🔴 No | **Needs bump to 2.1.0** |
| @holoscript/lsp | 2.0.0 | 🔴 No | **Needs bump to 2.1.0** |
| @holoscript/std | 1.0.0 | 🔴 No | **Needs bump to 2.1.0** |
| @holoscript/fs | 1.0.0 | 🔴 No | **Needs bump to 2.1.0** |
| @holoscript/test | 1.0.0 | 🔴 No | **Needs bump to 2.1.0** |
| @holoscript/sdk | 0.0.1 | 🔴 No | **Incomplete, needs implementation** |
| vscode-extension | 1.3.5 | ? | **Needs alignment check** |

---

## 🔄 Dependency Graph

```txt
holoscript (root)
├── @holoscript/core ⚙️ (foundation - no dependencies on other @holoscript packages)
│   └── (no @holoscript internal deps)
├── @holoscript/cli 🎯 (depends on core)
│   └── core
├── @holoscript/runtime 🔌 (depends on core)
│   └── core
├── @holoscript/formatter 🎨 (depends on core, runtime)
│   └── core, runtime
├── @holoscript/linter 🔍 (depends on core)
│   └── core
├── @holoscript/lsp 📝 (depends on core, runtime, linter)
│   └── core, runtime, linter
├── @holoscript/std 📚 (standard library - depends on core)
│   └── core
├── @holoscript/fs 💾 (depends on core)
│   └── core
├── @holoscript/test 🧪 (test utilities - depends on core)
│   └── core
├── @holoscript/sdk 🎁 (aggregates all - depends on all ⚠️)
│   └── ALL (needs completion)
└── vscode-extension 🔌 (depends on core, cli, lsp, linter, formatter)
    └── core, cli, lsp, linter, formatter
```

---

## 📋 Update Plan (Execution Order)

**Strategy**: Update in dependency order to avoid version mismatches.

### Phase 1: Update Versions (No Publishing Yet)

1. **@holoscript/core** (already 2.1.0) ✅ Skip
2. **@holoscript/runtime** (2.1.0 - no changes needed) ✅ Skip
3. **@holoscript/std** (1.0.0 → 2.1.0)
4. **@holoscript/fs** (1.0.0 → 2.1.0)
5. **@holoscript/test** (1.0.0 → 2.1.0)
6. **@holoscript/linter** (2.0.0 → 2.1.0)
7. **@holoscript/formatter** (2.0.0 → 2.1.0)
8. **@holoscript/lsp** (2.0.0 → 2.1.0) [depends on updated packages above]
9. **@holoscript/cli** (already 2.1.0) ✅ Skip
10. **@holoscript/sdk** (0.0.1 → need to complete implementation first!)
11. **vscode-extension** (1.3.5 → 2.1.0) [should align with core version]

### Phase 2: Update Internal Dependencies

- Update all package.json references to point to correct versions
- Ensure formatter depends on updated runtime
- Ensure lsp depends on updated linter
- Ensure sdk aggregates all at 2.1.0

### Phase 3: Publish Order

```bash
1. @holoscript/core (2.1.0) -- already published, skip
2. @holoscript/std (2.1.0) -- no internal deps
3. @holoscript/fs (2.1.0) -- no complicating deps
4. @holoscript/test (2.1.0) -- no complicating deps
5. @holoscript/runtime (2.1.0) -- already ready
6. @holoscript/linter (2.1.0) -- depends on core ✅
7. @holoscript/formatter (2.1.0) -- depends on core, runtime ✅
8. @holoscript/lsp (2.1.0) -- depends on core, runtime, linter ✅
9. @holoscript/cli (2.1.0) -- already published, skip
10. @holoscript/sdk (2.1.0) -- last - aggregates all
11. vscode-extension (2.1.0) -- depends on everything
```

---

## 🔄 Version Bump Details

### Minor Version Bumps (→ 2.1.0)

- **formatter**: 2.0.0 → 2.1.0
  - Rationale: Aligns with core, no breaking changes
  - Updated deps: core (2.1.0), runtime (2.1.0)

- **linter**: 2.0.0 → 2.1.0
  - Rationale: Aligns with core, new features from 2.2.0 changelog
  - Updated deps: core (2.1.0)

- **lsp**: 2.0.0 → 2.1.0
  - Rationale: Aligns with core, uses updated linter
  - Updated deps: core (2.1.0), runtime (2.1.0), linter (2.1.0)

### Major Version Bumps (1.0.0 → 2.1.0)

- **std**: 1.0.0 → 2.1.0
  - Rationale: Major upgrade for feature parity, new game constructs
  - Updated deps: core (2.1.0)

- **fs**: 1.0.0 → 2.1.0
  - Rationale: Major upgrade for consistency
  - Updated deps: core (2.1.0)

- **test**: 1.0.0 → 2.1.0
  - Rationale: Major upgrade for consistency, align with core
  - Updated deps: core (2.1.0)

### Special Cases

- **@holoscript/sdk**: 0.0.1 → 2.1.0
  - ⚠️ Currently incomplete
  - Needs implementation completion first
  - Should aggregate all published packages at 2.1.0

- **vscode-extension**: 1.3.5 → 2.1.0
  - Aligns with core version
  - Major bump: 1.x → 2.x
  - Updated deps: core (2.1.0), cli (2.1.0), lsp (2.1.0), linter (2.1.0), formatter (2.1.0)

---

## 🎯 Command Sequence

```bash
# Phase 1: Update package.json files (automated via script)
# Phase 2: Update internal dependencies
# Phase 3: Build all packages
pnpm build

# Phase 4: Run tests to verify no breaking changes
pnpm test

# Phase 5: Publish to npm (in dependency order)
cd packages/std && npm publish --access public
cd ../fs && npm publish --access public
cd ../test && npm publish --access public
cd ../runtime && npm publish --access public
cd ../linter && npm publish --access public
cd ../formatter && npm publish --access public
cd ../lsp && npm publish --access public
cd ../sdk && npm publish --access public (AFTER IMPLEMENTATION)
cd ../vscode-extension && npm publish --access public
```

---

## ✅ Success Criteria

- [ ] All packages bumped to 2.1.0 (except sdk → 2.1.0 after completion)
- [ ] All internal version references updated
- [ ] All packages build without errors: `pnpm build`
- [ ] All tests pass: `pnpm test`
- [ ] All packages published to npm in correct order
- [ ] npm registry shows versions: `npm view @holoscript/X`
- [ ] SDK package implementation completed and published
- [ ] vscode-extension updated and published at 2.1.0
- [ ] Changelog updated to reflect publication dates

---

## ⚠️ Blockers & Notes

1. **SDK Package (0.0.1)** — Currently incomplete
   - Status: Blocking full ecosystem
   - Action: Review implementation, complete before publishing
   - Priority: HIGH

2. **NPM Authentication**
   - Current: Token issue noted in npm view output
   - Action: Need to `npm login` before publishing
   - Priority: HIGH

3. **Breaking Changes Review**
   - Major bumps (1.0.0 → 2.x) should be reviewed for breaking changes
   - These packages haven't been published, so no external consumers affected
   - Action: Quick review of std, fs, test for breaking changes
   - Priority: MEDIUM

4. **Changelog Updates**
   - Latest features in CHANGELOG.md are v2.2.0
   - Consider whether to jump to 2.2.0 instead of 2.1.0
   - Or wait for 2.1.0 stabilization, then plan 2.2.0 release
   - Priority: LOW

---

## 📝 Implementation Checklist

- [ ] Review @holoscript/sdk implementation status
- [ ] npm login (get fresh auth token)
- [ ] Update all package.json versions to 2.1.0
- [ ] Update internal dependency references
- [ ] Run `pnpm install` to update lock file
- [ ] Run `pnpm build` - verify no errors
- [ ] Run `pnpm test` - verify passing
- [ ] Publish packages in order (Phase 3 above)
- [ ] Verify each publication: `npm view @holoscript/X version`
- [ ] Update CHANGELOG.md with publication dates
- [ ] Tag release: `git tag -a v2.1.0 -m "Release HoloScript 2.1.0 and ecosystem packages"`
- [ ] Push tags: `git push origin --tags`

---

## 🔗 References

- Root workspace config: `pnpm-workspace.yaml`
- Publishing guide: `CONTRIBUTING.md`
- Version script: `scripts/version.js`
- Registry info: npm.js.org/@holoscript/*

