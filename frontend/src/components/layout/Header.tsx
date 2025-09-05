import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, Crown } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
              <div className="h-10 w-10 bg-minecraft-green rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚡</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Minecraft Server Manager</h1>
                <p className="text-xs text-gray-500">v0.1.0-alpha</p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              to="/" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Servers
            </Link>
            {user?.is_admin && (
              <Link 
                to="/admin" 
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Admin
              </Link>
            )}
            <Link 
              to="/settings" 
              className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              Settings
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user?.is_admin && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Crown className="h-3 w-3" />
                <span>Admin</span>
              </Badge>
            )}
            
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500">Welcome back!</p>
              </div>
              <div className="h-8 w-8 bg-minecraft-green rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
