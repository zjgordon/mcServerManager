import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  X, 
  Trash2,
  Bell,
  BellOff,
  Clock,
  Server,
  Users,
  Activity
} from 'lucide-react';
import { useRealtimeSystemAlerts } from '../../hooks/useRealtime';
import type { SystemAlert } from '../../services/websocket';

interface RealtimeAlertsPanelProps {
  maxAlerts?: number;
  showClearAll?: boolean;
  className?: string;
}

const RealtimeAlertsPanel: React.FC<RealtimeAlertsPanelProps> = ({
  maxAlerts = 10,
  showClearAll = true,
  className = ''
}) => {
  const { alerts, clearAlerts } = useRealtimeSystemAlerts();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'secondary' as const;
      case 'success':
        return 'default' as const;
      case 'info':
      default:
        return 'outline' as const;
    }
  };

  const getAlertBorderColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'info':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getAlertContextIcon = (alert: SystemAlert) => {
    if (alert.serverId) return <Server className="h-3 w-3" />;
    if (alert.title.toLowerCase().includes('user')) return <Users className="h-3 w-3" />;
    if (alert.title.toLowerCase().includes('system')) return <Activity className="h-3 w-3" />;
    return <Info className="h-3 w-3" />;
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const clearAllAlerts = () => {
    clearAlerts();
    setDismissedAlerts(new Set());
  };

  const visibleAlerts = alerts
    .filter(alert => !dismissedAlerts.has(alert.id))
    .slice(0, maxAlerts)
    .sort((a, b) => b.timestamp - a.timestamp);

  const unreadCount = visibleAlerts.length;
  const hasAlerts = unreadCount > 0;

  if (!hasAlerts && !isExpanded) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <BellOff className="h-4 w-4 text-muted-foreground" />
            <span>System Alerts</span>
          </CardTitle>
          <CardDescription>
            No active alerts
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Bell className="h-4 w-4" />
            <span>System Alerts</span>
            {hasAlerts && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            {showClearAll && hasAlerts && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllAlerts}
                className="h-6 px-2 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 px-2 text-xs"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>
        
        {!isExpanded && hasAlerts && (
          <CardDescription>
            {unreadCount} active alert{unreadCount !== 1 ? 's' : ''}
          </CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {hasAlerts ? (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {visibleAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getAlertBorderColor(alert.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <Badge variant={getAlertBadgeVariant(alert.type)} className="text-xs">
                              {alert.type}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(alert.timestamp)}</span>
                            </div>
                            
                            {alert.serverId && (
                              <div className="flex items-center space-x-1">
                                {getAlertContextIcon(alert)}
                                <span>Server {alert.serverId}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissAlert(alert.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active alerts</p>
              <p className="text-xs">System alerts will appear here in real-time</p>
            </div>
          )}
        </CardContent>
      )}

      {!isExpanded && hasAlerts && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {visibleAlerts.slice(0, 2).map((alert) => (
              <div
                key={alert.id}
                className={`p-2 rounded border ${getAlertBorderColor(alert.type)}`}
              >
                <div className="flex items-center space-x-2">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {alert.message}
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTime(alert.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => dismissAlert(alert.id)}
                      className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {unreadCount > 2 && (
              <div className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                  className="text-xs text-muted-foreground"
                >
                  View {unreadCount - 2} more alert{unreadCount - 2 !== 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default RealtimeAlertsPanel;
