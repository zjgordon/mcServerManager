import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../ui/sheet';
import { 
  Menu, 
  X, 
  Server, 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Home,
  Plus,
  Activity,
  LogOut,
  User,
  Crown
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/utils';

interface MobileNavigationProps {
  className?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Servers', href: '/servers', icon: Server },
  { name: 'Create Server', href: '/servers/create', icon: Plus },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Users', href: '/users', icon: Users, adminOnly: true },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, adminOnly: true },
  { name: 'Security', href: '/security', icon: Shield, adminOnly: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const filteredNavigation = navigation.filter(item => 
    !item.adminOnly || user?.is_admin
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setIsOpen(false);
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className={cn('md:hidden', className)}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="p-2">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-minecraft-green rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">⚡</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">Minecraft Server Manager</h1>
                  <p className="text-xs text-muted-foreground">v0.1.0-alpha</p>
                </div>
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* User Info */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-minecraft-green rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-foreground">{user?.username}</p>
                    {user?.is_admin && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Crown className="h-3 w-3" />
                        <span>Admin</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">Welcome back!</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="px-6 py-4">
              <div className="space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = location.pathname === item.href || 
                    (item.href !== '/' && location.pathname.startsWith(item.href));
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleLinkClick}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-minecraft-green text-white'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Quick Stats */}
            <div className="px-6 py-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-3">Quick Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Servers</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Running</span>
                  <span className="font-medium text-green-600">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stopped</span>
                  <span className="font-medium text-muted-foreground">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="p-6 border-t border-border">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNavigation;
