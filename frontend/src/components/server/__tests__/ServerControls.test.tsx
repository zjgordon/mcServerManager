import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import ServerControls from '../ServerControls';
import type { Server } from '../../../types/api';

const mockServer: Server = TestDataFactory.server({
  id: 1,
  server_name: 'Test Server',
  status: 'Running',
  pid: 12345,
  memory_mb: 1024,
});

describe('ServerControls', () => {
  const mockOnStart = vi.fn();
  const mockOnStop = vi.fn();
  const mockOnRestart = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBackup = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.serversList();
  });

  it('renders server controls correctly', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Server Controls')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByText('Restart')).toBeInTheDocument();
    expect(screen.getByText('Backup')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows start button for stopped server', () => {
    const stoppedServer = { ...mockServer, status: 'Stopped' as const, pid: undefined };
    render(
      <ServerControls
        server={stoppedServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    expect(screen.queryByText('Restart')).not.toBeInTheDocument();
  });

  it('shows stop and restart buttons for running server', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByText('Restart')).toBeInTheDocument();
    expect(screen.queryByText('Start')).not.toBeInTheDocument();
  });

  it('calls onStart when start button is clicked', () => {
    const stoppedServer = { ...mockServer, status: 'Stopped' as const, pid: undefined };
    render(
      <ServerControls
        server={stoppedServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    expect(mockOnStart).toHaveBeenCalledWith(1);
  });

  it('calls onStop when stop button is clicked', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByText('Stop');
    fireEvent.click(stopButton);

    expect(mockOnStop).toHaveBeenCalledWith(1);
  });

  it('calls onRestart when restart button is clicked', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const restartButton = screen.getByText('Restart');
    fireEvent.click(restartButton);

    expect(mockOnRestart).toHaveBeenCalledWith(1);
  });

  it('calls onBackup when backup button is clicked', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const backupButton = screen.getByText('Backup');
    fireEvent.click(backupButton);

    expect(mockOnBackup).toHaveBeenCalledWith(1);
  });

  it('shows confirmation dialog for delete action', async () => {
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    expect(screen.getByText('Delete Server')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Test Server"?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('cancels delete action when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('confirms delete action when confirm is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    const confirmButton = screen.getByRole('button', { name: 'Delete Server' });
    await user.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith(1);
  });

  it('disables all buttons when loading', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        isLoading={true}
      />
    );

    const stopButton = screen.getByText('Stop');
    const restartButton = screen.getByText('Restart');
    const backupButton = screen.getByText('Backup');
    const deleteButton = screen.getByText('Delete');

    expect(stopButton).toBeDisabled();
    expect(restartButton).toBeDisabled();
    expect(backupButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it('shows loading state for individual actions', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        loadingActions={{ stop: true }}
      />
    );

    const stopButton = screen.getByText('Stopping...');
    expect(stopButton).toBeDisabled();
  });

  it('shows success message after successful action', async () => {
    setupApiMocks.serverStopSuccess();
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByText('Stop');
    await user.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Server stopped successfully')).toBeInTheDocument();
    });
  });

  it('shows error message after failed action', async () => {
    setupApiMocks.serverStopError();
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByText('Stop');
    await user.click(stopButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to stop server')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByText('Stop');
    stopButton.focus();

    await user.keyboard('{Enter}');
    expect(mockOnStop).toHaveBeenCalledWith(1);
  });

  it('shows tooltips for buttons', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByTitle('Stop the server');
    const restartButton = screen.getByTitle('Restart the server');
    const backupButton = screen.getByTitle('Create a backup of the server');
    const deleteButton = screen.getByTitle('Delete the server');

    expect(stopButton).toBeInTheDocument();
    expect(restartButton).toBeInTheDocument();
    expect(backupButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();
  });

  it('handles server without PID', () => {
    const serverWithoutPid = { ...mockServer, pid: undefined };
    render(
      <ServerControls
        server={serverWithoutPid}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.queryByText('Stop')).not.toBeInTheDocument();
    expect(screen.queryByText('Restart')).not.toBeInTheDocument();
  });

  it('shows warning for destructive actions', async () => {
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('This will permanently delete the server and all its data.')).toBeInTheDocument();
  });

  it('handles multiple rapid clicks gracefully', async () => {
    const user = userEvent.setup();
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    const stopButton = screen.getByText('Stop');
    
    // Click multiple times rapidly
    await user.click(stopButton);
    await user.click(stopButton);
    await user.click(stopButton);

    // Should only be called once due to debouncing
    expect(mockOnStop).toHaveBeenCalledTimes(1);
  });

  it('shows server information in controls', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
      />
    );

    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('PID: 12345')).toBeInTheDocument();
  });

  it('handles custom button configurations', () => {
    render(
      <ServerControls
        server={mockServer}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onRestart={mockOnRestart}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        showBackup={false}
        showDelete={false}
      />
    );

    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByText('Restart')).toBeInTheDocument();
    expect(screen.queryByText('Backup')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});
