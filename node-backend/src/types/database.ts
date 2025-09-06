import { User, Server, Configuration } from '@prisma/client';

// Base types from Prisma
export type { User, Server, Configuration };

// Extended types with relations
export type UserWithServers = User & {
  servers: Server[];
  configurations: Configuration[];
};

export type ServerWithOwner = Server & {
  owner: User;
};

export type ConfigurationWithUser = Configuration & {
  updatedByUser: User | null;
};

// Server status type (validated in application layer)
export type ServerStatus = 'Stopped' | 'Starting' | 'Running' | 'Stopping' | 'Error';

// Server gamemode type
export type ServerGamemode = 'survival' | 'creative' | 'adventure' | 'spectator';

// Server difficulty type
export type ServerDifficulty = 'peaceful' | 'easy' | 'normal' | 'hard';

// Database operation result types
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Database query options
export interface QueryOptions {
  include?: Record<string, boolean>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  where?: Record<string, any>;
}

// User creation/update types
export interface CreateUserData {
  username: string;
  passwordHash: string;
  email?: string;
  isAdmin?: boolean;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  isAdmin?: boolean;
  isActive?: boolean;
  lastLogin?: Date;
}

// Server creation/update types
export interface CreateServerData {
  serverName: string;
  version: string;
  port: number;
  ownerId: number;
  levelSeed?: string;
  gamemode?: ServerGamemode;
  difficulty?: ServerDifficulty;
  hardcore?: boolean;
  pvp?: boolean;
  spawnMonsters?: boolean;
  motd?: string;
  memoryMb?: number;
}

export interface UpdateServerData {
  serverName?: string;
  version?: string;
  port?: number;
  status?: ServerStatus;
  pid?: number;
  levelSeed?: string;
  gamemode?: ServerGamemode;
  difficulty?: ServerDifficulty;
  hardcore?: boolean;
  pvp?: boolean;
  spawnMonsters?: boolean;
  motd?: string;
  memoryMb?: number;
}

// Configuration types
export interface CreateConfigurationData {
  key: string;
  value: string;
  updatedBy?: number;
}

export interface UpdateConfigurationData {
  value: string;
  updatedBy?: number;
}

// Database statistics types
export interface DatabaseStats {
  totalUsers: number;
  activeUsers: number;
  totalServers: number;
  runningServers: number;
  totalConfigurations: number;
  databaseSize: number;
  lastBackup?: Date;
}
