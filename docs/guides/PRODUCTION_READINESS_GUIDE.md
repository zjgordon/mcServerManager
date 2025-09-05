# Minecraft Server Manager - Production Readiness Guide

This comprehensive guide provides everything needed to deploy the Minecraft Server Manager application in a production environment with enterprise-grade reliability, security, and performance.

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [System Requirements](#system-requirements)
4. [Security Hardening](#security-hardening)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring and Alerting](#monitoring-and-alerting)
7. [Backup and Recovery](#backup-and-recovery)
8. [Deployment Process](#deployment-process)
9. [Post-Deployment Validation](#post-deployment-validation)
10. [Maintenance and Updates](#maintenance-and-updates)
11. [Troubleshooting](#troubleshooting)
12. [Best Practices](#best-practices)

## Overview

The Minecraft Server Manager production deployment includes:

- **Automated Deployment**: One-command deployment with comprehensive setup
- **Security Hardening**: Production-grade security configurations
- **Performance Optimization**: Optimized for high-load production environments
- **Monitoring**: Comprehensive health checks and performance monitoring
- **Backup System**: Automated backup and recovery capabilities
- **Validation**: Production testing and validation framework

## Pre-Deployment Checklist

### System Requirements Verification

- [ ] **Operating System**: Ubuntu 20.04+ LTS, CentOS 8+, or RHEL 8+
- [ ] **Python**: Version 3.8 or higher
- [ ] **Java**: OpenJDK 11 or higher
- [ ] **Node.js**: Version 20.19+ (for frontend)
- [ ] **Memory**: Minimum 4GB RAM, recommended 8GB+
- [ ] **Storage**: Minimum 20GB free space, recommended 50GB+
- [ ] **Network**: Stable internet connection with proper firewall configuration

### Security Prerequisites

- [ ] **Firewall**: UFW or iptables configured
- [ ] **SSL Certificate**: Valid SSL certificate for HTTPS
- [ ] **Domain Name**: Properly configured domain name
- [ ] **User Account**: Non-root user account for application
- [ ] **SSH Access**: Secure SSH configuration

### Environment Preparation

- [ ] **Environment Variables**: Production environment variables configured
- [ ] **Database**: PostgreSQL or MySQL database (optional, SQLite default)
- [ ] **Redis**: Redis server for caching and rate limiting
- [ ] **Nginx**: Web server for reverse proxy
- [ ] **Systemd**: Service management configuration

## System Requirements

### Minimum Requirements

**Hardware:**
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **Network**: 100 Mbps

**Software:**
- **OS**: Ubuntu 20.04+ LTS, CentOS 8+, RHEL 8+
- **Python**: 3.8+
- **Java**: OpenJDK 11+
- **Node.js**: 20.19+
- **Database**: SQLite (default) or PostgreSQL/MySQL
- **Web Server**: Nginx 1.18+

### Recommended Requirements

**Hardware:**
- **CPU**: 4+ cores, 3.0+ GHz
- **RAM**: 8GB+
- **Storage**: 50GB+ SSD
- **Network**: 1 Gbps

**Software:**
- **OS**: Ubuntu 22.04+ LTS
- **Python**: 3.11+
- **Java**: OpenJDK 17+
- **Node.js**: 20.19+
- **Database**: PostgreSQL 14+
- **Web Server**: Nginx 1.20+
- **Redis**: 6.0+

### Production Environment Variables

Create a `.env` file with the following variables:

```bash
# Application Configuration
FLASK_ENV=production
SECRET_KEY=your-super-secure-secret-key-here
DATABASE_URL=postgresql://user:password@localhost/mcservermanager

# Security Configuration
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax
CORS_ORIGINS=https://yourdomain.com

# Performance Configuration
WORKERS=4
WORKER_CONNECTIONS=1000
TIMEOUT=30
KEEPALIVE=2

# Memory Management
MAX_TOTAL_MEMORY_MB=16384
DEFAULT_SERVER_MEMORY_MB=1024
MIN_SERVER_MEMORY_MB=512
MAX_SERVER_MEMORY_MB=4096

# Monitoring and Logging
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
ENABLE_METRICS=True

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_COMPRESSION=True
BACKUP_ENCRYPTION=False

# Email Configuration (Optional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Redis Configuration
REDIS_URL=redis://localhost:6379/0

# SSL Configuration
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

## Security Hardening

### 1. System Security

**Firewall Configuration:**
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow application port (if not using reverse proxy)
sudo ufw allow 5000/tcp

# Check firewall status
sudo ufw status
```

**User Security:**
```bash
# Create application user
sudo useradd -r -s /bin/bash -d /opt/mcservermanager -m mcserver

# Set secure permissions
sudo chown -R mcserver:mcserver /opt/mcservermanager
sudo chmod 755 /opt/mcservermanager
sudo chmod 600 /opt/mcservermanager/.env
```

### 2. Application Security

**File Permissions:**
```bash
# Set secure file permissions
chmod 600 instance/minecraft_manager.db
chmod 600 config.json
chmod 755 servers/
chmod 700 backups/
chmod 755 logs/
```

**Security Headers:**
The application automatically sets security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`

### 3. Database Security

**PostgreSQL Security:**
```sql
-- Create database and user
CREATE DATABASE mcservermanager;
CREATE USER mcserver WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE mcservermanager TO mcserver;

-- Configure PostgreSQL for security
ALTER USER mcserver SET default_transaction_isolation = 'read committed';
ALTER USER mcserver SET timezone = 'UTC';
```

**SQLite Security:**
```bash
# Set secure permissions on SQLite database
chmod 600 instance/minecraft_manager.db
chown mcserver:mcserver instance/minecraft_manager.db
```

### 4. SSL/TLS Configuration

**Let's Encrypt Setup:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

**Manual SSL Certificate:**
```bash
# Place certificate files
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo chmod 644 /etc/ssl/certs/certificate.crt
sudo chmod 600 /etc/ssl/private/private.key
```

## Performance Optimization

### 1. System Optimization

**Kernel Parameters:**
```bash
# Add to /etc/sysctl.conf
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10

# Apply changes
sudo sysctl -p
```

**File Limits:**
```bash
# Add to /etc/security/limits.conf
mcserver soft nofile 65535
mcserver hard nofile 65535
mcserver soft nproc 65535
mcserver hard nproc 65535
```

### 2. Application Optimization

**Gunicorn Configuration:**
```python
# gunicorn.conf.py
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
```

**Database Optimization:**
```python
# Database connection pool settings
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'pool_timeout': 20,
    'max_overflow': 0,
    'pool_size': 10
}
```

### 3. Nginx Optimization

**Nginx Configuration:**
```nginx
# /etc/nginx/sites-available/mcservermanager
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/ssl/certs/certificate.crt;
    ssl_certificate_key /etc/ssl/private/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Frontend
    location / {
        root /opt/mcservermanager/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # WebSocket
    location /ws/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Alerting

### 1. Health Monitoring

**Health Check Script:**
```bash
#!/bin/bash
# /opt/mcservermanager/scripts/health_check.sh

# Check application health
if ! curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "Application health check failed"
    systemctl restart mcservermanager
fi

# Check system resources
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "Memory usage is high: ${MEMORY_USAGE}%"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
fi
```

**Cron Job:**
```bash
# Add to crontab
*/5 * * * * /opt/mcservermanager/scripts/health_check.sh
```

### 2. Log Monitoring

**Log Rotation:**
```bash
# /etc/logrotate.d/mcservermanager
/opt/mcservermanager/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 mcserver mcserver
    postrotate
        systemctl reload mcservermanager
    endscript
}
```

**Log Analysis:**
```bash
# Monitor error logs
tail -f /opt/mcservermanager/logs/app.log | grep ERROR

# Check for security issues
grep -i "failed login" /opt/mcservermanager/logs/app.log
grep -i "unauthorized" /opt/mcservermanager/logs/app.log
```

### 3. Performance Monitoring

**System Metrics:**
```bash
# Monitor system resources
htop
iotop
nethogs

# Monitor application performance
curl -s http://localhost:5000/metrics | jq
```

**Database Monitoring:**
```sql
-- PostgreSQL monitoring queries
SELECT * FROM pg_stat_activity;
SELECT * FROM pg_stat_database;
SELECT * FROM pg_stat_user_tables;
```

## Backup and Recovery

### 1. Automated Backup

**Backup Script:**
```bash
#!/bin/bash
# /opt/mcservermanager/scripts/backup.sh

BACKUP_DIR="/opt/backups/mcservermanager"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump mcservermanager > "$BACKUP_DIR/database_$DATE.sql"

# Application backup
tar -czf "$BACKUP_DIR/application_$DATE.tar.gz" -C /opt mcservermanager

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

**Automated Backup Schedule:**
```bash
# Daily backup at 2 AM
0 2 * * * /opt/mcservermanager/scripts/backup.sh

# Weekly full backup
0 2 * * 0 /opt/mcservermanager/scripts/backup.sh --full
```

### 2. Recovery Procedures

**Database Recovery:**
```bash
# Stop application
sudo systemctl stop mcservermanager

# Restore database
psql mcservermanager < /opt/backups/mcservermanager/database_20241219_020000.sql

# Start application
sudo systemctl start mcservermanager
```

**Full System Recovery:**
```bash
# Stop all services
sudo systemctl stop mcservermanager
sudo systemctl stop nginx
sudo systemctl stop postgresql

# Restore from backup
tar -xzf /opt/backups/mcservermanager/application_20241219_020000.tar.gz -C /opt/

# Restore database
psql mcservermanager < /opt/backups/mcservermanager/database_20241219_020000.sql

# Start services
sudo systemctl start postgresql
sudo systemctl start nginx
sudo systemctl start mcservermanager
```

## Deployment Process

### 1. Automated Deployment

**Deployment Script:**
```bash
# Run the automated deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh --ssl
```

**Manual Deployment Steps:**
```bash
# 1. Clone repository
git clone <repository-url>
cd mcservermanager

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with production values

# 5. Initialize database
python run.py --init-db

# 6. Build frontend
cd frontend
npm install
npm run build
cd ..

# 7. Create systemd service
sudo cp scripts/mcservermanager.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mcservermanager

# 8. Configure Nginx
sudo cp scripts/nginx.conf /etc/nginx/sites-available/mcservermanager
sudo ln -s /etc/nginx/sites-available/mcservermanager /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 9. Start services
sudo systemctl start mcservermanager
sudo systemctl start nginx
```

### 2. SSL Certificate Setup

**Let's Encrypt:**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

**Manual Certificate:**
```bash
# Place certificate files
sudo cp certificate.crt /etc/ssl/certs/
sudo cp private.key /etc/ssl/private/
sudo chmod 644 /etc/ssl/certs/certificate.crt
sudo chmod 600 /etc/ssl/private/private.key

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/mcservermanager
# Add SSL configuration

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## Post-Deployment Validation

### 1. Health Checks

**Application Health:**
```bash
# Check application status
curl -f http://localhost:5000/health

# Check API endpoints
curl -f http://localhost:5000/api/v1/auth/status

# Check frontend
curl -f http://localhost:5000/
```

**System Health:**
```bash
# Check system resources
free -h
df -h
top

# Check service status
sudo systemctl status mcservermanager
sudo systemctl status nginx
sudo systemctl status postgresql
```

### 2. Performance Validation

**Load Testing:**
```bash
# Run performance tests
python testing/production_validation.py http://yourdomain.com

# Run load tests
ab -n 1000 -c 10 http://yourdomain.com/health
```

**Security Validation:**
```bash
# Run security tests
python security/production_security.py

# Check SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
```

### 3. Functional Testing

**User Workflow Testing:**
1. Create admin account
2. Create regular user
3. Create Minecraft server
4. Start/stop server
5. Test backup functionality
6. Test user management

**API Testing:**
```bash
# Test authentication
curl -X POST http://yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Test server management
curl -X GET http://yourdomain.com/api/v1/servers/ \
  -H "Cookie: session=your-session-cookie"
```

## Maintenance and Updates

### 1. Regular Maintenance

**Daily Tasks:**
- Monitor system resources
- Check application logs
- Verify backup completion
- Monitor security alerts

**Weekly Tasks:**
- Review performance metrics
- Check for system updates
- Verify SSL certificate validity
- Test backup restoration

**Monthly Tasks:**
- Update system packages
- Review security configurations
- Analyze performance trends
- Plan capacity upgrades

### 2. Update Procedures

**Application Updates:**
```bash
# 1. Create backup
./scripts/backup.sh

# 2. Stop application
sudo systemctl stop mcservermanager

# 3. Update code
git pull origin main

# 4. Update dependencies
source venv/bin/activate
pip install -r requirements.txt

# 5. Update frontend
cd frontend
npm install
npm run build
cd ..

# 6. Run database migrations
python run.py --migrate

# 7. Start application
sudo systemctl start mcservermanager

# 8. Verify deployment
python testing/production_validation.py
```

**System Updates:**
```bash
# Update system packages
sudo apt update
sudo apt upgrade

# Update security patches
sudo apt autoremove
sudo apt autoclean
```

### 3. Monitoring and Alerting

**Log Monitoring:**
```bash
# Monitor application logs
tail -f /opt/mcservermanager/logs/app.log

# Monitor system logs
sudo journalctl -u mcservermanager -f

# Monitor Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**Performance Monitoring:**
```bash
# Monitor system resources
htop
iotop
nethogs

# Monitor application metrics
curl -s http://localhost:5000/metrics | jq
```

## Troubleshooting

### 1. Common Issues

**Application Won't Start:**
```bash
# Check service status
sudo systemctl status mcservermanager

# Check logs
sudo journalctl -u mcservermanager -f

# Check configuration
python run.py --check-config
```

**Database Connection Issues:**
```bash
# Check database status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U mcserver -d mcservermanager

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**Performance Issues:**
```bash
# Check system resources
free -h
df -h
top

# Check application performance
python performance/production_optimization.py

# Check database performance
python testing/production_validation.py
```

### 2. Emergency Procedures

**Application Crash:**
```bash
# 1. Check logs
sudo journalctl -u mcservermanager --since "10 minutes ago"

# 2. Restart service
sudo systemctl restart mcservermanager

# 3. Check status
sudo systemctl status mcservermanager

# 4. If still failing, restore from backup
./scripts/backup.sh --restore latest
```

**Database Corruption:**
```bash
# 1. Stop application
sudo systemctl stop mcservermanager

# 2. Restore database
psql mcservermanager < /opt/backups/mcservermanager/database_latest.sql

# 3. Start application
sudo systemctl start mcservermanager
```

**Security Incident:**
```bash
# 1. Isolate system
sudo ufw deny all
sudo ufw allow ssh

# 2. Check logs for suspicious activity
grep -i "failed login" /opt/mcservermanager/logs/app.log
grep -i "unauthorized" /opt/mcservermanager/logs/app.log

# 3. Change passwords
# 4. Update security configurations
# 5. Restore from clean backup if necessary
```

## Best Practices

### 1. Security Best Practices

- **Regular Updates**: Keep system and application updated
- **Strong Passwords**: Use complex passwords and enable 2FA where possible
- **Firewall**: Configure proper firewall rules
- **SSL/TLS**: Always use HTTPS in production
- **Monitoring**: Monitor for security events and anomalies
- **Backups**: Regular, tested backups with encryption

### 2. Performance Best Practices

- **Resource Monitoring**: Monitor CPU, memory, and disk usage
- **Database Optimization**: Regular database maintenance and optimization
- **Caching**: Use Redis for caching and session storage
- **Load Balancing**: Consider load balancing for high-traffic deployments
- **CDN**: Use CDN for static assets

### 3. Operational Best Practices

- **Documentation**: Maintain up-to-date documentation
- **Change Management**: Document all changes and updates
- **Testing**: Test all changes in staging before production
- **Monitoring**: Comprehensive monitoring and alerting
- **Disaster Recovery**: Regular disaster recovery testing

### 4. Development Best Practices

- **Version Control**: Use Git for version control
- **Code Review**: Implement code review processes
- **Testing**: Comprehensive testing including unit, integration, and end-to-end tests
- **CI/CD**: Implement continuous integration and deployment
- **Security**: Security-first development approach

---

## Support and Resources

### Documentation
- **User Guide**: [USER_GUIDE.md](USER_GUIDE.md)
- **Developer Guide**: [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)
- **API Documentation**: [API_DOCUMENTATION.md](../api/API_DOCUMENTATION.md)
- **Troubleshooting Guide**: [TROUBLESHOOTING_GUIDE.md](TROUBLESHOOTING_GUIDE.md)

### Tools and Scripts
- **Deployment Script**: `scripts/deploy.sh`
- **Health Check**: `monitoring/health_check.py`
- **Security Hardening**: `security/production_security.py`
- **Performance Optimization**: `performance/production_optimization.py`
- **Backup System**: `backup/production_backup.py`
- **Production Validation**: `testing/production_validation.py`

### Emergency Contacts
- **Critical Issues**: Create high-priority issue in project repository
- **Security Issues**: Report privately to development team
- **Data Loss**: Stop all operations and contact support immediately

---

**Minecraft Server Manager** - Production Readiness Guide

*This guide provides comprehensive information for deploying and maintaining the Minecraft Server Manager in a production environment. For additional support, refer to the project documentation and community resources.*
