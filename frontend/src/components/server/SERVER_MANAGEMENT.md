# Server Management Components

This document provides comprehensive documentation for the server management components in the Minecraft Server Manager frontend.

## Overview

The server management system provides a complete interface for managing Minecraft servers, including creation, configuration, monitoring, and control operations. The system is built with React, TypeScript, and shadcn/ui components, providing a modern and responsive user experience.

## Components

### Core Components

#### ServerManagementDashboard
The main dashboard component that orchestrates all server management functionality.

**Features:**
- Server statistics overview
- Tabbed interface for different management views
- Server selection and navigation
- Real-time status updates
- Comprehensive error handling

**Props:**
```typescript
interface ServerManagementDashboardProps {
  selectedServerId?: number;
  onServerSelect?: (server: ServerType) => void;
}
```

**Usage:**
```tsx
import { ServerManagementDashboard } from '../components/server';

<ServerManagementDashboard
  selectedServerId={selectedServer?.id}
  onServerSelect={handleServerSelect}
/>
```

#### ServerList
Advanced server list component with filtering, sorting, and search capabilities.

**Features:**
- Real-time server filtering by status
- Multiple sorting options (name, status, version, date, memory)
- Search functionality across multiple fields
- Grid and list view modes
- Server selection support
- Empty state handling

**Props:**
```typescript
interface ServerListProps {
  servers: ServerType[];
  onStart: (serverId: number) => void;
  onStop: (serverId: number) => void;
  onDelete: (serverId: number) => void;
  onBackup?: (serverId: number) => void;
  isLoading?: boolean;
  onCreateServer?: () => void;
  onServerSelect?: (server: ServerType) => void;
}
```

#### ServerCard
Individual server card component displaying server information and actions.

**Features:**
- Server status indicators with animations
- Resource usage display
- Action buttons (start, stop, delete, backup)
- Click-to-select functionality
- Responsive design for grid and list views
- Hardcore mode warnings

**Props:**
```typescript
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
```

#### ServerStatusMonitor
Real-time server status monitoring component.

**Features:**
- Real-time process monitoring
- Resource usage tracking (CPU, memory)
- Uptime display
- Manual refresh capability
- Auto-refresh with configurable intervals
- Error state handling

**Props:**
```typescript
interface ServerStatusMonitorProps {
  server: ServerType;
  onStatusChange?: (status: any) => void;
  refreshInterval?: number;
}
```

### Control Components

#### ServerActionPanel
Comprehensive server control panel for lifecycle management.

**Features:**
- Start/stop/restart operations
- EULA acceptance workflow
- Server information display
- Confirmation dialogs for destructive actions
- Loading states and error handling

#### ServerBackupPanel
Backup management panel with progress tracking.

**Features:**
- Server backup creation
- Backup file management
- Progress tracking
- Download functionality
- Automatic server stopping during backup

#### ServerConfigPanel
Server configuration management with inline editing.

**Features:**
- Inline configuration editing
- Real-time validation
- Configuration file management
- Settings persistence

#### ServerLogsPanel
Real-time log viewing with filtering and search.

**Features:**
- Real-time log streaming
- Log level filtering
- Search functionality
- Download and clear operations
- Auto-refresh capability

## Hooks

### useServer
Custom React Query hooks for server-related API interactions.

**Available Hooks:**
- `useServers()` - Fetch all servers
- `useServer(id)` - Fetch specific server
- `useCreateServer()` - Create new server
- `useUpdateServer()` - Update server
- `useDeleteServer()` - Delete server
- `useStartServer()` - Start server
- `useStopServer()` - Stop server
- `useBackupServer()` - Create backup
- `useAcceptEula()` - Accept EULA
- `useServerStatus(id)` - Get real-time status
- `useAvailableVersions()` - Get available versions

**Usage:**
```tsx
import { useServers, useStartServer } from '../hooks/useServer';

const { data: servers, isLoading, error } = useServers();
const startServerMutation = useStartServer();

const handleStart = (serverId: number) => {
  startServerMutation.mutate(serverId);
};
```

## API Integration

### Backend Endpoints
The server management components integrate with the following backend API endpoints:

