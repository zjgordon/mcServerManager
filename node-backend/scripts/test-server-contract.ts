/**
 * Server Management Contract Tests
 * 
 * Comprehensive contract testing for server management endpoints between Flask and Express.
 * This script validates API parity and ensures contract compatibility.
 */

import axios, { AxiosResponse } from 'axios';
import { logger } from '../src/config/logger';

// Configuration
const FLASK_BASE_URL = 'http://localhost:5000/api/v1';
const EXPRESS_BASE_URL = 'http://localhost:5001/api/v1';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3,
  retryDelay: 1000
};

// Test data
const TEST_SERVER = {
  server_name: 'Test Server',
  version: '1.21.8',
  memory_mb: 1024,
  level_seed: 'test_seed',
  gamemode: 'survival',
  difficulty: 'normal',
  hardcore: false,
  pvp: true,
  spawn_monsters: true,
  motd: 'Test Server MOTD'
};

interface TestResult {
  endpoint: string;
  method: string;
  flaskStatus: number;
  expressStatus: number;
  flaskResponse: any;
  expressResponse: any;
  success: boolean;
  error?: string;
}

class ServerContractTester {
  private flaskSession: string = '';
  private expressSession: string = '';
  private testResults: TestResult[] = [];

  async runTests(): Promise<void> {
    logger.info('🚀 Starting Server Management Contract Tests');
    
    try {
      // Setup authentication
      await this.setupAuthentication();
      
      // Run all contract tests
      await this.testGetServers();
      await this.testCreateServer();
      await this.testGetServer();
      await this.testStartServer();
      await this.testGetServerStatus();
      await this.testStopServer();
      await this.testGetVersions();
      await this.testBackupServer();
      await this.testAcceptEula();
      await this.testGetMemoryUsage();
      await this.testDeleteServer();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      logger.error('❌ Contract tests failed:', error);
      process.exit(1);
    }
  }

  private async setupAuthentication(): Promise<void> {
    logger.info('🔐 Setting up authentication...');
    
    try {
      // Get CSRF tokens
      const flaskCsrf = await this.getCsrfToken(FLASK_BASE_URL);
      const expressCsrf = await this.getCsrfToken(EXPRESS_BASE_URL);
      
      // Login to both backends
      this.flaskSession = await this.login(FLASK_BASE_URL, flaskCsrf);
      this.expressSession = await this.login(EXPRESS_BASE_URL, expressCsrf);
      
      logger.info('✅ Authentication setup complete');
    } catch (error) {
      logger.error('❌ Authentication setup failed:', error);
      throw error;
    }
  }

  private async getCsrfToken(baseUrl: string): Promise<string> {
    try {
      const response = await axios.get(`${baseUrl}/auth/csrf-token`);
      return response.data.csrf_token;
    } catch (error) {
      logger.warn(`⚠️  Could not get CSRF token from ${baseUrl}:`, error);
      return '';
    }
  }

  private async login(baseUrl: string, csrfToken: string): Promise<string> {
    try {
      const response = await axios.post(`${baseUrl}/auth/login`, {
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
      const cookies = response.headers['set-cookie'];
      if (cookies && cookies.length > 0) {
        return cookies[0].split(';')[0];
      }
      
      return '';
    } catch (error) {
      logger.warn(`⚠️  Could not login to ${baseUrl}:`, error);
      return '';
    }
  }

  private async makeRequest(
    baseUrl: string,
    method: string,
    endpoint: string,
    data?: any,
    session?: string
  ): Promise<AxiosResponse> {
    const config: any = {
      method,
      url: `${baseUrl}${endpoint}`,
      timeout: TEST_CONFIG.timeout,
      withCredentials: true
    };

    if (session) {
      config.headers = {
        'Cookie': session
      };
    }

    if (data) {
      config.data = data;
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json'
      };
    }

    return axios(config);
  }

  private async testGetServers(): Promise<void> {
    logger.info('📋 Testing GET /servers');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'GET',
        '/servers',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'GET',
        '/servers',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'GET /servers',
        'GET',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('GET /servers', 'GET', error);
    }
  }

