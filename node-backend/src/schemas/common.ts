import { z } from 'zod';

// Common validation schemas used across multiple endpoints

export const IdSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
});

export const SortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const SearchSchema = z.object({
  search: z.string().min(1).max(100).optional(),
});

export const TimestampSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Common response schemas
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.boolean().default(false),
  error: z.string(),
  details: z.any().optional(),
  code: z.string().optional(),
});

export const ValidationErrorSchema = z.object({
  success: z.boolean().default(false),
  error: z.string(),
  validationErrors: z.array(z.object({
    field: z.string(),
    message: z.string(),
    code: z.string(),
  })),
});

// Health check schemas
export const HealthCheckSchema = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: z.date(),
  version: z.string(),
  uptime: z.number(),
  services: z.record(z.object({
    status: z.enum(['healthy', 'unhealthy', 'degraded']),
    message: z.string().optional(),
    responseTime: z.number().optional(),
  })),
});

// Server status schemas
export const ServerStatusSchema = z.enum(['stopped', 'starting', 'running', 'stopping', 'error']);

export const ServerInfoSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  status: ServerStatusSchema,
  port: z.number().int().min(1).max(65535),
  version: z.string().optional(),
  memory: z.number().int().min(0).optional(),
  players: z.object({
    online: z.number().int().min(0),
    max: z.number().int().min(0),
  }).optional(),
  lastStarted: z.date().optional(),
  lastStopped: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// User role schema
export const UserRoleSchema = z.enum(['admin', 'user']);

// Common query parameters
export const CommonQuerySchema = PaginationSchema.merge(SortSchema).merge(SearchSchema);

// Type exports for TypeScript
export type IdParams = z.infer<typeof IdSchema>;
export type PaginationQuery = z.infer<typeof PaginationSchema>;
export type SortQuery = z.infer<typeof SortSchema>;
export type SearchQuery = z.infer<typeof SearchSchema>;
export type CommonQuery = z.infer<typeof CommonQuerySchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
export type ServerStatus = z.infer<typeof ServerStatusSchema>;
export type ServerInfo = z.infer<typeof ServerInfoSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
