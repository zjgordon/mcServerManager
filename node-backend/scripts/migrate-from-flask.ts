#!/usr/bin/env ts-node

/**
 * Database Migration Script
 * 
 * This script migrates data from the existing Flask SQLite database
 * to the new Prisma database structure.
 */

import { PrismaClient } from '@prisma/client';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { logger } from '../src/config/logger';

// Configuration
const FLASK_DB_PATH = path.join(__dirname, '../../instance/minecraft_manager.db');
const PRISMA_DB_PATH = path.join(__dirname, '../dev.db');

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
  gamemode: string | null;
  difficulty: string | null;
  hardcore: boolean | null;
  pvp: boolean | null;
  spawn_monsters: boolean | null;
  motd: string | null;
  memory_mb: number;
  owner_id: number;
}

interface FlaskConfiguration {
  id: number;
  key: string;
  value: string;
  updated_at: string;
  updated_by: number | null;
}

class DatabaseMigrator {
  private prisma: PrismaClient;
  private flaskDb: sqlite3.Database;

  constructor() {
    this.prisma = new PrismaClient();
    this.flaskDb = new sqlite3.Database(FLASK_DB_PATH);
  }

  async migrate(): Promise<void> {
    try {
      logger.info('🚀 Starting database migration from Flask to Prisma...');
      
      // Check if Flask database exists
      if (!await this.checkFlaskDatabase()) {
        throw new Error('Flask database not found');
      }

      // Clear existing Prisma database
      await this.clearPrismaDatabase();

      // Migrate users
      await this.migrateUsers();

      // Migrate servers
      await this.migrateServers();

      // Migrate configurations
      await this.migrateConfigurations();

      logger.info('✅ Database migration completed successfully!');
      
    } catch (error) {
      logger.error('❌ Database migration failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  private async checkFlaskDatabase(): Promise<boolean> {
    return new Promise((resolve) => {
      this.flaskDb.get("SELECT name FROM sqlite_master WHERE type='table' AND name='user'", (err: any, row: any) => {
        resolve(!err && !!row);
      });
    });
  }

  private async clearPrismaDatabase(): Promise<void> {
    logger.info('🧹 Clearing existing Prisma database...');
    
    // Delete in correct order to respect foreign key constraints
    await this.prisma.configuration.deleteMany();
    await this.prisma.server.deleteMany();
    await this.prisma.user.deleteMany();
    
    logger.info('✅ Prisma database cleared');
  }

  private async migrateUsers(): Promise<void> {
    logger.info('👥 Migrating users...');
    
    const users = await this.getFlaskUsers();
    
    for (const user of users) {
      await this.prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          passwordHash: user.password_hash,
          isAdmin: Boolean(user.is_admin),
          email: user.email,
          createdAt: new Date(user.created_at),
          lastLogin: user.last_login ? new Date(user.last_login) : null,
          isActive: Boolean(user.is_active),
        },
      });
    }
    
    logger.info(`✅ Migrated ${users.length} users`);
  }

  private async migrateServers(): Promise<void> {
    logger.info('🖥️ Migrating servers...');
    
    const servers = await this.getFlaskServers();
    
    for (const server of servers) {
      await this.prisma.server.create({
        data: {
          id: server.id,
          serverName: server.server_name,
          version: server.version,
          port: server.port,
          status: this.mapServerStatus(server.status),
          pid: server.pid,
          levelSeed: server.level_seed,
          gamemode: server.gamemode || 'survival',
          difficulty: server.difficulty || 'normal',
          hardcore: Boolean(server.hardcore),
          pvp: Boolean(server.pvp),
          spawnMonsters: Boolean(server.spawn_monsters),
          motd: server.motd,
          memoryMb: server.memory_mb,
          ownerId: server.owner_id,
        },
      });
    }
    
    logger.info(`✅ Migrated ${servers.length} servers`);
  }

  private async migrateConfigurations(): Promise<void> {
    logger.info('⚙️ Migrating configurations...');
    
    const configurations = await this.getFlaskConfigurations();
    
    for (const config of configurations) {
      await this.prisma.configuration.create({
        data: {
          id: config.id,
          key: config.key,
          value: config.value,
          updatedAt: new Date(config.updated_at),
          updatedBy: config.updated_by,
        },
      });
    }
    
    logger.info(`✅ Migrated ${configurations.length} configurations`);
  }

  private mapServerStatus(status: string): 'Stopped' | 'Starting' | 'Running' | 'Stopping' | 'Error' {
    switch (status.toLowerCase()) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'starting':
        return 'Starting';
      case 'stopping':
        return 'Stopping';
      case 'error':
        return 'Error';
      default:
        return 'Stopped';
    }
  }

  private async getFlaskUsers(): Promise<FlaskUser[]> {
    return new Promise((resolve, reject) => {
      this.flaskDb.all("SELECT * FROM user", (err: any, rows: FlaskUser[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private async getFlaskServers(): Promise<FlaskServer[]> {
    return new Promise((resolve, reject) => {
      this.flaskDb.all("SELECT * FROM server", (err: any, rows: FlaskServer[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private async getFlaskConfigurations(): Promise<FlaskConfiguration[]> {
    return new Promise((resolve, reject) => {
      this.flaskDb.all("SELECT * FROM configuration", (err: any, rows: FlaskConfiguration[]) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  private async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
    this.flaskDb.close();
  }
}

// Main execution
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.migrate();
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

export default DatabaseMigrator;

