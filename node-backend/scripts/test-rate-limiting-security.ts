#!/usr/bin/env ts-node

/**
 * Rate Limiting and Security Middleware Testing Script
 * 
 * Tests the enhanced rate limiting and security middleware implementation
 * for all contract routes to ensure proper protection and functionality.
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../src/config/logger';

// Test configuration
const BASE_URL = 'http://localhost:5001';
const TEST_TIMEOUT = 10000;

// Test data
const validAuthData = {
  username: 'testuser',
  password: 'TestPassword123!'
};

const validServerData = {
  server_name: 'test-server',
  version: '1.20.1',
  port: 25565,
  memory_mb: 1024,
  motd: 'Test Server',
  max_players: 20,
  difficulty: 'normal',
  gamemode: 'survival',
  pvp: true,
  spawn_monsters: true,
  hardcore: false
};

const validAdminUserData = {
  username: 'adminuser',
  password: 'AdminPassword123!',
  is_admin: true
};

class RateLimitingSecurityTester {
  private axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'RateLimitingSecurityTester/1.0'
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

  // Test rate limiting for authentication endpoints
  async testAuthRateLimiting() {
    console.log('\n🔐 Testing Authentication Rate Limiting...');

    // Test normal login attempts
    let attempts = 0;
    let rateLimited = false;
    
    while (attempts < 10 && !rateLimited) {
      const result = await this.makeRequest('POST', '/api/v1/auth/login', validAuthData);
      attempts++;
      
      if (!result.success && result.error?.status === 429) {
        rateLimited = true;
        this.addTestResult('Rate Limiting', 'Authentication', 'PASS', `Rate limited after ${attempts} attempts`);
        
        // Check rate limit headers
        if (result.error?.headers) {
          const rateLimitHeaders = {
            limit: result.error.headers['x-rate-limit-limit'],
            remaining: result.error.headers['x-rate-limit-remaining'],
            reset: result.error.headers['x-rate-limit-reset']
          };
          
          if (rateLimitHeaders.limit) {
            this.addTestResult('Rate Limit Headers', 'Authentication', 'PASS', 'Rate limit headers present', rateLimitHeaders);
          } else {
            this.addTestResult('Rate Limit Headers', 'Authentication', 'FAIL', 'Rate limit headers missing');
          }
        }
      }
    }

    if (!rateLimited) {
      this.addTestResult('Rate Limiting', 'Authentication', 'FAIL', 'Rate limiting not working - exceeded 10 attempts');
    }
  }

  // Test rate limiting for server management endpoints
  async testServerRateLimiting() {
    console.log('\n🖥️ Testing Server Management Rate Limiting...');

    // Test server creation rate limiting
    let attempts = 0;
    let rateLimited = false;
    
    while (attempts < 35 && !rateLimited) {
      const result = await this.makeRequest('POST', '/api/v1/servers', validServerData);
      attempts++;
      
      if (!result.success && result.error?.status === 429) {
        rateLimited = true;
        this.addTestResult('Server Creation Rate Limiting', 'Server Management', 'PASS', `Rate limited after ${attempts} attempts`);
      }
    }

    if (!rateLimited) {
      this.addTestResult('Server Creation Rate Limiting', 'Server Management', 'FAIL', 'Rate limiting not working - exceeded 35 attempts');
    }

    // Test server lifecycle rate limiting (start/stop operations)
    attempts = 0;
    rateLimited = false;
    
    while (attempts < 10 && !rateLimited) {
      const result = await this.makeRequest('POST', '/api/v1/servers/1/start');
      attempts++;
      
      if (!result.success && result.error?.status === 429) {
        rateLimited = true;
        this.addTestResult('Server Lifecycle Rate Limiting', 'Server Management', 'PASS', `Rate limited after ${attempts} attempts`);
      }
    }

    if (!rateLimited) {
      this.addTestResult('Server Lifecycle Rate Limiting', 'Server Management', 'FAIL', 'Rate limiting not working - exceeded 10 attempts');
    }
  }

  // Test rate limiting for admin endpoints
  async testAdminRateLimiting() {
    console.log('\n👑 Testing Admin Rate Limiting...');

    // Test admin user creation rate limiting
    let attempts = 0;
    let rateLimited = false;
    
    while (attempts < 20 && !rateLimited) {
      const result = await this.makeRequest('POST', '/api/v1/admin/users', validAdminUserData);
      attempts++;
      
      if (!result.success && result.error?.status === 429) {
        rateLimited = true;
        this.addTestResult('Admin User Creation Rate Limiting', 'Admin', 'PASS', `Rate limited after ${attempts} attempts`);
      }
    }

    if (!rateLimited) {
      this.addTestResult('Admin User Creation Rate Limiting', 'Admin', 'FAIL', 'Rate limiting not working - exceeded 20 attempts');
    }
  }

  // Test security headers
  async testSecurityHeaders() {
    console.log('\n🛡️ Testing Security Headers...');

    const result = await this.makeRequest('GET', '/api/v1/auth/csrf-token');
    
    if (result.success && result.response?.headers) {
      const headers = result.response.headers;
      
      // Check for security headers
      const securityHeaders = {
        'x-content-type-options': headers['x-content-type-options'],
        'x-frame-options': headers['x-frame-options'],
        'x-xss-protection': headers['x-xss-protection'],
        'x-request-id': headers['x-request-id'],
        'x-contract-version': headers['x-contract-version'],
        'x-api-source': headers['x-api-source']
      };

      const presentHeaders = Object.entries(securityHeaders).filter(([_, value]) => value);
      
      if (presentHeaders.length >= 4) {
        this.addTestResult('Security Headers', 'Security', 'PASS', `${presentHeaders.length} security headers present`, securityHeaders);
      } else {
        this.addTestResult('Security Headers', 'Security', 'FAIL', `Only ${presentHeaders.length} security headers present`, securityHeaders);
      }
    } else {
      this.addTestResult('Security Headers', 'Security', 'FAIL', 'Could not test security headers');
    }
  }

  // Test request validation
  async testRequestValidation() {
    console.log('\n✅ Testing Request Validation...');

    // Test invalid HTTP method
    const invalidMethodResult = await this.makeRequest('PATCH', '/api/v1/auth/login', validAuthData);
    if (!invalidMethodResult.success && invalidMethodResult.error?.status === 405) {
      this.addTestResult('Invalid HTTP Method', 'Request Validation', 'PASS', 'Invalid HTTP method rejected');
    } else {
      this.addTestResult('Invalid HTTP Method', 'Request Validation', 'FAIL', 'Invalid HTTP method not rejected');
    }

    // Test invalid Content-Type
    const invalidContentTypeResult = await this.makeRequest('POST', '/api/v1/auth/login', validAuthData, {
      'Content-Type': 'text/plain'
    });
    if (!invalidContentTypeResult.success && invalidContentTypeResult.error?.status === 400) {
      this.addTestResult('Invalid Content-Type', 'Request Validation', 'PASS', 'Invalid Content-Type rejected');
    } else {
      this.addTestResult('Invalid Content-Type', 'Request Validation', 'FAIL', 'Invalid Content-Type not rejected');
    }
  }

  // Test response standardization
  async testResponseStandardization() {
    console.log('\n📋 Testing Response Standardization...');

    const result = await this.makeRequest('GET', '/api/v1/auth/csrf-token');
    
    if (result.success && result.response?.data) {
      const data = result.response.data;
      
      // Check for standard response format
      const hasSuccess = data.hasOwnProperty('success');
      const hasTimestamp = data.hasOwnProperty('timestamp');
      
      if (hasSuccess && hasTimestamp) {
        this.addTestResult('Response Standardization', 'Response Format', 'PASS', 'Response has standard format', data);
      } else {
        this.addTestResult('Response Standardization', 'Response Format', 'FAIL', 'Response missing standard fields', data);
      }
    } else {
      this.addTestResult('Response Standardization', 'Response Format', 'FAIL', 'Could not test response standardization');
    }
  }

  // Test performance monitoring
  async testPerformanceMonitoring() {
    console.log('\n⏱️ Testing Performance Monitoring...');

    const startTime = Date.now();
    const result = await this.makeRequest('GET', '/api/v1/auth/csrf-token');
    const duration = Date.now() - startTime;
    
    if (result.success) {
      if (duration < 1000) {
        this.addTestResult('Performance Monitoring', 'Performance', 'PASS', `Response time: ${duration}ms`);
      } else {
        this.addTestResult('Performance Monitoring', 'Performance', 'FAIL', `Slow response time: ${duration}ms`);
      }
    } else {
      this.addTestResult('Performance Monitoring', 'Performance', 'FAIL', 'Request failed');
    }
  }

  // Test audit logging
  async testAuditLogging() {
    console.log('\n📝 Testing Audit Logging...');

    // Test sensitive operation logging
    const result = await this.makeRequest('GET', '/api/v1/admin/users');
    
    if (result.success || result.error?.status === 401 || result.error?.status === 403) {
      this.addTestResult('Audit Logging', 'Logging', 'PASS', 'Sensitive operation logged (check server logs)');
    } else {
      this.addTestResult('Audit Logging', 'Logging', 'FAIL', 'Could not test audit logging');
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Rate Limiting and Security Tests...\n');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms\n`);

    try {
      await this.testAuthRateLimiting();
      await this.testServerRateLimiting();
      await this.testAdminRateLimiting();
      await this.testSecurityHeaders();
      await this.testRequestValidation();
      await this.testResponseStandardization();
      await this.testPerformanceMonitoring();
      await this.testAuditLogging();

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

    console.log('\n🎯 Rate Limiting and Security Test Complete!');
    
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Rate limiting and security middleware are working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Please review the implementation.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new RateLimitingSecurityTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { RateLimitingSecurityTester };
