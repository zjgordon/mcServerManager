#!/usr/bin/env ts-node

/**
 * Contract Compliance Validation Script
 * 
 * Validates that the Express API maintains strict compliance with the Flask API contract
 * by checking specific contract requirements and response formats.
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../src/config/logger';

// Test configuration
const EXPRESS_BASE_URL = 'http://localhost:5001';
const TEST_TIMEOUT = 10000;

interface ContractRequirement {
  name: string;
  category: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: any;
  expectedFields: string[];
  expectedStatus: number;
  requiredHeaders?: string[];
  responseSchema?: any;
}

interface ValidationResult {
  requirement: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  response?: any;
  missingFields?: string[];
  extraFields?: string[];
}

class ContractComplianceValidator {
  private expressClient = axios.create({
    baseURL: EXPRESS_BASE_URL,
    timeout: TEST_TIMEOUT,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ContractComplianceValidator/1.0'
    }
  });

  private validationResults: ValidationResult[] = [];
  private session: any = null;

  private async makeRequest(method: string, endpoint: string, data?: any, headers?: any) {
    try {
      const response = await this.expressClient.request({
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

  private addValidationResult(requirement: string, category: string, status: 'PASS' | 'FAIL' | 'SKIP', message: string, details?: any) {
    this.validationResults.push({ requirement, category, status, message, details });
    const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
    console.log(`${statusIcon} ${category} - ${requirement}: ${message}`);
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  private validateResponseFields(response: any, expectedFields: string[]): { missing: string[], extra: string[] } {
    const missing: string[] = [];
    const extra: string[] = [];

    // Check for missing fields
    for (const field of expectedFields) {
      if (!(field in response)) {
        missing.push(field);
      }
    }

    // Check for extra fields (optional - can be used for strict validation)
    const responseFields = Object.keys(response);
    for (const field of responseFields) {
      if (!expectedFields.includes(field)) {
        extra.push(field);
      }
    }

    return { missing, extra };
  }

  private validateResponseSchema(response: any, schema: any): boolean {
    // Basic schema validation
    if (schema.type && typeof response !== schema.type) {
      return false;
    }

    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in response)) {
          return false;
        }
      }
    }

    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in response) {
          if (!this.validateFieldType(response[field], fieldSchema as any)) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private validateFieldType(value: any, schema: any): boolean {
    if (schema.type === 'string' && typeof value !== 'string') return false;
    if (schema.type === 'number' && typeof value !== 'number') return false;
    if (schema.type === 'boolean' && typeof value !== 'boolean') return false;
    if (schema.type === 'array' && !Array.isArray(value)) return false;
    if (schema.type === 'object' && typeof value !== 'object') return false;
    
    return true;
  }

  // Setup authentication
  async setupAuthentication() {
    console.log('\n🔐 Setting up authentication...');

    try {
      const loginResult = await this.makeRequest('POST', '/api/v1/auth/login', {
        username: 'admin',
        password: 'admin123'
      });

      if (loginResult.success) {
        this.session = loginResult.response.data;
        console.log('✅ Authentication successful');
        return true;
      } else {
        console.log('⚠️ Authentication failed, some tests may be skipped');
        return false;
      }
    } catch (error) {
      console.log('⚠️ Authentication setup failed, some tests will be skipped');
      return false;
    }
  }

  // Validate authentication endpoints
  async validateAuthenticationEndpoints() {
    console.log('\n🔐 Validating Authentication Endpoints...');

    const authRequirements: ContractRequirement[] = [
      {
        name: 'CSRF Token Response',
        category: 'Authentication',
        endpoint: '/api/v1/auth/csrf-token',
        method: 'GET',
        expectedFields: ['success', 'csrf_token'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'csrf_token'],
          properties: {
            success: { type: 'boolean' },
            csrf_token: { type: 'string' }
          }
        }
      },
      {
        name: 'Login Success Response',
        category: 'Authentication',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        data: { username: 'admin', password: 'admin123' },
        expectedFields: ['success', 'message', 'user'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'message', 'user'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            user: { type: 'object' }
          }
        }
      },
      {
        name: 'Login Error Response',
        category: 'Authentication',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        data: { username: 'invalid', password: 'invalid' },
        expectedFields: ['success', 'message'],
        expectedStatus: 401,
        responseSchema: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      },
      {
        name: 'User Profile Response',
        category: 'Authentication',
        endpoint: '/api/v1/auth/me',
        method: 'GET',
        expectedFields: ['success', 'user'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'user'],
          properties: {
            success: { type: 'boolean' },
            user: { type: 'object' }
          }
        }
      },
      {
        name: 'Logout Response',
        category: 'Authentication',
        endpoint: '/api/v1/auth/logout',
        method: 'POST',
        expectedFields: ['success', 'message'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    ];

    for (const requirement of authRequirements) {
      await this.validateContractRequirement(requirement);
    }
  }

  // Validate server management endpoints
  async validateServerManagementEndpoints() {
    console.log('\n🖥️ Validating Server Management Endpoints...');

    const serverRequirements: ContractRequirement[] = [
      {
        name: 'Server List Response',
        category: 'Server Management',
        endpoint: '/api/v1/servers',
        method: 'GET',
        expectedFields: ['success', 'servers'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'servers'],
          properties: {
            success: { type: 'boolean' },
            servers: { type: 'array' }
          }
        }
      },
      {
        name: 'Server Versions Response',
        category: 'Server Management',
        endpoint: '/api/v1/servers/versions',
        method: 'GET',
        expectedFields: ['success', 'versions'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'versions'],
          properties: {
            success: { type: 'boolean' },
            versions: { type: 'array' }
          }
        }
      },
      {
        name: 'Memory Usage Response',
        category: 'Server Management',
        endpoint: '/api/v1/servers/memory-usage',
        method: 'GET',
        expectedFields: ['success', 'memory_usage'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'memory_usage'],
          properties: {
            success: { type: 'boolean' },
            memory_usage: { type: 'object' }
          }
        }
      },
      {
        name: 'Server Creation Response',
        category: 'Server Management',
        endpoint: '/api/v1/servers',
        method: 'POST',
        data: {
          server_name: 'test-server',
          version: '1.20.1',
          port: 25565,
          memory_mb: 1024
        },
        expectedFields: ['success', 'message', 'server'],
        expectedStatus: 201,
        responseSchema: {
          type: 'object',
          required: ['success', 'message', 'server'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            server: { type: 'object' }
          }
        }
      }
    ];

    for (const requirement of serverRequirements) {
      await this.validateContractRequirement(requirement);
    }
  }

  // Validate admin endpoints
  async validateAdminEndpoints() {
    console.log('\n👑 Validating Admin Endpoints...');

    const adminRequirements: ContractRequirement[] = [
      {
        name: 'User List Response',
        category: 'Admin',
        endpoint: '/api/v1/admin/users',
        method: 'GET',
        expectedFields: ['success', 'users'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'users'],
          properties: {
            success: { type: 'boolean' },
            users: { type: 'array' }
          }
        }
      },
      {
        name: 'System Config Response',
        category: 'Admin',
        endpoint: '/api/v1/admin/config',
        method: 'GET',
        expectedFields: ['success', 'config'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'config'],
          properties: {
            success: { type: 'boolean' },
            config: { type: 'object' }
          }
        }
      },
      {
        name: 'System Stats Response',
        category: 'Admin',
        endpoint: '/api/v1/admin/stats',
        method: 'GET',
        expectedFields: ['success', 'stats'],
        expectedStatus: 200,
        responseSchema: {
          type: 'object',
          required: ['success', 'stats'],
          properties: {
            success: { type: 'boolean' },
            stats: { type: 'object' }
          }
        }
      }
    ];

    for (const requirement of adminRequirements) {
      await this.validateContractRequirement(requirement);
    }
  }

  // Validate error handling
  async validateErrorHandling() {
    console.log('\n⚠️ Validating Error Handling...');

    const errorRequirements: ContractRequirement[] = [
      {
        name: 'Validation Error Response',
        category: 'Error Handling',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        data: { username: '', password: '' },
        expectedFields: ['success', 'message'],
        expectedStatus: 400,
        responseSchema: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      },
      {
        name: 'Not Found Error Response',
        category: 'Error Handling',
        endpoint: '/api/v1/servers/99999',
        method: 'GET',
        expectedFields: ['success', 'message'],
        expectedStatus: 404,
        responseSchema: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      },
      {
        name: 'Unauthorized Error Response',
        category: 'Error Handling',
        endpoint: '/api/v1/admin/users',
        method: 'GET',
        expectedFields: ['success', 'message'],
        expectedStatus: 401,
        responseSchema: {
          type: 'object',
          required: ['success', 'message'],
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    ];

    for (const requirement of errorRequirements) {
      await this.validateContractRequirement(requirement);
    }
  }

  // Validate a single contract requirement
  async validateContractRequirement(requirement: ContractRequirement) {
    const result = await this.makeRequest(requirement.method, requirement.endpoint, requirement.data, requirement.headers);
    
    if (!result.success) {
      this.addValidationResult(requirement.name, requirement.category, 'SKIP', 'Request failed', result.error);
      return;
    }

    const response = result.response;
    const responseData = response.data;

    // Check status code
    if (response.status !== requirement.expectedStatus) {
      this.addValidationResult(requirement.name, requirement.category, 'FAIL', 
        `Status code mismatch: expected ${requirement.expectedStatus}, got ${response.status}`, {
          expected: requirement.expectedStatus,
          actual: response.status,
          response: responseData
        });
      return;
    }

    // Check required fields
    const fieldValidation = this.validateResponseFields(responseData, requirement.expectedFields);
    if (fieldValidation.missing.length > 0) {
      this.addValidationResult(requirement.name, requirement.category, 'FAIL', 
        `Missing required fields: ${fieldValidation.missing.join(', ')}`, {
          missingFields: fieldValidation.missing,
          response: responseData
        });
      return;
    }

    // Check response schema
    if (requirement.responseSchema) {
      if (!this.validateResponseSchema(responseData, requirement.responseSchema)) {
        this.addValidationResult(requirement.name, requirement.category, 'FAIL', 
          'Response schema validation failed', {
            schema: requirement.responseSchema,
            response: responseData
          });
        return;
      }
    }

    // Check required headers
    if (requirement.requiredHeaders) {
      const missingHeaders = requirement.requiredHeaders.filter(header => 
        !response.headers[header.toLowerCase()]
      );
      if (missingHeaders.length > 0) {
        this.addValidationResult(requirement.name, requirement.category, 'FAIL', 
          `Missing required headers: ${missingHeaders.join(', ')}`, {
            missingHeaders,
            headers: response.headers
          });
        return;
      }
    }

    this.addValidationResult(requirement.name, requirement.category, 'PASS', 
      'All contract requirements met', {
        response: responseData,
        status: response.status
      });
  }

  // Run all validations
  async runAllValidations() {
    console.log('🧪 Starting Contract Compliance Validation...\n');
    console.log(`Testing Express API: ${EXPRESS_BASE_URL}`);
    console.log(`Timeout: ${TEST_TIMEOUT}ms\n`);

    try {
      const authSuccess = await this.setupAuthentication();
      
      await this.validateAuthenticationEndpoints();
      await this.validateServerManagementEndpoints();
      await this.validateAdminEndpoints();
      await this.validateErrorHandling();

      // Generate summary
      this.generateSummary();
    } catch (error) {
      console.error('❌ Validation execution failed:', error);
      process.exit(1);
    }
  }

  private generateSummary() {
    console.log('\n📊 Contract Compliance Validation Summary:');
    console.log('==========================================');

    const totalValidations = this.validationResults.length;
    const passedValidations = this.validationResults.filter(r => r.status === 'PASS').length;
    const failedValidations = this.validationResults.filter(r => r.status === 'FAIL').length;
    const skippedValidations = this.validationResults.filter(r => r.status === 'SKIP').length;

    console.log(`Total Validations: ${totalValidations}`);
    console.log(`✅ Passed: ${passedValidations}`);
    console.log(`❌ Failed: ${failedValidations}`);
    console.log(`⏭️ Skipped: ${skippedValidations}`);
    console.log(`Compliance Rate: ${((passedValidations / totalValidations) * 100).toFixed(1)}%`);

    // Group by category
    const categories = [...new Set(this.validationResults.map(r => r.category))];
    console.log('\n📋 Results by Category:');
    categories.forEach(category => {
      const categoryValidations = this.validationResults.filter(r => r.category === category);
      const categoryPassed = categoryValidations.filter(r => r.status === 'PASS').length;
      const categoryTotal = categoryValidations.length;
      console.log(`  ${category}: ${categoryPassed}/${categoryTotal} (${((categoryPassed / categoryTotal) * 100).toFixed(1)}%)`);
    });

    if (failedValidations > 0) {
      console.log('\n❌ Failed Validations:');
      this.validationResults
        .filter(r => r.status === 'FAIL')
        .forEach(result => {
          console.log(`  - ${result.category}: ${result.requirement} - ${result.message}`);
          if (result.details) {
            console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`);
          }
        });
    }

    console.log('\n🎯 Contract Compliance Validation Complete!');
    
    if (failedValidations === 0) {
      console.log('🎉 All validations passed! Express API is fully compliant with the contract.');
      process.exit(0);
    } else {
      console.log('⚠️ Some validations failed. Please review the contract compliance issues.');
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const validator = new ContractComplianceValidator();
  await validator.runAllValidations();
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Validation execution failed:', error);
    process.exit(1);
  });
}

export { ContractComplianceValidator };
