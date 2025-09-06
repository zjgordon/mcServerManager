#!/usr/bin/env ts-node

/**
 * Express Service Setup Script
 * 
 * Sets up the Express service on port 5001 with comprehensive configuration,
 * environment validation, and service initialization.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { logger } from '../src/config/logger';
import { config } from '../src/config';

interface ServiceSetupResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
}

class ExpressServiceSetup {
  private setupResults: ServiceSetupResult[] = [];

  private addResult(success: boolean, message: string, details?: any, errors?: string[]): void {
    this.setupResults.push({ success, message, details, errors });
    const icon = success ? '✅' : '❌';
    console.log(`${icon} ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
    if (errors && errors.length > 0) {
      console.log(`   Errors: ${errors.join(', ')}`);
    }
  }

  // Validate environment configuration
  async validateEnvironment(): Promise<boolean> {
    console.log('\n🔍 Validating environment configuration...');
    
    const errors: string[] = [];
    
    // Check required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'CSRF_SECRET'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing required environment variable: ${envVar}`);
      }
    }
    
    // Check port configuration
    if (config.port < 1 || config.port > 65535) {
      errors.push(`Invalid port configuration: ${config.port}`);
    }
    
    // Check database URL
    if (!config.databaseUrl) {
      errors.push('Database URL not configured');
    }
    
    // Check Redis configuration
    if (!config.redisUrl) {
      errors.push('Redis URL not configured');
    }
    
    if (errors.length > 0) {
      this.addResult(false, 'Environment validation failed', { errors });
      return false;
    }
    
    this.addResult(true, 'Environment validation passed', {
      port: config.port,
      nodeEnv: config.nodeEnv,
      databaseUrl: config.databaseUrl ? 'configured' : 'not configured',
      redisUrl: config.redisUrl ? 'configured' : 'not configured'
    });
    
    return true;
  }

  // Check port availability
  async checkPortAvailability(): Promise<boolean> {
    console.log('\n🔌 Checking port availability...');
    
    try {
      const response = await axios.get(`http://localhost:${config.port}/healthz`, {
        timeout: 5000
      });
      
      this.addResult(false, `Port ${config.port} is already in use`, {
        status: response.status,
        message: 'Another service is running on this port'
      });
      return false;
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        this.addResult(true, `Port ${config.port} is available`);
        return true;
      } else {
        this.addResult(false, `Error checking port ${config.port}`, { error: error.message });
        return false;
      }
    }
  }

  // Validate dependencies
  async validateDependencies(): Promise<boolean> {
    console.log('\n📦 Validating dependencies...');
    
    try {
      // Check if node_modules exists
      if (!existsSync(join(process.cwd(), 'node_modules'))) {
        this.addResult(false, 'node_modules not found', { message: 'Run npm install first' });
        return false;
      }
      
      // Check if package.json exists
      if (!existsSync(join(process.cwd(), 'package.json'))) {
        this.addResult(false, 'package.json not found');
        return false;
      }
      
      // Check if TypeScript is available
      try {
        execSync('npx tsc --version', { stdio: 'pipe' });
        this.addResult(true, 'TypeScript is available');
      } catch (error) {
        this.addResult(false, 'TypeScript not available', { message: 'Install TypeScript first' });
        return false;
      }
      
      // Check if ts-node is available
      try {
        execSync('npx ts-node --version', { stdio: 'pipe' });
        this.addResult(true, 'ts-node is available');
      } catch (error) {
        this.addResult(false, 'ts-node not available', { message: 'Install ts-node first' });
        return false;
      }
      
      return true;
    } catch (error: any) {
      this.addResult(false, 'Dependency validation failed', { error: error.message });
      return false;
    }
  }

  // Setup environment file
  async setupEnvironmentFile(): Promise<boolean> {
    console.log('\n📝 Setting up environment file...');
    
    try {
      const envPath = join(process.cwd(), '.env');
      const envExamplePath = join(process.cwd(), '.env.example');
      
      // Check if .env exists
      if (existsSync(envPath)) {
        this.addResult(true, '.env file already exists');
        return true;
      }
      
      // Check if .env.example exists
      if (!existsSync(envExamplePath)) {
        this.addResult(false, '.env.example not found', { message: 'Create .env.example first' });
        return false;
      }
      
      // Copy .env.example to .env
      const envExampleContent = readFileSync(envExamplePath, 'utf8');
      writeFileSync(envPath, envExampleContent);
      
      this.addResult(true, '.env file created from .env.example');
      return true;
    } catch (error: any) {
      this.addResult(false, 'Failed to setup environment file', { error: error.message });
      return false;
    }
  }

  // Validate database connection
  async validateDatabaseConnection(): Promise<boolean> {
    console.log('\n🗄️ Validating database connection...');
    
    try {
      // Check if database file exists (for SQLite)
      if (config.databaseUrl.startsWith('file:')) {
        const dbPath = config.databaseUrl.replace('file:', '');
        if (!existsSync(dbPath)) {
          this.addResult(false, 'Database file not found', { path: dbPath });
          return false;
        }
        this.addResult(true, 'Database file exists', { path: dbPath });
      } else {
        this.addResult(true, 'Database URL configured', { url: config.databaseUrl });
      }
      
      return true;
    } catch (error: any) {
      this.addResult(false, 'Database validation failed', { error: error.message });
      return false;
    }
  }

  // Validate Redis connection
  async validateRedisConnection(): Promise<boolean> {
    console.log('\n🔴 Validating Redis connection...');
    
    try {
      const response = await axios.get(`http://localhost:${config.redisPort}`, {
        timeout: 5000
      });
      
      this.addResult(true, 'Redis connection successful', {
        host: config.redisHost,
        port: config.redisPort
      });
      return true;
    } catch (error: any) {
      this.addResult(false, 'Redis connection failed', {
        host: config.redisHost,
        port: config.redisPort,
        error: error.message
      });
      return false;
    }
  }

  // Build the application
  async buildApplication(): Promise<boolean> {
    console.log('\n🔨 Building application...');
    
    try {
      // Run TypeScript compilation
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      this.addResult(true, 'TypeScript compilation successful');
      
      // Run ESLint
      try {
        execSync('npm run lint', { stdio: 'pipe' });
        this.addResult(true, 'ESLint validation successful');
      } catch (error) {
        this.addResult(false, 'ESLint validation failed', { message: 'Fix linting errors' });
        return false;
      }
      
      return true;
    } catch (error: any) {
      this.addResult(false, 'Application build failed', { error: error.message });
      return false;
    }
  }

  // Test the service
  async testService(): Promise<boolean> {
    console.log('\n🧪 Testing service...');
    
    try {
      // Test health endpoint
      const response = await axios.get(`http://localhost:${config.port}/healthz`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        this.addResult(true, 'Service health check passed', {
          status: response.status,
          data: response.data
        });
        return true;
      } else {
        this.addResult(false, 'Service health check failed', {
          status: response.status,
          data: response.data
        });
        return false;
      }
    } catch (error: any) {
      this.addResult(false, 'Service test failed', { error: error.message });
      return false;
    }
  }

  // Run all setup steps
  async runSetup(): Promise<boolean> {
    console.log('🚀 Setting up Express service on port 5001...\n');
    
    const steps = [
      { name: 'Environment Validation', fn: () => this.validateEnvironment() },
      { name: 'Port Availability Check', fn: () => this.checkPortAvailability() },
      { name: 'Dependency Validation', fn: () => this.validateDependencies() },
      { name: 'Environment File Setup', fn: () => this.setupEnvironmentFile() },
      { name: 'Database Connection Validation', fn: () => this.validateDatabaseConnection() },
      { name: 'Redis Connection Validation', fn: () => this.validateRedisConnection() },
      { name: 'Application Build', fn: () => this.buildApplication() }
    ];
    
    let allPassed = true;
    
    for (const step of steps) {
      try {
        const result = await step.fn();
        if (!result) {
          allPassed = false;
        }
      } catch (error: any) {
        this.addResult(false, `${step.name} failed`, { error: error.message });
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log('\n🎉 Express service setup completed successfully!');
      console.log(`📊 Service will run on port ${config.port}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/healthz`);
      console.log(`📖 API documentation: http://localhost:${config.port}/docs`);
    } else {
      console.log('\n❌ Express service setup failed. Please fix the errors above.');
    }
    
    return allPassed;
  }

  // Get setup results
  getResults(): ServiceSetupResult[] {
    return this.setupResults;
  }

  // Generate setup report
  generateReport(): void {
    console.log('\n📊 Setup Report:');
    console.log('================');
    
    const totalSteps = this.setupResults.length;
    const passedSteps = this.setupResults.filter(r => r.success).length;
    const failedSteps = this.setupResults.filter(r => !r.success).length;
    
    console.log(`Total Steps: ${totalSteps}`);
    console.log(`✅ Passed: ${passedSteps}`);
    console.log(`❌ Failed: ${failedSteps}`);
    console.log(`Success Rate: ${((passedSteps / totalSteps) * 100).toFixed(1)}%`);
    
    if (failedSteps > 0) {
      console.log('\n❌ Failed Steps:');
      this.setupResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  - ${result.message}`);
          if (result.errors) {
            result.errors.forEach(error => console.log(`    Error: ${error}`));
          }
        });
    }
  }
}

// Main execution
async function main() {
  const setup = new ExpressServiceSetup();
  
  try {
    const success = await setup.runSetup();
    setup.generateReport();
    
    if (success) {
      console.log('\n🎯 Express service is ready to start!');
      console.log('Run: npm run express:service start');
      process.exit(0);
    } else {
      console.log('\n⚠️ Please fix the setup issues before starting the service.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Setup execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ExpressServiceSetup };
