import { beforeAll, afterAll } from 'vitest';

// Contract test setup
beforeAll(async () => {
  // Set up test environment for contract tests
  process.env.NODE_ENV = 'test';
  process.env.PORT = '5001';
  process.env.DATABASE_URL = 'file:./contract-test.db';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.SESSION_SECRET = 'test-session-secret';
  process.env.CSRF_SECRET = 'test-csrf-secret';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.WS_USE_REDIS_ADAPTER = 'false';
  process.env.LOG_LEVEL = 'error'; // Reduce noise in contract tests
});

afterAll(async () => {
  // Cleanup after contract tests
  // This is handled by the individual test scripts
});
