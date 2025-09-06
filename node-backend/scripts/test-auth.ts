#!/usr/bin/env ts-node

/**
 * Authentication System Testing Script
 *
 * This script tests the complete authentication system including
 * login, registration, session management, CSRF protection, and password security.
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { logger } from '../src/config/logger';
import { PasswordSecurity } from '../src/utils/password';
import { sessionManager } from '../src/services/sessionService';

class AuthTester {
  private app: any;
  private testUser = {
    username: 'testuser',
    password: 'MySecureP@ssw0rd2024!',
    email: 'test@example.com',
  };

  constructor() {
    // App will be initialized in runTests
  }

  async runTests(): Promise<void> {
    try {
      logger.info('🧪 Starting authentication system tests...');

      // Initialize the app
      this.app = await createApp();

      // Test 1: Password security utilities
      await this.testPasswordSecurity();

      // Test 2: User registration
      await this.testUserRegistration();

      // Test 3: User login
      const sessionData = await this.testUserLogin();

      // Test 4: Session management
      await this.testSessionManagement(sessionData);

      // Test 5: CSRF protection
      await this.testCSRFProtection(sessionData);

      // Test 6: Authentication middleware
      await this.testAuthenticationMiddleware(sessionData);

      // Test 7: Admin functionality
      await this.testAdminFunctionality(sessionData);

      // Test 8: Password change
      await this.testPasswordChange(sessionData);

      // Test 9: Logout
      await this.testLogout(sessionData);

      logger.info('✅ All authentication system tests completed successfully!');
    } catch (error) {
      logger.error('❌ Authentication system tests failed:', error);
      throw error;
    }
  }

  private async testPasswordSecurity(): Promise<void> {
    logger.info('🔐 Testing password security utilities...');

    // Test password hashing
    const password = 'MySecureP@ssw0rd2024!';
    const hashedPassword = await PasswordSecurity.hashPassword(password);
    
    if (!hashedPassword || hashedPassword === password) {
      throw new Error('Password hashing failed');
    }

    // Test password verification
    const isValid = await PasswordSecurity.verifyPassword(password, hashedPassword);
    if (!isValid) {
      throw new Error('Password verification failed');
    }

    // Test password validation
    const validation = PasswordSecurity.validatePassword(password);
    if (!validation.isValid) {
      throw new Error(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    // Test weak password validation
    const weakValidation = PasswordSecurity.validatePassword('weak');
    if (weakValidation.isValid) {
      throw new Error('Weak password validation failed');
    }

    // Test secure password generation
    const securePassword = PasswordSecurity.generateSecurePassword(16);
    const secureValidation = PasswordSecurity.validatePassword(securePassword);
    if (!secureValidation.isValid) {
      throw new Error('Generated secure password validation failed');
    }

    logger.info('✅ Password security utilities working correctly');
  }

  private async testUserRegistration(): Promise<void> {
    logger.info('📝 Testing user registration...');

    const response = await request(this.app)
      .post('/api/v1/auth/register')
      .send(this.testUser)
      .expect(201);

    if (!response.body.success) {
      throw new Error(`Registration failed: ${response.body.message}`);
    }

    if (!response.body.user || response.body.user.username !== this.testUser.username) {
      throw new Error('Registration response missing user data');
    }

    logger.info('✅ User registration working correctly');
  }

  private async testUserLogin(): Promise<any> {
    logger.info('🔑 Testing user login...');

    const response = await request(this.app)
      .post('/api/v1/auth/login')
      .send({
        username: this.testUser.username,
        password: this.testUser.password,
      })
      .expect(200);

    if (!response.body.success) {
      throw new Error(`Login failed: ${response.body.message}`);
    }

    if (!response.body.user || response.body.user.username !== this.testUser.username) {
      throw new Error('Login response missing user data');
    }

    // Check for session cookie
    const cookies = response.headers['set-cookie'] as any;
    if (!cookies || !Array.isArray(cookies) || !cookies.some((cookie: string) => cookie.startsWith('mcserver_session='))) {
      throw new Error('Session cookie not set');
    }

    // Check for CSRF token cookie
    if (!cookies || !Array.isArray(cookies) || !cookies.some((cookie: string) => cookie.startsWith('csrf_token='))) {
      throw new Error('CSRF token cookie not set');
    }

    logger.info('✅ User login working correctly');

    return {
      cookies: cookies,
      user: response.body.user,
    };
  }

  private async testSessionManagement(sessionData: any): Promise<void> {
    logger.info('📋 Testing session management...');

    // Test session validation
    const response = await request(this.app)
      .get('/api/v1/auth/validate')
      .set('Cookie', sessionData.cookies)
      .expect(200);

    if (!response.body.success) {
      throw new Error('Session validation failed');
    }

    if (!response.body.user || response.body.user.username !== this.testUser.username) {
      throw new Error('Session validation missing user data');
    }

    // Test get current user
    const meResponse = await request(this.app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionData.cookies)
      .expect(200);

    if (!meResponse.body.success) {
      throw new Error('Get current user failed');
    }

    if (!meResponse.body.user || meResponse.body.user.username !== this.testUser.username) {
      throw new Error('Get current user missing user data');
    }

    logger.info('✅ Session management working correctly');
  }

  private async testCSRFProtection(sessionData: any): Promise<void> {
    logger.info('🛡️ Testing CSRF protection...');

    // Test CSRF token refresh
    const csrfResponse = await request(this.app)
      .get('/api/v1/auth/csrf-token')
      .set('Cookie', sessionData.cookies)
      .expect(200);

    if (!csrfResponse.body.success || !csrfResponse.body.csrfToken) {
      throw new Error('CSRF token refresh failed');
    }

    const csrfToken = csrfResponse.body.csrfToken;

    // Test protected endpoint without CSRF token (should fail)
    await request(this.app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', sessionData.cookies)
      .send({
        currentPassword: this.testUser.password,
        newPassword: 'AnotherSecureP@ssw0rd2024!',
      })
      .expect(403);

    // Test protected endpoint with CSRF token (should succeed)
    await request(this.app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', sessionData.cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({
        currentPassword: this.testUser.password,
        newPassword: 'AnotherSecureP@ssw0rd2024!',
      })
      .expect(200);

    logger.info('✅ CSRF protection working correctly');
  }

  private async testAuthenticationMiddleware(sessionData: any): Promise<void> {
    logger.info('🔒 Testing authentication middleware...');

    // Test protected endpoint without authentication (should fail)
    await request(this.app)
      .get('/api/v1/auth/me')
      .expect(401);

    // Test protected endpoint with authentication (should succeed)
    await request(this.app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionData.cookies)
      .expect(200);

    // Test admin endpoint without admin privileges (should fail)
    await request(this.app)
      .get('/api/v1/auth/admin/users')
      .set('Cookie', sessionData.cookies)
      .expect(403);

    logger.info('✅ Authentication middleware working correctly');
  }

  private async testAdminFunctionality(sessionData: any): Promise<void> {
    logger.info('👑 Testing admin functionality...');

    // Note: This test assumes the test user is not an admin
    // In a real scenario, you'd create an admin user or promote the test user

    // Test admin endpoint access (should fail for non-admin)
    await request(this.app)
      .get('/api/v1/auth/admin/users')
      .set('Cookie', sessionData.cookies)
      .expect(403);

    logger.info('✅ Admin functionality working correctly (access properly denied)');
  }

  private async testPasswordChange(sessionData: any): Promise<void> {
    logger.info('🔑 Testing password change...');

    // Get CSRF token
    const csrfResponse = await request(this.app)
      .get('/api/v1/auth/csrf-token')
      .set('Cookie', sessionData.cookies)
      .expect(200);

    const csrfToken = csrfResponse.body.csrfToken;

    // Test password change
    const response = await request(this.app)
      .post('/api/v1/auth/change-password')
      .set('Cookie', sessionData.cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({
        currentPassword: 'AnotherSecureP@ssw0rd2024!',
        newPassword: 'FinalSecureP@ssw0rd2024!',
      })
      .expect(200);

    if (!response.body.success) {
      throw new Error('Password change failed');
    }

    // Test login with new password
    await request(this.app)
      .post('/api/v1/auth/login')
      .send({
        username: this.testUser.username,
        password: 'FinalSecureP@ssw0rd2024!',
      })
      .expect(200);

    logger.info('✅ Password change working correctly');
  }

  private async testLogout(sessionData: any): Promise<void> {
    logger.info('👋 Testing logout...');

    const response = await request(this.app)
      .post('/api/v1/auth/logout')
      .set('Cookie', sessionData.cookies)
      .expect(200);

    if (!response.body.success) {
      throw new Error('Logout failed');
    }

    // Test that session is invalidated
    await request(this.app)
      .get('/api/v1/auth/me')
      .set('Cookie', sessionData.cookies)
      .expect(401);

    logger.info('✅ Logout working correctly');
  }
}

// Main execution
async function main() {
  const tester = new AuthTester();

  try {
    await tester.runTests();
    process.exit(0);
  } catch (error) {
    logger.error('Authentication system testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default AuthTester;
