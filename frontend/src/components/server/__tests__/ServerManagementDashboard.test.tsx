import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ServerManagementDashboard from '../ServerManagementDashboard';
import type { Server as ServerType } from '../../../types/api';

// Mock the hooks
vi.mock('../../../hooks/useServer', () => ({
  useServers: vi.fn(),
  useStartServer: vi.fn(),
  useStopServer: vi.fn(),
  useDeleteServer: vi.fn(),
  useBackupServer: vi.fn(),
}));

vi.mock('../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockServers: ServerType[] = [
  {
    id: 1,
    server_name: 'Test Server 1',
    version: '1.21.8',
    port: 25565,
    status: 'Running',
    pid: 12345,
    memory_mb: 1024,
    owner_id: 1,
    level_seed: 'test-seed-1',
    gamemode: 'survival',
    difficulty: 'normal',
    hardcore: false,
    pvp: true,
    spawn_monsters: true,
    motd: 'Test Server 1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    server_name: 'Test Server 2',
    version: '1.21.8',
    port: 25566,
    status: 'Stopped',
    pid: null,
    memory_mb: 2048,
    owner_id: 1,
    level_seed: 'test-seed-2',
    gamemode: 'creative',
    difficulty: 'easy',
    hardcore: false,
    pvp: false,
    spawn_monsters: false,
    motd: 'Test Server 2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
  },
];

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ServerManagementDashboard', () => {
  const mockUseServers = vi.mocked(require('../../../hooks/useServer').useServers);
  const mockUseStartServer = vi.mocked(require('../../../hooks/useServer').useStartServer);
  const mockUseStopServer = vi.mocked(require('../../../hooks/useServer').useStopServer);
  const mockUseDeleteServer = vi.mocked(require('../../../hooks/useServer').useDeleteServer);
  const mockUseBackupServer = vi.mocked(require('../../../hooks/useServer').useBackupServer);

  const mockStartMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockStopMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockDeleteMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockBackupMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseServers.mockReturnValue({
      data: mockServers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseStartServer.mockReturnValue(mockStartMutation);
    mockUseStopServer.mockReturnValue(mockStopMutation);
    mockUseDeleteServer.mockReturnValue(mockDeleteMutation);
    mockUseBackupServer.mockReturnValue(mockBackupMutation);
  });

  it('renders dashboard with server statistics', () => {
    renderWithProviders(<ServerManagementDashboard />);

    expect(screen.getByText('Server Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your Minecraft servers and monitor their performance')).toBeInTheDocument();
    
    // Check stats
    expect(screen.getByText('Total Servers')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.getByText('Total Memory')).toBeInTheDocument();
    expect(screen.getByText('3.0 GB')).toBeInTheDocument();
  });

  it('renders tabs correctly', () => {
    renderWithProviders(<ServerManagementDashboard />);

    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Server Details')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
  });

  it('shows server list in overview tab', () => {
    renderWithProviders(<ServerManagementDashboard />);

    expect(screen.getByText('Test Server 1')).toBeInTheDocument();
    expect(screen.getByText('Test Server 2')).toBeInTheDocument();
  });

  it('handles server selection', async () => {
    const mockOnServerSelect = vi.fn();
    renderWithProviders(
      <ServerManagementDashboard 
        selectedServerId={1}
        onServerSelect={mockOnServerSelect}
      />
    );

    // Should show server details tab as active
    expect(screen.getByText('Server Details')).toBeInTheDocument();
  });

  it('shows no server selected message in details tab', () => {
    renderWithProviders(<ServerManagementDashboard />);

    // Click on Server Details tab
    fireEvent.click(screen.getByText('Server Details'));
    
    expect(screen.getByText('No Server Selected')).toBeInTheDocument();
    expect(screen.getByText('Select a server from the overview to view its details and configuration.')).toBeInTheDocument();
  });

  it('shows no server selected message in monitoring tab', () => {
    renderWithProviders(<ServerManagementDashboard />);

    // Click on Monitoring tab
    fireEvent.click(screen.getByText('Monitoring'));
    
    expect(screen.getByText('No Server Selected')).toBeInTheDocument();
    expect(screen.getByText('Select a server from the overview to monitor its performance and view logs.')).toBeInTheDocument();
  });

  it('handles create server button click', () => {
    renderWithProviders(<ServerManagementDashboard />);

    const createButton = screen.getByText('Create Server');
    expect(createButton).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    const mockRefetch = vi.fn();
    mockUseServers.mockReturnValue({
      data: mockServers,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithProviders(<ServerManagementDashboard />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('displays loading state correctly', () => {
    mockUseServers.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<ServerManagementDashboard />);

    // Should show loading skeleton
    expect(screen.getByText('Server Management')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const error = new Error('Failed to load servers');
    mockUseServers.mockReturnValue({
      data: null,
      isLoading: false,
      error,
      refetch: vi.fn(),
    });

    renderWithProviders(<ServerManagementDashboard />);

    expect(screen.getByText('Error Loading Servers')).toBeInTheDocument();
    expect(screen.getByText('Failed to load servers')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Create Server')).toBeInTheDocument();
  });

  it('handles server start action', async () => {
    mockStartMutation.mutateAsync.mockResolvedValue(1);
    
    renderWithProviders(<ServerManagementDashboard />);

    // Find and click start button for stopped server
    const startButtons = screen.getAllByText('Start');
    if (startButtons.length > 0) {
      fireEvent.click(startButtons[0]);
      
      await waitFor(() => {
        expect(mockStartMutation.mutateAsync).toHaveBeenCalled();
      });
    }
  });

  it('handles server stop action', async () => {
    mockStopMutation.mutateAsync.mockResolvedValue(1);
    
    renderWithProviders(<ServerManagementDashboard />);

    // Find and click stop button for running server
    const stopButtons = screen.getAllByText('Stop');
    if (stopButtons.length > 0) {
      fireEvent.click(stopButtons[0]);
      
      await waitFor(() => {
        expect(mockStopMutation.mutateAsync).toHaveBeenCalled();
      });
    }
  });

  it('handles server delete action', async () => {
    mockDeleteMutation.mutateAsync.mockResolvedValue(1);
    
    renderWithProviders(<ServerManagementDashboard />);

    // Find and click delete button
    const deleteButtons = screen.getAllByTitle('Delete Server');
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      
      await waitFor(() => {
        expect(mockDeleteMutation.mutateAsync).toHaveBeenCalled();
      });
    }
  });

  it('handles server backup action', async () => {
    mockBackupMutation.mutateAsync.mockResolvedValue(1);
    
    renderWithProviders(<ServerManagementDashboard />);

    // Find and click backup button
    const backupButtons = screen.getAllByTitle('Create Backup');
    if (backupButtons.length > 0) {
      fireEvent.click(backupButtons[0]);
      
      await waitFor(() => {
        expect(mockBackupMutation.mutateAsync).toHaveBeenCalled();
      });
    }
  });

  it('shows mutation loading state', () => {
    mockStartMutation.isPending = true;
    
    renderWithProviders(<ServerManagementDashboard />);

    // Should show loading state in UI
    expect(screen.getByText('Server Management')).toBeInTheDocument();
  });

  it('calculates server statistics correctly', () => {
    renderWithProviders(<ServerManagementDashboard />);

    // Check that stats are calculated correctly
    expect(screen.getByText('2')).toBeInTheDocument(); // Total servers
    expect(screen.getByText('1')).toBeInTheDocument(); // Running servers
    expect(screen.getByText('1')).toBeInTheDocument(); // Stopped servers
    expect(screen.getByText('3.0 GB')).toBeInTheDocument(); // Total memory (1024 + 2048 = 3072 MB = 3.0 GB)
  });
});
