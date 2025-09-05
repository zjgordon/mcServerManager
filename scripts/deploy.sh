#!/bin/bash

# Minecraft Server Manager - Production Deployment Script
# This script handles the complete deployment process for production

set -e  # Exit on any error

# Configuration
APP_NAME="mcservermanager"
APP_USER="mcserver"
APP_DIR="/opt/mcservermanager"
SERVICE_NAME="mcservermanager"
NGINX_CONFIG="/etc/nginx/sites-available/mcservermanager"
SYSTEMD_SERVICE="/etc/systemd/system/mcservermanager.service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
        exit 1
    fi
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check if running on supported OS
    if [[ ! -f /etc/os-release ]]; then
        error "Cannot determine operating system"
        exit 1
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" && "$ID" != "debian" && "$ID" != "centos" && "$ID" != "rhel" ]]; then
        warning "This script is designed for Ubuntu/Debian/CentOS/RHEL. Proceeding anyway..."
    fi
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is not installed"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if [[ $(echo "$PYTHON_VERSION < 3.8" | bc -l) -eq 1 ]]; then
        error "Python 3.8+ is required. Found: $PYTHON_VERSION"
        exit 1
    fi
    
    # Check Java
    if ! command -v java &> /dev/null; then
        error "Java is not installed"
        exit 1
    fi
    
    # Check Node.js (for frontend)
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    if [[ $(echo "$NODE_VERSION < 20.0" | bc -l) -eq 1 ]]; then
        warning "Node.js 20+ is recommended. Found: $NODE_VERSION"
    fi
    
    success "System requirements check passed"
}

# Install system dependencies
install_dependencies() {
    log "Installing system dependencies..."
    
    if command -v apt-get &> /dev/null; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y \
            python3-venv \
            python3-dev \
            build-essential \
            nginx \
            supervisor \
            redis-server \
            postgresql-client \
            curl \
            wget \
            git \
            bc
    elif command -v yum &> /dev/null; then
        # CentOS/RHEL
        sudo yum update -y
        sudo yum install -y \
            python3-devel \
            gcc \
            gcc-c++ \
            nginx \
            supervisor \
            redis \
            postgresql \
            curl \
            wget \
            git \
            bc
    else
        error "Unsupported package manager"
        exit 1
    fi
    
    success "System dependencies installed"
}

# Create application user
create_user() {
    log "Creating application user..."
    
    if ! id "$APP_USER" &>/dev/null; then
        sudo useradd -r -s /bin/bash -d "$APP_DIR" -m "$APP_USER"
        success "Created user: $APP_USER"
    else
        log "User $APP_USER already exists"
    fi
}

# Setup application directory
setup_app_directory() {
    log "Setting up application directory..."
    
    # Create application directory
    sudo mkdir -p "$APP_DIR"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR"
    
    # Copy application files
    sudo cp -r . "$APP_DIR/"
    sudo chown -R "$APP_USER:$APP_USER" "$APP_DIR"
    
    success "Application directory setup complete"
}

# Setup Python environment
setup_python_env() {
    log "Setting up Python environment..."
    
    cd "$APP_DIR"
    
    # Create virtual environment
    sudo -u "$APP_USER" python3 -m venv venv
    
    # Activate virtual environment and install dependencies
    sudo -u "$APP_USER" bash -c "
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements.txt
        pip install gunicorn psycopg2-binary redis
    "
    
    success "Python environment setup complete"
}

# Setup frontend
setup_frontend() {
    log "Setting up frontend..."
    
    cd "$APP_DIR/frontend"
    
    # Install dependencies and build
    sudo -u "$APP_USER" bash -c "
        npm install
        npm run build
    "
    
    success "Frontend setup complete"
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    cd "$APP_DIR"
    
    # Create database if using PostgreSQL
    if [[ "$DATABASE_URL" == postgresql* ]]; then
        DB_NAME=$(echo "$DATABASE_URL" | sed 's/.*\/\([^?]*\).*/\1/')
        sudo -u postgres createdb "$DB_NAME" 2>/dev/null || true
    fi
    
    # Initialize database
    sudo -u "$APP_USER" bash -c "
        source venv/bin/activate
        export FLASK_APP=run.py
        export FLASK_ENV=production
        python -c 'from app import create_app, db; app = create_app(); app.app_context().push(); db.create_all()'
    "
    
    success "Database setup complete"
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    sudo tee "$SYSTEMD_SERVICE" > /dev/null <<EOF
[Unit]
Description=Minecraft Server Manager
After=network.target postgresql.service redis.service

[Service]
Type=exec
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=PATH=$APP_DIR/venv/bin
Environment=FLASK_ENV=production
Environment=FLASK_APP=run.py
ExecStart=$APP_DIR/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 30 --keep-alive 2 --max-requests 1000 --max-requests-jitter 100 run:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    
    success "Systemd service created"
}

