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
  Loader2
} from 'lucide-react';
import { useServerStatus } from '../../hooks/useServer';
import type { Server as ServerType } from '../../types/api';

interface ServerStatusMonitorProps {
  server: ServerType;
  onStatusChange?: (status: any) => void;
  refreshInterval?: number;
}

interface ProcessStatus {
  is_running: boolean;
  pid: number | null;
  memory_usage: number;
  cpu_usage: number;
  uptime: number;
}

const ServerStatusMonitor: React.FC<ServerStatusMonitorProps> = ({
  server,
  onStatusChange,
  refreshInterval = 5000
}) => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  
  const { 
    data: status, 
    isLoading, 
    error, 
    refetch 
  } = useServerStatus(server.id);

  // Update last update time when data changes
  useEffect(() => {
    if (status) {
      setLastUpdate(new Date());
      onStatusChange?.(status);
    }
  }, [status, onStatusChange]);

  // Manual refresh handler
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
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  };

  const formatMemory = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getStatusColor = (isRunning: boolean) => {
    return isRunning ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (isRunning: boolean) => {
    if (isLoading || isManualRefresh) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    return isRunning ? 
      <CheckCircle className="h-4 w-4 text-green-500" /> : 
      <XCircle className="h-4 w-4 text-gray-500" />;
  };

  const processStatus: ProcessStatus = status || {
    is_running: false,
    pid: null,
    memory_usage: 0,
    cpu_usage: 0,
    uptime: 0
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <CardTitle>Server Status</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor(processStatus.is_running)}>
              {processStatus.is_running ? 'Running' : 'Stopped'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isManualRefresh}
            >
              <RefreshCw className={`h-4 w-4 ${isManualRefresh ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Real-time monitoring of server process and resource usage
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center space-x-2">
            {getStatusIcon(processStatus.is_running)}
            <span className="font-medium">
              {processStatus.is_running ? 'Server is running' : 'Server is stopped'}
            </span>
          </div>
          {processStatus.pid && (
            <span className="text-sm text-muted-foreground">
              PID: {processStatus.pid}
            </span>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-lg border border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">
              Failed to fetch server status: {error.message}
            </span>
          </div>
        )}

        {/* Resource Usage */}
        {processStatus.is_running && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Resource Usage</h4>
            
            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-4 w-4 text-blue-500" />
                  <span>Memory Usage</span>
                </div>
                <span className="font-medium">
                  {formatMemory(processStatus.memory_usage)}
                </span>
              </div>
              <Progress 
                value={(processStatus.memory_usage / (server.memory_mb * 1024 * 1024)) * 100} 
                className="h-2"
              />
            </div>

            {/* CPU Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <Cpu className="h-4 w-4 text-green-500" />
                  <span>CPU Usage</span>
                </div>
                <span className="font-medium">
                  {processStatus.cpu_usage.toFixed(1)}%
                </span>
              </div>
              <Progress value={processStatus.cpu_usage} className="h-2" />
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span>Uptime</span>
              </div>
              <span className="font-medium">
                {formatUptime(processStatus.uptime)}
              </span>
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          Last updated: {lastUpdate.toLocaleTimeString()}
          {refreshInterval && (
            <span className="ml-2">
              (Auto-refresh every {refreshInterval / 1000}s)
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerStatusMonitor;
