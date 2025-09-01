# Minecraft Server Manager

A comprehensive web application built with Flask that allows users to create, manage, and monitor Minecraft game servers effortlessly. This application provides a user-friendly interface with advanced features for server management, user administration, and system resource monitoring.

## 🚀 Features

### Core Server Management
- **Server Lifecycle Management:** Create, start, stop, delete, and backup Minecraft servers
- **Version Selection:** Select from available Minecraft versions with automatic exclusion of versions without server downloads
- **Dynamic Port Allocation:** Automatically assigns available ports for new servers
- **Server Configuration:** Customize server properties (game mode, difficulty, PvP, spawn monsters, MOTD, etc.)
- **Memory Management:** Configure and monitor memory allocation for each server with system-wide limits

### User Management & Security
- **Role-Based Access Control:** Admin and regular user roles with different permissions
- **User Authentication:** Secure login system with password hashing
- **Admin Dashboard:** Comprehensive user management interface for administrators
- **Server Ownership:** Users can only manage their own servers (admins can manage all)
- **First-Time Setup:** Automatic admin account creation on first launch

### System Administration
- **Memory Configuration:** Admin-configurable system-wide memory limits and per-server defaults
- **System Monitoring:** Real-time system memory information and usage statistics
- **Resource Tracking:** Monitor total memory allocation across all servers
- **Persistent Configuration:** JSON-based configuration system with environment variable integration

### Error Handling & Reliability
- **Comprehensive Error Handling:** Centralized error management with custom exceptions
- **Logging System:** Detailed logging for debugging and monitoring
- **Network Error Recovery:** Robust handling of network timeouts and connection issues
- **File Operation Safety:** Safe file operations with proper error handling
- **Database Transaction Management:** Safe database operations with rollback capabilities

### Technical Features
- **Modular Architecture:** Organized using Flask blueprints for scalability
- **EULA Integration:** Integrated EULA acceptance process within the app
- **Mojang API Integration:** Automatic version manifest fetching and server JAR downloads
- **Process Management:** Advanced process monitoring and management using psutil
- **Test Suite:** Comprehensive test coverage including unit, integration, and security tests

## 📋 Prerequisites

- **Python 3.7 or higher**
- **Java 8 or higher** (Required to run Minecraft servers)
- **Linux/Unix system** (Tested on Linux, may work on other Unix-like systems)

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/minecraft-server-manager.git
cd minecraft-server-manager
```

### 2. Configure Environment Variables (Optional)
Create a `.env` file in the root directory to customize settings:
```bash
# Security
SECRET_KEY=your_secure_random_key_here

# Admin Configuration
ADMIN_USERNAME=admin

# Database
DATABASE_URL=sqlite:///minecraft_manager.db

# Memory Management (in MB)
MAX_TOTAL_MEMORY_MB=8192
DEFAULT_SERVER_MEMORY_MB=1024
MIN_SERVER_MEMORY_MB=512
MAX_SERVER_MEMORY_MB=4096
```

### 3. Run the Application
```bash
bash ./start.sh
```

The `start.sh` script will:
- Create a Python virtual environment if it doesn't exist
- Install all required dependencies
- Launch the Flask application

## 🎮 Usage

### First-Time Setup
1. **Launch the application** using `./start.sh`
2. **Create Admin Account:** On first run, you'll be prompted to create the administrator account
3. **Configure System Settings:** Use the admin dashboard to configure memory limits and system settings

### Regular Usage
1. **Login:** Access the web interface at `http://localhost:5000`
2. **Create Servers:** Use the "Create New Server" button to set up Minecraft servers
3. **Manage Servers:** Start, stop, backup, or delete servers as needed
4. **Monitor Resources:** Check memory usage and system statistics in the admin dashboard

### Admin Features
- **User Management:** Create, edit, and delete user accounts
- **System Configuration:** Set memory limits and monitor system resources
- **Server Oversight:** Manage all servers across all users
- **System Statistics:** View real-time memory usage and system information

## 🏗️ Architecture

### Directory Structure
```
mcServerManager/
├── app/                    # Main application package
│   ├── routes/            # Flask route handlers
│   ├── templates/         # HTML templates
│   ├── static/           # Static files (CSS, JS, etc.)
│   ├── models.py         # Database models
│   ├── utils.py          # Utility functions
│   ├── config.py         # Configuration settings
│   ├── extensions.py     # Flask extensions
│   └── error_handlers.py # Error handling system
├── tests/                # Test suite
├── backups/              # Server backup storage
├── servers/              # Minecraft server files
├── start.sh             # Application launcher
├── run.py               # Application entry point
└── requirements.txt    # Python dependencies
```

### Key Components
- **Flask Blueprints:** Modular route organization
- **SQLAlchemy ORM:** Database abstraction layer
- **Flask-Login:** User session management
- **Custom Error Handling:** Centralized error management
- **Configuration Manager:** Persistent settings management

## 🧪 Testing

The application includes a comprehensive test suite:

```bash
# Run all tests
python3 -m pytest tests/ -v

# Run specific test categories
python3 -m pytest tests/test_error_handling.py -v
python3 -m pytest tests/test_user_management.py -v
python3 -m pytest tests/test_memory_management.py -v
```

## 🔧 Configuration

### Memory Management
- **Total Memory Limit:** Maximum memory for all Minecraft servers combined
- **Default Server Memory:** Default memory allocation for new servers
- **Min/Max Server Memory:** Per-server memory limits
- **Real-time Monitoring:** Live system memory statistics

### User Management
- **Admin Privileges:** Full system access and user management
- **Regular Users:** Limited to their own servers
- **Account Security:** Password hashing and session management

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application is not affiliated with or endorsed by Mojang Studios or Microsoft Corporation. Minecraft is a trademark of Mojang Studios.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📊 System Requirements

- **Minimum RAM:** 2GB (plus memory for Minecraft servers)
- **Storage:** 1GB+ for application and server files
- **Network:** Internet connection for version downloads
- **Permissions:** Write access to application directory

---

**Note:** This application is designed for development and testing environments. For production use, consider additional security measures and proper deployment configurations.
