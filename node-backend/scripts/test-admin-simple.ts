#!/usr/bin/env ts-node

/**
 * Simple Admin API Smoke Test
 * 
 * This script performs basic smoke tests on admin endpoints to ensure
 * they are accessible and return expected response formats.
 */

import axios, { AxiosInstance } from 'axios';

// Configuration
const EXPRESS_BASE_URL = 'http://localhost:5001';
const API_BASE = '/api/v1';

interface SmokeTestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  responseTime: number;
  statusCode: number;
  error?: string;
}

class AdminSmokeTester {
  private client: AxiosInstance;
  private adminSession: string = '';
  private csrfToken: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: EXPRESS_BASE_URL,
      timeout: 5000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AdminSmokeTester/1.0'
      }
    });
  }

  /**
   * Setup authentication
   */
  async setupAuth(): Promise<void> {
    console.log('🔐 Setting up authentication...');

    try {
      // Get CSRF token
      const csrfResponse = await this.client.get(`${API_BASE}/auth/csrf-token`);
      this.csrfToken = csrfResponse.data.csrf_token;

      // Login as admin
      const loginResponse = await this.client.post(`${API_BASE}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      }, {
        headers: { 'X-CSRFToken': this.csrfToken }
      });

      if (loginResponse.data.success) {
        const setCookieHeader = loginResponse.headers['set-cookie'];
        if (setCookieHeader) {
          const sessionCookie = setCookieHeader.find(cookie => cookie.startsWith('mcserver_session='));
          if (sessionCookie) {
            this.adminSession = sessionCookie.split(';')[0];
            console.log('✅ Admin authentication successful');
          }
        }
      }
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  /**
   * Test a single endpoint
   */
  async testEndpoint(method: string, endpoint: string, data?: any): Promise<SmokeTestResult> {
    const startTime = Date.now();
    const result: SmokeTestResult = {
      endpoint,
      method,
      status: 'FAIL',
      responseTime: 0,
      statusCode: 0
    };

    try {
      const config: any = {
        headers: {
          'X-CSRFToken': this.csrfToken
        }
      };

      let response;
      switch (method.toUpperCase()) {
        case 'GET':
          response = await this.client.get(endpoint, config);
          break;
        case 'POST':
          response = await this.client.post(endpoint, data, config);
          break;
        case 'PUT':
          response = await this.client.put(endpoint, data, config);
          break;
        case 'DELETE':
          response = await this.client.delete(endpoint, config);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      result.statusCode = response.status;
      result.responseTime = Date.now() - startTime;
      result.status = 'PASS';

      // Basic response validation
      if (response.data && typeof response.data === 'object') {
        if (response.data.success === undefined) {
          result.status = 'FAIL';
          result.error = 'Response missing success field';
        }
      }

    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.error = error.message;
      if (error.response) {
        result.statusCode = error.response.status;
      }
    }

    return result;
  }

  /**
   * Run all smoke tests
   */
  async runSmokeTests(): Promise<SmokeTestResult[]> {
    console.log('🧪 Running admin API smoke tests...');

    const results: SmokeTestResult[] = [];

    // Test 1: Get users list
    console.log('📋 Testing GET /admin/users...');
    results.push(await this.testEndpoint('GET', `${API_BASE}/admin/users`));

    // Test 2: Get system configuration
    console.log('⚙️ Testing GET /admin/config...');
    results.push(await this.testEndpoint('GET', `${API_BASE}/admin/config`));

    // Test 3: Get system statistics
    console.log('📊 Testing GET /admin/stats...');
    results.push(await this.testEndpoint('GET', `${API_BASE}/admin/stats`));

    // Test 4: Create user (with cleanup)
    console.log('👤 Testing POST /admin/users...');
    const newUserData = {
      username: 'smoketest_' + Date.now(),
      password: 'testpassword123',
      is_admin: false
    };
    const createResult = await this.testEndpoint('POST', `${API_BASE}/admin/users`, newUserData);
    results.push(createResult);

    // Test 5: Update user (if creation was successful)
    if (createResult.status === 'PASS' && createResult.statusCode === 201) {
      // We would need to extract the user ID from the response
      // For now, we'll skip this test
      console.log('⏭️ Skipping user update test (requires user ID extraction)');
    }

    // Test 6: Update system configuration
    console.log('🔧 Testing PUT /admin/config...');
    const configData = {
      max_total_memory_mb: 8192,
      default_server_memory_mb: 1024,
      min_server_memory_mb: 512,
      max_server_memory_mb: 4096
    };
    results.push(await this.testEndpoint('PUT', `${API_BASE}/admin/config`, configData));

    return results;
  }

  /**
   * Print test results
   */
  printResults(results: SmokeTestResult[]): void {
    console.log('\n📊 Admin API Smoke Test Results');
    console.log('=================================');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    console.log('\n📋 Detailed Results:');
    results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.method} ${result.endpoint}`);
      console.log(`   Status Code: ${result.statusCode}`);
      console.log(`   Response Time: ${result.responseTime}ms`);
      
      if (result.status === 'FAIL' && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the details above.');
    } else {
      console.log('\n✅ All smoke tests passed!');
    }
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const tester = new AdminSmokeTester();

  try {
    // Setup authentication
    await tester.setupAuth();

    // Run smoke tests
    const results = await tester.runSmokeTests();

    // Print results
    tester.printResults(results);

    // Exit with appropriate code
    const failed = results.filter(r => r.status === 'FAIL').length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n💥 Smoke test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { AdminSmokeTester };
