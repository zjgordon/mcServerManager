# Minecraft Server Manager - Developer Guide

This guide provides comprehensive information for developers working on the Minecraft Server Manager project, including architecture, development setup, coding standards, and contribution guidelines.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Development Setup](#development-setup)
4. [Frontend Development](#frontend-development)
5. [Backend Development](#backend-development)
6. [Testing](#testing)
7. [Code Standards](#code-standards)
8. [API Development](#api-development)
9. [Database Management](#database-management)
10. [Deployment](#deployment)
11. [Contributing](#contributing)
12. [Troubleshooting](#troubleshooting)

## Project Overview

### Technology Stack

**Backend:**
- **Python 3.8+** - Core programming language
- **Flask 3.0.3** - Web framework
- **SQLAlchemy 2.0.34** - ORM and database management
- **Flask-Login** - User authentication
- **Flask-Limiter** - Rate limiting
- **psutil** - System process management
- **pytest** - Testing framework

**Frontend:**
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Styling
- **Lucide React** - Icons

**Database:**
- **SQLite** (default) - Lightweight database
- **PostgreSQL/MySQL** - Production alternatives

### Project Structure

```
mcServerManager/
├── app/                    # Backend application
│   ├── routes/            # Flask route handlers
│   │   ├── api/          # API endpoints
│   │   ├── auth_routes.py
│   │   └── server_routes.py
│   ├── models.py         # Database models
│   ├── utils.py          # Utility functions
│   ├── config.py         # Configuration management
│   ├── security.py       # Security utilities
│   ├── error_handlers.py # Error handling
│   └── templates/        # HTML templates
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── tests/                 # Backend tests
├── servers/              # Minecraft server files
├── backups/              # Server backups
├── scripts/              # Maintenance scripts
└── requirements.txt      # Python dependencies
```

## Architecture

### Backend Architecture

**MVC Pattern:**
- **Models** (`models.py`): Database models and business logic
- **Views** (`routes/`): API endpoints and route handlers
- **Controllers**: Business logic in route handlers and utilities

**Key Components:**
- **Authentication System**: Session-based authentication with Flask-Login
- **API Layer**: RESTful API with consistent response format
- **Process Management**: Real-time Minecraft server process monitoring
- **Memory Management**: System resource allocation and monitoring
- **Security Layer**: Rate limiting, input validation, CSRF protection

### Frontend Architecture

**Component-Based Architecture:**
- **Pages**: Top-level route components
- **Components**: Reusable UI components
- **Contexts**: Global state management (Auth, WebSocket)
- **Services**: API communication layer
- **Hooks**: Custom React hooks for business logic

**State Management:**
- **React Context**: Global state (authentication, WebSocket)
- **TanStack Query**: Server state management and caching
- **Local State**: Component-level state with useState/useReducer

### Data Flow

1. **User Interaction** → React Component
2. **Component** → API Service
3. **API Service** → Flask Backend
4. **Backend** → Database/System
5. **Response** → Component State
6. **State Update** → UI Re-render

## Development Setup

### Prerequisites

**System Requirements:**
- **Python 3.8+** with pip
- **Node.js 20.19+** (for frontend development)
- **Java 8+** (for Minecraft servers)
- **Git** for version control

**Development Tools:**
- **Code Editor**: VS Code, PyCharm, or similar
- **Terminal**: Bash, Zsh, or PowerShell
- **Browser**: Chrome, Firefox, or Safari for testing

### Backend Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd mcServerManager
   ```

2. **Create Virtual Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your settings
   ```

5. **Initialize Database**
   ```bash
   python run.py
   # Database will be created automatically
   ```

6. **Run Development Server**
   ```bash
   python run.py
   # Server runs on http://localhost:5000
   ```

### Frontend Setup

1. **Navigate to Frontend Directory**
   ```bash
   cd frontend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

### Development Workflow

1. **Start Backend Server**
   ```bash
   python run.py
   ```

2. **Start Frontend Server** (in separate terminal)
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api/v1

## Frontend Development

### Component Development

**Component Structure:**
```typescript
import React from 'react'
import { ComponentProps } from '../types'

interface MyComponentProps {
  title: string
  onAction: () => void
}

export const MyComponent: React.FC<MyComponentProps> = ({ 
  title, 
  onAction 
}) => {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  )
}
```

**Component Guidelines:**
- Use TypeScript for all components
- Follow React functional component patterns
- Use Tailwind CSS for styling
- Implement proper error boundaries
- Add accessibility attributes

### State Management

**Context Usage:**
```typescript
// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

**TanStack Query Usage:**
```typescript
import { useQuery, useMutation } from '@tanstack/react-query'

// Query
const { data: servers, isLoading } = useQuery({
  queryKey: ['servers'],
  queryFn: api.getServers
})

// Mutation
const createServerMutation = useMutation({
  mutationFn: api.createServer,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['servers'] })
  }
})
```

### API Integration

**Service Layer:**
```typescript
// services/api.ts
export class ApiService {
  private baseURL = '/api/v1'
  
  async getServers(): Promise<Server[]> {
    const response = await fetch(`${this.baseURL}/servers/`, {
      credentials: 'include'
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.servers
  }
  
  async createServer(serverData: CreateServerRequest): Promise<Server> {
    const response = await fetch(`${this.baseURL}/servers/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(serverData)
    })
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.server
  }
}
```

### Testing

**Component Testing:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" onAction={jest.fn()} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
  
  it('calls onAction when button is clicked', () => {
    const onAction = jest.fn()
    render(<MyComponent title="Test" onAction={onAction} />)
    fireEvent.click(screen.getByText('Action'))
    expect(onAction).toHaveBeenCalled()
  })
})
```

## Backend Development

### Route Development

**API Route Structure:**
```python
from flask import Blueprint, request, jsonify
from app.models import Server
from app.utils import validate_input

api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

@api_bp.route('/servers/', methods=['GET'])
@login_required
def get_servers():
    """Get all servers for the current user."""
    try:
        if current_user.is_admin:
            servers = Server.query.all()
        else:
            servers = Server.query.filter_by(owner_id=current_user.id).all()
        
        return jsonify({
            'success': True,
            'servers': [server.to_dict() for server in servers]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Failed to retrieve servers',
            'error': str(e)
        }), 500
```

**Route Guidelines:**
- Use consistent response format
- Implement proper error handling
- Add input validation
- Include authentication checks
- Follow RESTful conventions

### Model Development

**Database Model:**
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app import db
from datetime import datetime

class Server(db.Model):
    __tablename__ = 'servers'
    
    id = Column(Integer, primary_key=True)
    server_name = Column(String(100), nullable=False)
    version = Column(String(20), nullable=False)
    port = Column(Integer, nullable=False)
    status = Column(String(20), default='Stopped')
    pid = Column(Integer, nullable=True)
    memory_mb = Column(Integer, nullable=False)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Relationships
    owner = relationship('User', backref='servers')
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'server_name': self.server_name,
            'version': self.version,
            'port': self.port,
            'status': self.status,
            'pid': self.pid,
            'memory_mb': self.memory_mb,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
```

### Utility Functions

**Common Utilities:**
```python
import subprocess
import psutil
from typing import Optional, Dict, Any

def validate_input(data: Dict[str, Any], required_fields: list) -> bool:
    """Validate input data for required fields."""
    for field in required_fields:
        if field not in data or not data[field]:
            return False
    return True

def get_process_info(pid: int) -> Optional[Dict[str, Any]]:
    """Get process information by PID."""
    try:
        process = psutil.Process(pid)
        return {
            'pid': pid,
            'cpu_percent': process.cpu_percent(),
            'memory_mb': process.memory_info().rss / 1024 / 1024,
            'create_time': process.create_time()
        }
    except psutil.NoSuchProcess:
        return None

def run_command(command: str, cwd: Optional[str] = None) -> tuple:
    """Run a shell command and return output and error."""
    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=30
        )
        return result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return "", "Command timed out"
```

## Testing

### Backend Testing

**Test Structure:**
```python
import pytest
from app import create_app, db
from app.models import User, Server

@pytest.fixture
def app():
    app = create_app(testing=True)
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    # Create test user and login
    response = client.post('/api/v1/auth/login', json={
        'username': 'testuser',
        'password': 'testpass'
    })
    return {'Cookie': response.headers.get('Set-Cookie')}

def test_get_servers(client, auth_headers):
    """Test getting servers list."""
    response = client.get('/api/v1/servers/', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert 'servers' in data
```

**Test Categories:**
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Model Tests**: Database model testing
- **Security Tests**: Authentication and authorization
- **Performance Tests**: Load and stress testing

### Frontend Testing

**Test Setup:**
```typescript
// test/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock fetch
global.fetch = vi.fn()

// Mock WebSocket
global.WebSocket = vi.fn()
```

**Component Testing:**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerList } from './ServerList'

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  )
}

describe('ServerList', () => {
  it('renders server list', async () => {
    renderWithProviders(<ServerList />)
    await waitFor(() => {
      expect(screen.getByText('My Server')).toBeInTheDocument()
    })
  })
})
```

## Code Standards

### Python Standards

**Code Style:**
- Follow PEP 8 guidelines
- Use Black for code formatting
- Maximum line length: 88 characters
- Use type hints for function parameters and return values

**Naming Conventions:**
- **Functions**: snake_case
- **Classes**: PascalCase
- **Constants**: UPPER_SNAKE_CASE
- **Variables**: snake_case

**Documentation:**
```python
def create_server(server_data: Dict[str, Any]) -> Server:
    """
    Create a new Minecraft server.
    
    Args:
        server_data: Dictionary containing server configuration
        
    Returns:
        Server: The created server instance
        
    Raises:
        ValueError: If server data is invalid
        RuntimeError: If server creation fails
    """
    # Implementation here
```

### TypeScript Standards

**Code Style:**
- Use ESLint and Prettier
- Follow React best practices
- Use functional components with hooks
- Implement proper TypeScript types

**Naming Conventions:**
- **Components**: PascalCase
- **Functions**: camelCase
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase

**Documentation:**
```typescript
/**
 * Creates a new Minecraft server
 * @param serverData - Server configuration data
 * @returns Promise resolving to the created server
 * @throws {Error} When server creation fails
 */
export const createServer = async (serverData: CreateServerRequest): Promise<Server> => {
  // Implementation here
}
```

### Git Standards

**Commit Messages:**
- Use conventional commit format
- Format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, test, chore

**Examples:**
```
feat(api): add server backup endpoint
fix(auth): resolve session timeout issue
docs(readme): update installation instructions
test(server): add integration tests for server creation
```

**Branch Naming:**
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Hotfixes: `hotfix/description`

## API Development

### API Design Principles

**RESTful Design:**
- Use HTTP methods appropriately (GET, POST, PUT, DELETE)
- Use consistent URL patterns
- Implement proper status codes
- Use meaningful resource names

**Response Format:**
```python
# Success Response
{
    "success": True,
    "message": "Operation completed successfully",
    "data": {
        # Response data
    }
}

# Error Response
{
    "success": False,
    "message": "Error description",
    "error": "Detailed error information"
}
```

### API Documentation

**OpenAPI Specification:**
```yaml
openapi: 3.0.0
info:
  title: Minecraft Server Manager API
  version: 1.0.0
  description: API for managing Minecraft servers

paths:
  /api/v1/servers/:
    get:
      summary: Get all servers
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  servers:
                    type: array
                    items:
                      $ref: '#/components/schemas/Server'
```

### Error Handling

**Error Response Structure:**
```python
def handle_error(error: Exception, status_code: int = 500):
    """Handle API errors consistently."""
    return jsonify({
        'success': False,
        'message': str(error),
        'error': error.__class__.__name__
    }), status_code

# Usage in routes
try:
    # API logic
    pass
except ValueError as e:
    return handle_error(e, 400)
except PermissionError as e:
    return handle_error(e, 403)
except Exception as e:
    return handle_error(e, 500)
```

## Database Management

### Model Relationships

**User-Server Relationship:**
```python
class User(db.Model):
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    # ... other fields
    
    # Relationship
    servers = relationship('Server', backref='owner', lazy='dynamic')

class Server(db.Model):
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    # ... other fields
```

### Database Migrations

**Migration Example:**
```python
# migrations/001_add_server_status.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('servers', sa.Column('status', sa.String(20), nullable=True))
    op.execute("UPDATE servers SET status = 'Stopped' WHERE status IS NULL")
    op.alter_column('servers', 'status', nullable=False)

def downgrade():
    op.drop_column('servers', 'status')
```

### Query Optimization

**Efficient Queries:**
```python
# Good: Use joins to avoid N+1 queries
servers = db.session.query(Server).join(User).filter(
    User.id == current_user.id
).all()

# Good: Use eager loading for relationships
servers = Server.query.options(joinedload(Server.owner)).all()

# Bad: N+1 query problem
servers = Server.query.all()
for server in servers:
    print(server.owner.username)  # This creates a query for each server
```

## Deployment

### Production Setup

**Environment Configuration:**
```bash
# Production environment variables
export FLASK_ENV=production
export SECRET_KEY=your-secure-secret-key
export DATABASE_URL=postgresql://user:pass@localhost/mcservermanager
export MAX_TOTAL_MEMORY_MB=16384
```

**WSGI Configuration:**
```python
# wsgi.py
from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run()
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /static {
        alias /path/to/app/static;
    }
}
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wsgi:app"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/mcservermanager
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=mcservermanager
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Contributing

### Development Workflow

1. **Fork Repository**
   ```bash
   git fork <repository-url>
   git clone <your-fork-url>
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/new-feature
   ```

3. **Make Changes**
   - Write code following project standards
   - Add tests for new functionality
   - Update documentation

4. **Test Changes**
   ```bash
   # Backend tests
   pytest
   
   # Frontend tests
   cd frontend
   npm test
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(api): add new server backup endpoint"
   ```

6. **Push and Create PR**
   ```bash
   git push origin feature/new-feature
   # Create pull request on GitHub
   ```

### Code Review Process

**Review Checklist:**
- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Error handling implemented

**Review Guidelines:**
- Be constructive and helpful
- Focus on code quality and maintainability
- Check for potential security issues
- Verify test coverage
- Ensure documentation is clear

### Issue Reporting

**Bug Reports:**
- Use the bug report template
- Include steps to reproduce
- Provide system information
- Include relevant logs

**Feature Requests:**
- Use the feature request template
- Describe the use case
- Provide implementation suggestions
- Consider backward compatibility

## Troubleshooting

### Common Development Issues

**Python Environment Issues:**
```bash
# Virtual environment not activating
source venv/bin/activate

# Dependencies not installing
pip install --upgrade pip
pip install -r requirements.txt

# Import errors
export PYTHONPATH=$PYTHONPATH:$(pwd)
```

**Node.js Issues:**
```bash
# Node version issues
nvm use 20.19.0

# Package installation issues
rm -rf node_modules package-lock.json
npm install

# Build issues
npm run build
```

**Database Issues:**
```bash
# Database not found
python -c "from app import db; db.create_all()"

# Migration issues
flask db upgrade

# Connection issues
# Check DATABASE_URL environment variable
```

### Debugging

**Backend Debugging:**
```python
# Enable debug mode
export FLASK_DEBUG=1

# Add logging
import logging
logging.basicConfig(level=logging.DEBUG)

# Use debugger
import pdb; pdb.set_trace()
```

**Frontend Debugging:**
```typescript
// Enable React DevTools
// Install browser extension

// Add console logging
console.log('Debug info:', data)

// Use React Developer Tools
// Inspect component state and props
```

### Performance Issues

**Backend Performance:**
- Monitor database queries
- Use connection pooling
- Implement caching
- Profile memory usage

**Frontend Performance:**
- Use React DevTools Profiler
- Implement code splitting
- Optimize bundle size
- Monitor network requests

---

## Resources

### Documentation
- **Flask Documentation**: https://flask.palletsprojects.com/
- **React Documentation**: https://react.dev/
- **SQLAlchemy Documentation**: https://docs.sqlalchemy.org/
- **TanStack Query**: https://tanstack.com/query

### Tools
- **VS Code Extensions**: Python, TypeScript, ESLint, Prettier
- **Browser DevTools**: Chrome DevTools, Firefox Developer Tools
- **API Testing**: Postman, Insomnia, curl
- **Database Tools**: pgAdmin, DBeaver, SQLite Browser

### Community
- **GitHub Issues**: Project repository issues
- **Discord/Slack**: Developer community channels
- **Stack Overflow**: Technical questions
- **Reddit**: r/Python, r/reactjs

---

**Minecraft Server Manager** - Developer Guide

*This guide provides comprehensive information for developers working on the Minecraft Server Manager project. For additional support, refer to the project documentation and community resources.*
