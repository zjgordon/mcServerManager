import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Server, 
  Users, 
  Activity, 
  HardDrive, 
  Cpu,
  Plus,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await apiService.getServers();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
  });

  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['system-stats'],
    queryFn: async () => {
      const response = await apiService.getSystemStats();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });

  const runningServers = servers?.filter(server => server.status === 'Running').length || 0;
  const totalServers = servers?.length || 0;

  if (serversLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-minecraft-green to-minecraft-blue rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {user?.username}! 👋
        </h1>
        <p className="text-minecraft-green/90">
          Manage your Minecraft servers with ease. Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServers}</div>
            <p className="text-xs text-muted-foreground">
              {runningServers} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.total_users || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {user?.is_admin ? 'Total registered' : 'In your servers'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.total_memory_allocated || 0} MB
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.system_memory_usage || 0}% system usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.disk_usage?.used_gb || 0} GB
            </div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.disk_usage?.free_gb || 0} GB free
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you can perform right now
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create New Server
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              View Server Logs
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest events across your servers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {totalServers === 0 ? (
              <div className="text-center py-6">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No servers found</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Server
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {servers?.slice(0, 3).map((server) => (
                  <div key={server.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{server.server_name}</p>
                      <p className="text-sm text-gray-500">{server.version}</p>
                    </div>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      {user?.is_admin && systemStats && (
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current system resource usage and health
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <Cpu className="h-8 w-8 text-minecraft-blue mx-auto mb-2" />
                <p className="text-sm text-gray-500">CPU Usage</p>
                <p className="text-2xl font-bold">N/A</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <HardDrive className="h-8 w-8 text-minecraft-green mx-auto mb-2" />
                <p className="text-sm text-gray-500">Memory</p>
                <p className="text-2xl font-bold">{systemStats.system_memory_usage}%</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <HardDrive className="h-8 w-8 text-minecraft-brown mx-auto mb-2" />
                <p className="text-sm text-gray-500">Disk</p>
                <p className="text-2xl font-bold">
                  {Math.round((systemStats.disk_usage.used_gb / systemStats.disk_usage.total_gb) * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
