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
  Download, 
  Archive, 
  Clock, 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Info,
  FileText
} from 'lucide-react';
import { useBackupServer } from '../../../hooks/useServer';
import type { Server as ServerType } from '../../../types/api';

interface ServerBackupPanelProps {
  server: ServerType;
  onBackupComplete?: (backupFile: string) => void;
}

interface BackupInfo {
  filename: string;
  size: string;
  created: string;
}

const ServerBackupPanel: React.FC<ServerBackupPanelProps> = ({
  server,
  onBackupComplete
}) => {
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null);
  
  const backupServerMutation = useBackupServer();

  const handleBackup = async () => {
    try {
      const result = await backupServerMutation.mutateAsync(server.id);
      setBackupInfo({
        filename: result.backup_file || `${server.server_name}_backup.tar.gz`,
        size: 'Calculating...',
        created: new Date().toLocaleString()
      });
      setShowBackupDialog(false);
      onBackupComplete?.(result.backup_file || 'backup.tar.gz');
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getBackupStatus = () => {
    if (backupServerMutation.isPending) {
      return {
        icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
        text: 'Creating backup...',
        color: 'text-blue-600 bg-blue-50 border-blue-200'
      };
    }
    
    if (backupServerMutation.isError) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        text: 'Backup failed',
        color: 'text-red-600 bg-red-50 border-red-200'
      };
    }
    
    if (backupServerMutation.isSuccess) {
      return {
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
        text: 'Backup completed',
        color: 'text-green-600 bg-green-50 border-green-200'
      };
    }
    
    return {
      icon: <Archive className="h-4 w-4 text-gray-500" />,
      text: 'Ready to backup',
      color: 'text-gray-600 bg-gray-50 border-gray-200'
    };
  };

  const status = getBackupStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Archive className="h-5 w-5" />
          <span>Server Backup</span>
        </CardTitle>
        <CardDescription>
          Create and manage backups of your server files
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Backup Status */}
        <div className={`flex items-center justify-between p-3 rounded-lg border ${status.color}`}>
          <div className="flex items-center space-x-2">
            {status.icon}
            <span className="font-medium">{status.text}</span>
          </div>
          {backupInfo && (
            <span className="text-sm">{backupInfo.created}</span>
          )}
        </div>

        {/* Backup Information */}
        {backupInfo && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Latest Backup</span>
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">File:</span>
                <span className="font-mono text-xs">{backupInfo.filename}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{backupInfo.created}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span>{backupInfo.size}</span>
              </div>
            </div>
          </div>
        )}

        {/* Backup Action */}
        <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              disabled={backupServerMutation.isPending}
            >
              {backupServerMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Archive className="h-5 w-5" />
                <span>Create Server Backup</span>
              </DialogTitle>
              <DialogDescription>
                Create a backup of "{server.server_name}" including all world data, configuration files, and plugins.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The backup process will temporarily stop the server if it's running to ensure data consistency.
                  The server will be automatically restarted after the backup is complete.
                </AlertDescription>
              </Alert>

              {server.status === 'Running' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> The server is currently running. It will be stopped during the backup process.
                    All connected players will be disconnected.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-medium">Backup Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Server:</span>
                    <div className="font-medium">{server.server_name}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Version:</span>
                    <div className="font-medium">{server.version}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium">{server.status}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Memory:</span>
                    <div className="font-medium">{server.memory_mb} MB</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">What's Included</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>World data and player progress</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Server configuration files</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Plugin data and configurations</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span>Log files and statistics</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowBackupDialog(false)}
                disabled={backupServerMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBackup}
                disabled={backupServerMutation.isPending}
                className="bg-minecraft-green hover:bg-minecraft-dark-green"
              >
                {backupServerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Backup...
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Create Backup
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Backup Tips */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Backup Tips</span>
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Create regular backups before major updates</li>
            <li>• Backups are stored in the backups directory</li>
            <li>• Keep multiple backup versions for safety</li>
            <li>• Test backups by restoring them in a test environment</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerBackupPanel;