- `GET /api/v1/servers` - List servers
- `POST /api/v1/servers` - Create server
- `GET /api/v1/servers/{id}` - Get server details
- `PUT /api/v1/servers/{id}` - Update server
- `DELETE /api/v1/servers/{id}` - Delete server
- `POST /api/v1/servers/{id}/start` - Start server
- `POST /api/v1/servers/{id}/stop` - Stop server
- `GET /api/v1/servers/{id}/status` - Get server status
- `POST /api/v1/servers/{id}/backup` - Create backup
- `POST /api/v1/servers/{id}/accept-eula` - Accept EULA
- `GET /api/v1/servers/versions` - Get available versions

### Error Handling
All components include comprehensive error handling:

- Network error recovery
- User-friendly error messages
- Retry mechanisms
- Loading states
- Toast notifications

## Real-time Features

### Status Monitoring
- Auto-refresh every 5 seconds
- Manual refresh capability
- Real-time process status
- Resource usage tracking

### Live Updates
- Server status changes
- Process monitoring
- Resource usage updates
- Log streaming

## Responsive Design

### Mobile Support
- Touch-friendly interfaces
- Responsive grid layouts
- Mobile navigation
- Optimized button sizes

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## Accessibility

### WCAG Compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast support
- Focus management
- ARIA labels and descriptions

### Features
- Tab navigation
- Focus indicators
- Semantic HTML
- Alt text for images
- Descriptive button labels

## Testing

### Test Coverage
Comprehensive test suites are provided for all components:

- Unit tests for individual components
- Integration tests for component interactions
- Mock API responses
- Error state testing
- User interaction testing

### Test Files
- `ServerStatusMonitor.test.tsx`
- `ServerManagementDashboard.test.tsx`
- `ServerCard.test.tsx`
- `ServerActionPanel.test.tsx`

## Performance

### Optimization Features
- React Query caching
- Component memoization
- Lazy loading
- Efficient re-renders
- Debounced search

### Best Practices
- Minimal API calls
- Optimistic updates
- Background refetching
- Error boundaries
- Loading states

## Usage Examples

### Basic Server Management
```tsx
import { ServerManagementDashboard } from '../components/server';

function ServersPage() {
  const [selectedServer, setSelectedServer] = useState();

  return (
    <ServerManagementDashboard
      selectedServerId={selectedServer?.id}
      onServerSelect={setSelectedServer}
    />
  );
}
```

### Custom Server List
```tsx
import { ServerList } from '../components/server';

function CustomServerView() {
  const { data: servers } = useServers();
  const startServer = useStartServer();

  return (
    <ServerList
      servers={servers || []}
      onStart={(id) => startServer.mutate(id)}
      onStop={handleStop}
      onDelete={handleDelete}
      onServerSelect={handleSelect}
    />
  );
}
```

### Real-time Monitoring
```tsx
import { ServerStatusMonitor } from '../components/server';

function ServerMonitoring({ server }) {
  return (
    <ServerStatusMonitor
      server={server}
      refreshInterval={3000}
      onStatusChange={handleStatusChange}
    />
  );
}
```

## Configuration

### Environment Variables
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_REFRESH_INTERVAL` - Default refresh interval
- `VITE_MAX_SERVERS` - Maximum servers per user

### Customization
Components support extensive customization through props and CSS variables:

- Theme colors
- Refresh intervals
- Display options
- Action configurations
- Layout preferences

## Troubleshooting

### Common Issues

#### Server Not Starting
- Check EULA acceptance
- Verify server files exist
- Check port availability
- Review server logs

#### Status Not Updating
- Verify API connectivity
- Check refresh interval settings
- Review network errors
- Clear browser cache

#### Performance Issues
- Reduce refresh frequency
- Limit concurrent operations
- Check server resources
- Review browser performance

### Debug Mode
Enable debug mode by setting `VITE_DEBUG=true` to see detailed logging and error information.

## Future Enhancements

### Planned Features
- WebSocket integration for real-time updates
- Advanced server templates
- Plugin management
- Performance analytics
- Multi-server operations
- Server clustering support

### Roadmap
- Phase 1: Core functionality (✅ Complete)
- Phase 2: Real-time features (🔄 In Progress)
- Phase 3: Advanced management (📋 Planned)
- Phase 4: Analytics and monitoring (📋 Planned)

## Contributing

### Development Setup
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Run tests: `npm test`
4. Build for production: `npm run build`

### Code Style
- Use TypeScript for type safety
- Follow React best practices
- Use shadcn/ui components
- Implement proper error handling
- Write comprehensive tests

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Address review feedback

## License

This project is licensed under the MIT License - see the LICENSE file for details.
