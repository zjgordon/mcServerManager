import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Crown, 
  Users, 
  Server, 
  Activity, 
  HardDrive, 
  MemoryStick,
  BarChart3,
  Shield,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { useSystemStats, useUsers } from '../../hooks/useAdmin';
import { useServers } from '../../hooks/useServer';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  
  const { data: systemStats, isLoading: statsLoading } = useSystemStats();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: servers, isLoading: serversLoading } = useServers();

  const runningServers = servers?.filter(server => server.status === 'Running') || [];
  const totalMemoryAllocated = servers?.reduce((sum, server) => sum + server.memory_mb, 0) || 0;
  const adminUsers = users?.filter(user => user.is_admin) || [];
  const regularUsers = users?.filter(user => !user.is_admin) || [];

  const isLoading = statsLoading || usersLoading || serversLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
      <div className="flex items-center space-x-3">
        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Crown className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {currentUser?.username}. Monitor and manage your Minecraft server infrastructure.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.length || 0}</div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                {adminUsers.length} admins
              </Badge>
              <Badge variant="outline" className="text-xs">
                {regularUsers.length} users
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{servers?.length || 0}</div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                {runningServers.length} running
              </Badge>
              <Badge variant="outline" className="text-xs">
                {servers ? servers.length - runningServers.length : 0} stopped
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMemoryAllocated} MB</div>
            <div className="flex items-center space-x-2 mt-1">
              <div className="text-xs text-muted-foreground">
                {systemStats?.memory_usage_summary?.utilization_percentage?.toFixed(1) || 0}% utilized
              </div>
              {systemStats?.memory_usage_summary && systemStats.memory_usage_summary.utilization_percentage > 80 && (
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemStats?.memory_usage_summary && systemStats.memory_usage_summary.utilization_percentage < 80 ? 'Good' : 'Warning'}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${
                systemStats?.memory_usage_summary && systemStats.memory_usage_summary.utilization_percentage < 80 
                  ? 'bg-green-500' 
                  : 'bg-orange-500'
              }`}></div>
              <div className="text-xs text-muted-foreground">
                {runningServers.length} active processes
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Distribution</span>
            </CardTitle>
            <CardDescription>
              Overview of user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Crown className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Administrators</p>
                    <p className="text-sm text-muted-foreground">Full system access</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-purple-600">{adminUsers.length}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Regular Users</p>
                    <p className="text-sm text-muted-foreground">Server management access</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">{regularUsers.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Server Status Overview</span>
            </CardTitle>
            <CardDescription>
              Current status of all Minecraft servers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Activity className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Running Servers</p>
                    <p className="text-sm text-muted-foreground">Active and serving players</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">{runningServers.length}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Server className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Stopped Servers</p>
                    <p className="text-sm text-muted-foreground">Inactive and not consuming resources</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-600">
                  {servers ? servers.length - runningServers.length : 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Usage Visualization */}
      {systemStats?.memory_usage_summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Memory Usage Analysis</span>
            </CardTitle>
            <CardDescription>
              System memory allocation and utilization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {systemStats.memory_usage_summary.total_allocated} MB
                  </div>
                  <div className="text-sm text-muted-foreground">Allocated</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {systemStats.memory_usage_summary.total_available - systemStats.memory_usage_summary.total_allocated} MB
                  </div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {systemStats.memory_usage_summary.utilization_percentage?.toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Utilization</div>
                </div>
              </div>
              
              {/* Memory Usage Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Memory Usage</span>
                  <span>{systemStats.memory_usage_summary.utilization_percentage?.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      (systemStats.memory_usage_summary.utilization_percentage || 0) > 80 
                        ? 'bg-orange-500' 
                        : 'bg-minecraft-green'
                    }`}
                    style={{ 
                      width: `${Math.min(systemStats.memory_usage_summary.utilization_percentage || 0, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Alerts */}
      {systemStats?.memory_usage_summary && systemStats.memory_usage_summary.utilization_percentage > 80 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              <span>System Alert</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-orange-700">
              <p className="font-medium mb-2">High Memory Utilization Detected</p>
              <p className="text-sm">
                Your system is currently using {systemStats.memory_usage_summary.utilization_percentage.toFixed(1)}% of available memory. 
                Consider stopping unused servers or upgrading your system memory to prevent performance issues.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;
