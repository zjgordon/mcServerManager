#!/usr/bin/env ts-node

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DeployConfig {
  environment: string;
  build: boolean;
  test: boolean;
  docker: boolean;
  push: boolean;
  registry: string;
  tag: string;
  namespace: string;
}

interface DeployReport {
  timestamp: string;
  environment: string;
  build: {
    success: boolean;
    duration: number;
    size: number;
  };
  test: {
    success: boolean;
    duration: number;
    coverage: number;
  };
  docker: {
    success: boolean;
    duration: number;
    imageSize: number;
    imageId: string;
  };
  deployment: {
    success: boolean;
    duration: number;
    url: string;
  };
}

class DeploymentRunner {
  private config: DeployConfig;
  private report: DeployReport;

  constructor() {
    this.config = {
      environment: process.env.NODE_ENV || 'production',
      build: !process.argv.includes('--no-build'),
      test: !process.argv.includes('--no-test'),
      docker: !process.argv.includes('--no-docker'),
      push: process.argv.includes('--push'),
      registry: process.env.DOCKER_REGISTRY || 'localhost:5000',
      tag: process.env.DOCKER_TAG || 'latest',
      namespace: process.env.DOCKER_NAMESPACE || 'mcserver',
    };

    this.report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      build: { success: false, duration: 0, size: 0 },
      test: { success: false, duration: 0, coverage: 0 },
      docker: { success: false, duration: 0, imageSize: 0, imageId: '' },
      deployment: { success: false, duration: 0, url: '' },
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
    this.log('Validating deployment environment...');
    
    // Check if required files exist
    const requiredFiles = [
      'package.json',
      'Dockerfile.prod',
      'docker-compose.yml',
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required deployment file not found: ${file}`);
      }
    }
    
    // Check if Docker is available
    try {
      execSync('docker --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Docker is not available. Please install Docker.');
    }
    
    // Check if Docker Compose is available
    try {
      execSync('docker-compose --version', { stdio: 'pipe' });
    } catch {
      throw new Error('Docker Compose is not available. Please install Docker Compose.');
    }
    
    this.log('Deployment environment validation passed', 'success');
  }

  private runBuild(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.build) {
        this.log('Skipping build step', 'warn');
        this.report.build.success = true;
        resolve();
        return;
      }
      
      this.log('Running production build...');
      const startTime = Date.now();
      
      try {
        execSync('npm run build:prod', { stdio: 'inherit' });
        
        this.report.build.success = true;
        this.report.build.duration = Date.now() - startTime;
        
        // Calculate build size
        if (existsSync('./dist')) {
          const output = execSync('du -sb ./dist', { encoding: 'utf8' });
          this.report.build.size = parseInt(output.split('\t')[0]);
        }
        
        this.log('Production build completed successfully', 'success');
        resolve();
      } catch (error) {
        this.report.build.duration = Date.now() - startTime;
        this.log(`Production build failed: ${error}`, 'error');
        reject(error);
      }
    });
  }

  private runTests(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.test) {
        this.log('Skipping test step', 'warn');
        this.report.test.success = true;
        resolve();
        return;
      }
      
      this.log('Running tests...');
      const startTime = Date.now();
      
      try {
        execSync('npm run test:coverage', { stdio: 'inherit' });
        
        this.report.test.success = true;
        this.report.test.duration = Date.now() - startTime;
        
        // Parse coverage results
        if (existsSync('./coverage/coverage-summary.json')) {
          const coverage = JSON.parse(readFileSync('./coverage/coverage-summary.json', 'utf8'));
          this.report.test.coverage = coverage.total.lines.pct;
        }
        
        this.log('Tests completed successfully', 'success');
        resolve();
      } catch (error) {
        this.report.test.duration = Date.now() - startTime;
        this.log(`Tests failed: ${error}`, 'error');
        reject(error);
      }
    });
  }

  private buildDockerImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.docker) {
        this.log('Skipping Docker build step', 'warn');
        this.report.docker.success = true;
        resolve();
        return;
      }
      
      this.log('Building Docker image...');
      const startTime = Date.now();
      
      const imageName = `${this.config.registry}/${this.config.namespace}/mcserver-backend:${this.config.tag}`;
      
      try {
        execSync(`docker build -f Dockerfile.prod -t ${imageName} .`, { stdio: 'inherit' });
        
        this.report.docker.success = true;
        this.report.docker.duration = Date.now() - startTime;
        
        // Get image size and ID
        const imageInfo = execSync(`docker images ${imageName} --format "{{.Size}} {{.ID}}"`, { encoding: 'utf8' });
        const [size, id] = imageInfo.trim().split(' ');
        this.report.docker.imageSize = size;
        this.report.docker.imageId = id;
        
        this.log(`Docker image built successfully: ${imageName}`, 'success');
        resolve();
      } catch (error) {
        this.report.docker.duration = Date.now() - startTime;
        this.log(`Docker build failed: ${error}`, 'error');
        reject(error);
      }
    });
  }

  private pushDockerImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.config.push) {
        this.log('Skipping Docker push step', 'warn');
        resolve();
        return;
      }
      
      this.log('Pushing Docker image...');
      
      const imageName = `${this.config.registry}/${this.config.namespace}/mcserver-backend:${this.config.tag}`;
      
      try {
        execSync(`docker push ${imageName}`, { stdio: 'inherit' });
        this.log(`Docker image pushed successfully: ${imageName}`, 'success');
        resolve();
      } catch (error) {
        this.log(`Docker push failed: ${error}`, 'error');
        reject(error);
      }
    });
  }

  private deployApplication(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.log('Deploying application...');
      const startTime = Date.now();
      
      try {
        // Stop existing containers
        execSync('docker-compose down', { stdio: 'pipe' });
        
        // Start new containers
        execSync('docker-compose up -d', { stdio: 'inherit' });
        
        // Wait for health check
        this.waitForHealthCheck();
        
        this.report.deployment.success = true;
        this.report.deployment.duration = Date.now() - startTime;
        this.report.deployment.url = `http://localhost:5001`;
        
        this.log('Application deployed successfully', 'success');
        resolve();
      } catch (error) {
        this.report.deployment.duration = Date.now() - startTime;
        this.log(`Deployment failed: ${error}`, 'error');
        reject(error);
      }
    });
  }

  private waitForHealthCheck(): void {
    this.log('Waiting for health check...');
    
    const maxAttempts = 30;
    const delay = 2000;
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        execSync('curl -f http://localhost:5001/healthz', { stdio: 'pipe' });
        this.log('Health check passed', 'success');
        return;
      } catch {
        this.log(`Health check attempt ${i + 1}/${maxAttempts} failed, retrying...`, 'warn');
        if (i < maxAttempts - 1) {
          // Sleep for delay milliseconds
          const start = Date.now();
          while (Date.now() - start < delay) {
            // Busy wait
          }
        }
      }
    }
    
    throw new Error('Health check failed after maximum attempts');
  }

  private generateDeployReport(): void {
    this.log('Generating deployment report...');
    
    const reportPath = './deploy-report.json';
    writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    this.log(`Deployment report generated: ${reportPath}`);
    
    // Display summary
    this.displayDeploySummary();
  }

  private displayDeploySummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 DEPLOYMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`🌍 Environment: ${this.report.environment}`);
    console.log(`⏱️  Total Duration: ${this.getTotalDuration()}ms`);
    console.log('\n📦 Build:');
    console.log(`   ✅ Success: ${this.report.build.success}`);
    console.log(`   ⏱️  Duration: ${this.report.build.duration}ms`);
    console.log(`   📏 Size: ${this.formatBytes(this.report.build.size)}`);
    console.log('\n🧪 Tests:');
    console.log(`   ✅ Success: ${this.report.test.success}`);
    console.log(`   ⏱️  Duration: ${this.report.test.duration}ms`);
    console.log(`   📊 Coverage: ${this.report.test.coverage.toFixed(2)}%`);
    console.log('\n🐳 Docker:');
    console.log(`   ✅ Success: ${this.report.docker.success}`);
    console.log(`   ⏱️  Duration: ${this.report.docker.duration}ms`);
    console.log(`   📏 Image Size: ${this.report.docker.imageSize}`);
    console.log(`   🆔 Image ID: ${this.report.docker.imageId}`);
    console.log('\n🚀 Deployment:');
    console.log(`   ✅ Success: ${this.report.deployment.success}`);
    console.log(`   ⏱️  Duration: ${this.report.deployment.duration}ms`);
    console.log(`   🔗 URL: ${this.report.deployment.url}`);
    console.log('='.repeat(60));
    
    if (this.report.deployment.success) {
      console.log('✅ Deployment completed successfully!');
    } else {
      console.log('❌ Deployment failed. Check the logs above for details.');
      process.exit(1);
    }
  }

  private getTotalDuration(): number {
    return this.report.build.duration + 
           this.report.test.duration + 
           this.report.docker.duration + 
           this.report.deployment.duration;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  public async deploy(): Promise<void> {
    try {
      this.log('Starting deployment...');
      
      this.validateEnvironment();
      await this.runBuild();
      await this.runTests();
      await this.buildDockerImage();
      await this.pushDockerImage();
      await this.deployApplication();
      this.generateDeployReport();
      
    } catch (error) {
      this.log(`Deployment failed: ${error}`, 'error');
      process.exit(1);
    }
  }
}

// Run the deployment if this script is executed directly
if (require.main === module) {
  const deployment = new DeploymentRunner();
  deployment.deploy().catch(error => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
}

export default DeploymentRunner;
