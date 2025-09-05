import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Loader2 } from 'lucide-react';

interface AuthFlowProps {
  children: React.ReactNode;
}

const AuthFlow: React.FC<AuthFlowProps> = ({ children }) => {
  const [setupStatus, setSetupStatus] = useState<{
    setupRequired: boolean | null;
    isLoading: boolean;
  }>({
    setupRequired: null,
    isLoading: true,
  });
  
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await apiService.getSetupStatus();
        setSetupStatus({
          setupRequired: response.setup_required,
          isLoading: false,
        });
      } catch (error) {
        console.error('Failed to check setup status:', error);
        setSetupStatus({
          setupRequired: false,
          isLoading: false,
        });
      }
    };

    checkSetupStatus();
  }, []);

  // Show loading while checking setup status or auth status
  if (setupStatus.isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-minecraft-green" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Loading...</h3>
            <p className="text-sm text-muted-foreground">
              Checking authentication status
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If setup is required, redirect to setup page
  if (setupStatus.setupRequired) {
    return <Navigate to="/setup" replace />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is authenticated and setup is complete, render the app
  return <>{children}</>;
};

export default AuthFlow;
