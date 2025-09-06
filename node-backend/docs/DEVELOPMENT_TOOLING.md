# Development Tooling Guide

This document provides comprehensive guidance on the development tooling and build system for the Minecraft Server Manager Node.js/Express backend.

## 🛠️ Overview

The project includes a complete development tooling suite with:
- **Build System**: TypeScript compilation with optimization
- **Development Environment**: Hot reload, debugging, and file watching
- **Testing Infrastructure**: Comprehensive testing with coverage reporting
- **Code Quality**: Automated linting, formatting, and type checking
- **Deployment**: Docker-based deployment with optimization
- **Monitoring**: System monitoring and logging configuration

## 📦 Build System

### Production Build

The production build system provides optimized compilation for deployment:

```bash
# Run production build
npm run build:prod

# Build with custom configuration
ts-node scripts/build-production.ts
```

**Features:**
- TypeScript compilation with production optimizations
- Asset optimization and minification
- Prisma client generation
- Build validation and testing
- Build report generation
- Docker image optimization

### Development Build

For development, use the watch mode for continuous compilation:

```bash
# Development build with watch mode
npm run build:watch

# Type checking only
npm run type-check
```

## 🚀 Development Environment

### Development Server

Start the development server with hot reload and debugging:

```bash
# Standard development server
npm run dev

# Development server with debugging
npm run dev:debug

# Custom development server
ts-node scripts/dev-server.ts
```

**Features:**
- Hot reload on file changes
- TypeScript compilation with `--transpile-only`
- Debugging support on port 9229
- File watching with intelligent restart
- Environment validation
- Graceful shutdown handling

### Debugging

The development environment includes comprehensive debugging support:

```bash
# Start with debugging enabled
npm run dev:debug

# Connect debugger to localhost:9229
# Use VS Code debugger or Chrome DevTools
```

**Debug Configuration:**
- Node.js inspector on port 9229
- Source map support
- Breakpoint debugging
- Variable inspection
- Call stack tracing

## 🧪 Testing Infrastructure

### Test Runner

The comprehensive test runner supports multiple test types:

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run contract tests
npm run test:contract

# Custom test runner
ts-node scripts/test-runner.ts
```

**Test Types:**
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **Contract Tests**: API contract validation
- **Coverage Tests**: Code coverage analysis

### Coverage Reporting

The test system provides comprehensive coverage reporting:

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

**Coverage Features:**
- Line, branch, function, and statement coverage
- Per-file coverage thresholds
- HTML, JSON, and LCOV reports
- Coverage watermarks and quality gates
- CI/CD integration support

## 🔍 Code Quality Tools

### ESLint Configuration

The project includes comprehensive ESLint configurations:

```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Check ESLint with zero warnings
npm run lint:check

# Production ESLint (strict mode)
npm run lint:prod
```

**ESLint Features:**
- TypeScript-specific rules
- Production vs development configurations
- Custom rule overrides for tests and scripts
- Automatic fixing capabilities
- Integration with VS Code and other editors

### Prettier Configuration

Consistent code formatting with Prettier:

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

**Prettier Features:**
- Consistent code formatting
- TypeScript and JSON support
- Markdown and HTML formatting
- Editor integration
- CI/CD formatting checks

### Code Quality Runner

Comprehensive code quality analysis:

```bash
# Run code quality checks
ts-node scripts/code-quality.ts

# Run with fixes
ts-node scripts/code-quality.ts --fix

# Run in check mode
ts-node scripts/code-quality.ts --check

# Run in strict mode
ts-node scripts/code-quality.ts --strict
```

**Quality Features:**
- ESLint integration
- Prettier integration
- TypeScript type checking
- Quality scoring system
- Comprehensive reporting

## 🐳 Deployment System

### Docker Configuration

The project includes optimized Docker configurations:

```bash
# Build Docker image
npm run docker:build

# Run Docker container
npm run docker:run

# Docker Compose
npm run docker:up
npm run docker:down
```

**Docker Features:**
- Multi-stage builds for optimization
- Security-hardened containers
- Non-root user execution
- Health checks and monitoring
- Production and development configurations

### Deployment Script

Automated deployment with comprehensive validation:

```bash
# Full deployment
ts-node scripts/deploy.ts

# Deployment without tests
ts-node scripts/deploy.ts --no-test

# Deployment with Docker push
ts-node scripts/deploy.ts --push
```

**Deployment Features:**
- Build validation
- Test execution
- Docker image building
- Health check validation
- Deployment reporting
- Rollback capabilities

## 📊 Monitoring and Logging

### Monitoring System

Comprehensive system monitoring:

```bash
# Run monitoring checks
ts-node scripts/monitoring.ts

