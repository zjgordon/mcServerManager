# Server Control Components

This directory contains all server control-related React components for managing individual Minecraft servers.

## Components

### ServerActionPanel
A comprehensive server control panel for start/stop/restart operations with EULA handling.

**Features:**
- Server status display with color-coded indicators
- Start/stop server controls with loading states
- Restart functionality with confirmation dialog
- EULA acceptance dialog for new servers
- Real-time status updates
- Server information display
- Process ID (PID) tracking

**Props:**
- `server: Server` - Server data object
- `onStatusChange?: () => void` - Status change callback

**Usage:**
```tsx
import { ServerActionPanel } from '../components/server/controls';

<ServerActionPanel 
  server={server}
  onStatusChange={handleStatusChange}
/>
```

### ServerBackupPanel
A comprehensive backup management panel for server file backups.

**Features:**
- Create server backups with confirmation dialog
- Backup status tracking and progress indication
- Backup information display (filename, size, date)
- Automatic server stopping during backup
- Backup tips and guidance
- Download functionality for backup files

**Props:**
- `server: Server` - Server data object
- `onBackupComplete?: (backupFile: string) => void` - Backup completion callback

**Usage:**
```tsx
import { ServerBackupPanel } from '../components/server/controls';

<ServerBackupPanel 
  server={server}
  onBackupComplete={handleBackupComplete}
/>
```

### ServerConfigPanel
A comprehensive server configuration management panel.

**Features:**
- Edit server settings (name, memory, game mode, difficulty, MOTD)
- Real-time form validation
- Inline editing with save/cancel functionality
- Read-only system information display
- Configuration change warnings
- Integration with server update API

**Props:**
- `server: Server` - Server data object
- `onConfigUpdate?: (updatedServer: Server) => void` - Config update callback

**Usage:**
```tsx
import { ServerConfigPanel } from '../components/server/controls';

<ServerConfigPanel 
  server={server}
  onConfigUpdate={handleConfigUpdate}
/>
```

### ServerLogsPanel
A comprehensive server log viewing and management panel.

**Features:**
- Real-time log display with auto-refresh
- Log filtering by level (ERROR, WARN, INFO, DEBUG)
- Search functionality across log messages
- Log level color coding
- Timestamp and log level toggles
- Download logs functionality
- Clear logs functionality
- Auto-scroll to latest logs

**Props:**
- `server: Server` - Server data object
- `onLogsUpdate?: (logs: string[]) => void` - Logs update callback

**Usage:**
```tsx
import { ServerLogsPanel } from '../components/server/controls';

<ServerLogsPanel 
  server={server}
  onLogsUpdate={handleLogsUpdate}
/>
```

## Server Details Page

### ServerDetailsPage
A comprehensive page that brings together all server control components.

**Features:**
- Server information header with status
- Grid layout for control panels
- Real-time server data fetching
- Error handling and loading states
- Navigation integration
- Responsive design

**Routes:**
- `/servers/:id` - Server details page

**Usage:**
```tsx
// Accessed via routing
<Route path="/servers/:id" element={<ServerDetailsPage />} />
```

## Component Integration

### Layout Structure
```
ServerDetailsPage
├── Server Information Header
├── Status Alerts
├── Control Panels Grid
│   ├── ServerActionPanel (Left Column)
│   ├── ServerBackupPanel (Left Column)
│   └── ServerConfigPanel (Right Column)
├── ServerLogsPanel (Full Width)
└── Server Information Footer
```

### Data Flow
1. **ServerDetailsPage** fetches server data using `useQuery`
2. **Control Panels** receive server data as props
3. **User Actions** trigger mutations via React Query hooks
4. **Status Updates** refresh server data automatically
5. **UI Updates** reflect changes in real-time

## API Integration

### Server Actions
- **Start Server**: `POST /servers/:id/start`
- **Stop Server**: `POST /servers/:id/stop`
- **Accept EULA**: `POST /servers/:id/accept-eula`
- **Create Backup**: `POST /servers/:id/backup`
- **Update Server**: `PUT /servers/:id`
- **Get Server**: `GET /servers/:id`
- **Get Server Status**: `GET /servers/:id/status`

### React Query Hooks
- `useStartServer()` - Start server mutation
- `useStopServer()` - Stop server mutation
- `useAcceptEula()` - Accept EULA mutation
- `useBackupServer()` - Create backup mutation
- `useUpdateServer()` - Update server mutation
- `useServer(id)` - Get server data query

## User Experience Features

### Status Indicators
- **Running**: Green with checkmark icon
- **Stopped**: Gray with square icon
- **Starting**: Yellow with spinning loader
- **Stopping**: Orange with spinning loader

### Loading States
- Button loading spinners during operations
- Form loading states during updates
- Log loading indicators
- Backup progress tracking

### Error Handling
- Network error display
- Validation error messages
- Operation failure notifications
- Retry functionality

### Confirmation Dialogs
- Restart server confirmation
- EULA acceptance dialog
- Backup creation confirmation
- Delete server confirmation

## Styling

### Design System
- shadcn/ui components for consistency
- Minecraft-inspired color scheme
- Responsive grid layouts
- Card-based panel design

### Visual Elements
- Status color coding
- Icon integration for actions
- Progress indicators
- Loading animations

## Testing

### Test Coverage
- Component rendering and interaction
- User action handling
- Dialog functionality
- Status display logic
- Error handling

### Test Files
- `ServerActionPanel.test.tsx` - Comprehensive test suite
- Mock API responses
- User interaction simulation
- Component state testing

## Dependencies

- React 18+
- TypeScript
- React Query
- React Router
- shadcn/ui components
- Lucide React icons
- Tailwind CSS

## Performance Considerations

- Real-time updates with configurable intervals
- Optimistic updates for better UX
- Query caching for reduced API calls
- Component memoization
- Efficient re-rendering

## Accessibility

- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Error announcement

## Future Enhancements

- Real-time log streaming via WebSocket
- Advanced backup management
- Server performance monitoring
- Plugin management interface
- World management tools
- Player management features
