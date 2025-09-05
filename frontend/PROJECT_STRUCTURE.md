# Project Structure & Routing - Minecraft Server Manager Frontend

## Overview

This document describes the comprehensive project structure and routing system for the Minecraft Server Manager frontend. The application is built with React, TypeScript, and modern development tools, featuring a scalable architecture with clear separation of concerns.

## Directory Structure

```
frontend/
├── public/                     # Static assets
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   │   ├── MainLayout.tsx
│   │   │   ├── AuthLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   └── toaster.tsx
│   │   ├── forms/            # Form components
│   │   ├── server/           # Server-specific components
│   │   └── admin/            # Admin-specific components
│   ├── pages/                # Page components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ServersPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── AdminPage.tsx
│   │   ├── auth/             # Authentication pages
│   │   ├── server/           # Server management pages
│   │   └── admin/            # Admin pages
│   ├── hooks/                # Custom React hooks
│   │   ├── useServer.ts      # Server management hooks
│   │   ├── useAdmin.ts       # Admin functionality hooks
│   │   ├── useAuth.ts        # Authentication hooks
│   │   └── use-toast.ts      # Toast notification hook
│   ├── services/             # API service layer
│   │   └── api.ts            # Main API service
│   ├── types/                # TypeScript type definitions
│   │   └── api.ts            # API types
│   ├── utils/                # Utility functions
│   │   ├── validation.ts     # Form validation
│   │   └── formatting.ts     # Data formatting
│   ├── constants/            # Application constants
│   │   └── index.ts          # All constants
│   ├── contexts/             # React contexts
│   │   └── AuthContext.tsx   # Authentication context
│   ├── lib/                  # Library utilities
│   │   └── utils.ts          # shadcn/ui utilities
│   ├── App.tsx               # Main application component
│   ├── App.css               # Application styles
│   ├── index.css             # Global styles
│   └── main.tsx              # Application entry point
├── components.json            # shadcn/ui configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── tsconfig.app.json          # TypeScript app configuration
├── tsconfig.node.json         # TypeScript node configuration
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation
```

## Routing System

### Route Structure

The application uses React Router v6 with a hierarchical routing system:

```typescript
// Main Routes
/                    # Dashboard (protected)
/login              # Authentication
/servers            # Server management
/settings           # User settings
/admin              # Admin panel (admin only)

// Nested Routes (planned)
/servers/create     # Create new server
/servers/:id        # Server details
/servers/:id/edit   # Edit server
/admin/users        # User management
/admin/system       # System configuration
```

### Layout System

#### MainLayout
- **Purpose**: Main application layout with header, sidebar, and footer
- **Usage**: All protected routes
- **Components**: Header, Sidebar, Footer, main content area
- **Features**: Navigation, user menu, responsive design

#### AuthLayout
- **Purpose**: Authentication layout for login/signup pages
- **Usage**: Public authentication routes
- **Components**: Centered content area with background
- **Features**: Clean, focused design for authentication

### Route Protection

#### ProtectedRoute Component
```typescript
<ProtectedRoute>
  <MainLayout>
    <DashboardPage />
  </MainLayout>
</ProtectedRoute>
```

**Features:**
- Authentication verification
- Automatic redirect to login
- User context integration
- Role-based access control

#### Admin Route Protection
```typescript
// Admin routes check user.is_admin
{user?.is_admin && (
  <Route path="/admin" element={<AdminPage />} />
)}
```

## Component Architecture

### Layout Components

#### Header Component
- **Location**: `src/components/layout/Header.tsx`
- **Purpose**: Top navigation bar with user menu
- **Features**:
  - Logo and branding
  - Navigation links
  - User profile display
  - Admin badge for admin users
  - Logout functionality

#### Sidebar Component
- **Location**: `src/components/layout/Sidebar.tsx`
- **Purpose**: Left navigation sidebar
- **Features**:
  - Navigation menu with icons
  - Active route highlighting
  - Admin-only menu items
  - Quick stats display
  - Responsive design

#### Footer Component
- **Location**: `src/components/layout/Footer.tsx`
- **Purpose**: Application footer
- **Features**:
  - Branding and version info
  - Legal links
  - Copyright information

### Page Components

#### DashboardPage
- **Location**: `src/pages/DashboardPage.tsx`
- **Purpose**: Main dashboard with overview
- **Features**:
  - Welcome message
  - System statistics
  - Quick actions
  - Recent activity
  - Server status overview

#### ServersPage
- **Location**: `src/pages/ServersPage.tsx`
- **Purpose**: Server management interface
- **Features**:
  - Server list with search/filter
  - Grid/list view toggle
  - Server actions (start/stop/configure)
  - Create server button
  - Status indicators

#### SettingsPage
- **Location**: `src/pages/SettingsPage.tsx`
- **Purpose**: User settings and preferences
- **Features**:
  - Profile management
  - Password change
  - Theme preferences
  - System information

#### AdminPage
- **Location**: `src/pages/AdminPage.tsx`
- **Purpose**: Administrative interface
- **Features**:
  - System statistics
  - User management
  - System configuration
  - Access control (admin only)

## Custom Hooks

### Server Management Hooks

#### useServers
- **Purpose**: Fetch all servers
- **Returns**: Server list with loading/error states
- **Usage**: Server listing pages

