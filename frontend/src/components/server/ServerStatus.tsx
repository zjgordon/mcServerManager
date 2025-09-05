import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  Users, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { apiService } from '../../services/api';
import type { Server as ServerType } from '../../types/api';

interface ServerStatusProps {
  server: ServerType;
  refreshInterval?: number; // in milliseconds
  showDetails?: boolean;
  compact?: boolean;
}

interface ProcessInfo {
  is_running: boolean;
  pid?: number;
  memory_usage: number;
  cpu_usage: number;
  uptime: number;
}

const ServerStatus: React.FC<ServerStatusProps> = ({
  server,
  refreshInterval = 5000, // 5 seconds
  showDetails = true,
  compact = false
}) => {
  const [processInfo, setProcessInfo] = useState<ProcessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStatus = async () => {
    if (!server.pid) {
      setProcessInfo({
        is_running: false,
        memory_usage: 0,
        cpu_usage: 0,
        uptime: 0
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.getServerStatus(server.id);
      
      if (response.success && response.data) {
        setProcessInfo(response.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    if (server.status === 'Running' && refreshInterval > 0) {
      const interval = setInterval(fetchStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [server.id, server.status, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Stopped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Starting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Stopping':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Stopped':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case 'Starting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'Stopping':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatMemory = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon(server.status)}
        <Badge className={getStatusColor(server.status)}>
          {server.status}
        </Badge>
        {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Server Status</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Real-time server monitoring and statistics
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            {getStatusIcon(server.status)}
            <span className="font-medium">Status</span>
          </div>
          <Badge className={getStatusColor(server.status)}>
            {server.status}
          </Badge>
        </div>

        {showDetails && (
          <>
            {/* Process Information */}
            {processInfo && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">CPU Usage</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {processInfo.cpu_usage.toFixed(1)}%
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Memory Usage</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatMemory(processInfo.memory_usage)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Uptime</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatUptime(processInfo.uptime)}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">PID</span>
                  </div>
                  <div className="text-lg font-semibold">
                    {processInfo.pid || 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Server Configuration */}
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Server Configuration</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Allocated Memory:</span>
                  <div className="font-medium">{server.memory_mb} MB</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Port:</span>
                  <div className="font-medium">{server.port}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>
                  <div className="font-medium">{server.version}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Game Mode:</span>
                  <div className="font-medium capitalize">{server.gamemode}</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ServerStatus;
