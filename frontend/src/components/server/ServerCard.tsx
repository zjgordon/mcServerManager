import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Play, 
  Square, 
  Settings, 
  Trash2, 
  Server, 
  Clock, 
  HardDrive,
  Users,
  Zap,
  AlertTriangle
} from 'lucide-react';
import type { Server as ServerType } from '../../types/api';

interface ServerCardProps {
  server: ServerType;
  onStart: (serverId: number) => void;
  onStop: (serverId: number) => void;
  onDelete: (serverId: number) => void;
  onBackup?: (serverId: number) => void;
  isLoading?: boolean;
  viewMode?: 'grid' | 'list';
  onServerSelect?: (server: ServerType) => void;
}

const ServerCard: React.FC<ServerCardProps> = ({
  server,
  onStart,
  onStop,
  onDelete,
  onBackup,
  isLoading = false,
  viewMode = 'grid',
  onServerSelect
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Stopped':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Starting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Stopping':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Running':
        return <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />;
      case 'Stopped':
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
      case 'Starting':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
      case 'Stopping':
        return <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const formatUptime = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
  };

  const isServerRunning = server.status === 'Running';
  const isServerStopped = server.status === 'Stopped';
  const isServerTransitioning = server.status === 'Starting' || server.status === 'Stopping';

  if (viewMode === 'list') {
    return (
      <Card 
        className={`hover:shadow-md transition-shadow ${onServerSelect ? 'cursor-pointer' : ''}`}
        onClick={() => onServerSelect?.(server)}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex items-center space-x-2">
                {getStatusIcon(server.status)}
                <div>
                  <h3 className="font-semibold text-lg">{server.server_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {server.version} • Port {server.port}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <HardDrive className="h-4 w-4" />
                  <span>{server.memory_mb} MB</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span className="capitalize">{server.gamemode}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{formatUptime(server.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(server.status)}>
                {server.status}
              </Badge>
              
              <div className="flex space-x-1">
                {isServerRunning ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStop(server.id);
                    }}
                    disabled={isLoading || isServerTransitioning}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStart(server.id);
                    }}
                    disabled={isLoading || isServerTransitioning}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/servers/${server.id}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
                
                {onBackup && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBackup(server.id);
                    }}
                    disabled={isLoading}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(server.id);
                  }}
                  disabled={isLoading || isServerRunning}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`hover:shadow-lg transition-shadow ${onServerSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onServerSelect?.(server)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(server.status)}
            <CardTitle className="text-lg">{server.server_name}</CardTitle>
          </div>
          <Badge className={getStatusColor(server.status)}>
            {server.status}
          </Badge>
        </div>
        <CardDescription>
          {server.version} • Port {server.port}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground flex items-center">
              <HardDrive className="h-4 w-4 mr-1" />
              Memory
            </span>
            <span className="text-sm font-medium">{server.memory_mb} MB</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground flex items-center">
              <Users className="h-4 w-4 mr-1" />
              Game Mode
            </span>
            <span className="text-sm font-medium capitalize">{server.gamemode}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Difficulty
            </span>
            <span className="text-sm font-medium capitalize">{server.difficulty}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Created
            </span>
            <span className="text-sm font-medium">{formatUptime(server.created_at)}</span>
          </div>
          
          {server.motd && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground">MOTD</span>
              <p className="text-sm font-medium mt-1 line-clamp-2">{server.motd}</p>
            </div>
          )}
          
          {server.hardcore && (
            <div className="flex items-center space-x-1 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Hardcore Mode</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2 mt-6">
          {isServerRunning ? (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onStop(server.id);
              }}
              disabled={isLoading || isServerTransitioning}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onStart(server.id);
              }}
              disabled={isLoading || isServerTransitioning}
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          )}
          
          <Button variant="outline" size="sm" asChild>
            <Link to={`/servers/${server.id}`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          
          {onBackup && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onBackup(server.id);
              }}
              disabled={isLoading}
              title="Create Backup"
            >
              <Zap className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(server.id);
            }}
            disabled={isLoading || isServerRunning}
            title="Delete Server"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerCard;
