import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ServerCard from '../ServerCard';
import type { Server } from '../../../types/api';

// Mock the API service
jest.mock('../../../services/api', () => ({
  apiService: {
    getServerStatus: jest.fn(),
  },
}));

const mockServer: Server = {
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
  motd: 'Welcome to Test Server!',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ServerCard', () => {
  const mockOnStart = jest.fn();
  const mockOnStop = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnBackup = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders server information correctly', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('1.21.8 • Port 25565')).toBeInTheDocument();
    expect(screen.getByText('1024 MB')).toBeInTheDocument();
    expect(screen.getByText('survival')).toBeInTheDocument();
    expect(screen.getByText('normal')).toBeInTheDocument();
    expect(screen.getByText('Welcome to Test Server!')).toBeInTheDocument();
  });

  it('shows running status correctly', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
  });

  it('shows stopped status correctly', () => {
    const stoppedServer = { ...mockServer, status: 'Stopped' as const, pid: undefined };
    
    renderWithRouter(
      <ServerCard
        server={stoppedServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('calls onStop when stop button is clicked', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);

    expect(mockOnStop).toHaveBeenCalledWith(1);
  });

  it('calls onStart when start button is clicked', () => {
    const stoppedServer = { ...mockServer, status: 'Stopped' as const, pid: undefined };
    
    renderWithRouter(
      <ServerCard
        server={stoppedServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    expect(mockOnStart).toHaveBeenCalledWith(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByTitle('Delete Server');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('calls onBackup when backup button is clicked', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const backupButton = screen.getByTitle('Create Backup');
    fireEvent.click(backupButton);

    expect(mockOnBackup).toHaveBeenCalledWith(1);
  });

  it('disables buttons when loading', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        isLoading={true}
      />
    );

    const stopButton = screen.getByText('Stop');
    expect(stopButton).toBeDisabled();
  });

  it('shows hardcore indicator when server is hardcore', () => {
    const hardcoreServer = { ...mockServer, hardcore: true };
    
    renderWithRouter(
      <ServerCard
        server={hardcoreServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Hardcore Mode')).toBeInTheDocument();
  });

  it('renders in list view mode', () => {
    renderWithRouter(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        viewMode="list"
      />
    );

    // In list mode, the server name should be in an h3 element
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Test Server');
  });

  it('formats uptime correctly', () => {
    const oldServer = {
      ...mockServer,
      created_at: '2024-01-01T00:00:00Z' // Very old date
    };
    
    renderWithRouter(
      <ServerCard
        server={oldServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    // Should show some time ago
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });
});
