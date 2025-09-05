import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import SystemMonitoringPanel from '../SystemMonitoringPanel';
import { useSystemStats, useUsers } from '../../../hooks/useAdmin';
import { useServers } from '../../../hooks/useServer';
import { useToast } from '../../../hooks/use-toast';

// Mock the hooks
vi.mock('../../../hooks/useAdmin');
vi.mock('../../../hooks/useServer');
vi.mock('../../../hooks/use-toast');

const mockUseSystemStats = vi.mocked(useSystemStats);
const mockUseUsers = vi.mocked(useUsers);
const mockUseServers = vi.mocked(useServers);
const mockUseToast = vi.mocked(useToast);

// Mock data
const mockSystemStats = {
  memory_usage_summary: {
    utilization_percentage: 75.5,
    total_memory_gb: 16.0,
    available_memory_gb: 4.0,
    used_memory_gb: 12.0
  }
};

const mockUsers = [
  { id: 1, username: 'admin', email: 'admin@test.com', is_admin: true },
  { id: 2, username: 'user1', email: 'user1@test.com', is_admin: false }
];

const mockServers = [
  { id: 1, name: 'Server 1', status: 'Running', memory_mb: 1024 },
  { id: 2, name: 'Server 2', status: 'Stopped', memory_mb: 2048 }
];

const mockToast = vi.fn();

describe('SystemMonitoringPanel', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseToast.mockReturnValue({
      toast: mockToast,
    });

    mockUseSystemStats.mockReturnValue({
      data: mockSystemStats,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    mockUseUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    mockUseServers.mockReturnValue({
      data: mockServers,
      isLoading: false,
      refetch: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SystemMonitoringPanel {...props} />
      </QueryClientProvider>
    );
  };

  it('renders system monitoring panel with correct title', () => {
    renderComponent();
    
    expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Auto-refresh: 10s')).toBeInTheDocument();
  });

  it('displays system health status correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('shows server status information', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Running servers
      expect(screen.getByText('2')).toBeInTheDocument(); // Total servers
    });
  });

  it('displays memory usage information', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('3072 MB')).toBeInTheDocument(); // Total allocated memory
      expect(screen.getByText('75.5%')).toBeInTheDocument(); // Utilization percentage
    });
  });

  it('shows loading state correctly', () => {
    mockUseSystemStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    // Should show loading skeletons
  });

  it('handles refresh button click', async () => {
    const mockRefetchStats = vi.fn();
    const mockRefetchUsers = vi.fn();
    const mockRefetchServers = vi.fn();

    mockUseSystemStats.mockReturnValue({
      data: mockSystemStats,
      isLoading: false,
      refetch: mockRefetchStats,
    } as any);

    mockUseUsers.mockReturnValue({
      data: mockUsers,
      isLoading: false,
      refetch: mockRefetchUsers,
    } as any);

    mockUseServers.mockReturnValue({
      data: mockServers,
      isLoading: false,
      refetch: mockRefetchServers,
    } as any);

    renderComponent();
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    
    await act(async () => {
      refreshButton.click();
    });

    await waitFor(() => {
      expect(mockRefetchStats).toHaveBeenCalled();
      expect(mockRefetchUsers).toHaveBeenCalled();
      expect(mockRefetchServers).toHaveBeenCalled();
    });
  });

  it('displays system alerts when memory usage is high', async () => {
    const highMemoryStats = {
      memory_usage_summary: {
        utilization_percentage: 95.0,
        total_memory_gb: 16.0,
        available_memory_gb: 0.8,
        used_memory_gb: 15.2
      }
    };

    mockUseSystemStats.mockReturnValue({
      data: highMemoryStats,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('System Alerts')).toBeInTheDocument();
      expect(screen.getByText('High Memory Utilization')).toBeInTheDocument();
    });
  });

  it('calls onSystemAlert callback when alerts are generated', async () => {
    const mockOnSystemAlert = vi.fn();
    const highMemoryStats = {
      memory_usage_summary: {
        utilization_percentage: 95.0,
        total_memory_gb: 16.0,
        available_memory_gb: 0.8,
        used_memory_gb: 15.2
      }
    };

    mockUseSystemStats.mockReturnValue({
      data: highMemoryStats,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent({ onSystemAlert: mockOnSystemAlert });
    
    await waitFor(() => {
      expect(mockOnSystemAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical',
          title: 'High Memory Utilization',
        })
      );
    });
  });

  it('displays performance trends when metrics history is available', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Performance Trends')).toBeInTheDocument();
      expect(screen.getByText('Memory Utilization Trend')).toBeInTheDocument();
      expect(screen.getByText('Running Servers Trend')).toBeInTheDocument();
    });
  });

  it('shows last update timestamp', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  it('handles custom refresh interval', () => {
    renderComponent({ refreshInterval: 30000 });
    
    expect(screen.getByText('Auto-refresh: 30s')).toBeInTheDocument();
  });

  it('displays correct system health for different utilization levels', async () => {
    const testCases = [
      { utilization: 50, expectedStatus: 'Excellent' },
      { utilization: 75, expectedStatus: 'Good' },
      { utilization: 90, expectedStatus: 'Warning' },
      { utilization: 98, expectedStatus: 'Critical' }
    ];

    for (const testCase of testCases) {
      const stats = {
        memory_usage_summary: {
          utilization_percentage: testCase.utilization,
          total_memory_gb: 16.0,
          available_memory_gb: 16.0 - (16.0 * testCase.utilization / 100),
          used_memory_gb: 16.0 * testCase.utilization / 100
        }
      };

      mockUseSystemStats.mockReturnValue({
        data: stats,
        isLoading: false,
        refetch: vi.fn(),
      } as any);

      const { unmount } = renderComponent();
      
      await waitFor(() => {
        expect(screen.getByText(testCase.expectedStatus)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('handles no servers scenario', async () => {
    mockUseServers.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Running servers
      expect(screen.getByText('0')).toBeInTheDocument(); // Total servers
    });
  });

  it('handles no users scenario', async () => {
    mockUseUsers.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Total users
    });
  });
});
