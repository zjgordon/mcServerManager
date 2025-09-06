#!/usr/bin/env ts-node

/**
 * Database Setup Script
 *
 * This script sets up the SQLite database for development
 * and migrates data from the existing Flask database.
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '../src/config/logger';

class DatabaseSetup {
  private projectRoot: string;
  private nodeBackendRoot: string;

  constructor() {
    this.projectRoot = path.join(__dirname, '../..');
    this.nodeBackendRoot = path.join(__dirname, '..');
  }

  async setup(): Promise<void> {
    try {
      logger.info('🚀 Setting up SQLite database for development...');

      // Create necessary directories
      await this.createDirectories();

      // Copy environment file
      await this.setupEnvironment();

      // Generate Prisma client
      await this.generatePrismaClient();

      // Run database migrations
      await this.runMigrations();

      // Migrate data from Flask database
      await this.migrateFromFlask();

      logger.info('✅ Database setup completed successfully!');
    } catch (error) {
      logger.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  private async createDirectories(): Promise<void> {
    logger.info('📁 Creating necessary directories...');

    const directories = [
      'logs',
      'prisma/migrations',
      'src/config',
      'src/middleware',
      'src/routes',
      'src/controllers',
      'src/services',
      'src/models',
      'src/utils',
      'src/types',
      'src/schemas',
    ];

    for (const dir of directories) {
      const dirPath = path.join(this.nodeBackendRoot, dir);
      await fs.ensureDir(dirPath);
    }

    logger.info('✅ Directories created');
  }

  private async setupEnvironment(): Promise<void> {
    logger.info('⚙️ Setting up environment configuration...');

    const envExamplePath = path.join(this.nodeBackendRoot, 'env.example');
    const envPath = path.join(this.nodeBackendRoot, '.env');

    if (!(await fs.pathExists(envPath))) {
      await fs.copy(envExamplePath, envPath);
      logger.info('✅ Environment file created from template');
    } else {
      logger.info('✅ Environment file already exists');
    }
  }

  private async generatePrismaClient(): Promise<void> {
    logger.info('🔧 Generating Prisma client...');

    try {
      execSync('npx prisma generate', {
        cwd: this.nodeBackendRoot,
        stdio: 'inherit',
      });
      logger.info('✅ Prisma client generated');
    } catch (error) {
      logger.error('❌ Failed to generate Prisma client:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    logger.info('🔄 Running database migrations...');

    try {
      // Create initial migration
      execSync('npx prisma migrate dev --name init', {
        cwd: this.nodeBackendRoot,
        stdio: 'inherit',
      });
      logger.info('✅ Database migrations completed');
    } catch (error) {
      logger.error('❌ Database migration failed:', error);
      throw error;
    }
  }

  private async migrateFromFlask(): Promise<void> {
    logger.info('🔄 Migrating data from Flask database...');

    const flaskDbPath = path.join(this.projectRoot, 'instance/minecraft_manager.db');

    if (await fs.pathExists(flaskDbPath)) {
      try {
        // Run the migration script
        execSync('npx ts-node scripts/migrate-from-flask.ts', {
          cwd: this.nodeBackendRoot,
          stdio: 'inherit',
        });
        logger.info('✅ Data migration from Flask completed');
      } catch (error) {
        logger.error('❌ Data migration failed:', error);
        throw error;
      }
    } else {
      logger.info('ℹ️ No Flask database found, skipping data migration');
    }
  }
}

// Main execution
async function main() {
  const setup = new DatabaseSetup();

  try {
    await setup.setup();
    process.exit(0);
  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default DatabaseSetup;
