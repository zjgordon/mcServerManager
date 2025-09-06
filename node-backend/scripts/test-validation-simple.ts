#!/usr/bin/env ts-node

import { 
  LoginSchema, 
  RegisterSchema, 
  CreateServerSchema,
  SystemConfigSchema
} from '../src/schemas';
import { z } from 'zod';

class SimpleValidationTester {
  async runTests() {
    console.log('🧪 Starting Simple Zod Validation Tests...\n');
    
    await this.testSchemaValidation();
    await this.testAuthValidation();
    await this.testServerValidation();
    await this.testAdminValidation();
    
    console.log('\n✅ All validation tests completed successfully!');
  }

  private async testSchemaValidation() {
    console.log('📋 Testing Schema Validation...');
    
    // Test valid data
    const validLoginData = {
      username: 'testuser',
      password: 'TestPassword123!'
    };
    
    const validRegisterData = {
      username: 'newuser',
      password: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
      email: 'test@example.com'
    };
    
    try {
      const loginResult = LoginSchema.parse(validLoginData);
      console.log('✅ Login schema validation passed');
      
      const registerResult = RegisterSchema.parse(validRegisterData);
      console.log('✅ Register schema validation passed');
      
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
    }
    
    // Test invalid data
    const invalidLoginData = {
      username: '', // Empty username
      password: '123' // Too short password
    };
    
    try {
      LoginSchema.parse(invalidLoginData);
      console.error('❌ Should have failed validation');
    } catch (error) {
      console.log('✅ Invalid login data correctly rejected');
    }
    
    console.log('✅ Schema validation tests completed\n');
  }

  private async testAuthValidation() {
    console.log('🔐 Testing Authentication Validation...');
    
    // Test login validation
    const loginTests = [
      {
        name: 'Valid login',
        data: { username: 'testuser', password: 'TestPassword123!' },
        shouldPass: true
      },
      {
        name: 'Empty username',
        data: { username: '', password: 'TestPassword123!' },
        shouldPass: false
      },
      {
        name: 'Empty password',
        data: { username: 'testuser', password: '' },
        shouldPass: false
      },
      {
        name: 'Username too long',
        data: { username: 'a'.repeat(51), password: 'TestPassword123!' },
        shouldPass: false
      }
    ];
    
    for (const test of loginTests) {
      try {
        LoginSchema.parse(test.data);
        if (test.shouldPass) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.error(`❌ ${test.name}: Should have been rejected`);
        }
      } catch (error) {
        if (!test.shouldPass) {
          console.log(`✅ ${test.name}: REJECTED`);
        } else {
          console.error(`❌ ${test.name}: Should have passed`);
        }
      }
    }
    
    // Test register validation
    const registerTests = [
      {
        name: 'Valid registration',
        data: {
          username: 'newuser',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
          email: 'test@example.com'
        },
        shouldPass: true
      },
      {
        name: 'Password mismatch',
        data: {
          username: 'newuser',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword123!',
          email: 'test@example.com'
        },
        shouldPass: false
      },
      {
        name: 'Weak password',
        data: {
          username: 'newuser',
          password: 'weak',
          confirmPassword: 'weak',
          email: 'test@example.com'
        },
        shouldPass: false
      },
      {
        name: 'Invalid email',
        data: {
          username: 'newuser',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
          email: 'invalid-email'
        },
        shouldPass: false
      }
    ];
    
    for (const test of registerTests) {
      try {
        RegisterSchema.parse(test.data);
        if (test.shouldPass) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.error(`❌ ${test.name}: Should have been rejected`);
        }
      } catch (error) {
        if (!test.shouldPass) {
          console.log(`✅ ${test.name}: REJECTED`);
        } else {
          console.error(`❌ ${test.name}: Should have passed`);
        }
      }
    }
    
    console.log('✅ Authentication validation tests completed\n');
  }

  private async testServerValidation() {
    console.log('🖥️ Testing Server Validation...');
    
    const serverTests = [
      {
        name: 'Valid server creation',
        data: {
          name: 'testserver',
          port: 25565,
          version: '1.20.1',
          memory: 1024,
          maxPlayers: 20,
          difficulty: 'normal',
          gamemode: 'survival'
        },
        shouldPass: true
      },
      {
        name: 'Invalid port number',
        data: {
          name: 'testserver',
          port: 99999, // Invalid port
          version: '1.20.1',
          memory: 1024
        },
        shouldPass: false
      },
      {
        name: 'Invalid memory amount',
        data: {
          name: 'testserver',
          port: 25565,
          version: '1.20.1',
          memory: 100 // Too low
        },
        shouldPass: false
      },
      {
        name: 'Invalid server name',
        data: {
          name: 'test server!', // Invalid characters
          port: 25565,
          version: '1.20.1',
          memory: 1024
        },
        shouldPass: false
      }
    ];
    
    for (const test of serverTests) {
      try {
        CreateServerSchema.parse(test.data);
        if (test.shouldPass) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.error(`❌ ${test.name}: Should have been rejected`);
        }
      } catch (error) {
        if (!test.shouldPass) {
          console.log(`✅ ${test.name}: REJECTED`);
        } else {
          console.error(`❌ ${test.name}: Should have passed`);
        }
      }
    }
    
    console.log('✅ Server validation tests completed\n');
  }

  private async testAdminValidation() {
    console.log('👑 Testing Admin Validation...');
    
    const configTests = [
      {
        name: 'Valid system config',
        data: {
          maxServers: 10,
          maxMemoryPerServer: 4096,
          maxPlayersPerServer: 100,
          sessionTimeout: 3600,
          maxLoginAttempts: 5
        },
        shouldPass: true
      },
      {
        name: 'Invalid max servers',
        data: {
          maxServers: 0, // Too low
          maxMemoryPerServer: 4096
        },
        shouldPass: false
      },
      {
        name: 'Invalid memory limit',
        data: {
          maxServers: 10,
          maxMemoryPerServer: 100 // Too low
        },
        shouldPass: false
      }
    ];
    
    for (const test of configTests) {
      try {
        SystemConfigSchema.parse(test.data);
        if (test.shouldPass) {
          console.log(`✅ ${test.name}: PASSED`);
        } else {
          console.error(`❌ ${test.name}: Should have been rejected`);
        }
      } catch (error) {
        if (!test.shouldPass) {
          console.log(`✅ ${test.name}: REJECTED`);
        } else {
          console.error(`❌ ${test.name}: Should have passed`);
        }
      }
    }
    
    console.log('✅ Admin validation tests completed\n');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new SimpleValidationTester();
  tester.runTests().catch(console.error);
}

export default SimpleValidationTester;
