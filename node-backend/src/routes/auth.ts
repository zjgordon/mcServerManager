import express, { type Router, Request, Response } from 'express';
import { sessionManager } from '../services/sessionService';
import { PasswordSecurity } from '../utils/password';
import { logger } from '../config/logger';
import { getPrismaClient } from '../config/database';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  LoginSchema,
  RegisterSchema,
  ChangePasswordSchema,
  ResetPasswordSchema,
  CreateUserSchema,
  UpdateUserSchema,
} from '../schemas/auth';

const router: Router = express.Router();

// Use imported schemas from schemas/auth.ts

// Login endpoint
router.post('/login',
  validateRequest({ body: LoginSchema }),
  authMiddleware.loginRateLimit,
  async (req: Request, res: Response) => {
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

      if (!user) {
        logger.warn(`❌ Login failed: User not found - ${username}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        });
      }

      // Verify password
      const isPasswordValid = await PasswordSecurity.verifyPassword(password, user.passwordHash || '');
      if (!isPasswordValid) {
        logger.warn(`❌ Login failed: Invalid password - ${username}`);
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          message: 'Username or password is incorrect',
        });
      }

      // Check if user is active
      if (!user.isActive) {
        logger.warn(`❌ Login failed: Inactive user - ${username}`);
        return res.status(401).json({
          success: false,
          error: 'Account disabled',
          message: 'Your account has been disabled. Please contact an administrator.',
        });
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
          email: user.email,
          isAdmin: user.isAdmin,
          lastLogin: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      return res.status(500).json({
        success: false,
        error: 'Login failed',
        message: 'An error occurred during login',
      });
    }
  },
);

// Register endpoint
router.post('/register',
  validateRequest({ body: RegisterSchema }),
  authMiddleware.loginRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { username, password, email } = req.body;

      logger.info(`📝 Registration attempt for username: ${username}`);

      // Validate password strength
      const passwordValidation = PasswordSecurity.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password validation failed',
          message: 'Password does not meet requirements',
          details: passwordValidation.errors,
        });
      }

      // Check if username already exists
      const prisma = getPrismaClient();
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            ...(email ? [{ email }] : []),
          ],
        },
      });

      if (existingUser) {
        const field = existingUser.username === username ? 'username' : 'email';
        logger.warn(`❌ Registration failed: ${field} already exists - ${username}`);
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          message: `A user with this ${field} already exists`,
        });
      }

      // Hash password
      const hashedPassword = await PasswordSecurity.hashPassword(password);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          username,
          passwordHash: hashedPassword,
          email: email || null,
          isAdmin: false,
          isActive: true,
        },
      });

      logger.info(`✅ Registration successful: ${username} (ID: ${newUser.id})`);

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          isAdmin: newUser.isAdmin,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: 'An error occurred during registration',
      });
    }
  },
);

// Logout endpoint
router.post('/logout',
  authMiddleware.requireAuth,
  authMiddleware.logout,
);

// Get current user info
router.get('/me',
  authMiddleware.requireAuth,
  authMiddleware.addUserContext,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Not authenticated',
          message: 'User not found in session',
        });
      }

      // Get additional user data from database
      const prisma = getPrismaClient();
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
        },
      });

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User data not found in database',
        });
      }

      return res.json({
        success: true,
        user: userData,
      });
    } catch (error) {
      logger.error('Get user info error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user info',
        message: 'An error occurred while retrieving user information',
      });
    }
  },
);

// Change password endpoint
router.post('/change-password',
  authMiddleware.requireAuth,
  authMiddleware.requireCSRF,
  validateRequest({ body: ChangePasswordSchema }),
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
          error: 'User not found',
          message: 'User not found in database',
        });
      }

      // Validate password change
      const validation = PasswordSecurity.validatePasswordChange(
        currentPassword,
        newPassword,
        user.passwordHash || '',
      );

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Password change validation failed',
          message: 'Password change requirements not met',
          details: validation.errors,
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
        error: 'Password change failed',
        message: 'An error occurred while changing password',
      });
    }
  },
);

// Get CSRF token endpoint
router.get('/csrf-token',
  authMiddleware.requireAuth,
  authMiddleware.refreshCSRFToken,
);

// Validate session endpoint
router.get('/validate',
  authMiddleware.validateSession,
  async (req: Request, res: Response) => {
    try {
      const user = await sessionManager.getCurrentUser(req);

      return res.json({
        success: true,
        message: 'Session is valid',
        user,
      });
    } catch (error) {
      logger.error('Session validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Session validation failed',
        message: 'An error occurred during session validation',
      });
    }
  },
);

// Admin endpoints
router.get('/admin/users',
  authMiddleware.requireAuth,
  authMiddleware.requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const prisma = getPrismaClient();
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          isActive: true,
          createdAt: true,
          lastLogin: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.json({
        success: true,
        users,
      });
    } catch (error) {
      logger.error('Get users error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get users',
        message: 'An error occurred while retrieving users',
      });
    }
  },
);

// Toggle user active status (admin only)
router.patch('/admin/users/:userId/toggle-active',
  authMiddleware.requireAuth,
  authMiddleware.requireAdmin,
  authMiddleware.requireCSRF,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).userId;

      // Prevent admin from deactivating themselves
      if (parseInt(userId) === currentUserId) {
        return res.status(400).json({
          success: false,
          error: 'Cannot modify own account',
          message: 'You cannot deactivate your own account',
        });
      }

      const prisma = getPrismaClient();
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User not found in database',
        });
      }

      // Toggle active status
      const updatedUser = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { isActive: !user.isActive },
      });

      logger.info(`✅ User ${updatedUser.username} active status toggled to ${updatedUser.isActive} by admin ${currentUserId}`);

      return res.json({
        success: true,
        message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          isActive: updatedUser.isActive,
        },
      });
    } catch (error) {
      logger.error('Toggle user active status error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to toggle user status',
        message: 'An error occurred while updating user status',
      });
    }
  },
);

export default router;
