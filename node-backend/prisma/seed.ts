import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../src/config/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  try {
    // Create default admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        passwordHash: adminPassword,
        email: 'admin@localhost',
        isAdmin: true,
        isActive: true,
      },
    });

    logger.info(`✅ Admin user created/updated: ${adminUser.username}`);

    // Create default configuration entries
    const defaultConfigs = [
      {
        key: 'server_default_memory',
        value: '1024',
        updatedBy: adminUser.id,
      },
      {
        key: 'server_default_port_start',
        value: '25565',
        updatedBy: adminUser.id,
      },
      {
        key: 'server_max_servers_per_user',
        value: '5',
        updatedBy: adminUser.id,
      },
      {
        key: 'server_backup_retention_days',
        value: '30',
        updatedBy: adminUser.id,
      },
      {
        key: 'system_maintenance_mode',
        value: 'false',
        updatedBy: adminUser.id,
      },
      {
        key: 'system_log_level',
        value: 'info',
        updatedBy: adminUser.id,
      },
    ];

    for (const config of defaultConfigs) {
      await prisma.configuration.upsert({
        where: { key: config.key },
        update: { value: config.value, updatedBy: config.updatedBy },
        create: config,
      });
    }

    logger.info(`✅ Created ${defaultConfigs.length} default configuration entries`);

    // Create a sample server for testing (optional)
    const sampleServer = await prisma.server.upsert({
      where: { serverName: 'test-server' },
      update: {},
      create: {
        serverName: 'test-server',
        version: '1.20.1',
        port: 25566,
        status: 'Stopped',
        gamemode: 'survival',
        difficulty: 'normal',
        memoryMb: 1024,
        ownerId: adminUser.id,
        motd: 'Test Minecraft Server',
      },
    });

    logger.info(`✅ Sample server created: ${sampleServer.serverName}`);

    logger.info('🎉 Database seeding completed successfully!');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    logger.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
