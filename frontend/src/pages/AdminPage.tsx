import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiService } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Server, 
  Shield, 
  BarChart3, 
  Settings,
  Plus,
  Edit,
  Crown,
  Activity
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();

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

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.getUsers();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
  });

  const { data: systemConfig, isLoading: configLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const response = await apiService.getSystemConfig();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
  });

  if (!user?.is_admin) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">
          You don't have permission to access the admin panel.
        </p>
      </div>
    );
  }

  if (statsLoading || usersLoading || configLoading) {
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
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <Crown className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600">Manage users, system settings, and monitor performance</p>
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
            <div className="text-2xl font-bold">{systemStats?.total_users || 0}</div>
            <p className="text-xs text-muted-foreground">
              {users?.filter(u => u.is_active).length || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.total_servers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.running_servers || 0} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemStats?.total_memory_allocated || 0} MB</div>
            <p className="text-xs text-muted-foreground">
              {systemStats?.system_memory_usage || 0}% system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts and permissions
                </CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users?.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-8 w-8 bg-minecraft-green rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.is_admin && (
                      <Badge variant="secondary">
                        <Crown className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    <Badge variant={user.is_active ? 'running' : 'stopped'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {users && users.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  And {users.length - 5} more users...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
            <CardDescription>
              Global system settings and limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {systemConfig && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">App Title</span>
                  <span className="text-sm font-medium">{systemConfig.app_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Server Hostname</span>
                  <span className="text-sm font-medium">{systemConfig.server_hostname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Max Total Memory</span>
                  <span className="text-sm font-medium">{systemConfig.max_total_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Max Server Memory</span>
                  <span className="text-sm font-medium">{systemConfig.max_server_mb} MB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Default Server Memory</span>
                  <span className="text-sm font-medium">{systemConfig.default_server_mb} MB</span>
                </div>
              </>
            )}
            <Button className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Edit Configuration
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest system events and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No recent activity to display</p>
            <p className="text-sm text-gray-400 mt-1">
              Activity logging will be implemented in a future update
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
