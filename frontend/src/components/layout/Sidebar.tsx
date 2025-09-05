import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Server, 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Home,
  Plus,
  Activity
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navigation: SidebarItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Servers', href: '/servers', icon: Server },
  { name: 'Create Server', href: '/servers/create', icon: Plus },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  { name: 'Security', href: '/security', icon: Shield, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.is_admin
  );

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <nav className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-minecraft-green text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Quick Stats */}
      <div className="p-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Stats</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Servers</span>
            <span className="font-medium">0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Running</span>
            <span className="font-medium text-green-600">0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Stopped</span>
            <span className="font-medium text-gray-600">0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
