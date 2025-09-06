import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    setupFiles: ['./src/tests/setup.ts'],
    reporters: ['verbose'],
    outputFile: {
      json: './test-results.json',
      junit: './test-results.xml',
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
