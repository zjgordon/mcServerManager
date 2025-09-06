import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  // Common schemas
  IdSchema,
  PaginationSchema,
  SortSchema,
  SearchSchema,
  SuccessResponseSchema,
  ErrorResponseSchema,
  ValidationErrorSchema,
  HealthCheckSchema,
  ServerInfoSchema,
  UserRoleSchema,
  
  // Auth schemas
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  ResetPasswordConfirmSchema,
  UserSchema,
  LoginResponseSchema,
  RegisterResponseSchema,
  SessionValidationSchema,
  CSRFTokenSchema,
  CreateUserSchema,
  UpdateUserSchema,
  UserListResponseSchema,
  
  // Server schemas
  CreateServerSchema,
  UpdateServerSchema,
  ServerCommandSchema,
  ServerBackupSchema,
  ServerResponseSchema,
  ServerListResponseSchema,
  ServerStatusResponseSchema,
  ServerLogsResponseSchema,
  ServerBackupResponseSchema,
  ServerBackupListResponseSchema,
  ServerVersionSchema,
  ServerVersionsResponseSchema,
  ServerMemoryUsageSchema,
  
  // Admin schemas
  SystemConfigSchema,
  UpdateSystemConfigSchema,
  SystemStatsSchema,
  SystemStatsResponseSchema,
  AdminUserListQuerySchema,
  AdminUserResponseSchema,
  AdminUserListResponseSchema,
  AdminServerListQuerySchema,
  AdminServerResponseSchema,
  AdminServerListResponseSchema,
  AdminBackupListQuerySchema,
  AdminBackupResponseSchema,
  AdminBackupListResponseSchema,
  AdminLogListQuerySchema,
  AdminLogResponseSchema,
  AdminLogListResponseSchema,
  MaintenanceTaskSchema,
  MaintenanceTaskResponseSchema,
} from '../schemas';

// Create OpenAPI registry
const registry = new OpenAPIRegistry();

// Register common schemas
registry.register('IdParams', IdSchema);
registry.register('PaginationQuery', PaginationSchema);
registry.register('SortQuery', SortSchema);
registry.register('SearchQuery', SearchSchema);
registry.register('SuccessResponse', SuccessResponseSchema);
registry.register('ErrorResponse', ErrorResponseSchema);
registry.register('ValidationError', ValidationErrorSchema);
registry.register('HealthCheck', HealthCheckSchema);
registry.register('ServerInfo', ServerInfoSchema);
registry.register('UserRole', UserRoleSchema);

// Register auth schemas
registry.register('LoginRequest', LoginSchema);
registry.register('RegisterRequest', RegisterSchema);
registry.register('ChangePasswordRequest', ChangePasswordSchema);
registry.register('ResetPasswordRequest', ResetPasswordSchema);
registry.register('ResetPasswordConfirmRequest', ResetPasswordConfirmSchema);
registry.register('User', UserSchema);
registry.register('LoginResponse', LoginResponseSchema);
registry.register('RegisterResponse', RegisterResponseSchema);
registry.register('SessionValidation', SessionValidationSchema);
registry.register('CSRFToken', CSRFTokenSchema);
registry.register('CreateUserRequest', CreateUserSchema);
registry.register('UpdateUserRequest', UpdateUserSchema);
registry.register('UserListResponse', UserListResponseSchema);

// Register server schemas
registry.register('CreateServerRequest', CreateServerSchema);
registry.register('UpdateServerRequest', UpdateServerSchema);
registry.register('ServerCommandRequest', ServerCommandSchema);
registry.register('ServerBackupRequest', ServerBackupSchema);
registry.register('ServerResponse', ServerResponseSchema);
registry.register('ServerListResponse', ServerListResponseSchema);
registry.register('ServerStatusResponse', ServerStatusResponseSchema);
registry.register('ServerLogsResponse', ServerLogsResponseSchema);
registry.register('ServerBackupResponse', ServerBackupResponseSchema);
registry.register('ServerBackupListResponse', ServerBackupListResponseSchema);
registry.register('ServerVersion', ServerVersionSchema);
registry.register('ServerVersionsResponse', ServerVersionsResponseSchema);
registry.register('ServerMemoryUsage', ServerMemoryUsageSchema);

