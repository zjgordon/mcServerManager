# Routing Setup Guide

This guide covers setting up Nginx/Caddy reverse proxy configuration for the Minecraft Server Manager strangler pattern migration from Flask to Node.js/Express.

## 🚀 Quick Start

### Option 1: Nginx (Recommended)

```bash
# Start with Nginx
docker-compose -f docker-compose.proxy.yml up -d nginx

# Check status
docker-compose -f docker-compose.proxy.yml logs nginx
```

### Option 2: Caddy

```bash
# Start with Caddy
docker-compose -f docker-compose.proxy.yml --profile caddy up -d caddy

# Check status
docker-compose -f docker-compose.proxy.yml --profile caddy logs caddy
```

## 🔧 Configuration

### Strangler Pattern Phases

The routing configuration supports 6 phases of migration:

#### Phase 0-1: Contract Testing & Infrastructure
- **All endpoints**: Routed to Flask backend
- **Purpose**: Establish baseline and infrastructure
- **Endpoints**: All `/api/v1/*` routes to Flask

#### Phase 2: API Migration with Contract Testing
- **Authentication**: `/api/v1/auth/*` → Express
- **Server Management**: `/api/v1/servers/*` → Express
- **Admin**: `/api/v1/admin/*` → Express
- **Purpose**: Migrate critical endpoints with contract testing

#### Phase 3: Process Management & System Integration
- **Same as Phase 2** with enhanced process management
- **Purpose**: Complete server lifecycle management

#### Phase 4: Real-time & Background Processing
- **SSE Logs**: `/api/v1/servers/*/logs` → Express
- **WebSocket**: `/socket.io/*` → Express
- **Purpose**: Add real-time capabilities

#### Phase 5: Production Readiness & Cutover
- **All endpoints**: `/api/v1/*` → Express
- **Purpose**: Complete migration to Express

### Environment Variables

```bash
# Production
NGINX_WORKER_PROCESSES=auto
NGINX_WORKER_CONNECTIONS=1024
NGINX_KEEPALIVE_TIMEOUT=65

# Development
NGINX_DEV_MODE=true
NGINX_DEBUG_LOGGING=true
```

## 🧪 Testing Routing Configuration

### 1. Test Current Phase
```bash
# Check current routing status
python scripts/manage-routing.py status

# Test endpoint routing
curl -I http://localhost/api/v1/auth/login
curl -I http://localhost/api/v1/servers
curl -I http://localhost/api/v1/admin/users
```

### 2. Migrate to Next Phase
```bash
# Migrate to Phase 2 (API Migration)
python scripts/manage-routing.py migrate 2

# Verify migration
python scripts/manage-routing.py status
```

### 3. Rollback if Needed
```bash
# Rollback to Phase 1
python scripts/manage-routing.py rollback 1

# Verify rollback
python scripts/manage-routing.py status
```

## 📊 Routing Management

### Available Commands

```bash
# Show current status
python scripts/manage-routing.py status

# Migrate to specific phase
python scripts/manage-routing.py migrate <phase>

# Rollback to specific phase
python scripts/manage-routing.py rollback <phase>

# Show migration history
python scripts/manage-routing.py history
```

### Phase Management

```bash
# Phase 0: All Flask
python scripts/manage-routing.py migrate 0

# Phase 2: Critical endpoints to Express
python scripts/manage-routing.py migrate 2

# Phase 4: Add real-time endpoints
python scripts/manage-routing.py migrate 4

# Phase 5: Complete migration
python scripts/manage-routing.py migrate 5
```

## 🔍 Monitoring

### Health Checks

```bash
# Quick health check
curl http://localhost/healthz

# Detailed readiness check
curl http://localhost/readyz

# Backend health
curl http://localhost:5000/health  # Flask
curl http://localhost:5001/healthz # Express
```

### Logs

```bash
# Nginx logs
docker-compose -f docker-compose.proxy.yml logs nginx

# Caddy logs
docker-compose -f docker-compose.proxy.yml --profile caddy logs caddy

# Access logs
tail -f nginx/logs/access.log
tail -f caddy/logs/access.log
```

### Metrics

```bash
# Nginx metrics
curl http://localhost/nginx_status

# Caddy metrics
curl http://localhost:2019/metrics

# Application metrics
curl http://localhost:5001/metrics
```

## 🛠️ Development Workflow

### 1. Start Development Environment
```bash
# Start all services
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose -f docker-compose.dev.yml ps
```

### 2. Test Routing Changes
```bash
# Make routing changes
python scripts/manage-routing.py migrate 2

# Test endpoints
curl -I http://localhost/api/v1/auth/login
curl -I http://localhost/api/v1/servers

# Check logs
docker-compose -f docker-compose.dev.yml logs nginx-dev
```