# Monitoring with alerts
ts-node scripts/monitoring.ts --alerts

# Monitoring dashboard
ts-node scripts/monitoring.ts --dashboard
```

**Monitoring Features:**
- Metrics endpoint monitoring
- Log file analysis
- Health check validation
- System resource monitoring
- Alert integration
- Dashboard support

### Logging Configuration

Structured logging with multiple outputs:

```bash
# View logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View combined logs
tail -f logs/combined.log
```

**Logging Features:**
- Structured JSON logging
- Multiple log levels
- File rotation and management
- Console and file outputs
- Performance monitoring
- Error tracking

## 🔧 Configuration Files

### TypeScript Configuration

- **`tsconfig.json`**: Development configuration
- **`tsconfig.prod.json`**: Production configuration
- **`tsconfig.scripts.json`**: Scripts configuration

### ESLint Configuration

- **`.eslintrc.js`**: Development ESLint rules
- **`.eslintrc.prod.js`**: Production ESLint rules (strict)

### Prettier Configuration

- **`.prettierrc`**: Code formatting rules

### Nodemon Configuration

- **`nodemon.json`**: Standard development configuration
- **`nodemon.dev.json`**: Enhanced development configuration

### Vitest Configuration

- **`vitest.config.ts`**: Main test configuration
- **`vitest.config.coverage.ts`**: Coverage test configuration
- **`vitest.contract.config.ts`**: Contract test configuration

### Docker Configuration

- **`Dockerfile`**: Standard Docker configuration
- **`Dockerfile.prod`**: Production Docker configuration
- **`docker-compose.yml`**: Production Docker Compose
- **`docker-compose.redis.yml`**: Redis development setup

## 📋 Available Scripts

### Development Scripts

```bash
npm run dev              # Start development server
npm run dev:debug        # Start with debugging
npm run build            # Build application
npm run build:watch      # Build with watch mode
npm run build:prod       # Production build
npm run start            # Start production server
npm run start:prod       # Start with production environment
```

### Testing Scripts

```bash
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage
npm run test:ui          # Run tests with UI
npm run test:contract    # Run contract tests
npm run test:all         # Run all tests
```

### Code Quality Scripts

```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run lint:check       # Check with zero warnings
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run type-check       # TypeScript type checking
npm run validate         # Run all quality checks
```

### Database Scripts

```bash
npm run db:migrate       # Run database migrations
npm run db:generate      # Generate Prisma client
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
npm run db:reset         # Reset database
npm run db:deploy        # Deploy migrations
```

### Docker Scripts

```bash
npm run docker:build     # Build Docker image
npm run docker:run       # Run Docker container
npm run docker:up        # Start with Docker Compose
npm run docker:down      # Stop Docker Compose
npm run docker:logs      # View Docker logs
npm run docker:clean     # Clean Docker resources
```

### Utility Scripts

```bash
npm run clean            # Clean build artifacts
npm run precommit        # Pre-commit checks
npm run ci               # CI/CD pipeline
npm run smoke            # Smoke tests
npm run validate         # Full validation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 8+
- Docker (optional)
- Redis (for development)

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd node-backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run setup:db

# Start development server
npm run dev
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Run Tests**
   ```bash
   npm run test:watch
   ```

3. **Check Code Quality**
   ```bash
   npm run validate
   ```

4. **Build for Production**
   ```bash
   npm run build:prod
   ```

5. **Deploy**
   ```bash
   ts-node scripts/deploy.ts
   ```

## 🔍 Troubleshooting

### Common Issues

**Build Failures:**
- Check TypeScript configuration
- Verify all dependencies are installed
- Run `npm run clean` and rebuild

**Test Failures:**
- Check test database configuration
- Verify Redis is running
- Run tests individually to isolate issues

**Docker Issues:**
- Check Docker daemon is running
- Verify Dockerfile syntax
- Check port conflicts

**Development Server Issues:**
- Check port availability
- Verify environment variables
- Check file permissions

### Debug Mode

Enable debug mode for detailed logging:

```bash
DEBUG=app:* npm run dev
```

### Log Analysis

View and analyze logs:

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Combined logs
tail -f logs/combined.log
```

## 📚 Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/docs/)

## 🤝 Contributing

When contributing to the project:

1. Follow the established code quality standards
2. Run all tests before submitting
3. Ensure code coverage meets requirements
4. Update documentation as needed
5. Follow the commit message conventions

For more information, see the main project documentation.
