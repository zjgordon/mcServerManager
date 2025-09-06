#!/usr/bin/env ts-node

/**
 * Express Service Manager
 * 
 * Manages the Express service on port 5001 with comprehensive service management,
 * health monitoring, and startup/shutdown capabilities.
 */

import { spawn, ChildProcess } from 'child_process';
import { createServer } from 'http';
import axios from 'axios';
import { logger } from '../src/config/logger';
import { config } from '../src/config';

interface ServiceStatus {
  isRunning: boolean;
  pid?: number;
  port: number;
  uptime?: number;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown';
  lastHealthCheck?: Date;
  error?: string;
}

interface ServiceMetrics {
  startTime: Date;
  restartCount: number;
  totalUptime: number;
  lastRestart?: Date;
  healthCheckCount: number;
  failedHealthChecks: number;
}

class ExpressServiceManager {
  private serviceProcess: ChildProcess | null = null;
  private serviceStatus: ServiceStatus = {
    isRunning: false,
    port: config.port
  };
  private serviceMetrics: ServiceMetrics = {
    startTime: new Date(),
    restartCount: 0,
    totalUptime: 0,
    healthCheckCount: 0,
    failedHealthChecks: 0
  };
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGUSR2', () => this.restart());
  }

  // Start the Express service
  async start(): Promise<void> {
    if (this.serviceStatus.isRunning) {
      logger.warn('Express service is already running');
      return;
    }

    try {
      logger.info('🚀 Starting Express service...');
      
      // Check if port is available
      await this.checkPortAvailability();
      
      // Start the service process
      this.serviceProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PORT: config.port.toString(),
          NODE_ENV: config.nodeEnv
        }
      });

      // Handle process events
      this.serviceProcess.on('spawn', () => {
        logger.info(`✅ Express service started with PID: ${this.serviceProcess?.pid}`);
        this.serviceStatus.isRunning = true;
        this.serviceStatus.pid = this.serviceProcess?.pid;
        this.serviceMetrics.startTime = new Date();
      });

      this.serviceProcess.on('error', (error) => {
        logger.error('❌ Express service error:', error);
        this.serviceStatus.error = error.message;
        this.serviceStatus.isRunning = false;
      });

      this.serviceProcess.on('exit', (code, signal) => {
        logger.info(`Express service exited with code: ${code}, signal: ${signal}`);
        this.serviceStatus.isRunning = false;
        this.serviceStatus.pid = undefined;
        
        if (!this.isShuttingDown && code !== 0) {
          logger.warn('Express service exited unexpectedly, attempting restart...');
          setTimeout(() => this.restart(), 5000);
        }
      });

      // Handle stdout/stderr
      this.serviceProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          logger.info(`[Express] ${output}`);
        }
      });

      this.serviceProcess.stderr?.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          logger.error(`[Express Error] ${error}`);
        }
      });

      // Wait for service to be ready
      await this.waitForServiceReady();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      logger.info('🎉 Express service started successfully');
    } catch (error) {
      logger.error('Failed to start Express service:', error);
      throw error;
    }
  }

  // Stop the Express service
  async stop(): Promise<void> {
    if (!this.serviceStatus.isRunning) {
      logger.warn('Express service is not running');
      return;
    }

    try {
      logger.info('🛑 Stopping Express service...');
      this.isShuttingDown = true;
      
      // Stop health monitoring
      this.stopHealthMonitoring();
      
      // Gracefully terminate the process
      if (this.serviceProcess) {
        this.serviceProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            logger.warn('Force killing Express service...');
            this.serviceProcess?.kill('SIGKILL');
            resolve();
          }, 10000);

          this.serviceProcess?.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      this.serviceStatus.isRunning = false;
      this.serviceStatus.pid = undefined;
      this.serviceStatus.healthStatus = 'unknown';
      
      logger.info('✅ Express service stopped');
    } catch (error) {
      logger.error('Failed to stop Express service:', error);
      throw error;
    }
  }

  // Restart the Express service
  async restart(): Promise<void> {
    logger.info('🔄 Restarting Express service...');
    this.serviceMetrics.restartCount++;
    this.serviceMetrics.lastRestart = new Date();
    
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.start();
  }

  // Check if port is available
  private async checkPortAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer();
      
      server.listen(config.port, () => {
        server.close(() => {
          resolve();
        });
      });
      
      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${config.port} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  // Wait for service to be ready
  private async waitForServiceReady(): Promise<void> {
    const maxAttempts = 30;
    const delay = 1000;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(`http://localhost:${config.port}/healthz`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          logger.info('✅ Express service is ready');
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      if (attempt < maxAttempts) {
        logger.info(`Waiting for Express service to be ready... (${attempt}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Express service failed to become ready within timeout');
  }

  // Start health monitoring
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  // Stop health monitoring
  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Perform health check
  private async performHealthCheck(): Promise<void> {
    try {
      this.serviceMetrics.healthCheckCount++;
      
      const response = await axios.get(`http://localhost:${config.port}/healthz`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        this.serviceStatus.healthStatus = 'healthy';
        this.serviceStatus.lastHealthCheck = new Date();
      } else {
        this.serviceStatus.healthStatus = 'unhealthy';
        this.serviceMetrics.failedHealthChecks++;
      }
    } catch (error) {
      this.serviceStatus.healthStatus = 'unhealthy';
      this.serviceMetrics.failedHealthChecks++;
      logger.warn('Health check failed:', error);
    }
  }

  // Get service status
  getStatus(): ServiceStatus {
    return {
      ...this.serviceStatus,
      uptime: this.serviceStatus.isRunning 
        ? Date.now() - this.serviceMetrics.startTime.getTime()
        : undefined
    };
  }

  // Get service metrics
  getMetrics(): ServiceMetrics {
    return { ...this.serviceMetrics };
  }

  // Shutdown the service manager
  private async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down Express service manager...');
    this.isShuttingDown = true;
    
    await this.stop();
    process.exit(0);
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const serviceManager = new ExpressServiceManager();

  try {
    switch (command) {
      case 'start':
        await serviceManager.start();
        break;
      case 'stop':
        await serviceManager.stop();
        break;
      case 'restart':
        await serviceManager.restart();
        break;
      case 'status':
        const status = serviceManager.getStatus();
        console.log('Express Service Status:');
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'metrics':
        const metrics = serviceManager.getMetrics();
        console.log('Express Service Metrics:');
        console.log(JSON.stringify(metrics, null, 2));
        break;
      default:
        console.log('Usage: npm run express:service <start|stop|restart|status|metrics>');
        process.exit(1);
    }
  } catch (error) {
    logger.error('Service manager error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ExpressServiceManager };
