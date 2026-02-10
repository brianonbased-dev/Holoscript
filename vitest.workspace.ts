export default [
  // ── Packages with their own vitest.config.ts ──────────────────────────
  'packages/core/vitest.config.ts',
  'packages/cli/vitest.config.ts',
  'packages/formatter/vitest.config.ts',
  'packages/linter/vitest.config.ts',
  'packages/lsp/vitest.config.ts',
  'packages/vscode-extension/vitest.config.ts',
  'packages/adapter-postgres/vitest.config.ts',

  // ── Packages without a vitest.config.ts (inline) ──────────────────────
  {
    test: {
      name: 'partner-sdk',
      root: './packages/partner-sdk',
      include: ['src/**/*.test.ts'],
      exclude: ['**/dist/**', '**/node_modules/**'],
    },
  },
  {
    test: {
      name: 'marketplace-api',
      root: './packages/marketplace-api',
      include: ['src/**/*.test.ts'],
      exclude: ['**/dist/**', '**/node_modules/**'],
    },
  },
];
