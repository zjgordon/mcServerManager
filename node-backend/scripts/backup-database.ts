#!/usr/bin/env ts-node

/**
 * Database Backup Script
 *
 * This script creates a backup of the SQLite database.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../src/config/logger';

class DatabaseBackup {
  private prisma: PrismaClient;
  private projectRoot: string;

  constructor() {
    this.prisma = new PrismaClient();
    this.projectRoot = path.join(__dirname, '../..');
  }

  async createBackup(): Promise<string> {
    try {
      logger.info('💾 Starting database backup...');

      // Ensure backups directory exists
      const backupsDir = path.join(this.projectRoot, 'backups');
      await fs.ensureDir(backupsDir);

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `database-backup-${timestamp}.db`;
      const backupPath = path.join(backupsDir, backupFilename);

      // Get database path from environment
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL environment variable not set');
      }

      // Extract database path from URL (remove sqlite: prefix)
      const dbPath = databaseUrl.replace('sqlite:', '');
      
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database file not found: ${dbPath}`);
      }

      // Copy database file
      await fs.copy(dbPath, backupPath);
      
      // Verify backup
      const backupStats = await fs.stat(backupPath);
      const originalStats = await fs.stat(dbPath);
      
      if (backupStats.size !== originalStats.size) {
        throw new Error('Backup file size mismatch');
      }

      logger.info(`✅ Database backup created: ${backupPath}`);
      logger.info(`📊 Backup size: ${(backupStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups(backupsDir);

      return backupPath;
    } catch (error) {
      logger.error('❌ Database backup failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async cleanupOldBackups(backupsDir: string): Promise<void> {
    try {
      const files = await fs.readdir(backupsDir);
      const backupFiles = files
        .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(backupsDir, file),
        }));

      // Sort by modification time (newest first)
      const sortedBackups = await Promise.all(
        backupFiles.map(async (file) => {
          const stats = await fs.stat(file.path);
          return {
            ...file,
            mtime: stats.mtime,
          };
        })
      );

      sortedBackups.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the 10 most recent backups
      const backupsToDelete = sortedBackups.slice(10);
      
      for (const backup of backupsToDelete) {
        await fs.remove(backup.path);
        logger.info(`🗑️ Deleted old backup: ${backup.name}`);
      }

      if (backupsToDelete.length > 0) {
        logger.info(`✅ Cleaned up ${backupsToDelete.length} old backups`);
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups:', error);
    }
  }

  async listBackups(): Promise<string[]> {
    try {
      const backupsDir = path.join(this.projectRoot, 'backups');
      
      if (!fs.existsSync(backupsDir)) {
        return [];
      }

      const files = await fs.readdir(backupsDir);
      return files
        .filter(file => file.startsWith('database-backup-') && file.endsWith('.db'))
        .sort()
        .reverse(); // Newest first
    } catch (error) {
      logger.error('Failed to list backups:', error);
      return [];
    }
  }
}

// Main execution
async function main() {
  const backup = new DatabaseBackup();

  try {
    const backupPath = await backup.createBackup();
    console.log(`Backup created: ${backupPath}`);
    process.exit(0);
  } catch (error) {
    logger.error('Backup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default DatabaseBackup;
