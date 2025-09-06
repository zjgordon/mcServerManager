import { z } from 'zod';
import { ServerStatusSchema, ServerInfoSchema } from './common';

// Server creation and update schemas
export const CreateServerSchema = z.object({
  name: z.string()
    .min(1, 'Server name is required')
    .max(100, 'Server name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, underscores, and hyphens'),
  port: z.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be less than 65536'),
  version: z.string().min(1, 'Version is required').max(50, 'Version must be less than 50 characters'),
  memory: z.number().int().min(512, 'Memory must be at least 512MB').max(16384, 'Memory must be less than 16GB').default(1024),
  javaArgs: z.string().max(1000, 'Java arguments must be less than 1000 characters').optional(),
  worldName: z.string().max(100, 'World name must be less than 100 characters').optional(),
  motd: z.string().max(100, 'MOTD must be less than 100 characters').optional(),
  maxPlayers: z.number().int().min(1, 'Max players must be at least 1').max(1000, 'Max players must be less than 1000').default(20),
  difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']).default('normal'),
  gamemode: z.enum(['survival', 'creative', 'adventure', 'spectator']).default('survival'),
  pvp: z.boolean().default(true),
  allowNether: z.boolean().default(true),
  allowEnd: z.boolean().default(true),
  spawnProtection: z.number().int().min(0, 'Spawn protection must be at least 0').max(1000, 'Spawn protection must be less than 1000').default(16),
  viewDistance: z.number().int().min(3, 'View distance must be at least 3').max(32, 'View distance must be less than 32').default(10),
  simulationDistance: z.number().int().min(3, 'Simulation distance must be at least 3').max(32, 'Simulation distance must be less than 32').default(10),
  enableCommandBlock: z.boolean().default(false),
  enableRcon: z.boolean().default(false),
  rconPort: z.number().int().min(1, 'RCON port must be at least 1').max(65535, 'RCON port must be less than 65536').optional(),
  rconPassword: z.string().min(8, 'RCON password must be at least 8 characters').max(128, 'RCON password must be less than 128 characters').optional(),
});

export const UpdateServerSchema = z.object({
  name: z.string()
    .min(1, 'Server name is required')
    .max(100, 'Server name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  port: z.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be less than 65536').optional(),
  version: z.string().min(1, 'Version is required').max(50, 'Version must be less than 50 characters').optional(),
  memory: z.number().int().min(512, 'Memory must be at least 512MB').max(16384, 'Memory must be less than 16GB').optional(),
  javaArgs: z.string().max(1000, 'Java arguments must be less than 1000 characters').optional(),
  worldName: z.string().max(100, 'World name must be less than 100 characters').optional(),
  motd: z.string().max(100, 'MOTD must be less than 100 characters').optional(),
  maxPlayers: z.number().int().min(1, 'Max players must be at least 1').max(1000, 'Max players must be less than 1000').optional(),
  difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']).optional(),
  gamemode: z.enum(['survival', 'creative', 'adventure', 'spectator']).optional(),
  pvp: z.boolean().optional(),
  allowNether: z.boolean().optional(),
  allowEnd: z.boolean().optional(),
  spawnProtection: z.number().int().min(0, 'Spawn protection must be at least 0').max(1000, 'Spawn protection must be less than 1000').optional(),
  viewDistance: z.number().int().min(3, 'View distance must be at least 3').max(32, 'View distance must be less than 32').optional(),
  simulationDistance: z.number().int().min(3, 'Simulation distance must be at least 3').max(32, 'Simulation distance must be less than 32').optional(),
  enableCommandBlock: z.boolean().optional(),
  enableRcon: z.boolean().optional(),
  rconPort: z.number().int().min(1, 'RCON port must be at least 1').max(65535, 'RCON port must be less than 65536').optional(),
  rconPassword: z.string().min(8, 'RCON password must be at least 8 characters').max(128, 'RCON password must be less than 128 characters').optional(),
});

// Server operation schemas
export const ServerCommandSchema = z.object({
  command: z.string().min(1, 'Command is required').max(1000, 'Command must be less than 1000 characters'),
});

export const ServerBackupSchema = z.object({
  name: z.string().min(1, 'Backup name is required').max(100, 'Backup name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  includeLogs: z.boolean().default(false),
  includeConfig: z.boolean().default(true),
});

// Server response schemas
export const ServerResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  server: ServerInfoSchema,
});

export const ServerListResponseSchema = z.object({
  success: z.boolean(),
  servers: z.array(ServerInfoSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const ServerStatusResponseSchema = z.object({
  success: z.boolean(),
  status: ServerStatusSchema,
  message: z.string(),
  uptime: z.number().optional(),
  memory: z.object({
    used: z.number(),
    max: z.number(),
    percentage: z.number(),
  }).optional(),
  players: z.object({
    online: z.number(),
    max: z.number(),
    list: z.array(z.string()).optional(),
  }).optional(),
  tps: z.number().optional(),
  world: z.object({
    name: z.string(),
    size: z.number(),
    seed: z.string().optional(),
  }).optional(),
});

export const ServerLogsResponseSchema = z.object({
  success: z.boolean(),
  logs: z.array(z.object({
    timestamp: z.date(),
    level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']),
    message: z.string(),
    source: z.string().optional(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const ServerBackupResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  backup: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    size: z.number(),
    createdAt: z.date(),
    serverId: z.string().uuid(),
  }),
});

export const ServerBackupListResponseSchema = z.object({
  success: z.boolean(),
  backups: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    size: z.number(),
    createdAt: z.date(),
    serverId: z.string().uuid(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Server version schemas
export const ServerVersionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['release', 'snapshot', 'old_beta', 'old_alpha']),
  url: z.string().url(),
});

export const ServerVersionsResponseSchema = z.object({
  success: z.boolean(),
  versions: z.array(ServerVersionSchema),
  latest: z.string(),
  recommended: z.string(),
});

// Server memory usage schema
export const ServerMemoryUsageSchema = z.object({
  serverId: z.string().uuid(),
  memory: z.object({
    used: z.number(),
    max: z.number(),
    percentage: z.number(),
  }),
  timestamp: z.date(),
});

// Type exports for TypeScript
export type CreateServerRequest = z.infer<typeof CreateServerSchema>;
export type UpdateServerRequest = z.infer<typeof UpdateServerSchema>;
export type ServerCommandRequest = z.infer<typeof ServerCommandSchema>;
export type ServerBackupRequest = z.infer<typeof ServerBackupSchema>;
export type ServerResponse = z.infer<typeof ServerResponseSchema>;
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>;
export type ServerStatusResponse = z.infer<typeof ServerStatusResponseSchema>;
export type ServerLogsResponse = z.infer<typeof ServerLogsResponseSchema>;
export type ServerBackupResponse = z.infer<typeof ServerBackupResponseSchema>;
export type ServerBackupListResponse = z.infer<typeof ServerBackupListResponseSchema>;
export type ServerVersion = z.infer<typeof ServerVersionSchema>;
export type ServerVersionsResponse = z.infer<typeof ServerVersionsResponseSchema>;
export type ServerMemoryUsage = z.infer<typeof ServerMemoryUsageSchema>;
