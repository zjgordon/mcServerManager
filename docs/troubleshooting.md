# Troubleshooting Guide

This guide helps resolve common issues encountered during development and
deployment of mcServerManager.

## Setup Issues

### Python Environment Problems

#### Issue: Python version not found

**Symptoms**: `python3: command not found` or similar error
**Solutions**:

```bash
# Check Python installation
which python3
python3 --version

# Install Python 3.8+ if missing
# Ubuntu/Debian:
sudo apt update
sudo apt install python3 python3-pip python3-venv

# macOS with Homebrew:
brew install python@3.11

# Windows: Download from python.org
```

#### Issue: Virtual environment not activating

**Symptoms**: Virtual environment commands not working
**Solutions**:

```bash
# Check if venv exists
ls -la venv/

# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# or venv\Scripts\activate  # Windows

# Verify activation
which python
# Should point to venv/bin/python
```

#### Issue: Package installation failures

**Symptoms**: `pip install` fails with errors
**Solutions**:

```bash
# Upgrade pip
pip install --upgrade pip

# Clear pip cache
pip cache purge

# Install with verbose output
pip install -v -r requirements.txt

# Install without dependencies first
pip install --no-deps -r requirements.txt
```

### Database Issues

#### Issue: Database file not found

**Symptoms**: `sqlite3.OperationalError: no such table`
**Solutions**:

```bash
# Create instance directory
mkdir -p instance

# Initialize database
flask db init

# Create and apply migrations
flask db migrate -m "Initial migration"
flask db upgrade

# Check database file
ls -la instance/
```

#### Issue: Migration conflicts

**Symptoms**: `alembic.util.exc.CommandError: Can't locate revision`
**Solutions**:

```bash
# Check migration history
flask db history

# Reset migrations (WARNING: data loss)
rm -rf migrations/
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Or fix specific migration
flask db stamp head
flask db migrate -m "Fix migration"
flask db upgrade
```

#### Issue: Database locked

**Symptoms**: `sqlite3.OperationalError: database is locked`
**Solutions**:

```bash
# Check for running processes
ps aux | grep python

# Kill hanging processes
pkill -f "python.*run.py"

# Check file permissions
ls -la instance/*.db

# Fix permissions if needed
chmod 664 instance/*.db
```

### Port and Network Issues

#### Issue: Port already in use

**Symptoms**: `Address already in use` error
**Solutions**:

```bash
# Use development script (recommended)
./dev.sh

# Or find and kill process using port
lsof -i :5000
kill -9 <PID>

# Or use different port
export FLASK_RUN_PORT=5001
python run.py
```

#### Issue: Connection refused

**Symptoms**: Cannot connect to application
**Solutions**:

```bash
# Check if application is running
ps aux | grep python

# Check port binding
netstat -tlnp | grep :5000

# Verify firewall settings
sudo ufw status

# Test local connection
curl http://localhost:5000/health/
```

### Environment Configuration Issues

#### Issue: Environment variables not loaded

**Symptoms**: Configuration errors or missing values
**Solutions**:

```bash
# Check .env file exists
ls -la .env

# Verify environment variables
env | grep FLASK

# Load environment manually
source .env
export $(cat .env | xargs)

# Check configuration loading
python -c "from app.config import get_config; print(get_config())"
```

#### Issue: Secret key not set

**Symptoms**: `RuntimeError: The session is unavailable because no secret key
was set`
**Solutions**:

```bash
# Generate secret key
python -c "import secrets; print(secrets.token_hex(32))"  # pragma: allowlist secret

# Add to .env file
echo "SECRET_KEY=your-generated-secret-key" >> .env

# Or set temporarily
export SECRET_KEY="your-generated-secret-key"  # pragma: allowlist secret
```

## Development Issues

### Test Failures

#### Issue: Tests failing with database errors

**Symptoms**: `sqlalchemy.exc.IntegrityError` or similar
**Solutions**:

```bash
# Clean test database
rm -f instance/test_minecraft_manager.db

# Run tests with fresh database
pytest --create-db

# Check test configuration
pytest --collect-only

# Run specific failing test
pytest tests/unit/test_auth.py::TestAuth::test_login -v
```

#### Issue: Import errors in tests

**Symptoms**: `ModuleNotFoundError` or `ImportError`
**Solutions**:

```bash
# Check Python path
python -c "import sys; print(sys.path)"

# Install in development mode
pip install -e .

# Check PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Verify imports
python -c "from app import create_app; print('Import successful')"
```

#### Issue: Test data conflicts

**Symptoms**: Tests failing due to data conflicts
**Solutions**:

```bash
# Use test fixtures properly
# Check test isolation
pytest --tb=short -v

# Run tests in isolation
pytest -x  # Stop on first failure

# Check test data cleanup
pytest --capture=no tests/unit/test_auth.py
```

### Code Quality Issues

