# Admin Components

This directory contains all admin-related React components for the Minecraft Server Manager frontend.

## Components

### AdminDashboard
A comprehensive dashboard providing an overview of system statistics, user distribution, and server status.

**Features:**
- System statistics overview (users, servers, memory usage)
- User distribution visualization (admins vs regular users)
- Server status overview (running vs stopped)
- Memory usage analysis with progress bars
- System health indicators
- High memory usage alerts

**Props:**
- None (uses hooks for data fetching)

**Usage:**
```tsx
import { AdminDashboard } from '../components/admin';

<AdminDashboard />
```

### UserManagementPanel
A comprehensive user management panel for creating, editing, and deleting user accounts.

**Features:**
- User list with search functionality
- Create new users with admin privileges
- Edit existing user information and permissions
- Delete users with confirmation dialog
- Real-time validation for username and password
- Admin privilege management
- User statistics display (server count, memory allocation)

**Props:**
- `onUserUpdate?: () => void` - User update callback

**Usage:**
```tsx
import { UserManagementPanel } from '../components/admin';

<UserManagementPanel onUserUpdate={handleUserUpdate} />
```

### SystemConfigPanel
A system configuration management panel for global settings and resource limits.

**Features:**
- Memory configuration management
- Inline editing with validation
- System limits configuration
- Configuration change warnings
- Real-time validation for memory limits
- Save/cancel functionality

**Props:**
- `onConfigUpdate?: (config: SystemConfig) => void` - Config update callback

**Usage:**
```tsx
import { SystemConfigPanel } from '../components/admin';

<SystemConfigPanel onConfigUpdate={handleConfigUpdate} />
```

### ProcessManagementPanel
A process monitoring panel for system processes and server status.

**Features:**
- System overview with key metrics
- Memory usage summary with progress bars
- Server process monitoring
- Real-time status updates
- Process information display (PID, memory, status)
- System health monitoring
- High memory usage warnings

**Props:**
- `onRefresh?: () => void` - Refresh callback

**Usage:**
```tsx
import { ProcessManagementPanel } from '../components/admin';

<ProcessManagementPanel onRefresh={handleRefresh} />
```

## Admin Page Integration

### AdminPage
The main admin page that integrates all admin components with tabbed navigation.

**Features:**
- Tabbed navigation between admin sections
- Admin access control
- Responsive design with gradient background
- Integrated component management

**Tabs:**
- **Dashboard**: System overview and statistics
- **Users**: User management and permissions
- **Configuration**: System settings and limits
- **Processes**: Process monitoring and system health

**Routes:**
- `/admin` - Admin panel (requires admin privileges)

## Component Integration

### Layout Structure
```
AdminPage
├── Header with Crown Icon
├── Tab Navigation
└── Tab Content
    ├── AdminDashboard (Dashboard tab)
    ├── UserManagementPanel (Users tab)
    ├── SystemConfigPanel (Configuration tab)
    └── ProcessManagementPanel (Processes tab)
```

### Data Flow
1. **AdminPage** manages tab state and renders appropriate components
2. **Components** use React Query hooks for data fetching
3. **User Actions** trigger mutations via React Query hooks
4. **Status Updates** refresh data automatically
5. **UI Updates** reflect changes in real-time

## API Integration

### Admin Endpoints
- **Get Users**: `GET /admin/users`
- **Create User**: `POST /admin/users`
- **Update User**: `PUT /admin/users/:id`
- **Delete User**: `DELETE /admin/users/:id`
- **Get System Config**: `GET /admin/config`
- **Update System Config**: `PUT /admin/config`
- **Get System Stats**: `GET /admin/stats`

### React Query Hooks
- `useUsers()` - Get all users
- `useUser(id)` - Get specific user
- `useCreateUser()` - Create user mutation
- `useUpdateUser()` - Update user mutation
- `useDeleteUser()` - Delete user mutation
- `useSystemConfig()` - Get system configuration
- `useUpdateSystemConfig()` - Update system configuration
- `useSystemStats()` - Get system statistics

## User Experience Features

### Access Control
- Admin-only access with permission checking
- Access denied page for non-admin users
- Role-based UI elements

### Status Indicators
- **System Health**: Good/Warning based on memory usage
- **User Status**: Admin badges and user counts
- **Server Status**: Running/Stopped with counts
- **Memory Usage**: Progress bars with utilization percentages

### Loading States
- Skeleton loading for dashboard cards
- Loading spinners for data fetching
- Form submission loading states
- Refresh button loading states

### Error Handling
- Network error display
- Validation error messages
- Operation failure notifications
- Retry functionality

### Confirmation Dialogs
- Delete user confirmation
- Configuration change warnings
- System alert notifications

## Styling

### Design System
- shadcn/ui components for consistency
- Minecraft-inspired color scheme
- Gradient backgrounds
- Card-based panel design

### Visual Elements
- Crown icons for admin elements
- Color-coded status indicators
- Progress bars for memory usage
- Tab navigation with active states

## Testing

### Test Coverage
- Component rendering and interaction
- User action handling
- Dialog functionality
- Form validation
- Search functionality

### Test Files
- `UserManagementPanel.test.tsx` - Comprehensive test suite
- Mock API responses
- User interaction simulation
- Form validation testing

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

## Security Features

- Admin access control
- Input validation and sanitization
- CSRF protection
- Role-based permissions
- Secure user management

## Future Enhancements

- Real-time system monitoring
- Advanced user analytics
- System backup management
- Performance metrics dashboard
- Audit logging interface
- Bulk user operations
- Advanced system configuration
- System maintenance tools
