import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Loader2,
  Info,
  HardDrive,
  MemoryStick,
  Server,
  Shield
} from 'lucide-react';
import { useSystemConfig, useUpdateSystemConfig } from '../../hooks/useAdmin';
import type { SystemConfig } from '../../types/api';

interface SystemConfigPanelProps {
  onConfigUpdate?: (config: SystemConfig) => void;
}

const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({
  onConfigUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemConfig>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: systemConfig, isLoading } = useSystemConfig();
  const updateConfigMutation = useUpdateSystemConfig();

  const handleInputChange = (field: keyof SystemConfig, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate memory configuration
    const maxTotal = formData.max_total_memory_mb;
    const defaultServer = formData.default_server_memory_mb;
    const minServer = formData.min_server_memory_mb;
    const maxServer = formData.max_server_memory_mb;

    if (maxTotal !== undefined && maxTotal < 1024) {
      newErrors.max_total_memory_mb = 'Maximum total memory must be at least 1024 MB';
    }

    if (minServer !== undefined && maxServer !== undefined && minServer >= maxServer) {
      newErrors.min_server_memory_mb = 'Minimum server memory must be less than maximum server memory';
      newErrors.max_server_memory_mb = 'Maximum server memory must be greater than minimum server memory';
    }

    if (defaultServer !== undefined && minServer !== undefined && defaultServer < minServer) {
      newErrors.default_server_memory_mb = 'Default server memory must be at least the minimum server memory';
    }

    if (defaultServer !== undefined && maxServer !== undefined && defaultServer > maxServer) {
      newErrors.default_server_memory_mb = 'Default server memory cannot exceed maximum server memory';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      const updatedConfig = await updateConfigMutation.mutateAsync(formData);
      setIsEditing(false);
      setFormData({});
      setErrors({});
      onConfigUpdate?.(updatedConfig);
    } catch (error) {
      console.error('Failed to update system config:', error);
    }
  };

  const handleCancel = () => {
    setFormData({});
    setErrors({});
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (systemConfig) {
      setFormData({
        max_total_memory_mb: systemConfig.max_total_memory_mb,
        default_server_memory_mb: systemConfig.default_server_memory_mb,
        min_server_memory_mb: systemConfig.min_server_memory_mb,
        max_server_memory_mb: systemConfig.max_server_memory_mb
      });
      setIsEditing(true);
    }
  };

  const isLoadingAny = updateConfigMutation.isPending;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>System Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>System Configuration</span>
        </CardTitle>
        <CardDescription>
          Manage global system settings and resource limits
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
                  disabled={isLoadingAny}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isLoadingAny}
                  className="bg-minecraft-green hover:bg-minecraft-dark-green"
                >
                  {isLoadingAny ? (
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
                onClick={handleEdit}
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Config
              </Button>
            )}
          </div>
        </div>

        {/* Memory Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <MemoryStick className="h-4 w-4" />
            <span>Memory Configuration</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_total_memory_mb">Maximum Total Memory (MB)</Label>
              {isEditing ? (
                <Input
                  id="max_total_memory_mb"
                  type="number"
                  min="1024"
                  step="256"
                  value={formData.max_total_memory_mb || ''}
                  onChange={(e) => handleInputChange('max_total_memory_mb', parseInt(e.target.value) || 0)}
                  className={errors.max_total_memory_mb ? 'border-destructive' : ''}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium">
                  {systemConfig?.max_total_memory_mb || 0} MB
                </div>
              )}
              {errors.max_total_memory_mb && (
                <p className="text-sm text-destructive">{errors.max_total_memory_mb}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum total memory that can be allocated across all servers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="default_server_memory_mb">Default Server Memory (MB)</Label>
              {isEditing ? (
                <Input
                  id="default_server_memory_mb"
                  type="number"
                  min="512"
                  step="256"
                  value={formData.default_server_memory_mb || ''}
                  onChange={(e) => handleInputChange('default_server_memory_mb', parseInt(e.target.value) || 0)}
                  className={errors.default_server_memory_mb ? 'border-destructive' : ''}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium">
                  {systemConfig?.default_server_memory_mb || 0} MB
                </div>
              )}
              {errors.default_server_memory_mb && (
                <p className="text-sm text-destructive">{errors.default_server_memory_mb}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Default memory allocation for new servers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min_server_memory_mb">Minimum Server Memory (MB)</Label>
              {isEditing ? (
                <Input
                  id="min_server_memory_mb"
                  type="number"
                  min="256"
                  step="128"
                  value={formData.min_server_memory_mb || ''}
                  onChange={(e) => handleInputChange('min_server_memory_mb', parseInt(e.target.value) || 0)}
                  className={errors.min_server_memory_mb ? 'border-destructive' : ''}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium">
                  {systemConfig?.min_server_memory_mb || 0} MB
                </div>
              )}
              {errors.min_server_memory_mb && (
                <p className="text-sm text-destructive">{errors.min_server_memory_mb}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Minimum memory allocation allowed for servers
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_server_memory_mb">Maximum Server Memory (MB)</Label>
              {isEditing ? (
                <Input
                  id="max_server_memory_mb"
                  type="number"
                  min="512"
                  step="256"
                  value={formData.max_server_memory_mb || ''}
                  onChange={(e) => handleInputChange('max_server_memory_mb', parseInt(e.target.value) || 0)}
                  className={errors.max_server_memory_mb ? 'border-destructive' : ''}
                />
              ) : (
                <div className="p-2 bg-muted rounded-md font-medium">
                  {systemConfig?.max_server_memory_mb || 0} MB
                </div>
              )}
              {errors.max_server_memory_mb && (
                <p className="text-sm text-destructive">{errors.max_server_memory_mb}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum memory allocation allowed for individual servers
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Information */}
        <div className="pt-4 border-t">
          <h4 className="font-medium mb-2 flex items-center space-x-2">
            <Info className="h-4 w-4" />
            <span>Configuration Information</span>
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Memory limits apply to all users and servers</p>
            <p>• Changes take effect immediately for new servers</p>
            <p>• Existing servers retain their current memory allocation</p>
            <p>• Total memory cannot exceed system available memory</p>
          </div>
        </div>

        {/* Warning for Memory Changes */}
        {isEditing && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Changing memory limits may affect server performance. 
              Ensure your system has sufficient memory to support the configured limits.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemConfigPanel;