#### useServer
- **Purpose**: Fetch single server by ID
- **Returns**: Server details with loading/error states
- **Usage**: Server detail pages

#### useCreateServer
- **Purpose**: Create new server
- **Returns**: Mutation with success/error handling
- **Usage**: Server creation forms

#### useUpdateServer
- **Purpose**: Update existing server
- **Returns**: Mutation with success/error handling
- **Usage**: Server editing forms

#### useDeleteServer
- **Purpose**: Delete server
- **Returns**: Mutation with success/error handling
- **Usage**: Server deletion actions

#### useStartServer / useStopServer
- **Purpose**: Server lifecycle management
- **Returns**: Mutations with success/error handling
- **Usage**: Server control buttons

### Admin Hooks

#### useSystemStats
- **Purpose**: Fetch system statistics
- **Returns**: System stats with loading/error states
- **Usage**: Dashboard and admin pages

#### useUsers
- **Purpose**: Fetch all users
- **Returns**: User list with loading/error states
- **Usage**: User management pages

#### useCreateUser / useUpdateUser / useDeleteUser
- **Purpose**: User management operations
- **Returns**: Mutations with success/error handling
- **Usage**: User management forms

## Utility Functions

### Validation Utilities
- **Location**: `src/utils/validation.ts`
- **Purpose**: Form validation functions
- **Features**:
  - Email validation
  - Password strength validation
  - Username validation
  - Server name validation
  - Port and memory validation

### Formatting Utilities
- **Location**: `src/utils/formatting.ts`
- **Purpose**: Data formatting functions
- **Features**:
  - Date/time formatting
  - Memory/disk size formatting
  - Status formatting
  - Progress calculations
  - Text truncation

### Constants
- **Location**: `src/constants/index.ts`
- **Purpose**: Application constants
- **Features**:
  - Route definitions
  - API configuration
  - Server limits
  - Theme colors
  - Validation rules

## API Integration

### Service Layer
- **Location**: `src/services/api.ts`
- **Purpose**: Centralized API communication
- **Features**:
  - Axios-based HTTP client
  - Type-safe API calls
  - Error handling
  - Request/response interceptors

### React Query Integration
- **Purpose**: Data fetching and caching
- **Features**:
  - Automatic caching
  - Background refetching
  - Optimistic updates
  - Error handling
  - Loading states

## Styling System

### Tailwind CSS
- **Configuration**: `tailwind.config.js`
- **Features**:
  - Custom Minecraft theme
  - shadcn/ui integration
  - Responsive design
  - Dark mode support (prepared)

### shadcn/ui Components
- **Configuration**: `components.json`
- **Features**:
  - Accessible components
  - Consistent design system
  - Custom variants
  - TypeScript support

## Development Workflow

### Build System
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety and IntelliSense
- **PostCSS**: CSS processing with Tailwind
- **ESLint**: Code linting and formatting

### Development Server
- **Port**: 3000
- **Proxy**: `/api` → `http://localhost:5000`
- **Hot Reload**: Automatic refresh on changes
- **Source Maps**: Debug support

### Production Build
- **Output**: `dist/` directory
- **Optimization**: Code splitting and minification
- **Assets**: Optimized images and fonts
- **Source Maps**: Generated for debugging

## Best Practices

### Component Organization
1. **Single Responsibility**: Each component has one clear purpose
2. **Reusability**: Components are designed for reuse
3. **Composition**: Complex components are built from simpler ones
4. **Type Safety**: All components are properly typed

### State Management
1. **React Query**: Server state management
2. **React Context**: Global application state
3. **Local State**: Component-specific state
4. **Form State**: Controlled components with validation

### Performance
1. **Code Splitting**: Route-based code splitting
2. **Lazy Loading**: Components loaded on demand
3. **Memoization**: Expensive calculations cached
4. **Virtual Scrolling**: Large lists optimized

### Accessibility
1. **ARIA Labels**: Proper accessibility attributes
2. **Keyboard Navigation**: Full keyboard support
3. **Screen Readers**: Compatible with assistive technology
4. **Color Contrast**: WCAG compliant colors

## Future Enhancements

### Planned Features
- [ ] Server creation wizard
- [ ] Real-time server monitoring
- [ ] Advanced user management
- [ ] System analytics dashboard
- [ ] Plugin management interface
- [ ] Backup and restore tools

### Technical Improvements
- [ ] Dark mode implementation
- [ ] Internationalization (i18n)
- [ ] Progressive Web App (PWA)
- [ ] Offline support
- [ ] Advanced caching strategies
- [ ] Performance monitoring

## Troubleshooting

### Common Issues

**Build Errors:**
- Check TypeScript configuration
- Verify all imports are correct
- Ensure all dependencies are installed

**Routing Issues:**
- Verify route definitions
- Check protected route logic
- Ensure proper navigation

**Styling Issues:**
- Check Tailwind configuration
- Verify CSS class names
- Ensure proper imports

**API Issues:**
- Check API service configuration
- Verify endpoint URLs
- Check authentication tokens

### Debug Tools
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API debugging
- Console for error messages
- Source maps for debugging

## Resources

- [React Router Documentation](https://reactrouter.com/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Vite Documentation](https://vitejs.dev/)
