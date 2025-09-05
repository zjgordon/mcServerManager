import React from 'react';
import { render, screen, waitFor, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import AdminDashboard from '../AdminDashboard';

const mockSystemStats = {
  totalUsers: 25,
  totalServers: 12,
  runningServers: 8,
  totalMemoryUsage: 4096,
  systemMemoryTotal: 16384,
  systemMemoryUsed: 8192,
  systemCpuUsage: 45.5,
  activeConnections: 15,
  systemUptime: 86400,
  lastBackup: '2024-01-01T12:00:00Z',
  diskUsage: 75.5,
};

const mockRecentActivity = [
  {
    id: 1,
    type: 'server_created',
    message: 'Server "Test Server" was created',
    timestamp: '2024-01-01T10:00:00Z',
    user: 'admin',
  },
  {
    id: 2,
    type: 'user_registered',
    message: 'New user "testuser" registered',
    timestamp: '2024-01-01T09:30:00Z',
    user: 'system',
  },
  {
    id: 3,
    type: 'server_started',
    message: 'Server "Test Server" was started',
    timestamp: '2024-01-01T09:00:00Z',
    user: 'admin',
  },
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.systemStats(mockSystemStats);
  });

  it('renders admin dashboard correctly', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('System Overview')).toBeInTheDocument();
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<AdminDashboard />);

    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('displays system statistics', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument(); // Total users
      expect(screen.getByText('12')).toBeInTheDocument(); // Total servers
      expect(screen.getByText('8')).toBeInTheDocument(); // Running servers
      expect(screen.getByText('15')).toBeInTheDocument(); // Active connections
    });
  });

  it('displays memory usage statistics', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('4.0 GB')).toBeInTheDocument(); // Total memory usage
      expect(screen.getByText('16.0 GB')).toBeInTheDocument(); // System memory total
      expect(screen.getByText('8.0 GB')).toBeInTheDocument(); // System memory used
    });
  });

  it('displays CPU usage', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('45.5%')).toBeInTheDocument();
    });
  });

  it('displays system uptime', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1 day')).toBeInTheDocument();
    });
  });

  it('displays disk usage', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('75.5%')).toBeInTheDocument();
    });
  });

  it('shows memory usage progress bar', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      const memoryProgress = screen.getByLabelText('Memory usage');
      expect(memoryProgress).toHaveAttribute('aria-valuenow', '50'); // 8192/16384 * 100
    });
  });

  it('shows CPU usage progress bar', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      const cpuProgress = screen.getByLabelText('CPU usage');
      expect(cpuProgress).toHaveAttribute('aria-valuenow', '45.5');
    });
  });

  it('shows disk usage progress bar', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      const diskProgress = screen.getByLabelText('Disk usage');
      expect(diskProgress).toHaveAttribute('aria-valuenow', '75.5');
    });
  });

  it('displays recent activity', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('Server "Test Server" was created')).toBeInTheDocument();
      expect(screen.getByText('New user "testuser" registered')).toBeInTheDocument();
      expect(screen.getByText('Server "Test Server" was started')).toBeInTheDocument();
    });
  });

  it('shows activity timestamps', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    });
  });

  it('shows activity users', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('system')).toBeInTheDocument();
    });
  });

  it('displays quick action buttons', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Server')).toBeInTheDocument();
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
      expect(screen.getByText('System Settings')).toBeInTheDocument();
      expect(screen.getByText('View Logs')).toBeInTheDocument();
    });
  });

  it('navigates to create server page', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Server')).toBeInTheDocument();
    });

    const createServerButton = screen.getByText('Create Server');
    await user.click(createServerButton);

    // Should navigate to create server page
    expect(mockNavigate).toHaveBeenCalledWith('/servers/create');
  });

  it('navigates to user management page', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Manage Users')).toBeInTheDocument();
    });

    const manageUsersButton = screen.getByText('Manage Users');
    await user.click(manageUsersButton);

    // Should navigate to user management page
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
  });

  it('navigates to system settings page', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Settings')).toBeInTheDocument();
    });

    const systemSettingsButton = screen.getByText('System Settings');
    await user.click(systemSettingsButton);

    // Should navigate to system settings page
    expect(mockNavigate).toHaveBeenCalledWith('/admin/settings');
  });

  it('navigates to logs page', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('View Logs')).toBeInTheDocument();
    });

    const viewLogsButton = screen.getByText('View Logs');
    await user.click(viewLogsButton);

    // Should navigate to logs page
    expect(mockNavigate).toHaveBeenCalledWith('/admin/logs');
  });

  it('shows system health status', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });
  });

  it('shows warning for high memory usage', async () => {
    const highMemoryStats = {
      ...mockSystemStats,
      systemMemoryUsed: 14336, // 90% of 16384MB
    };
    setupApiMocks.systemStats(highMemoryStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
    });
  });

  it('shows warning for high CPU usage', async () => {
    const highCpuStats = {
      ...mockSystemStats,
      systemCpuUsage: 85.0,
    };
    setupApiMocks.systemStats(highCpuStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
    });
  });

  it('shows warning for high disk usage', async () => {
    const highDiskStats = {
      ...mockSystemStats,
      diskUsage: 90.0,
    };
    setupApiMocks.systemStats(highDiskStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('High disk usage detected')).toBeInTheDocument();
    });
  });

  it('shows critical status for very high resource usage', async () => {
    const criticalStats = {
      ...mockSystemStats,
      systemMemoryUsed: 15360, // 95% of 16384MB
      systemCpuUsage: 95.0,
      diskUsage: 95.0,
    };
    setupApiMocks.systemStats(criticalStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Critical resource usage detected')).toBeInTheDocument();
    });
  });

  it('displays last backup information', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Last Backup')).toBeInTheDocument();
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    });
  });

  it('shows backup status', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Backup Status')).toBeInTheDocument();
      expect(screen.getByText('Up to date')).toBeInTheDocument();
    });
  });

  it('shows warning for old backup', async () => {
    const oldBackupStats = {
      ...mockSystemStats,
      lastBackup: '2024-01-01T00:00:00Z', // Very old backup
    };
    setupApiMocks.systemStats(oldBackupStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Backup Status')).toBeInTheDocument();
      expect(screen.getByText('Backup is outdated')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    setupApiMocks.systemStats.mockRejectedValue(new Error('API Error'));
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('retries on error when retry button is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks.systemStats
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockSystemStats);
    
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('System Overview')).toBeInTheDocument();
    });
  });

  it('refreshes dashboard data', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Overview')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText('Refresh dashboard');
    await user.click(refreshButton);

    expect(setupApiMocks.getSystemStats).toHaveBeenCalledTimes(2);
  });

  it('shows server status breakdown', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Server Status')).toBeInTheDocument();
      expect(screen.getByText('8 Running')).toBeInTheDocument();
      expect(screen.getByText('4 Stopped')).toBeInTheDocument();
    });
  });

  it('shows user activity metrics', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User Activity')).toBeInTheDocument();
      expect(screen.getByText('15 Active')).toBeInTheDocument();
      expect(screen.getByText('10 Inactive')).toBeInTheDocument();
    });
  });

  it('displays system performance metrics', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('Throughput')).toBeInTheDocument();
    });
  });

  it('shows system alerts', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Alerts')).toBeInTheDocument();
    });
  });

  it('handles empty recent activity', async () => {
    setupApiMocks.systemStats({
      ...mockSystemStats,
      recentActivity: [],
    });
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText('No recent activity')).toBeInTheDocument();
    });
  });

  it('formats large numbers correctly', async () => {
    const largeStats = {
      ...mockSystemStats,
      totalUsers: 1000,
      totalServers: 500,
      runningServers: 300,
    };
    setupApiMocks.systemStats(largeStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('300')).toBeInTheDocument();
    });
  });

  it('shows system information', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('System Information')).toBeInTheDocument();
      expect(screen.getByText('Version')).toBeInTheDocument();
      expect(screen.getByText('Environment')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Create Server')).toBeInTheDocument();
    });

    const createServerButton = screen.getByText('Create Server');
    createServerButton.focus();

    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/servers/create');
  });

  it('shows maintenance mode indicator', async () => {
    const maintenanceStats = {
      ...mockSystemStats,
      maintenanceMode: true,
    };
    setupApiMocks.systemStats(maintenanceStats);
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Maintenance Mode')).toBeInTheDocument();
      expect(screen.getByText('System is in maintenance mode')).toBeInTheDocument();
    });
  });

  it('shows system status indicators', async () => {
    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });
});
