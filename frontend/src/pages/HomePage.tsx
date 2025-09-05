import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Server, Play, Square, Settings, Trash2 } from 'lucide-react';

const HomePage: React.FC = () => {
  const { user, logout } = useAuth();

  const { data: servers, isLoading, error } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await apiService.getServers();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch servers');
    },
  });

  const handleLogout = async () => {
    await logout();
  };

  const handleServerAction = async (serverId: number, action: 'start' | 'stop') => {
    try {
      if (action === 'start') {
        await apiService.startServer(serverId);
      } else {
        await apiService.stopServer(serverId);
      }
      // Refetch servers after action
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error(`Failed to ${action} server:`, error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg">Error loading servers</p>
          <p className="text-gray-500 text-sm mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-minecraft-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">⚡</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Minecraft Server Manager</h1>
                <p className="text-gray-600">Welcome back, {user?.username}!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user?.is_admin && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                  👑 Admin
                </span>
              )}
              <button
                onClick={handleLogout}
                className="btn-danger"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Your Servers</h2>
              <p className="text-gray-600 mt-1">Manage your Minecraft servers</p>
            </div>
            <button className="btn-primary flex items-center space-x-2">
              <span>+</span>
              <span>Create Server</span>
            </button>
          </div>

          {servers && servers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servers.map((server) => (
                <div key={server.id} className="server-card">
                  <div className="server-card-header">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{server.server_name}</h3>
                      <span
                        className={`${
                          server.status === 'Running'
                            ? 'status-running'
                            : server.status === 'Starting'
                            ? 'status-starting'
                            : server.status === 'Stopping'
                            ? 'status-stopping'
                            : 'status-stopped'
                        }`}
                      >
                        {server.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="server-card-body">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Version</span>
                        <span className="text-sm font-medium text-gray-900">{server.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Port</span>
                        <span className="text-sm font-medium text-gray-900">{server.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Memory</span>
                        <span className="text-sm font-medium text-gray-900">{server.memory_mb} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Game Mode</span>
                        <span className="text-sm font-medium text-gray-900 capitalize">{server.gamemode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="server-card-footer">
                    <div className="flex space-x-2">
                      {server.status === 'Running' ? (
                        <button
                          onClick={() => handleServerAction(server.id, 'stop')}
                          className="btn-danger flex-1 flex items-center justify-center space-x-2"
                        >
                          <Square className="w-4 h-4" />
                          <span>Stop</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleServerAction(server.id, 'start')}
                          className="btn-success flex-1 flex items-center justify-center space-x-2"
                        >
                          <Play className="w-4 h-4" />
                          <span>Start</span>
                        </button>
                      )}
                      
                      <button className="btn-secondary flex items-center justify-center">
                        <Settings className="w-4 h-4" />
                      </button>
                      
                      <button className="btn-danger flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Server className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No servers yet</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Get started by creating your first Minecraft server. You can configure all the settings and start playing right away.
              </p>
              <button className="btn-primary">
                Create Your First Server
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
