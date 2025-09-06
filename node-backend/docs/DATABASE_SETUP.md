# Database Setup and Management

This document provides comprehensive information about the database setup, management, and operations for the Node.js/Express backend.

## Overview

The application uses **Prisma ORM** with **SQLite** for development and **PostgreSQL** for production. The database schema includes three main entities:

- **Users**: Authentication and authorization
- **Servers**: Minecraft server instances and configurations
- **Configurations**: System-wide settings and preferences

## Database Schema

### User Model
```prisma
model User {
  id                Int      @id @default(autoincrement())
  username          String   @unique @map("username") @db.VarChar(50)
  passwordHash      String?  @map("password_hash") @db.VarChar(255)
  isAdmin           Boolean  @default(false) @map("is_admin")
  email             String?  @unique @map("email") @db.VarChar(255)
  createdAt         DateTime @default(now()) @map("created_at")
  lastLogin         DateTime? @map("last_login")
  isActive          Boolean  @default(true) @map("is_active")
  
  servers           Server[]
  configurations    Configuration[]
  
  @@index([username])
  @@index([email])
  @@index([isActive])
  @@map("user")
}
```

### Server Model
```prisma
model Server {
  id                Int          @id @default(autoincrement())
  serverName        String       @unique @map("server_name") @db.VarChar(100)
  version           String       @map("version") @db.VarChar(50)
  port              Int          @unique @map("port")
  status            String       @default("Stopped") @map("status") @db.VarChar(20)
  pid               Int?         @map("pid")
  levelSeed         String?      @map("level_seed") @db.VarChar(100)
  gamemode          String       @default("survival") @map("gamemode") @db.VarChar(20)
  difficulty        String       @default("normal") @map("difficulty") @db.VarChar(20)
  hardcore          Boolean      @default(false) @map("hardcore")
  pvp               Boolean      @default(true) @map("pvp")
  spawnMonsters     Boolean      @default(true) @map("spawn_monsters")
  motd              String?      @map("motd") @db.VarChar(255)
  memoryMb          Int          @default(1024) @map("memory_mb")
  ownerId           Int          @map("owner_id")
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")
  
  owner             User         @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  
  @@index([status])
  @@index([ownerId])
  @@index([port])
  @@index([serverName])
  @@map("server")
}
```

### Configuration Model
```prisma
model Configuration {
  id                Int      @id @default(autoincrement())
  key               String   @unique @map("key") @db.VarChar(100)
  value             String   @map("value") @db.Text
  updatedAt         DateTime @updatedAt @map("updated_at")
  updatedBy         Int?     @map("updated_by")
  
  updatedByUser     User?    @relation(fields: [updatedBy], references: [id], onDelete: SetNull)
  
  @@index([key])
  @@map("configuration")
}
```

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `node-backend` directory:

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# For production (PostgreSQL)
# DATABASE_URL="postgresql://username:password@localhost:5432/mcservermanager"

# Other environment variables
NODE_ENV="development"
PORT=5001
```

### 2. Database Initialization

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed
```

### 3. Database Setup (Complete)

```bash
# Run the complete database setup script
npm run setup:db
```

## Available Scripts

### Database Management
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio (database GUI)
- `npm run db:reset` - Reset database (WARNING: deletes all data)
- `npm run db:deploy` - Deploy migrations to production

### Database Operations
- `npm run db:backup` - Create database backup
- `npm run db:restore` - Restore database from backup
- `npm run test:db` - Run database tests
- `npm run validate:db` - Validate database and seed

### Migration Scripts
- `npm run setup:db` - Complete database setup
- `npm run migrate:flask` - Migrate data from Flask database

## Database Operations

### Using the Database Service

```typescript
import { DatabaseService } from '../services/databaseService';

const dbService = new DatabaseService();

// User operations
const user = await dbService.createUser({
  username: 'testuser',
  passwordHash: 'hashedpassword',
  email: 'test@example.com',
});

// Server operations
const server = await dbService.createServer({
  serverName: 'myserver',
  version: '1.20.1',
  port: 25565,
  ownerId: user.id,
});

// Configuration operations
const config = await dbService.createConfiguration({
  key: 'max_servers',
  value: '5',
  updatedBy: user.id,
});
```

