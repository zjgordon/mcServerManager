import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/**/*.{test,spec}.{js,ts}', 'contracts/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', '.git', '.cache', 'src/**/*'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Contract tests should run sequentially
      },
    },
    setupFiles: ['./scripts/test-setup.ts'],
    reporters: ['verbose'],
    outputFile: {
      json: './contract-test-results.json',
      junit: './contract-test-results.xml',
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
