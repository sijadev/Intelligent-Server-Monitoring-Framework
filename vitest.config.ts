import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds per test
    hookTimeout: 15000, // 15 seconds for setup/teardown (increased for server startup)
    teardownTimeout: 5000,
    maxConcurrency: 1, // Run tests sequentially to avoid port conflicts
    pool: 'forks', // Isolate tests in separate processes
    reporters: ['verbose'],
    include: ['tests/**/*.test.ts'],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'tests/examples/**',
      'tests/utils/**', // support utilities (not direct test specs)
      'tests/setup/**',
    ],

    // Retry configuration for flaky tests
    retry: process.env.CI ? 3 : 1, // More retries in CI environment

    // Setup files for test utilities
    setupFiles: [
      './tests/setup/lightweight-mode-setup.ts',
      './tests/setup/env-bridge-setup.ts',
      './tests/setup/test-retry-setup.ts',
      './tests/setup/test-migration-setup.ts',
    ],

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      PORT: '3001', // Use different port than development (3000)
      TEST_MODE: 'true',
      TEST_VERBOSE: process.env.TEST_VERBOSE || 'false',
    },

    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json', 'lcov'],
      exclude: ['tests/examples/**', 'tests/setup/**', 'tests/utils/**', 'scripts/**'],
    },
  },
});
