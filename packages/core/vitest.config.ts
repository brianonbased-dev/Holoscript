import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use forks to avoid memory issues with workers
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
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
  },
});
