import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import { 
  Server, 
  Plus, 
  Search, 
  Play, 
  Square, 
  Settings, 
  Trash2,
  Grid,
  List
} from 'lucide-react';

export const ServersPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const filteredServers = servers?.filter(server =>
    server.server_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.version.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Servers</h3>
        <p className="text-gray-500 mb-6">{error.message}</p>
        <Button onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servers</h1>
          <p className="text-gray-600 mt-1">
            Manage your Minecraft servers ({filteredServers.length} total)
          </p>
        </div>
        <Link to="/servers/create">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Server</span>
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search servers by name or version..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Servers Grid/List */}
      {filteredServers.length === 0 ? (
        <div className="text-center py-16">
          <div className="mx-auto h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Server className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchTerm ? 'No servers found' : 'No servers yet'}
          </h3>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {searchTerm 
              ? `No servers match "${searchTerm}". Try adjusting your search.`
              : 'Get started by creating your first Minecraft server. You can configure all the settings and start playing right away.'
            }
          </p>
          {!searchTerm && (
            <Link to="/servers/create">
              <Button>
                Create Your First Server
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredServers.map((server) => (
            <Card key={server.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{server.server_name}</CardTitle>
                  <Badge 
                    variant={
                      server.status === 'Running' ? 'running' :
                      server.status === 'Stopped' ? 'stopped' :
                      server.status === 'Starting' ? 'starting' : 'stopping'
                    }
                  >
                    {server.status}
                  </Badge>
                </div>
                <CardDescription>
                  {server.version} • Port {server.port}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Memory</span>
                    <span className="text-sm font-medium">{server.memory_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Game Mode</span>
                    <span className="text-sm font-medium capitalize">{server.gamemode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Difficulty</span>
                    <span className="text-sm font-medium capitalize">{server.difficulty}</span>
                  </div>
                  {server.motd && (
                    <div className="pt-2 border-t">
                      <span className="text-sm text-gray-500">MOTD</span>
                      <p className="text-sm font-medium mt-1">{server.motd}</p>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 mt-6">
                  {server.status === 'Running' ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleServerAction(server.id, 'stop')}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Stop
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleServerAction(server.id, 'start')}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
