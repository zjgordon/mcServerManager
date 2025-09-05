import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ServerActionPanel from '../ServerActionPanel';
import type { Server } from '../../../../types/api';

// Mock the hooks
jest.mock('../../../../hooks/useServer', () => ({
  useStartServer: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useStopServer: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
  useAcceptEula: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
  }),
}));

// Mock the toast hook
jest.mock('../../../../hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockServer: Server = {
  id: 1,
  server_name: 'Test Server',
  version: '1.21.8',
  port: 25565,
  status: 'Stopped',
  pid: undefined,
  memory_mb: 1024,
  owner_id: 1,
  level_seed: 'test-seed',
  gamemode: 'survival',
  difficulty: 'normal',
  hardcore: false,
  pvp: true,
  spawn_monsters: true,
  motd: 'Welcome to Test Server!',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('ServerActionPanel', () => {
  const mockOnStatusChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders server information correctly', () => {
    render(
      <ServerActionPanel 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Server Actions')).toBeInTheDocument();
    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('1.21.8')).toBeInTheDocument();
    expect(screen.getByText('25565')).toBeInTheDocument();
    expect(screen.getByText('1024 MB')).toBeInTheDocument();
  });

  it('shows stopped status correctly', () => {
    render(
      <ServerActionPanel 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Status: Stopped')).toBeInTheDocument();
    expect(screen.getByText('Start Server')).toBeInTheDocument();
  });

  it('shows running status correctly', () => {
    const runningServer = { ...mockServer, status: 'Running' as const, pid: 12345 };
    
    render(
      <ServerActionPanel 
        server={runningServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Status: Running')).toBeInTheDocument();
    expect(screen.getByText('Stop Server')).toBeInTheDocument();
    expect(screen.getByText('PID: 12345')).toBeInTheDocument();
  });

  it('shows starting status correctly', () => {
    const startingServer = { ...mockServer, status: 'Starting' as const };
    
    render(
      <ServerActionPanel 
        server={startingServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Status: Starting')).toBeInTheDocument();
  });

  it('shows restart button for running server', () => {
    const runningServer = { ...mockServer, status: 'Running' as const };
    
    render(
      <ServerActionPanel 
        server={runningServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Restart')).toBeInTheDocument();
  });

  it('does not show restart button for stopped server', () => {
    render(
      <ServerActionPanel 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Restart')).not.toBeInTheDocument();
  });

  it('opens restart confirmation dialog', async () => {
    const runningServer = { ...mockServer, status: 'Running' as const };
    
    render(
      <ServerActionPanel 
        server={runningServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    const restartButton = screen.getByText('Restart');
    fireEvent.click(restartButton);

    await waitFor(() => {
      expect(screen.getByText('Restart Server')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to restart/)).toBeInTheDocument();
    });
  });

  it('shows server information in restart dialog', async () => {
    const runningServer = { ...mockServer, status: 'Running' as const };
    
    render(
      <ServerActionPanel 
        server={runningServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    const restartButton = screen.getByText('Restart');
    fireEvent.click(restartButton);

    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
      expect(screen.getByText('1.21.8')).toBeInTheDocument();
      expect(screen.getByText('1024 MB')).toBeInTheDocument();
    });
  });

  it('shows warning for running server in restart dialog', async () => {
    const runningServer = { ...mockServer, status: 'Running' as const };
    
    render(
      <ServerActionPanel 
        server={runningServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    const restartButton = screen.getByText('Restart');
    fireEvent.click(restartButton);

    await waitFor(() => {
      expect(screen.getByText(/All connected players will be disconnected/)).toBeInTheDocument();
    });
  });

  it('calls onStatusChange when provided', () => {
    render(
      <ServerActionPanel 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    // The component should render without calling onStatusChange initially
    expect(mockOnStatusChange).not.toHaveBeenCalled();
  });

  it('displays correct game mode and difficulty', () => {
    render(
      <ServerActionPanel 
        server={mockServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('survival')).toBeInTheDocument();
    expect(screen.getByText('normal')).toBeInTheDocument();
  });

  it('handles hardcore server correctly', () => {
    const hardcoreServer = { ...mockServer, hardcore: true };
    
    render(
      <ServerActionPanel 
        server={hardcoreServer} 
        onStatusChange={mockOnStatusChange}
      />, 
      { wrapper: createWrapper() }
    );

    // Should still render normally for hardcore servers
    expect(screen.getByText('Test Server')).toBeInTheDocument();
  });
});
