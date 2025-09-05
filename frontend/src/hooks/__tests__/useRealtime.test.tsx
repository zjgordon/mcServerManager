import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  useRealtimeServerStatus, 
  useRealtimeSystemStats, 
  useRealtimeUserUpdates, 
  useRealtimeSystemAlerts,
  useRealtimeConnection,
  useRealtimeServerList,
  useRealtimeAdminDashboard,
  useRealtimeServerDashboard,
  useRealtimeSubscriptions
} from '../useRealtime';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { useToast } from '../use-toast';

// Mock the useToast hook
vi.mock('../use-toast');
const mockUseToast = vi.mocked(useToast);

// Mock WebSocket context
const mockWebSocketContext = {
  isConnected: true,
  isConnecting: false,
  reconnectAttempts: 0,
  serverStatusUpdates: new Map(),
  systemStats: null,
  systemAlerts: [],
  userUpdates: [],
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  clearAlerts: vi.fn(),
  clearUserUpdates: vi.fn(),
  onServerStatusUpdate: vi.fn(() => vi.fn()),
  onSystemStatsUpdate: vi.fn(() => vi.fn()),
  onUserUpdate: vi.fn(() => vi.fn()),
  onSystemAlert: vi.fn(() => vi.fn()),
};

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => mockWebSocketContext,
}));

const mockToast = vi.fn();
mockUseToast.mockReturnValue({
  toast: mockToast,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        {children}
      </WebSocketProvider>
    </QueryClientProvider>
  );
};

