#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

interface BuildConfig {
  version: string;
  buildTime: string;
  nodeVersion: string;
  environment: string;
}

class ProductionBuilder {
  private config: BuildConfig;
  private buildDir = './dist';
  private tempDir = './.build-temp';

  constructor() {
    this.config = {
      version: this.getVersion(),
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      environment: 'production',
    };
  }

  private getVersion(): string {
    try {
      const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  private log(message: string): void {
    console.log(`[BUILD] ${message}`);
  }

  private exec(command: string, options: { cwd?: string; stdio?: 'inherit' | 'pipe' } = {}): string {
    try {
      return execSync(command, { 
        cwd: options.cwd || process.cwd(),
        stdio: options.stdio || 'pipe',
        encoding: 'utf8'
      });
    } catch (error) {
      throw new Error(`Command failed: ${command}\n${error}`);
    }
  }

  private cleanBuildDirectories(): void {
    this.log('Cleaning build directories...');
    
    if (existsSync(this.buildDir)) {
      rmSync(this.buildDir, { recursive: true, force: true });
    }
    
    if (existsSync(this.tempDir)) {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
    
    mkdirSync(this.buildDir, { recursive: true });
    mkdirSync(this.tempDir, { recursive: true });
  }

  private validateEnvironment(): void {
    this.log('Validating environment...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 18) {
      throw new Error(`Node.js version ${nodeVersion} is not supported. Please use Node.js 18 or higher.`);
    }
    
    // Check required files
    const requiredFiles = [
      'package.json',
      'tsconfig.prod.json',
      'src/index.ts',
      'prisma/schema.prisma'
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }
    
    this.log(`Environment validation passed (Node.js ${nodeVersion})`);
  }

  private installDependencies(): void {
    this.log('Installing production dependencies...');
    
    // Install all dependencies first
    this.exec('npm ci --only=production', { stdio: 'inherit' });
    
    // Install dev dependencies for build
    this.exec('npm ci --only=development', { stdio: 'inherit' });
  }

  private generatePrismaClient(): void {
    this.log('Generating Prisma client...');
    this.exec('npx prisma generate', { stdio: 'inherit' });
  }

  private compileTypeScript(): void {
    this.log('Compiling TypeScript...');
    this.exec('npx tsc --project tsconfig.prod.json', { stdio: 'inherit' });
  }

  private copyAssets(): void {
    this.log('Copying assets...');
    
    const assetsToCopy = [
      { src: 'package.json', dest: 'package.json' },
      { src: 'prisma/schema.prisma', dest: 'prisma/schema.prisma' },
      { src: 'prisma/migrations', dest: 'prisma/migrations' },
    ];
    
    for (const asset of assetsToCopy) {
      const srcPath = asset.src;
      const destPath = join(this.buildDir, asset.dest);
      
      if (existsSync(srcPath)) {
        // Create destination directory if it doesn't exist
        mkdirSync(dirname(destPath), { recursive: true });
        
        if (existsSync(srcPath) && require('fs').statSync(srcPath).isDirectory()) {
          // Copy directory recursively
          this.exec(`cp -r "${srcPath}" "${destPath}"`);
        } else {
          // Copy file
          copyFileSync(srcPath, destPath);
        }
        
        this.log(`Copied: ${srcPath} -> ${destPath}`);
      }
    }
  }

  private createBuildInfo(): void {
    this.log('Creating build information...');
    
    const buildInfo = {
      ...this.config,
      buildId: `build-${Date.now()}`,
      gitCommit: this.getGitCommit(),
      gitBranch: this.getGitBranch(),
    };
    
    const buildInfoPath = join(this.buildDir, 'build-info.json');
    writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
    
    this.log(`Build info created: ${buildInfoPath}`);
  }

  private getGitCommit(): string {
    try {
      return this.exec('git rev-parse HEAD').trim();
    } catch {
      return 'unknown';
    }
  }

  private getGitBranch(): string {
    try {
      return this.exec('git rev-parse --abbrev-ref HEAD').trim();
    } catch {
      return 'unknown';
    }
  }

  private optimizePackageJson(): void {
    this.log('Optimizing package.json for production...');
    
    const packageJsonPath = join(this.buildDir, 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    
    // Remove dev dependencies and scripts not needed in production
    delete packageJson.devDependencies;
    delete packageJson.scripts;
    
    // Add production-specific scripts
    packageJson.scripts = {
      start: 'node index.js',
      'start:prod': 'NODE_ENV=production node index.js',
    };
    
    // Add production metadata
    packageJson.buildInfo = this.config;
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  private validateBuild(): void {
    this.log('Validating build...');
    
    // Check if main entry point exists
    const mainFile = join(this.buildDir, 'index.js');
    if (!existsSync(mainFile)) {
      throw new Error('Main entry point not found in build output');
    }
    
    // Check if Prisma client is generated
    const prismaClient = join(this.buildDir, 'node_modules/.prisma/client');
    if (!existsSync(prismaClient)) {
      throw new Error('Prisma client not found in build output');
    }
    
    // Test if the built application can be required
    try {
      require(join(process.cwd(), this.buildDir, 'index.js'));
      this.log('Build validation passed');
    } catch (error) {
      throw new Error(`Build validation failed: ${error}`);
    }
  }

  private generateBuildReport(): void {
    this.log('Generating build report...');
    
    const report = {
      buildConfig: this.config,
      buildTime: new Date().toISOString(),
      buildDuration: Date.now() - parseInt(this.config.buildTime),
      buildSize: this.getBuildSize(),
      files: this.getBuildFiles(),
    };
    
    const reportPath = join(this.buildDir, 'build-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Build report generated: ${reportPath}`);
  }

  private getBuildSize(): number {
    try {
      const output = this.exec(`du -sb ${this.buildDir}`);
      return parseInt(output.split('\t')[0]);
    } catch {
      return 0;
    }
  }

  private getBuildFiles(): string[] {
    try {
      const output = this.exec(`find ${this.buildDir} -type f`);
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch {
      return [];
    }
  }

  private cleanup(): void {
    this.log('Cleaning up temporary files...');
    
    if (existsSync(this.tempDir)) {
      rmSync(this.tempDir, { recursive: true, force: true });
    }
  }

  public async build(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.log('Starting production build...');
      
      this.validateEnvironment();
      this.cleanBuildDirectories();
      this.installDependencies();
      this.generatePrismaClient();
      this.compileTypeScript();
      this.copyAssets();
      this.createBuildInfo();
      this.optimizePackageJson();
      this.validateBuild();
      this.generateBuildReport();
      this.cleanup();
      
      const duration = Date.now() - startTime;
      this.log(`Production build completed successfully in ${duration}ms`);
      
    } catch (error) {
      this.log(`Build failed: ${error}`);
      this.cleanup();
      process.exit(1);
    }
  }
}

// Run the build if this script is executed directly
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

export default ProductionBuilder;
