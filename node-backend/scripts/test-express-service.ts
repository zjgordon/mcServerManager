#!/usr/bin/env ts-node

/**
 * Express Service Testing Script
 * 
 * Comprehensive testing of the Express service on port 5001 including
 * health checks, API endpoints, performance testing, and service validation.
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../src/config/logger';
import { config } from '../src/config';

interface TestResult {
  test: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  responseTime?: number;
  error?: string;
}

interface ServiceTest {
  name: string;
  category: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  data?: any;
  headers?: any;
  expectedStatus?: number;
  timeout?: number;
}

class ExpressServiceTester {
  private baseUrl = `http://localhost:${config.port}`;
  private testResults: TestResult[] = [];
  private session: any = null;

  private async makeRequest(test: ServiceTest): Promise<{ success: boolean; response?: any; error?: any; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      const response = await axios.request({
        method: test.method,
        url: `${this.baseUrl}${test.endpoint}`,
        data: test.data,
        headers: test.headers,
        timeout: test.timeout || 10000,
        withCredentials: true
      });
      
      const responseTime = Date.now() - startTime;
      return { success: true, response, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          error: {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          },
          responseTime
        };
      }
      return { success: false, error: { message: error.message }, responseTime };
    }
  }

  private addTestResult(test: string, category: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any, responseTime?: number, error?: string) {
    this.testResults.push({ test, category, status, message, details, responseTime, error });
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    const timeInfo = responseTime ? ` (${responseTime}ms)` : '';
    console.log(`${statusIcon} ${category} - ${test}: ${message}${timeInfo}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
    if (error) {
      console.log(`   Error: ${error}`);
    }
  }

  // Test service availability
  async testServiceAvailability(): Promise<void> {
    console.log('\n🔍 Testing service availability...');
    
    const tests: ServiceTest[] = [
      {
        name: 'Health Check',
        category: 'Availability',
        method: 'GET',
        endpoint: '/healthz',
        expectedStatus: 200
      },
      {
        name: 'Readiness Check',
        category: 'Availability',
        method: 'GET',
        endpoint: '/readyz',
        expectedStatus: 200
      },
      {
        name: 'Liveness Check',
        category: 'Availability',
        method: 'GET',
        endpoint: '/live',
        expectedStatus: 200
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test);
      
      if (result.success) {
        if (result.response.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `Service available and responding correctly`, 
            { status: result.response.status, data: result.response.data },
            result.responseTime
          );
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Unexpected status code: ${result.response.status}`, 
            { expected: test.expectedStatus, actual: result.response.status },
            result.responseTime
          );
        }
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 
          'Service not available', 
          result.error,
          result.responseTime,
          result.error?.message
        );
      }
    }
  }

  // Test authentication endpoints
  async testAuthenticationEndpoints(): Promise<void> {
    console.log('\n🔐 Testing authentication endpoints...');
    
    const tests: ServiceTest[] = [
      {
        name: 'CSRF Token',
        category: 'Authentication',
        method: 'GET',
        endpoint: '/api/v1/auth/csrf-token',
        expectedStatus: 200
      },
      {
        name: 'User Login',
        category: 'Authentication',
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        data: { username: 'admin', password: 'admin123' },
        expectedStatus: 200
      },
      {
        name: 'User Profile',
        category: 'Authentication',
        method: 'GET',
        endpoint: '/api/v1/auth/me',
        expectedStatus: 200
      },
      {
        name: 'User Logout',
        category: 'Authentication',
        method: 'POST',
        endpoint: '/api/v1/auth/logout',
        expectedStatus: 200
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test);
      
      if (result.success) {
        if (result.response.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `Authentication endpoint working correctly`, 
            { status: result.response.status, data: result.response.data },
            result.responseTime
          );
          
          // Store session for authenticated tests
          if (test.name === 'User Login' && result.response.data.success) {
            this.session = result.response.data;
          }
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Unexpected status code: ${result.response.status}`, 
            { expected: test.expectedStatus, actual: result.response.status },
            result.responseTime
          );
        }
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 
          'Authentication endpoint failed', 
          result.error,
          result.responseTime,
          result.error?.message
        );
      }
    }
  }

  // Test server management endpoints
  async testServerManagementEndpoints(): Promise<void> {
    console.log('\n🖥️ Testing server management endpoints...');
    
    const tests: ServiceTest[] = [
      {
        name: 'Server List',
        category: 'Server Management',
        method: 'GET',
        endpoint: '/api/v1/servers',
        expectedStatus: 200
      },
      {
        name: 'Server Versions',
        category: 'Server Management',
        method: 'GET',
        endpoint: '/api/v1/servers/versions',
        expectedStatus: 200
      },
      {
        name: 'Memory Usage',
        category: 'Server Management',
        method: 'GET',
        endpoint: '/api/v1/servers/memory-usage',
        expectedStatus: 200
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test);
      
      if (result.success) {
        if (result.response.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `Server management endpoint working correctly`, 
            { status: result.response.status, data: result.response.data },
            result.responseTime
          );
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Unexpected status code: ${result.response.status}`, 
            { expected: test.expectedStatus, actual: result.response.status },
            result.responseTime
          );
        }
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 
          'Server management endpoint failed', 
          result.error,
          result.responseTime,
          result.error?.message
        );
      }
    }
  }

  // Test admin endpoints
  async testAdminEndpoints(): Promise<void> {
    console.log('\n👑 Testing admin endpoints...');
    
    const tests: ServiceTest[] = [
      {
        name: 'User List',
        category: 'Admin',
        method: 'GET',
        endpoint: '/api/v1/admin/users',
        expectedStatus: 200
      },
      {
        name: 'System Config',
        category: 'Admin',
        method: 'GET',
        endpoint: '/api/v1/admin/config',
        expectedStatus: 200
      },
      {
        name: 'System Stats',
        category: 'Admin',
        method: 'GET',
        endpoint: '/api/v1/admin/stats',
        expectedStatus: 200
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test);
      
      if (result.success) {
        if (result.response.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `Admin endpoint working correctly`, 
            { status: result.response.status, data: result.response.data },
            result.responseTime
          );
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Unexpected status code: ${result.response.status}`, 
            { expected: test.expectedStatus, actual: result.response.status },
            result.responseTime
          );
        }
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 
          'Admin endpoint failed', 
          result.error,
          result.responseTime,
          result.error?.message
        );
      }
    }
  }

  // Test error handling
  async testErrorHandling(): Promise<void> {
    console.log('\n⚠️ Testing error handling...');
    
    const tests: ServiceTest[] = [
      {
        name: 'Invalid Login',
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

    for (const test of tests) {
      const result = await this.makeRequest(test);
      
      if (result.success) {
        if (result.response.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `Error handling working correctly`, 
            { status: result.response.status, data: result.response.data },
            result.responseTime
          );
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Unexpected status code: ${result.response.status}`, 
            { expected: test.expectedStatus, actual: result.response.status },
            result.responseTime
          );
        }
      } else {
        if (result.error?.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `Error handling working correctly`, 
            { status: result.error.status, data: result.error.data },
            result.responseTime
          );
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Error handling failed`, 
            result.error,
            result.responseTime,
            result.error?.message
          );
        }
      }
    }
  }

  // Test performance
  async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing performance...');
    
    const tests: ServiceTest[] = [
      {
        name: 'Health Check Performance',
        category: 'Performance',
        method: 'GET',
        endpoint: '/healthz',
        timeout: 5000
      },
      {
        name: 'CSRF Token Performance',
        category: 'Performance',
        method: 'GET',
        endpoint: '/api/v1/auth/csrf-token',
        timeout: 5000
      }
    ];

    for (const test of tests) {
      const iterations = 10;
      const responseTimes: number[] = [];
      let successCount = 0;
      
      for (let i = 0; i < iterations; i++) {
        const result = await this.makeRequest(test);
        if (result.success) {
          responseTimes.push(result.responseTime);
          successCount++;
        }
      }
      
      if (successCount > 0) {
        const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
        const minResponseTime = Math.min(...responseTimes);
        const maxResponseTime = Math.max(...responseTimes);
        
        this.addTestResult(test.name, test.category, 'PASS', 
          `Performance test completed`, 
          {
            iterations,
            successCount,
            avgResponseTime: Math.round(avgResponseTime),
            minResponseTime,
            maxResponseTime
          }
        );
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 
          'Performance test failed - no successful requests', 
          { iterations, successCount }
        );
      }
    }
  }

  // Test API documentation
  async testApiDocumentation(): Promise<void> {
    console.log('\n📖 Testing API documentation...');
    
    const tests: ServiceTest[] = [
      {
        name: 'OpenAPI JSON',
        category: 'Documentation',
        method: 'GET',
        endpoint: '/docs/openapi.json',
        expectedStatus: 200
      },
      {
        name: 'Swagger UI',
        category: 'Documentation',
        method: 'GET',
        endpoint: '/docs',
        expectedStatus: 200
      }
    ];

    for (const test of tests) {
      const result = await this.makeRequest(test);
      
      if (result.success) {
        if (result.response.status === test.expectedStatus) {
          this.addTestResult(test.name, test.category, 'PASS', 
            `API documentation accessible`, 
            { status: result.response.status },
            result.responseTime
          );
        } else {
          this.addTestResult(test.name, test.category, 'FAIL', 
            `Unexpected status code: ${result.response.status}`, 
            { expected: test.expectedStatus, actual: result.response.status },
            result.responseTime
          );
        }
      } else {
        this.addTestResult(test.name, test.category, 'FAIL', 
          'API documentation not accessible', 
          result.error,
          result.responseTime,
          result.error?.message
        );
      }
    }
  }

  // Run all tests
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Express Service Tests...\n');
    console.log(`Testing service at: ${this.baseUrl}`);
    console.log(`Port: ${config.port}\n`);

    try {
      await this.testServiceAvailability();
      await this.testAuthenticationEndpoints();
      await this.testServerManagementEndpoints();
      await this.testAdminEndpoints();
      await this.testErrorHandling();
      await this.testPerformance();
      await this.testApiDocumentation();

      // Generate summary
      this.generateSummary();
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  private generateSummary(): void {
    console.log('\n📊 Express Service Test Summary:');
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

    // Performance summary
    const performanceTests = this.testResults.filter(r => r.category === 'Performance' && r.status === 'PASS');
    if (performanceTests.length > 0) {
      console.log('\n⚡ Performance Summary:');
      performanceTests.forEach(test => {
        if (test.details?.avgResponseTime) {
          console.log(`  ${test.test}: ${test.details.avgResponseTime}ms average`);
        }
      });
    }

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.category}: ${result.test} - ${result.message}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          }
        });
    }

    console.log('\n🎯 Express Service Test Complete!');
    
    if (failedTests === 0) {
      console.log('🎉 All tests passed! Express service is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Please review the issues above.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new ExpressServiceTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { ExpressServiceTester };
