import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdminManagementDashboard from '../AdminManagementDashboard';
import { useSystemStats, useUsers, useSystemConfig } from '../../../hooks/useAdmin';
import { useServers } from '../../../hooks/useServer';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../hooks/use-toast';

// Mock the hooks
vi.mock('../../../hooks/useAdmin');
vi.mock('../../../hooks/useServer');
vi.mock('../../../contexts/AuthContext');
vi.mock('../../../hooks/use-toast');

const mockUseSystemStats = vi.mocked(useSystemStats);
const mockUseUsers = vi.mocked(useUsers);
const mockUseSystemConfig = vi.mocked(useSystemConfig);
const mockUseServers = vi.mocked(useServers);
const mockUseAuth = vi.mocked(useAuth);
const mockUseToast = vi.mocked(useToast);

// Mock data
const mockUser = {
  id: 1,
  username: 'admin',
  email: 'admin@test.com',
  is_admin: true
};

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

const mockSystemConfig = {
  max_memory_per_server: 4096,
  max_servers_per_user: 5,
  default_server_memory: 1024
};

const mockToast = vi.fn();

describe('AdminManagementDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockUseAuth.mockReturnValue({
      user: mockUser,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    } as any);

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

    mockUseSystemConfig.mockReturnValue({
      data: mockSystemConfig,
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
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminManagementDashboard {...props} />
        </QueryClientProvider>
      </BrowserRouter>
    );
  };

  it('renders admin dashboard with correct title', () => {
    renderComponent();
    
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText(`Welcome back, ${mockUser.username}. Manage your Minecraft server infrastructure.`)).toBeInTheDocument();
  });

  it('displays quick stats correctly', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Total users
      expect(screen.getByText('1 admins')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Total servers
      expect(screen.getByText('1 running')).toBeInTheDocument();
      expect(screen.getByText('3072 MB')).toBeInTheDocument(); // Total memory allocated
      expect(screen.getByText('75.5% utilized')).toBeInTheDocument();
    });
  });

  it('shows system health status', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('displays all tab navigation options', () => {
    renderComponent();
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Processes')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('shows access denied for non-admin users', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, is_admin: false },
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    } as any);

    renderComponent();
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to access the admin panel. Administrator privileges are required.")).toBeInTheDocument();
    expect(screen.getByText('Return to Dashboard')).toBeInTheDocument();
  });

  it('shows loading state correctly', () => {
    mockUseSystemStats.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    // Should show loading skeletons
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const mockRefetchStats = vi.fn();
    const mockRefetchUsers = vi.fn();
    const mockRefetchServers = vi.fn();
    const mockRefetchConfig = vi.fn();

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

    mockUseSystemConfig.mockReturnValue({
      data: mockSystemConfig,
      isLoading: false,
      refetch: mockRefetchConfig,
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
      expect(mockRefetchConfig).toHaveBeenCalled();
    });
  });

  it('displays system alert when memory usage is high', async () => {
    const highMemoryStats = {
      memory_usage_summary: {
        utilization_percentage: 85.0,
        total_memory_gb: 16.0,
        available_memory_gb: 2.4,
        used_memory_gb: 13.6
      }
    };

    mockUseSystemStats.mockReturnValue({
      data: highMemoryStats,
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('System Alert')).toBeInTheDocument();
      expect(screen.getByText('High Memory Utilization Detected')).toBeInTheDocument();
    });
  });

  it('shows correct system health for different utilization levels', async () => {
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

  it('handles tab switching', async () => {
    renderComponent();
    
    const usersTab = screen.getByText('Users');
    
    await act(async () => {
      usersTab.click();
    });

    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });
  });

  it('displays admin badge', () => {
    renderComponent();
    
    expect(screen.getByText('Admin Access')).toBeInTheDocument();
  });

  it('shows correct user statistics breakdown', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('1 admins')).toBeInTheDocument();
      expect(screen.getByText('1 running')).toBeInTheDocument();
      expect(screen.getByText('1 stopped')).toBeInTheDocument();
    });
  });

  it('handles no data scenarios gracefully', async () => {
    mockUseUsers.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    mockUseServers.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: vi.fn(),
    } as any);

    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('0')).toBeInTheDocument(); // Total users
      expect(screen.getByText('0')).toBeInTheDocument(); // Total servers
    });
  });

  it('accepts selectedTab and onTabChange props', () => {
    const mockOnTabChange = vi.fn();
    
    renderComponent({ 
      selectedTab: 'users',
      onTabChange: mockOnTabChange 
    });
    
    expect(screen.getByText('Users')).toBeInTheDocument();
  });
});
