#!/usr/bin/env ts-node

/**
 * Authentication API Contract Testing Script
 * 
 * This script tests the contract compatibility between Flask and Express.js
 * authentication endpoints to ensure API parity during migration.
 */

import axios, { AxiosResponse } from 'axios';
import { logger } from '../src/config/logger';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  flaskResponse?: any;
  expressResponse?: any;
  error?: string;
  differences?: string[];
}

interface ContractTest {
  name: string;
  endpoint: string;
  method: string;
  headers?: Record<string, string>;
  data?: any;
  expectedStatus: number;
  expectedFields?: string[];
  skipFlask?: boolean;
  skipExpress?: boolean;
}

class AuthContractTester {
  private flaskBaseUrl = 'http://localhost:5000/api/v1/auth';
  private expressBaseUrl = 'http://localhost:5001/api/v1/auth';
  private results: TestResult[] = [];
  private csrfToken: string | null = null;
  private sessionCookie: string | null = null;

  private tests: ContractTest[] = [
    // CSRF Token
    {
      name: 'Get CSRF Token',
      endpoint: '/csrf-token',
      method: 'GET',
      expectedStatus: 200,
      expectedFields: ['csrf_token']
    },

    // Setup Status
    {
      name: 'Check Setup Status',
      endpoint: '/setup/status',
      method: 'GET',
      expectedStatus: 200,
      expectedFields: ['setup_required', 'has_admin']
    },

    // Auth Status (unauthenticated)
    {
      name: 'Check Auth Status (Unauthenticated)',
      endpoint: '/status',
      method: 'GET',
      expectedStatus: 200,
      expectedFields: ['authenticated']
    },

    // Admin Setup (if needed)
    {
      name: 'Admin Setup',
      endpoint: '/setup',
      method: 'POST',
      data: {
        username: 'testadmin',
        password: 'TestPassword123!',
        confirm_password: 'TestPassword123!',
        email: 'admin@test.com'
      },
      expectedStatus: 201,
      expectedFields: ['success', 'message', 'user']
    },

    // Login
    {
      name: 'User Login',
      endpoint: '/login',
      method: 'POST',
      data: {
        username: 'testadmin',
        password: 'TestPassword123!'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'message', 'user']
    },

    // Auth Status (authenticated)
    {
      name: 'Check Auth Status (Authenticated)',
      endpoint: '/status',
      method: 'GET',
      expectedStatus: 200,
      expectedFields: ['authenticated', 'user']
    },

    // Get Current User
    {
      name: 'Get Current User',
      endpoint: '/me',
      method: 'GET',
      expectedStatus: 200,
      expectedFields: ['success', 'user']
    },

    // Change Password
    {
      name: 'Change Password',
      endpoint: '/change-password',
      method: 'POST',
      data: {
        current_password: 'TestPassword123!',
        new_password: 'NewTestPassword123!'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'message']
    },

    // Reset Password (self)
    {
      name: 'Reset Password (Self)',
      endpoint: '/reset-password',
      method: 'POST',
      data: {
        new_password: 'TestPassword123!',
        confirm_password: 'TestPassword123!'
      },
      expectedStatus: 200,
      expectedFields: ['success', 'message']
    },

    // Logout
    {
      name: 'User Logout',
      endpoint: '/logout',
      method: 'POST',
      expectedStatus: 200,
      expectedFields: ['success', 'message']
    }
  ];

  async runTests(): Promise<void> {
    logger.info('🚀 Starting Authentication API Contract Tests...');
    logger.info(`Flask URL: ${this.flaskBaseUrl}`);
    logger.info(`Express URL: ${this.expressBaseUrl}`);

    for (const test of this.tests) {
      await this.runTest(test);
    }

    this.printResults();
  }

  private async runTest(test: ContractTest): Promise<void> {
    logger.info(`\n🧪 Testing: ${test.name}`);

    const result: TestResult = {
      endpoint: test.endpoint,
      method: test.method,
      status: 'SKIP'
    };

    try {
      // Test Flask endpoint
      if (!test.skipFlask) {
        result.flaskResponse = await this.testEndpoint(
          this.flaskBaseUrl + test.endpoint,
          test.method,
          test.data,
          test.headers
        );
      }

      // Test Express endpoint
      if (!test.skipExpress) {
        result.expressResponse = await this.testEndpoint(
          this.expressBaseUrl + test.endpoint,
          test.method,
          test.data,
          test.headers
        );
      }

      // Compare responses
      if (result.flaskResponse && result.expressResponse) {
        const differences = this.compareResponses(result.flaskResponse, result.expressResponse, test);
        if (differences.length === 0) {
          result.status = 'PASS';
        } else {
          result.status = 'FAIL';
          result.differences = differences;
        }
      } else if (result.flaskResponse || result.expressResponse) {
        result.status = 'PASS'; // One endpoint tested successfully
      }

    } catch (error) {
      result.status = 'FAIL';
      result.error = error instanceof Error ? error.message : String(error);
    }

    this.results.push(result);
  }

