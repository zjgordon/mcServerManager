import express, { type Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionService';
import { PasswordSecurity } from '../utils/password';
import { logger } from '../config/logger';
import { getPrismaClient } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createContractRateLimiters,
  contractSecurityMiddleware,
  contractRequestValidation,
  contractResponseStandardization,
  contractPerformanceMonitoring,
  contractAuditLogging,
} from '../middleware/contractSecurity';
import {
  contractErrorHandler,
  contractAsyncHandler,
  ContractValidationError,
  ContractAuthenticationError,
  ContractAuthorizationError,
  ContractNotFoundError,
  ContractConflictError,
  ContractDatabaseError,
  ContractConfigError,
} from '../middleware/contractErrorHandler';
import {
  AdminCreateUserContractSchema,
  AdminUpdateUserContractSchema,
  AdminSystemConfigContractSchema,
  UserIdParamSchema,
  UserListQuerySchema,
} from '../schemas/contractValidation';

const router: Router = express.Router();

// Create contract rate limiters
const contractRateLimiters = createContractRateLimiters();

// Apply contract middleware to all routes
router.use(contractSecurityMiddleware);
router.use(contractRequestValidation);
router.use(contractResponseStandardization);
router.use(contractPerformanceMonitoring);
router.use(contractAuditLogging);

// Apply contract error handling
router.use(contractErrorHandler);

// Helper function to check admin privileges
async function requireAdmin(req: Request, res: Response): Promise<boolean> {
  try {
    const session = await sessionManager.getSession(req);
    if (!session || !session.userId) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return false;
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });

    if (!user || !user.isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking admin privileges'
    });
    return false;
  }
}

// GET /api/v1/admin/users - Get list of all users (admin only)
router.get('/users', async (req: Request, res: Response) => {
  try {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const prisma = getPrismaClient();
    const users = await prisma.user.findMany({
      include: {
        servers: true
      }
    });

    const usersData = users.map(user => ({
      id: user.id,
      username: user.username,
      is_admin: user.isAdmin,
      server_count: user.servers.length,
      total_memory_allocated: user.servers.reduce((sum, server) => sum + server.memoryMb, 0),
      created_at: user.createdAt.toISOString()
    }));

    res.json({
      success: true,
      users: usersData
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
  }
});

// POST /api/v1/admin/users - Create a new user (admin only)
router.post('/users',
  contractRateLimiters.userManagement,
  validateRequest({ body: AdminCreateUserContractSchema }),
  async (req: Request, res: Response) => {
    try {
      const isAdmin = await requireAdmin(req, res);
      if (!isAdmin) return;

      const { username, password, is_admin } = req.body;

      const prisma = getPrismaClient();

      // Check if username already exists
      const existingUser = await prisma.user.findFirst({
        where: { username }
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Username already exists'
        });
        return;
      }

      // Hash password
      const passwordSecurity = new PasswordSecurity();
      const hashedPassword = await PasswordSecurity.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          username,
          passwordHash: hashedPassword,
          isAdmin: is_admin || false,
          isActive: true
        }
      });

      logger.info(`User '${username}' created by admin`);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          is_admin: user.isAdmin
        }
      });
    } catch (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while creating the user'
      });
    }
  }
);

// PUT /api/v1/admin/users/:user_id - Update user information (admin only)
router.put('/users/:user_id',
  contractRateLimiters.userManagement,
  validateRequest({ 
    params: UserIdParamSchema,
    body: AdminUpdateUserContractSchema 
  }),
  async (req: Request, res: Response) => {
    try {
      const isAdmin = await requireAdmin(req, res);
      if (!isAdmin) return;

      const userId = parseInt(req.params.user_id);
      const { username, is_admin } = req.body;

      const prisma = getPrismaClient();

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Check if username already exists (if changing username)
      if (username && username !== user.username) {
        const existingUser = await prisma.user.findFirst({
          where: { 
            username,
            id: { not: userId }
          }
        });

        if (existingUser) {
          res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
          return;
        }
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(username && { username }),
          ...(is_admin !== undefined && { isAdmin: is_admin })
        }
      });

      logger.info(`User ${userId} updated by admin`);

      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          is_admin: updatedUser.isAdmin
        }
      });
    } catch (error) {
      logger.error(`Error updating user ${req.params.user_id}:`, error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while updating the user'
      });
    }
  }
);

// DELETE /api/v1/admin/users/:user_id - Delete a user (admin only)
router.delete('/users/:user_id',
  validateRequest({}),
  async (req: Request, res: Response) => {
    try {
      const isAdmin = await requireAdmin(req, res);
      if (!isAdmin) return;

      const userId = parseInt(req.params.user_id);

      const prisma = getPrismaClient();

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Get current user from session
      const session = await sessionManager.getSession(req);
      if (session && session.userId === userId) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
        return;
      }

      // Delete user's servers first
      await prisma.server.deleteMany({
        where: { ownerId: userId }
      });

      // Delete user
      await prisma.user.delete({
        where: { id: userId }
      });

      logger.info(`User ${userId} deleted by admin`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error(`Error deleting user ${req.params.user_id}:`, error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while deleting the user'
      });
    }
  }
);

