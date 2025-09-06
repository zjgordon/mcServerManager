import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ValidationErrorSchema } from '../schemas';

// Enhanced validation middleware that works with Zod schemas
export interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

// Custom validation error class
export class ValidationError extends Error {
  public errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;

  constructor(errors: Array<{ field: string; message: string; code: string }>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Enhanced validateRequest middleware
export const validateRequest = (schemas: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Validate query parameters
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Validate route parameters
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      // Validate headers
      if (schemas.headers) {
        req.headers = schemas.headers.parse(req.headers);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        const validationError = ValidationErrorSchema.parse({
          success: false,
          error: 'Validation failed',
          validationErrors,
        });

        return res.status(400).json(validationError);
      }

      // Handle other errors
      return res.status(500).json({
        success: false,
        error: 'Internal server error during validation',
      });
    }
  };
};

// Schema validation helper
export const validateSchema = <T>(schema: ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      throw new ValidationError(validationErrors);
    }
    throw error;
  }
};

// Safe schema validation (returns result instead of throwing)
export const safeValidateSchema = <T>(schema: ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string; code: string }>;
} => {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return { success: false, errors: validationErrors };
    }
    return { success: false, errors: [{ field: 'unknown', message: 'Unknown validation error', code: 'unknown' }] };
  }
};

// Request validation middleware factory
export const createValidationMiddleware = (schemas: ValidationOptions) => {
  return validateRequest(schemas);
};

// Common validation patterns
export const validateId = (req: Request, res: Response, next: NextFunction) => {
  const idSchema = z.object({
    id: z.string().uuid('Invalid ID format'),
  });

  try {
    req.params = idSchema.parse(req.params);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        validationErrors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });
    }
    next(error);
  }
};

export const validatePagination = (req: Request, res: Response, next: NextFunction) => {
  const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  });

  try {
    req.query = paginationSchema.parse(req.query);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pagination parameters',
        validationErrors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      });
    }
    next(error);
  }
};

// Type-safe request interface
export interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> extends Request {
  body: TBody;
  query: TQuery;
  params: TParams;
}

// Validation middleware for specific route patterns
export const authValidation = {
  login: validateRequest({
    body: z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),
  
  register: validateRequest({
    body: z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string(),
      email: z.string().email('Invalid email format').optional(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    }),
  }),
  
  changePassword: validateRequest({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      confirmNewPassword: z.string(),
    }).refine((data) => data.newPassword === data.confirmNewPassword, {
      message: "New passwords don't match",
      path: ["confirmNewPassword"],
    }),
  }),
};

export const serverValidation = {
  create: validateRequest({
    body: z.object({
      name: z.string().min(1, 'Server name is required'),
      port: z.number().int().min(1).max(65535, 'Invalid port number'),
      version: z.string().min(1, 'Version is required'),
      memory: z.number().int().min(512).max(16384).default(1024),
    }),
  }),
  
  update: validateRequest({
    body: z.object({
      name: z.string().min(1, 'Server name is required').optional(),
      port: z.number().int().min(1).max(65535, 'Invalid port number').optional(),
      version: z.string().min(1, 'Version is required').optional(),
      memory: z.number().int().min(512).max(16384).optional(),
    }),
  }),
  
  command: validateRequest({
    body: z.object({
      command: z.string().min(1, 'Command is required'),
    }),
  }),
};

export const adminValidation = {
  createUser: validateRequest({
    body: z.object({
      username: z.string().min(3, 'Username must be at least 3 characters'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      email: z.string().email('Invalid email format').optional(),
      role: z.enum(['admin', 'user']).default('user'),
    }),
  }),
  
  updateUser: validateRequest({
    body: z.object({
      username: z.string().min(3, 'Username must be at least 3 characters').optional(),
      email: z.string().email('Invalid email format').optional(),
      role: z.enum(['admin', 'user']).optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  
  systemConfig: validateRequest({
    body: z.object({
      maxServers: z.number().int().min(1).max(100).optional(),
      maxMemoryPerServer: z.number().int().min(512).max(16384).optional(),
      sessionTimeout: z.number().int().min(300).max(86400).optional(),
    }),
  }),
};

// Export validation middleware
export const validationMiddleware = {
  validateRequest,
  validateSchema,
  safeValidateSchema,
  createValidationMiddleware,
  validateId,
  validatePagination,
  authValidation,
  serverValidation,
  adminValidation,
};
