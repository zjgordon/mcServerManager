import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Clock, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useServerStatus } from '../../hooks/useServer';
import { useRealtimeServerStatus, useRealtimeConnection } from '../../hooks/useRealtime';
import { RealtimeStatusIndicator } from '../realtime';
import type { Server as ServerType } from '../../types/api';

interface RealtimeServerStatusMonitorProps {
  server: ServerType;
  onStatusChange?: (status: any) => void;
  showRealtimeIndicator?: boolean;
  className?: string;
}

interface ProcessStatus {
  is_running: boolean;
  pid: number | null;
  memory_usage: number;
  cpu_usage: number;
  uptime: number;
}

const RealtimeServerStatusMonitor: React.FC<RealtimeServerStatusMonitorProps> = ({
  server,
  onStatusChange,
  showRealtimeIndicator = true,
  className = ''
}) => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  
  // Traditional API data
  const { 
    data: apiStatus, 
    isLoading, 
    error, 
    refetch 
  } = useServerStatus(server.id);

  // Real-time data
  const realtimeStatus = useRealtimeServerStatus(server.id);
  const connectionStatus = useRealtimeConnection();

  // Use real-time data if available, fallback to API data
  const status: ProcessStatus | undefined = realtimeStatus ? {
    is_running: realtimeStatus.status === 'Running',
    pid: realtimeStatus.pid || null,
    memory_usage: realtimeStatus.memoryUsage || 0,
    cpu_usage: realtimeStatus.cpuUsage || 0,
    uptime: realtimeStatus.uptime || 0
  } : apiStatus;

  // Update last update time when data changes
  useEffect(() => {
    if (status) {
      setLastUpdate(new Date());
      onStatusChange?.(status);
    }
  }, [status, onStatusChange]);

  const handleManualRefresh = async () => {
    setIsManualRefresh(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefresh(false), 1000);
    }
  };

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemory = (mb: number) => {
    if (mb < 1024) return `${mb} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  };

  const getStatusColor = (isRunning: boolean) => {
    return isRunning ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isRunning: boolean) => {
    return isRunning ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (isRunning: boolean) => {
    return (
      <Badge variant={isRunning ? 'default' : 'destructive'} className="text-xs">
        {isRunning ? 'Running' : 'Stopped'}
      </Badge>
    );
  };

  if (isLoading && !status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Server Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Status Error</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Failed to load server status: {error.message}
          </p>
          <Button variant="outline" size="sm" onClick={handleManualRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Server Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No status information available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Server Status</span>
            {getStatusIcon(status.is_running)}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {showRealtimeIndicator && (
              <RealtimeStatusIndicator showDetails={false} />
            )}
            {getStatusBadge(status.is_running)}
          </div>
        </div>
        
        <CardDescription>
          Real-time monitoring of server process and resource usage
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        {showRealtimeIndicator && (
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              {connectionStatus.isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-gray-500" />
              )}
              <span className="text-sm">
                {connectionStatus.isConnected ? 'Real-time' : 'Polling'} updates
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isManualRefresh}
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${isManualRefresh ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}

        {/* Process Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Process ID</span>
              <span className="text-sm font-medium">
                {status.pid || 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Uptime</span>
              <span className="text-sm font-medium">
                {status.is_running ? formatUptime(status.uptime) : 'N/A'}
              </span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Memory Usage</span>
              <span className="text-sm font-medium">
                {formatMemory(status.memory_usage)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">CPU Usage</span>
              <span className="text-sm font-medium">
                {status.cpu_usage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Resource Usage Bars */}
        {status.is_running && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">Memory Usage</span>
                <span className="text-sm font-medium">
                  {formatMemory(status.memory_usage)}
                </span>
              </div>
              <Progress 
                value={(status.memory_usage / server.memory_mb) * 100} 
                className="h-2"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">CPU Usage</span>
                <span className="text-sm font-medium">
                  {status.cpu_usage.toFixed(1)}%
                </span>
              </div>
              <Progress value={status.cpu_usage} className="h-2" />
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
          </div>
          
          {realtimeStatus && (
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeServerStatusMonitor;