  private async testCreateServer(): Promise<void> {
    logger.info('➕ Testing POST /servers');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'POST',
        '/servers',
        TEST_SERVER,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'POST',
        '/servers',
        TEST_SERVER,
        this.expressSession
      );
      
      this.compareResponses(
        'POST /servers',
        'POST',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('POST /servers', 'POST', error);
    }
  }

  private async testGetServer(): Promise<void> {
    logger.info('🔍 Testing GET /servers/1');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'GET',
        '/servers/1',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'GET',
        '/servers/1',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'GET /servers/1',
        'GET',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('GET /servers/1', 'GET', error);
    }
  }

  private async testStartServer(): Promise<void> {
    logger.info('▶️  Testing POST /servers/1/start');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'POST',
        '/servers/1/start',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'POST',
        '/servers/1/start',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'POST /servers/1/start',
        'POST',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('POST /servers/1/start', 'POST', error);
    }
  }

  private async testGetServerStatus(): Promise<void> {
    logger.info('📊 Testing GET /servers/1/status');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'GET',
        '/servers/1/status',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'GET',
        '/servers/1/status',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'GET /servers/1/status',
        'GET',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('GET /servers/1/status', 'GET', error);
    }
  }

  private async testStopServer(): Promise<void> {
    logger.info('⏹️  Testing POST /servers/1/stop');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'POST',
        '/servers/1/stop',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'POST',
        '/servers/1/stop',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'POST /servers/1/stop',
        'POST',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('POST /servers/1/stop', 'POST', error);
    }
  }

  private async testGetVersions(): Promise<void> {
    logger.info('📦 Testing GET /servers/versions');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'GET',
        '/servers/versions',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'GET',
        '/servers/versions',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'GET /servers/versions',
        'GET',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('GET /servers/versions', 'GET', error);
    }
  }

  private async testBackupServer(): Promise<void> {
    logger.info('💾 Testing POST /servers/1/backup');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'POST',
        '/servers/1/backup',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'POST',
        '/servers/1/backup',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'POST /servers/1/backup',
        'POST',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('POST /servers/1/backup', 'POST', error);
    }
  }

  private async testAcceptEula(): Promise<void> {
    logger.info('📝 Testing POST /servers/1/accept-eula');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'POST',
        '/servers/1/accept-eula',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'POST',
        '/servers/1/accept-eula',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'POST /servers/1/accept-eula',
        'POST',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('POST /servers/1/accept-eula', 'POST', error);
    }
  }

  private async testGetMemoryUsage(): Promise<void> {
    logger.info('🧠 Testing GET /servers/memory-usage');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'GET',
        '/servers/memory-usage',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'GET',
        '/servers/memory-usage',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'GET /servers/memory-usage',
        'GET',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('GET /servers/memory-usage', 'GET', error);
    }
  }

  private async testDeleteServer(): Promise<void> {
    logger.info('🗑️  Testing DELETE /servers/1');
    
    try {
      const flaskResponse = await this.makeRequest(
        FLASK_BASE_URL,
        'DELETE',
        '/servers/1',
        undefined,
        this.flaskSession
      );
      
      const expressResponse = await this.makeRequest(
        EXPRESS_BASE_URL,
        'DELETE',
        '/servers/1',
        undefined,
        this.expressSession
      );
      
      this.compareResponses(
        'DELETE /servers/1',
        'DELETE',
        flaskResponse,
        expressResponse
      );
    } catch (error) {
      this.recordError('DELETE /servers/1', 'DELETE', error);
    }
  }

  private compareResponses(
    endpoint: string,
    method: string,
    flaskResponse: AxiosResponse,
    expressResponse: AxiosResponse
  ): void {
    const result: TestResult = {
      endpoint,
      method,
      flaskStatus: flaskResponse.status,
      expressStatus: expressResponse.status,
      flaskResponse: flaskResponse.data,
      expressResponse: expressResponse.data,
      success: false
    };

    // Compare status codes
    if (flaskResponse.status !== expressResponse.status) {
      result.error = `Status code mismatch: Flask ${flaskResponse.status} vs Express ${expressResponse.status}`;
      this.testResults.push(result);
      logger.error(`❌ ${endpoint}: ${result.error}`);
      return;
    }

    // Compare response structure
    const flaskKeys = Object.keys(flaskResponse.data).sort();
    const expressKeys = Object.keys(expressResponse.data).sort();
    
    if (JSON.stringify(flaskKeys) !== JSON.stringify(expressKeys)) {
      result.error = `Response structure mismatch: Flask keys [${flaskKeys.join(', ')}] vs Express keys [${expressKeys.join(', ')}]`;
      this.testResults.push(result);
      logger.error(`❌ ${endpoint}: ${result.error}`);
      return;
    }

    // Compare success field
    if (flaskResponse.data.success !== expressResponse.data.success) {
      result.error = `Success field mismatch: Flask ${flaskResponse.data.success} vs Express ${expressResponse.data.success}`;
      this.testResults.push(result);
      logger.error(`❌ ${endpoint}: ${result.error}`);
      return;
    }

    // For successful responses, compare key fields
    if (flaskResponse.data.success && expressResponse.data.success) {
      const keyFields = ['message', 'servers', 'server', 'status', 'versions', 'memory_summary', 'backup_file'];
      
      for (const field of keyFields) {
        if (flaskResponse.data[field] !== undefined && expressResponse.data[field] !== undefined) {
          if (typeof flaskResponse.data[field] === 'object' && typeof expressResponse.data[field] === 'object') {
            // For objects, compare structure
            const flaskObjKeys = Object.keys(flaskResponse.data[field]).sort();
            const expressObjKeys = Object.keys(expressResponse.data[field]).sort();
            
            if (JSON.stringify(flaskObjKeys) !== JSON.stringify(expressObjKeys)) {
              result.error = `Field '${field}' structure mismatch`;
              this.testResults.push(result);
              logger.error(`❌ ${endpoint}: ${result.error}`);
              return;
            }
          }
        }
      }
    }

    result.success = true;
    this.testResults.push(result);
    logger.info(`✅ ${endpoint}: Contract compatibility verified`);
  }

  private recordError(endpoint: string, method: string, error: any): void {
    const result: TestResult = {
      endpoint,
      method,
      flaskStatus: 0,
      expressStatus: 0,
      flaskResponse: null,
      expressResponse: null,
      success: false,
      error: error.message || 'Unknown error'
    };

    this.testResults.push(result);
    logger.error(`❌ ${endpoint}: ${result.error}`);
  }

  private generateReport(): void {
    logger.info('\n📊 Server Management Contract Test Report');
    logger.info('=' .repeat(50));
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    logger.info(`Total Tests: ${totalTests}`);
    logger.info(`Successful: ${successfulTests}`);
    logger.info(`Failed: ${failedTests}`);
    logger.info(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      logger.info('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          logger.info(`  - ${result.method} ${result.endpoint}: ${result.error}`);
        });
    }
    
    if (successfulTests === totalTests) {
      logger.info('\n🎉 All server management contract tests passed!');
      logger.info('✅ Flask and Express server APIs are contract-compatible');
    } else {
      logger.info('\n⚠️  Some contract tests failed. Review the differences above.');
      process.exit(1);
    }
  }
}

// Run the tests
async function main() {
  const tester = new ServerContractTester();
  await tester.runTests();
}

if (require.main === module) {
  main().catch(error => {
    logger.error('❌ Contract tests failed:', error);
    process.exit(1);
  });
}

export { ServerContractTester };
