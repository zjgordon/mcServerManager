# Migration Guide: Legacy Templates to React Frontend

This guide provides a roadmap for migrating from the legacy Jinja2 templates to a modern React frontend while maintaining full functionality.

## Current State

### ✅ What's Working
- **Legacy Templates**: All 13 Jinja2 templates fully functional
- **REST API**: 28 comprehensive API endpoints ready
- **Authentication**: Shared session-based auth for both interfaces
- **CORS Support**: Frontend development ready
- **Documentation**: Complete API documentation available
- **Coexistence**: Both interfaces work simultaneously without conflicts

### 📊 System Overview
```
Total Routes: 49
├── Template Routes: 21 (Legacy Jinja2)
└── API Routes: 28 (Modern REST)

Authentication: Shared (Flask-Login)
Database: Shared (SQLAlchemy)
Security: Shared (Rate limiting, CSRF, etc.)
```

## Migration Strategy

### Phase 1: Foundation (COMPLETED ✅)
- [x] Extract API endpoints from template routes
- [x] Implement comprehensive REST API
- [x] Add CORS support for frontend development
- [x] Create complete API documentation
- [x] Set up legacy template coexistence

### Phase 2: Frontend Development (NEXT)
- [ ] Set up React development environment
- [ ] Create component library with shadcn/ui
- [ ] Implement authentication flow
- [ ] Build server management interface
- [ ] Add admin functionality
- [ ] Implement responsive design

### Phase 3: Testing & Validation
- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Security testing
- [ ] Cross-browser testing

### Phase 4: Gradual Migration
- [ ] User choice between interfaces
- [ ] Feature parity validation
- [ ] User feedback collection
- [ ] Performance optimization

### Phase 5: Template Deprecation
- [ ] Deprecation notice
- [ ] Migration assistance
- [ ] Template removal
- [ ] API-only operation

## Frontend Development Setup

### Prerequisites
- Node.js 18+ and npm/yarn
- React 18+
- TypeScript
- Vite (build tool)
- shadcn/ui (component library)
- Tailwind CSS (styling)

### Project Structure
```
frontend/
├── src/
│   ├── components/          # Reusable components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API service layer
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Utility functions
│   └── App.tsx             # Main app component
├── public/                 # Static assets
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### API Integration
```typescript
// API service configuration
const API_BASE = 'http://localhost:5000/api/v1';

// Authentication service
class AuthService {
  async login(username: string, password: string) {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password })
    });
    return response.json();
  }
  
  async getCurrentUser() {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: 'include'
    });
    return response.json();
  }
}

// Server management service
class ServerService {
  async getServers() {
    const response = await fetch(`${API_BASE}/servers/`, {
      credentials: 'include'
    });
    return response.json();
  }
  
