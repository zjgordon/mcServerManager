#!/usr/bin/env ts-node

import { spawn, ChildProcess } from 'child_process';
import { existsSync, watch, FSWatcher } from 'fs';
import { join } from 'path';

interface DevServerConfig {
  port: number;
  host: string;
  watchPaths: string[];
  restartDelay: number;
  maxRestarts: number;
  environment: string;
}

class DevServer {
  private config: DevServerConfig;
  private serverProcess: ChildProcess | null = null;
  private watchers: FSWatcher[] = [];
  private restartCount = 0;
  private isShuttingDown = false;

  constructor() {
    this.config = {
      port: parseInt(process.env.PORT || '5001'),
      host: process.env.HOST || 'localhost',
      watchPaths: ['src', 'prisma'],
      restartDelay: 1000,
      maxRestarts: 10,
      environment: 'development',
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
    this.log('Validating development environment...');
    
    // Check if required files exist
    const requiredFiles = [
      'package.json',
      'tsconfig.json',
      'src/index.ts',
      'prisma/schema.prisma',
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }
    
    // Check if node_modules exists
    if (!existsSync('node_modules')) {
      this.log('node_modules not found, installing dependencies...', 'warn');
      this.installDependencies();
    }
    
    this.log('Environment validation passed', 'success');
  }

  private installDependencies(): void {
    this.log('Installing dependencies...');
    
    const npm = spawn('npm', ['install'], {
      stdio: 'inherit',
      shell: true,
    });
    
    npm.on('close', (code) => {
      if (code !== 0) {
        throw new Error(`Failed to install dependencies (exit code: ${code})`);
      }
      this.log('Dependencies installed successfully', 'success');
    });
  }

  private startServer(): void {
    if (this.serverProcess) {
      this.log('Server already running', 'warn');
      return;
    }
    
    this.log(`Starting development server on ${this.config.host}:${this.config.port}...`);
    
    const args = [
      '--transpile-only',
      '--inspect=0.0.0.0:9229',
      'src/index.ts'
    ];
    
    this.serverProcess = spawn('ts-node', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: this.config.environment,
        PORT: this.config.port.toString(),
        HOST: this.config.host,
        DEBUG: 'app:*',
        LOG_LEVEL: 'debug',
      },
    });
    
    this.serverProcess.on('error', (error) => {
      this.log(`Server error: ${error.message}`, 'error');
      this.handleServerCrash();
    });
    
    this.serverProcess.on('exit', (code, signal) => {
      if (!this.isShuttingDown) {
        this.log(`Server exited with code ${code} and signal ${signal}`, 'warn');
        this.handleServerCrash();
      }
    });
    
    this.log('Development server started', 'success');
  }

  private handleServerCrash(): void {
    if (this.isShuttingDown) return;
    
    this.restartCount++;
    
    if (this.restartCount > this.config.maxRestarts) {
      this.log(`Maximum restart attempts (${this.config.maxRestarts}) reached`, 'error');
      this.shutdown();
      return;
    }
    
    this.log(`Restarting server (attempt ${this.restartCount}/${this.config.maxRestarts})...`, 'warn');
    
    setTimeout(() => {
      this.serverProcess = null;
      this.startServer();
    }, this.config.restartDelay);
  }

  private setupFileWatchers(): void {
    this.log('Setting up file watchers...');
    
    for (const watchPath of this.config.watchPaths) {
      if (existsSync(watchPath)) {
        const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
          if (filename && !this.isShuttingDown) {
            this.log(`File changed: ${join(watchPath, filename)} (${eventType})`);
            this.restartServer();
          }
        });
        
        this.watchers.push(watcher);
        this.log(`Watching: ${watchPath}`);
      }
    }
  }

  private restartServer(): void {
    if (this.isShuttingDown) return;
    
    this.log('Restarting server due to file changes...', 'warn');
    
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
    
    setTimeout(() => {
      this.startServer();
    }, this.config.restartDelay);
  }

  private setupSignalHandlers(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    for (const signal of signals) {
      process.on(signal, () => {
        this.log(`Received ${signal}, shutting down...`, 'warn');
        this.shutdown();
      });
    }
  }

  private shutdown(): void {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.log('Shutting down development server...', 'warn');
    
    // Close file watchers
    for (const watcher of this.watchers) {
      watcher.close();
    }
    
    // Kill server process
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
    
    this.log('Development server stopped', 'success');
    process.exit(0);
  }

  private displayServerInfo(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 MINECRAFT SERVER MANAGER - DEVELOPMENT SERVER');
    console.log('='.repeat(60));
    console.log(`📍 Server: http://${this.config.host}:${this.config.port}`);
    console.log(`🔧 Debugger: ws://${this.config.host}:9229`);
    console.log(`📚 API Docs: http://${this.config.host}:${this.config.port}/docs`);
    console.log(`🏥 Health: http://${this.config.host}:${this.config.port}/healthz`);
    console.log('='.repeat(60));
    console.log('💡 Press Ctrl+C to stop the server');
    console.log('🔄 Server will auto-restart on file changes');
    console.log('='.repeat(60) + '\n');
  }

  public async start(): Promise<void> {
    try {
      this.log('Starting development server...');
      
      this.validateEnvironment();
      this.setupSignalHandlers();
      this.setupFileWatchers();
      this.startServer();
      this.displayServerInfo();
      
      // Keep the process alive
      setInterval(() => {
        // Health check - ensure server is still running
        if (this.serverProcess && this.serverProcess.killed) {
          this.handleServerCrash();
        }
      }, 5000);
      
    } catch (error) {
      this.log(`Failed to start development server: ${error}`, 'error');
      process.exit(1);
    }
  }
}

// Run the dev server if this script is executed directly
if (require.main === module) {
  const devServer = new DevServer();
  devServer.start().catch(error => {
    console.error('Development server failed:', error);
    process.exit(1);
  });
}

export default DevServer;
