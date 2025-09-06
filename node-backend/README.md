# Minecraft Server Manager - Node.js Backend

A modern Node.js/Express backend for the Minecraft Server Manager, built with TypeScript and designed for production scalability.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ 
- npm 9+
- Redis 7+
- SQLite (development) / PostgreSQL (production)

### Installation

1. **Clone and navigate to the backend directory:**
   ```bash
   cd node-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database:**
   ```bash
   npm run setup:db
   ```

5. **Start Redis (using Docker):**
   ```bash
   npm run redis:start
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will be available at `http://localhost:5001`

## 📁 Project Structure

```
node-backend/
├── src/                    # Source code
│   ├── config/            # Configuration management
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Express middleware
│   ├── models/           # Data models and types
│   ├── routes/           # API routes
│   ├── schemas/          # Zod validation schemas
│   ├── services/         # Business logic
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── tests/            # Test setup and utilities
│   ├── app.ts            # Express app configuration
│   └── index.ts          # Application entry point
├── prisma/               # Database schema and migrations
├── scripts/              # Utility scripts
├── docs/                 # Documentation
├── dist/                 # Compiled JavaScript (generated)
└── logs/                 # Application logs
```

## 🛠️ Development

### Available Scripts

#### Development
- `npm run dev` - Start development server with hot reload
- `npm run dev:debug` - Start development server with debugging
- `npm run build` - Build for production
- `npm run build:watch` - Build with file watching

#### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:ui` - Run tests with UI interface
- `npm run test:contract` - Run contract tests
- `npm run test:all` - Run all tests

#### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run type-check` - Run TypeScript type checking
- `npm run validate` - Run all quality checks

#### Database
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:reset` - Reset database

#### Redis
- `npm run redis:start` - Start Redis with Docker
- `npm run redis:stop` - Stop Redis
- `npm run redis:test` - Test Redis connection

#### Docker
- `npm run docker:build` - Build Docker image
- `npm run docker:up` - Start with Docker Compose
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

### Environment Variables

Create a `.env` file based on `env.example`:

```bash
# Application
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL=file:./dev.db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
SESSION_SECRET=your-secure-session-secret
CSRF_SECRET=your-secure-csrf-secret

# Frontend
FRONTEND_URL=http://localhost:3000

# WebSocket
WS_USE_REDIS_ADAPTER=false

# Logging
LOG_LEVEL=debug
```

## 🏗️ Architecture

### Technology Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js 4.18+
- **Database**: Prisma ORM with SQLite (dev) / PostgreSQL (prod)
- **Cache/Sessions**: Redis 7+
- **Real-time**: Socket.io for WebSocket, SSE for logs
- **Background Jobs**: BullMQ with Redis
- **Validation**: Zod schemas with OpenAPI generation
- **Testing**: Vitest with Supertest
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

### Key Features

- **Type Safety**: Full TypeScript integration with strict mode
- **API Validation**: Zod schemas with automatic OpenAPI generation
- **Real-time Updates**: WebSocket for stats, SSE for logs
- **Background Processing**: BullMQ for async tasks
- **Security**: Helmet, CORS, rate limiting, CSRF protection
- **Monitoring**: Health checks, metrics, structured logging
- **Testing**: Comprehensive test suite with contract testing
- **Docker**: Production-ready containerization

## 🔧 Configuration

### Database Configuration

The application uses Prisma ORM with support for:
- SQLite (development)
- PostgreSQL (production)

Database configuration is managed in `prisma/schema.prisma` and environment variables.

### Redis Configuration

Redis is used for:
- Session storage
- Caching
- WebSocket pub/sub
- Background job queues

Configuration is managed in `src/config/redis.ts` with namespace separation.

### Security Configuration

Security features include:
- Helmet.js for security headers
- CORS configuration
- Rate limiting
- CSRF protection
- Session management
- Input validation with Zod

## 🧪 Testing

### Test Structure

- **Unit Tests**: `src/**/*.test.ts`
- **Integration Tests**: `src/**/*.spec.ts`
- **Contract Tests**: `scripts/**/*.test.ts`

### Running Tests

```bash
# Run all tests
npm run test:all

# Run with coverage
npm run test:coverage

# Run contract tests
npm run test:contract
```

### Test Configuration

- **Vitest**: Main testing framework
- **Supertest**: HTTP testing
- **Test Database**: Separate SQLite database
- **Test Redis**: Isolated Redis instance

## 🚀 Deployment

### Docker Deployment

1. **Build the image:**
   ```bash
   npm run docker:build
   ```

2. **Run with Docker Compose:**
   ```bash
   npm run docker:up
   ```

### Production Deployment

1. **Set production environment:**
   ```bash
   export NODE_ENV=production
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   npm run start:prod
   ```

### Environment Setup

For production deployment:
- Use PostgreSQL instead of SQLite
- Configure Redis with persistence
- Set secure session secrets
- Enable Redis adapter for WebSocket scaling
- Configure proper logging levels

## 📊 Monitoring

### Health Checks

- `/healthz` - Quick health check
- `/readyz` - Readiness check (database, Redis)
- `/live` - Liveness check

### Metrics

The application exposes Prometheus metrics for:
- HTTP request duration
- Request counts
- Server status
- Memory usage
- Active connections

### Logging

Structured logging with Winston:
- Console output (development)
- File rotation (production)
- Different log levels
- Request/response logging

## 🔄 Migration from Flask

This backend is designed to replace the existing Flask backend using a strangler pattern:

1. **Phase 0**: Infrastructure setup ✅
2. **Phase 1**: Foundation & Setup (current)
3. **Phase 2**: API Migration
4. **Phase 3**: Process Management
5. **Phase 4**: Real-time Features
6. **Phase 5**: Production Cutover

### Contract Testing

API contracts are validated against the Flask baseline to ensure compatibility during migration.

## 🤝 Contributing

1. **Code Style**: Follow ESLint and Prettier configurations
2. **Testing**: Write tests for new features
3. **Documentation**: Update README and code comments
4. **Type Safety**: Maintain strict TypeScript compliance

### Development Workflow

1. Create feature branch
2. Make changes with tests
3. Run quality checks: `npm run validate`
4. Run tests: `npm run test:all`
5. Submit pull request

## 📚 API Documentation

API documentation is automatically generated from Zod schemas and available at:
- OpenAPI JSON: `/docs/openapi.json`
- OpenAPI YAML: `/docs/openapi.yaml`

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection**: Ensure SQLite file permissions
2. **Redis Connection**: Check Redis is running on correct port
3. **Port Conflicts**: Verify port 5001 is available
4. **Type Errors**: Run `npm run type-check`

### Debug Mode

Start with debugging enabled:
```bash
npm run dev:debug
```

Then attach debugger to `localhost:9229`

### Logs

Check application logs in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## 📄 License

This project is part of the Minecraft Server Manager and follows the same license terms.