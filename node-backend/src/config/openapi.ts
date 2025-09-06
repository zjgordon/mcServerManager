import { z } from 'zod';

// Simple OpenAPI specification generator
export const generateOpenAPISpec = () => {
  return {
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
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check endpoint',
          description: 'Returns the health status of the application and its services',
          responses: {
            '200': {
              description: 'Health check successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                      timestamp: { type: 'string', format: 'date-time' },
                      version: { type: 'string' },
                      uptime: { type: 'number' },
                      services: {
                        type: 'object',
                        additionalProperties: {
                          type: 'object',
                          properties: {
                            status: { type: 'string', enum: ['healthy', 'unhealthy', 'degraded'] },
                            message: { type: 'string' },
                            responseTime: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user and create session',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string', minLength: 1, maxLength: 50 },
                    password: { type: 'string', minLength: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          username: { type: 'string' },
                          email: { type: 'string', format: 'email' },
                          role: { type: 'string', enum: ['admin', 'user'] },
                          isActive: { type: 'boolean' },
                          lastLogin: { type: 'string', format: 'date-time' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                      csrfToken: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', default: false },
                      error: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'User registration',
          description: 'Register a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password', 'confirmPassword'],
                  properties: {
                    username: { type: 'string', minLength: 3, maxLength: 50 },
                    password: { type: 'string', minLength: 8, maxLength: 128 },
                    confirmPassword: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Registration successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' },
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          username: { type: 'string' },
                          email: { type: 'string', format: 'email' },
                          role: { type: 'string', enum: ['admin', 'user'] },
                          isActive: { type: 'boolean' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Validation error',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', default: false },
                      error: { type: 'string' },
                      validationErrors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field: { type: 'string' },
                            message: { type: 'string' },
                            code: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
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
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user'] },
            isActive: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Server: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['stopped', 'starting', 'running', 'stopping', 'error'] },
            port: { type: 'number', minimum: 1, maximum: 65535 },
            version: { type: 'string' },
            memory: { type: 'number' },
            players: {
              type: 'object',
              properties: {
                online: { type: 'number' },
                max: { type: 'number' },
              },
            },
            lastStarted: { type: 'string', format: 'date-time' },
            lastStopped: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            error: { type: 'string' },
            details: { type: 'object' },
            code: { type: 'string' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', default: false },
            error: { type: 'string' },
            validationErrors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
        csrfToken: [],
      },
    ],
  };
};

// Export the generated spec
export const openApiSpec = generateOpenAPISpec();
