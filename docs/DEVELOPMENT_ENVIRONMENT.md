# Development Environment Setup

This document describes the dual-backend development environment for the Minecraft Server Manager, supporting both Flask (Python) and Express (Node.js) backends running simultaneously.

## 🎯 Overview

The development environment supports the **strangler pattern** migration from Flask to Express by running both backends simultaneously:

- **Flask Backend**: Port 5000 (existing Python backend)
- **Express Backend**: Port 5001 (new Node.js backend)
- **Frontend**: Port 3000 (React development server)
- **Redis**: Port 6379 (caching and session storage)

## 🚀 Quick Start

### 1. Start the Development Environment

```bash
# Start both backends with all dependencies
./scripts/start-dev-environment.sh
```

This script will:
- ✅ Check and install Node.js dependencies
- ✅ Start Redis (if not running)
- ✅ Setup Node.js database
- ✅ Start Flask backend on port 5000
- ✅ Start Express backend on port 5001
- ✅ Validate both services are running

### 2. Validate the Environment

```bash
# Check that both backends are running and healthy
./scripts/validate-dev-environment.py
```

### 3. Stop the Development Environment

```bash
# Stop both backends
./scripts/stop-dev-environment.sh
```

## 📊 Service Endpoints

### Flask Backend (Port 5000)
- **API Base**: http://localhost:5000/api/v1
- **Health Check**: http://localhost:5000/healthz
- **Root**: http://localhost:5000

### Express Backend (Port 5001)
- **API Base**: http://localhost:5001/api/v1
- **Health Check**: http://localhost:5001/healthz
- **Root**: http://localhost:5001

### Development Tools
- **Redis**: redis://localhost:6379
- **Redis Commander**: http://localhost:8081 (if running)
- **Frontend**: http://localhost:3000 (React dev server)

## 🛠️ Manual Setup

If you prefer to start services manually:

### 1. Start Redis

```bash
# Using Docker (recommended)
cd node-backend
npm run redis:start

# Or start Redis manually
redis-server
```

### 2. Setup Node.js Backend

```bash
cd node-backend

# Install dependencies
npm install

# Setup database
npm run setup:db

# Create environment file
cp env.example .env

# Start development server
npm run dev
```

### 3. Start Flask Backend

```bash
# Activate virtual environment
source venv/bin/activate

# Start Flask server
python run.py
```

## 🔧 Configuration

### Environment Variables

#### Flask Backend
The Flask backend uses the existing configuration in `app/config.py` and environment variables.

#### Express Backend
The Express backend uses `node-backend/.env` file with the following key variables:

```bash
# Environment
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL=file:./dev.db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Session & Security
SESSION_SECRET=dev-session-secret-change-in-production
CSRF_SECRET=dev-csrf-secret-change-in-production

# CORS
FRONTEND_URL=http://localhost:3000

# WebSocket
WS_USE_REDIS_ADAPTER=false

# Logging
LOG_LEVEL=debug
```

### Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Flask | 5000 | Existing Python backend |
| Express | 5001 | New Node.js backend |
| Frontend | 3000 | React development server |
| Redis | 6379 | Caching and sessions |
| Redis Commander | 8081 | Redis web UI |

## 🔄 Development Workflow

### 1. API Development

When developing new API endpoints:

1. **Implement in Express** (port 5001) first
2. **Test with contract testing** to ensure compatibility
3. **Update routing configuration** to point to Express
4. **Validate with frontend** integration

### 2. Contract Testing

```bash
# Test API compatibility between Flask and Express
python scripts/contract_testing.py

# Run smoke tests
python scripts/smoke_test_cli.py
```

### 3. Routing Management

```bash
# Test current routing configuration
python scripts/test-routing.py

# Manage migration phases
python scripts/manage-routing.py
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the ports
lsof -i :5000
lsof -i :5001

# Kill processes if needed
pkill -f "python.*run.py"
pkill -f "ts-node.*src/index.ts"
```

#### 2. Redis Connection Issues

```bash
# Check Redis status
redis-cli ping

# Start Redis with Docker
cd node-backend
npm run redis:start
```

#### 3. Database Issues

```bash
# Reset Node.js database
cd node-backend
npm run db:reset
npm run setup:db
```

#### 4. Node.js Dependencies

```bash
# Reinstall dependencies
cd node-backend
rm -rf node_modules package-lock.json
npm install
```

### Validation Script

The validation script provides detailed diagnostics:

```bash
# Run comprehensive validation
./scripts/validate-dev-environment.py

# Check results
cat dev-environment-validation.json
```

## 📁 Project Structure

```
mcServerManager/
├── app/                          # Flask backend (Python)
│   ├── __init__.py
│   ├── config.py
│   ├── models.py
│   └── routes/
├── node-backend/                 # Express backend (Node.js)
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   └── routes/
│   ├── prisma/
│   ├── package.json
│   └── .env
├── frontend/                     # React frontend
├── scripts/                      # Development scripts
│   ├── start-dev-environment.sh
│   ├── stop-dev-environment.sh
│   └── validate-dev-environment.py
├── nginx/                        # Reverse proxy configs
├── caddy/                        # Alternative reverse proxy
└── docs/                         # Documentation
```

## 🔐 Security Considerations

### Development vs Production

- **Development**: Relaxed CORS, debug logging, HTTP cookies
- **Production**: Strict CORS, secure cookies, HTTPS only

### Environment Variables

- Never commit `.env` files to version control
- Use strong secrets in production
- Rotate secrets regularly

## 📚 Additional Resources

- [Flask API Documentation](docs/contracts/flask_api_baseline.md)
- [Routing Setup Guide](docs/ROUTING_SETUP.md)
- [Redis Setup Guide](node-backend/docs/REDIS_SETUP.md)
- [Contract Testing Guide](docs/contracts/README.md)

## 🆘 Getting Help

If you encounter issues:

1. **Check the logs** for both backends
2. **Run the validation script** for diagnostics
3. **Check the troubleshooting section** above
4. **Review the documentation** in the `docs/` directory

## 🎉 Success Criteria

Your development environment is ready when:

- ✅ Both Flask (port 5000) and Express (port 5001) are running
- ✅ Health checks return 200 OK for both services
- ✅ Redis is accessible and responding
- ✅ Database connections are working
- ✅ Validation script passes all checks
- ✅ Frontend can connect to both backends
