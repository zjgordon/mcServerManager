# Server Components

This directory contains all server management-related React components for the Minecraft Server Manager frontend.

## Components

### ServerCard
A comprehensive server card component that displays server information and provides action controls.

**Features:**
- Server status indicators with color coding
- Real-time status updates with animated indicators
- Server configuration display (memory, gamemode, difficulty, etc.)
- Action buttons for start/stop/delete/backup operations
- Support for both grid and list view modes
- Hardcore mode indicator
- MOTD display with truncation
- Responsive design

**Props:**
- `server: Server` - Server data object
- `onStart: (serverId: number) => void` - Start server callback
- `onStop: (serverId: number) => void` - Stop server callback
- `onDelete: (serverId: number) => void` - Delete server callback
- `onBackup?: (serverId: number) => void` - Backup server callback (optional)
- `isLoading?: boolean` - Loading state
- `viewMode?: 'grid' | 'list'` - Display mode

**Usage:**
```tsx
import { ServerCard } from '../components/server';

<ServerCard 
  server={server}
  onStart={handleStart}
  onStop={handleStop}
  onDelete={handleDelete}
  onBackup={handleBackup}
  viewMode="grid"
/>
```

### ServerList
A comprehensive server list component with filtering, sorting, and view mode controls.

**Features:**
- Search functionality (name, version, gamemode, MOTD)
- Status filtering with counts
- Multiple sorting options (name, status, version, date, memory)
- Grid and list view modes
- Status badges with click-to-filter
- Empty state handling
- Create server integration
- Responsive design

**Props:**
- `servers: Server[]` - Array of server objects
- `onStart: (serverId: number) => void` - Start server callback
- `onStop: (serverId: number) => void` - Stop server callback
- `onDelete: (serverId: number) => void` - Delete server callback
- `onBackup?: (serverId: number) => void` - Backup server callback (optional)
- `isLoading?: boolean` - Loading state
- `onCreateServer?: () => void` - Create server callback (optional)

**Usage:**
```tsx
import { ServerList } from '../components/server';

<ServerList
  servers={servers}
  onStart={handleStart}
  onStop={handleStop}
  onDelete={handleDelete}
  onBackup={handleBackup}
  onCreateServer={handleCreateServer}
/>
```

### ServerStatus
A real-time server status monitoring component with detailed process information.

**Features:**
- Real-time status updates with configurable refresh interval
- Process information display (CPU, memory, uptime, PID)
- Server configuration overview
- Compact and detailed view modes
- Automatic refresh for running servers
- Manual refresh capability
- Last updated timestamp

**Props:**
- `server: Server` - Server data object
- `refreshInterval?: number` - Refresh interval in milliseconds (default: 5000)
- `showDetails?: boolean` - Show detailed information (default: true)
- `compact?: boolean` - Compact display mode (default: false)

**Usage:**
```tsx
import { ServerStatus } from '../components/server';

<ServerStatus 
  server={server}
  refreshInterval={10000}
  showDetails={true}
/>
```

### ServerControls
A flexible server control component for start/stop/delete operations.

**Features:**
- Start/stop server controls
- Restart functionality
- Backup and settings integration
- Delete confirmation dialog
- Multiple display variants (default, compact, minimal)
- Loading states and disabled states
- Confirmation dialogs for destructive actions

**Props:**
- `server: Server` - Server data object
- `onStart: (serverId: number) => void` - Start server callback
- `onStop: (serverId: number) => void` - Stop server callback
- `onRestart?: (serverId: number) => void` - Restart server callback (optional)
- `onBackup?: (serverId: number) => void` - Backup server callback (optional)
- `onDelete: (serverId: number) => void` - Delete server callback
- `onSettings?: (serverId: number) => void` - Settings callback (optional)
- `isLoading?: boolean` - Loading state
- `variant?: 'default' | 'compact' | 'minimal'` - Display variant
- `showLabels?: boolean` - Show button labels (default: true)

**Usage:**
```tsx
import { ServerControls } from '../components/server';

<ServerControls
  server={server}
  onStart={handleStart}
  onStop={handleStop}
  onDelete={handleDelete}
  variant="compact"
/>
```

## Status Indicators

### Server Status Colors
- **Running**: Green (bg-green-100 text-green-800)
- **Stopped**: Gray (bg-gray-100 text-gray-800)
- **Starting**: Yellow (bg-yellow-100 text-yellow-800)
- **Stopping**: Orange (bg-orange-100 text-orange-800)

### Status Icons
- **Running**: Green pulsing dot
- **Stopped**: Gray static dot
- **Starting**: Yellow pulsing dot
- **Stopping**: Orange pulsing dot

## Data Flow

1. **ServerList** fetches servers using `useServers` hook
2. **ServerCard** displays individual server information
3. **ServerControls** handles user actions (start/stop/delete)
4. **ServerStatus** provides real-time monitoring
5. Actions trigger mutations via React Query hooks
6. UI updates automatically through query invalidation

## Integration

These components integrate with:
- **React Query**: For data fetching and caching
- **React Router**: For navigation
- **shadcn/ui**: For consistent UI components
- **Toast notifications**: For user feedback
- **API service**: For backend communication

## Styling

All components use:
- **Tailwind CSS**: For styling
- **shadcn/ui**: For base components
- **Minecraft theme**: Custom color palette
- **Responsive design**: Mobile-first approach
- **Dark/light mode**: CSS variable support

## Testing

Components include comprehensive test coverage:
- Unit tests for component rendering
- Integration tests for user interactions
- Mock API responses
- Accessibility testing
- Error handling tests

Run tests with:
```bash
npm test
```

## Dependencies

- React 18+
- TypeScript
- React Query
- React Router
- shadcn/ui components
- Lucide React icons
- Tailwind CSS

## Performance Considerations

- **Real-time updates**: Configurable refresh intervals
- **Optimistic updates**: Immediate UI feedback
- **Query caching**: Reduced API calls
- **Component memoization**: Prevent unnecessary re-renders
- **Lazy loading**: Load components on demand
