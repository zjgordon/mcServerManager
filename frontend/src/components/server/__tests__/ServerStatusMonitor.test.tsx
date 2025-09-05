import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ServerStatusMonitor from '../ServerStatusMonitor';
import type { Server as ServerType } from '../../../types/api';

// Mock the hooks
vi.mock('../../../hooks/useServer', () => ({
  useServerStatus: vi.fn(),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockServer: ServerType = {
  id: 1,
  server_name: 'Test Server',
  version: '1.21.8',
  port: 25565,
  status: 'Running',
  pid: 12345,
  memory_mb: 1024,
  owner_id: 1,
  level_seed: 'test-seed',
  gamemode: 'survival',
  difficulty: 'normal',
  hardcore: false,
  pvp: true,
  spawn_monsters: true,
  motd: 'Test Server',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockStatus = {
  is_running: true,
  pid: 12345,
  memory_usage: 512 * 1024 * 1024, // 512 MB
  cpu_usage: 15.5,
  uptime: 3600, // 1 hour
};

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('ServerStatusMonitor', () => {
  const mockUseServerStatus = vi.mocked(require('../../../hooks/useServer').useServerStatus);
  const mockOnStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServerStatus.mockReturnValue({
      data: mockStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders server status information correctly', () => {
    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Server Status')).toBeInTheDocument();
    expect(screen.getByText('Real-time monitoring of server process and resource usage')).toBeInTheDocument();
    expect(screen.getByText('Server is running')).toBeInTheDocument();
    expect(screen.getByText('PID: 12345')).toBeInTheDocument();
  });

  it('displays resource usage when server is running', () => {
    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Resource Usage')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('512.0 MB')).toBeInTheDocument();
    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
    expect(screen.getByText('15.5%')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
    expect(screen.getByText('1h 0m')).toBeInTheDocument();
  });

  it('shows stopped status when server is not running', () => {
    const stoppedStatus = { ...mockStatus, is_running: false, pid: null };
    mockUseServerStatus.mockReturnValue({
      data: stoppedStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Server is stopped')).toBeInTheDocument();
    expect(screen.queryByText('Resource Usage')).not.toBeInTheDocument();
  });

  it('displays loading state correctly', () => {
    mockUseServerStatus.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Server is stopped')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const error = new Error('Failed to fetch status');
    mockUseServerStatus.mockReturnValue({
      data: null,
      isLoading: false,
      error,
      refetch: vi.fn(),
    });

    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('Failed to fetch server status: Failed to fetch status')).toBeInTheDocument();
  });

  it('handles manual refresh correctly', async () => {
    const mockRefetch = vi.fn();
    mockUseServerStatus.mockReturnValue({
      data: mockStatus,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('calls onStatusChange when status data changes', () => {
    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(mockOnStatusChange).toHaveBeenCalledWith(mockStatus);
  });

  it('formats memory usage correctly', () => {
    const largeMemoryStatus = { ...mockStatus, memory_usage: 2 * 1024 * 1024 * 1024 }; // 2 GB
    mockUseServerStatus.mockReturnValue({
      data: largeMemoryStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('2.0 GB')).toBeInTheDocument();
  });

  it('formats uptime correctly for different durations', () => {
    const longUptimeStatus = { ...mockStatus, uptime: 86400 + 3600 + 60 }; // 1 day, 1 hour, 1 minute
    mockUseServerStatus.mockReturnValue({
      data: longUptimeStatus,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText('1d 1h')).toBeInTheDocument();
  });

  it('shows last update time', () => {
    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />
    );

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    expect(screen.getByText(/Auto-refresh every 5s/)).toBeInTheDocument();
  });

  it('handles custom refresh interval', () => {
    renderWithQueryClient(
      <ServerStatusMonitor 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
        refreshInterval={10000}
      />
    );

    expect(screen.getByText(/Auto-refresh every 10s/)).toBeInTheDocument();
  });
});
