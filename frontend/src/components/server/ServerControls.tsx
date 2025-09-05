import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Zap, 
  Settings, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import type { Server as ServerType } from '../../types/api';

interface ServerControlsProps {
  server: ServerType;
  onStart: (serverId: number) => void;
  onStop: (serverId: number) => void;
  onRestart?: (serverId: number) => void;
  onBackup?: (serverId: number) => void;
  onDelete: (serverId: number) => void;
  onSettings?: (serverId: number) => void;
  isLoading?: boolean;
  variant?: 'default' | 'compact' | 'minimal';
  showLabels?: boolean;
}

const ServerControls: React.FC<ServerControlsProps> = ({
  server,
  onStart,
  onStop,
  onRestart,
  onBackup,
  onDelete,
  onSettings,
  isLoading = false,
  variant = 'default',
  showLabels = true
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isServerRunning = server.status === 'Running';
  const isServerStopped = server.status === 'Stopped';
  const isServerTransitioning = server.status === 'Starting' || server.status === 'Stopping';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(server.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete server:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestart = async () => {
    if (isServerRunning) {
      await onStop(server.id);
      // Wait a moment then start
      setTimeout(() => {
        onStart(server.id);
      }, 2000);
    }
  };

  if (variant === 'minimal') {
    return (
      <div className="flex items-center space-x-1">
        {isServerRunning ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onStop(server.id)}
            disabled={isLoading || isServerTransitioning}
            title="Stop Server"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => onStart(server.id)}
            disabled={isLoading || isServerTransitioning}
            title="Start Server"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        {isServerRunning ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onStop(server.id)}
            disabled={isLoading || isServerTransitioning}
          >
            <Square className="h-4 w-4" />
            {showLabels && 'Stop'}
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={() => onStart(server.id)}
            disabled={isLoading || isServerTransitioning}
          >
            <Play className="h-4 w-4" />
            {showLabels && 'Start'}
          </Button>
        )}
        
        {onSettings && (
          <Button variant="outline" size="sm" onClick={() => onSettings(server.id)}>
            <Settings className="h-4 w-4" />
          </Button>
        )}
        
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading || isServerRunning}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Server</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{server.server_name}"? This action cannot be undone and will permanently remove all server files and data.
              </DialogDescription>
            </DialogHeader>
            
            {isServerRunning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The server is currently running. It will be stopped before deletion.
                </AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Server'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* Primary Action */}
      {isServerRunning ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onStop(server.id)}
          disabled={isLoading || isServerTransitioning}
          className="flex-1 min-w-[100px]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Square className="h-4 w-4 mr-2" />
          )}
          Stop Server
        </Button>
      ) : (
        <Button
          variant="default"
          size="sm"
          onClick={() => onStart(server.id)}
          disabled={isLoading || isServerTransitioning}
          className="flex-1 min-w-[100px]"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Play className="h-4 w-4 mr-2" />
          )}
          Start Server
        </Button>
      )}

      {/* Secondary Actions */}
      <div className="flex space-x-1">
        {onRestart && isServerRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            disabled={isLoading || isServerTransitioning}
            title="Restart Server"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
        
        {onBackup && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onBackup(server.id)}
            disabled={isLoading}
            title="Create Backup"
          >
            <Zap className="h-4 w-4" />
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          asChild
          title="Server Settings"
        >
          <Link to={`/servers/${server.id}`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
        
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={isLoading || isServerRunning}
              title="Delete Server"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Server</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{server.server_name}"? This action cannot be undone and will permanently remove all server files and data.
              </DialogDescription>
            </DialogHeader>
            
            {isServerRunning && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The server is currently running. It will be stopped before deletion.
                </AlertDescription>
              </Alert>
            )}
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Server'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ServerControls;
