import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import ServerCard from '../ServerCard';
import type { Server } from '../../../types/api';

const mockServer: Server = TestDataFactory.server({
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
});

describe('ServerCard', () => {
  const mockOnStart = vi.fn();
  const mockOnStop = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBackup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.serversList();
  });

  it('renders server information correctly', () => {
    render(
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
    render(
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
    
    render(
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
    render(
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
    
    render(
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
    render(
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
    render(
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
    render(
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
    
    render(
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
    render(
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
    
    render(
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

  it('handles click to select functionality', () => {
    const mockOnSelect = vi.fn();
    render(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        selectable={true}
      />
    );

    const card = screen.getByRole('button', { name: /test server/i });
    fireEvent.click(card);

    expect(mockOnSelect).toHaveBeenCalledWith(1);
  });

  it('shows selected state when selected', () => {
    render(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        selected={true}
        selectable={true}
      />
    );

    const card = screen.getByRole('button', { name: /test server/i });
    expect(card).toHaveClass('selected');
  });

  it('shows confirmation dialog for delete action', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByTitle('Delete Server');
    await user.click(deleteButton);

    expect(screen.getByText('Delete Server')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this server?')).toBeInTheDocument();
  });

  it('cancels delete action when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByTitle('Delete Server');
    await user.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('confirms delete action when confirm is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ServerCard
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByTitle('Delete Server');
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });
});
