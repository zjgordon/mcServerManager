# Minecraft Server Manager - Node.js/Express Backend

This is the Node.js/Express backend for the Minecraft Server Manager, implementing the strangler pattern migration from Flask to Node.js.

## 🚀 Quick Start

### Prerequisites

- Node.js 20.19+ (required for Vite compatibility)
- npm or yarn
- SQLite3 (for development)
- Redis (for caching and background jobs)
- Docker (optional, for Redis container)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Set up database:**
   ```bash
   npm run setup:db
   ```

4. **Set up Redis:**
   ```bash
   # Option 1: Using Docker (recommended)
   npm run redis:start
   
   # Option 2: Install Redis locally
   ./scripts/install-redis.sh
   
   # Setup Redis with namespaces
   npm run redis:setup setup
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5001`

## 📁 Project Structure

```
node-backend/
├── src/
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── routes/          # API routes
│   ├── controllers/     # Route controllers
│   ├── services/        # Business logic
│   ├── models/          # Prisma models and types
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── schemas/         # Zod validation schemas
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── scripts/
│   ├── setup-database.ts    # Database setup script
│   ├── migrate-from-flask.ts # Flask data migration
│   └── generate-openapi.ts  # OpenAPI generation
├── docs/                # API documentation
└── logs/                # Application logs
```

## 🗄️ Database

### SQLite (Development)

The development environment uses SQLite for simplicity:

```bash
# Database file location
./dev.db

# View database in Prisma Studio
npm run db:studio

# Reset database
npm run db:reset
```

### PostgreSQL (Production)

Production will use PostgreSQL (Phase 5):

```bash
# Update DATABASE_URL in .env
DATABASE_URL=postgresql://user:password@localhost:5432/mcserver
```

## 🔧 Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server

### Database
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database
- `npm run setup:db` - Complete database setup

### Redis
- `npm run redis:start` - Start Redis with Docker Compose
- `npm run redis:stop` - Stop Redis Docker container
- `npm run redis:logs` - View Redis logs
- `npm run redis:setup` - Setup Redis with namespaces
- `npm run redis:test` - Test Redis functionality

### Testing
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:contract` - Run contract tests

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### API Documentation
- `npm run openapi:gen` - Generate OpenAPI specification
- `npm run openapi:check` - Check if OpenAPI spec is up to date

## 🔐 Environment Variables

### Required
- `DATABASE_URL` - Database connection string
- `SESSION_SECRET` - Session encryption secret
- `CSRF_SECRET` - CSRF protection secret

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5001)
- `REDIS_URL` - Redis connection string (default: redis://localhost:6379)
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)
- `FRONTEND_URL` - Frontend URL for CORS
- `WS_USE_REDIS_ADAPTER` - Enable Redis adapter for Socket.IO (default: false)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)

## 🚦 API Endpoints

### Authentication (`/api/v1/auth`)
- `GET /csrf-token` - Get CSRF token
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /me` - Get current user
- `POST /change-password` - Change password
- `GET /status` - Authentication status
- `POST /setup` - Admin setup
- `GET /setup/status` - Setup status
- `POST /reset-password` - Reset password

### Servers (`/api/v1/servers`)
- `GET /` - List servers
- `POST /` - Create server
- `GET /:id` - Get server details
- `PUT /:id` - Update server
- `DELETE /:id` - Delete server
- `POST /:id/start` - Start server
- `POST /:id/stop` - Stop server
- `GET /:id/status` - Get server status
- `POST /:id/backup` - Backup server
- `POST /:id/accept-eula` - Accept EULA
- `GET /versions` - Get available versions
- `GET /memory-usage` - Get memory usage

### Admin (`/api/v1/admin`)
- `GET /users` - List users
- `POST /users` - Create user
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `GET /config` - Get system config
- `PUT /config` - Update system config
- `GET /stats` - Get system stats

## 🔄 Migration from Flask

This backend implements the strangler pattern to gradually replace the Flask backend:

1. **Phase 0**: Contract testing and infrastructure setup ✅
2. **Phase 1**: Foundation and core setup
3. **Phase 2**: API migration with contract testing
4. **Phase 3**: Process management and system integration
5. **Phase 4**: Real-time features and background processing
6. **Phase 5**: Production readiness and cutover

### Contract Testing

The migration uses contract testing to ensure API compatibility:

```bash
# Capture Flask API baseline
python3 ../scripts/contract_testing.py --baseline-capture

# Compare with Express API
python3 ../scripts/contract_testing.py --compare http://localhost:5001
```

## 🧪 Testing

### Contract Tests
Ensure API compatibility with Flask backend:
```bash
npm run test:contract
```

### Unit Tests
Test individual components:
```bash
npm run test
```

### Integration Tests
Test complete workflows:
```bash
npm run test:integration
```

## 📊 Monitoring

### Health Checks
- `GET /healthz` - Quick health check
- `GET /readyz` - Readiness check (DB, Redis, etc.)

### Metrics
- Prometheus metrics available at `/metrics`
- Custom gauges for servers, memory usage, etc.

## 🔒 Security

- CSRF protection on state-changing operations
- Rate limiting on authentication endpoints
- Input validation with Zod schemas
- SQL injection protection via Prisma
- XSS protection via Helmet.js
- Secure session management

## 📝 Logging

Logs are written to:
- Console (development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

Log levels: `debug`, `info`, `warn`, `error`

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

### Docker
```bash
docker build -t mcserver-backend .
docker run -p 5001:5001 mcserver-backend
```

## 🤝 Contributing

1. Follow the existing code style
2. Add tests for new features
3. Update documentation
4. Run contract tests before submitting

## 📚 Documentation

- [API Documentation](./docs/openapi.json)
- [Contract Testing Guide](../docs/contracts/README.md)
- [Backend Enhancement Plan](../docs/plans/BACKEND_ENHANCEMENT_PLAN.md)

---

**Status**: Phase 0, Task 0.2 - SQLite Database Setup ✅
