import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude problematic test file that causes OOM during collection
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/hsplus-files.test.ts', // Causes vitest OOM - run separately with node --max-old-space-size
    ],
    // Increase timeout for slower tests
    testTimeout: 30000,
    // Clear mocks between tests
    clearMocks: true,
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
      ],
      thresholds: {
        statements: 20,
        branches: 15,
        functions: 20,
        lines: 20,
      },
    },
  },
});
