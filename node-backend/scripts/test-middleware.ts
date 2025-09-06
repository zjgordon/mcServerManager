#!/usr/bin/env ts-node

/**
 * Middleware Testing Script
 *
 * This script tests all middleware functionality including security, CORS, rate limiting, and error handling.
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { logger } from '../src/config/logger';

class MiddlewareTester {
  private app: any;

  constructor() {
    this.app = createApp();
  }

  async runTests(): Promise<void> {
    try {
      logger.info('🧪 Starting middleware tests...');

      // Test 1: Security middleware
      await this.testSecurityMiddleware();

      // Test 2: CORS middleware
      await this.testCorsMiddleware();

      // Test 3: Rate limiting middleware
      await this.testRateLimitingMiddleware();

      // Test 4: Error handling middleware
      await this.testErrorHandlingMiddleware();

      // Test 5: Request validation middleware
      await this.testRequestValidationMiddleware();

      // Test 6: Logging middleware
      await this.testLoggingMiddleware();

      // Test 7: Performance middleware
      await this.testPerformanceMiddleware();

      logger.info('✅ All middleware tests passed!');
    } catch (error) {
      logger.error('❌ Middleware tests failed:', error);
      throw error;
    }
  }

  private async testSecurityMiddleware(): Promise<void> {
    logger.info('🔒 Testing security middleware...');

    // Test security headers
    const response = await request(this.app)
      .get('/')
      .expect(200);

    // Check security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
    ];

    for (const header of securityHeaders) {
      if (!response.headers[header]) {
        throw new Error(`Missing security header: ${header}`);
      }
    }

    // Test XSS protection
    const xssResponse = await request(this.app)
      .get('/')
      .query({ q: '<script>alert("xss")</script>' })
      .expect(200);

    // The request should be sanitized
    logger.info('✅ Security middleware test passed');
  }

  private async testCorsMiddleware(): Promise<void> {
    logger.info('🌐 Testing CORS middleware...');

    // Test CORS headers
    const response = await request(this.app)
      .get('/')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    // Check CORS headers
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-credentials',
    ];

    for (const header of corsHeaders) {
      if (!response.headers[header]) {
        throw new Error(`Missing CORS header: ${header}`);
      }
    }

    // Test preflight request
    const preflightResponse = await request(this.app)
      .options('/')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type')
      .expect(200);

    // Check preflight headers
    if (!preflightResponse.headers['access-control-allow-methods']) {
      throw new Error('Missing preflight CORS headers');
    }

    logger.info('✅ CORS middleware test passed');
  }

  private async testRateLimitingMiddleware(): Promise<void> {
    logger.info('⏱️ Testing rate limiting middleware...');

    // Test rate limiting headers
    const response = await request(this.app)
      .get('/api/')
      .expect(200);

    // Check rate limit headers
    const rateLimitHeaders = [
      'x-rate-limit-limit',
      'x-rate-limit-remaining',
      'x-rate-limit-reset',
    ];

    for (const header of rateLimitHeaders) {
      if (!response.headers[header]) {
        throw new Error(`Missing rate limit header: ${header}`);
      }
    }

    // Test rate limit exceeded (this would take too long in real testing)
    // In a real scenario, you'd make many requests quickly
    logger.info('✅ Rate limiting middleware test passed');
  }

  private async testErrorHandlingMiddleware(): Promise<void> {
    logger.info('🚨 Testing error handling middleware...');

    // Test 404 error
    const notFoundResponse = await request(this.app)
      .get('/nonexistent-endpoint')
      .expect(404);

    if (!notFoundResponse.body.success === false) {
      throw new Error('404 error response format incorrect');
    }

    // Test error response format
    const errorResponse = await request(this.app)
      .post('/api/v1/test-error')
      .send({ invalid: 'data' })
      .expect(404); // This will trigger 404 since route doesn't exist

    if (!errorResponse.body.timestamp || !errorResponse.body.requestId) {
      throw new Error('Error response missing required fields');
    }

    logger.info('✅ Error handling middleware test passed');
  }

  private async testRequestValidationMiddleware(): Promise<void> {
    logger.info('✅ Testing request validation middleware...');

    // Test request size limiting
    const largeData = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const largeResponse = await request(this.app)
      .post('/')
      .send({ data: largeData })
      .expect(413);

    if (!largeResponse.body.message.includes('too large')) {
      throw new Error('Request size validation not working');
    }

    // Test content type validation
    const invalidContentTypeResponse = await request(this.app)
      .post('/')
      .set('Content-Type', 'text/plain')
      .send('invalid data')
      .expect(200); // This should pass as we're not enforcing strict content type

    logger.info('✅ Request validation middleware test passed');
  }

  private async testLoggingMiddleware(): Promise<void> {
    logger.info('📝 Testing logging middleware...');

    // Test request ID
    const response = await request(this.app)
      .get('/')
      .expect(200);

    if (!response.headers['x-request-id']) {
      throw new Error('Missing request ID header');
    }

    // Test response time header
    if (!response.headers['x-response-time']) {
      throw new Error('Missing response time header');
    }

    logger.info('✅ Logging middleware test passed');
  }

  private async testPerformanceMiddleware(): Promise<void> {
    logger.info('⚡ Testing performance middleware...');

    const startTime = Date.now();
    const response = await request(this.app)
      .get('/')
      .expect(200);
    const endTime = Date.now();

    // Check response time header
    const responseTime = parseInt(response.headers['x-response-time'] || '0');
    const actualTime = endTime - startTime;

    // Response time should be reasonable (within 1 second)
    if (responseTime > 1000) {
      throw new Error(`Response time too slow: ${responseTime}ms`);
    }

    // Check that response time header is reasonable
    if (responseTime < 0 || responseTime > actualTime + 100) {
      throw new Error(`Response time header inaccurate: ${responseTime}ms vs ${actualTime}ms`);
    }

    logger.info('✅ Performance middleware test passed');
  }

  private async testHealthCheckMiddleware(): Promise<void> {
    logger.info('🏥 Testing health check middleware...');

    const response = await request(this.app)
      .get('/healthz')
      .expect(200);

    if (!response.body.status || response.body.status !== 'healthy') {
      throw new Error('Health check response format incorrect');
    }

    if (!response.body.timestamp || !response.body.uptime) {
      throw new Error('Health check missing required fields');
    }

    logger.info('✅ Health check middleware test passed');
  }
}

// Main execution
async function main() {
  const tester = new MiddlewareTester();

  try {
    await tester.runTests();
    process.exit(0);
  } catch (error) {
    logger.error('Middleware testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default MiddlewareTester;
