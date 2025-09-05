import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Info,
  Gamepad2,
  HardDrive,
  Users
} from 'lucide-react';
import { useUpdateServer } from '../../../hooks/useServer';
import type { Server as ServerType, ServerUpdateRequest } from '../../../types/api';

interface ServerConfigPanelProps {
  server: ServerType;
  onConfigUpdate?: (updatedServer: ServerType) => void;
}

const ServerConfigPanel: React.FC<ServerConfigPanelProps> = ({
  server,
  onConfigUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<ServerUpdateRequest>({
    server_name: server.server_name,
    memory_mb: server.memory_mb,
    gamemode: server.gamemode,
    difficulty: server.difficulty,
    motd: server.motd || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateServerMutation = useUpdateServer();

  const handleInputChange = (field: keyof ServerUpdateRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Server name validation
    if (!formData.server_name?.trim()) {
      newErrors.server_name = 'Server name is required';
    } else if (formData.server_name.trim().length < 3) {
      newErrors.server_name = 'Server name must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.server_name.trim())) {
      newErrors.server_name = 'Server name can only contain letters, numbers, underscores, and hyphens';
    }

    // Memory validation
    if (!formData.memory_mb || formData.memory_mb < 512) {
      newErrors.memory_mb = 'Memory must be at least 512 MB';
    } else if (formData.memory_mb > 8192) {
      newErrors.memory_mb = 'Memory cannot exceed 8192 MB (8 GB)';
    }

    // MOTD validation
    if (formData.motd && formData.motd.length > 150) {
      newErrors.motd = 'MOTD cannot exceed 150 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const updatedServer = await updateServerMutation.mutateAsync({
        id: server.id,
        data: formData
      });
      
      setIsEditing(false);
      onConfigUpdate?.(updatedServer);
    } catch (error) {
      console.error('Failed to update server config:', error);
    }
  };

  const handleCancel = () => {
    setFormData({
      server_name: server.server_name,
      memory_mb: server.memory_mb,
      gamemode: server.gamemode,
      difficulty: server.difficulty,
      motd: server.motd || ''
    });
    setErrors({});
    setIsEditing(false);
  };

  const isServerRunning = server.status === 'Running';
  const isLoading = updateServerMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Server Configuration</span>
        </CardTitle>
        <CardDescription>
          Manage your server settings and configuration
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Edit Toggle */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {isEditing ? 'Editing configuration' : 'View configuration'}
          </div>
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-minecraft-green hover:bg-minecraft-dark-green"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isServerRunning}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Config
              </Button>
            )}
          </div>
        </div>

        {isServerRunning && !isEditing && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Server is currently running. Some configuration changes require the server to be stopped.
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <Gamepad2 className="h-4 w-4" />
            <span>Basic Settings</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="server_name">Server Name</Label>
              {isEditing ? (
                <Input
                  id="server_name"
                  value={formData.server_name}
                  onChange={(e) => handleInputChange('server_name', e.target.value)}
                  className={errors.server_name ? 'border-destructive' : ''}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium">
                  {server.server_name}
                </div>
              )}
              {errors.server_name && (
                <p className="text-sm text-destructive">{errors.server_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memory_mb">Memory Allocation (MB)</Label>
              {isEditing ? (
                <Input
                  id="memory_mb"
                  type="number"
                  min="512"
                  max="8192"
                  step="256"
                  value={formData.memory_mb}
                  onChange={(e) => handleInputChange('memory_mb', parseInt(e.target.value) || 1024)}
                  className={errors.memory_mb ? 'border-destructive' : ''}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium">
                  {server.memory_mb} MB
                </div>
              )}
              {errors.memory_mb && (
                <p className="text-sm text-destructive">{errors.memory_mb}</p>
              )}
            </div>
          </div>
        </div>

        {/* Game Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Game Settings</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gamemode">Game Mode</Label>
              {isEditing ? (
                <Select 
                  value={formData.gamemode} 
                  onValueChange={(value: any) => handleInputChange('gamemode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="survival">Survival</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="adventure">Adventure</SelectItem>
                    <SelectItem value="spectator">Spectator</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium capitalize">
                  {server.gamemode}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              {isEditing ? (
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value: any) => handleInputChange('difficulty', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="peaceful">Peaceful</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium capitalize">
                  {server.difficulty}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motd">Message of the Day (MOTD)</Label>
            {isEditing ? (
              <Input
                id="motd"
                placeholder="Welcome to my server!"
                value={formData.motd}
                onChange={(e) => handleInputChange('motd', e.target.value)}
                className={errors.motd ? 'border-destructive' : ''}
              />
            ) : (
              <div className="p-2 bg-muted rounded-md font-medium">
                {server.motd || 'No MOTD set'}
              </div>
            )}
            {errors.motd && (
              <p className="text-sm text-destructive">{errors.motd}</p>
            )}
          </div>
        </div>

        {/* Read-only Settings */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <HardDrive className="h-4 w-4" />
            <span>System Information</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minecraft Version</Label>
              <div className="p-2 bg-muted rounded-md font-medium">
                {server.version}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Server Port</Label>
              <div className="p-2 bg-muted rounded-md font-medium">
                {server.port}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Server Status</Label>
              <div className="p-2 bg-muted rounded-md font-medium">
                {server.status}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Created</Label>
              <div className="p-2 bg-muted rounded-md font-medium">
                {new Date(server.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Tips */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Configuration Tips</span>
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Memory changes require a server restart to take effect</li>
            <li>• Game mode and difficulty changes apply to new players immediately</li>
            <li>• MOTD changes are visible in the server list</li>
            <li>• Some settings may require server restart for full effect</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerConfigPanel;
