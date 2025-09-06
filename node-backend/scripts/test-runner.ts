#!/usr/bin/env ts-node

import { execSync, spawn } from 'child_process';
import { existsSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface TestConfig {
  environment: string;
  coverage: boolean;
  watch: boolean;
  ui: boolean;
  contract: boolean;
  parallel: boolean;
  timeout: number;
  retry: number;
}

interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage?: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
}

class TestRunner {
  private config: TestConfig;
  private testResults: TestResult[] = [];

  constructor() {
    this.config = {
      environment: process.env.NODE_ENV || 'test',
      coverage: process.argv.includes('--coverage'),
      watch: process.argv.includes('--watch'),
      ui: process.argv.includes('--ui'),
      contract: process.argv.includes('--contract'),
      parallel: !process.argv.includes('--no-parallel'),
      timeout: 30000,
      retry: 2,
    };
  }

  private log(message: string, type: 'info' | 'error' | 'warn' | 'success' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔵',
      error: '🔴',
      warn: '🟡',
      success: '🟢',
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  private validateEnvironment(): void {
    this.log('Validating test environment...');
    
    // Check if required files exist
    const requiredFiles = [
      'package.json',
      'vitest.config.ts',
      'src/tests/setup.ts',
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required test file not found: ${file}`);
      }
    }
    
    // Check if node_modules exists
    if (!existsSync('node_modules')) {
      this.log('node_modules not found, installing dependencies...', 'warn');
      this.installDependencies();
    }
    
    this.log('Test environment validation passed', 'success');
  }

  private installDependencies(): void {
    this.log('Installing test dependencies...');
    
    try {
      execSync('npm install', { stdio: 'inherit' });
      this.log('Test dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install test dependencies: ${error}`);
    }
  }

  private setupTestEnvironment(): void {
    this.log('Setting up test environment...');
    
    // Create test directories
    const testDirs = [
      './test-results',
      './coverage',
      './test-data',
    ];
    
    for (const dir of testDirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    
    // Clean previous test results
    this.cleanTestResults();
    
    // Set test environment variables
    process.env.NODE_ENV = this.config.environment;
    process.env.LOG_LEVEL = 'error';
    process.env.DATABASE_URL = 'file:./test.db';
    process.env.REDIS_URL = 'redis://localhost:6379/15';
    
    this.log('Test environment setup completed', 'success');
  }

  private cleanTestResults(): void {
    this.log('Cleaning previous test results...');
    
    const cleanPaths = [
      './test-results.*',
      './coverage',
      './test.db',
      './test.db-journal',
    ];
    
    for (const path of cleanPaths) {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
      }
    }
  }

  private runUnitTests(): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      this.log('Running unit tests...');
      
      const configFile = this.config.coverage ? 'vitest.config.coverage.ts' : 'vitest.config.ts';
      const args = [
        'run',
        '--config', configFile,
        '--reporter=verbose',
        '--reporter=json',
        '--outputFile=test-results.json',
      ];
      
      if (this.config.coverage) {
        args.push('--coverage');
      }
      
      if (this.config.parallel) {
        args.push('--threads');
      } else {
        args.push('--no-threads');
      }
      
