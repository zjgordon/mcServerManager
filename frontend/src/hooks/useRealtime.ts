import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useToast } from './use-toast';
import type { 
  ServerStatusUpdate, 
  SystemStatsUpdate, 
  UserUpdate, 
  SystemAlert 
} from '../services/websocket';

// Hook for real-time server status updates
export const useRealtimeServerStatus = (serverId?: number) => {
  const { serverStatusUpdates, onServerStatusUpdate } = useWebSocket();
  const [currentStatus, setCurrentStatus] = useState<ServerStatusUpdate | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (serverId) {
      const update = serverStatusUpdates.get(serverId);
      if (update) {
        setCurrentStatus(update);
        // Invalidate and refetch server data
        queryClient.invalidateQueries({ queryKey: ['server', serverId] });
        queryClient.invalidateQueries({ queryKey: ['server-status', serverId] });
      }
    }
  }, [serverId, serverStatusUpdates, queryClient]);

  useEffect(() => {
    const unsubscribe = onServerStatusUpdate((update: ServerStatusUpdate) => {
      if (!serverId || update.serverId === serverId) {
        setCurrentStatus(update);
        // Invalidate related queries
        queryClient.invalidateQueries({ queryKey: ['server', update.serverId] });
        queryClient.invalidateQueries({ queryKey: ['server-status', update.serverId] });
        queryClient.invalidateQueries({ queryKey: ['servers'] });
      }
    });

    return unsubscribe;
  }, [serverId, onServerStatusUpdate, queryClient]);

  return currentStatus;
};

// Hook for real-time system statistics
export const useRealtimeSystemStats = () => {
  const { systemStats, onSystemStatsUpdate } = useWebSocket();
  const [currentStats, setCurrentStats] = useState<SystemStatsUpdate | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (systemStats) {
      setCurrentStats(systemStats);
      // Invalidate system stats queries
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    }
  }, [systemStats, queryClient]);

  useEffect(() => {
    const unsubscribe = onSystemStatsUpdate((update: SystemStatsUpdate) => {
      setCurrentStats(update);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    });

    return unsubscribe;
  }, [onSystemStatsUpdate, queryClient]);

  return currentStats;
};

// Hook for real-time user updates
export const useRealtimeUserUpdates = () => {
  const { userUpdates, onUserUpdate, clearUserUpdates } = useWebSocket();
  const [currentUpdates, setCurrentUpdates] = useState<UserUpdate[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    setCurrentUpdates(userUpdates);
    
    // Invalidate user-related queries when updates occur
    if (userUpdates.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
    }
  }, [userUpdates, queryClient]);

  useEffect(() => {
    const unsubscribe = onUserUpdate((update: UserUpdate) => {
      setCurrentUpdates(prev => [...prev, update]);
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['system-stats'] });
    });

    return unsubscribe;
  }, [onUserUpdate, queryClient]);

  const clearUpdates = useCallback(() => {
    clearUserUpdates();
    setCurrentUpdates([]);
  }, [clearUserUpdates]);

  return {
    updates: currentUpdates,
    clearUpdates,
  };
};

// Hook for real-time system alerts
export const useRealtimeSystemAlerts = () => {
  const { systemAlerts, onSystemAlert, clearAlerts } = useWebSocket();
  const [currentAlerts, setCurrentAlerts] = useState<SystemAlert[]>([]);
  const { toast } = useToast();
  const lastAlertIdRef = useRef<string | null>(null);

  useEffect(() => {
    setCurrentAlerts(systemAlerts);
    
    // Show toast notifications for new alerts
    systemAlerts.forEach(alert => {
      if (lastAlertIdRef.current !== alert.id) {
        lastAlertIdRef.current = alert.id;
        toast({
          title: alert.title,
          description: alert.message,
          variant: alert.type === 'error' ? 'destructive' : 
                   alert.type === 'warning' ? 'default' : 'default',
        });
      }
    });
  }, [systemAlerts, toast]);

  useEffect(() => {
    const unsubscribe = onSystemAlert((alert: SystemAlert) => {
      setCurrentAlerts(prev => [...prev, alert]);
      // Show toast notification
      toast({
        title: alert.title,
        description: alert.message,
        variant: alert.type === 'error' ? 'destructive' : 
                 alert.type === 'warning' ? 'default' : 'default',
      });
    });

    return unsubscribe;
  }, [onSystemAlert, toast]);

  const clearAlertsList = useCallback(() => {
    clearAlerts();
    setCurrentAlerts([]);
  }, [clearAlerts]);

  return {
    alerts: currentAlerts,
    clearAlerts: clearAlertsList,
  };
};

