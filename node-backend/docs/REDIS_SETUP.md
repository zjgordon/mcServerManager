# Redis Setup Guide

This guide covers setting up Redis for the Minecraft Server Manager Node.js backend with proper namespace configuration.

## 🚀 Quick Start

### Option 1: Docker (Recommended for Development)

```bash
# Start Redis with Docker Compose
npm run redis:start

# Check Redis status
npm run redis:logs

# Stop Redis
npm run redis:stop
```

### Option 2: Local Installation

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### macOS
```bash
brew install redis
brew services start redis
```

#### Windows
Download Redis from [redis.io](https://redis.io/download) or use WSL.

## 🔧 Configuration

### Environment Variables

Update your `.env` file:

```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# WebSocket Redis Adapter (for scaling)
WS_USE_REDIS_ADAPTER=false
```

### Redis Namespaces

The application uses the following Redis namespaces:

- **Cache**: `mc:cache:` - Application caching
- **Jobs**: `mc:jobs:` - Background job queues
- **WebSocket**: `mc:ws:` - WebSocket pub/sub
- **Sessions**: `mc:sessions:` - User sessions

## 🧪 Testing Redis Setup

### 1. Test Redis Connection
```bash
npm run redis:test
```

### 2. Setup Redis with Initial Data
```bash
npm run redis:setup setup
```

### 3. View Redis Information
```bash
npm run redis:setup info
```

### 4. Clear All Namespace Data
```bash
npm run redis:setup clear
```

## 📊 Redis Management

### Redis Commander (Web UI)

When using Docker Compose, Redis Commander is available at:
- **URL**: http://localhost:8081
- **Username**: admin
- **Password**: admin123

### Command Line Tools

```bash
# Connect to Redis CLI
redis-cli

# Test connection
redis-cli ping

# View all keys
redis-cli keys "*"

# View namespace keys
redis-cli keys "mc:cache:*"
redis-cli keys "mc:jobs:*"
redis-cli keys "mc:ws:*"
redis-cli keys "mc:sessions:*"

# Get Redis info
redis-cli info
```

## 🔍 Monitoring

### Health Checks

The application includes Redis health checks:

```typescript
import { checkRedisHealth } from './src/config/redis';

const isHealthy = await checkRedisHealth();
console.log('Redis healthy:', isHealthy);
```

### Performance Monitoring

```typescript
import { CacheService } from './src/config/redis';

const cacheService = new CacheService(redisClient);
const stats = await cacheService.getStats();
console.log('Cache stats:', stats);
```

## 🛠️ Development Workflow

### 1. Start Development Environment
```bash
# Start Redis
npm run redis:start

# Setup Redis with initial data
npm run redis:setup setup

# Start the Node.js backend
npm run dev
```

### 2. Testing
```bash
# Run Redis tests
npm run redis:test

# Run database tests
npm run test:db

# Run all tests
npm test
```

### 3. Debugging
```bash
# View Redis logs
npm run redis:logs

# Connect to Redis CLI
redis-cli

# View Redis Commander
open http://localhost:8081
```

## 🚨 Troubleshooting

### Common Issues

#### Redis Connection Refused
```bash
# Check if Redis is running
redis-cli ping

# Start Redis if not running
npm run redis:start
# or
sudo systemctl start redis
```

#### Port Already in Use
```bash
# Check what's using port 6379
lsof -i :6379

# Kill the process or change Redis port
```

#### Memory Issues
```bash
# Check Redis memory usage
redis-cli info memory

# Clear all data (development only)
redis-cli flushall
```

### Performance Issues

#### Slow Redis Operations
- Check Redis memory usage
- Monitor Redis logs for errors
- Consider increasing Redis memory limit
- Check network latency

#### High Memory Usage
- Review cache TTL settings
- Implement cache eviction policies
- Monitor namespace key counts

## 📚 Redis Configuration

### Production Settings

For production, update `redis.conf`:

```conf
# Security
requirepass your-secure-password

# Memory
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
```

### Development Settings

The included `redis.conf` is optimized for development:

- No password required
- 256MB memory limit
- Basic persistence
- Verbose logging

## 🔐 Security Considerations

### Development
- No authentication required
- Bind to localhost only
- Basic logging

### Production
- Enable authentication
- Use strong passwords
- Enable SSL/TLS
- Restrict network access
- Regular security updates

## 📖 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Commands](https://redis.io/commands)
- [Redis Configuration](https://redis.io/topics/config)
- [Redis Persistence](https://redis.io/topics/persistence)
- [Redis Pub/Sub](https://redis.io/topics/pubsub)

---

**Status**: Phase 0, Task 0.3 - Redis Configuration ✅

