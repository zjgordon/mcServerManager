import React from 'react';
import { Outlet } from 'react-router-dom';
import { ResponsiveContainer } from './responsive';

interface AuthLayoutProps {
  children?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-minecraft-green/10 to-minecraft-blue/10 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <ResponsiveContainer size="md" padding="none" className="w-full">
        {children || <Outlet />}
      </ResponsiveContainer>
    </div>
  );
};
