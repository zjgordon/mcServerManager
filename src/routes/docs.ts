import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPISpec, addRoute } from '../config/openapi';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Generate OpenAPI specification
const openApiSpec = generateOpenAPISpec();

// Add route definitions to OpenAPI spec
addRoute({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Health check endpoint',
  description: 'Returns the health status of the application and its services',
  responses: {
    '200': {
      description: 'Health check successful',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/HealthCheck' },
        },
      },
    },
  },
});

addRoute({
  method: 'get',
  path: '/health/ready',
  tags: ['Health'],
  summary: 'Readiness check endpoint',
  description: 'Returns the readiness status of the application',
  responses: {
    '200': {
      description: 'Application is ready',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/HealthCheck' },
        },
      },
    },
    '503': {
      description: 'Application is not ready',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

// Authentication routes
addRoute({
  method: 'post',
  path: '/auth/login',
  tags: ['Authentication'],
  summary: 'User login',
  description: 'Authenticate user and create session',
  request: {
    body: { $ref: '#/components/schemas/LoginRequest' },
  },
  responses: {
    '200': {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/LoginResponse' },
        },
      },
    },
    '400': {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'post',
  path: '/auth/register',
  tags: ['Authentication'],
  summary: 'User registration',
  description: 'Register a new user account',
  request: {
    body: { $ref: '#/components/schemas/RegisterRequest' },
  },
  responses: {
    '201': {
      description: 'Registration successful',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RegisterResponse' },
        },
      },
    },
    '400': {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ValidationError' },
        },
      },
    },
  },
});

addRoute({
  method: 'post',
  path: '/auth/logout',
  tags: ['Authentication'],
  summary: 'User logout',
  description: 'Logout user and destroy session',
  security: [{ sessionAuth: [], csrfToken: [] }],
  responses: {
    '200': {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'get',
  path: '/auth/me',
  tags: ['Authentication'],
  summary: 'Get current user',
  description: 'Get information about the currently authenticated user',
  security: [{ sessionAuth: [], csrfToken: [] }],
  responses: {
    '200': {
      description: 'User information retrieved',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/User' },
        },
      },
    },
    '401': {
      description: 'Unauthorized',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'get',
  path: '/auth/csrf-token',
  tags: ['Authentication'],
  summary: 'Get CSRF token',
  description: 'Get CSRF protection token for forms',
  security: [{ sessionAuth: [] }],
  responses: {
    '200': {
      description: 'CSRF token retrieved',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/CSRFToken' },
        },
      },
    },
  },
});

// Server routes
addRoute({
  method: 'get',
  path: '/servers',
  tags: ['Servers'],
  summary: 'List servers',
  description: 'Get a list of all servers with pagination',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    query: { $ref: '#/components/schemas/PaginationQuery' },
  },
  responses: {
    '200': {
      description: 'Servers retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ServerListResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'post',
  path: '/servers',
  tags: ['Servers'],
  summary: 'Create server',
  description: 'Create a new Minecraft server',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    body: { $ref: '#/components/schemas/CreateServerRequest' },
  },
  responses: {
    '201': {
      description: 'Server created successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ServerResponse' },
        },
      },
    },
    '400': {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ValidationError' },
        },
      },
    },
  },
});

addRoute({
  method: 'get',
  path: '/servers/{id}',
  tags: ['Servers'],
  summary: 'Get server',
  description: 'Get information about a specific server',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    params: { $ref: '#/components/schemas/IdParams' },
  },
  responses: {
    '200': {
      description: 'Server information retrieved',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ServerResponse' },
        },
      },
    },
    '404': {
      description: 'Server not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'put',
  path: '/servers/{id}',
  tags: ['Servers'],
  summary: 'Update server',
  description: 'Update server configuration',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    params: { $ref: '#/components/schemas/IdParams' },
    body: { $ref: '#/components/schemas/UpdateServerRequest' },
  },
  responses: {
    '200': {
      description: 'Server updated successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ServerResponse' },
        },
      },
    },
    '400': {
      description: 'Validation error',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ValidationError' },
        },
      },
    },
    '404': {
      description: 'Server not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'delete',
  path: '/servers/{id}',
  tags: ['Servers'],
  summary: 'Delete server',
  description: 'Delete a server and all its data',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    params: { $ref: '#/components/schemas/IdParams' },
  },
  responses: {
    '200': {
      description: 'Server deleted successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' },
        },
      },
    },
    '404': {
      description: 'Server not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'post',
  path: '/servers/{id}/start',
  tags: ['Servers'],
  summary: 'Start server',
  description: 'Start a Minecraft server',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    params: { $ref: '#/components/schemas/IdParams' },
  },
  responses: {
    '200': {
      description: 'Server start command sent',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' },
        },
      },
    },
    '404': {
      description: 'Server not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'post',
  path: '/servers/{id}/stop',
  tags: ['Servers'],
  summary: 'Stop server',
  description: 'Stop a Minecraft server',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    params: { $ref: '#/components/schemas/IdParams' },
  },
  responses: {
    '200': {
      description: 'Server stop command sent',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SuccessResponse' },
        },
      },
    },
    '404': {
      description: 'Server not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'get',
  path: '/servers/{id}/status',
  tags: ['Servers'],
  summary: 'Get server status',
  description: 'Get detailed status information about a server',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    params: { $ref: '#/components/schemas/IdParams' },
  },
  responses: {
    '200': {
      description: 'Server status retrieved',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ServerStatusResponse' },
        },
      },
    },
    '404': {
      description: 'Server not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

// Admin routes
addRoute({
  method: 'get',
  path: '/admin/users',
  tags: ['Admin'],
  summary: 'List users',
  description: 'Get a list of all users (admin only)',
  security: [{ sessionAuth: [], csrfToken: [] }],
  request: {
    query: { $ref: '#/components/schemas/AdminUserListQuery' },
  },
  responses: {
    '200': {
      description: 'Users retrieved successfully',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/AdminUserListResponse' },
        },
      },
    },
    '403': {
      description: 'Forbidden - Admin access required',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

addRoute({
  method: 'get',
  path: '/admin/stats',
  tags: ['Admin'],
  summary: 'Get system statistics',
  description: 'Get comprehensive system statistics (admin only)',
  security: [{ sessionAuth: [], csrfToken: [] }],
  responses: {
    '200': {
      description: 'System statistics retrieved',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SystemStatsResponse' },
        },
      },
    },
    '403': {
      description: 'Forbidden - Admin access required',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  },
});

// Serve OpenAPI JSON
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(openApiSpec);
});

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openApiSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Minecraft Server Manager API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
  },
}));

export default router;
