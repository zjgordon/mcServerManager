import { PrismaClient } from '@prisma/client';
import {
  User,
  Server,
  Configuration,
  UserWithServers,
  ServerWithOwner,
  ConfigurationWithUser,
  CreateUserData,
  UpdateUserData,
  CreateServerData,
  UpdateServerData,
  CreateConfigurationData,
  UpdateConfigurationData,
  PaginationParams,
  PaginatedResult,
  DatabaseStats,
} from '../types/database';
import { getPrismaClient } from '../config/database';
import { logger } from '../config/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  // User operations
  async createUser(data: CreateUserData): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data,
      });
      logger.info(`User created: ${user.username}`);
      return user;
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(`Failed to get user by ID ${id}:`, error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { username },
      });
    } catch (error) {
      logger.error(`Failed to get user by username ${username}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error(`Failed to get user by email ${email}:`, error);
      throw error;
    }
  }

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
      });
      logger.info(`User updated: ${user.username}`);
      return user;
    } catch (error) {
      logger.error(`Failed to update user ${id}:`, error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await this.prisma.user.delete({
        where: { id },
      });
      logger.info(`User deleted: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete user ${id}:`, error);
      throw error;
    }
  }

  async getUsersWithServers(
    pagination: PaginationParams,
  ): Promise<PaginatedResult<UserWithServers>> {
    try {
      const { page, perPage } = pagination;
      const skip = (page - 1) * perPage;

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          skip,
          take: perPage,
          include: {
            servers: true,
            configurations: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count(),
      ]);

      const totalPages = Math.ceil(total / perPage);

      return {
        data: users,
        pagination: {
          page,
          perPage,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error('Failed to get users with servers:', error);
      throw error;
    }
  }

  // Server operations
  async createServer(data: CreateServerData): Promise<Server> {
    try {
      const server = await this.prisma.server.create({
        data,
      });
      logger.info(`Server created: ${server.serverName}`);
      return server;
    } catch (error) {
      logger.error('Failed to create server:', error);
      throw error;
    }
  }

  async getServerById(id: number): Promise<ServerWithOwner | null> {
    try {
      return await this.prisma.server.findUnique({
        where: { id },
        include: {
          owner: true,
        },
      });
    } catch (error) {
      logger.error(`Failed to get server by ID ${id}:`, error);
      throw error;
    }
  }

  async getServerByName(serverName: string): Promise<ServerWithOwner | null> {
    try {
      return await this.prisma.server.findUnique({
        where: { serverName },
        include: {
          owner: true,
        },
      });
    } catch (error) {
      logger.error(`Failed to get server by name ${serverName}:`, error);
      throw error;
    }
  }

  async getServerByPort(port: number): Promise<Server | null> {
    try {
      return await this.prisma.server.findUnique({
        where: { port },
      });
    } catch (error) {
      logger.error(`Failed to get server by port ${port}:`, error);
      throw error;
    }
  }

  async updateServer(id: number, data: UpdateServerData): Promise<Server> {
    try {
      const server = await this.prisma.server.update({
        where: { id },
        data,
      });
      logger.info(`Server updated: ${server.serverName}`);
      return server;
    } catch (error) {
      logger.error(`Failed to update server ${id}:`, error);
      throw error;
    }
  }

  async deleteServer(id: number): Promise<void> {
    try {
      await this.prisma.server.delete({
        where: { id },
      });
      logger.info(`Server deleted: ${id}`);
    } catch (error) {
      logger.error(`Failed to delete server ${id}:`, error);
      throw error;
    }
  }

  async getServersByOwner(
    ownerId: number,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ServerWithOwner>> {
    try {
      const { page, perPage } = pagination;
      const skip = (page - 1) * perPage;

      const [servers, total] = await Promise.all([
        this.prisma.server.findMany({
          where: { ownerId },
          skip,
          take: perPage,
          include: {
            owner: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.server.count({ where: { ownerId } }),
      ]);

      const totalPages = Math.ceil(total / perPage);

      return {
        data: servers,
        pagination: {
          page,
          perPage,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      logger.error(`Failed to get servers by owner ${ownerId}:`, error);
      throw error;
    }
  }

  async getRunningServers(): Promise<Server[]> {
    try {
      return await this.prisma.server.findMany({
        where: { status: 'Running' },
        include: {
          owner: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get running servers:', error);
      throw error;
    }
  }

  // Configuration operations
  async createConfiguration(data: CreateConfigurationData): Promise<Configuration> {
    try {
      const config = await this.prisma.configuration.create({
        data,
      });
      logger.info(`Configuration created: ${config.key}`);
      return config;
    } catch (error) {
      logger.error('Failed to create configuration:', error);
      throw error;
    }
  }

  async getConfigurationByKey(key: string): Promise<Configuration | null> {
    try {
      return await this.prisma.configuration.findUnique({
        where: { key },
      });
    } catch (error) {
      logger.error(`Failed to get configuration by key ${key}:`, error);
      throw error;
    }
  }

  async updateConfiguration(
    key: string,
    data: UpdateConfigurationData,
  ): Promise<Configuration> {
    try {
      const config = await this.prisma.configuration.update({
        where: { key },
        data,
      });
      logger.info(`Configuration updated: ${config.key}`);
      return config;
    } catch (error) {
      logger.error(`Failed to update configuration ${key}:`, error);
      throw error;
    }
  }

  async deleteConfiguration(key: string): Promise<void> {
    try {
      await this.prisma.configuration.delete({
        where: { key },
      });
      logger.info(`Configuration deleted: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete configuration ${key}:`, error);
      throw error;
    }
  }

  async getAllConfigurations(): Promise<ConfigurationWithUser[]> {
    try {
      return await this.prisma.configuration.findMany({
        include: {
          updatedByUser: true,
        },
        orderBy: { key: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get all configurations:', error);
      throw error;
    }
  }

  // Database statistics
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalServers,
        runningServers,
        totalConfigurations,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.server.count(),
        this.prisma.server.count({ where: { status: 'Running' } }),
        this.prisma.configuration.count(),
      ]);

      return {
        totalUsers,
        activeUsers,
        totalServers,
        runningServers,
        totalConfigurations,
        databaseSize: 0, // This would need to be calculated separately
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }
}
