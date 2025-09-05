import React, { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useRealtimeConnection } from '../../hooks/useRealtime';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface RealtimeStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  showDetails = false,
  className = ''
}) => {
  const { isConnected, isConnecting, reconnectAttempts, connect, disconnect } = useWebSocket();
  const connectionStatus = useRealtimeConnection();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusColor = () => {
    if (isConnecting) return 'text-orange-500';
    if (isConnected) return 'text-green-500';
    if (reconnectAttempts > 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getStatusIcon = () => {
    if (isConnecting) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (isConnected) return <Wifi className="h-4 w-4" />;
    if (reconnectAttempts > 0) return <AlertTriangle className="h-4 w-4" />;
    return <WifiOff className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    if (reconnectAttempts > 0) return `Reconnecting (${reconnectAttempts})`;
    return 'Disconnected';
  };

  const getStatusBadgeVariant = () => {
    if (isConnecting) return 'secondary';
    if (isConnected) return 'default';
    if (reconnectAttempts > 0) return 'destructive';
    return 'outline';
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString();
  };

  const handleReconnect = () => {
    if (!isConnected && !isConnecting) {
      connect();
    }
  };

  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
    }
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={isConnected ? handleDisconnect : handleReconnect}
          >
            <div className={getStatusColor()}>
              {getStatusIcon()}
            </div>
          </Button>
          
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
              {getStatusText()}
              {isConnected && connectionStatus.lastConnected && (
                <div className="text-gray-300">
                  Since {formatTime(connectionStatus.lastConnected)}
                </div>
              )}
            </div>
          )}
        </div>
        
        <Badge variant={getStatusBadgeVariant()} className="text-xs">
          {getStatusText()}
        </Badge>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Real-time Connection</h3>
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>
            {getStatusIcon()}
          </div>
          <Badge variant={getStatusBadgeVariant()}>
            {getStatusText()}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <span className={getStatusColor()}>
            {isConnected ? 'Active' : isConnecting ? 'Connecting' : 'Inactive'}
          </span>
        </div>
        
        {connectionStatus.lastConnected && (
          <div className="flex items-center justify-between">
            <span>Last Connected:</span>
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(connectionStatus.lastConnected)}</span>
            </span>
          </div>
        )}
        
        {connectionStatus.lastDisconnected && (
          <div className="flex items-center justify-between">
            <span>Last Disconnected:</span>
            <span className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(connectionStatus.lastDisconnected)}</span>
            </span>
          </div>
        )}
        
        {reconnectAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span>Reconnect Attempts:</span>
            <span className="text-orange-500">{reconnectAttempts}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        {!isConnected && !isConnecting && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReconnect}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reconnect</span>
          </Button>
        )}
        
        {isConnected && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="flex items-center space-x-1"
          >
            <WifiOff className="h-3 w-3" />
            <span>Disconnect</span>
          </Button>
        )}
      </div>

      {isConnected && (
        <div className="flex items-center space-x-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" />
          <span>Real-time updates active</span>
        </div>
      )}
    </div>
  );
};

export default RealtimeStatusIndicator;