// GET /api/v1/admin/config - Get system configuration (admin only)
router.get('/config', async (req: Request, res: Response) => {
  try {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    // Get system configuration from database or environment
    const prisma = getPrismaClient();
    const configs = await prisma.configuration.findMany();

    // Convert to config object
    const config: Record<string, any> = {};
    configs.forEach(configItem => {
      config[configItem.key] = configItem.value;
    });

    // Set defaults if not configured
    const systemConfig = {
      max_total_memory_mb: parseInt(config.max_total_memory_mb) || 8192,
      default_server_memory_mb: parseInt(config.default_server_memory_mb) || 1024,
      min_server_memory_mb: parseInt(config.min_server_memory_mb) || 512,
      max_server_memory_mb: parseInt(config.max_server_memory_mb) || 4096
    };

    res.json({
      success: true,
      config: systemConfig
    });
  } catch (error) {
    logger.error('Error fetching system config:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching system configuration'
    });
  }
});

// PUT /api/v1/admin/config - Update system configuration (admin only)
router.put('/config',
  contractRateLimiters.adminContract,
  validateRequest({ body: AdminSystemConfigContractSchema }),
  async (req: Request, res: Response) => {
    try {
      const isAdmin = await requireAdmin(req, res);
      if (!isAdmin) return;

      const { 
        max_total_memory_mb, 
        default_server_memory_mb, 
        min_server_memory_mb, 
        max_server_memory_mb 
      } = req.body;

      // Validate configuration values
      if (max_total_memory_mb && max_total_memory_mb < 1024) {
        res.status(400).json({
          success: false,
          message: 'Maximum total memory must be at least 1024 MB'
        });
        return;
      }

      if (min_server_memory_mb && max_server_memory_mb && 
          min_server_memory_mb >= max_server_memory_mb) {
        res.status(400).json({
          success: false,
          message: 'Minimum server memory must be less than maximum server memory'
        });
        return;
      }

      const prisma = getPrismaClient();

      // Update configuration in database
      const configUpdates = [
        { key: 'max_total_memory_mb', value: max_total_memory_mb?.toString() },
        { key: 'default_server_memory_mb', value: default_server_memory_mb?.toString() },
        { key: 'min_server_memory_mb', value: min_server_memory_mb?.toString() },
        { key: 'max_server_memory_mb', value: max_server_memory_mb?.toString() }
      ];

      for (const configUpdate of configUpdates) {
        if (configUpdate.value !== undefined) {
          await prisma.configuration.upsert({
            where: { key: configUpdate.key },
            update: { value: configUpdate.value },
            create: { key: configUpdate.key, value: configUpdate.value }
          });
        }
      }

      // Get updated configuration
      const configs = await prisma.configuration.findMany();
      const config: Record<string, any> = {};
      configs.forEach(configItem => {
        config[configItem.key] = configItem.value;
      });

      const updatedConfig = {
        max_total_memory_mb: parseInt(config.max_total_memory_mb) || 8192,
        default_server_memory_mb: parseInt(config.default_server_memory_mb) || 1024,
        min_server_memory_mb: parseInt(config.min_server_memory_mb) || 512,
        max_server_memory_mb: parseInt(config.max_server_memory_mb) || 4096
      };

      logger.info('System configuration updated by admin');

      res.json({
        success: true,
        message: 'System configuration updated successfully',
        config: updatedConfig
      });
    } catch (error) {
      logger.error('Error updating system config:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while updating system configuration'
      });
    }
  }
);

// GET /api/v1/admin/stats - Get system statistics (admin only)
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const isAdmin = await requireAdmin(req, res);
    if (!isAdmin) return;

    const prisma = getPrismaClient();

    // Get system statistics
    const totalUsers = await prisma.user.count();
    const totalServers = await prisma.server.count();
    const runningServers = await prisma.server.count({
      where: { status: 'Running' }
    });

    // Calculate total memory allocated
    const servers = await prisma.server.findMany({
      select: { memoryMb: true }
    });
    const totalMemoryAllocated = servers.reduce((sum, server) => sum + server.memoryMb, 0);

    // Get memory usage summary
    const configs = await prisma.configuration.findMany();
    const config: Record<string, any> = {};
    configs.forEach(configItem => {
      config[configItem.key] = configItem.value;
    });

    const maxTotalMemory = parseInt(config.max_total_memory_mb) || 8192;
    const memoryUsageSummary = {
      total_allocated: totalMemoryAllocated,
      total_available: maxTotalMemory,
      utilization_percentage: maxTotalMemory > 0 ? (totalMemoryAllocated / maxTotalMemory) * 100 : 0
    };

    const stats = {
      total_users: totalUsers,
      total_servers: totalServers,
      running_servers: runningServers,
      total_memory_allocated: totalMemoryAllocated,
      memory_usage_summary: memoryUsageSummary
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching system statistics'
    });
  }
});

export default router;
