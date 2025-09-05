import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChangePasswordForm } from '../components/auth';
import { MainLayout } from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ChangePasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSuccess = () => {
    navigate('/settings');
  };

  const handleCancel = () => {
    navigate('/settings');
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/settings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
          
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Change Password</h1>
            <p className="text-muted-foreground">
              Update your password for better security
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Change</CardTitle>
            <CardDescription>
              {user ? `Changing password for ${user.username}` : 'Update your account password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm 
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ChangePasswordPage;
