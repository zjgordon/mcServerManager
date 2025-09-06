#!/usr/bin/env ts-node

/**
 * Comprehensive Error Handling Testing Script
 * 
 * Tests the enhanced error handling implementation for all contract routes
 * to ensure proper error responses and Flask API contract compatibility.
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../src/config/logger';

// Test configuration
const BASE_URL = 'http://localhost:5001';
const TEST_TIMEOUT = 10000;

class ErrorHandlingTester {
  private axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ErrorHandlingTester/1.0'
    }
  });

  private testResults: Array<{
    test: string;
    category: string;
    status: 'PASS' | 'FAIL';
    message: string;
    details?: any;
  }> = [];

  private async makeRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any, headers?: any) {
    try {
      const response = await this.axiosInstance.request({
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

  private addTestResult(test: string, category: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
    this.testResults.push({ test, category, status, message, details });
    const statusIcon = status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} ${category} - ${test}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // Test authentication error handling
  async testAuthenticationErrors() {
    console.log('\n🔐 Testing Authentication Error Handling...');

    // Test invalid login credentials
    const invalidLoginResult = await this.makeRequest('POST', '/api/v1/auth/login', {
      username: 'nonexistent',
      password: 'wrongpassword'
    });

    if (!invalidLoginResult.success && invalidLoginResult.error?.status === 401) {
      const errorData = invalidLoginResult.error?.data;
      if (errorData && errorData.success === false && errorData.message) {
        this.addTestResult('Invalid Login Credentials', 'Authentication Errors', 'PASS', 'Proper 401 error response', errorData);
      } else {
        this.addTestResult('Invalid Login Credentials', 'Authentication Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Invalid Login Credentials', 'Authentication Errors', 'FAIL', 'Expected 401 status code');
    }

    // Test missing authentication for protected endpoint
    const protectedResult = await this.makeRequest('GET', '/api/v1/auth/me');
    if (!protectedResult.success && protectedResult.error?.status === 401) {
      const errorData = protectedResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Missing Authentication', 'Authentication Errors', 'PASS', 'Proper 401 error response', errorData);
      } else {
        this.addTestResult('Missing Authentication', 'Authentication Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Missing Authentication', 'Authentication Errors', 'FAIL', 'Expected 401 status code');
    }
  }

  // Test validation error handling
  async testValidationErrors() {
    console.log('\n✅ Testing Validation Error Handling...');

    // Test invalid login data
    const invalidLoginDataResult = await this.makeRequest('POST', '/api/v1/auth/login', {
      username: '', // Invalid: empty username
      password: 'short' // Invalid: too short password
    });

    if (!invalidLoginDataResult.success && invalidLoginDataResult.error?.status === 400) {
      const errorData = invalidLoginDataResult.error?.data;
      if (errorData && errorData.success === false && errorData.code) {
        this.addTestResult('Invalid Login Data', 'Validation Errors', 'PASS', 'Proper 400 validation error', errorData);
      } else {
        this.addTestResult('Invalid Login Data', 'Validation Errors', 'FAIL', 'Missing validation error format', errorData);
      }
    } else {
      this.addTestResult('Invalid Login Data', 'Validation Errors', 'FAIL', 'Expected 400 status code');
    }

    // Test invalid server creation data
    const invalidServerDataResult = await this.makeRequest('POST', '/api/v1/servers', {
      server_name: '', // Invalid: empty server name
      version: 'invalid', // Invalid: invalid version
      port: 'not-a-number' // Invalid: non-numeric port
    });

    if (!invalidServerDataResult.success && invalidServerDataResult.error?.status === 400) {
      const errorData = invalidServerDataResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Invalid Server Data', 'Validation Errors', 'PASS', 'Proper 400 validation error', errorData);
      } else {
        this.addTestResult('Invalid Server Data', 'Validation Errors', 'FAIL', 'Missing validation error format', errorData);
      }
    } else {
      this.addTestResult('Invalid Server Data', 'Validation Errors', 'FAIL', 'Expected 400 status code');
    }
  }

  // Test not found error handling
  async testNotFoundErrors() {
    console.log('\n🔍 Testing Not Found Error Handling...');

    // Test non-existent server
    const nonExistentServerResult = await this.makeRequest('GET', '/api/v1/servers/99999');
    if (!nonExistentServerResult.success && nonExistentServerResult.error?.status === 404) {
      const errorData = nonExistentServerResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Non-existent Server', 'Not Found Errors', 'PASS', 'Proper 404 error response', errorData);
      } else {
        this.addTestResult('Non-existent Server', 'Not Found Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Non-existent Server', 'Not Found Errors', 'FAIL', 'Expected 404 status code');
    }

    // Test non-existent admin user
    const nonExistentUserResult = await this.makeRequest('GET', '/api/v1/admin/users/99999');
    if (!nonExistentUserResult.error?.status === 404) {
      const errorData = nonExistentUserResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Non-existent Admin User', 'Not Found Errors', 'PASS', 'Proper 404 error response', errorData);
      } else {
        this.addTestResult('Non-existent Admin User', 'Not Found Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Non-existent Admin User', 'Not Found Errors', 'FAIL', 'Expected 404 status code');
    }
  }

  // Test authorization error handling
  async testAuthorizationErrors() {
    console.log('\n👑 Testing Authorization Error Handling...');

    // Test admin endpoint without admin privileges
    const adminResult = await this.makeRequest('GET', '/api/v1/admin/users');
    if (!adminResult.success && (adminResult.error?.status === 401 || adminResult.error?.status === 403)) {
      const errorData = adminResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Admin Endpoint Access', 'Authorization Errors', 'PASS', 'Proper authorization error response', errorData);
      } else {
        this.addTestResult('Admin Endpoint Access', 'Authorization Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Admin Endpoint Access', 'Authorization Errors', 'FAIL', 'Expected 401/403 status code');
    }
  }

  // Test method not allowed errors
  async testMethodNotAllowedErrors() {
    console.log('\n🚫 Testing Method Not Allowed Error Handling...');

    // Test invalid HTTP method
    const invalidMethodResult = await this.makeRequest('PATCH', '/api/v1/auth/login', {});
    if (!invalidMethodResult.success && invalidMethodResult.error?.status === 405) {
      const errorData = invalidMethodResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Invalid HTTP Method', 'Method Not Allowed Errors', 'PASS', 'Proper 405 error response', errorData);
      } else {
        this.addTestResult('Invalid HTTP Method', 'Method Not Allowed Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Invalid HTTP Method', 'Method Not Allowed Errors', 'FAIL', 'Expected 405 status code');
    }
  }

  // Test content type errors
  async testContentTypeErrors() {
    console.log('\n📄 Testing Content Type Error Handling...');

    // Test invalid content type
    const invalidContentTypeResult = await this.makeRequest('POST', '/api/v1/auth/login', 
      { username: 'test', password: 'test' },
      { 'Content-Type': 'text/plain' }
    );

    if (!invalidContentTypeResult.success && invalidContentTypeResult.error?.status === 400) {
      const errorData = invalidContentTypeResult.error?.data;
      if (errorData && errorData.success === false) {
        this.addTestResult('Invalid Content Type', 'Content Type Errors', 'PASS', 'Proper 400 error response', errorData);
      } else {
        this.addTestResult('Invalid Content Type', 'Content Type Errors', 'FAIL', 'Missing error response format', errorData);
      }
    } else {
      this.addTestResult('Invalid Content Type', 'Content Type Errors', 'FAIL', 'Expected 400 status code');
    }
  }

  // Test rate limiting errors
  async testRateLimitErrors() {
    console.log('\n⏱️ Testing Rate Limit Error Handling...');

    // Test rate limiting by making many requests
    let rateLimited = false;
    let attempts = 0;
    
    while (attempts < 10 && !rateLimited) {
      const result = await this.makeRequest('POST', '/api/v1/auth/login', {
        username: 'test',
        password: 'test'
      });
      attempts++;
      
      if (!result.success && result.error?.status === 429) {
        rateLimited = true;
        const errorData = result.error?.data;
        if (errorData && errorData.success === false) {
          this.addTestResult('Rate Limit Exceeded', 'Rate Limit Errors', 'PASS', 'Proper 429 error response', errorData);
        } else {
          this.addTestResult('Rate Limit Exceeded', 'Rate Limit Errors', 'FAIL', 'Missing error response format', errorData);
        }
      }
    }

    if (!rateLimited) {
      this.addTestResult('Rate Limit Exceeded', 'Rate Limit Errors', 'FAIL', 'Rate limiting not working - exceeded 10 attempts');
    }
  }

  // Test error response format consistency
  async testErrorResponseFormat() {
    console.log('\n📋 Testing Error Response Format Consistency...');

    // Test various error scenarios and check response format
    const errorTests = [
      { method: 'POST', endpoint: '/api/v1/auth/login', data: { username: '', password: '' }, expectedStatus: 400 },
      { method: 'GET', endpoint: '/api/v1/servers/99999', data: undefined, expectedStatus: 404 },
      { method: 'PATCH', endpoint: '/api/v1/auth/login', data: {}, expectedStatus: 405 },
    ];

    let formatConsistent = true;
    const responseFormats: any[] = [];

    for (const test of errorTests) {
      const result = await this.makeRequest(test.method as any, test.endpoint, test.data);
      
      if (!result.success && result.error?.status === test.expectedStatus) {
        const errorData = result.error?.data;
        responseFormats.push(errorData);
        
        // Check for required fields
        if (!errorData || typeof errorData.success !== 'boolean' || !errorData.message) {
          formatConsistent = false;
          break;
        }
      }
    }

    if (formatConsistent) {
      this.addTestResult('Error Response Format', 'Response Format', 'PASS', 'All error responses have consistent format', responseFormats);
    } else {
      this.addTestResult('Error Response Format', 'Response Format', 'FAIL', 'Error responses have inconsistent format', responseFormats);
    }
  }

  // Test error logging
  async testErrorLogging() {
    console.log('\n📝 Testing Error Logging...');

    // Make a request that should generate an error
    const result = await this.makeRequest('POST', '/api/v1/auth/login', {
      username: 'test',
      password: 'test'
    });

    if (!result.success) {
      // Check if error response includes request ID for tracking
      const errorData = result.error?.data;
      if (errorData && errorData.requestId) {
        this.addTestResult('Error Logging', 'Logging', 'PASS', 'Error response includes request ID for tracking', errorData);
      } else {
        this.addTestResult('Error Logging', 'Logging', 'FAIL', 'Error response missing request ID', errorData);
      }
    } else {
      this.addTestResult('Error Logging', 'Logging', 'FAIL', 'Expected error response');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Error Handling Tests...\n');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms\n`);

    try {
      await this.testAuthenticationErrors();
      await this.testValidationErrors();
      await this.testNotFoundErrors();
      await this.testAuthorizationErrors();
      await this.testMethodNotAllowedErrors();
      await this.testContentTypeErrors();
      await this.testRateLimitErrors();
      await this.testErrorResponseFormat();
      await this.testErrorLogging();

      // Generate summary
      this.generateSummary();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  private generateSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
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
        });
    }

    console.log('\n🎯 Comprehensive Error Handling Test Complete!');
    
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Error handling is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Please review the error handling implementation.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new ErrorHandlingTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { ErrorHandlingTester };