#### Issue: Pre-commit hooks failing

**Symptoms**: Pre-commit checks fail on commit
**Solutions**:

```bash
# Run all hooks manually
pre-commit run --all-files

# Fix specific hook
pre-commit run black --all-files
pre-commit run isort --all-files
pre-commit run flake8 --all-files

# Skip hooks temporarily (not recommended)
git commit --no-verify -m "fix: temporary commit"
```

#### Issue: Black formatting conflicts

**Symptoms**: Black and isort formatting conflicts
**Solutions**:

```bash
# Run isort first, then black
isort .
black .

# Or use pre-commit to run in correct order
pre-commit run --all-files

# Check configuration
cat pyproject.toml | grep -A 10 "\[tool.black\]"
cat pyproject.toml | grep -A 10 "\[tool.isort\]"
```

#### Issue: Type checking errors

**Symptoms**: mypy type checking failures
**Solutions**:

```bash
# Run mypy with verbose output
mypy --verbose app/

# Check type stubs
pip install types-requests types-PyYAML

# Add type annotations
# Example: def function(param: str) -> int:
```

### Memory and Performance Issues

#### Issue: High memory usage

**Symptoms**: Application consuming excessive memory
**Solutions**:

```bash
# Check memory usage
htop
ps aux --sort=-%mem

# Monitor memory in application
# Check memory configuration in .env
grep -i memory .env

# Adjust memory limits
# MIN_MEMORY=512
# MAX_MEMORY=2048
# DEFAULT_MEMORY=1024
```

#### Issue: Slow database queries

**Symptoms**: Application responding slowly
**Solutions**:

```bash
# Enable query logging
export SQLALCHEMY_ECHO=True

# Check database indexes
sqlite3 instance/dev_minecraft_manager.db ".indexes"

# Analyze slow queries
# Use database profiling tools
```

## Production Issues

### Deployment Problems

#### Issue: Application not starting

**Symptoms**: Production deployment fails
**Solutions**:

```bash
# Check environment variables
env | grep -E "(FLASK|DATABASE|SECRET)"

# Verify database connectivity
python -c "from app.database import db; print('DB connected')"

# Check file permissions
ls -la instance/
chmod 664 instance/*.db

# Review application logs
tail -f logs/app.log
```

#### Issue: Database connection errors

**Symptoms**: Database connection failures in production
**Solutions**:

```bash
# Check database server status
systemctl status postgresql  # or mysql

# Verify connection string
echo $DATABASE_URL

# Test database connection
python -c "import sqlalchemy; engine = sqlalchemy.create_engine('$DATABASE_URL'); print(engine.connect())"

# Check network connectivity
telnet database-host 5432
```

### Security Issues

#### Issue: Authentication not working

**Symptoms**: Users cannot log in
**Solutions**:

```bash
# Check user table
sqlite3 instance/dev_minecraft_manager.db "SELECT * FROM user;"

# Verify password hashing
python -c "from werkzeug.security import check_password_hash; print('Hash check works')"

# Check session configuration
grep -i session .env

# Clear sessions
rm -f instance/sessions/*
```

#### Issue: CSRF token errors

**Symptoms**: CSRF token validation failures
**Solutions**:

```bash
# Check CSRF configuration
grep -i csrf app/config.py

# Verify secret key
echo $SECRET_KEY

# Clear browser cookies
# Or check CSRF token in forms
```

## Debugging Techniques

### Application Debugging

```bash
# Enable debug mode
export FLASK_DEBUG=True
export FLASK_ENV=development

# Use debugger
import pdb; pdb.set_trace()

# Enable detailed logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Database Debugging

```bash
# Enable SQL logging
export SQLALCHEMY_ECHO=True

# Check database schema
sqlite3 instance/dev_minecraft_manager.db ".schema"

# Query specific data
sqlite3 instance/dev_minecraft_manager.db "SELECT * FROM user LIMIT 5;"
```

### Network Debugging

```bash
# Check port usage
netstat -tlnp | grep :5000

# Test HTTP endpoints
curl -v http://localhost:5000/health/

# Check firewall
sudo ufw status
sudo iptables -L
```

## Getting Help

### Log Analysis

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Security logs
tail -f logs/security.log

# System logs
journalctl -u your-service-name
```

### Diagnostic Commands

```bash
# System information
uname -a
python3 --version
pip list

# Application status
curl http://localhost:5000/health/detailed

# Database status
sqlite3 instance/dev_minecraft_manager.db "PRAGMA integrity_check;"

# Memory usage
free -h
df -h
```

### Support Resources

1. Check this troubleshooting guide
2. Review project documentation
3. Check GitHub issues
4. Review application logs
5. Test with minimal configuration

For additional help, create an issue with:

- Operating system and version
- Python version
- Error messages and stack traces
- Steps to reproduce
- Log file excerpts
