# Setup Guide

This guide provides detailed instructions for setting up the mcServerManager
development environment.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows
  with WSL2
- **Python**: 3.8, 3.9, 3.10, or 3.11
- **Node.js**: 16.x or 18.x (for frontend development)
- **Git**: Latest version
- **Memory**: Minimum 4GB RAM, 8GB+ recommended
- **Disk Space**: At least 2GB free space

### Required Software

- Python 3.8+ with pip
- Node.js and npm
- Git
- Virtual environment tool (venv or virtualenv)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd mcServerManager
```

### 2. Python Environment Setup

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Upgrade pip
pip install --upgrade pip
```

### 3. Install Dependencies

```bash
# Install production dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt
```

### 4. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor
```

### Required Environment Variables

```bash
# Flask Configuration
FLASK_APP=run.py
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here

# Database Configuration
DATABASE_URL=sqlite:///instance/dev_minecraft_manager.db

# Application Settings
APP_TITLE=Minecraft Server Manager
SERVER_HOSTNAME=localhost

# Memory Management
MIN_MEMORY=512
MAX_MEMORY=4096
DEFAULT_MEMORY=1024

# Security Settings
RATELIMIT_ENABLED=True
RATELIMIT_STORAGE_URL=memory://
```

### 5. Database Setup

```bash
# Initialize database
flask db init

# Create initial migration
flask db migrate -m "Initial migration"

# Apply migrations
flask db upgrade
```

### 6. Frontend Setup (Optional)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build frontend assets
npm run build
```

## Development Environment

### Using the Development Script

The project includes a `dev.sh` script for easy development environment management:

```bash
# Make script executable
chmod +x dev.sh

# Start development server
./dev.sh

# Available options:
./dev.sh --help
```

The script automatically:

- Detects available ports
- Activates virtual environment
- Installs dependencies
- Starts the Flask development server

### Manual Development Server

```bash
# Activate virtual environment
source venv/bin/activate

# Set environment variables
export FLASK_ENV=development
export FLASK_DEBUG=True

# Run the application
python run.py
```

## Verification

### 1. Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test categories
pytest -m unit
pytest -m integration
```

### 2. Code Quality Checks

```bash
# Run pre-commit hooks
pre-commit run --all-files

# Run individual tools
black --check .
isort --check-only .
flake8 .
mypy .
```

### 3. Security Checks

```bash
# Run security scans
bandit -r app/
safety check
semgrep --config=auto .
```

## Common Setup Issues

### Python Version Issues

- Ensure Python 3.8+ is installed
- Use `python3` command if `python` points to Python 2.x
- Check version with `python3 --version`

### Virtual Environment Issues

- Ensure virtual environment is activated
- Recreate if corrupted: `rm -rf venv && python3 -m venv venv`
- Check activation: `which python` should point to venv

### Database Issues

- Ensure instance directory exists: `mkdir -p instance`
- Check database file permissions
- Reset database: `rm instance/*.db && flask db upgrade`

### Port Conflicts

- Use `./dev.sh` for automatic port detection
- Check port usage: `lsof -i :5000`
- Set custom port: `export FLASK_RUN_PORT=5001`

### Memory Issues

- Ensure sufficient system memory
- Adjust memory limits in .env file
- Monitor with `htop` or `top`

## Next Steps

After successful setup:

1. Read [Development Guide](development.md) for workflow information
2. Check [Troubleshooting Guide](troubleshooting.md) for common issues
3. Review [Tools Documentation](tools.md) for development tools
4. Explore the codebase structure and architecture

## Getting Help

- Check the troubleshooting guide for common issues
- Review project documentation in the `docs/` directory
- Check existing issues in the project repository
- Follow the development workflow guidelines