// Register admin schemas
registry.register('SystemConfig', SystemConfigSchema);
registry.register('UpdateSystemConfigRequest', UpdateSystemConfigSchema);
registry.register('SystemStats', SystemStatsSchema);
registry.register('SystemStatsResponse', SystemStatsResponseSchema);
registry.register('AdminUserListQuery', AdminUserListQuerySchema);
registry.register('AdminUserResponse', AdminUserResponseSchema);
registry.register('AdminUserListResponse', AdminUserListResponseSchema);
registry.register('AdminServerListQuery', AdminServerListQuerySchema);
registry.register('AdminServerResponse', AdminServerResponseSchema);
registry.register('AdminServerListResponse', AdminServerListResponseSchema);
registry.register('AdminBackupListQuery', AdminBackupListQuerySchema);
registry.register('AdminBackupResponse', AdminBackupResponseSchema);
registry.register('AdminBackupListResponse', AdminBackupListResponseSchema);
registry.register('AdminLogListQuery', AdminLogListQuerySchema);
registry.register('AdminLogResponse', AdminLogResponseSchema);
registry.register('AdminLogListResponse', AdminLogListResponseSchema);
registry.register('MaintenanceTaskRequest', MaintenanceTaskSchema);
registry.register('MaintenanceTaskResponse', MaintenanceTaskResponseSchema);

// Generate OpenAPI specification
const generator = new OpenApiGeneratorV3(registry.definitions);

export const openApiSpec = generator.generateDocument({
  openapi: '3.0.0',
  info: {
    version: '2.0.0',
    title: 'Minecraft Server Manager API',
    description: 'A comprehensive API for managing Minecraft servers with real-time monitoring, user management, and administrative controls.',
    contact: {
      name: 'Minecraft Server Manager',
      email: 'support@mcservermanager.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:5001/api/v1',
      description: 'Development server',
    },
    {
      url: 'https://api.mcservermanager.com/api/v1',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Servers',
      description: 'Minecraft server management and monitoring',
    },
    {
      name: 'Admin',
      description: 'Administrative functions and system management',
    },
    {
      name: 'Health',
      description: 'System health and monitoring endpoints',
    },
  ],
  components: {
    securitySchemes: {
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session-based authentication using cookies',
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token',
        description: 'CSRF protection token',
      },
    },
  },
  security: [
    {
      sessionAuth: [],
      csrfToken: [],
    },
  ],
});

// Export the registry for use in route definitions
export { registry };

// Helper function to add route definitions
export const addRoute = (route: {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  tags: string[];
  summary: string;
  description?: string;
  request?: {
    params?: z.ZodSchema;
    query?: z.ZodSchema;
    body?: z.ZodSchema;
  };
  responses: {
    [statusCode: string]: {
      description: string;
      content?: {
        [contentType: string]: {
          schema: z.ZodSchema;
        };
      };
    };
  };
  security?: Array<{ [key: string]: string[] }>;
}) => {
  registry.registerPath(route);
};

// Helper function to generate OpenAPI spec with routes
export const generateOpenAPISpec = () => {
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      version: '2.0.0',
      title: 'Minecraft Server Manager API',
      description: 'A comprehensive API for managing Minecraft servers with real-time monitoring, user management, and administrative controls.',
      contact: {
        name: 'Minecraft Server Manager',
        email: 'support@mcservermanager.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5001/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.mcservermanager.com/api/v1',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
      },
      {
        name: 'Servers',
        description: 'Minecraft server management and monitoring',
      },
      {
        name: 'Admin',
        description: 'Administrative functions and system management',
      },
      {
        name: 'Health',
        description: 'System health and monitoring endpoints',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using cookies',
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'CSRF protection token',
        },
      },
    },
    security: [
      {
        sessionAuth: [],
        csrfToken: [],
      },
    ],
  });
};
