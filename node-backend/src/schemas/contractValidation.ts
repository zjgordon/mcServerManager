import { z } from 'zod';

// Common validation schemas for contract routes
export const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'ID must be a number').transform(Number),
});

export const UserIdParamSchema = z.object({
  user_id: z.string().regex(/^\d+$/, 'User ID must be a number').transform(Number),
});

export const ServerIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Server ID must be a number').transform(Number),
});

// Authentication contract validation schemas
export const AuthLoginContractSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const AuthRegisterContractSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  email: z.string().email('Invalid email format').optional(),
});

export const AuthChangePasswordContractSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Password confirmation is required'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

// Server management contract validation schemas
export const ServerCreateContractSchema = z.object({
  server_name: z.string()
    .min(1, 'Server name is required')
    .max(100, 'Server name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, underscores, and hyphens'),
  version: z.string().min(1, 'Version is required'),
  port: z.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be less than 65536'),
  memory_mb: z.number().int().min(512, 'Memory must be at least 512MB').max(16384, 'Memory must be less than 16GB').default(1024),
  motd: z.string().max(100, 'MOTD must be less than 100 characters').optional(),
  max_players: z.number().int().min(1, 'Max players must be at least 1').max(1000, 'Max players must be less than 1000').default(20),
  difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']).default('normal'),
  gamemode: z.enum(['survival', 'creative', 'adventure', 'spectator']).default('survival'),
  pvp: z.boolean().default(true),
  spawn_monsters: z.boolean().default(true),
  hardcore: z.boolean().default(false),
});

export const ServerUpdateContractSchema = z.object({
  server_name: z.string()
    .min(1, 'Server name is required')
    .max(100, 'Server name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Server name can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  version: z.string().min(1, 'Version is required').optional(),
  port: z.number().int().min(1, 'Port must be at least 1').max(65535, 'Port must be less than 65536').optional(),
  memory_mb: z.number().int().min(512, 'Memory must be at least 512MB').max(16384, 'Memory must be less than 16GB').optional(),
  motd: z.string().max(100, 'MOTD must be less than 100 characters').optional(),
  max_players: z.number().int().min(1, 'Max players must be at least 1').max(1000, 'Max players must be less than 1000').optional(),
  difficulty: z.enum(['peaceful', 'easy', 'normal', 'hard']).optional(),
  gamemode: z.enum(['survival', 'creative', 'adventure', 'spectator']).optional(),
  pvp: z.boolean().optional(),
  spawn_monsters: z.boolean().optional(),
  hardcore: z.boolean().optional(),
});

export const ServerBackupContractSchema = z.object({
  name: z.string().min(1, 'Backup name is required').max(100, 'Backup name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

// Admin contract validation schemas
export const AdminCreateUserContractSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters'),
  is_admin: z.boolean().optional().default(false),
});

export const AdminUpdateUserContractSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  is_admin: z.boolean().optional(),
});

export const AdminSystemConfigContractSchema = z.object({
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
    .optional(),
});

// Query parameter validation schemas
export const PaginationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
});

export const ServerListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
  search: z.string().optional(),
  status: z.enum(['stopped', 'starting', 'running', 'stopping', 'error']).optional(),
  sort_by: z.enum(['name', 'status', 'port', 'version', 'memory', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const UserListQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).default('10'),
  search: z.string().optional(),
  is_admin: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
  sort_by: z.enum(['username', 'is_admin', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

// Response validation schemas for contract testing
export const AuthResponseContractSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    is_admin: z.boolean(),
  }).optional(),
  csrf_token: z.string().optional(),
});

export const ServerResponseContractSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  server: z.object({
    id: z.number(),
    server_name: z.string(),
    version: z.string(),
    port: z.number(),
    status: z.string(),
    memory_mb: z.number(),
    owner_id: z.number(),
    created_at: z.string(),
  }).optional(),
});

export const ServerListResponseContractSchema = z.object({
  success: z.boolean(),
  servers: z.array(z.object({
    id: z.number(),
    server_name: z.string(),
    version: z.string(),
    port: z.number(),
    status: z.string(),
    memory_mb: z.number(),
    owner_id: z.number(),
    created_at: z.string(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export const UserResponseContractSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.number(),
    username: z.string(),
    is_admin: z.boolean(),
    server_count: z.number(),
    total_memory_allocated: z.number(),
    created_at: z.string(),
  }).optional(),
});

export const UserListResponseContractSchema = z.object({
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
    total_pages: z.number(),
  }),
});

export const SystemConfigResponseContractSchema = z.object({
  success: z.boolean(),
  config: z.object({
    max_total_memory_mb: z.number(),
    default_server_memory_mb: z.number(),
    min_server_memory_mb: z.number(),
    max_server_memory_mb: z.number(),
  }),
});

export const SystemStatsResponseContractSchema = z.object({
  success: z.boolean(),
  stats: z.object({
    total_users: z.number(),
    total_servers: z.number(),
    running_servers: z.number(),
    total_memory_allocated: z.number(),
    memory_usage_summary: z.object({
      total: z.number(),
      used: z.number(),
      free: z.number(),
      percentage: z.number(),
    }),
  }),
});

// Error response validation schema
export const ErrorResponseContractSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
  details: z.any().optional(),
});

// Type exports for TypeScript
export type IdParam = z.infer<typeof IdParamSchema>;
export type UserIdParam = z.infer<typeof UserIdParamSchema>;
export type ServerIdParam = z.infer<typeof ServerIdParamSchema>;
export type AuthLoginContract = z.infer<typeof AuthLoginContractSchema>;
export type AuthRegisterContract = z.infer<typeof AuthRegisterContractSchema>;
export type AuthChangePasswordContract = z.infer<typeof AuthChangePasswordContractSchema>;
export type ServerCreateContract = z.infer<typeof ServerCreateContractSchema>;
export type ServerUpdateContract = z.infer<typeof ServerUpdateContractSchema>;
export type ServerBackupContract = z.infer<typeof ServerBackupContractSchema>;
export type AdminCreateUserContract = z.infer<typeof AdminCreateUserContractSchema>;
export type AdminUpdateUserContract = z.infer<typeof AdminUpdateUserContractSchema>;
export type AdminSystemConfigContract = z.infer<typeof AdminSystemConfigContractSchema>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ServerListQuery = z.infer<typeof ServerListQuerySchema>;
export type UserListQuery = z.infer<typeof UserListQuerySchema>;
export type AuthResponseContract = z.infer<typeof AuthResponseContractSchema>;
export type ServerResponseContract = z.infer<typeof ServerResponseContractSchema>;
export type ServerListResponseContract = z.infer<typeof ServerListResponseContractSchema>;
export type UserResponseContract = z.infer<typeof UserResponseContractSchema>;
export type UserListResponseContract = z.infer<typeof UserListResponseContractSchema>;
export type SystemConfigResponseContract = z.infer<typeof SystemConfigResponseContractSchema>;
export type SystemStatsResponseContract = z.infer<typeof SystemStatsResponseContractSchema>;
export type ErrorResponseContract = z.infer<typeof ErrorResponseContractSchema>;
