#!/usr/bin/env ts-node

/**
 * Database Restore Script
 *
 * This script restores the SQLite database from a backup.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../src/config/logger';

class DatabaseRestore {
  private prisma: PrismaClient;
  private projectRoot: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.projectRoot = path.join(__dirname, '../..');
  }

  async restoreFromBackup(backupFilename: string): Promise<void> {
    try {
      logger.info(`🔄 Starting database restore from: ${backupFilename}`);

      // Validate backup file
      const backupPath = path.join(this.projectRoot, 'backups', backupFilename);
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Get database path from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      const dbPath = databaseUrl.replace('sqlite:', '');
      
      // Create backup of current database before restore
      if (fs.existsSync(dbPath)) {
        const currentBackupPath = `${dbPath}.backup.${Date.now()}`;
        await fs.copy(dbPath, currentBackupPath);
        logger.info(`📋 Current database backed up to: ${currentBackupPath}`);
      }

      // Stop any active connections
      await this.prisma.$disconnect();

      // Copy backup to database location
      await fs.copy(backupPath, dbPath);

      // Verify restore
      const restoredStats = await fs.stat(dbPath);
      const backupStats = await fs.stat(backupPath);
      
      if (restoredStats.size !== backupStats.size) {
        throw new Error('Restored database size mismatch');
      }

      // Test database connection
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;

      logger.info(`✅ Database restored successfully from: ${backupFilename}`);
      logger.info(`📊 Restored database size: ${(restoredStats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      logger.error('❌ Database restore failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  async listAvailableBackups(): Promise<string[]> {
    try {
      const backupsDir = path.join(this.projectRoot, 'backups');
      
      if (!fs.existsSync(backupsDir)) {
        logger.info('No backups directory found');
        return [];
      }

      const files = await fs.readdir(backupsDir);
      const backupFiles = files
        .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
        .sort()
        .reverse(); // Newest first

      return backupFiles;
    } catch (error) {
      logger.error('Failed to list available backups:', error);
      return [];
    }
  }

  async getBackupInfo(backupFilename: string): Promise<{
    path: string;
    size: number;
    created: Date;
    sizeFormatted: string;
  }> {
    const backupPath = path.join(this.projectRoot, 'backups', backupFilename);
    const stats = await fs.stat(backupPath);
    
    return {
      path: backupPath,
      size: stats.size,
      created: stats.birthtime,
      sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    };
  }
}

// Main execution
async function main() {
  const restore = new DatabaseRestore();
  const args = process.argv.slice(2);

  try {
    if (args.length === 0) {
      // List available backups
      const backups = await restore.listAvailableBackups();
      
      if (backups.length === 0) {
        logger.info('No backups available');
        process.exit(0);
      }

      logger.info('Available backups:');
      for (const backup of backups) {
        const info = await restore.getBackupInfo(backup);
        logger.info(`  - ${backup} (${info.sizeFormatted}, ${info.created.toISOString()})`);
      }
      
      logger.info('\nUsage: npm run db:restore <backup-filename>');
      process.exit(0);
    }

    const backupFilename = args[0];
    await restore.restoreFromBackup(backupFilename);
    
    logger.info('✅ Database restore completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Restore failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default DatabaseRestore;
