import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.test.ts'],
    timeout: 30000, // 30s timeout for integration tests
    testTimeout: 30000, // Individual test timeout
    hookTimeout: 30000, // Hook timeout
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/']
    },
    // Optimize for CI environment
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2
      }
    }
  }
});
