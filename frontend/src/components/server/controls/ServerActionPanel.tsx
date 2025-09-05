import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { 
  Play, 
  Square, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  FileText,
  Zap,
  Info
} from 'lucide-react';
import { useStartServer, useStopServer, useAcceptEula } from '../../../hooks/useServer';
import type { Server as ServerType } from '../../../types/api';

interface ServerActionPanelProps {
  server: ServerType;
  onStatusChange?: () => void;
}

const ServerActionPanel: React.FC<ServerActionPanelProps> = ({
  server,
  onStatusChange
}) => {
  const [showEulaDialog, setShowEulaDialog] = useState(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  
  const startServerMutation = useStartServer();
  const stopServerMutation = useStopServer();
  const acceptEulaMutation = useAcceptEula();

  const isServerRunning = server.status === 'Running';
  const isServerStopped = server.status === 'Stopped';
  const isServerTransitioning = server.status === 'Starting' || server.status === 'Stopping';
  const isLoading = startServerMutation.isPending || stopServerMutation.isPending || acceptEulaMutation.isPending;

  const handleStart = async () => {
    try {
      await startServerMutation.mutateAsync(server.id);
      onStatusChange?.();
    } catch (error: any) {
      // Check if it's an EULA error
      if (error.message?.includes('EULA')) {
        setShowEulaDialog(true);
      }
    }
  };

  const handleStop = async () => {
    try {
      await stopServerMutation.mutateAsync(server.id);
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  const handleRestart = async () => {
    try {
      // Stop the server first
      await stopServerMutation.mutateAsync(server.id);
      
      // Wait a moment then start
      setTimeout(async () => {
        try {
          await startServerMutation.mutateAsync(server.id);
          onStatusChange?.();
        } catch (error: any) {
          if (error.message?.includes('EULA')) {
            setShowEulaDialog(true);
          }
        }
      }, 2000);
      
      setShowRestartDialog(false);
    } catch (error) {
      console.error('Failed to restart server:', error);
    }
  };

  const handleAcceptEula = async () => {
    try {
      await acceptEulaMutation.mutateAsync(server.id);
      setShowEulaDialog(false);
      // Try to start the server after accepting EULA
      setTimeout(() => {
        handleStart();
      }, 1000);
    } catch (error) {
      console.error('Failed to accept EULA:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Stopped':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'Starting':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Stopping':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Stopped':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'Starting':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'Stopping':
        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />;
      default:
        return <Square className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5" />
          <span>Server Actions</span>
        </CardTitle>
        <CardDescription>
          Control your server's lifecycle and manage its state
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(server.status)}`}>
          <div className="flex items-center space-x-2">
            {getStatusIcon(server.status)}
            <span className="font-medium">Status: {server.status}</span>
          </div>
          {server.pid && (
            <span className="text-sm">PID: {server.pid}</span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Start Button */}
          {!isServerRunning && (
            <Button
              onClick={handleStart}
              disabled={isLoading || isServerTransitioning}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Server
            </Button>
          )}

          {/* Stop Button */}
          {isServerRunning && (
            <Button
              onClick={handleStop}
              disabled={isLoading || isServerTransitioning}
              variant="destructive"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Stop Server
            </Button>
          )}

          {/* Restart Button */}
          {isServerRunning && (
            <Dialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isLoading || isServerTransitioning}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restart
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Restart Server</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to restart "{server.server_name}"? 
                    This will stop the server and start it again. Players will be disconnected.
                  </DialogDescription>
                </DialogHeader>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    All connected players will be disconnected during the restart process.
                  </AlertDescription>
                </Alert>
                
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowRestartDialog(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleRestart}
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Restarting...
                      </>
                    ) : (
                      'Restart Server'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Server Information */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2">Server Information</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Version:</span>
              <div className="font-medium">{server.version}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Port:</span>
              <div className="font-medium">{server.port}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Memory:</span>
              <div className="font-medium">{server.memory_mb} MB</div>
            </div>
            <div>
              <span className="text-muted-foreground">Game Mode:</span>
              <div className="font-medium capitalize">{server.gamemode}</div>
            </div>
          </div>
        </div>

        {/* EULA Dialog */}
        <Dialog open={showEulaDialog} onOpenChange={setShowEulaDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Accept Minecraft EULA</span>
              </DialogTitle>
              <DialogDescription>
                Before starting your server, you must accept the Minecraft End User License Agreement (EULA).
              </DialogDescription>
            </DialogHeader>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                By accepting the EULA, you agree to Mojang's terms of service for running a Minecraft server.
                This is a one-time requirement for each server.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Server:</strong> {server.server_name}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Version:</strong> {server.version}
              </p>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowEulaDialog(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAcceptEula}
                disabled={isLoading}
                className="bg-minecraft-green hover:bg-minecraft-dark-green"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept EULA & Start Server'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ServerActionPanel;
