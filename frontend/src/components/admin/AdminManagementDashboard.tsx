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
  Crown, 
  Users, 
  Settings, 
  Activity, 
  BarChart3,
  Shield,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  HardDrive,
  Server,
  MemoryStick
} from 'lucide-react';
import { useSystemStats, useUsers, useSystemConfig } from '../../hooks/useAdmin';
import { useServers } from '../../hooks/useServer';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import AdminDashboard from './AdminDashboard';
import UserManagementPanel from './UserManagementPanel';
import SystemConfigPanel from './SystemConfigPanel';
import ProcessManagementPanel from './ProcessManagementPanel';
import SystemMonitoringPanel from './SystemMonitoringPanel';
import type { User as UserType } from '../../types/api';

interface AdminManagementDashboardProps {
  selectedTab?: string;
  onTabChange?: (tab: string) => void;
}

const AdminManagementDashboard: React.FC<AdminManagementDashboardProps> = ({
  selectedTab,
  onTabChange
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState(selectedTab || 'dashboard');
  
  const { data: systemStats, isLoading: statsLoading, refetch: refetchStats } = useSystemStats();
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: servers, isLoading: serversLoading, refetch: refetchServers } = useServers();
  const { data: systemConfig, isLoading: configLoading, refetch: refetchConfig } = useSystemConfig();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refetchStats(),
        refetchUsers(),
        refetchServers(),
        refetchConfig()
      ]);
      toast({
        title: 'Data Refreshed',
        description: 'All admin data has been refreshed successfully.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh some data. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const getSystemHealthStatus = () => {
    if (!systemStats?.memory_usage_summary) return { status: 'unknown', color: 'gray' };
    
    const utilization = systemStats.memory_usage_summary.utilization_percentage || 0;
    if (utilization < 70) return { status: 'excellent', color: 'green' };
    if (utilization < 85) return { status: 'good', color: 'blue' };
    if (utilization < 95) return { status: 'warning', color: 'orange' };
    return { status: 'critical', color: 'red' };
  };

  const getQuickStats = () => {
    const runningServers = servers?.filter(server => server.status === 'Running') || [];
    const adminUsers = users?.filter(user => user.is_admin) || [];
    const regularUsers = users?.filter(user => !user.is_admin) || [];
    const totalMemoryAllocated = servers?.reduce((sum, server) => sum + server.memory_mb, 0) || 0;
    
    return {
      totalUsers: users?.length || 0,
      adminUsers: adminUsers.length,
      regularUsers: regularUsers.length,
      totalServers: servers?.length || 0,
      runningServers: runningServers.length,
      stoppedServers: (servers?.length || 0) - runningServers.length,
      totalMemoryAllocated,
      systemHealth: getSystemHealthStatus()
    };
  };

  const stats = getQuickStats();
  const isLoading = statsLoading || usersLoading || serversLoading || configLoading;

  if (!currentUser?.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-minecraft-green/5 to-minecraft-blue/5 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to access the admin panel. Administrator privileges are required.
            </p>
            <Button 
              onClick={() => navigate('/')} 
              className="mt-4"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-muted-foreground">
              Welcome back, {currentUser.username}. Manage your Minecraft server infrastructure.
            </p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
                <div className="flex space-x-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    {stats.adminUsers}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {stats.regularUsers}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Server className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Servers</p>
                <p className="text-2xl font-bold">{stats.totalServers}</p>
                <div className="flex space-x-1 mt-1">
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                    {stats.runningServers} running
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {stats.stoppedServers} stopped
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MemoryStick className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className="text-2xl font-bold">{stats.totalMemoryAllocated} MB</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-2 h-2 rounded-full bg-${stats.systemHealth.color}-500`}></div>
                  <span className="text-xs text-muted-foreground">
                    {systemStats?.memory_usage_summary?.utilization_percentage?.toFixed(1) || 0}% utilized
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">System Health</p>
                <p className="text-2xl font-bold capitalize">{stats.systemHealth.status}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <div className={`w-2 h-2 rounded-full bg-${stats.systemHealth.color}-500`}></div>
                  <span className="text-xs text-muted-foreground">
                    {stats.runningServers} active processes
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Configuration</span>
          </TabsTrigger>
          <TabsTrigger value="processes" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Processes</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Monitoring</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagementPanel onUserUpdate={() => refetchUsers()} />
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <SystemConfigPanel onConfigUpdate={() => refetchConfig()} />
        </TabsContent>

        <TabsContent value="processes" className="space-y-4">
          <ProcessManagementPanel onProcessUpdate={() => refetchStats()} />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <SystemMonitoringPanel 
            onSystemAlert={(alert) => {
              toast({
                title: alert.title,
                description: alert.message,
                variant: alert.type === 'critical' ? 'destructive' : 'default',
              });
            }}
            refreshInterval={15000}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminManagementDashboard;
