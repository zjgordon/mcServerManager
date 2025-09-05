import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface ServerStatusUpdate {
  serverId: number;
  status: 'Running' | 'Stopped' | 'Starting' | 'Stopping';
  pid?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  uptime?: number;
}

export interface SystemStatsUpdate {
  totalUsers: number;
  totalServers: number;
  runningServers: number;
  totalMemoryAllocated: number;
  memoryUtilization: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface UserUpdate {
  userId: number;
  action: 'created' | 'updated' | 'deleted';
  user?: any;
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  serverId?: number;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isConnected = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.isConnected) {
        resolve();
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.config.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connected');
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.isConnected = false;
          this.isConnecting = false;
          this.stopHeartbeat();
          this.emit('disconnected', event);
          
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  subscribe(channel: string): void {
    this.send({
      type: 'subscribe',
      data: { channel },
      timestamp: Date.now(),
    });
  }

  unsubscribe(channel: string): void {
    this.send({
      type: 'unsubscribe',
      data: { channel },
      timestamp: Date.now(),
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'server_status_update':
        this.emit('serverStatusUpdate', message.data as ServerStatusUpdate);
        break;
      case 'system_stats_update':
        this.emit('systemStatsUpdate', message.data as SystemStatsUpdate);
        break;
      case 'user_update':
        this.emit('userUpdate', message.data as UserUpdate);
        break;
      case 'system_alert':
        this.emit('systemAlert', message.data as SystemAlert);
        break;
      case 'heartbeat':
        // Respond to heartbeat
        this.send({
          type: 'heartbeat_ack',
          data: {},
          timestamp: Date.now(),
        });
        break;
      default:
        this.emit('message', message);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval! * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5));
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        console.error('Reconnect failed:', error);
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'heartbeat',
          data: {},
          timestamp: Date.now(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get connecting(): boolean {
    return this.isConnecting;
  }

  get reconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

// Create singleton instance
const createWebSocketService = (config: WebSocketConfig): WebSocketService => {
  return new WebSocketService(config);
};

export default createWebSocketService;
