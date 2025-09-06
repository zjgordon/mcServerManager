import { z } from 'zod';

// Server status validation
export const ServerStatusSchema = z.enum(['Stopped', 'Starting', 'Running', 'Stopping', 'Error']);

// Server gamemode validation
export const ServerGamemodeSchema = z.enum(['survival', 'creative', 'adventure', 'spectator']);

// Server difficulty validation
export const ServerDifficultySchema = z.enum(['peaceful', 'easy', 'normal', 'hard']);

// User schemas
export const CreateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  passwordHash: z.string().min(1, 'Password hash is required'),
  email: z.string().email().optional(),
  isAdmin: z.boolean().default(false),
});

export const UpdateUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  email: z.string().email().optional(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
  lastLogin: z.date().optional(),
});

export const UserResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().nullable(),
  isAdmin: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.date(),
  lastLogin: z.date().nullable(),
});

// Server schemas
export const CreateServerSchema = z.object({
  serverName: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, underscores, and hyphens'),
  version: z.string().min(1).max(50),
  port: z.number().int().min(1024).max(65535),
  ownerId: z.number().int().positive(),
  levelSeed: z.string().max(100).optional(),
  gamemode: ServerGamemodeSchema.default('survival'),
  difficulty: ServerDifficultySchema.default('normal'),
  hardcore: z.boolean().default(false),
  pvp: z.boolean().default(true),
  spawnMonsters: z.boolean().default(true),
  motd: z.string().max(255).optional(),
  memoryMb: z.number().int().min(512).max(8192).default(1024),
});

export const UpdateServerSchema = z.object({
  serverName: z.string().min(3).max(100).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  version: z.string().min(1).max(50).optional(),
  port: z.number().int().min(1024).max(65535).optional(),
  status: ServerStatusSchema.optional(),
  pid: z.number().int().positive().optional(),
  levelSeed: z.string().max(100).optional(),
  gamemode: ServerGamemodeSchema.optional(),
  difficulty: ServerDifficultySchema.optional(),
  hardcore: z.boolean().optional(),
  pvp: z.boolean().optional(),
  spawnMonsters: z.boolean().optional(),
  motd: z.string().max(255).optional(),
  memoryMb: z.number().int().min(512).max(8192).optional(),
});

export const ServerResponseSchema = z.object({
  id: z.number(),
  serverName: z.string(),
  version: z.string(),
  port: z.number(),
  status: z.string(),
  pid: z.number().nullable(),
  levelSeed: z.string().nullable(),
  gamemode: z.string(),
  difficulty: z.string(),
  hardcore: z.boolean(),
  pvp: z.boolean(),
  spawnMonsters: z.boolean(),
  motd: z.string().nullable(),
  memoryMb: z.number(),
  ownerId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Configuration schemas
export const CreateConfigurationSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_.-]+$/, 'Configuration key can only contain letters, numbers, underscores, dots, and hyphens'),
  value: z.string().min(1),
  updatedBy: z.number().int().positive().optional(),
});

export const UpdateConfigurationSchema = z.object({
  value: z.string().min(1),
  updatedBy: z.number().int().positive().optional(),
});

export const ConfigurationResponseSchema = z.object({
  id: z.number(),
  key: z.string(),
  value: z.string(),
  updatedAt: z.date(),
  updatedBy: z.number().nullable(),
});

// Pagination schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
});

// Query schemas
export const UserQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
});

export const ServerQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  status: ServerStatusSchema.optional(),
  ownerId: z.number().int().positive().optional(),
  version: z.string().optional(),
});

// Database operation schemas
export const DatabaseResultSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export const PaginatedResultSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    perPage: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Database statistics schema
export const DatabaseStatsSchema = z.object({
  totalUsers: z.number(),
  activeUsers: z.number(),
  totalServers: z.number(),
  runningServers: z.number(),
  totalConfigurations: z.number(),
  databaseSize: z.number(),
  lastBackup: z.date().optional(),
});

// Type exports
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;

export type CreateServerInput = z.infer<typeof CreateServerSchema>;
export type UpdateServerInput = z.infer<typeof UpdateServerSchema>;
export type ServerResponse = z.infer<typeof ServerResponseSchema>;

export type CreateConfigurationInput = z.infer<typeof CreateConfigurationSchema>;
export type UpdateConfigurationInput = z.infer<typeof UpdateConfigurationSchema>;
export type ConfigurationResponse = z.infer<typeof ConfigurationResponseSchema>;

export type PaginationInput = z.infer<typeof PaginationSchema>;
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
export type ServerQueryInput = z.infer<typeof ServerQuerySchema>;

export type DatabaseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type DatabaseStats = z.infer<typeof DatabaseStatsSchema>;
