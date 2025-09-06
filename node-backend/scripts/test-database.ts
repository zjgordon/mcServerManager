#!/usr/bin/env ts-node

/**
 * Database Test Script
 * 
 * This script tests the database setup and connectivity.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../src/config/logger';

async function testDatabase() {
  const prisma = new PrismaClient();
  
  try {
    logger.info('🧪 Testing database setup...');
    
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connection successful');
    
    // Test basic queries
    const userCount = await prisma.user.count();
    const serverCount = await prisma.server.count();
    const configCount = await prisma.configuration.count();
    
    logger.info(`📊 Database statistics:`);
    logger.info(`  - Users: ${userCount}`);
    logger.info(`  - Servers: ${serverCount}`);
    logger.info(`  - Configurations: ${configCount}`);
    
    // Test user query
    const users = await prisma.user.findMany({
      include: {
        servers: true,
        configurations: true,
      },
    });
    
    logger.info(`👥 Users with relationships:`);
    for (const user of users) {
      logger.info(`  - ${user.username} (admin: ${user.isAdmin}, servers: ${user.servers.length})`);
    }
    
    // Test server query
    const servers = await prisma.server.findMany({
      include: {
        owner: true,
      },
    });
    
    logger.info(`🖥️ Servers with owners:`);
    for (const server of servers) {
      logger.info(`  - ${server.serverName} (${server.status}, owner: ${server.owner.username})`);
    }
    
    logger.info('✅ Database test completed successfully!');
    
  } catch (error) {
    logger.error('❌ Database test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  try {
    await testDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default testDatabase;

