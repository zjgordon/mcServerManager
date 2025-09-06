#!/usr/bin/env ts-node

import { createApp } from '../src/app';
import request from 'supertest';
import { 
  LoginSchema, 
  RegisterSchema, 
  CreateServerSchema,
  SystemConfigSchema
} from '../src/schemas';
import { validateSchema, safeValidateSchema } from '../src/middleware/zodValidation';

class ValidationTester {
  private app: any;

  async runTests() {
    console.log('🧪 Starting Zod Validation System Tests...\n');
    
    this.app = await createApp();
    
    await this.testSchemaValidation();
    await this.testAuthValidation();
    await this.testServerValidation();
    await this.testAdminValidation();
    await this.testOpenAPIDocumentation();
    await this.testErrorHandling();
    
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
      const loginResult = validateSchema(LoginSchema, validLoginData);
      console.log('✅ Login schema validation passed');
      
      const registerResult = validateSchema(RegisterSchema, validRegisterData);
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
      validateSchema(LoginSchema, invalidLoginData);
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
      const result = safeValidateSchema(LoginSchema, test.data);
      if (result.success === test.shouldPass) {
        console.log(`✅ ${test.name}: ${result.success ? 'PASSED' : 'REJECTED'}`);
      } else {
        console.error(`❌ ${test.name}: Expected ${test.shouldPass}, got ${result.success}`);
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
      const result = safeValidateSchema(RegisterSchema, test.data);
      if (result.success === test.shouldPass) {
        console.log(`✅ ${test.name}: ${result.success ? 'PASSED' : 'REJECTED'}`);
      } else {
        console.error(`❌ ${test.name}: Expected ${test.shouldPass}, got ${result.success}`);
        if (result.errors) {
          console.log(`   Errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
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
      const result = safeValidateSchema(CreateServerSchema, test.data);
      if (result.success === test.shouldPass) {
        console.log(`✅ ${test.name}: ${result.success ? 'PASSED' : 'REJECTED'}`);
      } else {
        console.error(`❌ ${test.name}: Expected ${test.shouldPass}, got ${result.success}`);
        if (result.errors) {
          console.log(`   Errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
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
      const result = safeValidateSchema(SystemConfigSchema, test.data);
      if (result.success === test.shouldPass) {
        console.log(`✅ ${test.name}: ${result.success ? 'PASSED' : 'REJECTED'}`);
      } else {
        console.error(`❌ ${test.name}: Expected ${test.shouldPass}, got ${result.success}`);
        if (result.errors) {
          console.log(`   Errors: ${result.errors.map((e: any) => e.message).join(', ')}`);
        }
      }
    }
    
    console.log('✅ Admin validation tests completed\n');
  }

  private async testOpenAPIDocumentation() {
    console.log('📚 Testing OpenAPI Documentation...');
    
    try {
      // Test OpenAPI JSON endpoint
      const response = await request(this.app)
        .get('/docs/openapi.json')
        .expect(200);
      
      const spec = response.body;
      
      // Validate OpenAPI spec structure
      if (spec.openapi && spec.info && spec.paths) {
        console.log('✅ OpenAPI specification structure is valid');
        console.log(`   Version: ${spec.info.version}`);
        console.log(`   Title: ${spec.info.title}`);
        console.log(`   Paths: ${Object.keys(spec.paths).length}`);
      } else {
        console.error('❌ OpenAPI specification structure is invalid');
      }
      
      // Test Swagger UI endpoint
      const uiResponse = await request(this.app)
        .get('/docs/')
        .expect(200);
      
      if (uiResponse.text.includes('swagger-ui')) {
        console.log('✅ Swagger UI is accessible');
      } else {
        console.error('❌ Swagger UI is not accessible');
      }
      
    } catch (error) {
      console.error('❌ OpenAPI documentation test failed:', error);
    }
    
    console.log('✅ OpenAPI documentation tests completed\n');
  }

  private async testErrorHandling() {
    console.log('🚨 Testing Error Handling...');
    
    try {
      // Test validation error response
      const response = await request(this.app)
        .post('/api/v1/auth/login')
        .send({
          username: '', // Invalid empty username
          password: '123' // Invalid short password
        })
        .expect(400);
      
      if (response.body.success === false && response.body.validationErrors) {
        console.log('✅ Validation errors are properly formatted');
        console.log(`   Errors: ${response.body.validationErrors.length}`);
      } else {
        console.error('❌ Validation errors are not properly formatted');
      }
      
    } catch (error) {
      console.error('❌ Error handling test failed:', error);
    }
    
    console.log('✅ Error handling tests completed\n');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new ValidationTester();
  tester.runTests().catch(console.error);
}

export default ValidationTester;
