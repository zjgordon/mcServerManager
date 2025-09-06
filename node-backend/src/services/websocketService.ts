import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createPubSubClients, REDIS_NAMESPACES } from '../config/redis';
import { logger } from '../config/logger';
import { config } from '../config';

// WebSocket event types
export const WS_EVENTS = {
  // Server events
  SERVER_STATUS_CHANGE: 'server:status:change',
  SERVER_LOG_UPDATE: 'server:log:update',
  SERVER_PLAYER_JOIN: 'server:player:join',
  SERVER_PLAYER_LEAVE: 'server:player:leave',
  SERVER_BACKUP_START: 'server:backup:start',
  SERVER_BACKUP_COMPLETE: 'server:backup:complete',
  SERVER_BACKUP_ERROR: 'server:backup:error',

  // System events
  SYSTEM_NOTIFICATION: 'system:notification',
  SYSTEM_MAINTENANCE: 'system:maintenance',
  SYSTEM_ERROR: 'system:error',

  // User events
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_PERMISSION_CHANGE: 'user:permission:change',

  // Job events
  JOB_START: 'job:start',
  JOB_PROGRESS: 'job:progress',
  JOB_COMPLETE: 'job:complete',
  JOB_ERROR: 'job:error',
} as const;

// WebSocket room names
export const WS_ROOMS = {
  ADMIN: 'admin',
  SERVER: (serverId: string) => `server:${serverId}`,
  USER: (userId: string) => `user:${userId}`,
  SYSTEM: 'system',
} as const;

// WebSocket message interfaces
export interface WSMessage {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
  serverId?: string;
}

export interface ServerStatusMessage {
  serverId: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  players: number;
  uptime: number;
  memory: number;
  cpu: number;
}

export interface ServerLogMessage {
  serverId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
}

export interface PlayerEventMessage {
  serverId: string;
  playerName: string;
  action: 'join' | 'leave';
  timestamp: number;
}

export interface NotificationMessage {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  serverId?: string;
}

export interface JobEventMessage {
  jobId: string;
  jobType: string;
  status: 'started' | 'progress' | 'completed' | 'failed';
  progress?: number;
  data?: any;
  error?: string;
}

// WebSocket service class
export class WebSocketService {
  private io: SocketIOServer | null = null;
  private isInitialized = false;

  constructor() {}

  // Initialize WebSocket service
  async initialize(httpServer: any): Promise<void> {
    if (this.isInitialized) {
      logger.warn('WebSocket service already initialized');
      return;
    }

    try {
      logger.info('🔄 Initializing WebSocket service...');

      // Create Socket.IO server
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: config.nodeEnv === 'production'
            ? [config.frontendUrl]
            : ['http://localhost:3000', 'http://localhost:5173'],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
      });

      // Setup Redis adapter for scaling
      if (config.wsUseRedisAdapter) {
        const { pubClient, subClient } = await createPubSubClients();
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Redis adapter configured for WebSocket scaling');
      }

