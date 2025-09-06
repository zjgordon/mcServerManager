#!/usr/bin/env ts-node

/**
 * Flask to Node.js Database Migration Script
 *
 * This script migrates data from the existing Flask SQLite database
 * to the new Node.js Prisma database.
 */

import { PrismaClient } from '@prisma/client';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../src/config/logger';

interface FlaskUser {
  id: number;
  username: string;
  password_hash: string | null;
  is_admin: boolean;
  email: string | null;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

interface FlaskServer {
  id: number;
  server_name: string;
  version: string;
  port: number;
  status: string;
  pid: number | null;
  level_seed: string | null;
  gamemode: string;
  difficulty: string;
  hardcore: boolean;
  pvp: boolean;
  spawn_monsters: boolean;
  motd: string | null;
  memory_mb: number;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

interface FlaskConfiguration {
  id: number;
  key: string;
  value: string;
  updated_at: string;
  updated_by: number | null;
}

class FlaskMigration {
  private prisma: PrismaClient;
  private flaskDb: Database.Database;
  private projectRoot: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.projectRoot = path.join(__dirname, '../..');
    const flaskDbPath = path.join(this.projectRoot, 'instance/minecraft_manager.db');
    
    if (!fs.existsSync(flaskDbPath)) {
      throw new Error(`Flask database not found at: ${flaskDbPath}`);
    }
    
    this.flaskDb = new Database(flaskDbPath);
  }

  async migrate(): Promise<void> {
    try {
      logger.info('🔄 Starting Flask to Node.js database migration...');

      // Test connections
      await this.testConnections();

      // Migrate users
      await this.migrateUsers();

      // Migrate configurations
      await this.migrateConfigurations();

      // Migrate servers
      await this.migrateServers();

      logger.info('✅ Migration completed successfully!');
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async testConnections(): Promise<void> {
    logger.info('🔍 Testing database connections...');

    // Test Prisma connection
    await this.prisma.$connect();
    logger.info('✅ Prisma connection successful');

    // Test Flask database connection
    const result = this.flaskDb.prepare('SELECT 1 as test').get() as { test: number };
    if (result.test !== 1) {
      throw new Error('Flask database connection test failed');
    }
    logger.info('✅ Flask database connection successful');
  }

  private async migrateUsers(): Promise<void> {
    logger.info('👥 Migrating users...');

    const flaskUsers = this.flaskDb.prepare('SELECT * FROM user').all() as FlaskUser[];
    
    for (const flaskUser of flaskUsers) {
      try {
        await this.prisma.user.upsert({
          where: { id: flaskUser.id },
          update: {
            username: flaskUser.username,
            passwordHash: flaskUser.password_hash,
            isAdmin: flaskUser.is_admin,
            email: flaskUser.email,
            createdAt: new Date(flaskUser.created_at),
            lastLogin: flaskUser.last_login ? new Date(flaskUser.last_login) : null,
            isActive: flaskUser.is_active,
          },
          create: {
            id: flaskUser.id,
            username: flaskUser.username,
            passwordHash: flaskUser.password_hash,
            isAdmin: flaskUser.is_admin,
            email: flaskUser.email,
            createdAt: new Date(flaskUser.created_at),
            lastLogin: flaskUser.last_login ? new Date(flaskUser.last_login) : null,
            isActive: flaskUser.is_active,
          },
        });
        logger.info(`✅ Migrated user: ${flaskUser.username}`);
      } catch (error) {
        logger.error(`❌ Failed to migrate user ${flaskUser.username}:`, error);
        throw error;
      }
    }

    logger.info(`✅ Migrated ${flaskUsers.length} users`);
  }

  private async migrateConfigurations(): Promise<void> {
    logger.info('⚙️ Migrating configurations...');

    const flaskConfigs = this.flaskDb.prepare('SELECT * FROM configuration').all() as FlaskConfiguration[];
    
    for (const flaskConfig of flaskConfigs) {
      try {
        await this.prisma.configuration.upsert({
          where: { key: flaskConfig.key },
          update: {
            value: flaskConfig.value,
            updatedAt: new Date(flaskConfig.updated_at),
            updatedBy: flaskConfig.updated_by,
          },
          create: {
            key: flaskConfig.key,
            value: flaskConfig.value,
            updatedAt: new Date(flaskConfig.updated_at),
            updatedBy: flaskConfig.updated_by,
          },
        });
        logger.info(`✅ Migrated configuration: ${flaskConfig.key}`);
      } catch (error) {
        logger.error(`❌ Failed to migrate configuration ${flaskConfig.key}:`, error);
        throw error;
      }
    }

    logger.info(`✅ Migrated ${flaskConfigs.length} configurations`);
  }

  private async migrateServers(): Promise<void> {
    logger.info('🖥️ Migrating servers...');

    const flaskServers = this.flaskDb.prepare('SELECT * FROM server').all() as FlaskServer[];
    
    for (const flaskServer of flaskServers) {
      try {
        await this.prisma.server.upsert({
          where: { id: flaskServer.id },
          update: {
            serverName: flaskServer.server_name,
            version: flaskServer.version,
            port: flaskServer.port,
            status: flaskServer.status,
            pid: flaskServer.pid,
            levelSeed: flaskServer.level_seed,
            gamemode: flaskServer.gamemode,
            difficulty: flaskServer.difficulty,
            hardcore: flaskServer.hardcore,
            pvp: flaskServer.pvp,
            spawnMonsters: flaskServer.spawn_monsters,
            motd: flaskServer.motd,
            memoryMb: flaskServer.memory_mb,
            ownerId: flaskServer.owner_id,
            createdAt: new Date(flaskServer.created_at),
            updatedAt: new Date(flaskServer.updated_at),
          },
          create: {
            id: flaskServer.id,
            serverName: flaskServer.server_name,
            version: flaskServer.version,
            port: flaskServer.port,
            status: flaskServer.status,
            pid: flaskServer.pid,
            levelSeed: flaskServer.level_seed,
            gamemode: flaskServer.gamemode,
            difficulty: flaskServer.difficulty,
            hardcore: flaskServer.hardcore,
            pvp: flaskServer.pvp,
            spawnMonsters: flaskServer.spawn_monsters,
            motd: flaskServer.motd,
            memoryMb: flaskServer.memory_mb,
            ownerId: flaskServer.owner_id,
            createdAt: new Date(flaskServer.created_at),
            updatedAt: new Date(flaskServer.updated_at),
          },
        });
        logger.info(`✅ Migrated server: ${flaskServer.server_name}`);
      } catch (error) {
        logger.error(`❌ Failed to migrate server ${flaskServer.server_name}:`, error);
        throw error;
      }
    }

    logger.info(`✅ Migrated ${flaskServers.length} servers`);
  }

  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    this.flaskDb.close();
    logger.info('🔌 Database connections closed');
  }
}

// Main execution
async function main() {
  const migration = new FlaskMigration();

  try {
    await migration.migrate();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default FlaskMigration;