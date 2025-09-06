import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../config/redis';

// Global test setup
beforeAll(async () => {
  // Initialize test database connection
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || 'file:./test.db',
      },
    },
  });

  // Initialize test Redis connection
  const redis = getRedisClient();

  // Store in global for cleanup
  (global as any).__TEST_PRISMA__ = prisma;
  (global as any).__TEST_REDIS__ = redis;

  // Connect to services
  await prisma.$connect();
  await redis.connect();
});

afterAll(async () => {
  // Cleanup test database
  const prisma = (global as any).__TEST_PRISMA__;
  if (prisma) {
    await prisma.$disconnect();
  }

  // Cleanup test Redis
  const redis = (global as any).__TEST_REDIS__;
  if (redis) {
    await redis.disconnect();
  }
});

beforeEach(async () => {
  // Clean database before each test
  const prisma = (global as any).__TEST_PRISMA__;
  if (prisma) {
    // Clean all tables in correct order (respecting foreign keys)
    await prisma.server.deleteMany();
    await prisma.configuration.deleteMany();
    await prisma.user.deleteMany();
  }

  // Clean Redis cache
  const redis = (global as any).__TEST_REDIS__;
  if (redis) {
    await redis.flushAll();
  }
});

afterEach(async () => {
  // Additional cleanup if needed
});

// Global test utilities
declare global {
  var __TEST_PRISMA__: PrismaClient;
  var __TEST_REDIS__: any;
}