  private async testEndpoint(
    url: string,
    method: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<AxiosResponse> {
    const config: any = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true // Don't throw on non-2xx status codes
    };

    if (data) {
      config.data = data;
    }

    if (this.sessionCookie) {
      config.headers.Cookie = this.sessionCookie;
    }

    if (this.csrfToken && method !== 'GET') {
      config.headers['X-CSRF-Token'] = this.csrfToken;
    }

    const response = await axios(config);

    // Extract session cookie and CSRF token from responses
    if (response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      const sessionCookie = cookies.find((cookie: string) => cookie.startsWith('connect.sid') || cookie.startsWith('mcserver_session'));
      if (sessionCookie) {
        this.sessionCookie = sessionCookie.split(';')[0];
      }
    }

    if (response.data && response.data.csrf_token) {
      this.csrfToken = response.data.csrf_token;
    }

    return response;
  }

  private compareResponses(flaskResponse: AxiosResponse, expressResponse: AxiosResponse, test: ContractTest): string[] {
    const differences: string[] = [];

    // Compare status codes
    if (flaskResponse.status !== expressResponse.status) {
      differences.push(`Status code mismatch: Flask ${flaskResponse.status} vs Express ${expressResponse.status}`);
    }

    // Compare response structure
    const flaskData = flaskResponse.data;
    const expressData = expressResponse.data;

    // Check expected fields
    if (test.expectedFields) {
      for (const field of test.expectedFields) {
        const flaskHasField = this.hasField(flaskData, field);
        const expressHasField = this.hasField(expressData, field);

        if (flaskHasField !== expressHasField) {
          differences.push(`Field '${field}' presence mismatch: Flask ${flaskHasField} vs Express ${expressHasField}`);
        }
      }
    }

    // Compare response types
    if (typeof flaskData !== typeof expressData) {
      differences.push(`Response type mismatch: Flask ${typeof flaskData} vs Express ${typeof expressData}`);
    }

    // Compare specific fields for authentication responses
    if (test.endpoint === '/login' && flaskData.success && expressData.success) {
      const userFields = ['id', 'username', 'isAdmin', 'email', 'isActive'];
      for (const field of userFields) {
        if (flaskData.user?.[field] !== expressData.user?.[field]) {
          differences.push(`User field '${field}' mismatch: Flask ${flaskData.user?.[field]} vs Express ${expressData.user?.[field]}`);
        }
      }
    }

    return differences;
  }

  private hasField(obj: any, field: string): boolean {
    return obj && typeof obj === 'object' && field in obj;
  }

  private printResults(): void {
    logger.info('\n📊 Contract Test Results:');
    logger.info('=' .repeat(80));

    let passCount = 0;
    let failCount = 0;
    let skipCount = 0;

    for (const result of this.results) {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      logger.info(`${status} ${result.method} ${result.endpoint} - ${result.status}`);

      if (result.status === 'PASS') passCount++;
      else if (result.status === 'FAIL') failCount++;
      else skipCount++;

      if (result.error) {
        logger.error(`   Error: ${result.error}`);
      }

      if (result.differences && result.differences.length > 0) {
        logger.error(`   Differences:`);
        for (const diff of result.differences) {
          logger.error(`     - ${diff}`);
        }
      }

      if (result.flaskResponse) {
        logger.info(`   Flask: ${result.flaskResponse.status} - ${JSON.stringify(result.flaskResponse.data).substring(0, 100)}...`);
      }

      if (result.expressResponse) {
        logger.info(`   Express: ${result.expressResponse.status} - ${JSON.stringify(result.expressResponse.data).substring(0, 100)}...`);
      }
    }

    logger.info('\n📈 Summary:');
    logger.info(`✅ Passed: ${passCount}`);
    logger.info(`❌ Failed: ${failCount}`);
    logger.info(`⏭️ Skipped: ${skipCount}`);
    logger.info(`📊 Total: ${this.results.length}`);

    if (failCount === 0) {
      logger.info('\n🎉 All contract tests passed! API parity maintained.');
    } else {
      logger.error(`\n⚠️ ${failCount} contract test(s) failed. Review differences above.`);
    }
  }
}

// Main execution
async function main() {
  const tester = new AuthContractTester();
  
  try {
    await tester.runTests();
  } catch (error) {
    logger.error('Contract testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { AuthContractTester };