      // Setup connection handling
      this.setupConnectionHandlers();

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('✅ WebSocket service initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize WebSocket service:', error);
      throw error;
    }
  }

  // Setup connection handlers
  private setupConnectionHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
      const ip = socket.handshake.address;

      logger.info(`🔌 WebSocket client connected: ${clientId} from ${ip}`);

      // Handle authentication
      socket.on('authenticate', (data: { userId: string; token?: string }) => {
        try {
          // TODO: Implement proper authentication
          const { userId } = data;
          socket.data.userId = userId;
          socket.join(WS_ROOMS.USER(userId));

          logger.info(`✅ WebSocket client ${clientId} authenticated as user ${userId}`);
          socket.emit('authenticated', { success: true, userId });
        } catch (error) {
          logger.error(`❌ WebSocket authentication failed for ${clientId}:`, error);
          socket.emit('authentication_error', { error: 'Authentication failed' });
        }
      });

      // Handle server subscription
      socket.on('subscribe_server', (data: { serverId: string }) => {
        try {
          const { serverId } = data;
          socket.join(WS_ROOMS.SERVER(serverId));

          logger.info(`📡 WebSocket client ${clientId} subscribed to server ${serverId}`);
          socket.emit('subscribed', { type: 'server', id: serverId });
        } catch (error) {
          logger.error(`❌ WebSocket server subscription failed for ${clientId}:`, error);
          socket.emit('subscription_error', { error: 'Subscription failed' });
        }
      });

      // Handle server unsubscription
      socket.on('unsubscribe_server', (data: { serverId: string }) => {
        try {
          const { serverId } = data;
          socket.leave(WS_ROOMS.SERVER(serverId));

          logger.info(`📡 WebSocket client ${clientId} unsubscribed from server ${serverId}`);
          socket.emit('unsubscribed', { type: 'server', id: serverId });
        } catch (error) {
          logger.error(`❌ WebSocket server unsubscription failed for ${clientId}:`, error);
        }
      });

      // Handle admin subscription
      socket.on('subscribe_admin', () => {
        try {
          // TODO: Check if user is admin
          socket.join(WS_ROOMS.ADMIN);

          logger.info(`📡 WebSocket client ${clientId} subscribed to admin events`);
          socket.emit('subscribed', { type: 'admin' });
        } catch (error) {
          logger.error(`❌ WebSocket admin subscription failed for ${clientId}:`, error);
          socket.emit('subscription_error', { error: 'Admin subscription failed' });
        }
      });

      // Handle system subscription
      socket.on('subscribe_system', () => {
        try {
          socket.join(WS_ROOMS.SYSTEM);

          logger.info(`📡 WebSocket client ${clientId} subscribed to system events`);
          socket.emit('subscribed', { type: 'system' });
        } catch (error) {
          logger.error(`❌ WebSocket system subscription failed for ${clientId}:`, error);
        }
      });

      // Handle ping/pong
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`🔌 WebSocket client ${clientId} disconnected: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error(`❌ WebSocket client ${clientId} error:`, error);
      });
    });
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    // Handle server shutdown
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received, shutting down WebSocket service...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT received, shutting down WebSocket service...');
      this.shutdown();
    });
  }

  // Broadcast message to all connected clients
  broadcast(event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const message: WSMessage = {
      type: event,
      data,
      timestamp: Date.now(),
    };

    this.io.emit(event, message);
    logger.debug(`📢 Broadcasted message: ${event}`);
  }

  // Send message to specific room
  toRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    const message: WSMessage = {
      type: event,
      data,
      timestamp: Date.now(),
    };

    this.io.to(room).emit(event, message);
    logger.debug(`📢 Sent message to room ${room}: ${event}`);
  }

  // Send message to specific user
  toUser(userId: string, event: string, data: any): void {
    this.toRoom(WS_ROOMS.USER(userId), event, data);
  }

  // Send message to specific server
  toServer(serverId: string, event: string, data: any): void {
    this.toRoom(WS_ROOMS.SERVER(serverId), event, data);
  }

  // Send message to admin users
  toAdmin(event: string, data: any): void {
    this.toRoom(WS_ROOMS.ADMIN, event, data);
  }

  // Send message to system subscribers
  toSystem(event: string, data: any): void {
    this.toRoom(WS_ROOMS.SYSTEM, event, data);
  }

  // Server status events
  emitServerStatusChange(serverId: string, status: ServerStatusMessage): void {
    this.toServer(serverId, WS_EVENTS.SERVER_STATUS_CHANGE, status);
    this.toAdmin(WS_EVENTS.SERVER_STATUS_CHANGE, status);
  }

  emitServerLogUpdate(serverId: string, log: ServerLogMessage): void {
    this.toServer(serverId, WS_EVENTS.SERVER_LOG_UPDATE, log);
  }

  emitPlayerEvent(serverId: string, event: PlayerEventMessage): void {
    this.toServer(serverId, event.action === 'join' ? WS_EVENTS.SERVER_PLAYER_JOIN : WS_EVENTS.SERVER_PLAYER_LEAVE, event);
  }

  // Backup events
  emitBackupStart(serverId: string, backupId: string): void {
    this.toServer(serverId, WS_EVENTS.SERVER_BACKUP_START, { serverId, backupId });
  }

  emitBackupComplete(serverId: string, backupId: string, result: any): void {
    this.toServer(serverId, WS_EVENTS.SERVER_BACKUP_COMPLETE, { serverId, backupId, result });
  }

  emitBackupError(serverId: string, backupId: string, error: string): void {
    this.toServer(serverId, WS_EVENTS.SERVER_BACKUP_ERROR, { serverId, backupId, error });
  }

  // System events
  emitSystemNotification(notification: NotificationMessage): void {
    if (notification.userId) {
      this.toUser(notification.userId, WS_EVENTS.SYSTEM_NOTIFICATION, notification);
    } else if (notification.serverId) {
      this.toServer(notification.serverId, WS_EVENTS.SYSTEM_NOTIFICATION, notification);
    } else {
      this.broadcast(WS_EVENTS.SYSTEM_NOTIFICATION, notification);
    }
  }

  emitSystemMaintenance(message: string, startTime?: Date, endTime?: Date): void {
    this.toSystem(WS_EVENTS.SYSTEM_MAINTENANCE, {
      message,
      startTime,
      endTime,
      timestamp: Date.now(),
    });
  }

  emitSystemError(error: string, details?: any): void {
    this.toAdmin(WS_EVENTS.SYSTEM_ERROR, {
      error,
      details,
      timestamp: Date.now(),
    });
  }

  // Job events
  emitJobStart(jobId: string, jobType: string, data?: any): void {
    const message: JobEventMessage = {
      jobId,
      jobType,
      status: 'started',
      data,
    };
    this.broadcast(WS_EVENTS.JOB_START, message);
  }

  emitJobProgress(jobId: string, jobType: string, progress: number, data?: any): void {
    const message: JobEventMessage = {
      jobId,
      jobType,
      status: 'progress',
      progress,
      data,
    };
    this.broadcast(WS_EVENTS.JOB_PROGRESS, message);
  }

  emitJobComplete(jobId: string, jobType: string, result?: any): void {
    const message: JobEventMessage = {
      jobId,
      jobType,
      status: 'completed',
      data: result,
    };
    this.broadcast(WS_EVENTS.JOB_COMPLETE, message);
  }

  emitJobError(jobId: string, jobType: string, error: string): void {
    const message: JobEventMessage = {
      jobId,
      jobType,
      status: 'failed',
      error,
    };
    this.broadcast(WS_EVENTS.JOB_ERROR, message);
  }

  // Get connection statistics
  getStats(): any {
    if (!this.io) {
      return { connected: 0, rooms: 0 };
    }

    const sockets = this.io.sockets.sockets;
    const rooms = this.io.sockets.adapter.rooms;

    return {
      connected: sockets.size,
      rooms: rooms.size,
      namespaces: this.io._nsps.size,
    };
  }

  // Shutdown WebSocket service
  async shutdown(): Promise<void> {
    if (!this.io) {
      logger.warn('WebSocket service not initialized');
      return;
    }

    try {
      logger.info('🔄 Shutting down WebSocket service...');

      // Close all connections
      this.io.close();

      this.io = null;
      this.isInitialized = false;

      logger.info('✅ WebSocket service shutdown complete');
    } catch (error) {
      logger.error('❌ Error shutting down WebSocket service:', error);
    }
  }
}

// Global WebSocket service instance
export const webSocketService = new WebSocketService();

export default webSocketService;
