import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Server, 
  Users, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap
} from 'lucide-react';
import { useSystemStats, useUsers } from '../../hooks/useAdmin';
import { useServers as useServerData } from '../../hooks/useServer';
import { useToast } from '../../hooks/use-toast';

interface SystemMonitoringPanelProps {
  refreshInterval?: number;
  onSystemAlert?: (alert: any) => void;
}

interface SystemMetrics {
  timestamp: Date;
  totalUsers: number;
  totalServers: number;
  runningServers: number;
  totalMemoryAllocated: number;
  memoryUtilization: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

const SystemMonitoringPanel: React.FC<SystemMonitoringPanelProps> = ({
  refreshInterval = 10000,
  onSystemAlert
}) => {
  const { toast } = useToast();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isManualRefresh, setIsManualRefresh] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const { data: systemStats, isLoading: statsLoading, refetch: refetchStats } = useSystemStats();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: servers, isLoading: serversLoading, refetch: refetchServers } = useServerData();

  // Auto-refresh effect
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Update metrics history when data changes
  useEffect(() => {
    if (systemStats && users && servers) {
      const newMetrics: SystemMetrics = {
        timestamp: new Date(),
        totalUsers: users.length,
        totalServers: servers.length,
        runningServers: servers.filter(s => s.status === 'Running').length,
        totalMemoryAllocated: servers.reduce((sum, s) => sum + s.memory_mb, 0),
        memoryUtilization: systemStats.memory_usage_summary?.utilization_percentage || 0,
        systemHealth: getSystemHealthStatus(systemStats.memory_usage_summary?.utilization_percentage || 0)
      };

      setMetricsHistory(prev => {
        const updated = [...prev, newMetrics].slice(-20); // Keep last 20 metrics
        return updated;
      });

      setLastUpdate(new Date());

      // Check for alerts
      checkForAlerts(newMetrics);
    }
  }, [systemStats, users, servers]);

  const getSystemHealthStatus = (utilization: number): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (utilization < 70) return 'excellent';
    if (utilization < 85) return 'good';
    if (utilization < 95) return 'warning';
    return 'critical';
  };

  const checkForAlerts = (metrics: SystemMetrics) => {
    const newAlerts: any[] = [];

    // Memory utilization alert
    if (metrics.memoryUtilization > 90) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'critical',
        title: 'High Memory Utilization',
        message: `System memory usage is at ${metrics.memoryUtilization.toFixed(1)}%`,
        timestamp: new Date()
      });
    } else if (metrics.memoryUtilization > 80) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'warning',
        title: 'Memory Usage Warning',
        message: `System memory usage is at ${metrics.memoryUtilization.toFixed(1)}%`,
        timestamp: new Date()
      });
    }

    // Server status alerts
    if (metrics.runningServers === 0 && metrics.totalServers > 0) {
      newAlerts.push({
        id: `servers-${Date.now()}`,
        type: 'warning',
        title: 'No Servers Running',
        message: 'All servers are currently stopped',
        timestamp: new Date()
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 10)); // Keep last 10 alerts
      newAlerts.forEach(alert => onSystemAlert?.(alert));
    }
  };

  const handleRefresh = async () => {
    setIsManualRefresh(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchUsers(),
        refetchServers()
      ]);
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh system data',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setIsManualRefresh(false), 1000);
    }
  };

  const formatUptime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return 'stable';
    const change = ((current - previous) / previous) * 100;
    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'stable';
  };

  const currentMetrics = metricsHistory[metricsHistory.length - 1];
  const previousMetrics = metricsHistory[metricsHistory.length - 2];

  if (statsLoading || usersLoading || serversLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">System Monitoring</h3>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Auto-refresh: {refreshInterval / 1000}s
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isManualRefresh}
          >
            <RefreshCw className={`h-4 w-4 ${isManualRefresh ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Current System Status */}
      {currentMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Server className="h-4 w-4" />
                <span>Server Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Running</span>
                  <span className="font-medium">{currentMetrics.runningServers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-medium">{currentMetrics.totalServers}</span>
                </div>
                {previousMetrics && (
                  <div className="flex items-center space-x-1 text-xs">
                    {getTrend(currentMetrics.runningServers, previousMetrics.runningServers) === 'up' && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                    {getTrend(currentMetrics.runningServers, previousMetrics.runningServers) === 'down' && (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      {formatUptime(currentMetrics.timestamp)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <MemoryStick className="h-4 w-4" />
                <span>Memory Usage</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Allocated</span>
                  <span className="font-medium">{currentMetrics.totalMemoryAllocated} MB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Utilization</span>
                  <span className="font-medium">{currentMetrics.memoryUtilization.toFixed(1)}%</span>
                </div>
                <Progress value={currentMetrics.memoryUtilization} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>System Health</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`flex items-center space-x-2 p-2 rounded-lg border ${getHealthColor(currentMetrics.systemHealth)}`}>
                  {getHealthIcon(currentMetrics.systemHealth)}
                  <span className="font-medium capitalize">{currentMetrics.systemHealth}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Last updated: {formatUptime(currentMetrics.timestamp)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>System Alerts</span>
            </CardTitle>
            <CardDescription>
              Recent system alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.type === 'critical' 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.type === 'critical' ? 'text-red-500' : 'text-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatUptime(alert.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Trends */}
      {metricsHistory.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Performance Trends</span>
            </CardTitle>
            <CardDescription>
              System performance over the last {metricsHistory.length} measurements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Memory Utilization Trend</h4>
                  <div className="flex items-end space-x-1 h-16">
                    {metricsHistory.slice(-10).map((metric, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-muted rounded-t"
                        style={{
                          height: `${(metric.memoryUtilization / 100) * 100}%`,
                          minHeight: '4px'
                        }}
                        title={`${metric.memoryUtilization.toFixed(1)}%`}
                      />
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Running Servers Trend</h4>
                  <div className="flex items-end space-x-1 h-16">
                    {metricsHistory.slice(-10).map((metric, index) => {
                      const maxServers = Math.max(...metricsHistory.map(m => m.totalServers));
                      const height = maxServers > 0 ? (metric.runningServers / maxServers) * 100 : 0;
                      return (
                        <div
                          key={index}
                          className="flex-1 bg-minecraft-green rounded-t"
                          style={{
                            height: `${height}%`,
                            minHeight: '4px'
                          }}
                          title={`${metric.runningServers} servers`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Update */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {lastUpdate.toLocaleTimeString()}
        {refreshInterval > 0 && (
          <span className="ml-2">
            (Auto-refresh every {refreshInterval / 1000}s)
          </span>
        )}
      </div>
    </div>
  );
};

export default SystemMonitoringPanel;