describe('useRealtime hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWebSocketContext.serverStatusUpdates.clear();
    mockWebSocketContext.systemStats = null;
    mockWebSocketContext.systemAlerts = [];
    mockWebSocketContext.userUpdates = [];
  });

  describe('useRealtimeServerStatus', () => {
    it('should return null when no server status is available', () => {
      const { result } = renderHook(() => useRealtimeServerStatus(1), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeNull();
    });

    it('should return server status when available', () => {
      const mockStatus = {
        serverId: 1,
        status: 'Running' as const,
        pid: 12345,
        memoryUsage: 512,
        cpuUsage: 15.5,
        uptime: 3600,
      };

      mockWebSocketContext.serverStatusUpdates.set(1, mockStatus);

      const { result } = renderHook(() => useRealtimeServerStatus(1), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual({
        is_running: true,
        pid: 12345,
        memory_usage: 512,
        cpu_usage: 15.5,
        uptime: 3600,
      });
    });

    it('should register event handler on mount', () => {
      renderHook(() => useRealtimeServerStatus(1), {
        wrapper: createWrapper(),
      });

      expect(mockWebSocketContext.onServerStatusUpdate).toHaveBeenCalled();
    });
  });

  describe('useRealtimeSystemStats', () => {
    it('should return null when no system stats are available', () => {
      const { result } = renderHook(() => useRealtimeSystemStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeNull();
    });

    it('should return system stats when available', () => {
      const mockStats = {
        totalUsers: 5,
        totalServers: 3,
        runningServers: 2,
        totalMemoryAllocated: 2048,
        memoryUtilization: 75.5,
        systemHealth: 'good' as const,
      };

      mockWebSocketContext.systemStats = mockStats;

      const { result } = renderHook(() => useRealtimeSystemStats(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toEqual(mockStats);
    });
  });

  describe('useRealtimeUserUpdates', () => {
    it('should return empty updates array initially', () => {
      const { result } = renderHook(() => useRealtimeUserUpdates(), {
        wrapper: createWrapper(),
      });

      expect(result.current.updates).toEqual([]);
      expect(typeof result.current.clearUpdates).toBe('function');
    });

    it('should return user updates when available', () => {
      const mockUpdates = [
        {
          userId: 1,
          action: 'created' as const,
          user: { id: 1, username: 'testuser' },
        },
      ];

      mockWebSocketContext.userUpdates = mockUpdates;

      const { result } = renderHook(() => useRealtimeUserUpdates(), {
        wrapper: createWrapper(),
      });

      expect(result.current.updates).toEqual(mockUpdates);
    });

    it('should clear updates when clearUpdates is called', () => {
      const { result } = renderHook(() => useRealtimeUserUpdates(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearUpdates();
      });

      expect(mockWebSocketContext.clearUserUpdates).toHaveBeenCalled();
    });
  });

  describe('useRealtimeSystemAlerts', () => {
    it('should return empty alerts array initially', () => {
      const { result } = renderHook(() => useRealtimeSystemAlerts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.alerts).toEqual([]);
      expect(typeof result.current.clearAlerts).toBe('function');
    });

    it('should return system alerts when available', () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'warning' as const,
          title: 'High Memory Usage',
          message: 'Memory usage is above 80%',
          timestamp: Date.now(),
        },
      ];

      mockWebSocketContext.systemAlerts = mockAlerts;

      const { result } = renderHook(() => useRealtimeSystemAlerts(), {
        wrapper: createWrapper(),
      });

      expect(result.current.alerts).toEqual(mockAlerts);
    });

    it('should show toast notifications for new alerts', async () => {
      const mockAlert = {
        id: 'alert-1',
        type: 'warning' as const,
        title: 'High Memory Usage',
        message: 'Memory usage is above 80%',
        timestamp: Date.now(),
      };

      mockWebSocketContext.systemAlerts = [mockAlert];

      renderHook(() => useRealtimeSystemAlerts(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: mockAlert.title,
          description: mockAlert.message,
          variant: 'default',
        });
      });
    });

    it('should clear alerts when clearAlerts is called', () => {
      const { result } = renderHook(() => useRealtimeSystemAlerts(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearAlerts();
      });

      expect(mockWebSocketContext.clearAlerts).toHaveBeenCalled();
    });
  });

  describe('useRealtimeConnection', () => {
    it('should return connection status', () => {
      const { result } = renderHook(() => useRealtimeConnection(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.reconnectAttempts).toBe(0);
    });
  });

  describe('useRealtimeServerList', () => {
    it('should return server status updates map', () => {
      const { result } = renderHook(() => useRealtimeServerList(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeInstanceOf(Map);
    });
  });

  describe('useRealtimeAdminDashboard', () => {
    it('should return admin dashboard data', () => {
      const { result } = renderHook(() => useRealtimeAdminDashboard(), {
        wrapper: createWrapper(),
      });

      expect(result.current.systemStats).toBeNull();
      expect(result.current.userUpdates).toBeDefined();
      expect(result.current.systemAlerts).toBeDefined();
      expect(result.current.connectionStatus).toBeDefined();
    });
  });

  describe('useRealtimeServerDashboard', () => {
    it('should return server dashboard data', () => {
      const { result } = renderHook(() => useRealtimeServerDashboard(1), {
        wrapper: createWrapper(),
      });

      expect(result.current.serverStatus).toBeNull();
      expect(result.current.serverList).toBeDefined();
      expect(result.current.systemAlerts).toBeDefined();
      expect(result.current.connectionStatus).toBeDefined();
    });
  });

  describe('useRealtimeSubscriptions', () => {
    it('should provide subscription management functions', () => {
      const { result } = renderHook(() => useRealtimeSubscriptions(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.subscribeToChannel).toBe('function');
      expect(typeof result.current.unsubscribeFromChannel).toBe('function');
      expect(typeof result.current.clearAllSubscriptions).toBe('function');
      expect(Array.isArray(result.current.activeSubscriptions)).toBe(true);
    });

    it('should subscribe to channel when connected', () => {
      const { result } = renderHook(() => useRealtimeSubscriptions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.subscribeToChannel('test-channel');
      });

      expect(mockWebSocketContext.subscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should unsubscribe from channel', () => {
      const { result } = renderHook(() => useRealtimeSubscriptions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.unsubscribeFromChannel('test-channel');
      });

      expect(mockWebSocketContext.unsubscribe).toHaveBeenCalledWith('test-channel');
    });

    it('should clear all subscriptions', () => {
      const { result } = renderHook(() => useRealtimeSubscriptions(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.clearAllSubscriptions();
      });

      expect(mockWebSocketContext.unsubscribe).toHaveBeenCalled();
    });
  });
});