// Hook for real-time connection status
export const useRealtimeConnection = () => {
  const { isConnected, isConnecting, reconnectAttempts } = useWebSocket();
  const [connectionStatus, setConnectionStatus] = useState<{
    isConnected: boolean;
    isConnecting: boolean;
    reconnectAttempts: number;
    lastConnected?: Date;
    lastDisconnected?: Date;
  }>({
    isConnected: false,
    isConnecting: false,
    reconnectAttempts: 0,
  });

  useEffect(() => {
    setConnectionStatus(prev => ({
      ...prev,
      isConnected,
      isConnecting,
      reconnectAttempts,
      lastConnected: isConnected ? new Date() : prev.lastConnected,
      lastDisconnected: !isConnected && prev.isConnected ? new Date() : prev.lastDisconnected,
    }));
  }, [isConnected, isConnecting, reconnectAttempts]);

  return connectionStatus;
};

// Hook for real-time server list updates
export const useRealtimeServerList = () => {
  const { serverStatusUpdates, onServerStatusUpdate } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onServerStatusUpdate((update: ServerStatusUpdate) => {
      // Invalidate server list queries
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['server', update.serverId] });
      queryClient.invalidateQueries({ queryKey: ['server-status', update.serverId] });
    });

    return unsubscribe;
  }, [onServerStatusUpdate, queryClient]);

  return serverStatusUpdates;
};

// Hook for real-time admin dashboard updates
export const useRealtimeAdminDashboard = () => {
  const systemStats = useRealtimeSystemStats();
  const userUpdates = useRealtimeUserUpdates();
  const systemAlerts = useRealtimeSystemAlerts();
  const connectionStatus = useRealtimeConnection();

  return {
    systemStats,
    userUpdates,
    systemAlerts,
    connectionStatus,
  };
};

// Hook for real-time server management dashboard
export const useRealtimeServerDashboard = (selectedServerId?: number) => {
  const serverStatus = useRealtimeServerStatus(selectedServerId);
  const serverList = useRealtimeServerList();
  const systemAlerts = useRealtimeSystemAlerts();
  const connectionStatus = useRealtimeConnection();

  return {
    serverStatus,
    serverList,
    systemAlerts,
    connectionStatus,
  };
};

// Utility hook for managing real-time subscriptions
export const useRealtimeSubscriptions = () => {
  const { subscribe, unsubscribe, isConnected } = useWebSocket();
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const subscribeToChannel = useCallback((channel: string) => {
    if (isConnected && !subscriptionsRef.current.has(channel)) {
      subscribe(channel);
      subscriptionsRef.current.add(channel);
    }
  }, [subscribe, isConnected]);

  const unsubscribeFromChannel = useCallback((channel: string) => {
    if (subscriptionsRef.current.has(channel)) {
      unsubscribe(channel);
      subscriptionsRef.current.delete(channel);
    }
  }, [unsubscribe]);

  const clearAllSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach(channel => {
      unsubscribe(channel);
    });
    subscriptionsRef.current.clear();
  }, [unsubscribe]);

  // Auto-subscribe when connection is established
  useEffect(() => {
    if (isConnected) {
      subscriptionsRef.current.forEach(channel => {
        subscribe(channel);
      });
    }
  }, [isConnected, subscribe]);

  return {
    subscribeToChannel,
    unsubscribeFromChannel,
    clearAllSubscriptions,
    activeSubscriptions: Array.from(subscriptionsRef.current),
  };
};
