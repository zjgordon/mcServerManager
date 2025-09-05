import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Info,
  Cpu,
  HardDrive,
  MemoryStick,
  Clock,
  Server,
  Zap
} from 'lucide-react';
import { useSystemStats } from '../../hooks/useAdmin';
import { useServers } from '../../hooks/useServer';

interface ProcessManagementPanelProps {
  onRefresh?: () => void;
}

const ProcessManagementPanel: React.FC<ProcessManagementPanelProps> = ({
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: systemStats, isLoading: statsLoading, refetch: refetchStats } = useSystemStats();
  const { data: servers, isLoading: serversLoading, refetch: refetchServers } = useServers();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchStats(), refetchServers()]);
      onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const runningServers = servers?.filter(server => server.status === 'Running') || [];
  const stoppedServers = servers?.filter(server => server.status === 'Stopped') || [];
  const totalMemoryAllocated = servers?.reduce((sum, server) => sum + server.memory_mb, 0) || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Stopped':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'Starting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Stopping':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Stopped':
        return <Server className="h-4 w-4 text-gray-500" />;
      case 'Starting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'Stopping':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      default:
        return <Server className="h-4 w-4 text-gray-500" />;
    }
  };

  if (statsLoading || serversLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Process Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading process information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Process Management</span>
            </CardTitle>
            <CardDescription>
              Monitor system processes and server status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* System Overview */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>System Overview</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Server className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Total Servers</span>
              </div>
              <div className="text-2xl font-bold">{servers?.length || 0}</div>
              <div className="text-xs text-muted-foreground">
                {runningServers.length} running, {stoppedServers.length} stopped
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <MemoryStick className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Memory Allocated</span>
              </div>
              <div className="text-2xl font-bold">{totalMemoryAllocated} MB</div>
              <div className="text-xs text-muted-foreground">
                {systemStats?.memory_usage_summary?.utilization_percentage?.toFixed(1) || 0}% utilization
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Cpu className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Active Processes</span>
              </div>
              <div className="text-2xl font-bold">{runningServers.length}</div>
              <div className="text-xs text-muted-foreground">
                {runningServers.filter(s => s.pid).length} with PID
              </div>
            </div>
          </div>
        </div>

        {/* Memory Usage Summary */}
        {systemStats?.memory_usage_summary && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center space-x-2">
              <HardDrive className="h-4 w-4" />
              <span>Memory Usage Summary</span>
            </h4>
            
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Allocated</span>
                <span className="font-medium">{systemStats.memory_usage_summary.total_allocated} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Available</span>
                <span className="font-medium">{systemStats.memory_usage_summary.total_available} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Utilization</span>
                <span className="font-medium">{systemStats.memory_usage_summary.utilization_percentage?.toFixed(1)}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-minecraft-green h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(systemStats.memory_usage_summary.utilization_percentage || 0, 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Server Processes */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <Server className="h-4 w-4" />
            <span>Server Processes</span>
          </h4>
          
          {servers && servers.length > 0 ? (
            <div className="space-y-3">
              {servers.map((server) => (
                <div key={server.id} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getStatusColor(server.status)}`}>
                        {getStatusIcon(server.status)}
                        <span className="text-sm font-medium">{server.status}</span>
                      </div>
                      <div>
                        <h5 className="font-medium">{server.server_name}</h5>
                        <p className="text-sm text-muted-foreground">
                          {server.version} • Port {server.port}
                        </p>
                      </div>
                    </div>
                    
                    {server.pid && (
                      <div className="text-right">
                        <div className="text-sm font-medium">PID: {server.pid}</div>
                        <div className="text-xs text-muted-foreground">{server.memory_mb} MB</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Memory:</span>
                      <div className="font-medium">{server.memory_mb} MB</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Game Mode:</span>
                      <div className="font-medium capitalize">{server.gamemode}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Difficulty:</span>
                      <div className="font-medium capitalize">{server.difficulty}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <div className="font-medium">
                        {new Date(server.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No servers found</p>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>System Information</span>
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Process information is updated in real-time</p>
            <p>• Memory usage includes all allocated server memory</p>
            <p>• PID information is available for running servers</p>
            <p>• System utilization is calculated based on available memory</p>
          </div>
        </div>

        {/* High Memory Usage Warning */}
        {systemStats?.memory_usage_summary && systemStats.memory_usage_summary.utilization_percentage > 80 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Memory utilization is high ({systemStats.memory_usage_summary.utilization_percentage.toFixed(1)}%). 
              Consider stopping unused servers or increasing system memory.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessManagementPanel;