# Setup Nginx
setup_nginx() {
    log "Setting up Nginx..."
    
    # Create Nginx configuration
    sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
    
    # Frontend
    location / {
        root $APP_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # WebSocket support
    location /ws/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(py|pyc|pyo|log)$ {
        deny all;
    }
}
EOF
    
    # Enable site
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl reload nginx
    
    success "Nginx setup complete"
}

# Setup SSL (optional)
setup_ssl() {
    if [[ "$1" == "--ssl" ]]; then
        log "Setting up SSL with Let's Encrypt..."
        
        # Install certbot
        if command -v apt-get &> /dev/null; then
            sudo apt-get install -y certbot python3-certbot-nginx
        elif command -v yum &> /dev/null; then
            sudo yum install -y certbot python3-certbot-nginx
        fi
        
        # Get domain name
        read -p "Enter your domain name: " DOMAIN
        
        # Obtain SSL certificate
        sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN"
        
        success "SSL setup complete"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Create monitoring script
    sudo tee "$APP_DIR/scripts/monitor.sh" > /dev/null <<'EOF'
#!/bin/bash

# Health check script
APP_DIR="/opt/mcservermanager"
SERVICE_NAME="mcservermanager"

# Check if service is running
if ! systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Service $SERVICE_NAME is not running"
    systemctl restart "$SERVICE_NAME"
fi

# Check if application is responding
if ! curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "Application health check failed"
    systemctl restart "$SERVICE_NAME"
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "Disk usage is high: ${DISK_USAGE}%"
fi

# Check memory usage
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$MEMORY_USAGE" -gt 90 ]; then
    echo "Memory usage is high: ${MEMORY_USAGE}%"
fi
EOF
    
    sudo chmod +x "$APP_DIR/scripts/monitor.sh"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR/scripts/monitor.sh"
    
    # Add to crontab
    (sudo crontab -u "$APP_USER" -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/scripts/monitor.sh") | sudo crontab -u "$APP_USER" -
    
    success "Monitoring setup complete"
}

# Setup backup
setup_backup() {
    log "Setting up backup system..."
    
    # Create backup script
    sudo tee "$APP_DIR/scripts/backup.sh" > /dev/null <<'EOF'
#!/bin/bash

# Backup script
APP_DIR="/opt/mcservermanager"
BACKUP_DIR="/opt/backups/mcservermanager"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup database
if [[ -f "$APP_DIR/instance/minecraft_manager.db" ]]; then
    cp "$APP_DIR/instance/minecraft_manager.db" "$BACKUP_DIR/database_$DATE.db"
fi

# Backup server files
if [[ -d "$APP_DIR/servers" ]]; then
    tar -czf "$BACKUP_DIR/servers_$DATE.tar.gz" -C "$APP_DIR" servers/
fi

# Backup configuration
if [[ -f "$APP_DIR/config.json" ]]; then
    cp "$APP_DIR/config.json" "$BACKUP_DIR/config_$DATE.json"
fi

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF
    
    sudo chmod +x "$APP_DIR/scripts/backup.sh"
    sudo chown "$APP_USER:$APP_USER" "$APP_DIR/scripts/backup.sh"
    
    # Add to crontab (daily backup at 2 AM)
    (sudo crontab -u "$APP_USER" -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | sudo crontab -u "$APP_USER" -
    
    success "Backup system setup complete"
}

# Start services
start_services() {
    log "Starting services..."
    
    # Start application
    sudo systemctl start "$SERVICE_NAME"
    sudo systemctl status "$SERVICE_NAME" --no-pager
    
    # Start Nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    
    # Start Redis
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    
    success "Services started"
}

# Main deployment function
deploy() {
    log "Starting deployment of Minecraft Server Manager..."
    
    check_root
    check_requirements
    install_dependencies
    create_user
    setup_app_directory
    setup_python_env
    setup_frontend
    setup_database
    create_systemd_service
    setup_nginx
    setup_ssl "$@"
    setup_monitoring
    setup_backup
    start_services
    
    success "Deployment completed successfully!"
    
    log "Next steps:"
    echo "1. Configure your domain name in Nginx configuration"
    echo "2. Set up SSL certificate (run with --ssl flag)"
    echo "3. Configure environment variables in $APP_DIR/.env"
    echo "4. Access your application at http://your-domain"
    echo "5. Create your first admin account"
    
    log "Useful commands:"
    echo "  sudo systemctl status $SERVICE_NAME    # Check service status"
    echo "  sudo systemctl restart $SERVICE_NAME   # Restart service"
    echo "  sudo journalctl -u $SERVICE_NAME -f    # View logs"
    echo "  $APP_DIR/scripts/backup.sh             # Manual backup"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --ssl    Setup SSL with Let's Encrypt"
    echo "  --help   Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DATABASE_URL    Database connection string"
    echo "  SECRET_KEY      Flask secret key"
    echo "  REDIS_URL       Redis connection string"
}

# Main script
main() {
    case "${1:-}" in
        --help|-h)
            usage
            exit 0
            ;;
        *)
            deploy "$@"
            ;;
    esac
}

# Run main function
main "$@"
