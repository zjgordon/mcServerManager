import { z } from 'zod';

// Admin user management schemas (Flask API contract compatible)
export const CreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long'),
  is_admin: z.boolean().optional().default(false)
});

export const UpdateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  is_admin: z.boolean().optional()
});

// Admin system configuration schemas (Flask API contract compatible)
export const SystemConfigSchema = z.object({
  max_total_memory_mb: z.number()
    .int()
    .min(1024, 'Maximum total memory must be at least 1024 MB')
    .optional(),
  default_server_memory_mb: z.number()
    .int()
    .min(512, 'Default server memory must be at least 512 MB')
    .optional(),
  min_server_memory_mb: z.number()
    .int()
    .min(512, 'Minimum server memory must be at least 512 MB')
    .optional(),
  max_server_memory_mb: z.number()
    .int()
    .min(512, 'Maximum server memory must be at least 512 MB')
    .optional()
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
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'user']).optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['username', 'email', 'role', 'isActive', 'lastLogin', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AdminUserResponseSchema = z.object({
  success: z.boolean(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    is_admin: z.boolean(),
  }),
});

export const AdminUserListResponseSchema = z.object({
  success: z.boolean(),
  users: z.array(z.object({
    id: z.number(),
    username: z.string(),
    is_admin: z.boolean(),
    server_count: z.number(),
    total_memory_allocated: z.number(),
    created_at: z.string(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Admin server management schemas
export const AdminServerListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().min(1).max(100).optional(),
  status: z.enum(['stopped', 'starting', 'running', 'stopping', 'error']).optional(),
  sortBy: z.enum(['name', 'status', 'port', 'version', 'memory', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const AdminServerResponseSchema = z.object({
  success: z.boolean(),
  server: z.object({
    id: z.number(),
    server_name: z.string(),
    version: z.string(),
    port: z.number(),
    status: z.string(),
    memory_mb: z.number(),
    owner_id: z.number(),
  }),
});

export const AdminServerListResponseSchema = z.object({
  success: z.boolean(),
  servers: z.array(z.object({
    id: z.number(),
    server_name: z.string(),
    version: z.string(),
    port: z.number(),
    status: z.string(),
    memory_mb: z.number(),
    owner_id: z.number(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

// Admin backup management schemas
export const AdminBackupListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
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
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  level: z.enum(['INFO', 'WARN', 'ERROR', 'DEBUG']).optional(),
  source: z.string().min(1).max(100).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
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
