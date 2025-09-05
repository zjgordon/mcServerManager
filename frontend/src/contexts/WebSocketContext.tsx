import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import createWebSocketService, { 
  WebSocketService, 
  ServerStatusUpdate, 
  SystemStatsUpdate, 
  UserUpdate, 
  SystemAlert,
  WebSocketConfig 
} from '../services/websocket';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  reconnectAttempts: number;
  
  // Real-time data
  serverStatusUpdates: Map<number, ServerStatusUpdate>;
  systemStats: SystemStatsUpdate | null;
  systemAlerts: SystemAlert[];
  userUpdates: UserUpdate[];
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  clearAlerts: () => void;
  clearUserUpdates: () => void;
  
  // Event handlers
  onServerStatusUpdate: (callback: (update: ServerStatusUpdate) => void) => () => void;
  onSystemStatsUpdate: (callback: (update: SystemStatsUpdate) => void) => () => void;
  onUserUpdate: (callback: (update: UserUpdate) => void) => () => void;
  onSystemAlert: (callback: (alert: SystemAlert) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
  config?: Partial<WebSocketConfig>;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [serverStatusUpdates, setServerStatusUpdates] = useState<Map<number, ServerStatusUpdate>>(new Map());
  const [systemStats, setSystemStats] = useState<SystemStatsUpdate | null>(null);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [userUpdates, setUserUpdates] = useState<UserUpdate[]>([]);
  
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const eventHandlersRef = useRef<{
    serverStatus: ((update: ServerStatusUpdate) => void)[];
    systemStats: ((update: SystemStatsUpdate) => void)[];
    userUpdate: ((update: UserUpdate) => void)[];
    systemAlert: ((alert: SystemAlert) => void)[];
  }>({
    serverStatus: [],
    systemStats: [],
    userUpdate: [],
    systemAlert: [],
  });

  // Default WebSocket configuration
  const defaultConfig: WebSocketConfig = {
    url: `ws://localhost:5000/ws`,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000,
    ...config,
  };

  // Initialize WebSocket service
  useEffect(() => {
    if (!wsServiceRef.current) {
      wsServiceRef.current = createWebSocketService(defaultConfig);
    }

    const wsService = wsServiceRef.current;

    // Set up event listeners
    const handleConnected = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setReconnectAttempts(0);
      
      // Subscribe to channels based on user role
      if (user?.is_admin) {
        wsService.subscribe('admin');
        wsService.subscribe('system_stats');
        wsService.subscribe('user_updates');
      }
      wsService.subscribe('server_status');
      wsService.subscribe('system_alerts');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
      setIsConnecting(false);
    };

    const handleServerStatusUpdate = (update: ServerStatusUpdate) => {
      setServerStatusUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(update.serverId, update);
        return newMap;
      });
      
      // Notify event handlers
      eventHandlersRef.current.serverStatus.forEach(handler => handler(update));
    };

    const handleSystemStatsUpdate = (update: SystemStatsUpdate) => {
      setSystemStats(update);
      eventHandlersRef.current.systemStats.forEach(handler => handler(update));
    };

    const handleUserUpdate = (update: UserUpdate) => {
      setUserUpdates(prev => [...prev, update]);
      eventHandlersRef.current.userUpdate.forEach(handler => handler(update));
    };

    const handleSystemAlert = (alert: SystemAlert) => {
      setSystemAlerts(prev => [...prev, alert]);
      eventHandlersRef.current.systemAlert.forEach(handler => handler(alert));
    };

    // Register event listeners
    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);
    wsService.on('error', handleError);
    wsService.on('serverStatusUpdate', handleServerStatusUpdate);
    wsService.on('systemStatsUpdate', handleSystemStatsUpdate);
    wsService.on('userUpdate', handleUserUpdate);
    wsService.on('systemAlert', handleSystemAlert);

    return () => {
      // Clean up event listeners
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.off('error', handleError);
      wsService.off('serverStatusUpdate', handleServerStatusUpdate);
      wsService.off('systemStatsUpdate', handleSystemStatsUpdate);
      wsService.off('userUpdate', handleUserUpdate);
      wsService.off('systemAlert', handleSystemAlert);
    };
  }, [defaultConfig, user?.is_admin]);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user && !isConnected && !isConnecting) {
      connect();
    }
  }, [isAuthenticated, user, isConnected, isConnecting]);

  // Auto-disconnect when not authenticated
  useEffect(() => {
    if (!isAuthenticated && isConnected) {
      disconnect();
    }
  }, [isAuthenticated, isConnected]);

  const connect = useCallback(async () => {
    if (wsServiceRef.current && !isConnected && !isConnecting) {
      setIsConnecting(true);
      try {
        await wsServiceRef.current.connect();
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnecting(false);
      }
    }
  }, [isConnected, isConnecting]);

  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  const subscribe = useCallback((channel: string) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.subscribe(channel);
    }
  }, []);

  const unsubscribe = useCallback((channel: string) => {
    if (wsServiceRef.current) {
      wsServiceRef.current.unsubscribe(channel);
    }
  }, []);

  const clearAlerts = useCallback(() => {
    setSystemAlerts([]);
  }, []);

  const clearUserUpdates = useCallback(() => {
    setUserUpdates([]);
  }, []);

  // Event handler registration functions
  const onServerStatusUpdate = useCallback((callback: (update: ServerStatusUpdate) => void) => {
    eventHandlersRef.current.serverStatus.push(callback);
    return () => {
      const index = eventHandlersRef.current.serverStatus.indexOf(callback);
      if (index > -1) {
        eventHandlersRef.current.serverStatus.splice(index, 1);
      }
    };
  }, []);

  const onSystemStatsUpdate = useCallback((callback: (update: SystemStatsUpdate) => void) => {
    eventHandlersRef.current.systemStats.push(callback);
    return () => {
      const index = eventHandlersRef.current.systemStats.indexOf(callback);
      if (index > -1) {
        eventHandlersRef.current.systemStats.splice(index, 1);
      }
    };
  }, []);

  const onUserUpdate = useCallback((callback: (update: UserUpdate) => void) => {
    eventHandlersRef.current.userUpdate.push(callback);
    return () => {
      const index = eventHandlersRef.current.userUpdate.indexOf(callback);
      if (index > -1) {
        eventHandlersRef.current.userUpdate.splice(index, 1);
      }
    };
  }, []);

  const onSystemAlert = useCallback((callback: (alert: SystemAlert) => void) => {
    eventHandlersRef.current.systemAlert.push(callback);
    return () => {
      const index = eventHandlersRef.current.systemAlert.indexOf(callback);
      if (index > -1) {
        eventHandlersRef.current.systemAlert.splice(index, 1);
      }
    };
  }, []);

  const contextValue: WebSocketContextType = {
    // Connection state
    isConnected,
    isConnecting,
    reconnectAttempts,
    
    // Real-time data
    serverStatusUpdates,
    systemStats,
    systemAlerts,
    userUpdates,
    
    // Actions
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearAlerts,
    clearUserUpdates,
    
    // Event handlers
    onServerStatusUpdate,
    onSystemStatsUpdate,
    onUserUpdate,
    onSystemAlert,
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
