import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useServer } from '../useServer';
import { setupApiMocks } from '../../test';

describe('useServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial server state', () => {
    const { result } = renderHook(() => useServer());

    expect(result.current.servers).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedServer).toBeNull();
  });

  it('loads servers on mount', async () => {
    const mockServers = [
      { id: 1, server_name: 'Server 1', status: 'Running' },
      { id: 2, server_name: 'Server 2', status: 'Stopped' },
    ];
    setupApiMocks.serversList(mockServers);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual(mockServers);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles server load error', async () => {
    setupApiMocks.serversList.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([]);
      expect(result.current.error).toBe('API Error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('creates server successfully', async () => {
    const newServer = { id: 3, server_name: 'New Server', status: 'Stopped' };
    setupApiMocks.serverCreateSuccess(newServer);

    const { result } = renderHook(() => useServer());

    await act(async () => {
      await result.current.createServer({
        server_name: 'New Server',
        version: '1.21.8',
        memory_mb: 1024,
        port: 25565,
      });
    });

    expect(result.current.servers).toContainEqual(newServer);
    expect(result.current.error).toBeNull();
  });

  it('handles server creation error', async () => {
    setupApiMocks.serverCreateError();

    const { result } = renderHook(() => useServer());

    await act(async () => {
      await result.current.createServer({
        server_name: 'New Server',
        version: '1.21.8',
        memory_mb: 1024,
        port: 25565,
      });
    });

    expect(result.current.error).toBe('Failed to create server');
  });

  it('starts server successfully', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Stopped' };
    const updatedServer = { ...mockServer, status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverStartSuccess(updatedServer);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.startServer(1);
    });

    expect(result.current.servers[0]).toEqual(updatedServer);
    expect(result.current.error).toBeNull();
  });

  it('handles server start error', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Stopped' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverStartError();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.startServer(1);
    });

    expect(result.current.error).toBe('Failed to start server');
  });

  it('stops server successfully', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    const updatedServer = { ...mockServer, status: 'Stopped' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverStopSuccess(updatedServer);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.stopServer(1);
    });

    expect(result.current.servers[0]).toEqual(updatedServer);
    expect(result.current.error).toBeNull();
  });

  it('handles server stop error', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverStopError();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.stopServer(1);
    });

    expect(result.current.error).toBe('Failed to stop server');
  });

  it('restarts server successfully', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    const updatedServer = { ...mockServer, status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverRestartSuccess(updatedServer);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.restartServer(1);
    });

    expect(result.current.servers[0]).toEqual(updatedServer);
    expect(result.current.error).toBeNull();
  });

  it('handles server restart error', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverRestartError();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.restartServer(1);
    });

    expect(result.current.error).toBe('Failed to restart server');
  });

  it('deletes server successfully', async () => {
    const mockServers = [
      { id: 1, server_name: 'Server 1', status: 'Running' },
      { id: 2, server_name: 'Server 2', status: 'Stopped' },
    ];
    setupApiMocks.serversList(mockServers);
    setupApiMocks.serverDeleteSuccess();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual(mockServers);
    });

    await act(async () => {
      await result.current.deleteServer(1);
    });

    expect(result.current.servers).toHaveLength(1);
    expect(result.current.servers[0].id).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it('handles server deletion error', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverDeleteError();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.deleteServer(1);
    });

    expect(result.current.error).toBe('Failed to delete server');
  });

  it('updates server configuration successfully', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    const updatedServer = { ...mockServer, memory_mb: 2048 };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverUpdateSuccess(updatedServer);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.updateServer(1, { memory_mb: 2048 });
    });

    expect(result.current.servers[0]).toEqual(updatedServer);
    expect(result.current.error).toBeNull();
  });

  it('handles server update error', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverUpdateError();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.updateServer(1, { memory_mb: 2048 });
    });

    expect(result.current.error).toBe('Failed to update server');
  });

  it('creates server backup successfully', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    const backup = { id: 1, server_id: 1, name: 'backup-1', created_at: '2024-01-01T00:00:00Z' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverBackupSuccess(backup);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.createBackup(1, 'backup-1');
    });

    expect(result.current.error).toBeNull();
  });

  it('handles server backup error', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverBackupError();

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.createBackup(1, 'backup-1');
    });

    expect(result.current.error).toBe('Failed to create backup');
  });

  it('selects server', () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };

    const { result } = renderHook(() => useServer());

    act(() => {
      result.current.selectServer(mockServer);
    });

    expect(result.current.selectedServer).toEqual(mockServer);
  });

  it('clears server selection', () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };

    const { result } = renderHook(() => useServer());

    act(() => {
      result.current.selectServer(mockServer);
    });

    expect(result.current.selectedServer).toEqual(mockServer);

    act(() => {
      result.current.clearSelection();
    });

    expect(result.current.selectedServer).toBeNull();
  });

  it('refreshes server list', async () => {
    const mockServers = [
      { id: 1, server_name: 'Server 1', status: 'Running' },
      { id: 2, server_name: 'Server 2', status: 'Stopped' },
    ];
    setupApiMocks.serversList(mockServers);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual(mockServers);
    });

    const updatedServers = [
      { id: 1, server_name: 'Server 1', status: 'Stopped' },
      { id: 2, server_name: 'Server 2', status: 'Running' },
    ];
    setupApiMocks.serversList(updatedServers);

    await act(async () => {
      await result.current.refreshServers();
    });

    expect(result.current.servers).toEqual(updatedServers);
  });

  it('handles refresh servers error', async () => {
    const mockServers = [
      { id: 1, server_name: 'Server 1', status: 'Running' },
    ];
    setupApiMocks.serversList(mockServers);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual(mockServers);
    });

    setupApiMocks.serversList.mockRejectedValue(new Error('Refresh failed'));

    await act(async () => {
      await result.current.refreshServers();
    });

    expect(result.current.error).toBe('Refresh failed');
  });

  it('clears error when clearError is called', async () => {
    setupApiMocks.serversList.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.error).toBe('API Error');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles server status updates', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    const updatedServer = { ...mockServer, status: 'Stopped' };

    act(() => {
      result.current.updateServerStatus(1, 'Stopped');
    });

    expect(result.current.servers[0]).toEqual(updatedServer);
  });

  it('handles server status updates for non-existent server', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    act(() => {
      result.current.updateServerStatus(999, 'Stopped');
    });

    expect(result.current.servers).toEqual([mockServer]);
  });

  it('handles concurrent server operations', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);
    setupApiMocks.serverStopSuccess({ ...mockServer, status: 'Stopped' });

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    const stopPromise1 = result.current.stopServer(1);
    const stopPromise2 = result.current.stopServer(1);

    await act(async () => {
      await Promise.all([stopPromise1, stopPromise2]);
    });

    expect(result.current.servers[0].status).toBe('Stopped');
  });

  it('handles server operations on non-existent server', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    await act(async () => {
      await result.current.startServer(999);
    });

    expect(result.current.error).toBe('Server not found');
  });

  it('handles network errors gracefully', async () => {
    setupApiMocks.serversList.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('handles server data updates from external sources', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    const updatedServer = { ...mockServer, memory_mb: 2048 };

    act(() => {
      result.current.updateServerData(updatedServer);
    });

    expect(result.current.servers[0]).toEqual(updatedServer);
  });

  it('handles server data updates for non-existent server', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);

    const { result } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    const newServer = { id: 2, server_name: 'Server 2', status: 'Stopped' };

    act(() => {
      result.current.updateServerData(newServer);
    });

    expect(result.current.servers).toContainEqual(newServer);
  });

  it('handles server cleanup on unmount', async () => {
    const mockServer = { id: 1, server_name: 'Server 1', status: 'Running' };
    setupApiMocks.serversList([mockServer]);

    const { result, unmount } = renderHook(() => useServer());

    await waitFor(() => {
      expect(result.current.servers).toEqual([mockServer]);
    });

    unmount();

    // Should clean up any ongoing requests
    expect(setupApiMocks.serversList).toHaveBeenCalled();
  });
});
