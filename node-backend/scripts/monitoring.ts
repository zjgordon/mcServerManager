#!/usr/bin/env ts-node

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface MonitoringConfig {
  environment: string;
  metrics: boolean;
  logs: boolean;
  health: boolean;
  alerts: boolean;
  dashboard: boolean;
}

interface MonitoringReport {
  timestamp: string;
  environment: string;
  metrics: {
    enabled: boolean;
    port: number;
    path: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
  };
  logging: {
    enabled: boolean;
    level: string;
    format: string;
    files: string[];
    status: 'healthy' | 'unhealthy' | 'unknown';
  };
  healthChecks: {
    enabled: boolean;
    endpoints: Array<{
      url: string;
      status: 'healthy' | 'unhealthy' | 'unknown';
      responseTime: number;
    }>;
  };
  system: {
    cpu: number;
    memory: number;
    disk: number;
    uptime: number;
  };
}

class MonitoringRunner {
  private config: MonitoringConfig;
  private report: MonitoringReport;

  constructor() {
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      metrics: !process.argv.includes('--no-metrics'),
      logs: !process.argv.includes('--no-logs'),
      health: !process.argv.includes('--no-health'),
      alerts: process.argv.includes('--alerts'),
      dashboard: process.argv.includes('--dashboard'),
    };

    this.report = {
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      metrics: {
        enabled: false,
        port: 9090,
        path: '/metrics',
        status: 'unknown',
      },
      logging: {
        enabled: false,
        level: 'info',
        format: 'json',
        files: [],
        status: 'unknown',
      },
      healthChecks: {
        enabled: false,
        endpoints: [],
      },
      system: {
        cpu: 0,
        memory: 0,
        disk: 0,
        uptime: 0,
      },
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
    this.log('Validating monitoring environment...');
    
    // Check if required files exist
    const requiredFiles = [
      'package.json',
      'src/config/monitoring.ts',
    ];
    
    for (const file of requiredFiles) {
      if (!existsSync(file)) {
        throw new Error(`Required monitoring file not found: ${file}`);
      }
    }
    
    // Check if logs directory exists
    if (!existsSync('./logs')) {
      mkdirSync('./logs', { recursive: true });
    }
    
    this.log('Monitoring environment validation passed', 'success');
  }

  private checkMetrics(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config.metrics) {
        this.log('Skipping metrics check', 'warn');
        resolve();
        return;
      }
      
      this.log('Checking metrics endpoint...');
      
      try {
        const response = execSync(`curl -s http://localhost:${this.report.metrics.port}${this.report.metrics.path}`, { 
          encoding: 'utf8',
          timeout: 5000,
        });
        
        if (response.includes('http_requests_total') || response.includes('nodejs_')) {
          this.report.metrics.status = 'healthy';
          this.log('Metrics endpoint is healthy', 'success');
        } else {
          this.report.metrics.status = 'unhealthy';
          this.log('Metrics endpoint returned unexpected data', 'warn');
        }
      } catch (error) {
        this.report.metrics.status = 'unhealthy';
        this.log(`Metrics endpoint check failed: ${error}`, 'warn');
      }
      
