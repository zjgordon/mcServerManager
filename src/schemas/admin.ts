import { z } from 'zod';
import { UserSchema } from './auth';
import { ServerInfoSchema } from './common';

// Admin configuration schemas
export const SystemConfigSchema = z.object({
  maxServers: z.number().int().min(1, 'Max servers must be at least 1').max(100, 'Max servers must be less than 100').default(10),
  maxMemoryPerServer: z.number().int().min(512, 'Max memory per server must be at least 512MB').max(16384, 'Max memory per server must be less than 16GB').default(4096),
  maxPlayersPerServer: z.number().int().min(1, 'Max players per server must be at least 1').max(1000, 'Max players per server must be less than 1000').default(100),
  allowUserServerCreation: z.boolean().default(true),
  requireEmailVerification: z.boolean().default(false),
  sessionTimeout: z.number().int().min(300, 'Session timeout must be at least 5 minutes').max(86400, 'Session timeout must be less than 24 hours').default(3600),
  maxLoginAttempts: z.number().int().min(3, 'Max login attempts must be at least 3').max(20, 'Max login attempts must be less than 20').default(5),
  loginLockoutDuration: z.number().int().min(60, 'Login lockout duration must be at least 1 minute').max(3600, 'Login lockout duration must be less than 1 hour').default(300),
  backupRetentionDays: z.number().int().min(1, 'Backup retention must be at least 1 day').max(365, 'Backup retention must be less than 1 year').default(30),
  autoBackupEnabled: z.boolean().default(true),
  autoBackupInterval: z.number().int().min(3600, 'Auto backup interval must be at least 1 hour').max(86400, 'Auto backup interval must be less than 24 hours').default(21600),
  logRetentionDays: z.number().int().min(1, 'Log retention must be at least 1 day').max(90, 'Log retention must be less than 90 days').default(7),
  enableMetrics: z.boolean().default(true),
  metricsRetentionDays: z.number().int().min(1, 'Metrics retention must be at least 1 day').max(365, 'Metrics retention must be less than 1 year').default(30),
});

export const UpdateSystemConfigSchema = SystemConfigSchema.partial();

// Admin system stats schemas
export const SystemStatsSchema = z.object({
  system: z.object({
    uptime: z.number(),
    memory: z.object({
      total: z.number(),
      used: z.number(),
      free: z.number(),
      percentage: z.number(),
    }),
    cpu: z.object({
      usage: z.number(),
      cores: z.number(),
    }),
    disk: z.object({
      total: z.number(),
      used: z.number(),
      free: z.number(),
      percentage: z.number(),
    }),
  }),
  servers: z.object({
    total: z.number(),
    running: z.number(),
    stopped: z.number(),
    error: z.number(),
    totalMemory: z.number(),
    totalPlayers: z.number(),
  }),
  users: z.object({
    total: z.number(),
    active: z.number(),
    inactive: z.number(),
    admins: z.number(),
  }),
  backups: z.object({
    total: z.number(),
    totalSize: z.number(),
    lastBackup: z.date().optional(),
  }),
  database: z.object({
    size: z.number(),
    connections: z.number(),
    queryTime: z.number().optional(),
  }),
});

export const SystemStatsResponseSchema = z.object({
  success: z.boolean(),
  stats: SystemStatsSchema,
  timestamp: z.date(),
});

// Admin user management schemas (extended from auth.ts)
export const AdminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['username', 'email', 'role', 'isActive', 'lastLogin', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AdminUserResponseSchema = z.object({
  success: z.boolean(),
  user: UserSchema,
});

export const AdminUserListResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Admin server management schemas
export const AdminServerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().min(1).max(100).optional(),
  status: z.enum(['stopped', 'starting', 'running', 'stopping', 'error']).optional(),
  sortBy: z.enum(['name', 'status', 'port', 'version', 'memory', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AdminServerResponseSchema = z.object({
  success: z.boolean(),
  server: ServerInfoSchema,
});

export const AdminServerListResponseSchema = z.object({
  success: z.boolean(),
  servers: z.array(ServerInfoSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Admin backup management schemas
export const AdminBackupListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  serverId: z.string().uuid().optional(),
  search: z.string().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'size', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AdminBackupResponseSchema = z.object({
  success: z.boolean(),
  backup: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    size: z.number(),
    createdAt: z.date(),
    serverId: z.string().uuid(),
    serverName: z.string(),
  }),
});

export const AdminBackupListResponseSchema = z.object({
  success: z.boolean(),
  backups: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().optional(),
    size: z.number(),
    createdAt: z.date(),
    serverId: z.string().uuid(),
    serverName: z.string(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Admin log management schemas
export const AdminLogListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']).optional(),
  source: z.string().min(1).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z.enum(['timestamp', 'level', 'source']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AdminLogResponseSchema = z.object({
  success: z.boolean(),
  log: z.object({
    id: z.string().uuid(),
    timestamp: z.date(),
    level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']),
    message: z.string(),
    source: z.string(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const AdminLogListResponseSchema = z.object({
  success: z.boolean(),
  logs: z.array(z.object({
    id: z.string().uuid(),
    timestamp: z.date(),
    level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']),
    message: z.string(),
    source: z.string(),
    metadata: z.record(z.any()).optional(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Admin maintenance schemas
export const MaintenanceTaskSchema = z.object({
  task: z.enum(['cleanup_logs', 'cleanup_backups', 'optimize_database', 'clear_cache', 'restart_services']),
  force: z.boolean().default(false),
});

export const MaintenanceTaskResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  task: z.string(),
  startedAt: z.date(),
  estimatedDuration: z.number().optional(),
});

// Type exports for TypeScript
export type SystemConfig = z.infer<typeof SystemConfigSchema>;
export type UpdateSystemConfigRequest = z.infer<typeof UpdateSystemConfigSchema>;
export type SystemStats = z.infer<typeof SystemStatsSchema>;
export type SystemStatsResponse = z.infer<typeof SystemStatsResponseSchema>;
export type AdminUserListQuery = z.infer<typeof AdminUserListQuerySchema>;
export type AdminUserResponse = z.infer<typeof AdminUserResponseSchema>;
export type AdminUserListResponse = z.infer<typeof AdminUserListResponseSchema>;
export type AdminServerListQuery = z.infer<typeof AdminServerListQuerySchema>;
export type AdminServerResponse = z.infer<typeof AdminServerResponseSchema>;
export type AdminServerListResponse = z.infer<typeof AdminServerListResponseSchema>;
export type AdminBackupListQuery = z.infer<typeof AdminBackupListQuerySchema>;
export type AdminBackupResponse = z.infer<typeof AdminBackupResponseSchema>;
export type AdminBackupListResponse = z.infer<typeof AdminBackupListResponseSchema>;
export type AdminLogListQuery = z.infer<typeof AdminLogListQuerySchema>;
export type AdminLogResponse = z.infer<typeof AdminLogResponseSchema>;
export type AdminLogListResponse = z.infer<typeof AdminLogListResponseSchema>;
export type MaintenanceTaskRequest = z.infer<typeof MaintenanceTaskSchema>;
export type MaintenanceTaskResponse = z.infer<typeof MaintenanceTaskResponseSchema>;
