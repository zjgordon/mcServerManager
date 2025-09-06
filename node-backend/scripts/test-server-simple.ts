/**
 * Simple Server Management Smoke Tests
 * 
 * Basic smoke tests for server management endpoints on Express backend.
 * This script validates basic functionality without requiring Flask backend.
 */

import axios from 'axios';
import { logger } from '../src/config/logger';

// Configuration
const EXPRESS_BASE_URL = 'http://localhost:5001/api/v1';

// Test configuration
const TEST_CONFIG = {
  timeout: 5000,
  retries: 2,
  retryDelay: 1000
};

interface SmokeTestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  responseTime?: number;
}

class ServerSmokeTester {
  private session: string = '';
  private testResults: SmokeTestResult[] = [];

  async runTests(): Promise<void> {
    logger.info('🚀 Starting Server Management Smoke Tests');
    
    try {
      // Setup authentication
      await this.setupAuthentication();
      
      // Run smoke tests
      await this.testGetServers();
      await this.testGetVersions();
      await this.testGetMemoryUsage();
      await this.testCreateServer();
      await this.testGetServer();
      await this.testServerLifecycle();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      logger.error('❌ Smoke tests failed:', error);
      process.exit(1);
    }
  }

  private async setupAuthentication(): Promise<void> {
    logger.info('🔐 Setting up authentication...');
    
    try {
      // Get CSRF token
      const csrfResponse = await axios.get(`${EXPRESS_BASE_URL}/auth/csrf-token`);
      const csrfToken = csrfResponse.data.csrf_token;
      
      // Login
      const loginResponse = await axios.post(`${EXPRESS_BASE_URL}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      }, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      // Extract session cookie
      const cookies = loginResponse.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        this.session = cookies[0].split(';')[0];
      }
      
      logger.info('✅ Authentication setup complete');
    } catch (error) {
      logger.error('❌ Authentication setup failed:', error);
      throw error;
    }
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<SmokeTestResult> {
    const startTime = Date.now();
    
    try {
      const config: any = {
        method,
        url: `${EXPRESS_BASE_URL}${endpoint}`,
        timeout: TEST_CONFIG.timeout,
        withCredentials: true
      };

      if (this.session) {
        config.headers = {
          'Cookie': this.session
        };
      }

      if (data) {
        config.data = data;
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json'
        };
      }

      const response = await axios(config);
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        method,
        status: response.status,
        success: response.status >= 200 && response.status < 400,
        responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        endpoint,
        method,
        status: error.response?.status || 0,
        success: false,
        error: error.message,
        responseTime
      };
    }
  }

  private async testGetServers(): Promise<void> {
    logger.info('📋 Testing GET /servers');
    
    const result = await this.makeRequest('GET', '/servers');
    this.testResults.push(result);
    
    if (result.success) {
      logger.info(`✅ GET /servers: ${result.status} (${result.responseTime}ms)`);
    } else {
      logger.error(`❌ GET /servers: ${result.status} - ${result.error}`);
    }
  }

  private async testGetVersions(): Promise<void> {
    logger.info('📦 Testing GET /servers/versions');
    
    const result = await this.makeRequest('GET', '/servers/versions');
    this.testResults.push(result);
    
    if (result.success) {
      logger.info(`✅ GET /servers/versions: ${result.status} (${result.responseTime}ms)`);
    } else {
      logger.error(`❌ GET /servers/versions: ${result.status} - ${result.error}`);
    }
  }

  private async testGetMemoryUsage(): Promise<void> {
    logger.info('🧠 Testing GET /servers/memory-usage');
    
    const result = await this.makeRequest('GET', '/servers/memory-usage');
    this.testResults.push(result);
    
    if (result.success) {
      logger.info(`✅ GET /servers/memory-usage: ${result.status} (${result.responseTime}ms)`);
    } else {
      logger.error(`❌ GET /servers/memory-usage: ${result.status} - ${result.error}`);
    }
  }

  private async testCreateServer(): Promise<void> {
    logger.info('➕ Testing POST /servers');
    
    const testServer = {
      server_name: 'Smoke Test Server',
      version: '1.21.8',
      memory_mb: 1024,
      level_seed: 'smoke_test',
      gamemode: 'survival',
      difficulty: 'normal',
      hardcore: false,
      pvp: true,
      spawn_monsters: true,
      motd: 'Smoke Test Server'
    };
    
    const result = await this.makeRequest('POST', '/servers', testServer);
    this.testResults.push(result);
    
    if (result.success) {
      logger.info(`✅ POST /servers: ${result.status} (${result.responseTime}ms)`);
    } else {
      logger.error(`❌ POST /servers: ${result.status} - ${result.error}`);
    }
  }

  private async testGetServer(): Promise<void> {
    logger.info('🔍 Testing GET /servers/1');
    
    const result = await this.makeRequest('GET', '/servers/1');
    this.testResults.push(result);
    
    if (result.success) {
      logger.info(`✅ GET /servers/1: ${result.status} (${result.responseTime}ms)`);
    } else {
      logger.error(`❌ GET /servers/1: ${result.status} - ${result.error}`);
    }
  }

  private async testServerLifecycle(): Promise<void> {
    logger.info('🔄 Testing server lifecycle operations');
    
    // Test start server
    const startResult = await this.makeRequest('POST', '/servers/1/start');
    this.testResults.push(startResult);
    
    if (startResult.success) {
      logger.info(`✅ POST /servers/1/start: ${startResult.status} (${startResult.responseTime}ms)`);
    } else {
      logger.error(`❌ POST /servers/1/start: ${startResult.status} - ${startResult.error}`);
    }
    
    // Test get server status
    const statusResult = await this.makeRequest('GET', '/servers/1/status');
    this.testResults.push(statusResult);
    
    if (statusResult.success) {
      logger.info(`✅ GET /servers/1/status: ${statusResult.status} (${statusResult.responseTime}ms)`);
    } else {
      logger.error(`❌ GET /servers/1/status: ${statusResult.status} - ${statusResult.error}`);
    }
    
    // Test stop server
    const stopResult = await this.makeRequest('POST', '/servers/1/stop');
    this.testResults.push(stopResult);
    
    if (stopResult.success) {
      logger.info(`✅ POST /servers/1/stop: ${stopResult.status} (${stopResult.responseTime}ms)`);
    } else {
      logger.error(`❌ POST /servers/1/stop: ${stopResult.status} - ${stopResult.error}`);
    }
  }

  private generateReport(): void {
    logger.info('\n📊 Server Management Smoke Test Report');
    logger.info('=' .repeat(50));
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    const avgResponseTime = this.testResults
      .filter(r => r.responseTime)
      .reduce((sum, r) => sum + (r.responseTime || 0), 0) / totalTests;
    
    logger.info(`Total Tests: ${totalTests}`);
    logger.info(`Successful: ${successfulTests}`);
    logger.info(`Failed: ${failedTests}`);
    logger.info(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    logger.info(`Average Response Time: ${avgResponseTime.toFixed(1)}ms`);
    
    if (failedTests > 0) {
      logger.info('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          logger.info(`  - ${result.method} ${result.endpoint}: ${result.status} - ${result.error}`);
        });
    }
    
    if (successfulTests === totalTests) {
      logger.info('\n🎉 All server management smoke tests passed!');
      logger.info('✅ Express server management API is functional');
    } else {
      logger.info('\n⚠️  Some smoke tests failed. Review the errors above.');
      process.exit(1);
    }
  }
}

// Run the tests
async function main() {
  const tester = new ServerSmokeTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Smoke tests failed:', error);
    process.exit(1);
  });
}

export { ServerSmokeTester };
