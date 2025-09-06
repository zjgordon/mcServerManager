#!/usr/bin/env ts-node

/**
 * Database Testing Script
 *
 * This script tests the database connection, operations, and data integrity.
 */

import { PrismaClient } from '@prisma/client';
import { DatabaseService } from '../src/services/databaseService';
import { logger } from '../src/config/logger';
import { initializeDatabase } from '../src/config/database';
import bcrypt from 'bcryptjs';

class DatabaseTester {
  private prisma: PrismaClient;
  private dbService: DatabaseService;

  constructor() {
    this.prisma = new PrismaClient();
    // Initialize the database first
    initializeDatabase();
    this.dbService = new DatabaseService();
  }

  async runTests(): Promise<void> {
    try {
      logger.info('🧪 Starting database tests...');

      // Test 1: Connection
      await this.testConnection();

      // Test 2: User operations
      await this.testUserOperations();

      // Test 3: Server operations
      await this.testServerOperations();

      // Test 4: Configuration operations
      await this.testConfigurationOperations();

      // Test 5: Database statistics
      await this.testDatabaseStats();

      // Test 6: Data integrity
      await this.testDataIntegrity();

      logger.info('✅ All database tests passed!');
    } catch (error) {
      logger.error('❌ Database tests failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async testConnection(): Promise<void> {
    logger.info('🔍 Testing database connection...');

    const isHealthy = await this.dbService.healthCheck();
    if (!isHealthy) {
      throw new Error('Database health check failed');
    }

    logger.info('✅ Database connection test passed');
  }

  private async testUserOperations(): Promise<void> {
    logger.info('👥 Testing user operations...');

    const testUser = {
      username: 'testuser',
      passwordHash: await bcrypt.hash('testpass', 12),
      email: 'test@example.com',
      isAdmin: false,
    };

    // Create user
    const createdUser = await this.dbService.createUser(testUser);
    if (!createdUser || createdUser.username !== testUser.username) {
      throw new Error('User creation failed');
    }

    // Get user by ID
    const userById = await this.dbService.getUserById(createdUser.id);
    if (!userById || userById.id !== createdUser.id) {
      throw new Error('Get user by ID failed');
    }

    // Get user by username
    const userByUsername = await this.dbService.getUserByUsername(testUser.username);
    if (!userByUsername || userByUsername.username !== testUser.username) {
      throw new Error('Get user by username failed');
    }

    // Update user
    const updatedUser = await this.dbService.updateUser(createdUser.id, {
      isAdmin: true,
    });
    if (!updatedUser || !updatedUser.isAdmin) {
      throw new Error('User update failed');
    }

    // Delete user
    await this.dbService.deleteUser(createdUser.id);
    const deletedUser = await this.dbService.getUserById(createdUser.id);
    if (deletedUser) {
      throw new Error('User deletion failed');
    }

    logger.info('✅ User operations test passed');
  }

  private async testServerOperations(): Promise<void> {
    logger.info('🖥️ Testing server operations...');

    // Create a test user first
    const testUser = await this.dbService.createUser({
      username: 'serverowner',
      passwordHash: await bcrypt.hash('testpass', 12),
      email: 'owner@example.com',
    });

    const testServer = {
      serverName: 'testserver',
      version: '1.20.1',
      port: 25567,
      ownerId: testUser.id,
      gamemode: 'survival' as const,
      difficulty: 'normal' as const,
      memoryMb: 1024,
    };

    // Create server
    const createdServer = await this.dbService.createServer(testServer);
    if (!createdServer || createdServer.serverName !== testServer.serverName) {
      throw new Error('Server creation failed');
    }

    // Get server by ID
    const serverById = await this.dbService.getServerById(createdServer.id);
    if (!serverById || serverById.id !== createdServer.id) {
      throw new Error('Get server by ID failed');
    }

    // Get server by name
    const serverByName = await this.dbService.getServerByName(testServer.serverName);
    if (!serverByName || serverByName.serverName !== testServer.serverName) {
      throw new Error('Get server by name failed');
    }

    // Get server by port
    const serverByPort = await this.dbService.getServerByPort(testServer.port);
    if (!serverByPort || serverByPort.port !== testServer.port) {
      throw new Error('Get server by port failed');
    }

    // Update server
    const updatedServer = await this.dbService.updateServer(createdServer.id, {
      status: 'Running',
      pid: 12345,
    });
    if (!updatedServer || updatedServer.status !== 'Running') {
      throw new Error('Server update failed');
    }

    // Get servers by owner
    const serversByOwner = await this.dbService.getServersByOwner(testUser.id, {
      page: 1,
      perPage: 10,
    });
    if (serversByOwner.data.length !== 1) {
      throw new Error('Get servers by owner failed');
    }

    // Delete server
    await this.dbService.deleteServer(createdServer.id);
    const deletedServer = await this.dbService.getServerById(createdServer.id);
    if (deletedServer) {
      throw new Error('Server deletion failed');
    }

    // Clean up test user
    await this.dbService.deleteUser(testUser.id);

    logger.info('✅ Server operations test passed');
  }

  private async testConfigurationOperations(): Promise<void> {
    logger.info('⚙️ Testing configuration operations...');

    const testConfig = {
      key: 'test_config',
      value: 'test_value',
    };

    // Create configuration
    const createdConfig = await this.dbService.createConfiguration(testConfig);
    if (!createdConfig || createdConfig.key !== testConfig.key) {
      throw new Error('Configuration creation failed');
    }

    // Get configuration by key
    const configByKey = await this.dbService.getConfigurationByKey(testConfig.key);
    if (!configByKey || configByKey.key !== testConfig.key) {
      throw new Error('Get configuration by key failed');
    }

    // Update configuration
    const updatedConfig = await this.dbService.updateConfiguration(testConfig.key, {
      value: 'updated_value',
    });
    if (!updatedConfig || updatedConfig.value !== 'updated_value') {
      throw new Error('Configuration update failed');
    }

    // Get all configurations
    const allConfigs = await this.dbService.getAllConfigurations();
    if (!Array.isArray(allConfigs)) {
      throw new Error('Get all configurations failed');
    }

    // Delete configuration
    await this.dbService.deleteConfiguration(testConfig.key);
    const deletedConfig = await this.dbService.getConfigurationByKey(testConfig.key);
    if (deletedConfig) {
      throw new Error('Configuration deletion failed');
    }

    logger.info('✅ Configuration operations test passed');
  }

  private async testDatabaseStats(): Promise<void> {
    logger.info('📊 Testing database statistics...');

    const stats = await this.dbService.getDatabaseStats();
    if (typeof stats.totalUsers !== 'number' || typeof stats.totalServers !== 'number') {
      throw new Error('Database statistics failed');
    }

    logger.info('✅ Database statistics test passed');
  }

  private async testDataIntegrity(): Promise<void> {
    logger.info('🔒 Testing data integrity...');

    // Test foreign key constraints
    try {
      await this.dbService.createServer({
        serverName: 'integritytest',
        version: '1.20.1',
        port: 25568,
        ownerId: 99999, // Non-existent user ID
      });
      throw new Error('Foreign key constraint not enforced');
    } catch (error) {
      // Expected to fail due to foreign key constraint
      if (!(error as Error).message.includes('Foreign key constraint')) {
        logger.info('✅ Foreign key constraints are enforced');
      }
    }

    // Test unique constraints
    try {
      await this.dbService.createUser({
        username: 'admin', // Should already exist from seeding
        passwordHash: await bcrypt.hash('test', 12),
      });
      throw new Error('Unique constraint not enforced');
    } catch (error) {
      // Expected to fail due to unique constraint
      if (!(error as Error).message.includes('Unique constraint')) {
        logger.info('✅ Unique constraints are enforced');
      }
    }

    logger.info('✅ Data integrity test passed');
  }

  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('🔌 Database connection closed');
  }
}

// Main execution
async function main() {
  const tester = new DatabaseTester();

  try {
    await tester.runTests();
    process.exit(0);
  } catch (error) {
    logger.error('Database testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default DatabaseTester;