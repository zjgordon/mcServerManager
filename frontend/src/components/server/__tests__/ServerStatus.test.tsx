import React from 'react';
import { render, screen, waitFor, vi } from '../../../test';
import { TestDataFactory, setupApiMocks, setupWebSocketMocks } from '../../../test';
import ServerStatus from '../ServerStatus';
import type { Server } from '../../../types/api';

const mockServer: Server = TestDataFactory.server({
  id: 1,
  server_name: 'Test Server',
  status: 'Running',
  pid: 12345,
  memory_mb: 1024,
});

const mockServerStatus = {
  serverId: 1,
  status: 'Running',
  pid: 12345,
  memoryUsage: 512,
  cpuUsage: 15.5,
  uptime: 3600,
};

describe('ServerStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.serversList();
    setupWebSocketMocks.connectSuccess();
  });

  it('renders server status correctly', () => {
    render(<ServerStatus server={mockServer} />);

    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('PID: 12345')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(<ServerStatus server={mockServer} />);

    expect(screen.getByText('Loading status...')).toBeInTheDocument();
  });

  it('displays server information', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('PID: 12345')).toBeInTheDocument();
    });
  });

  it('displays memory usage', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('512 MB')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument(); // 512/1024 * 100
    });
  });

  it('displays CPU usage', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('15.5%')).toBeInTheDocument();
    });
  });

  it('displays uptime', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument();
    });
  });

  it('shows stopped status correctly', async () => {
    const stoppedStatus = {
      ...mockServerStatus,
      status: 'Stopped',
      pid: null,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    };
    setupApiMocks.getServerStatus.mockResolvedValue(stoppedStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument();
      expect(screen.queryByText('PID:')).not.toBeInTheDocument();
      expect(screen.getByText('0 MB')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    setupApiMocks.getServerStatus.mockRejectedValue(new Error('API Error'));
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load status')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('retries on error when retry button is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks.getServerStatus
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockServerStatus);
    
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load status')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  it('updates status automatically', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} autoRefresh={true} refreshInterval={1000} />);

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Simulate status update
    const updatedStatus = {
      ...mockServerStatus,
      memoryUsage: 768,
      cpuUsage: 25.0,
    };
    setupApiMocks.getServerStatus.mockResolvedValue(updatedStatus);

    await waitFor(() => {
      expect(screen.getByText('768 MB')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('receives real-time updates via WebSocket', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} enableRealtime={true} />);

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Simulate WebSocket update
    setupWebSocketMocks.simulateServerStatusUpdate({
      serverId: 1,
      status: 'Running',
      pid: 12345,
      memoryUsage: 768,
      cpuUsage: 25.0,
      uptime: 7200,
    });

    await waitFor(() => {
      expect(screen.getByText('768 MB')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
      expect(screen.getByText('2h 0m')).toBeInTheDocument();
    });
  });

  it('shows connection status indicator', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} enableRealtime={true} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Real-time connection status')).toBeInTheDocument();
    });
  });

  it('handles WebSocket connection error', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    setupWebSocketMocks.connectError();
    render(<ServerStatus server={mockServer} enableRealtime={true} />);

    await waitFor(() => {
      expect(screen.getByText('Real-time updates unavailable')).toBeInTheDocument();
    });
  });

  it('formats large memory values correctly', async () => {
    const largeMemoryStatus = {
      ...mockServerStatus,
      memoryUsage: 2048, // 2GB
    };
    setupApiMocks.getServerStatus.mockResolvedValue(largeMemoryStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('2.0 GB')).toBeInTheDocument();
    });
  });

  it('formats large uptime values correctly', async () => {
    const longUptimeStatus = {
      ...mockServerStatus,
      uptime: 3661, // 1 hour, 1 minute, 1 second
    };
    setupApiMocks.getServerStatus.mockResolvedValue(longUptimeStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('1h 1m 1s')).toBeInTheDocument();
    });
  });

  it('shows progress bars for resource usage', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      const memoryProgress = screen.getByLabelText('Memory usage');
      const cpuProgress = screen.getByLabelText('CPU usage');
      
      expect(memoryProgress).toHaveAttribute('aria-valuenow', '50');
      expect(cpuProgress).toHaveAttribute('aria-valuenow', '15.5');
    });
  });

  it('handles server with no PID', async () => {
    const noPidStatus = {
      ...mockServerStatus,
      pid: null,
    };
    setupApiMocks.getServerStatus.mockResolvedValue(noPidStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.queryByText('PID:')).not.toBeInTheDocument();
    });
  });

  it('shows refresh button when auto-refresh is disabled', () => {
    render(<ServerStatus server={mockServer} autoRefresh={false} />);

    expect(screen.getByLabelText('Refresh status')).toBeInTheDocument();
  });

  it('refreshes status when refresh button is clicked', async () => {
    const user = userEvent.setup();
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} autoRefresh={false} />);

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    const refreshButton = screen.getByLabelText('Refresh status');
    await user.click(refreshButton);

    // Should call the API again
    expect(setupApiMocks.getServerStatus).toHaveBeenCalledTimes(2);
  });

  it('cleans up intervals on unmount', () => {
    const { unmount } = render(<ServerStatus server={mockServer} autoRefresh={true} />);
    
    expect(() => unmount()).not.toThrow();
  });

  it('handles server status change from running to stopped', async () => {
    setupApiMocks.getServerStatus.mockResolvedValue(mockServerStatus);
    render(<ServerStatus server={mockServer} enableRealtime={true} />);

    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    // Simulate server stopping
    setupWebSocketMocks.simulateServerStatusUpdate({
      serverId: 1,
      status: 'Stopped',
      pid: null,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    });

    await waitFor(() => {
      expect(screen.getByText('Stopped')).toBeInTheDocument();
      expect(screen.queryByText('PID:')).not.toBeInTheDocument();
    });
  });

  it('shows warning when memory usage is high', async () => {
    const highMemoryStatus = {
      ...mockServerStatus,
      memoryUsage: 900, // 90% of 1024MB
    };
    setupApiMocks.getServerStatus.mockResolvedValue(highMemoryStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('High memory usage')).toBeInTheDocument();
    });
  });

  it('shows warning when CPU usage is high', async () => {
    const highCpuStatus = {
      ...mockServerStatus,
      cpuUsage: 85.0,
    };
    setupApiMocks.getServerStatus.mockResolvedValue(highCpuStatus);
    render(<ServerStatus server={mockServer} />);

    await waitFor(() => {
      expect(screen.getByText('High CPU usage')).toBeInTheDocument();
    });
  });
});
