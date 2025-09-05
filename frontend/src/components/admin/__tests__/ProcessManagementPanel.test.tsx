import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks, setupWebSocketMocks } from '../../../test';
import ProcessManagementPanel from '../ProcessManagementPanel';

const mockProcesses = [
  {
    pid: 12345,
    name: 'java',
    command: 'java -Xmx1024M -jar server.jar',
    memory: 512,
    cpu: 15.5,
    status: 'running',
    startTime: '2024-01-01T10:00:00Z',
    user: 'minecraft',
  },
  {
    pid: 12346,
    name: 'java',
    command: 'java -Xmx2048M -jar server.jar',
    memory: 1024,
    cpu: 25.0,
    status: 'running',
    startTime: '2024-01-01T11:00:00Z',
    user: 'minecraft',
  },
];

const mockSystemStats = {
  totalMemory: 8192,
  usedMemory: 2048,
  totalCpu: 100,
  usedCpu: 40.5,
  loadAverage: [0.5, 0.8, 1.2],
  uptime: 86400,
};

describe('ProcessManagementPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.systemStats(mockSystemStats);
    setupWebSocketMocks.connectSuccess();
  });

  it('renders process management panel correctly', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Process Management')).toBeInTheDocument();
      expect(screen.getByText('System Overview')).toBeInTheDocument();
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<ProcessManagementPanel />);

    expect(screen.getByText('Loading system information...')).toBeInTheDocument();
  });

  it('displays system statistics', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
      expect(screen.getByText('8.0 GB')).toBeInTheDocument(); // Total memory
      expect(screen.getByText('2.0 GB')).toBeInTheDocument(); // Used memory
      expect(screen.getByText('40.5%')).toBeInTheDocument(); // CPU usage
      expect(screen.getByText('1 day')).toBeInTheDocument(); // Uptime
    });
  });

  it('displays running processes', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
      expect(screen.getByText('java')).toBeInTheDocument();
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
      expect(screen.getByText('PID: 12346')).toBeInTheDocument();
    });
  });

  it('shows process details', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('java -Xmx1024M -jar server.jar')).toBeInTheDocument();
      expect(screen.getByText('512 MB')).toBeInTheDocument();
      expect(screen.getByText('15.5%')).toBeInTheDocument();
      expect(screen.getByText('minecraft')).toBeInTheDocument();
    });
  });

  it('filters processes by name', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('java')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search processes...');
    await user.type(searchInput, 'java');

    await waitFor(() => {
      expect(screen.getByText('java')).toBeInTheDocument();
      expect(screen.getAllByText('java')).toHaveLength(2);
    });
  });

  it('filters processes by PID', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search processes...');
    await user.type(searchInput, '12345');

    await waitFor(() => {
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
      expect(screen.queryByText('PID: 12346')).not.toBeInTheDocument();
    });
  });

  it('sorts processes by memory usage', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'memory');

    await waitFor(() => {
      const memoryElements = screen.getAllByText(/\d+ MB/);
      expect(memoryElements[0]).toHaveTextContent('1024 MB');
      expect(memoryElements[1]).toHaveTextContent('512 MB');
    });
  });

  it('sorts processes by CPU usage', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'cpu');

    await waitFor(() => {
      const cpuElements = screen.getAllByText(/\d+\.\d+%/);
      expect(cpuElements[0]).toHaveTextContent('25.0%');
      expect(cpuElements[1]).toHaveTextContent('15.5%');
    });
  });

  it('sorts processes by PID', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'pid');

    await waitFor(() => {
      const pidElements = screen.getAllByText(/PID: \d+/);
      expect(pidElements[0]).toHaveTextContent('PID: 12345');
      expect(pidElements[1]).toHaveTextContent('PID: 12346');
    });
  });

  it('kills a process', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    const killButton = screen.getByTitle('Kill process 12345');
    await user.click(killButton);

    expect(screen.getByText('Kill Process')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to kill process 12345?')).toBeInTheDocument();

    const confirmButton = screen.getByText('Kill');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Process killed successfully')).toBeInTheDocument();
    });
  });

  it('cancels process kill', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    const killButton = screen.getByTitle('Kill process 12345');
    await user.click(killButton);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(screen.queryByText('Kill Process')).not.toBeInTheDocument();
  });

  it('shows process details in modal', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    const detailsButton = screen.getByTitle('View process details');
    await user.click(detailsButton);

    expect(screen.getByText('Process Details')).toBeInTheDocument();
    expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    expect(screen.getByText('java')).toBeInTheDocument();
    expect(screen.getByText('java -Xmx1024M -jar server.jar')).toBeInTheDocument();
  });

  it('refreshes process list', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText('Refresh processes');
    await user.click(refreshButton);

    expect(setupApiMocks.getSystemStats).toHaveBeenCalledTimes(2);
  });

  it('shows memory usage progress bar', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      const memoryProgress = screen.getByLabelText('Memory usage');
      expect(memoryProgress).toHaveAttribute('aria-valuenow', '25'); // 2048/8192 * 100
    });
  });

  it('shows CPU usage progress bar', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      const cpuProgress = screen.getByLabelText('CPU usage');
      expect(cpuProgress).toHaveAttribute('aria-valuenow', '40.5');
    });
  });

  it('shows load average', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Load Average')).toBeInTheDocument();
      expect(screen.getByText('0.5, 0.8, 1.2')).toBeInTheDocument();
    });
  });

  it('shows system uptime', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('System Uptime')).toBeInTheDocument();
      expect(screen.getByText('1 day')).toBeInTheDocument();
    });
  });

  it('handles real-time updates via WebSocket', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });

    // Simulate WebSocket update
    setupWebSocketMocks.simulateSystemStatsUpdate({
      totalUsers: 10,
      totalServers: 5,
      runningServers: 3,
      totalMemoryUsage: 3072,
      systemMemoryTotal: 8192,
      systemMemoryUsed: 4096,
      systemCpuUsage: 60.0,
    });

    await waitFor(() => {
      expect(screen.getByText('3.0 GB')).toBeInTheDocument(); // Updated memory usage
      expect(screen.getByText('60%')).toBeInTheDocument(); // Updated CPU usage
    });
  });

  it('shows connection status indicator', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByLabelText('Real-time connection status')).toBeInTheDocument();
    });
  });

  it('handles WebSocket connection error', async () => {
    setupWebSocketMocks.connectError();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument();
    });
  });

  it('shows warning for high memory usage', async () => {
    const highMemoryStats = {
      ...mockSystemStats,
      usedMemory: 7168, // 90% of 8192MB
    };
    setupApiMocks.systemStats(highMemoryStats);
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('High memory usage detected')).toBeInTheDocument();
    });
  });

  it('shows warning for high CPU usage', async () => {
    const highCpuStats = {
      ...mockSystemStats,
      usedCpu: 90.0,
    };
    setupApiMocks.systemStats(highCpuStats);
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('High CPU usage detected')).toBeInTheDocument();
    });
  });

  it('shows warning for high load average', async () => {
    const highLoadStats = {
      ...mockSystemStats,
      loadAverage: [2.5, 3.0, 3.5],
    };
    setupApiMocks.systemStats(highLoadStats);
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('High system load detected')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    setupApiMocks.systemStats.mockRejectedValue(new Error('API Error'));
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load system information')).toBeInTheDocument();
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });
  });

  it('retries on error when retry button is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks.systemStats
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockSystemStats);
    
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load system information')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('System Statistics')).toBeInTheDocument();
    });
  });

  it('shows empty state when no processes', async () => {
    setupApiMocks.systemStats({
      ...mockSystemStats,
      processes: [],
    });
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('No processes found')).toBeInTheDocument();
    });
  });

  it('formats large memory values correctly', async () => {
    const largeMemoryStats = {
      ...mockSystemStats,
      totalMemory: 16384, // 16GB
      usedMemory: 8192,   // 8GB
    };
    setupApiMocks.systemStats(largeMemoryStats);
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('16.0 GB')).toBeInTheDocument();
      expect(screen.getByText('8.0 GB')).toBeInTheDocument();
    });
  });

  it('formats large uptime values correctly', async () => {
    const longUptimeStats = {
      ...mockSystemStats,
      uptime: 2592000, // 30 days
    };
    setupApiMocks.systemStats(longUptimeStats);
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('30 days')).toBeInTheDocument();
    });
  });

  it('shows process start time', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Started:')).toBeInTheDocument();
      expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
    });
  });

  it('handles process kill error', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });

    const killButton = screen.getByTitle('Kill process 12345');
    await user.click(killButton);

    const confirmButton = screen.getByText('Kill');
    await user.click(confirmButton);

    // Mock kill failure
    setupApiMocks.killProcess.mockRejectedValue(new Error('Kill failed'));

    await waitFor(() => {
      expect(screen.getByText('Failed to kill process')).toBeInTheDocument();
    });
  });

  it('shows process status indicators', async () => {
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<ProcessManagementPanel />);

    await waitFor(() => {
      expect(screen.getByText('Running Processes')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText('Refresh processes');
    refreshButton.focus();

    await user.keyboard('{Enter}');
    expect(setupApiMocks.getSystemStats).toHaveBeenCalledTimes(2);
  });
});
