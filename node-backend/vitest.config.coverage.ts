import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.cache',
      '**/*.config.{js,ts}',
      '**/coverage/**',
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/__mocks__/**',
      'scripts/**',
      'prisma/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: [
        'text',
        'text-summary',
        'json',
        'json-summary',
        'html',
        'lcov',
        'clover',
        'cobertura',
      ],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/coverage/**',
        '**/test/**',
        '**/tests/**',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
        '**/__tests__/**',
        '**/__mocks__/**',
        'scripts/**',
        'prisma/**',
        'src/tests/**',
        'src/**/*.interface.ts',
        'src/**/*.type.ts',
        'src/**/*.enum.ts',
        'src/**/*.constant.ts',
      ],
      include: [
        'src/**/*.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Per-file thresholds for critical modules
        'src/services/**': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'src/middleware/**': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'src/routes/**': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
      // Coverage collection options
      all: true,
      skipFull: false,
      clean: true,
      cleanOnRerun: true,
      // Watermarks for coverage reports
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        lines: [80, 95],
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    setupFiles: ['./src/tests/setup.ts'],
    reporters: ['verbose', 'html', 'json'],
    outputFile: {
      json: './test-results.json',
      junit: './test-results.xml',
      html: './test-results.html',
    },
    // Test file patterns
    includeSource: ['src/**/*.{js,ts}'],
    // Parallel execution
    maxConcurrency: 5,
    // Retry failed tests
    retry: 2,
    // Test isolation
    isolate: true,
    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'error',
      DATABASE_URL: 'file:./test.db',
      REDIS_URL: 'redis://localhost:6379/15',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/config': resolve(__dirname, './src/config'),
      '@/middleware': resolve(__dirname, './src/middleware'),
      '@/routes': resolve(__dirname, './src/routes'),
      '@/controllers': resolve(__dirname, './src/controllers'),
      '@/services': resolve(__dirname, './src/services'),
      '@/models': resolve(__dirname, './src/models'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/types': resolve(__dirname, './src/types'),
      '@/schemas': resolve(__dirname, './src/schemas'),
    },
  },
});
