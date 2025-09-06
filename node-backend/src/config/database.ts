import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Global Prisma client instance
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance
export function createPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'minimal',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  } else {
    // In development, use global variable to prevent multiple instances
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
        errorFormat: 'pretty',
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });
    }
    return global.__prisma;
  }
}

// Initialize Prisma client
export function initializeDatabase(): PrismaClient {
  try {
    prisma = createPrismaClient();

    // Test database connection
    prisma
      .$connect()
      .then(() => {
        logger.info('✅ Database connected successfully');
      })
      .catch((error: any) => {
        logger.error('❌ Database connection failed:', error);
        process.exit(1);
      });

    // Handle graceful shutdown
    process.on('beforeExit', async () => {
      await prisma.$disconnect();
      logger.info('🔌 Database connection closed');
    });

    return prisma;
  } catch (error: any) {
    logger.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Get Prisma client instance
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return prisma;
}

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Database migration helper
export async function runMigrations(): Promise<void> {
  try {
    logger.info('🔄 Running database migrations...');
    // Prisma migrations are handled by the CLI
    // This is just a placeholder for any custom migration logic
    logger.info('✅ Database migrations completed');
  } catch (error: any) {
    logger.error('❌ Database migration failed:', error);
    throw error;
  }
}

// Export the getPrismaClient function instead of the variable
export default getPrismaClient;
