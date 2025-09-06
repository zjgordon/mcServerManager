import { Request, Response, NextFunction } from 'express';
import { sessionManager } from '../services/sessionService';
import { logger } from '../config/logger';

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  sessionManager.isAuthenticated(req)
    .then(isAuthenticated => {
      if (!isAuthenticated) {
        logger.warn(`🔒 Unauthorized access attempt to ${req.path} from ${req.ip}`);
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'Please log in to access this resource',
        });
        return;
      }
      next();
    })
    .catch(error => {
      logger.error('Authentication middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'An error occurred during authentication',
      });
    });
}

// Admin authorization middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  sessionManager.isAdmin(req)
    .then(isAdmin => {
      if (!isAdmin) {
        logger.warn(`🔒 Admin access denied to ${req.path} from ${req.ip}`);
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          message: 'You do not have permission to access this resource',
        });
        return;
      }
      next();
    })
    .catch(error => {
      logger.error('Admin authorization middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization error',
        message: 'An error occurred during authorization',
      });
    });
}

// CSRF protection middleware
export function requireCSRF(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for GET requests and health checks
  if (req.method === 'GET' || req.path.startsWith('/healthz')) {
    return next();
  }

  sessionManager.validateCSRFToken(req)
    .then(isValid => {
      if (!isValid) {
        logger.warn(`🛡️ CSRF token validation failed for ${req.path} from ${req.ip}`);
        res.status(403).json({
          success: false,
          error: 'CSRF token validation failed',
          message: 'Invalid or missing CSRF token',
        });
        return;
      }
      next();
    })
    .catch(error => {
      logger.error('CSRF middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'CSRF validation error',
        message: 'An error occurred during CSRF validation',
      });
    });
}

// Optional authentication middleware (doesn't fail if not authenticated)
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  sessionManager.getCurrentUser(req)
    .then(user => {
      // Add user to request object if authenticated
      if (user) {
        (req as any).user = user;
      }
      next();
    })
    .catch(error => {
      logger.error('Optional auth middleware error:', error);
      next(); // Continue even if there's an error
    });
}

// Session refresh middleware
export function refreshSession(req: Request, res: Response, next: NextFunction): void {
  sessionManager.getSession(req)
    .then(sessionData => {
      if (sessionData) {
        // Update last activity
        sessionManager.updateLastActivity(req.cookies?.mcserver_session || '');
      }
      next();
    })
    .catch(error => {
      logger.error('Session refresh middleware error:', error);
      next(); // Continue even if there's an error
    });
}

// User context middleware (adds user info to request)
export function addUserContext(req: Request, res: Response, next: NextFunction): void {
  sessionManager.getCurrentUser(req)
    .then(user => {
      if (user) {
        (req as any).user = user;
        (req as any).userId = user.id;
        (req as any).isAdmin = user.isAdmin;
      }
      next();
    })
    .catch(error => {
      logger.error('User context middleware error:', error);
      next();
    });
}

// Login rate limiting middleware
export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  // This would integrate with the existing rate limiting middleware
  // For now, just pass through
  next();
}

// Logout middleware
export function logout(req: Request, res: Response, next: NextFunction): void {
  sessionManager.logout(req, res)
    .then(() => {
      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    })
    .catch(error => {
      logger.error('Logout middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: 'An error occurred during logout',
      });
    });
}

// CSRF token refresh middleware
export function refreshCSRFToken(req: Request, res: Response, next: NextFunction): void {
  sessionManager.regenerateCSRFToken(req, res)
    .then(newToken => {
      res.json({
        success: true,
        csrfToken: newToken,
      });
    })
    .catch(error => {
      logger.error('CSRF token refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'CSRF token refresh failed',
        message: 'An error occurred while refreshing CSRF token',
      });
    });
}

// Session validation middleware
export function validateSession(req: Request, res: Response, next: NextFunction): void {
  sessionManager.validateSession(req)
    .then(isValid => {
      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'Session expired',
          message: 'Your session has expired. Please log in again.',
        });
        return;
      }
      next();
    })
    .catch(error => {
      logger.error('Session validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Session validation error',
        message: 'An error occurred during session validation',
      });
    });
}

// Export commonly used middleware combinations
export const authMiddleware = {
  requireAuth,
  requireAdmin,
  requireCSRF,
  optionalAuth,
  refreshSession,
  addUserContext,
  loginRateLimit,
  logout,
  refreshCSRFToken,
  validateSession,
};

export default authMiddleware;
