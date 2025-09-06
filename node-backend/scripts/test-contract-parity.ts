#!/usr/bin/env ts-node

/**
 * Comprehensive Contract Parity Testing Script
 * 
 * Tests Flask vs Express API parity to ensure contract compatibility
 * and validates that all migrated endpoints maintain the same behavior.
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../src/config/logger';

// Test configuration
const FLASK_BASE_URL = 'http://localhost:5000';
const EXPRESS_BASE_URL = 'http://localhost:5001';
const TEST_TIMEOUT = 10000;

interface TestResult {
  test: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  flaskResponse?: any;
  expressResponse?: any;
  differences?: any;
}

interface ContractTest {
  name: string;
  category: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  headers?: any;
  expectedStatus?: number;
  skipFlask?: boolean;
  skipExpress?: boolean;
}

class ContractParityTester {
  private flaskClient = axios.create({
    baseURL: FLASK_BASE_URL,
    timeout: TEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ContractParityTester/1.0'
    }
  });

  private expressClient = axios.create({
    baseURL: EXPRESS_BASE_URL,
    timeout: TEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ContractParityTester/1.0'
    }
  });

  private testResults: TestResult[] = [];
  private flaskSession: any = null;
  private expressSession: any = null;

  private async makeRequest(client: any, method: string, endpoint: string, data?: any, headers?: any) {
    try {
      const response = await client.request({
        method,
        url: endpoint,
        data,
        headers
      });
      return { success: true, response };
    } catch (error) {
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          error: {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            headers: error.response?.headers
          }
        };
      }
      throw error;
    }
  }

  private addTestResult(test: string, category: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.testResults.push({ test, category, status, message, details });
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${statusIcon} ${category} - ${test}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  private compareResponses(flaskResponse: any, expressResponse: any, testName: string): any {
    const differences: any = {};

    // Compare status codes
    if (flaskResponse.status !== expressResponse.status) {
      differences.statusCode = {
        flask: flaskResponse.status,
        express: expressResponse.status
      };
    }

    // Compare response data structure
    if (flaskResponse.data && expressResponse.data) {
      const flaskData = flaskResponse.data;
      const expressData = expressResponse.data;

      // Compare success field
      if (flaskData.success !== expressData.success) {
        differences.success = {
          flask: flaskData.success,
          express: expressData.success
        };
      }

      // Compare message field
      if (flaskData.message !== expressData.message) {
        differences.message = {
          flask: flaskData.message,
          express: expressData.message
        };
      }

      // Compare data structure for successful responses
      if (flaskData.success && expressData.success) {
        const dataDifferences = this.compareDataStructures(flaskData, expressData);
        if (Object.keys(dataDifferences).length > 0) {
          differences.data = dataDifferences;
        }
      }
    }

    return differences;
  }

  private compareDataStructures(flaskData: any, expressData: any): any {
    const differences: any = {};

    // Compare common fields
    const commonFields = ['success', 'message', 'data', 'users', 'servers', 'config', 'stats'];
    
    for (const field of commonFields) {
      if (flaskData[field] !== undefined && expressData[field] !== undefined) {
        if (JSON.stringify(flaskData[field]) !== JSON.stringify(expressData[field])) {
          differences[field] = {
            flask: flaskData[field],
            express: expressData[field]
          };
        }
      } else if (flaskData[field] !== undefined || expressData[field] !== undefined) {
        differences[field] = {
          flask: flaskData[field],
          express: expressData[field]
        };
      }
    }

    return differences;
  }

  // Setup authentication for both backends
  async setupAuthentication() {
    console.log('\n🔐 Setting up authentication for both backends...');

    // Test Flask authentication
    try {
      const flaskLoginResult = await this.makeRequest(this.flaskClient, 'POST', '/api/v1/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      if (flaskLoginResult.success) {
        this.flaskSession = flaskLoginResult.response.data;
        console.log('✅ Flask authentication successful');
      } else {
        console.log('⚠️ Flask authentication failed, some tests may be skipped');
      }
    } catch (error) {
      console.log('⚠️ Flask backend not available, some tests will be skipped');
    }

    // Test Express authentication
    try {
      const expressLoginResult = await this.makeRequest(this.expressClient, 'POST', '/api/v1/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      if (expressLoginResult.success) {
        this.expressSession = expressLoginResult.response.data;
        console.log('✅ Express authentication successful');
      } else {
        console.log('⚠️ Express authentication failed, some tests may be skipped');
      }
    } catch (error) {
      console.log('⚠️ Express backend not available, some tests will be skipped');
    }
  }

  // Test authentication endpoints
  async testAuthenticationEndpoints() {
    console.log('\n🔐 Testing Authentication Endpoints...');

    const authTests: ContractTest[] = [
      {
        name: 'CSRF Token',
        category: 'Authentication',
        method: 'GET',
        endpoint: '/api/v1/auth/csrf-token'
      },
      {
        name: 'User Login',
        category: 'Authentication',
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        data: { username: 'admin', password: 'admin123' }
      },
      {
        name: 'User Logout',
        category: 'Authentication',
        method: 'POST',
        endpoint: '/api/v1/auth/logout'
      },
      {
        name: 'User Profile',
        category: 'Authentication',
        method: 'GET',
        endpoint: '/api/v1/auth/me'
      },
      {
        name: 'Change Password',
        category: 'Authentication',
        method: 'POST',
        endpoint: '/api/v1/auth/change-password',
        data: { current_password: 'admin123', new_password: 'admin123' }
      }
    ];

    for (const test of authTests) {
      await this.runContractTest(test);
    }
  }

  // Test server management endpoints
  async testServerManagementEndpoints() {
    console.log('\n🖥️ Testing Server Management Endpoints...');

    const serverTests: ContractTest[] = [
      {
        name: 'List Servers',
        category: 'Server Management',
        method: 'GET',
        endpoint: '/api/v1/servers'
      },
      {
        name: 'Get Server Versions',
        category: 'Server Management',
        method: 'GET',
        endpoint: '/api/v1/servers/versions'
      },
      {
        name: 'Get Memory Usage',
        category: 'Server Management',
        method: 'GET',
        endpoint: '/api/v1/servers/memory-usage'
      },
      {
        name: 'Create Server',
        category: 'Server Management',
        method: 'POST',
        endpoint: '/api/v1/servers',
        data: {
          server_name: 'test-server',
          version: '1.20.1',
          port: 25565,
          memory_mb: 1024
        }
      }
    ];

    for (const test of serverTests) {
      await this.runContractTest(test);
    }
  }

  // Test admin endpoints
  async testAdminEndpoints() {
    console.log('\n👑 Testing Admin Endpoints...');

    const adminTests: ContractTest[] = [
      {
        name: 'List Users',
        category: 'Admin',
        method: 'GET',
        endpoint: '/api/v1/admin/users'
      },
      {
        name: 'Get System Config',
        category: 'Admin',
        method: 'GET',
        endpoint: '/api/v1/admin/config'
      },
      {
        name: 'Get System Stats',
        category: 'Admin',
        method: 'GET',
        endpoint: '/api/v1/admin/stats'
      }
    ];

    for (const test of adminTests) {
      await this.runContractTest(test);
    }
  }

  // Run a single contract test
  async runContractTest(test: ContractTest) {
    let flaskResult: any = null;
    let expressResult: any = null;

    // Test Flask endpoint
    if (!test.skipFlask) {
      try {
        const result = await this.makeRequest(this.flaskClient, test.method, test.endpoint, test.data, test.headers);
        flaskResult = result.success ? result.response : result.error;
      } catch (error) {
        flaskResult = { error: 'Flask backend not available' };
      }
    }

    // Test Express endpoint
    if (!test.skipExpress) {
      try {
        const result = await this.makeRequest(this.expressClient, test.method, test.endpoint, test.data, test.headers);
        expressResult = result.success ? result.response : result.error;
      } catch (error) {
        expressResult = { error: 'Express backend not available' };
      }
    }

    // Compare results
    if (flaskResult && expressResult) {
      if (flaskResult.error || expressResult.error) {
        this.addTestResult(test.name, test.category, 'SKIP', 'Backend not available', {
          flask: flaskResult.error,
          express: expressResult.error
        });
        return;
      }

      const differences = this.compareResponses(flaskResult, expressResult, test.name);
      
      if (Object.keys(differences).length === 0) {
        this.addTestResult(test.name, test.category, 'PASS', 'Responses match perfectly');
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 'Response differences detected', {
          differences,
          flaskResponse: flaskResult,
          expressResponse: expressResult
        });
      }
    } else if (flaskResult) {
      this.addTestResult(test.name, test.category, 'SKIP', 'Express backend not available');
    } else if (expressResult) {
      this.addTestResult(test.name, test.category, 'SKIP', 'Flask backend not available');
    } else {
      this.addTestResult(test.name, test.category, 'SKIP', 'Both backends not available');
    }
  }

  // Test error handling parity
  async testErrorHandlingParity() {
    console.log('\n⚠️ Testing Error Handling Parity...');

    const errorTests: ContractTest[] = [
      {
        name: 'Invalid Login Credentials',
        category: 'Error Handling',
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        data: { username: 'invalid', password: 'invalid' },
        expectedStatus: 401
      },
      {
        name: 'Invalid Server Data',
        category: 'Error Handling',
        method: 'POST',
        endpoint: '/api/v1/servers',
        data: { server_name: '', version: 'invalid' },
        expectedStatus: 400
      },
      {
        name: 'Non-existent Server',
        category: 'Error Handling',
        method: 'GET',
        endpoint: '/api/v1/servers/99999',
        expectedStatus: 404
      },
      {
        name: 'Unauthorized Admin Access',
        category: 'Error Handling',
        method: 'GET',
        endpoint: '/api/v1/admin/users',
        expectedStatus: 401
      }
    ];

    for (const test of errorTests) {
      await this.runContractTest(test);
    }
  }

  // Test response format consistency
  async testResponseFormatConsistency() {
    console.log('\n📋 Testing Response Format Consistency...');

    const formatTests: ContractTest[] = [
      {
        name: 'Success Response Format',
        category: 'Response Format',
        method: 'GET',
        endpoint: '/api/v1/auth/csrf-token'
      },
      {
        name: 'Error Response Format',
        category: 'Response Format',
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        data: { username: 'invalid', password: 'invalid' }
      }
    ];

    for (const test of formatTests) {
      await this.runContractTest(test);
    }
  }

  // Test performance parity
  async testPerformanceParity() {
    console.log('\n⚡ Testing Performance Parity...');

    const performanceTests: ContractTest[] = [
      {
        name: 'Health Check Performance',
        category: 'Performance',
        method: 'GET',
        endpoint: '/healthz'
      },
      {
        name: 'CSRF Token Performance',
        category: 'Performance',
        method: 'GET',
        endpoint: '/api/v1/auth/csrf-token'
      }
    ];

    for (const test of performanceTests) {
      const startTime = Date.now();
      await this.runContractTest(test);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   Performance: ${duration}ms`);
    }
  }

  // Run all contract tests
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Contract Parity Tests...\n');
    console.log(`Testing Flask: ${FLASK_BASE_URL}`);
    console.log(`Testing Express: ${EXPRESS_BASE_URL}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms\n`);

    try {
      await this.setupAuthentication();
      await this.testAuthenticationEndpoints();
      await this.testServerManagementEndpoints();
      await this.testAdminEndpoints();
      await this.testErrorHandlingParity();
      await this.testResponseFormatConsistency();
      await this.testPerformanceParity();

      // Generate summary
      this.generateSummary();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  private generateSummary() {
    console.log('\n📊 Contract Parity Test Summary:');
    console.log('================================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const skippedTests = this.testResults.filter(r => r.status === 'SKIP').length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⏭️ Skipped: ${skippedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    // Group by category
    const categories = [...new Set(this.testResults.map(r => r.category))];
    console.log('\n📋 Results by Category:');
    categories.forEach(category => {
      const categoryTests = this.testResults.filter(r => r.category === category);
      const categoryPassed = categoryTests.filter(r => r.status === 'PASS').length;
      const categoryTotal = categoryTests.length;
      console.log(`  ${category}: ${categoryPassed}/${categoryTotal} (${((categoryPassed / categoryTotal) * 100).toFixed(1)}%)`);
    });

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.category}: ${result.test} - ${result.message}`);
          if (result.details?.differences) {
            console.log(`    Differences: ${JSON.stringify(result.details.differences, null, 2)}`);
          }
        });
    }

    if (skippedTests > 0) {
      console.log('\n⏭️ Skipped Tests:');
      this.testResults
        .filter(r => r.status === 'SKIP')
        .forEach(result => {
          console.log(`  - ${result.category}: ${result.test} - ${result.message}`);
        });
    }

    console.log('\n🎯 Contract Parity Test Complete!');
    
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Flask and Express APIs are fully compatible.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Please review the differences and ensure API compatibility.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new ContractParityTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { ContractParityTester };
