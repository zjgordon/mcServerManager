#!/usr/bin/env ts-node

/**
 * Simple Authentication API Testing Script
 * 
 * This script tests the basic functionality of the contract-compatible
 * authentication endpoints to ensure they're working correctly.
 */

import axios from 'axios';

const EXPRESS_BASE_URL = 'http://localhost:5001/api/v1/auth';

async function testEndpoint(method: string, endpoint: string, data?: any, headers?: any) {
  try {
    const response = await axios({
      method,
      url: `${EXPRESS_BASE_URL}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true // Don't throw on non-2xx status codes
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    return {
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function runTests() {
  console.log('🚀 Testing Express.js Authentication API Endpoints...\n');

  // Test 1: CSRF Token
  console.log('1. Testing CSRF Token endpoint...');
  const csrfResult = await testEndpoint('GET', '/csrf-token');
  console.log(`   Status: ${csrfResult.status}`);
  console.log(`   Response: ${JSON.stringify(csrfResult.data)}`);
  console.log(`   Error: ${csrfResult.error || 'None'}\n`);

  // Test 2: Setup Status
  console.log('2. Testing Setup Status endpoint...');
  const setupStatusResult = await testEndpoint('GET', '/setup/status');
  console.log(`   Status: ${setupStatusResult.status}`);
  console.log(`   Response: ${JSON.stringify(setupStatusResult.data)}`);
  console.log(`   Error: ${setupStatusResult.error || 'None'}\n`);

  // Test 3: Auth Status (unauthenticated)
  console.log('3. Testing Auth Status endpoint (unauthenticated)...');
  const authStatusResult = await testEndpoint('GET', '/status');
  console.log(`   Status: ${authStatusResult.status}`);
  console.log(`   Response: ${JSON.stringify(authStatusResult.data)}`);
  console.log(`   Error: ${authStatusResult.error || 'None'}\n`);

  // Test 4: Admin Setup
  console.log('4. Testing Admin Setup endpoint...');
  const setupResult = await testEndpoint('POST', '/setup', {
    username: 'testadmin',
    password: 'TestPassword123!',
    confirm_password: 'TestPassword123!',
    email: 'admin@test.com'
  });
  console.log(`   Status: ${setupResult.status}`);
  console.log(`   Response: ${JSON.stringify(setupResult.data)}`);
  console.log(`   Error: ${setupResult.error || 'None'}\n`);

  // Test 5: Login
  console.log('5. Testing Login endpoint...');
  const loginResult = await testEndpoint('POST', '/login', {
    username: 'testadmin',
    password: 'TestPassword123!'
  });
  console.log(`   Status: ${loginResult.status}`);
  console.log(`   Response: ${JSON.stringify(loginResult.data)}`);
  console.log(`   Error: ${loginResult.error || 'None'}\n`);

  // Extract session cookie if login was successful
  let sessionCookie = null;
  if (loginResult.headers && loginResult.headers['set-cookie']) {
    const cookies = loginResult.headers['set-cookie'];
    const sessionCookieStr = cookies.find((cookie: string) => 
      cookie.startsWith('connect.sid') || cookie.startsWith('mcserver_session')
    );
    if (sessionCookieStr) {
      sessionCookie = sessionCookieStr.split(';')[0];
    }
  }

  // Test 6: Auth Status (authenticated)
  console.log('6. Testing Auth Status endpoint (authenticated)...');
  const authStatusResult2 = await testEndpoint('GET', '/status', null, {
    Cookie: sessionCookie || ''
  });
  console.log(`   Status: ${authStatusResult2.status}`);
  console.log(`   Response: ${JSON.stringify(authStatusResult2.data)}`);
  console.log(`   Error: ${authStatusResult2.error || 'None'}\n`);

  // Test 7: Get Current User
  console.log('7. Testing Get Current User endpoint...');
  const meResult = await testEndpoint('GET', '/me', null, {
    Cookie: sessionCookie || ''
  });
  console.log(`   Status: ${meResult.status}`);
  console.log(`   Response: ${JSON.stringify(meResult.data)}`);
  console.log(`   Error: ${meResult.error || 'None'}\n`);

  // Test 8: Logout
  console.log('8. Testing Logout endpoint...');
  const logoutResult = await testEndpoint('POST', '/logout', null, {
    Cookie: sessionCookie || ''
  });
  console.log(`   Status: ${logoutResult.status}`);
  console.log(`   Response: ${JSON.stringify(logoutResult.data)}`);
  console.log(`   Error: ${logoutResult.error || 'None'}\n`);

  console.log('✅ Authentication API testing completed!');
}

// Main execution
if (require.main === module) {
  runTests().catch(console.error);
}

export { runTests };
