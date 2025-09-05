import React from 'react';
import { render, screen, fireEvent, waitFor, userEvent, vi } from '../../../test';
import { TestDataFactory, setupApiMocks } from '../../../test';
import ServerList from '../ServerList';
import type { Server } from '../../../types/api';

const mockServers: Server[] = TestDataFactory.servers(5).map((server, index) => ({
  ...server,
  id: index + 1,
  server_name: `Server ${index + 1}`,
  status: index % 2 === 0 ? 'Running' : 'Stopped',
  version: '1.21.8',
  port: 25565 + index,
  memory_mb: 1024 + (index * 256),
}));

describe('ServerList', () => {
  const mockOnStart = vi.fn();
  const mockOnStop = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnBackup = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    setupApiMocks.serversList(mockServers);
  });

  it('renders server list correctly', () => {
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Server 1')).toBeInTheDocument();
    expect(screen.getByText('Server 2')).toBeInTheDocument();
    expect(screen.getByText('Server 3')).toBeInTheDocument();
    expect(screen.getByText('Server 4')).toBeInTheDocument();
    expect(screen.getByText('Server 5')).toBeInTheDocument();
  });

  it('shows empty state when no servers', () => {
    render(
      <ServerList
        servers={[]}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('No servers found')).toBeInTheDocument();
    expect(screen.getByText('Create your first server to get started')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <ServerList
        servers={[]}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading servers...')).toBeInTheDocument();
  });

  it('filters servers by status', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    // Filter by running servers
    const statusFilter = screen.getByLabelText('Filter by status');
    await user.selectOptions(statusFilter, 'Running');

    await waitFor(() => {
      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.getByText('Server 3')).toBeInTheDocument();
      expect(screen.getByText('Server 5')).toBeInTheDocument();
      expect(screen.queryByText('Server 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Server 4')).not.toBeInTheDocument();
    });
  });

  it('sorts servers by name', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'name');

    await waitFor(() => {
      const serverNames = screen.getAllByText(/Server \d+/);
      expect(serverNames[0]).toHaveTextContent('Server 1');
      expect(serverNames[1]).toHaveTextContent('Server 2');
      expect(serverNames[2]).toHaveTextContent('Server 3');
    });
  });

  it('sorts servers by status', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    const sortSelect = screen.getByLabelText('Sort by');
    await user.selectOptions(sortSelect, 'status');

    await waitFor(() => {
      const serverCards = screen.getAllByText(/Running|Stopped/);
      // Running servers should come first
      expect(serverCards[0]).toHaveTextContent('Running');
      expect(serverCards[1]).toHaveTextContent('Running');
      expect(serverCards[2]).toHaveTextContent('Running');
    });
  });

  it('searches servers by name', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search servers...');
    await user.type(searchInput, 'Server 1');

    await waitFor(() => {
      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.queryByText('Server 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Server 3')).not.toBeInTheDocument();
    });
  });

  it('searches servers by version', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search servers...');
    await user.type(searchInput, '1.21.8');

    await waitFor(() => {
      // All servers should be visible since they all have version 1.21.8
      expect(screen.getByText('Server 1')).toBeInTheDocument();
      expect(screen.getByText('Server 2')).toBeInTheDocument();
      expect(screen.getByText('Server 3')).toBeInTheDocument();
    });
  });

  it('toggles between grid and list view', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    // Default should be grid view
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument();

    // Switch to list view
    const listViewButton = screen.getByLabelText('List view');
    await user.click(listViewButton);

    expect(screen.getByLabelText('List view')).toHaveClass('active');
    expect(screen.getByLabelText('Grid view')).not.toHaveClass('active');
  });

  it('shows server count and status summary', () => {
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('5 servers')).toBeInTheDocument();
    expect(screen.getByText('3 running')).toBeInTheDocument();
    expect(screen.getByText('2 stopped')).toBeInTheDocument();
  });

  it('handles server selection', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        selectable={true}
      />
    );

    const firstServer = screen.getByText('Server 1');
    await user.click(firstServer);

    expect(mockOnSelect).toHaveBeenCalledWith(1);
  });

  it('shows selected server state', () => {
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        selectable={true}
        selectedServerId={1}
      />
    );

    const firstServerCard = screen.getByText('Server 1').closest('[role="button"]');
    expect(firstServerCard).toHaveClass('selected');
  });

  it('handles bulk actions', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        selectable={true}
        selectedServerIds={[1, 3, 5]}
      />
    );

    const bulkStartButton = screen.getByText('Start Selected');
    await user.click(bulkStartButton);

    expect(mockOnStart).toHaveBeenCalledWith([1, 3, 5]);
  });

  it('shows bulk action buttons when servers are selected', () => {
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        selectable={true}
        selectedServerIds={[1, 2]}
      />
    );

    expect(screen.getByText('Start Selected')).toBeInTheDocument();
    expect(screen.getByText('Stop Selected')).toBeInTheDocument();
    expect(screen.getByText('Delete Selected')).toBeInTheDocument();
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search servers...');
    await user.type(searchInput, 'Server 1');

    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Server 1')).toBeInTheDocument();
    expect(screen.getByText('Server 2')).toBeInTheDocument();
  });

  it('handles error state', () => {
    render(
      <ServerList
        servers={[]}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        error="Failed to load servers"
      />
    );

    expect(screen.getByText('Failed to load servers')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnRetry = vi.fn();
    render(
      <ServerList
        servers={[]}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        error="Failed to load servers"
        onRetry={mockOnRetry}
      />
    );

    const retryButton = screen.getByText('Try again');
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('shows pagination when there are many servers', () => {
    const manyServers = TestDataFactory.servers(25);
    render(
      <ServerList
        servers={manyServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        pageSize={10}
      />
    );

    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
  });

  it('handles pagination navigation', async () => {
    const user = userEvent.setup();
    const manyServers = TestDataFactory.servers(25);
    render(
      <ServerList
        servers={manyServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
        pageSize={10}
      />
    );

    const nextButton = screen.getByLabelText('Next page');
    await user.click(nextButton);

    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('updates status counts when filters change', async () => {
    const user = userEvent.setup();
    render(
      <ServerList
        servers={mockServers}
        onStart={mockOnStart}
        onStop={mockOnStop}
        onDelete={mockOnDelete}
        onBackup={mockOnBackup}
        onSelect={mockOnSelect}
      />
    );

    // Filter by running servers
    const statusFilter = screen.getByLabelText('Filter by status');
    await user.selectOptions(statusFilter, 'Running');

    await waitFor(() => {
      expect(screen.getByText('3 servers')).toBeInTheDocument();
      expect(screen.getByText('3 running')).toBeInTheDocument();
      expect(screen.getByText('0 stopped')).toBeInTheDocument();
    });
  });
});
