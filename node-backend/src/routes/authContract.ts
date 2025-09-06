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
  ContractNotFoundError,
  ContractConflictError,
  ContractDatabaseError,
} from '../middleware/contractErrorHandler';
import {
  AuthLoginContractSchema,
  AuthRegisterContractSchema,
  AuthChangePasswordContractSchema,
  AdminCreateUserContractSchema,
  AdminUpdateUserContractSchema,
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

// CSRF Token endpoint - Contract compatible with Flask API
router.get('/csrf-token', async (req: Request, res: Response) => {
  try {
    // Generate CSRF token (Express session will handle this automatically)
    const csrfToken = req.csrfToken ? req.csrfToken() : 'csrf-token-placeholder';

    res.json({
      csrf_token: csrfToken,
    });
  } catch (error) {
    logger.error('CSRF token error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while generating CSRF token',
    });
  }
});

// User login - Contract compatible with Flask API
router.post('/login',
  contractRateLimiters.authContract,
  validateRequest({ body: AuthLoginContractSchema }),
  authMiddleware.loginRateLimit,
  contractAsyncHandler(async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      logger.info(`🔐 Login attempt for username: ${username}`);

      // Get user from database
      const prisma = getPrismaClient();
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email: username },
          ],
        },
      });

      if (!user || !user.isActive) {
        logger.warn(`❌ Login failed: User not found or inactive - ${username}`);
        throw new ContractAuthenticationError('Invalid username or password');
      }

      // Verify password
      const isPasswordValid = await PasswordSecurity.verifyPassword(password, user.passwordHash || '');
      if (!isPasswordValid) {
        logger.warn(`❌ Login failed: Invalid password - ${username}`);
        throw new ContractAuthenticationError('Invalid username or password');
      }

      // Create session
      const sessionId = await sessionManager.createSession(
        req,
        res,
        user.id,
        user.username,
        user.isAdmin,
      );

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      logger.info(`✅ Login successful: ${username} (ID: ${user.id})`);

      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin,
          email: user.email,
          isActive: user.isActive,
          lastLogin: user.lastLogin?.toISOString() || null,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during login',
      });
    }
  },
);

// User logout - Contract compatible with Flask API
router.post('/logout',
  authMiddleware.requireAuth,
  async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies['connect.sid'];

      if (sessionId) {
        await sessionManager.destroySession(sessionId);
      }

      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during logout',
      });
    }
  },
);

// Get current user - Contract compatible with Flask API
router.get('/me',
  authMiddleware.requireAuth,
  authMiddleware.addUserContext,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get additional user data from database
      const prisma = getPrismaClient();
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          servers: true,
        },
      });

      if (!userData) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const serverCount = userData.servers.length;
      const totalMemoryAllocated = userData.servers.reduce((sum, server) => sum + server.memoryMb, 0);

      return res.json({
        success: true,
        user: {
          id: userData.id,
          username: userData.username,
          isAdmin: userData.isAdmin,
          serverCount,
          totalMemoryAllocated,
        },
      });
    } catch (error) {
      logger.error('Get user info error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching user information',
      });
    }
  },
);

// Authentication status - Contract compatible with Flask API
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (userId) {
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        return res.json({
          authenticated: true,
          user: {
            id: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
          },
        });
      }
    }

    return res.json({
      authenticated: false,
    });
  } catch (error) {
    logger.error('Auth status error:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'An error occurred while checking authentication status',
    });
  }
});

// Change password - Contract compatible with Flask API
router.post('/change-password',
  contractRateLimiters.authContract,
  authMiddleware.requireAuth,
  authMiddleware.requireCSRF,
  validateRequest({ body: AuthChangePasswordContractSchema }),
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).userId;

      // Get user from database
      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await PasswordSecurity.verifyPassword(currentPassword, user.passwordHash || '');
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      // Validate new password
      const passwordValidation = PasswordSecurity.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: passwordValidation.errors.join(', '),
        });
      }

      // Hash new password
      const hashedNewPassword = await PasswordSecurity.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashedNewPassword },
      });

      logger.info(`✅ Password changed successfully for user ID: ${userId}`);

      return res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while changing password',
      });
    }
  },
);

// Admin setup - Contract compatible with Flask API
router.post('/setup', async (req: Request, res: Response) => {
  try {
    // Check if any admin user exists
    const prisma = getPrismaClient();
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    if (adminUser && adminUser.passwordHash) {
      return res.status(400).json({
        success: false,
        message: 'Admin account is already set up',
      });
    }

    const { username, password, confirmPassword, email } = req.body;

    // Validation
    if (!username || username.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    // Validate password strength
    const passwordValidation = PasswordSecurity.validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.errors.join(', '),
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    // Handle admin user creation/update
    let createdUser;
    if (adminUser && !adminUser.passwordHash) {
      // Update existing admin user
      const hashedPassword = await PasswordSecurity.hashPassword(password);
      createdUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          username,
          passwordHash: hashedPassword,
          email: email || null,
        },
      });
    } else {
      // Create new admin user
      const hashedPassword = await PasswordSecurity.hashPassword(password);
      createdUser = await prisma.user.create({
        data: {
          username,
          passwordHash: hashedPassword,
          email: email || null,
          isAdmin: true,
          isActive: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      user: {
        id: createdUser.id,
        username: createdUser.username,
        isAdmin: true,
      },
    });
  } catch (error) {
    logger.error('Admin setup error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while setting up admin account',
    });
  }
});

// Setup status - Contract compatible with Flask API
router.get('/setup/status', async (req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();
    const adminUser = await prisma.user.findFirst({
      where: { isAdmin: true },
    });

    const setupRequired = !adminUser || !adminUser.passwordHash;

    res.json({
      setup_required: setupRequired,
      has_admin: !!adminUser,
    });
  } catch (error) {
    logger.error('Setup status error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while checking setup status',
    });
  }
});

// Reset password - Contract compatible with Flask API
router.post('/reset-password',
  authMiddleware.requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { userId: targetUserId, newPassword, confirmPassword } = req.body;
      const currentUserId = (req as any).userId;

      // Get current user
      const prisma = getPrismaClient();
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
      });

      if (!currentUser) {
        return res.status(404).json({
          success: false,
          message: 'Current user not found',
        });
      }

      // Determine target user
      let targetUser;
      if (targetUserId) {
        // Admin resetting another user's password
        if (!currentUser.isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Admin privileges required',
          });
        }

        targetUser = await prisma.user.findUnique({
          where: { id: targetUserId },
        });
      } else {
        // User resetting their own password
        targetUser = currentUser;
      }

      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found',
        });
      }

      // Validate password
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long',
        });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
      }

      // Hash new password
      const hashedPassword = await PasswordSecurity.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash: hashedPassword },
      });

      return res.json({
        success: true,
        message: `Password reset successfully for ${targetUser.username}`,
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while resetting password',
      });
    }
  },
);

export default router;
