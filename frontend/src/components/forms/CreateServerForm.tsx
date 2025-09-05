import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { 
  Loader2, 
  Server, 
  Settings, 
  Gamepad2, 
  HardDrive,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useCreateServer, useServers } from '../../hooks/useServer';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { ServerCreateRequest } from '../../types/api';

interface CreateServerFormProps {
  onSuccess?: (server: any) => void;
  onCancel?: () => void;
}

interface FormData extends ServerCreateRequest {
  confirmServerName: string;
}

interface FormErrors {
  server_name?: string;
  confirmServerName?: string;
  version?: string;
  memory_mb?: string;
  level_seed?: string;
  gamemode?: string;
  difficulty?: string;
  motd?: string;
  general?: string;
}

const CreateServerForm: React.FC<CreateServerFormProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const navigate = useNavigate();
  const createServerMutation = useCreateServer();
  const { data: existingServers } = useServers();
  
  const [formData, setFormData] = useState<FormData>({
    server_name: '',
    confirmServerName: '',
    version: '',
    memory_mb: 1024,
    level_seed: '',
    gamemode: 'survival',
    difficulty: 'normal',
    hardcore: false,
    pvp: true,
    spawn_monsters: true,
    motd: 'A Minecraft Server'
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Fetch available versions
  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['versions'],
    queryFn: async () => {
      const response = await apiService.getAvailableVersions();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch versions');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Server name validation
    if (!formData.server_name.trim()) {
      newErrors.server_name = 'Server name is required';
    } else if (formData.server_name.trim().length < 3) {
      newErrors.server_name = 'Server name must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.server_name.trim())) {
      newErrors.server_name = 'Server name can only contain letters, numbers, underscores, and hyphens';
    } else if (existingServers?.some(server => 
      server.server_name.toLowerCase() === formData.server_name.trim().toLowerCase()
    )) {
      newErrors.server_name = 'A server with this name already exists';
    }

    // Confirm server name validation
    if (!formData.confirmServerName.trim()) {
      newErrors.confirmServerName = 'Please confirm the server name';
    } else if (formData.server_name.trim() !== formData.confirmServerName.trim()) {
      newErrors.confirmServerName = 'Server names do not match';
    }

    // Version validation
    if (!formData.version) {
      newErrors.version = 'Minecraft version is required';
    }

    // Memory validation
    if (!formData.memory_mb || formData.memory_mb < 512) {
      newErrors.memory_mb = 'Memory must be at least 512 MB';
    } else if (formData.memory_mb > 8192) {
      newErrors.memory_mb = 'Memory cannot exceed 8192 MB (8 GB)';
    }

    // Level seed validation
    if (formData.level_seed && formData.level_seed.length > 100) {
      newErrors.level_seed = 'Level seed cannot exceed 100 characters';
    }

    // MOTD validation
    if (formData.motd && formData.motd.length > 150) {
      newErrors.motd = 'MOTD cannot exceed 150 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const serverData: ServerCreateRequest = {
        server_name: formData.server_name.trim(),
        version: formData.version,
        memory_mb: formData.memory_mb,
        level_seed: formData.level_seed.trim() || undefined,
        gamemode: formData.gamemode,
        difficulty: formData.difficulty,
        hardcore: formData.hardcore,
        pvp: formData.pvp,
        spawn_monsters: formData.spawn_monsters,
        motd: formData.motd.trim() || undefined,
      };

      const newServer = await createServerMutation.mutateAsync(serverData);
      onSuccess?.(newServer);
      navigate('/servers');
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Server className="h-12 w-12 text-minecraft-green mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Basic Server Information</h3>
        <p className="text-muted-foreground">Let's start with the basic details for your server</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="server_name">Server Name</Label>
          <Input
            id="server_name"
            placeholder="My Awesome Server"
            value={formData.server_name}
            onChange={(e) => handleInputChange('server_name', e.target.value)}
            className={errors.server_name ? 'border-destructive' : ''}
          />
          {errors.server_name && (
            <p className="text-sm text-destructive">{errors.server_name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmServerName">Confirm Server Name</Label>
          <Input
            id="confirmServerName"
            placeholder="My Awesome Server"
            value={formData.confirmServerName}
            onChange={(e) => handleInputChange('confirmServerName', e.target.value)}
            className={errors.confirmServerName ? 'border-destructive' : ''}
          />
          {errors.confirmServerName && (
            <p className="text-sm text-destructive">{errors.confirmServerName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="version">Minecraft Version</Label>
          <Select 
            value={formData.version} 
            onValueChange={(value) => handleInputChange('version', value)}
          >
            <SelectTrigger className={errors.version ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select a version" />
            </SelectTrigger>
            <SelectContent>
              {versionsLoading ? (
                <SelectItem value="" disabled>Loading versions...</SelectItem>
              ) : (
                versionsData?.releases?.slice(0, 20).map((version) => (
                  <SelectItem key={version} value={version}>
                    {version} (Release)
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.version && (
            <p className="text-sm text-destructive">{errors.version}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="memory_mb">Memory Allocation (MB)</Label>
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
          {errors.memory_mb && (
            <p className="text-sm text-destructive">{errors.memory_mb}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Recommended: 1024-2048 MB for most servers
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Gamepad2 className="h-12 w-12 text-minecraft-green mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Game Settings</h3>
        <p className="text-muted-foreground">Configure the gameplay experience</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gamemode">Game Mode</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
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
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="level_seed">Level Seed (Optional)</Label>
          <Input
            id="level_seed"
            placeholder="Leave empty for random world"
            value={formData.level_seed}
            onChange={(e) => handleInputChange('level_seed', e.target.value)}
            className={errors.level_seed ? 'border-destructive' : ''}
          />
          {errors.level_seed && (
            <p className="text-sm text-destructive">{errors.level_seed}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter a specific seed for a custom world generation
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="motd">Message of the Day (MOTD)</Label>
          <Input
            id="motd"
            placeholder="Welcome to my server!"
            value={formData.motd}
            onChange={(e) => handleInputChange('motd', e.target.value)}
            className={errors.motd ? 'border-destructive' : ''}
          />
          {errors.motd && (
            <p className="text-sm text-destructive">{errors.motd}</p>
          )}
          <p className="text-xs text-muted-foreground">
            This message will be displayed in the server list
          </p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="h-12 w-12 text-minecraft-green mx-auto mb-4" />
        <h3 className="text-lg font-semibold">Advanced Settings</h3>
        <p className="text-muted-foreground">Fine-tune your server configuration</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hardcore"
              checked={formData.hardcore}
              onChange={(e) => handleInputChange('hardcore', e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="hardcore" className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Hardcore Mode</span>
            </Label>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            Players will be banned when they die (cannot be changed later)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="pvp"
            checked={formData.pvp}
            onChange={(e) => handleInputChange('pvp', e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="pvp">Player vs Player (PvP)</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="spawn_monsters"
            checked={formData.spawn_monsters}
            onChange={(e) => handleInputChange('spawn_monsters', e.target.checked)}
            className="rounded border-gray-300"
          />
          <Label htmlFor="spawn_monsters">Spawn Monsters</Label>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          You can change most of these settings later in the server configuration. 
          Hardcore mode cannot be changed after server creation.
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Create New Server
        </CardTitle>
        <CardDescription className="text-center">
          Set up your Minecraft server with custom settings
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-2 mt-4">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i + 1 <= currentStep
                  ? 'bg-minecraft-green text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1 < currentStep ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <Alert variant="destructive">
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Step content */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-6">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              
              {currentStep < totalSteps ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={createServerMutation.isPending}
                  className="bg-minecraft-green hover:bg-minecraft-dark-green"
                >
                  {createServerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Server...
                    </>
                  ) : (
                    <>
                      <Server className="mr-2 h-4 w-4" />
                      Create Server
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateServerForm;
