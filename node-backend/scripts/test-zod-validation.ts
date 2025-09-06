#!/usr/bin/env ts-node

/**
 * Zod Validation Testing Script
 * 
 * Tests the Zod validation implementation for all contract routes
 * to ensure proper request validation and error handling.
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

const invalidAuthData = {
  username: '', // Invalid: empty username
  password: '123' // Invalid: too short password
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

const invalidServerData = {
  server_name: '', // Invalid: empty name
  version: '', // Invalid: empty version
  port: 99999, // Invalid: port too high
  memory_mb: 100, // Invalid: memory too low
  motd: 'A'.repeat(101), // Invalid: MOTD too long
  max_players: 0, // Invalid: max players too low
  difficulty: 'invalid', // Invalid: invalid difficulty
  gamemode: 'invalid', // Invalid: invalid gamemode
  pvp: 'not-boolean', // Invalid: not boolean
  spawn_monsters: 'not-boolean', // Invalid: not boolean
  hardcore: 'not-boolean' // Invalid: not boolean
};

const validAdminUserData = {
  username: 'adminuser',
  password: 'AdminPassword123!',
  is_admin: true
};

const invalidAdminUserData = {
  username: 'ab', // Invalid: too short
  password: '123', // Invalid: too short
  is_admin: 'not-boolean' // Invalid: not boolean
};

class ZodValidationTester {
  private axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: TEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ZodValidationTester/1.0'
    }
  });

  private testResults: Array<{
    endpoint: string;
    test: string;
    status: 'PASS' | 'FAIL';
    message: string;
    details?: any;
  }> = [];

  private async makeRequest(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) {
    try {
      const response = await this.axiosInstance.request({
        method,
        url: endpoint,
        data
      });
      return { success: true, response };
    } catch (error) {
      if (error instanceof AxiosError) {
        return { 
          success: false, 
          error: {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          }
        };
      }
      throw error;
    }
  }

  private addTestResult(endpoint: string, test: string, status: 'PASS' | 'FAIL', message: string, details?: any) {
    this.testResults.push({ endpoint, test, status, message, details });
    const statusIcon = status === 'PASS' ? '✅' : '❌';
    console.log(`${statusIcon} ${endpoint} - ${test}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  // Authentication validation tests
  async testAuthValidation() {
    console.log('\n🔐 Testing Authentication Validation...');

    // Test valid login data
    const validLoginResult = await this.makeRequest('POST', '/api/v1/auth/login', validAuthData);
    if (validLoginResult.success) {
      this.addTestResult('/api/v1/auth/login', 'Valid Data', 'PASS', 'Valid login data accepted');
    } else {
      this.addTestResult('/api/v1/auth/login', 'Valid Data', 'FAIL', 'Valid login data rejected', validLoginResult.error);
    }

    // Test invalid login data
    const invalidLoginResult = await this.makeRequest('POST', '/api/v1/auth/login', invalidAuthData);
    if (!invalidLoginResult.success && invalidLoginResult.error?.status === 400) {
      this.addTestResult('/api/v1/auth/login', 'Invalid Data', 'PASS', 'Invalid login data properly rejected');
    } else {
      this.addTestResult('/api/v1/auth/login', 'Invalid Data', 'FAIL', 'Invalid login data not properly rejected', invalidLoginResult.error);
    }

    // Test valid change password data
    const validChangePasswordData = {
      current_password: 'CurrentPassword123!',
      new_password: 'NewPassword123!',
      confirm_password: 'NewPassword123!'
    };

    const validChangePasswordResult = await this.makeRequest('POST', '/api/v1/auth/change-password', validChangePasswordData);
    if (validChangePasswordResult.success || validChangePasswordResult.error?.status === 401) {
      this.addTestResult('/api/v1/auth/change-password', 'Valid Data', 'PASS', 'Valid change password data accepted or properly authenticated');
    } else {
      this.addTestResult('/api/v1/auth/change-password', 'Valid Data', 'FAIL', 'Valid change password data rejected', validChangePasswordResult.error);
    }

    // Test invalid change password data
    const invalidChangePasswordData = {
      current_password: '', // Invalid: empty
      new_password: '123', // Invalid: too short
      confirm_password: 'different' // Invalid: doesn't match
    };

    const invalidChangePasswordResult = await this.makeRequest('POST', '/api/v1/auth/change-password', invalidChangePasswordData);
    if (!invalidChangePasswordResult.success && invalidChangePasswordResult.error?.status === 400) {
      this.addTestResult('/api/v1/auth/change-password', 'Invalid Data', 'PASS', 'Invalid change password data properly rejected');
    } else {
      this.addTestResult('/api/v1/auth/change-password', 'Invalid Data', 'FAIL', 'Invalid change password data not properly rejected', invalidChangePasswordResult.error);
    }
  }

  // Server management validation tests
  async testServerValidation() {
    console.log('\n🖥️ Testing Server Management Validation...');

    // Test valid server creation data
    const validServerResult = await this.makeRequest('POST', '/api/v1/servers', validServerData);
    if (validServerResult.success || validServerResult.error?.status === 401) {
      this.addTestResult('/api/v1/servers', 'Valid Data', 'PASS', 'Valid server data accepted or properly authenticated');
    } else {
      this.addTestResult('/api/v1/servers', 'Valid Data', 'FAIL', 'Valid server data rejected', validServerResult.error);
    }

    // Test invalid server creation data
    const invalidServerResult = await this.makeRequest('POST', '/api/v1/servers', invalidServerData);
    if (!invalidServerResult.success && invalidServerResult.error?.status === 400) {
      this.addTestResult('/api/v1/servers', 'Invalid Data', 'PASS', 'Invalid server data properly rejected');
    } else {
      this.addTestResult('/api/v1/servers', 'Invalid Data', 'FAIL', 'Invalid server data not properly rejected', invalidServerResult.error);
    }

    // Test valid backup data
    const validBackupData = {
      name: 'test-backup',
      description: 'Test backup description'
    };

    const validBackupResult = await this.makeRequest('POST', '/api/v1/servers/1/backup', validBackupData);
    if (validBackupResult.success || validBackupResult.error?.status === 401 || validBackupResult.error?.status === 404) {
      this.addTestResult('/api/v1/servers/:id/backup', 'Valid Data', 'PASS', 'Valid backup data accepted or properly authenticated/authorized');
    } else {
      this.addTestResult('/api/v1/servers/:id/backup', 'Valid Data', 'FAIL', 'Valid backup data rejected', validBackupResult.error);
    }

    // Test invalid backup data
    const invalidBackupData = {
      name: 'A'.repeat(101), // Invalid: name too long
      description: 'A'.repeat(501) // Invalid: description too long
    };

    const invalidBackupResult = await this.makeRequest('POST', '/api/v1/servers/1/backup', invalidBackupData);
    if (!invalidBackupResult.success && invalidBackupResult.error?.status === 400) {
      this.addTestResult('/api/v1/servers/:id/backup', 'Invalid Data', 'PASS', 'Invalid backup data properly rejected');
    } else {
      this.addTestResult('/api/v1/servers/:id/backup', 'Invalid Data', 'FAIL', 'Invalid backup data not properly rejected', invalidBackupResult.error);
    }
  }

  // Admin validation tests
  async testAdminValidation() {
    console.log('\n👑 Testing Admin Validation...');

    // Test valid admin user creation data
    const validAdminUserResult = await this.makeRequest('POST', '/api/v1/admin/users', validAdminUserData);
    if (validAdminUserResult.success || validAdminUserResult.error?.status === 401 || validAdminUserResult.error?.status === 403) {
      this.addTestResult('/api/v1/admin/users', 'Valid Data', 'PASS', 'Valid admin user data accepted or properly authenticated/authorized');
    } else {
      this.addTestResult('/api/v1/admin/users', 'Valid Data', 'FAIL', 'Valid admin user data rejected', validAdminUserResult.error);
    }

    // Test invalid admin user creation data
    const invalidAdminUserResult = await this.makeRequest('POST', '/api/v1/admin/users', invalidAdminUserData);
    if (!invalidAdminUserResult.success && invalidAdminUserResult.error?.status === 400) {
      this.addTestResult('/api/v1/admin/users', 'Invalid Data', 'PASS', 'Invalid admin user data properly rejected');
    } else {
      this.addTestResult('/api/v1/admin/users', 'Invalid Data', 'FAIL', 'Invalid admin user data not properly rejected', invalidAdminUserResult.error);
    }

    // Test valid system config data
    const validConfigData = {
      max_total_memory_mb: 8192,
      default_server_memory_mb: 1024,
      min_server_memory_mb: 512,
      max_server_memory_mb: 4096
    };

    const validConfigResult = await this.makeRequest('PUT', '/api/v1/admin/config', validConfigData);
    if (validConfigResult.success || validConfigResult.error?.status === 401 || validConfigResult.error?.status === 403) {
      this.addTestResult('/api/v1/admin/config', 'Valid Data', 'PASS', 'Valid config data accepted or properly authenticated/authorized');
    } else {
      this.addTestResult('/api/v1/admin/config', 'Valid Data', 'FAIL', 'Valid config data rejected', validConfigResult.error);
    }

    // Test invalid system config data
    const invalidConfigData = {
      max_total_memory_mb: 100, // Invalid: too low
      default_server_memory_mb: 100, // Invalid: too low
      min_server_memory_mb: 100, // Invalid: too low
      max_server_memory_mb: 100 // Invalid: too low
    };

    const invalidConfigResult = await this.makeRequest('PUT', '/api/v1/admin/config', invalidConfigData);
    if (!invalidConfigResult.success && invalidConfigResult.error?.status === 400) {
      this.addTestResult('/api/v1/admin/config', 'Invalid Data', 'PASS', 'Invalid config data properly rejected');
    } else {
      this.addTestResult('/api/v1/admin/config', 'Invalid Data', 'FAIL', 'Invalid config data not properly rejected', invalidConfigResult.error);
    }
  }

  // Parameter validation tests
  async testParameterValidation() {
    console.log('\n🔢 Testing Parameter Validation...');

    // Test invalid server ID parameter
    const invalidServerIdResult = await this.makeRequest('GET', '/api/v1/servers/invalid-id');
    if (!invalidServerIdResult.success && invalidServerIdResult.error?.status === 400) {
      this.addTestResult('/api/v1/servers/:id', 'Invalid Parameter', 'PASS', 'Invalid server ID parameter properly rejected');
    } else {
      this.addTestResult('/api/v1/servers/:id', 'Invalid Parameter', 'FAIL', 'Invalid server ID parameter not properly rejected', invalidServerIdResult.error);
    }

    // Test invalid user ID parameter
    const invalidUserIdResult = await this.makeRequest('GET', '/api/v1/admin/users/invalid-id');
    if (!invalidUserIdResult.success && invalidUserIdResult.error?.status === 400) {
      this.addTestResult('/api/v1/admin/users/:user_id', 'Invalid Parameter', 'PASS', 'Invalid user ID parameter properly rejected');
    } else {
      this.addTestResult('/api/v1/admin/users/:user_id', 'Invalid Parameter', 'FAIL', 'Invalid user ID parameter not properly rejected', invalidUserIdResult.error);
    }
  }

  // Query parameter validation tests
  async testQueryValidation() {
    console.log('\n❓ Testing Query Parameter Validation...');

    // Test invalid pagination parameters
    const invalidPaginationResult = await this.makeRequest('GET', '/api/v1/servers?page=invalid&limit=invalid');
    if (!invalidPaginationResult.success && invalidPaginationResult.error?.status === 400) {
      this.addTestResult('/api/v1/servers', 'Invalid Query', 'PASS', 'Invalid pagination parameters properly rejected');
    } else {
      this.addTestResult('/api/v1/servers', 'Invalid Query', 'FAIL', 'Invalid pagination parameters not properly rejected', invalidPaginationResult.error);
    }

    // Test valid pagination parameters
    const validPaginationResult = await this.makeRequest('GET', '/api/v1/servers?page=1&limit=10');
    if (validPaginationResult.success || validPaginationResult.error?.status === 401) {
      this.addTestResult('/api/v1/servers', 'Valid Query', 'PASS', 'Valid pagination parameters accepted or properly authenticated');
    } else {
      this.addTestResult('/api/v1/servers', 'Valid Query', 'FAIL', 'Valid pagination parameters rejected', validPaginationResult.error);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Zod Validation Tests...\n');
    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms\n`);

    try {
      await this.testAuthValidation();
      await this.testServerValidation();
      await this.testAdminValidation();
      await this.testParameterValidation();
      await this.testQueryValidation();

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

    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.endpoint}: ${result.test} - ${result.message}`);
        });
    }

    console.log('\n🎯 Zod Validation Test Complete!');
    
    if (failedTests === 0) {
      console.log('🎉 All validation tests passed! Zod validation is working correctly.');
      process.exit(0);
    } else {
      console.log('⚠️ Some validation tests failed. Please review the implementation.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const tester = new ZodValidationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}

export { ZodValidationTester };
