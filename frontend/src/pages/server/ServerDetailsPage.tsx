import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  ArrowLeft, 
  Server, 
  AlertTriangle, 
  Loader2,
  RefreshCw
} from 'lucide-react';
import { apiService } from '../../services/api';
import ServerActionPanel from '../../components/server/controls/ServerActionPanel';
import ServerBackupPanel from '../../components/server/controls/ServerBackupPanel';
import ServerConfigPanel from '../../components/server/controls/ServerConfigPanel';
import ServerLogsPanel from '../../components/server/controls/ServerLogsPanel';
import type { Server as ServerType } from '../../types/api';

const ServerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const serverId = parseInt(id || '0');

  const { data: server, isLoading, error, refetch } = useQuery({
    queryKey: ['server', serverId],
    queryFn: async () => {
      const response = await apiService.getServer(serverId);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch server');
    },
    enabled: !!serverId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const handleStatusChange = () => {
    refetch();
  };

  const handleConfigUpdate = (updatedServer: ServerType) => {
    refetch();
  };

  const handleBackupComplete = (backupFile: string) => {
    console.log('Backup completed:', backupFile);
    // Could show a toast notification here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-minecraft-green/5 to-minecraft-blue/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-minecraft-green mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Loading Server Details</h3>
              <p className="text-muted-foreground">Please wait while we fetch the server information...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-minecraft-green/5 to-minecraft-blue/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/servers')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Servers
            </Button>
          </div>
          
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Server Not Found</h3>
              <p className="text-muted-foreground mb-6">
                {error?.message || 'The server you are looking for does not exist or you do not have permission to access it.'}
              </p>
              <div className="flex space-x-2 justify-center">
                <Button onClick={() => navigate('/servers')}>
                  Back to Servers
                </Button>
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-minecraft-green/5 to-minecraft-blue/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/servers')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Servers
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-minecraft-green rounded-lg flex items-center justify-center">
                <Server className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {server.server_name}
                </h1>
                <p className="text-muted-foreground">
                  {server.version} • Port {server.port} • {server.status}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Server Status Alert */}
        {server.status === 'Stopped' && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This server is currently stopped. Use the Server Actions panel to start it.
            </AlertDescription>
          </Alert>
        )}

        {/* Control Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ServerActionPanel 
              server={server} 
              onStatusChange={handleStatusChange}
            />
            
            <ServerBackupPanel 
              server={server} 
              onBackupComplete={handleBackupComplete}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ServerConfigPanel 
              server={server} 
              onConfigUpdate={handleConfigUpdate}
            />
          </div>
        </div>

        {/* Full Width Logs Panel */}
        <div className="mt-6">
          <ServerLogsPanel 
            server={server} 
            onLogsUpdate={() => {}}
          />
        </div>

        {/* Server Information Footer */}
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Server ID:</span>
              <div className="font-medium">{server.id}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Owner ID:</span>
              <div className="font-medium">{server.owner_id}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>
              <div className="font-medium">
                {new Date(server.created_at).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>
              <div className="font-medium">
                {new Date(server.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerDetailsPage;
