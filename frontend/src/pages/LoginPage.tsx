import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoginForm } from '../components/auth';

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-minecraft-green/10 to-minecraft-blue/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-minecraft-green rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">⚡</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Minecraft Server Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage your servers
          </p>
        </div>
        
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
