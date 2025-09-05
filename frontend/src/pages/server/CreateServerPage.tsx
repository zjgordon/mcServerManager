import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Server } from 'lucide-react';
import CreateServerForm from '../../components/forms/CreateServerForm';

const CreateServerPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSuccess = (server: any) => {
    // Server creation success is handled by the form component
    // The form will navigate to /servers automatically
  };

  const handleCancel = () => {
    navigate('/servers');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-minecraft-green/5 to-minecraft-blue/5 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/servers')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Servers
          </Button>
          
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-minecraft-green rounded-lg flex items-center justify-center mb-4">
              <Server className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              Create New Server
            </h1>
            <p className="text-muted-foreground mt-2">
              Set up your Minecraft server with custom settings and configurations
            </p>
          </div>
        </div>

        {/* Form */}
        <CreateServerForm 
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />

        {/* Help Section */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-muted/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Need Help?</h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Server Name:</strong> Choose a unique name that will identify your server. 
                Only letters, numbers, underscores, and hyphens are allowed.
              </p>
              <p>
                <strong>Memory Allocation:</strong> More memory allows for more players and plugins. 
                Start with 1024-2048 MB for most servers.
              </p>
              <p>
                <strong>Game Mode:</strong> Survival is the default experience, Creative allows unlimited building, 
                Adventure is for custom maps, and Spectator is for observing.
              </p>
              <p>
                <strong>Hardcore Mode:</strong> Once enabled, this cannot be changed. Players will be 
                permanently banned when they die.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateServerPage;