### 3. Debug Issues
```bash
# Check configuration
docker-compose -f docker-compose.dev.yml exec nginx-dev nginx -t

# Reload configuration
docker-compose -f docker-compose.dev.yml exec nginx-dev nginx -s reload

# Check backend connectivity
docker-compose -f docker-compose.dev.yml exec nginx-dev ping flask-dev
docker-compose -f docker-compose.dev.yml exec nginx-dev ping express-dev
```

## 🚨 Troubleshooting

### Common Issues

#### 502 Bad Gateway
```bash
# Check if backends are running
docker-compose -f docker-compose.proxy.yml ps

# Check backend health
curl http://localhost:5000/health  # Flask
curl http://localhost:5001/healthz # Express

# Check logs
docker-compose -f docker-compose.proxy.yml logs flask
docker-compose -f docker-compose.proxy.yml logs express
```

#### 504 Gateway Timeout
```bash
# Check proxy timeouts
grep -n "proxy_read_timeout" nginx/nginx.conf

# Increase timeouts if needed
# proxy_read_timeout 120s;
# proxy_send_timeout 120s;
```

#### Configuration Errors
```bash
# Test Nginx configuration
docker-compose -f docker-compose.proxy.yml exec nginx nginx -t

# Test Caddy configuration
docker-compose -f docker-compose.proxy.yml --profile caddy exec caddy caddy validate --config /etc/caddy/Caddyfile
```

### Performance Issues

#### High Response Times
```bash
# Check upstream health
curl http://localhost/readyz

# Check rate limiting
grep -n "limit_req" nginx/nginx.conf

# Monitor logs
tail -f nginx/logs/access.log | grep -E "(rt=|urt=)"
```

#### Memory Usage
```bash
# Check Nginx memory
docker stats nginx

# Check Caddy memory
docker stats caddy

# Optimize worker processes
# worker_processes auto;
# worker_connections 1024;
```

## 📚 Configuration Reference

### Nginx Configuration

```nginx
# Main server block
server {
    listen 80;
    server_name localhost;
    
    # API routing with strangler pattern
    location /api/v1/ {
        # Default to Flask backend (Phase 0-1)
        proxy_pass http://flask_backend;
        
        # Phase 2+: Route to Express
        # proxy_pass http://express_backend;
    }
    
    # Authentication endpoints
    location /api/v1/auth/ {
        proxy_pass http://flask_backend;
        # proxy_pass http://express_backend; # Phase 2+
    }
    
    # Server management endpoints
    location /api/v1/servers/ {
        proxy_pass http://flask_backend;
        # proxy_pass http://express_backend; # Phase 2+
    }
    
    # Admin endpoints
    location /api/v1/admin/ {
        proxy_pass http://flask_backend;
        # proxy_pass http://express_backend; # Phase 2+
    }
    
    # SSE endpoints (Express only)
    location /api/v1/servers/*/logs {
        proxy_pass http://express_backend;
        proxy_buffering off;
    }
    
    # WebSocket endpoints (Express only)
    location /socket.io/ {
        proxy_pass http://express_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Caddy Configuration

```caddy
:80 {
    # API routing with strangler pattern
    handle /api/v1/* {
        # Default to Flask backend (Phase 0-1)
        reverse_proxy flask:5000
        
        # Phase 2+: Route to Express
        # reverse_proxy express:5001
    }
    
    # Authentication endpoints
    handle /api/v1/auth/* {
        reverse_proxy flask:5000
        # reverse_proxy express:5001 # Phase 2+
    }
    
    # Server management endpoints
    handle /api/v1/servers/* {
        reverse_proxy flask:5000
        # reverse_proxy express:5001 # Phase 2+
    }
    
    # Admin endpoints
    handle /api/v1/admin/* {
        reverse_proxy flask:5000
        # reverse_proxy express:5001 # Phase 2+
    }
    
    # SSE endpoints (Express only)
    handle /api/v1/servers/*/logs {
        reverse_proxy express:5001
    }
    
    # WebSocket endpoints (Express only)
    handle /socket.io/* {
        reverse_proxy express:5001
    }
}
```

## 🔐 Security Considerations

### Rate Limiting
- **API endpoints**: 10 requests/second
- **Authentication**: 5 requests/second
- **Admin endpoints**: 2 requests/second

### Security Headers
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin

### SSL/TLS (Production)
```nginx
# SSL configuration
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
}
```

## 📖 Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Caddy Documentation](https://caddyserver.com/docs/)
- [Strangler Pattern](https://martinfowler.com/bliki/StranglerFigApplication.html)
- [Reverse Proxy Best Practices](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)

---

**Status**: Phase 0, Task 0.4 - Nginx/Caddy Configuration ✅

