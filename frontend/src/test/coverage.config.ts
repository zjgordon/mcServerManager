import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // Coverage provider
      provider: 'v8',
      
      // Coverage reporters
      reporter: [
        'text',           // Console output
        'text-summary',   // Summary in console
        'json',           // JSON format
        'json-summary',   // JSON summary
        'html',           // HTML report
        'lcov',           // LCOV format for CI
        'clover'          // Clover format
      ],
      
      // Output directory
      reportsDirectory: './coverage',
      
      // Include patterns
      include: [
        'src/**/*.{js,jsx,ts,tsx}'
      ],
      
      // Exclude patterns
      exclude: [
        // Test files
        'src/**/*.{test,spec}.{js,jsx,ts,tsx}',
        'src/**/__tests__/**/*',
        'src/test/**/*',
        
        // Type definitions
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        
        // Entry points
        'src/main.tsx',
        
        // Index files (usually just exports)
        'src/**/index.ts',
        'src/**/index.tsx',
        
        // Configuration files
        'src/constants/**/*',
        
        // Mock files
        'src/**/__mocks__/**/*',
        'src/**/mocks/**/*',
        
        // Build artifacts
        'dist/**/*',
        'build/**/*',
        
        // Node modules
        'node_modules/**/*'
      ],
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Per-file thresholds for critical files
        'src/components/auth/**/*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/components/server/**/*': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/components/admin/**/*': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/services/**/*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        'src/hooks/**/*': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      
      // Watermarks for coverage reports
      watermarks: {
        statements: [50, 80],
        functions: [50, 80],
        branches: [50, 80],
        lines: [50, 80]
      },
      
      // Coverage collection options
      all: true,
      skipFull: false,
      
      // Custom coverage collection
      customProviderModule: undefined,
      
      // Coverage instrumentation
      instrument: true,
      
      // Coverage source maps
      sourcemap: true,
      
      // Coverage clean
      clean: true,
      cleanOnRerun: true
    }
  }
})