      const vitest = spawn('npx', ['vitest', ...args], {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
        },
      });
      
      vitest.on('close', (code) => {
        if (code === 0) {
          this.log('Unit tests completed successfully', 'success');
          resolve(this.parseTestResults());
        } else {
          this.log(`Unit tests failed with exit code ${code}`, 'error');
          reject(new Error(`Unit tests failed with exit code ${code}`));
        }
      });
      
      vitest.on('error', (error) => {
        this.log(`Unit test error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  private runContractTests(): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      this.log('Running contract tests...');
      
      const args = [
        'run',
        '--config', 'vitest.contract.config.ts',
        '--reporter=verbose',
        '--reporter=json',
        '--outputFile=contract-test-results.json',
      ];
      
      const vitest = spawn('npx', ['vitest', ...args], {
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
        },
      });
      
      vitest.on('close', (code) => {
        if (code === 0) {
          this.log('Contract tests completed successfully', 'success');
          resolve(this.parseTestResults('contract-test-results.json'));
        } else {
          this.log(`Contract tests failed with exit code ${code}`, 'error');
          reject(new Error(`Contract tests failed with exit code ${code}`));
        }
      });
      
      vitest.on('error', (error) => {
        this.log(`Contract test error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  private parseTestResults(filename: string = 'test-results.json'): TestResult {
    try {
      if (existsSync(filename)) {
        const results = JSON.parse(readFileSync(filename, 'utf8'));
        return {
          passed: results.numPassedTests || 0,
          failed: results.numFailedTests || 0,
          skipped: results.numTodoTests || 0,
          duration: results.testResults?.reduce((sum: number, test: any) => sum + test.perfStats.end - test.perfStats.start, 0) || 0,
        };
      }
    } catch (error) {
      this.log(`Failed to parse test results: ${error}`, 'warn');
    }
    
    return {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
  }

  private parseCoverageResults(): TestResult['coverage'] {
    try {
      if (existsSync('./coverage/coverage-summary.json')) {
        const coverage = JSON.parse(readFileSync('./coverage/coverage-summary.json', 'utf8'));
        const total = coverage.total;
        
        return {
          statements: total.statements.pct,
          branches: total.branches.pct,
          functions: total.functions.pct,
          lines: total.lines.pct,
        };
      }
    } catch (error) {
      this.log(`Failed to parse coverage results: ${error}`, 'warn');
    }
    
    return undefined;
  }

  private generateTestReport(): void {
    this.log('Generating test report...');
    
    const totalResults = this.testResults.reduce((acc, result) => ({
      passed: acc.passed + result.passed,
      failed: acc.failed + result.failed,
      skipped: acc.skipped + result.skipped,
      duration: acc.duration + result.duration,
    }), { passed: 0, failed: 0, skipped: 0, duration: 0 });
    
    const coverage = this.parseCoverageResults();
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      summary: totalResults,
      coverage,
      testSuites: this.testResults,
      config: this.config,
    };
    
    const reportPath = './test-results/test-report.json';
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Test report generated: ${reportPath}`);
    
    // Display summary
    this.displayTestSummary(totalResults, coverage);
  }

  private displayTestSummary(results: TestResult, coverage?: TestResult['coverage']): void {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST EXECUTION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`⏱️  Duration: ${(results.duration / 1000).toFixed(2)}s`);
    
    if (coverage) {
      console.log('\n📊 COVERAGE SUMMARY');
      console.log('='.repeat(60));
      console.log(`📝 Statements: ${coverage.statements.toFixed(2)}%`);
      console.log(`🌿 Branches: ${coverage.branches.toFixed(2)}%`);
      console.log(`🔧 Functions: ${coverage.functions.toFixed(2)}%`);
      console.log(`📏 Lines: ${coverage.lines.toFixed(2)}%`);
    }
    
    console.log('='.repeat(60));
    
    if (results.failed > 0) {
      console.log('❌ Some tests failed. Check the output above for details.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed!');
    }
  }

  private runWatchMode(): void {
    this.log('Starting test watch mode...');
    
    const configFile = this.config.coverage ? 'vitest.config.coverage.ts' : 'vitest.config.ts';
    const args = [
      '--config', configFile,
      '--watch',
    ];
    
    if (this.config.coverage) {
      args.push('--coverage');
    }
    
    const vitest = spawn('npx', ['vitest', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: this.config.environment,
      },
    });
    
    vitest.on('error', (error) => {
      this.log(`Test watch error: ${error.message}`, 'error');
      process.exit(1);
    });
  }

  private runUIMode(): void {
    this.log('Starting test UI mode...');
    
    const configFile = this.config.coverage ? 'vitest.config.coverage.ts' : 'vitest.config.ts';
    const args = [
      '--config', configFile,
      '--ui',
    ];
    
    if (this.config.coverage) {
      args.push('--coverage');
    }
    
    const vitest = spawn('npx', ['vitest', ...args], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: this.config.environment,
      },
    });
    
    vitest.on('error', (error) => {
      this.log(`Test UI error: ${error.message}`, 'error');
      process.exit(1);
    });
  }

  public async run(): Promise<void> {
    try {
      this.log('Starting test runner...');
      
      this.validateEnvironment();
      this.setupTestEnvironment();
      
      if (this.config.watch) {
        this.runWatchMode();
        return;
      }
      
      if (this.config.ui) {
        this.runUIMode();
        return;
      }
      
      // Run unit tests
      const unitResults = await this.runUnitTests();
      this.testResults.push(unitResults);
      
      // Run contract tests if requested
      if (this.config.contract) {
        const contractResults = await this.runContractTests();
        this.testResults.push(contractResults);
      }
      
      this.generateTestReport();
      
    } catch (error) {
      this.log(`Test runner failed: ${error}`, 'error');
      process.exit(1);
    }
  }
}

// Run the test runner if this script is executed directly
if (require.main === module) {
  const testRunner = new TestRunner();
  testRunner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export default TestRunner;
