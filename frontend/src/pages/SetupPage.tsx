import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SetupForm } from '../components/auth';
import { apiService } from '../services/api';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle } from 'lucide-react';

const SetupPage: React.FC = () => {
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await apiService.getSetupStatus();
        setSetupRequired(response.setup_required);
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setSetupRequired(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSetupStatus();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-minecraft-green"></div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Loading...</h3>
            <p className="text-sm text-muted-foreground">
              Checking setup status
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If setup is not required, redirect to login or dashboard
  if (setupRequired === false) {
    return isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />;
  }

  // If setup is complete, show success message
  if (setupComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-minecraft-green/10 to-minecraft-blue/10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Setup Complete!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your admin account has been created successfully
            </p>
          </div>
          
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              You can now sign in with your admin credentials to start managing your Minecraft servers.
            </AlertDescription>
          </Alert>
          
          <div className="text-center">
            <a 
              href="/login" 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-minecraft-green hover:bg-minecraft-dark-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-minecraft-green"
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-minecraft-green/10 to-minecraft-blue/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-minecraft-green rounded-lg flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">⚡</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome to Minecraft Server Manager
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Let's set up your admin account to get started
          </p>
        </div>
        
        <SetupForm 
          onSuccess={() => setSetupComplete(true)}
          onError={(error) => console.error('Setup error:', error)}
        />
      </div>
    </div>
  );
};

export default SetupPage;
