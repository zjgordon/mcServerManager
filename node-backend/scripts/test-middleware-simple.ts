#!/usr/bin/env ts-node

/**
 * Simple Middleware Testing Script
 * Tests middleware without external dependencies
 */

import request from 'supertest';
import { createApp } from '../src/app';

async function testMiddleware() {
  console.log('🧪 Starting simple middleware tests...');
  
  try {
    const app = createApp();
    
    // Test 1: Basic app response
    console.log('📡 Testing basic app response...');
    const response = await request(app)
      .get('/')
      .timeout(5000)
      .expect(200);
    
    console.log('✅ Basic app response working');
    
    // Test 2: Security headers
    console.log('🔒 Testing security headers...');
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
    ];
    
    let securityHeadersFound = 0;
    for (const header of securityHeaders) {
      if (response.headers[header]) {
        securityHeadersFound++;
        console.log(`✅ Found security header: ${header}`);
      } else {
        console.log(`❌ Missing security header: ${header}`);
      }
    }
    
    console.log(`🔒 Security headers: ${securityHeadersFound}/${securityHeaders.length} found`);
    
    // Test 3: CORS headers
    console.log('🌐 Testing CORS headers...');
    const corsHeaders = [
      'access-control-allow-origin',
      'access-control-allow-credentials',
    ];
    
    let corsHeadersFound = 0;
    for (const header of corsHeaders) {
      if (response.headers[header]) {
        corsHeadersFound++;
        console.log(`✅ Found CORS header: ${header}`);
      } else {
        console.log(`❌ Missing CORS header: ${header}`);
      }
    }
    
    console.log(`🌐 CORS headers: ${corsHeadersFound}/${corsHeaders.length} found`);
    
    // Test 4: Request ID
    console.log('🆔 Testing request ID...');
    if (response.headers['x-request-id']) {
      console.log('✅ Request ID header found');
    } else {
      console.log('❌ Request ID header missing');
    }
    
    // Test 5: Response time
    console.log('⏱️ Testing response time...');
    if (response.headers['x-response-time']) {
      console.log('✅ Response time header found');
    } else {
      console.log('❌ Response time header missing');
    }
    
    console.log('✅ All simple middleware tests completed!');
    
  } catch (error) {
    console.error('❌ Middleware test failed:', error);
    process.exit(1);
  }
}

// Run the test
testMiddleware();