### Using Prisma Client Directly

```typescript
import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

// Raw queries
const users = await prisma.user.findMany({
  include: {
    servers: true,
  },
});

// Complex queries
const runningServers = await prisma.server.findMany({
  where: {
    status: 'Running',
    owner: {
      isActive: true,
    },
  },
  include: {
    owner: true,
  },
});
```

## Data Validation

The application uses **Zod** schemas for data validation:

```typescript
import { CreateUserSchema, UpdateServerSchema } from '../schemas/database';

// Validate user creation
const userData = CreateUserSchema.parse({
  username: 'testuser',
  passwordHash: 'hashedpassword',
  email: 'test@example.com',
});

// Validate server update
const serverData = UpdateServerSchema.parse({
  status: 'Running',
  pid: 12345,
});
```

## Backup and Restore

### Creating Backups

```bash
# Create a backup
npm run db:backup

# The backup will be saved to: backups/database-backup-YYYY-MM-DDTHH-mm-ss-sssZ.db
```

### Restoring Backups

```bash
# List available backups
npm run db:restore

# Restore from a specific backup
npm run db:restore database-backup-2025-01-05T10-30-00-000Z.db
```

## Testing

### Database Tests

```bash
# Run comprehensive database tests
npm run test:db
```

The test suite includes:
- Connection testing
- User operations (CRUD)
- Server operations (CRUD)
- Configuration operations (CRUD)
- Database statistics
- Data integrity checks

### Test Data

The database is seeded with:
- Default admin user (`admin` / `admin123`)
- Sample server configuration
- Default system configurations

## Migration from Flask

If migrating from the existing Flask database:

```bash
# Ensure Flask database exists at: ../instance/minecraft_manager.db
npm run migrate:flask
```

The migration script will:
1. Connect to both databases
2. Migrate users, servers, and configurations
3. Preserve all relationships and data
4. Handle data type conversions

## Production Considerations

### PostgreSQL Setup

For production, update the `DATABASE_URL` to use PostgreSQL:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/mcservermanager"
```

### Performance Optimization

1. **Indexes**: The schema includes strategic indexes for common queries
2. **Connection Pooling**: Prisma handles connection pooling automatically
3. **Query Optimization**: Use `include` and `select` to optimize queries
4. **Pagination**: Use the pagination utilities for large datasets

### Security

1. **Environment Variables**: Never commit database credentials
2. **Input Validation**: All inputs are validated using Zod schemas
3. **SQL Injection**: Prisma prevents SQL injection attacks
4. **Access Control**: Implement proper authentication and authorization

## Troubleshooting

### Common Issues

1. **Database Locked**: Ensure no other processes are using the database
2. **Migration Failures**: Check for data conflicts and foreign key constraints
3. **Connection Issues**: Verify `DATABASE_URL` and database accessibility
4. **Permission Errors**: Ensure proper file permissions for SQLite database

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=prisma:*
```

### Database Studio

Use Prisma Studio for visual database management:

```bash
npm run db:studio
```

## Monitoring

### Health Checks

The database includes health check endpoints:

- `GET /healthz` - Basic health check
- `GET /readyz` - Readiness check (includes database)
- `GET /live` - Liveness check

### Statistics

Get database statistics:

```typescript
const stats = await dbService.getDatabaseStats();
console.log(stats);
// {
//   totalUsers: 10,
//   activeUsers: 8,
//   totalServers: 5,
//   runningServers: 2,
//   totalConfigurations: 15,
//   databaseSize: 1024000
// }
```

## Best Practices

1. **Always use transactions** for multi-table operations
2. **Validate input data** using Zod schemas
3. **Handle errors gracefully** with proper error messages
4. **Use pagination** for large datasets
5. **Create backups regularly** before major changes
6. **Test migrations** in development before production
7. **Monitor database performance** and optimize queries
8. **Keep schema changes backward compatible** when possible

## Support

For database-related issues:

1. Check the logs for detailed error messages
2. Verify environment configuration
3. Test database connectivity
4. Review migration history
5. Check for data integrity issues

The database setup is designed to be robust, scalable, and maintainable for the Minecraft Server Manager application.
