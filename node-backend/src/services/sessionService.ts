import { Request, Response } from 'express';
import { SessionService } from '../config/redis';
import { logger } from '../config/logger';
import { config } from '../config';

// Session data interface
export interface SessionData {
  userId?: number;
  username?: string;
  isAdmin?: boolean;
  loginTime?: string;
  lastActivity?: string;
  ipAddress?: string;
  userAgent?: string;
  csrfToken?: string;
}

// Session management service
export class SessionManager {
  private sessionService: SessionService | null = null;
  private sessionTimeout: number;

  constructor() {
    this.sessionTimeout = 24 * 60 * 60; // 24 hours in seconds
  }

  private getSessionService(): SessionService {
    if (!this.sessionService) {
      this.sessionService = new SessionService(require('../config/redis').getRedisClient());
    }
    return this.sessionService;
  }

  // Create a new session
  async createSession(
    req: Request,
    res: Response,
    userId: number,
    username: string,
    isAdmin: boolean = false,
  ): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date().toISOString();

      const sessionData: SessionData = {
        userId,
        username,
        isAdmin,
        loginTime: now,
        lastActivity: now,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        csrfToken: this.generateCSRFToken(),
      };

      // Store session in Redis
      await this.getSessionService().set(sessionId, sessionData, this.sessionTimeout);

      // Set session cookie
      res.cookie('mcserver_session', sessionId, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: this.sessionTimeout * 1000,
        path: '/',
      });

      // Set CSRF token cookie
      res.cookie('csrf_token', sessionData.csrfToken, {
        httpOnly: false, // CSRF token needs to be accessible to JavaScript
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: this.sessionTimeout * 1000,
        path: '/',
      });

      logger.info(`✅ Session created for user ${username} (ID: ${userId})`);
      return sessionId;
    } catch (error) {
      logger.error('Failed to create session:', error);
      throw new Error('Session creation failed');
    }
  }

  // Get session data
  async getSession(req: Request): Promise<SessionData | null> {
    try {
      const sessionId = req.cookies?.mcserver_session;
      if (!sessionId) {
        return null;
      }

      const sessionData = await this.getSessionService().get(sessionId);
      if (!sessionData) {
        return null;
      }

      // Update last activity
      await this.updateLastActivity(sessionId);

      return sessionData as SessionData;
    } catch (error) {
      logger.error('Failed to get session:', error);
      return null;
    }
  }

  // Update session last activity
  async updateLastActivity(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSessionService().get(sessionId);
      if (sessionData) {
        (sessionData as SessionData).lastActivity = new Date().toISOString();
        await this.getSessionService().set(sessionId, sessionData, this.sessionTimeout);
      }
    } catch (error) {
      logger.error('Failed to update session activity:', error);
    }
  }

  // Validate session
  async validateSession(req: Request): Promise<boolean> {
    try {
      const sessionData = await this.getSession(req);
      if (!sessionData) {
        return false;
      }

      // Check if session is expired (additional check beyond Redis TTL)
      const lastActivity = new Date(sessionData.lastActivity || 0);
      const now = new Date();
      const timeDiff = now.getTime() - lastActivity.getTime();
      const maxInactivity = 2 * 60 * 60 * 1000; // 2 hours

      if (timeDiff > maxInactivity) {
        await this.destroySession(req);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate session:', error);
      return false;
    }
  }

  // Check if user is authenticated
  async isAuthenticated(req: Request): Promise<boolean> {
    return await this.validateSession(req);
  }

  // Check if user is admin
  async isAdmin(req: Request): Promise<boolean> {
    try {
      const sessionData = await this.getSession(req);
      return sessionData?.isAdmin === true;
    } catch (error) {
      logger.error('Failed to check admin status:', error);
      return false;
    }
  }

  // Get current user ID
  async getCurrentUserId(req: Request): Promise<number | null> {
    try {
      const sessionData = await this.getSession(req);
      return sessionData?.userId || null;
    } catch (error) {
      logger.error('Failed to get current user ID:', error);
      return null;
    }
  }

  // Get current user data
  async getCurrentUser(req: Request): Promise<{ id: number; username: string; isAdmin: boolean } | null> {
    try {
      const sessionData = await this.getSession(req);
      if (!sessionData || !sessionData.userId || !sessionData.username) {
        return null;
      }

      return {
        id: sessionData.userId,
        username: sessionData.username,
        isAdmin: sessionData.isAdmin || false,
      };
    } catch (error) {
      logger.error('Failed to get current user:', error);
      return null;
    }
  }

  // Regenerate CSRF token
  async regenerateCSRFToken(req: Request, res: Response): Promise<string> {
    try {
      const sessionId = req.cookies?.mcserver_session;
      if (!sessionId) {
        throw new Error('No session found');
      }

      const sessionData = await this.getSessionService().get(sessionId);
      if (!sessionData) {
        throw new Error('Session not found');
      }

      const newCSRFToken = this.generateCSRFToken();
      (sessionData as SessionData).csrfToken = newCSRFToken;

      await this.getSessionService().set(sessionId, sessionData, this.sessionTimeout);

      // Update CSRF token cookie
      res.cookie('csrf_token', newCSRFToken, {
        httpOnly: false,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: this.sessionTimeout * 1000,
        path: '/',
      });

      return newCSRFToken;
    } catch (error) {
      logger.error('Failed to regenerate CSRF token:', error);
      throw error;
    }
  }

  // Validate CSRF token
  async validateCSRFToken(req: Request): Promise<boolean> {
    try {
      const sessionData = await this.getSession(req);
      if (!sessionData || !sessionData.csrfToken) {
        return false;
      }

      const providedToken = req.headers['x-csrf-token'] || req.body._csrf;
      return providedToken === sessionData.csrfToken;
    } catch (error) {
      logger.error('Failed to validate CSRF token:', error);
      return false;
    }
  }

  // Destroy session
  async destroySession(req: Request): Promise<void> {
    try {
      const sessionId = req.cookies?.mcserver_session;
      if (sessionId) {
        await this.getSessionService().del(sessionId);
        logger.info(`🗑️ Session destroyed: ${sessionId}`);
      }
    } catch (error) {
      logger.error('Failed to destroy session:', error);
    }
  }

  // Logout user
  async logout(req: Request, res: Response): Promise<void> {
    try {
      await this.destroySession(req);

      // Clear cookies
      res.clearCookie('mcserver_session');
      res.clearCookie('csrf_token');

      logger.info('👋 User logged out successfully');
    } catch (error) {
      logger.error('Failed to logout user:', error);
      throw error;
    }
  }

  // Get session statistics
  async getSessionStats(): Promise<{ activeSessions: number; totalSessions: number }> {
    try {
      // This would require a more sophisticated implementation
      // For now, return basic stats
      return {
        activeSessions: 0,
        totalSessions: 0,
      };
    } catch (error) {
      logger.error('Failed to get session stats:', error);
      return { activeSessions: 0, totalSessions: 0 };
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // Redis automatically handles TTL, but we could implement additional cleanup here
      logger.info('🧹 Session cleanup completed (handled by Redis TTL)');
      return 0;
    } catch (error) {
      logger.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  // Generate secure session ID
  private generateSessionId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate CSRF token
  private generateCSRFToken(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();

export default sessionManager;