      resolve();
    });
  }

  private checkLogging(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config.logs) {
        this.log('Skipping logging check', 'warn');
        resolve();
        return;
      }
      
      this.log('Checking logging configuration...');
      
      try {
        // Check if log files exist
        const logFiles = [
          './logs/app.log',
          './logs/error.log',
          './logs/combined.log',
        ];
        
        for (const file of logFiles) {
          if (existsSync(file)) {
            this.report.logging.files.push(file);
          }
        }
        
        // Check log file sizes and rotation
        let totalSize = 0;
        for (const file of this.report.logging.files) {
          try {
            const stats = require('fs').statSync(file);
            totalSize += stats.size;
          } catch {
            // File might not exist or be accessible
          }
        }
        
        if (this.report.logging.files.length > 0) {
          this.report.logging.status = 'healthy';
          this.log(`Logging is healthy (${this.report.logging.files.length} files, ${this.formatBytes(totalSize)})`, 'success');
        } else {
          this.report.logging.status = 'unhealthy';
          this.log('No log files found', 'warn');
        }
      } catch (error) {
        this.report.logging.status = 'unhealthy';
        this.log(`Logging check failed: ${error}`, 'warn');
      }
      
      resolve();
    });
  }

  private checkHealthEndpoints(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.config.health) {
        this.log('Skipping health check', 'warn');
        resolve();
      }
      
      this.log('Checking health endpoints...');
      
      const endpoints = [
        'http://localhost:5001/healthz',
        'http://localhost:5001/readyz',
        'http://localhost:5001/live',
      ];
      
      const checkPromises = endpoints.map(endpoint => this.checkHealthEndpoint(endpoint));
      
      Promise.all(checkPromises).then(() => {
        this.log('Health checks completed', 'success');
        resolve();
      }).catch(error => {
        this.log(`Health checks failed: ${error}`, 'warn');
        resolve();
      });
    });
  }

  private checkHealthEndpoint(url: string): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      try {
        const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, { 
          encoding: 'utf8',
          timeout: 5000,
        });
        
        const responseTime = Date.now() - startTime;
        const statusCode = parseInt(response.trim());
        
        this.report.healthChecks.endpoints.push({
          url,
          status: statusCode === 200 ? 'healthy' : 'unhealthy',
          responseTime,
        });
        
        if (statusCode === 200) {
          this.log(`Health endpoint ${url} is healthy (${responseTime}ms)`, 'success');
        } else {
          this.log(`Health endpoint ${url} returned ${statusCode} (${responseTime}ms)`, 'warn');
        }
      } catch (error) {
        const responseTime = Date.now() - startTime;
        this.report.healthChecks.endpoints.push({
          url,
          status: 'unhealthy',
          responseTime,
        });
        this.log(`Health endpoint ${url} check failed: ${error}`, 'warn');
      }
      
      resolve();
    });
  }

  private checkSystemResources(): Promise<void> {
    this.log('Checking system resources...');
    
    try {
      // CPU usage
      const cpuInfo = execSync('top -bn1 | grep "Cpu(s)" | awk \'{print $2}\' | awk -F\'%\' \'{print $1}\'', { 
        encoding: 'utf8',
        timeout: 5000,
      });
      this.report.system.cpu = parseFloat(cpuInfo.trim()) || 0;
      
      // Memory usage
      const memInfo = execSync('free | grep Mem | awk \'{printf "%.2f", $3/$2 * 100.0}\'', { 
        encoding: 'utf8',
        timeout: 5000,
      });
      this.report.system.memory = parseFloat(memInfo.trim()) || 0;
      
      // Disk usage
      const diskInfo = execSync('df -h / | awk \'NR==2{printf "%.2f", $5}\' | sed \'s/%//\'', { 
        encoding: 'utf8',
        timeout: 5000,
      });
      this.report.system.disk = parseFloat(diskInfo.trim()) || 0;
      
      // Uptime
      const uptimeInfo = execSync('uptime -p', { 
        encoding: 'utf8',
        timeout: 5000,
      });
      this.report.system.uptime = this.parseUptime(uptimeInfo.trim());
      
      this.log(`System resources: CPU ${this.report.system.cpu.toFixed(1)}%, Memory ${this.report.system.memory.toFixed(1)}%, Disk ${this.report.system.disk.toFixed(1)}%`, 'success');
    } catch (error) {
      this.log(`System resource check failed: ${error}`, 'warn');
    }
  }

  private parseUptime(uptimeStr: string): number {
    // Parse uptime string like "up 2 days, 3 hours, 30 minutes"
    const days = (uptimeStr.match(/(\d+) days?/) || [null, '0'])[1];
    const hours = (uptimeStr.match(/(\d+) hours?/) || [null, '0'])[1];
    const minutes = (uptimeStr.match(/(\d+) minutes?/) || [null, '0'])[1];
    
    return (parseInt(days) * 24 * 60) + (parseInt(hours) * 60) + parseInt(minutes);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private generateMonitoringReport(): void {
    this.log('Generating monitoring report...');
    
    const reportPath = './monitoring-report.json';
    writeFileSync(reportPath, JSON.stringify(this.report, null, 2));
    
    this.log(`Monitoring report generated: ${reportPath}`);
    
    // Display summary
    this.displayMonitoringSummary();
  }

  private displayMonitoringSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MONITORING SUMMARY');
    console.log('='.repeat(60));
    console.log(`🌍 Environment: ${this.report.environment}`);
    console.log(`⏰ Timestamp: ${this.report.timestamp}`);
    console.log('\n📈 Metrics:');
    console.log(`   ✅ Enabled: ${this.report.metrics.enabled}`);
    console.log(`   🔗 Endpoint: http://localhost:${this.report.metrics.port}${this.report.metrics.path}`);
    console.log(`   🏥 Status: ${this.report.metrics.status}`);
    console.log('\n📝 Logging:');
    console.log(`   ✅ Enabled: ${this.report.logging.enabled}`);
    console.log(`   📊 Level: ${this.report.logging.level}`);
    console.log(`   📄 Format: ${this.report.logging.format}`);
    console.log(`   📁 Files: ${this.report.logging.files.length}`);
    console.log(`   🏥 Status: ${this.report.logging.status}`);
    console.log('\n🏥 Health Checks:');
    console.log(`   ✅ Enabled: ${this.report.healthChecks.enabled}`);
    for (const endpoint of this.report.healthChecks.endpoints) {
      console.log(`   🔗 ${endpoint.url}: ${endpoint.status} (${endpoint.responseTime}ms)`);
    }
    console.log('\n💻 System Resources:');
    console.log(`   🖥️  CPU: ${this.report.system.cpu.toFixed(1)}%`);
    console.log(`   💾 Memory: ${this.report.system.memory.toFixed(1)}%`);
    console.log(`   💿 Disk: ${this.report.system.disk.toFixed(1)}%`);
    console.log(`   ⏱️  Uptime: ${this.report.system.uptime} minutes`);
    console.log('='.repeat(60));
  }

  private startDashboard(): void {
    if (!this.config.dashboard) {
      return;
    }
    
    this.log('Starting monitoring dashboard...');
    
    // This would typically start a web-based monitoring dashboard
    // For now, we'll just log that it's available
    this.log('Monitoring dashboard would be available at http://localhost:3001', 'info');
  }

  public async run(): Promise<void> {
    try {
      this.log('Starting monitoring runner...');
      
      this.validateEnvironment();
      await this.checkMetrics();
      await this.checkLogging();
      await this.checkHealthEndpoints();
      this.checkSystemResources();
      this.generateMonitoringReport();
      this.startDashboard();
      
    } catch (error) {
      this.log(`Monitoring runner failed: ${error}`, 'error');
      process.exit(1);
    }
  }
}

// Run the monitoring if this script is executed directly
if (require.main === module) {
  const monitoring = new MonitoringRunner();
  monitoring.run().catch(error => {
    console.error('Monitoring failed:', error);
    process.exit(1);
  });
}

export default MonitoringRunner;
