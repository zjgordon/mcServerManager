#!/usr/bin/env ts-node

/**
 * Admin API Contract Testing Script
 * 
 * This script tests the admin API endpoints to ensure contract compatibility
 * between Flask and Express backends. It validates response formats, status codes,
 * and business logic consistency.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { performance } from 'perf_hooks';

// Configuration
const FLASK_BASE_URL = 'http://localhost:5000';
const EXPRESS_BASE_URL = 'http://localhost:5001';
const API_BASE = '/api/v1';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  flaskStatus?: number;
  expressStatus?: number;
  flaskResponse?: any;
  expressResponse?: any;
  error?: string;
  responseTime?: number;
}

interface TestSuite {
  name: string;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

class AdminContractTester {
  private flaskClient: AxiosInstance;
  private expressClient: AxiosInstance;
  private adminSession: { flask: string; express: string } = { flask: '', express: '' };
  private csrfTokens: { flask: string; express: string } = { flask: '', express: '' };

  constructor() {
    this.flaskClient = axios.create({
      baseURL: FLASK_BASE_URL,
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AdminContractTester/1.0'
      }
    });

    this.expressClient = axios.create({
      baseURL: EXPRESS_BASE_URL,
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AdminContractTester/1.0'
      }
    });
  }

  /**
   * Setup authentication for both backends
   */
  async setupAuthentication(): Promise<void> {
    console.log('🔐 Setting up authentication...');

    try {
      // Get CSRF tokens
      await this.getCSRFTokens();

      // Login as admin user
      await this.loginAsAdmin();

      console.log('✅ Authentication setup complete');
    } catch (error) {
      console.error('❌ Authentication setup failed:', error);
      throw error;
    }
  }

  /**
   * Get CSRF tokens from both backends
   */
  private async getCSRFTokens(): Promise<void> {
    try {
      // Flask CSRF token
      const flaskResponse = await this.flaskClient.get(`${API_BASE}/auth/csrf-token`);
      this.csrfTokens.flask = flaskResponse.data.csrf_token;

      // Express CSRF token
      const expressResponse = await this.expressClient.get(`${API_BASE}/auth/csrf-token`);
      this.csrfTokens.express = expressResponse.data.csrf_token;

      console.log('✅ CSRF tokens obtained');
    } catch (error) {
      console.error('❌ Failed to get CSRF tokens:', error);
      throw error;
    }
  }

  /**
   * Login as admin user on both backends
   */
  private async loginAsAdmin(): Promise<void> {
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };

    try {
      // Flask login
      const flaskResponse = await this.flaskClient.post(`${API_BASE}/auth/login`, loginData, {
        headers: { 'X-CSRFToken': this.csrfTokens.flask }
      });

      if (flaskResponse.data.success) {
        this.adminSession.flask = this.extractSessionCookie(flaskResponse);
        console.log('✅ Flask admin login successful');
      }

      // Express login
      const expressResponse = await this.expressClient.post(`${API_BASE}/auth/login`, loginData, {
        headers: { 'X-CSRFToken': this.csrfTokens.express }
      });

      if (expressResponse.data.success) {
        this.adminSession.express = this.extractSessionCookie(expressResponse);
        console.log('✅ Express admin login successful');
      }
    } catch (error) {
      console.error('❌ Admin login failed:', error);
      throw error;
    }
  }

  /**
   * Extract session cookie from response
   */
  private extractSessionCookie(response: AxiosResponse): string {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      const sessionCookie = setCookieHeader.find(cookie => cookie.startsWith('mcserver_session='));
      if (sessionCookie) {
        return sessionCookie.split(';')[0];
      }
    }
    return '';
  }

  /**
   * Test a single endpoint on both backends
   */
  async testEndpoint(
    method: string,
    endpoint: string,
    data?: any,
    expectedStatus: number = 200
  ): Promise<TestResult> {
    const startTime = performance.now();
    const result: TestResult = {
      endpoint,
      method,
      status: 'SKIP'
    };

    try {
      // Test Flask backend
      const flaskResponse = await this.makeRequest(
        this.flaskClient,
        method,
        endpoint,
        data,
        this.csrfTokens.flask
      );
      result.flaskStatus = flaskResponse.status;
      result.flaskResponse = flaskResponse.data;

      // Test Express backend
      const expressResponse = await this.makeRequest(
        this.expressClient,
        method,
        endpoint,
        data,
        this.csrfTokens.express
      );
      result.expressStatus = expressResponse.status;
      result.expressResponse = expressResponse.data;

      // Validate responses
      if (this.validateResponse(flaskResponse.data, expressResponse.data) &&
          flaskResponse.status === expressResponse.status) {
        result.status = 'PASS';
      } else {
        result.status = 'FAIL';
        result.error = 'Response format or status code mismatch';
      }

      result.responseTime = performance.now() - startTime;
    } catch (error: any) {
      result.status = 'FAIL';
      result.error = error.message;
      result.responseTime = performance.now() - startTime;
    }

    return result;
  }

  /**
   * Make HTTP request with proper headers
   */
  private async makeRequest(
    client: AxiosInstance,
    method: string,
    endpoint: string,
    data?: any,
    csrfToken?: string
  ): Promise<AxiosResponse> {
    const config: any = {
      headers: {}
    };

    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }

    switch (method.toUpperCase()) {
      case 'GET':
        return await client.get(endpoint, config);
      case 'POST':
        return await client.post(endpoint, data, config);
      case 'PUT':
        return await client.put(endpoint, data, config);
      case 'DELETE':
        return await client.delete(endpoint, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  /**
   * Validate response format compatibility
   */
  private validateResponse(flaskResponse: any, expressResponse: any): boolean {
    // Check if both responses have the same structure
    if (typeof flaskResponse !== typeof expressResponse) {
      return false;
    }

    if (typeof flaskResponse === 'object' && flaskResponse !== null) {
      // Check if both have success field
      if (flaskResponse.success !== expressResponse.success) {
        return false;
      }

      // Check if both have message field (for error responses)
      if (flaskResponse.message && expressResponse.message) {
        if (flaskResponse.message !== expressResponse.message) {
          return false;
        }
      }

      // For successful responses, check if they have the expected data structure
      if (flaskResponse.success && expressResponse.success) {
        // Check if both have the same top-level keys
        const flaskKeys = Object.keys(flaskResponse).sort();
        const expressKeys = Object.keys(expressResponse).sort();
        
        if (JSON.stringify(flaskKeys) !== JSON.stringify(expressKeys)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Run all admin endpoint tests
   */
  async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Starting admin API contract tests...');

    const results: TestResult[] = [];

    // Test 1: Get users list
    console.log('📋 Testing GET /admin/users...');
    results.push(await this.testEndpoint('GET', `${API_BASE}/admin/users`));

    // Test 2: Create new user
    console.log('👤 Testing POST /admin/users...');
    const newUserData = {
      username: 'testuser_' + Date.now(),
      password: 'testpassword123',
      is_admin: false
    };
    results.push(await this.testEndpoint('POST', `${API_BASE}/admin/users`, newUserData, 201));

    // Test 3: Update user (we'll need to get the user ID from the previous test)
    if (results[results.length - 1].status === 'PASS' && results[results.length - 1].expressResponse?.user?.id) {
      const userId = results[results.length - 1].expressResponse.user.id;
      console.log(`✏️ Testing PUT /admin/users/${userId}...`);
      const updateData = {
        username: 'updateduser_' + Date.now(),
        is_admin: true
      };
      results.push(await this.testEndpoint('PUT', `${API_BASE}/admin/users/${userId}`, updateData));
    }

    // Test 4: Get system configuration
    console.log('⚙️ Testing GET /admin/config...');
    results.push(await this.testEndpoint('GET', `${API_BASE}/admin/config`));

    // Test 5: Update system configuration
    console.log('🔧 Testing PUT /admin/config...');
    const configData = {
      max_total_memory_mb: 8192,
      default_server_memory_mb: 1024,
      min_server_memory_mb: 512,
      max_server_memory_mb: 4096
    };
    results.push(await this.testEndpoint('PUT', `${API_BASE}/admin/config`, configData));

    // Test 6: Get system statistics
    console.log('📊 Testing GET /admin/stats...');
    results.push(await this.testEndpoint('GET', `${API_BASE}/admin/stats`));

    // Test 7: Delete user (cleanup)
    if (results.length >= 3 && results[2].status === 'PASS' && results[2].expressResponse?.user?.id) {
      const userId = results[2].expressResponse.user.id;
      console.log(`🗑️ Testing DELETE /admin/users/${userId}...`);
      results.push(await this.testEndpoint('DELETE', `${API_BASE}/admin/users/${userId}`));
    }

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      skipped: results.filter(r => r.status === 'SKIP').length
    };

    return {
      name: 'Admin API Contract Tests',
      results,
      summary
    };
  }

  /**
   * Print test results
   */
  printResults(testSuite: TestSuite): void {
    console.log('\n📊 Admin API Contract Test Results');
    console.log('=====================================');
    console.log(`Total Tests: ${testSuite.summary.total}`);
    console.log(`✅ Passed: ${testSuite.summary.passed}`);
    console.log(`❌ Failed: ${testSuite.summary.failed}`);
    console.log(`⏭️ Skipped: ${testSuite.summary.skipped}`);
    console.log(`Success Rate: ${((testSuite.summary.passed / testSuite.summary.total) * 100).toFixed(1)}%`);

    console.log('\n📋 Detailed Results:');
    testSuite.results.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`${index + 1}. ${status} ${result.method} ${result.endpoint}`);
      
      if (result.status === 'FAIL') {
        console.log(`   Error: ${result.error}`);
        if (result.flaskStatus !== result.expressStatus) {
          console.log(`   Status Mismatch: Flask=${result.flaskStatus}, Express=${result.expressStatus}`);
        }
      }
      
      if (result.responseTime) {
        console.log(`   Response Time: ${result.responseTime.toFixed(2)}ms`);
      }
    });

    // Show failed tests in detail
    const failedTests = testSuite.results.filter(r => r.status === 'FAIL');
    if (failedTests.length > 0) {
      console.log('\n❌ Failed Test Details:');
      failedTests.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.method} ${result.endpoint}`);
        console.log(`   Flask Response:`, JSON.stringify(result.flaskResponse, null, 2));
        console.log(`   Express Response:`, JSON.stringify(result.expressResponse, null, 2));
      });
    }
  }

  /**
   * Export results to JSON file
   */
  async exportResults(testSuite: TestSuite): Promise<void> {
    const fs = await import('fs/promises');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `admin-contract-test-results-${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(testSuite, null, 2));
    console.log(`\n📄 Results exported to: ${filename}`);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const tester = new AdminContractTester();

  try {
    // Setup authentication
    await tester.setupAuthentication();

    // Run all tests
    const results = await tester.runAllTests();

    // Print results
    tester.printResults(results);

    // Export results
    await tester.exportResults(results);

    // Exit with appropriate code
    if (results.summary.failed > 0) {
      console.log('\n❌ Some tests failed. Check the details above.');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { AdminContractTester };
