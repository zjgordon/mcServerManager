import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { 
  Server, 
  Settings, 
  Activity, 
  Archive, 
  FileText, 
  Plus,
  ArrowLeft,
  RefreshCw,
  Users,
  HardDrive,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useServers, useStartServer, useStopServer, useDeleteServer, useBackupServer } from '../../hooks/useServer';
import { useToast } from '../../hooks/use-toast';
import ServerList from './ServerList';
import ServerStatusMonitor from './ServerStatusMonitor';
import ServerActionPanel from './controls/ServerActionPanel';
import ServerBackupPanel from './controls/ServerBackupPanel';
import ServerConfigPanel from './controls/ServerConfigPanel';
import ServerLogsPanel from './controls/ServerLogsPanel';
import type { Server as ServerType } from '../../types/api';

interface ServerManagementDashboardProps {
  selectedServerId?: number;
  onServerSelect?: (server: ServerType) => void;
}

const ServerManagementDashboard: React.FC<ServerManagementDashboardProps> = ({
  selectedServerId,
  onServerSelect
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data: servers, isLoading, error, refetch } = useServers();
  const startServerMutation = useStartServer();
  const stopServerMutation = useStopServer();
  const deleteServerMutation = useDeleteServer();
  const backupServerMutation = useBackupServer();

  const selectedServer = servers?.find(server => server.id === selectedServerId);

  const handleStart = async (serverId: number) => {
    try {
      await startServerMutation.mutateAsync(serverId);
      toast({
        title: 'Server Starting',
        description: 'The server is starting up. This may take a few moments.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStop = async (serverId: number) => {
    try {
      await stopServerMutation.mutateAsync(serverId);
      toast({
        title: 'Server Stopping',
        description: 'The server is shutting down.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (serverId: number) => {
    try {
      await deleteServerMutation.mutateAsync(serverId);
      toast({
        title: 'Server Deleted',
        description: 'The server has been deleted successfully.',
      });
      // If we deleted the selected server, clear selection
      if (selectedServerId === serverId) {
        onServerSelect?.(undefined as any);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleBackup = async (serverId: number) => {
    try {
      await backupServerMutation.mutateAsync(serverId);
      toast({
        title: 'Backup Created',
        description: 'Server backup has been created successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCreateServer = () => {
    navigate('/servers/create');
  };

  const handleServerSelect = (server: ServerType) => {
    onServerSelect?.(server);
    setActiveTab('details');
  };

  const getServerStats = () => {
    if (!servers) return { total: 0, running: 0, stopped: 0, totalMemory: 0 };
    
    const running = servers.filter(s => s.status === 'Running').length;
    const stopped = servers.filter(s => s.status === 'Stopped').length;
    const totalMemory = servers.reduce((sum, s) => sum + s.memory_mb, 0);
    
    return {
      total: servers.length,
      running,
      stopped,
      totalMemory
    };
  };

  const stats = getServerStats();
  const isAnyMutationLoading = 
    startServerMutation.isPending || 
    stopServerMutation.isPending || 
    deleteServerMutation.isPending || 
    backupServerMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border rounded-lg p-6 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-destructive text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Servers</h3>
        <p className="text-muted-foreground mb-6">{error.message}</p>
        <div className="flex space-x-2 justify-center">
          <Button onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={handleCreateServer}>
            <Plus className="h-4 w-4 mr-2" />
            Create Server
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Server Management</h2>
          <p className="text-muted-foreground">
            Manage your Minecraft servers and monitor their performance
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateServer}>
            <Plus className="h-4 w-4 mr-2" />
            Create Server
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Running</p>
                <p className="text-2xl font-bold text-green-600">{stats.running}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-muted-foreground">Stopped</p>
                <p className="text-2xl font-bold text-gray-600">{stats.stopped}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Memory</p>
                <p className="text-2xl font-bold">{(stats.totalMemory / 1024).toFixed(1)} GB</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details" disabled={!selectedServer}>
            Server Details
          </TabsTrigger>
          <TabsTrigger value="monitoring" disabled={!selectedServer}>
            Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ServerList
            servers={servers || []}
            onStart={handleStart}
            onStop={handleStop}
            onDelete={handleDelete}
            onBackup={handleBackup}
            isLoading={isAnyMutationLoading}
            onCreateServer={handleCreateServer}
            onServerSelect={handleServerSelect}
          />
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedServer ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <ServerActionPanel 
                  server={selectedServer} 
                  onStatusChange={() => refetch()}
                />
                <ServerBackupPanel 
                  server={selectedServer} 
                  onBackupComplete={(backupFile) => {
                    toast({
                      title: 'Backup Complete',
                      description: `Backup created: ${backupFile}`,
                    });
                  }}
                />
              </div>
              
              <div className="space-y-6">
                <ServerConfigPanel 
                  server={selectedServer} 
                  onConfigUpdate={() => refetch()}
                />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Server Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a server from the overview to view its details and configuration.
                </p>
                <Button onClick={() => setActiveTab('overview')}>
                  View All Servers
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          {selectedServer ? (
            <div className="space-y-6">
              <ServerStatusMonitor 
                server={selectedServer} 
                onStatusChange={() => refetch()}
              />
              <ServerLogsPanel 
                server={selectedServer} 
                onLogsUpdate={() => {}}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Server Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a server from the overview to monitor its performance and view logs.
                </p>
                <Button onClick={() => setActiveTab('overview')}>
                  View All Servers
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ServerManagementDashboard;
