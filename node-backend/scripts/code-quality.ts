#!/usr/bin/env ts-node

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface CodeQualityConfig {
  environment: string;
  fix: boolean;
  check: boolean;
  format: boolean;
  typeCheck: boolean;
  strict: boolean;
}

interface QualityReport {
  timestamp: string;
  environment: string;
  eslint: {
    errors: number;
    warnings: number;
    fixable: number;
  };
  prettier: {
    changed: number;
    unchanged: number;
  };
  typescript: {
    errors: number;
    warnings: number;
  };
  overall: {
    passed: boolean;
    score: number;
  };
}

class CodeQualityRunner {
  private config: CodeQualityConfig;
  private report: QualityReport;

  constructor() {
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      fix: process.argv.includes('--fix'),
      check: process.argv.includes('--check'),
      format: process.argv.includes('--format'),
      typeCheck: process.argv.includes('--type-check'),
      strict: process.argv.includes('--strict'),
    };

    this.report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      eslint: { errors: 0, warnings: 0, fixable: 0 },
      prettier: { changed: 0, unchanged: 0 },
      typescript: { errors: 0, warnings: 0 },
      overall: { passed: false, score: 0 },
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
    this.log('Validating code quality environment...');
    
    // Check if required files exist
    const requiredFiles = [
      'package.json',
      '.eslintrc.js',
      '.prettierrc',
      'tsconfig.json',
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required configuration file not found: ${file}`);
      }
    }
    
    // Check if node_modules exists
    if (!existsSync('node_modules')) {
      this.log('node_modules not found, installing dependencies...', 'warn');
      this.installDependencies();
    }
    
    this.log('Code quality environment validation passed', 'success');
  }

  private installDependencies(): void {
    this.log('Installing code quality dependencies...');
    
    try {
      execSync('npm install', { stdio: 'inherit' });
      this.log('Code quality dependencies installed successfully', 'success');
    } catch (error) {
      throw new Error(`Failed to install code quality dependencies: ${error}`);
    }
  }

  private runESLint(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Running ESLint...');
      
      const configFile = this.config.strict ? '.eslintrc.prod.js' : '.eslintrc.js';
      const args = [
        'src/**/*.ts',
        'scripts/**/*.ts',
        '--config', configFile,
        '--format', 'json',
        '--output-file', 'eslint-results.json',
      ];
      
      if (this.config.fix) {
        args.push('--fix');
      }
      
      if (this.config.check) {
        args.push('--max-warnings', '0');
      }
      
      const eslint = spawn('npx', ['eslint', ...args], {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
        },
      });
      
      let stdout = '';
      let stderr = '';
      
      eslint.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      eslint.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      eslint.on('close', (code) => {
        try {
          if (existsSync('eslint-results.json')) {
            const results = JSON.parse(readFileSync('eslint-results.json', 'utf8'));
            
            this.report.eslint.errors = results.reduce((sum: number, file: any) => 
              sum + file.errorCount, 0);
            this.report.eslint.warnings = results.reduce((sum: number, file: any) => 
              sum + file.warningCount, 0);
            this.report.eslint.fixable = results.reduce((sum: number, file: any) => 
              sum + file.fixableErrorCount + file.fixableWarningCount, 0);
          }
          
          if (code === 0) {
            this.log('ESLint completed successfully', 'success');
            resolve();
          } else {
            this.log(`ESLint found issues (exit code: ${code})`, 'warn');
            if (this.config.check) {
              reject(new Error(`ESLint found issues (exit code: ${code})`));
            } else {
              resolve();
            }
          }
        } catch (error) {
          this.log(`ESLint error: ${error}`, 'error');
          reject(error);
        }
      });
      
      eslint.on('error', (error) => {
        this.log(`ESLint error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  private runPrettier(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Running Prettier...');
      
      const args = [
        '--write',
        'src/**/*.{ts,js,json,md}',
        'scripts/**/*.{ts,js}',
        '*.{json,md}',
        '--config', '.prettierrc',
      ];
      
      if (this.config.check) {
        args[0] = '--check';
      }
      
      const prettier = spawn('npx', ['prettier', ...args], {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
        },
      });
      
      let stdout = '';
      let stderr = '';
      
      prettier.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      prettier.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      prettier.on('close', (code) => {
        // Parse prettier output to count changed/unchanged files
        const lines = stdout.split('\n').filter(line => line.trim());
        this.report.prettier.changed = lines.filter(line => 
          line.includes('changed') || line.includes('reformatted')).length;
        this.report.prettier.unchanged = lines.filter(line => 
          line.includes('unchanged') || line.includes('already formatted')).length;
        
        if (code === 0) {
          this.log('Prettier completed successfully', 'success');
          resolve();
        } else {
          this.log(`Prettier found issues (exit code: ${code})`, 'warn');
          if (this.config.check) {
            reject(new Error(`Prettier found issues (exit code: ${code})`));
          } else {
            resolve();
          }
        }
      });
      
      prettier.on('error', (error) => {
        this.log(`Prettier error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  private runTypeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Running TypeScript type checking...');
      
      const configFile = this.config.strict ? 'tsconfig.prod.json' : 'tsconfig.json';
      const args = [
        '--project', configFile,
        '--noEmit',
        '--pretty',
      ];
      
      const tsc = spawn('npx', ['tsc', ...args], {
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_ENV: this.config.environment,
        },
      });
      
      let stdout = '';
      let stderr = '';
      
      tsc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      tsc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      tsc.on('close', (code) => {
        // Parse TypeScript output to count errors and warnings
        const output = stdout + stderr;
        const errorMatches = output.match(/error TS\d+/g);
        const warningMatches = output.match(/warning TS\d+/g);
        
        this.report.typescript.errors = errorMatches ? errorMatches.length : 0;
        this.report.typescript.warnings = warningMatches ? warningMatches.length : 0;
        
        if (code === 0) {
          this.log('TypeScript type checking completed successfully', 'success');
          resolve();
        } else {
          this.log(`TypeScript found issues (exit code: ${code})`, 'warn');
          if (this.config.check) {
            reject(new Error(`TypeScript found issues (exit code: ${code})`));
          } else {
            resolve();
          }
        }
      });
      
      tsc.on('error', (error) => {
        this.log(`TypeScript error: ${error.message}`, 'error');
        reject(error);
      });
    });
  }

  private calculateQualityScore(): number {
    const maxErrors = 100;
    const maxWarnings = 200;
    
    const eslintScore = Math.max(0, 100 - 
      (this.report.eslint.errors * 10) - 
      (this.report.eslint.warnings * 5));
    
    const typescriptScore = Math.max(0, 100 - 
      (this.report.typescript.errors * 15) - 
      (this.report.typescript.warnings * 5));
    
    const prettierScore = this.report.prettier.changed > 0 ? 80 : 100;
    
    return Math.round((eslintScore + typescriptScore + prettierScore) / 3);
  }

  private generateQualityReport(): void {
    this.log('Generating code quality report...');
    
    this.report.overall.score = this.calculateQualityScore();
    this.report.overall.passed = this.report.overall.score >= 80;
    
    const reportPath = './code-quality-report.json';
    writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    this.log(`Code quality report generated: ${reportPath}`);
    
    // Display summary
    this.displayQualitySummary();
  }

  private displayQualitySummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 CODE QUALITY SUMMARY');
    console.log('='.repeat(60));
    console.log(`📊 Overall Score: ${this.report.overall.score}/100`);
    console.log(`✅ Status: ${this.report.overall.passed ? 'PASSED' : 'FAILED'}`);
    console.log('\n📝 ESLint Results:');
    console.log(`   ❌ Errors: ${this.report.eslint.errors}`);
    console.log(`   ⚠️  Warnings: ${this.report.eslint.warnings}`);
    console.log(`   🔧 Fixable: ${this.report.eslint.fixable}`);
    console.log('\n🎨 Prettier Results:');
    console.log(`   📝 Changed: ${this.report.prettier.changed}`);
    console.log(`   ✅ Unchanged: ${this.report.prettier.unchanged}`);
    console.log('\n🔧 TypeScript Results:');
    console.log(`   ❌ Errors: ${this.report.typescript.errors}`);
    console.log(`   ⚠️  Warnings: ${this.report.typescript.warnings}`);
    console.log('='.repeat(60));
    
    if (!this.report.overall.passed) {
      console.log('❌ Code quality check failed. Please fix the issues above.');
      process.exit(1);
    } else {
      console.log('✅ Code quality check passed!');
    }
  }

  public async run(): Promise<void> {
    try {
      this.log('Starting code quality runner...');
      
      this.validateEnvironment();
      
      // Run ESLint
      await this.runESLint();
      
      // Run Prettier
      if (this.config.format || this.config.check) {
        await this.runPrettier();
      }
      
      // Run TypeScript
      if (this.config.typeCheck || this.config.check) {
        await this.runTypeScript();
      }
      
      this.generateQualityReport();
      
    } catch (error) {
      this.log(`Code quality runner failed: ${error}`, 'error');
      process.exit(1);
    }
  }
}

// Run the code quality runner if this script is executed directly
if (require.main === module) {
  const qualityRunner = new CodeQualityRunner();
  qualityRunner.run().catch(error => {
    console.error('Code quality runner failed:', error);
    process.exit(1);
  });
}

export default CodeQualityRunner;