  async createServer(serverData: ServerCreateRequest) {
    const response = await fetch(`${API_BASE}/servers/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(serverData)
    });
    return response.json();
  }
}
```

## Component Mapping

### Template → React Component Mapping

| Template | React Component | API Endpoints |
|----------|----------------|---------------|
| `login.html` | `LoginPage` | `POST /auth/login` |
| `home.html` | `ServerListPage` | `GET /servers/` |
| `create.html` | `CreateServerPage` | `GET /servers/versions`, `POST /servers/` |
| `configure_server.html` | `ConfigureServerPage` | `POST /servers/` |
| `manage_users.html` | `UserManagementPage` | `GET /admin/users`, `POST /admin/users` |
| `admin_config.html` | `AdminConfigPage` | `GET /admin/config`, `PUT /admin/config` |
| `change_password.html` | `ChangePasswordPage` | `POST /auth/change-password` |
| `add_user.html` | `AddUserModal` | `POST /admin/users` |
| `edit_user.html` | `EditUserModal` | `PUT /admin/users/<id>` |
| `accept_eula.html` | `AcceptEulaModal` | `POST /servers/<id>/accept-eula` |

### Key Components to Build

#### Authentication Components
- `LoginForm` - User login
- `UserMenu` - User dropdown menu
- `AuthGuard` - Route protection
- `SessionProvider` - Authentication context

#### Server Management Components
- `ServerCard` - Individual server display
- `ServerList` - Server grid/list view
- `CreateServerForm` - Server creation
- `ServerActions` - Start/stop/backup buttons
- `ServerStatus` - Real-time status display

#### Admin Components
- `UserTable` - User management table
- `UserForm` - Add/edit user form
- `SystemConfig` - System configuration
- `SystemStats` - System statistics dashboard

#### Shared Components
- `Layout` - Main app layout
- `Navigation` - Top navigation bar
- `Modal` - Reusable modal component
- `Button` - Styled button component
- `Input` - Form input component
- `Alert` - Notification component

## Development Workflow

### 1. Setup Development Environment
```bash
# Create React app with Vite
npm create vite@latest minecraft-manager-frontend -- --template react-ts
cd minecraft-manager-frontend

# Install dependencies
npm install
npm install @radix-ui/react-*  # shadcn/ui dependencies
npm install tailwindcss
npm install axios  # HTTP client
npm install react-router-dom  # Routing
npm install @tanstack/react-query  # Data fetching

# Setup shadcn/ui
npx shadcn-ui@latest init
```

### 2. Configure API Integration
```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for CSRF token
api.interceptors.request.use((config) => {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken;
  }
  return config;
});

export default api;
```

### 3. Implement Authentication
```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

interface User {
  id: number;
  username: string;
  is_admin: boolean;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.user);
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        setUser(response.data.user);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

### 4. Build Server Management
```typescript
// src/pages/ServerListPage.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ServerCard } from '../components/ServerCard';
import { CreateServerButton } from '../components/CreateServerButton';
import api from '../lib/api';

interface Server {
  id: number;
  server_name: string;
  version: string;
  status: 'Running' | 'Stopped';
  memory_mb: number;
  port: number;
}

export function ServerListPage() {
  const queryClient = useQueryClient();

  const { data: servers, isLoading } = useQuery({
    queryKey: ['servers'],
    queryFn: async () => {
      const response = await api.get('/servers/');
      return response.data.servers;
    },
  });

  const startServer = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await api.post(`/servers/${serverId}/start`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });

  const stopServer = useMutation({
    mutationFn: async (serverId: number) => {
      const response = await api.post(`/servers/${serverId}/stop`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Minecraft Servers</h1>
        <CreateServerButton />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers?.map((server: Server) => (
          <ServerCard
            key={server.id}
            server={server}
            onStart={() => startServer.mutate(server.id)}
            onStop={() => stopServer.mutate(server.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Testing Strategy

### Unit Testing
```typescript
// src/components/__tests__/ServerCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerCard } from '../ServerCard';

const mockServer = {
  id: 1,
  server_name: 'Test Server',
  version: '1.21.8',
  status: 'Stopped' as const,
  memory_mb: 1024,
  port: 25565,
};

test('renders server information', () => {
  render(<ServerCard server={mockServer} onStart={jest.fn()} onStop={jest.fn()} />);
  
  expect(screen.getByText('Test Server')).toBeInTheDocument();
  expect(screen.getByText('1.21.8')).toBeInTheDocument();
  expect(screen.getByText('Stopped')).toBeInTheDocument();
});

test('calls onStart when start button is clicked', () => {
  const onStart = jest.fn();
  render(<ServerCard server={mockServer} onStart={onStart} onStop={jest.fn()} />);
  
  fireEvent.click(screen.getByText('Start'));
  expect(onStart).toHaveBeenCalled();
});
```

### Integration Testing
```typescript
// src/pages/__tests__/ServerListPage.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ServerListPage } from '../ServerListPage';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

test('loads and displays servers', async () => {
  const queryClient = createTestQueryClient();
  
  render(
    <QueryClientProvider client={queryClient}>
      <ServerListPage />
    </QueryClientProvider>
  );
  
  await waitFor(() => {
    expect(screen.getByText('Minecraft Servers')).toBeInTheDocument();
  });
});
```

### E2E Testing
```typescript
// cypress/e2e/server-management.cy.ts
describe('Server Management', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.login('admin', 'password');
  });

  it('should create a new server', () => {
    cy.get('[data-testid="create-server-button"]').click();
    cy.get('[data-testid="server-name-input"]').type('Test Server');
    cy.get('[data-testid="version-select"]').select('1.21.8');
    cy.get('[data-testid="memory-input"]').type('1024');
    cy.get('[data-testid="create-button"]').click();
    
    cy.get('[data-testid="server-card"]').should('contain', 'Test Server');
  });

  it('should start and stop a server', () => {
    cy.get('[data-testid="server-card"]').first().within(() => {
      cy.get('[data-testid="start-button"]').click();
      cy.get('[data-testid="status"]').should('contain', 'Running');
      
      cy.get('[data-testid="stop-button"]').click();
      cy.get('[data-testid="status"]').should('contain', 'Stopped');
    });
  });
});
```

## Deployment Strategy

### Development Environment
```bash
# Backend (Flask)
cd /path/to/mcServerManager
source venv/bin/activate
python run.py

# Frontend (React)
cd /path/to/minecraft-manager-frontend
npm run dev
```

### Production Environment
```bash
# Build frontend
npm run build

# Serve static files with Flask
# Add static file serving to Flask app
app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')

# Or use nginx to serve static files
# nginx configuration for serving React app and proxying API
```

## Migration Checklist

### Pre-Migration
- [ ] Complete API documentation review
- [ ] Set up React development environment
- [ ] Create component library
- [ ] Implement authentication flow
- [ ] Build core server management features

### During Migration
- [ ] Implement feature parity
- [ ] Add comprehensive testing
- [ ] Optimize performance
- [ ] Ensure accessibility
- [ ] Test cross-browser compatibility

### Post-Migration
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] User feedback collection
- [ ] Documentation updates
- [ ] Template deprecation planning

## Rollback Plan

### If Issues Arise
1. **Immediate**: Disable React frontend, revert to templates
2. **Short-term**: Fix issues in React frontend
3. **Long-term**: Gradual re-migration with fixes

### Rollback Steps
```bash
# Disable React frontend
# Update nginx configuration to serve templates only
# Restart web server
# Monitor system stability
```

## Success Metrics

### Technical Metrics
- **Performance**: Page load times < 2 seconds
- **Reliability**: 99.9% uptime
- **Security**: No security vulnerabilities
- **Accessibility**: WCAG 2.1 AA compliance

### User Metrics
- **Adoption**: 80% of users migrate within 3 months
- **Satisfaction**: User satisfaction score > 4.5/5
- **Efficiency**: Task completion time improved by 20%
- **Error Rate**: User error rate < 5%

## Conclusion

The migration from legacy Jinja2 templates to a modern React frontend is well-planned and ready to execute. The comprehensive API infrastructure, complete documentation, and proven coexistence strategy provide a solid foundation for successful migration.

**Key Success Factors:**
- ✅ Complete API infrastructure ready
- ✅ Comprehensive documentation available
- ✅ Proven coexistence strategy
- ✅ Clear migration roadmap
- ✅ Rollback plan in place

**Next Steps:**
1. Set up React development environment
2. Begin component development
3. Implement authentication flow
4. Build server management interface
5. Add admin functionality
6. Conduct comprehensive testing
7. Plan gradual user migration

The migration is ready to begin with confidence in a successful outcome.
