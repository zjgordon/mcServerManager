# Real-time Updates System

## Overview

This document outlines the comprehensive real-time updates system implemented for the Minecraft Server Manager, providing live monitoring, instant notifications, and seamless user experience through WebSocket integration.

## Architecture

### WebSocket Service

The core of the real-time system is the `WebSocketService` class that manages WebSocket connections, message handling, and automatic reconnection.

**Key Features:**
- Automatic connection management
- Message queuing when disconnected
- Heartbeat mechanism for connection health
- Exponential backoff reconnection strategy
- Event-driven architecture

**Configuration:**
```typescript
interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}
```

### WebSocket Context

The `WebSocketContext` provides React context for managing WebSocket connections and real-time data throughout the application.

**Features:**
- Automatic connection on authentication
- Real-time data state management
- Event handler registration
- Connection status tracking
- Channel subscription management

## Components

### RealtimeStatusIndicator

A visual indicator component that shows the current WebSocket connection status.

**Features:**
- Connection status display (Connected, Connecting, Disconnected, Reconnecting)
- Visual indicators with appropriate colors and icons
- Tooltip with detailed connection information
- Manual connect/disconnect controls
- Compact and detailed view modes

**Props:**
```typescript
interface RealtimeStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}
```

### RealtimeAlertsPanel

A comprehensive alerts panel that displays real-time system alerts and notifications.

**Features:**
- Real-time alert display with categorization
- Alert dismissal and clearing
- Expandable/collapsible view
- Alert history tracking
- Toast notification integration
- Context-aware alert icons

**Props:**
```typescript
interface RealtimeAlertsPanelProps {
  maxAlerts?: number;
  showClearAll?: boolean;
  className?: string;
}
```

### RealtimeServerStatusMonitor

An enhanced server status monitor that integrates real-time updates with traditional API polling.

**Features:**
- Real-time server status updates
- Fallback to API polling when WebSocket unavailable
- Live resource monitoring (CPU, memory, uptime)
- Connection status indicator
- Manual refresh capability
- Performance trend visualization

### RealtimeSystemMonitoringPanel

A comprehensive system monitoring panel with real-time updates for admin users.

**Features:**
- Real-time system health monitoring
- Performance trend analysis
- Automated alert generation
- Memory utilization tracking
- Server status monitoring
- Historical data visualization

## Hooks

### useRealtimeServerStatus

Hook for real-time server status updates.

```typescript
const serverStatus = useRealtimeServerStatus(serverId);
```

**Returns:**
- Current server status with real-time updates
- Automatic query invalidation on status changes
- Fallback to API data when WebSocket unavailable

### useRealtimeSystemStats

Hook for real-time system statistics.

```typescript
const systemStats = useRealtimeSystemStats();
```

**Returns:**
- Real-time system statistics
- Automatic query invalidation
- System health status

### useRealtimeUserUpdates

Hook for real-time user management updates.

```typescript
const { updates, clearUpdates } = useRealtimeUserUpdates();
```

**Returns:**
- Array of user update events
- Function to clear update history
- Automatic query invalidation

### useRealtimeSystemAlerts

Hook for real-time system alerts.

```typescript
const { alerts, clearAlerts } = useRealtimeSystemAlerts();
```

**Returns:**
- Array of system alerts
- Function to clear alerts
- Automatic toast notifications

### useRealtimeConnection

Hook for WebSocket connection status.

```typescript
const connectionStatus = useRealtimeConnection();
```

**Returns:**
- Connection status information
- Last connected/disconnected timestamps
- Reconnection attempt count

### useRealtimeSubscriptions

Hook for managing WebSocket channel subscriptions.

```typescript
const { 
  subscribeToChannel, 
  unsubscribeFromChannel, 
  clearAllSubscriptions,
  activeSubscriptions 
} = useRealtimeSubscriptions();
```

**Returns:**
- Subscription management functions
- List of active subscriptions
- Automatic re-subscription on reconnection

## Message Types

### ServerStatusUpdate

Real-time server status information.

```typescript
interface ServerStatusUpdate {
  serverId: number;
  status: 'Running' | 'Stopped' | 'Starting' | 'Stopping';
  pid?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  uptime?: number;
}
```

### SystemStatsUpdate

Real-time system statistics.

```typescript
interface SystemStatsUpdate {
  totalUsers: number;
  totalServers: number;
  runningServers: number;
  totalMemoryAllocated: number;
  memoryUtilization: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}
```

### UserUpdate

Real-time user management events.

```typescript
interface UserUpdate {
  userId: number;
  action: 'created' | 'updated' | 'deleted';
  user?: any;
}
```

### SystemAlert

Real-time system alerts and notifications.

```typescript
interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  serverId?: number;
}
```

## Integration

### App.tsx Integration

The WebSocket provider is integrated at the application level:

```typescript
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WebSocketProvider>
          <Router>
            {/* Application routes */}
          </Router>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Component Integration

Components can integrate real-time updates by using the provided hooks:

```typescript
const MyComponent = () => {
  const serverStatus = useRealtimeServerStatus(serverId);
  const systemAlerts = useRealtimeSystemAlerts();
  const connectionStatus = useRealtimeConnection();

  return (
    <div>
      <RealtimeStatusIndicator />
      <RealtimeAlertsPanel />
      {/* Component content */}
    </div>
  );
};
```

## Features

### Real-time Monitoring

**Server Status:**
- Live server process monitoring
- Real-time resource usage (CPU, memory)
- Instant status change notifications
- Uptime tracking

**System Health:**
- Memory utilization monitoring
- System performance tracking
- Health status indicators
- Performance trend analysis

### Alert System

**Alert Types:**
- **Info**: General information alerts
- **Warning**: Non-critical issues
- **Error**: Critical system errors
- **Success**: Successful operations

**Alert Features:**
- Real-time alert generation
- Toast notifications
- Alert history tracking
- Dismissible alerts
- Context-aware categorization

### Connection Management

**Automatic Connection:**
- Connects on user authentication
- Disconnects on logout
- Role-based channel subscriptions

**Reconnection Strategy:**
- Exponential backoff
- Maximum retry attempts
- Connection health monitoring
- Message queuing during disconnection

**Channel Subscriptions:**
- `server_status`: Server status updates
- `system_stats`: System statistics
- `user_updates`: User management events
- `system_alerts`: System alerts
- `admin`: Admin-specific updates

## Performance

### Optimization Strategies

**Efficient Updates:**
- Selective data updates
- Query invalidation optimization
- Minimal re-renders
- Event-driven updates

**Connection Management:**
- Automatic connection pooling
- Heartbeat mechanism
- Connection health monitoring
- Graceful degradation

**Memory Management:**
- Limited alert history
- Automatic cleanup
- Event handler cleanup
- Subscription management

### Fallback Mechanisms

**API Polling:**
- Automatic fallback when WebSocket unavailable
- Configurable polling intervals
- Seamless transition between modes
- User experience preservation

**Error Handling:**
- Connection error recovery
- Message parsing error handling
- Graceful degradation
- User feedback

## Testing

### Test Coverage

**Unit Tests:**
- WebSocket service functionality
- Hook behavior testing
- Component rendering
- Event handling

**Integration Tests:**
- Context provider integration
- Hook integration
- Component integration
- Real-time data flow

**Mock Testing:**
- WebSocket connection mocking
- Event simulation
- Error scenario testing
- Performance testing

### Test Files

```
src/services/__tests__/websocket.test.ts
src/hooks/__tests__/useRealtime.test.tsx
src/components/realtime/__tests__/RealtimeStatusIndicator.test.tsx
src/components/realtime/__tests__/RealtimeAlertsPanel.test.tsx
```

## Usage Examples

### Basic Real-time Monitoring

```typescript
import { useRealtimeServerStatus } from '../hooks/useRealtime';

const ServerMonitor = ({ serverId }) => {
  const status = useRealtimeServerStatus(serverId);
  
  return (
    <div>
      <h3>Server Status</h3>
      <p>Status: {status?.is_running ? 'Running' : 'Stopped'}</p>
      <p>Memory: {status?.memory_usage} MB</p>
      <p>CPU: {status?.cpu_usage}%</p>
    </div>
  );
};
```

### Real-time Alerts

```typescript
import { useRealtimeSystemAlerts } from '../hooks/useRealtime';

const AlertManager = () => {
  const { alerts, clearAlerts } = useRealtimeSystemAlerts();
  
  return (
    <div>
      <h3>System Alerts ({alerts.length})</h3>
      {alerts.map(alert => (
        <div key={alert.id} className={`alert-${alert.type}`}>
          <h4>{alert.title}</h4>
          <p>{alert.message}</p>
        </div>
      ))}
      <button onClick={clearAlerts}>Clear All</button>
    </div>
  );
};
```

### Connection Status

```typescript
import { useRealtimeConnection } from '../hooks/useRealtime';
import { RealtimeStatusIndicator } from '../components/realtime';

const Dashboard = () => {
  const connectionStatus = useRealtimeConnection();
  
  return (
    <div>
      <RealtimeStatusIndicator showDetails={true} />
      <p>Connection: {connectionStatus.isConnected ? 'Active' : 'Inactive'}</p>
    </div>
  );
};
```

## Configuration

### WebSocket Configuration

```typescript
const wsConfig = {
  url: 'ws://localhost:5000/ws',
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
};

<WebSocketProvider config={wsConfig}>
  {/* Application */}
</WebSocketProvider>
```

### Environment Variables

```bash
# WebSocket URL
REACT_APP_WS_URL=ws://localhost:5000/ws

# Reconnection settings
REACT_APP_WS_RECONNECT_INTERVAL=5000
REACT_APP_WS_MAX_RECONNECT_ATTEMPTS=10
REACT_APP_WS_HEARTBEAT_INTERVAL=30000
```

## Troubleshooting

### Common Issues

**Connection Failures:**
- Check WebSocket URL configuration
- Verify backend WebSocket support
- Check network connectivity
- Review browser WebSocket support

**Performance Issues:**
- Monitor connection count
- Check message frequency
- Review memory usage
- Optimize event handlers

**Alert Fatigue:**
- Adjust alert thresholds
- Configure alert filtering
- Implement alert grouping
- Set up alert escalation

### Debug Information

**Connection Status:**
- WebSocket connection state
- Reconnection attempts
- Last connected/disconnected times
- Active subscriptions

**Performance Metrics:**
- Message frequency
- Connection latency
- Memory usage
- Error rates

## Future Enhancements

### Planned Features

**Advanced Monitoring:**
- Custom alert rules
- Performance dashboards
- Historical data analysis
- Predictive alerts

**Enhanced Integration:**
- External monitoring tools
- Webhook notifications
- Email alerts
- Mobile notifications

**Scalability:**
- Connection pooling
- Load balancing
- Clustering support
- Performance optimization

## Conclusion

The real-time updates system provides a comprehensive solution for live monitoring and instant notifications in the Minecraft Server Manager. With WebSocket integration, automatic fallback mechanisms, and extensive testing, it ensures a reliable and responsive user experience while maintaining system performance and scalability.

The modular architecture allows for easy extension and customization, while the comprehensive documentation and testing ensure maintainability and reliability. The system is designed to gracefully handle connection issues and provide seamless user experience across different network conditions.
