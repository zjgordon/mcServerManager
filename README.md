# Minecraft Server Manager

A professional web application for creating, managing, and monitoring Minecraft game servers with enterprise-grade process management and user administration.

## 🚀 Features

### Core Server Management
- **Server Lifecycle**: Create, start, stop, delete, and backup Minecraft servers
- **Version Selection**: Choose from available Minecraft versions with automatic exclusion filtering
- **Dynamic Port Allocation**: Automatic port assignment with conflict detection
- **Server Configuration**: Customize game mode, difficulty, PvP, spawn settings, MOTD, and more
- **Memory Management**: Configurable memory allocation with system-wide limits and per-server defaults

### User Management & Security
- **Role-Based Access Control**: Admin and regular user roles with granular permissions
- **Secure Authentication**: Password hashing, rate limiting, and session management
- **User Administration**: Comprehensive user management interface for administrators
- **Server Ownership**: Users manage only their own servers (admins can manage all)
- **First-Time Setup**: Automatic admin account creation on first launch

### Process Management & Monitoring
- **Real-time Status Verification**: Accurate server status reporting with process validation
- **Orphaned Process Detection**: Automatic identification of unmanaged Minecraft processes
- **Startup Reconciliation**: Ensures database consistency with actual running processes
- **Periodic Health Checks**: Automated status monitoring with configurable intervals
- **Process Oversight**: Admin interface for process monitoring and management

### System Administration
- **Memory Configuration**: Admin-configurable system-wide memory limits
- **System Monitoring**: Real-time memory usage and allocation statistics
- **Resource Tracking**: Monitor total memory allocation across all servers
- **Persistent Configuration**: Database-backed configuration system
- **Comprehensive Logging**: Detailed logging for debugging and monitoring

## 🛠️ Installation

### Prerequisites
- **Python 3.8+** with pip
- **Java 8+** (for Minecraft servers)
- **Linux/Unix** system (tested on Ubuntu, CentOS, Debian)

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd mcServerManager

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up the application
python run.py
```

### Environment Configuration
Create a `.env` file or set environment variables:

```bash
# Security
SECRET_KEY=your_secure_secret_key_here
STATUS_CHECK_API_KEY=your_secure_api_key_here

# Database
DATABASE_URL=sqlite:///minecraft_manager.db

# Memory Management (in MB)
MAX_TOTAL_MEMORY_MB=8192
DEFAULT_SERVER_MEMORY_MB=1024
MIN_SERVER_MEMORY_MB=512
MAX_SERVER_MEMORY_MB=4096

# Optional Security Settings
SESSION_COOKIE_SECURE=False  # Set to True for HTTPS
RATELIMIT_DEFAULT=200 per day;50 per hour;10 per minute
PASSWORD_MIN_LENGTH=8
```

### First-Time Setup
1. **Launch the application**: `python run.py`
2. **Create Admin Account**: Set up the initial administrator account
3. **Configure System Settings**: Set memory limits and system configuration
4. **Access Web Interface**: Navigate to `http://localhost:5000`

## 🎮 Usage

### Web Interface
- **URL**: `http://localhost:5000` (default)
- **Authentication**: Login with admin or user credentials
- **Responsive Design**: Works on desktop and mobile devices

### Creating Servers
1. **Select Version**: Choose from available Minecraft versions
2. **Configure Settings**: Set server properties and memory allocation
3. **Server Setup**: Automatic EULA acceptance and configuration generation
4. **Launch**: Start the server with one click

### Managing Servers
- **Start/Stop**: Control server lifecycle
- **Backup**: Create server backups with compression
- **Monitor**: Real-time status and resource usage
- **Configure**: Modify server properties and settings

### Admin Features
- **User Management**: Create, edit, and delete user accounts
- **System Configuration**: Set memory limits and monitor resources
- **Process Management**: Monitor and reconcile server processes
- **System Statistics**: View real-time system information

## 🔧 Maintenance

### Process Management
The application automatically manages server processes and provides tools for oversight:

```bash
# Set up automated status checks (every 5 minutes)
chmod +x scripts/setup_status_check.sh
./scripts/setup_status_check.sh

# Manual status check via API
curl -X POST \
  -H "X-API-Key: your_api_key" \
  http://localhost:5000/admin/status_check
```

### Logs and Monitoring
- **Application Logs**: `app.log` - General application logging
- **Status Check Logs**: `logs/status_check.log` - Automated status check results
- **Process Monitoring**: Admin interface for real-time process oversight

### Database Management
- **Automatic Setup**: Database tables created on first run
- **SQLite Default**: Uses SQLite for simplicity (can be changed to PostgreSQL/MySQL)
- **Backup**: Regular database backups recommended

### Updates and Maintenance
```bash
# Update dependencies
pip install -r requirements.txt --upgrade

# Check for orphaned processes
# Access Admin → Process Management → Find Orphaned

# Reconcile server statuses
# Access Admin → Process Management → Reconcile Server Statuses
```

## 🏗️ Architecture

### Technology Stack
- **Backend**: Flask (Python web framework)
- **Database**: SQLAlchemy ORM with SQLite/PostgreSQL support
- **Frontend**: Bootstrap 4, jQuery, custom CSS
- **Process Management**: psutil, subprocess
- **Authentication**: Flask-Login with CSRF protection

### Directory Structure
```
mcServerManager/
├── app/                    # Main application package
│   ├── routes/            # Flask route handlers
│   ├── models.py          # Database models
│   ├── utils.py           # Utility functions
│   ├── config.py          # Configuration management
│   └── templates/         # HTML templates
├── servers/               # Minecraft server files
├── backups/               # Server backup storage
├── scripts/               # Maintenance and setup scripts
├── tests/                 # Test suite
├── requirements.txt       # Python dependencies
└── run.py                 # Application entry point
```

### Key Components
- **Server Management**: Handles Minecraft server lifecycle
- **User Management**: Authentication and authorization system
- **Process Management**: Real-time process monitoring and reconciliation
- **Memory Management**: System resource allocation and monitoring
- **Configuration System**: Database-backed application settings

## 🔒 Security Features

- **CSRF Protection**: Built-in CSRF token validation
- **Rate Limiting**: Configurable request rate limiting
- **Password Policy**: Enforceable password requirements
- **Session Security**: Secure session management
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Detailed security event logging

## 📊 Performance

- **Memory Efficiency**: Lightweight process monitoring
- **Database Optimization**: Efficient queries and indexing
- **Caching**: Template and configuration caching
- **Asynchronous Operations**: Non-blocking process management

## 🧪 Testing

```bash
# Run test suite
pytest

# Run with coverage
pytest --cov=app

# Run specific test categories
pytest tests/test_server_routes.py
pytest tests/test_auth.py
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📞 Support

- **Documentation**: See [PROCESS_MANAGEMENT.md](PROCESS_MANAGEMENT.md) for detailed process management information
- **Issues**: Report bugs and feature requests via GitHub issues
- **Security**: Report security vulnerabilities privately

## 🔄 Version History

- **v2.0.0**: Comprehensive process management and monitoring
- **v1.0.0**: Initial release with basic server management

---

**Minecraft Server Manager** - Professional server management made simple.
