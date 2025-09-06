import { Request, Response, NextFunction } from 'express';
import { sessionManager } from '../services/sessionService';
import { logger } from '../config/logger';
import { config } from '../config';

// CSRF protection configuration
const CSRF_CONFIG = {
  tokenLength: 32,
  headerName: 'x-csrf-token',
  cookieName: 'csrf_token',
  bodyFieldName: '_csrf',
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  ignorePaths: ['/healthz', '/api/v1/auth/csrf-token'],
};

// CSRF protection middleware
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for ignored methods
  if (CSRF_CONFIG.ignoreMethods.includes(req.method)) {
    return next();
  }

  // Skip CSRF for ignored paths
  if (CSRF_CONFIG.ignorePaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Skip CSRF for health checks and public endpoints
  if (req.path.startsWith('/healthz') || req.path.startsWith('/public')) {
    return next();
  }

  // Validate CSRF token
  sessionManager.validateCSRFToken(req)
    .then(isValid => {
      if (!isValid) {
        logger.warn(`🛡️ CSRF token validation failed for ${req.method} ${req.path} from ${req.ip}`);

        // Return appropriate error response
        if (req.xhr || req.headers.accept?.includes('application/json')) {
          res.status(403).json({
            success: false,
            error: 'CSRF token validation failed',
            message: 'Invalid or missing CSRF token',
            code: 'CSRF_TOKEN_INVALID',
          });
        } else {
          res.status(403).send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>CSRF Token Validation Failed</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 4px; }
              </style>
            </head>
            <body>
              <div class="error">
                <h2>CSRF Token Validation Failed</h2>
                <p>Your request could not be processed due to a security validation failure.</p>
                <p>Please refresh the page and try again.</p>
              </div>
            </body>
            </html>
          `);
        }
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

// Generate and set CSRF token
export function generateCSRFToken(req: Request, res: Response, next: NextFunction): void {
  sessionManager.regenerateCSRFToken(req, res)
    .then(token => {
      // Add token to response headers for easy access
      res.setHeader('X-CSRF-Token', token);
      next();
    })
    .catch(error => {
      logger.error('CSRF token generation error:', error);
      next(); // Continue even if token generation fails
    });
}

// CSRF token refresh endpoint middleware
export function refreshCSRFToken(req: Request, res: Response): void {
  sessionManager.regenerateCSRFToken(req, res)
    .then(newToken => {
      res.json({
        success: true,
        csrfToken: newToken,
        message: 'CSRF token refreshed successfully',
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

// CSRF token validation for API endpoints
export function validateCSRFToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers[CSRF_CONFIG.headerName] as string ||
                req.body[CSRF_CONFIG.bodyFieldName] ||
                req.query[CSRF_CONFIG.bodyFieldName];

  if (!token) {
    logger.warn(`🛡️ Missing CSRF token for ${req.method} ${req.path} from ${req.ip}`);
    res.status(403).json({
      success: false,
      error: 'CSRF token required',
      message: 'CSRF token is required for this request',
      code: 'CSRF_TOKEN_MISSING',
    });
    return;
  }

  sessionManager.validateCSRFToken(req)
    .then(isValid => {
      if (!isValid) {
        logger.warn(`🛡️ Invalid CSRF token for ${req.method} ${req.path} from ${req.ip}`);
        res.status(403).json({
          success: false,
          error: 'CSRF token validation failed',
          message: 'Invalid CSRF token',
          code: 'CSRF_TOKEN_INVALID',
        });
        return;
      }
      next();
    })
    .catch(error => {
      logger.error('CSRF token validation error:', error);
      res.status(500).json({
        success: false,
        error: 'CSRF validation error',
        message: 'An error occurred during CSRF validation',
      });
    });
}

// CSRF token middleware for forms
export function csrfTokenForForms(req: Request, res: Response, next: NextFunction): void {
  sessionManager.getSession(req)
    .then(sessionData => {
      if (sessionData && sessionData.csrfToken) {
        // Add CSRF token to response locals for template rendering
        res.locals.csrfToken = sessionData.csrfToken;
      }
      next();
    })
    .catch(error => {
      logger.error('CSRF token for forms error:', error);
      next(); // Continue even if there's an error
    });
}

// CSRF protection for specific routes
export function csrfProtectionForRoute(route: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.path.startsWith(route)) {
      csrfProtection(req, res, next);
    } else {
      next();
    }
  };
}

// CSRF token validation for specific methods
export function csrfProtectionForMethods(methods: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (methods.includes(req.method)) {
      csrfProtection(req, res, next);
    } else {
      next();
    }
  };
}

// CSRF token validation for API routes only
export function csrfProtectionForAPI(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith('/api/')) {
    csrfProtection(req, res, next);
  } else {
    next();
  }
}

// CSRF token validation for authenticated routes only
export function csrfProtectionForAuthenticated(req: Request, res: Response, next: NextFunction): void {
  sessionManager.isAuthenticated(req)
    .then(isAuthenticated => {
      if (isAuthenticated) {
        csrfProtection(req, res, next);
      } else {
        next();
      }
    })
    .catch(error => {
      logger.error('CSRF protection for authenticated error:', error);
      next();
    });
}

// CSRF token validation with custom error handling
export function csrfProtectionWithCustomError(
  errorHandler: (req: Request, res: Response, error: string) => void,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF for ignored methods
    if (CSRF_CONFIG.ignoreMethods.includes(req.method)) {
      return next();
    }

    sessionManager.validateCSRFToken(req)
      .then(isValid => {
        if (!isValid) {
          errorHandler(req, res, 'CSRF token validation failed');
          return;
        }
        next();
      })
      .catch(error => {
        logger.error('CSRF middleware error:', error);
        errorHandler(req, res, 'CSRF validation error');
      });
  };
}

// Export commonly used CSRF middleware
export const csrfMiddleware = {
  protection: csrfProtection,
  generateToken: generateCSRFToken,
  refreshToken: refreshCSRFToken,
  validateToken: validateCSRFToken,
  forForms: csrfTokenForForms,
  forRoute: csrfProtectionForRoute,
  forMethods: csrfProtectionForMethods,
  forAPI: csrfProtectionForAPI,
  forAuthenticated: csrfProtectionForAuthenticated,
  withCustomError: csrfProtectionWithCustomError,
};

export default csrfMiddleware;
