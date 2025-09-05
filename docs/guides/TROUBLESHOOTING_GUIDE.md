# Minecraft Server Manager - Troubleshooting Guide

This comprehensive troubleshooting guide helps you diagnose and resolve common issues with the Minecraft Server Manager application.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Installation Issues](#installation-issues)
3. [Application Startup Issues](#application-startup-issues)
4. [Server Management Issues](#server-management-issues)
5. [Authentication Issues](#authentication-issues)
6. [Database Issues](#database-issues)
7. [Memory and Performance Issues](#memory-and-performance-issues)
8. [Network and Connectivity Issues](#network-and-connectivity-issues)
9. [Frontend Issues](#frontend-issues)
10. [System-Specific Issues](#system-specific-issues)
11. [Error Codes Reference](#error-codes-reference)
12. [Log Analysis](#log-analysis)
13. [Recovery Procedures](#recovery-procedures)
14. [FAQ](#faq)

## Quick Diagnostics

### System Health Check

Run this quick diagnostic script to check your system:

```bash
#!/bin/bash
echo "=== Minecraft Server Manager Diagnostic ==="
echo "Date: $(date)"
echo ""

echo "=== System Information ==="
echo "OS: $(uname -a)"
echo "Python: $(python3 --version)"
echo "Java: $(java -version 2>&1 | head -1)"
echo "Node.js: $(node --version 2>/dev/null || echo 'Not installed')"
echo ""

echo "=== Memory Information ==="
free -h
echo ""

echo "=== Disk Space ==="
df -h
echo ""

echo "=== Process Information ==="
ps aux | grep -E "(python|java|node)" | grep -v grep
echo ""

echo "=== Port Usage ==="
netstat -tlnp | grep -E "(5000|3000|25565)"
echo ""

echo "=== Application Status ==="
if [ -f "app.log" ]; then
    echo "Application log exists"
    echo "Last 5 log entries:"
    tail -5 app.log
else
    echo "Application log not found"
fi
```

### Common Quick Fixes

**Application Won't Start:**
1. Check Python version: `python3 --version` (requires 3.8+)
2. Verify virtual environment: `source venv/bin/activate`
3. Check dependencies: `pip install -r requirements.txt`
4. Verify port availability: `netstat -tlnp | grep 5000`

**Server Won't Start:**
1. Check Java installation: `java -version`
2. Verify EULA acceptance
3. Check available memory
4. Review server logs in `servers/[server-name]/logs/`

**Web Interface Not Loading:**
1. Check if backend is running: `curl http://localhost:5000/api/v1/auth/status`
2. Verify frontend is running: `curl http://localhost:3000`
3. Check browser console for errors
4. Clear browser cache and cookies

## Installation Issues

### Python Environment Issues

**Problem: Python version not found**
```bash
# Error: python3: command not found
```

**Solutions:**
1. Install Python 3.8+:
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip python3-venv
   
   # CentOS/RHEL
   sudo yum install python3 python3-pip
   
   # macOS
   brew install python3
   ```

2. Create symbolic link:
   ```bash
   sudo ln -s /usr/bin/python3 /usr/bin/python
   ```

**Problem: Virtual environment creation fails**
```bash
# Error: python3 -m venv venv
```

**Solutions:**
1. Install venv module:
   ```bash
   sudo apt install python3-venv  # Ubuntu/Debian
   sudo yum install python3-venv  # CentOS/RHEL
   ```

2. Use alternative method:
   ```bash
   pip3 install virtualenv
   virtualenv venv
   ```

**Problem: Dependencies installation fails**
```bash
# Error: pip install -r requirements.txt
```

**Solutions:**
1. Upgrade pip:
   ```bash
   python3 -m pip install --upgrade pip
   ```

2. Install system dependencies:
   ```bash
   # Ubuntu/Debian
   sudo apt install build-essential python3-dev
   
   # CentOS/RHEL
   sudo yum groupinstall "Development Tools"
   sudo yum install python3-devel
   ```

3. Use alternative package manager:
   ```bash
   pip3 install --user -r requirements.txt
   ```

### Java Installation Issues

**Problem: Java not found**
```bash
# Error: java: command not found
```

**Solutions:**
1. Install OpenJDK:
   ```bash
   # Ubuntu/Debian
   sudo apt install openjdk-11-jdk
   
   # CentOS/RHEL
   sudo yum install java-11-openjdk-devel
   
   # macOS
   brew install openjdk@11
   ```

2. Set JAVA_HOME:
   ```bash
   export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
   echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk' >> ~/.bashrc
   ```

**Problem: Wrong Java version**
```bash
# Error: Unsupported major.minor version
```

**Solutions:**
1. Check Java version:
   ```bash
   java -version
   javac -version
   ```

2. Install correct version:
   ```bash
   # For Minecraft 1.17+, use Java 16+
   sudo apt install openjdk-16-jdk
   ```

### Node.js Installation Issues

**Problem: Node.js version too old**
```bash
# Error: Node.js 18.20.4 is below recommended version 20.19+
```

**Solutions:**
1. Update Node.js:
   ```bash
   # Using Node Version Manager (nvm)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 20.19.0
   nvm use 20.19.0
   ```

2. Install from official repository:
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

## Application Startup Issues

### Backend Startup Problems

**Problem: Port 5000 already in use**
```bash
# Error: Address already in use
```

**Solutions:**
1. Find process using port:
   ```bash
   sudo lsof -i :5000
   sudo netstat -tlnp | grep 5000
   ```

2. Kill the process:
   ```bash
   sudo kill -9 <PID>
   ```

3. Use different port:
   ```bash
   export FLASK_RUN_PORT=5001
   python run.py
   ```

**Problem: Database connection fails**
```bash
# Error: sqlite3.OperationalError: unable to open database file
```

**Solutions:**
1. Check file permissions:
   ```bash
   ls -la instance/
   chmod 755 instance/
   chmod 644 instance/minecraft_manager.db
   ```

2. Check disk space:
   ```bash
   df -h
   ```

3. Recreate database:
   ```bash
   rm instance/minecraft_manager.db
   python run.py
   ```

**Problem: Import errors**
```bash
# Error: ModuleNotFoundError: No module named 'flask'
```

**Solutions:**
1. Activate virtual environment:
   ```bash
   source venv/bin/activate
   ```

2. Install missing dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Check Python path:
   ```bash
   echo $PYTHONPATH
   export PYTHONPATH=$PYTHONPATH:$(pwd)
   ```

### Frontend Startup Problems

**Problem: Frontend won't start**
```bash
# Error: npm run dev fails
```

**Solutions:**
1. Check Node.js version:
   ```bash
   node --version
   npm --version
   ```

2. Clear npm cache:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Check port availability:
   ```bash
   netstat -tlnp | grep 3000
   ```

**Problem: Build failures**
```bash
# Error: npm run build fails
```

**Solutions:**
1. Check TypeScript errors:
   ```bash
   npx tsc --noEmit
   ```

2. Check ESLint errors:
   ```bash
   npm run lint
   ```

3. Update dependencies:
   ```bash
   npm update
   ```

## Server Management Issues

### Server Creation Problems

**Problem: Server creation fails**
```bash
# Error: Failed to create server directory
```

**Solutions:**
1. Check directory permissions:
   ```bash
   ls -la servers/
   chmod 755 servers/
   ```

2. Check disk space:
   ```bash
   df -h
   ```

3. Verify Java installation:
   ```bash
   java -version
   which java
   ```

**Problem: Minecraft version not found**
```bash
# Error: Version not available
```

**Solutions:**
1. Check internet connection
2. Verify Minecraft version API access
3. Try different version
4. Check server logs for detailed error

### Server Startup Problems

**Problem: Server won't start**
```bash
# Error: Server failed to start
```

**Solutions:**
1. Check EULA acceptance:
   ```bash
   cat servers/[server-name]/eula.txt
   ```

2. Check Java version compatibility
3. Verify memory allocation
4. Check server logs:
   ```bash
   tail -f servers/[server-name]/logs/latest.log
   ```

**Problem: Server starts but immediately stops**
```bash
# Error: Server process dies immediately
```

**Solutions:**
1. Check memory allocation:
   ```bash
   free -h
   ```

2. Review server logs for errors
3. Check Java heap space:
   ```bash
   java -Xmx1024M -Xms1024M -jar server.jar
   ```

4. Verify server properties:
   ```bash
   cat servers/[server-name]/server.properties
   ```

### Server Status Issues

**Problem: Server status shows incorrectly**
```bash
# Error: Status not updating
```

**Solutions:**
1. Check process status:
   ```bash
   ps aux | grep java
   ```

2. Reconcile server status:
   - Go to Admin → Process Management
   - Click "Reconcile Server Statuses"

3. Restart application:
   ```bash
   pkill -f "python run.py"
   python run.py
   ```

**Problem: Orphaned processes**
```bash
# Error: Multiple Java processes running
```

**Solutions:**
1. Find orphaned processes:
   ```bash
   ps aux | grep java
   ```

2. Kill orphaned processes:
   ```bash
   kill -9 <PID>
   ```

3. Use admin interface:
   - Go to Admin → Process Management
   - Click "Find Orphaned Processes"

## Authentication Issues

### Login Problems

**Problem: Can't log in**
```bash
# Error: Invalid credentials
```

**Solutions:**
1. Check username/password
2. Verify user account exists:
   ```bash
   sqlite3 instance/minecraft_manager.db "SELECT * FROM users;"
   ```

3. Reset password:
   - Go to Admin → User Management
   - Click "Reset Password"

**Problem: Session expires immediately**
```bash
# Error: Session timeout
```

**Solutions:**
1. Check system time:
   ```bash
   date
   ```

2. Clear browser cookies
3. Check session configuration:
   ```bash
   grep -r "SESSION" app/config.py
   ```

### Permission Issues

**Problem: Access denied**
```bash
# Error: Admin privileges required
```

**Solutions:**
1. Check user role:
   ```bash
   sqlite3 instance/minecraft_manager.db "SELECT username, is_admin FROM users WHERE username='your_username';"
   ```

2. Grant admin privileges:
   ```bash
   sqlite3 instance/minecraft_manager.db "UPDATE users SET is_admin=1 WHERE username='your_username';"
   ```

3. Restart application

## Database Issues

### Database Connection Problems

**Problem: Database locked**
```bash
# Error: database is locked
```

**Solutions:**
1. Check for running processes:
   ```bash
   ps aux | grep python
   ```

2. Kill all Python processes:
   ```bash
   pkill -f python
   ```

3. Check file permissions:
   ```bash
   ls -la instance/minecraft_manager.db
   ```

**Problem: Database corruption**
```bash
# Error: database disk image is malformed
```

**Solutions:**
1. Backup current database:
   ```bash
   cp instance/minecraft_manager.db instance/minecraft_manager.db.backup
   ```

2. Try to repair:
   ```bash
   sqlite3 instance/minecraft_manager.db ".dump" | sqlite3 instance/minecraft_manager_new.db
   mv instance/minecraft_manager_new.db instance/minecraft_manager.db
   ```

3. Recreate database:
   ```bash
   rm instance/minecraft_manager.db
   python run.py
   ```

### Data Integrity Issues

**Problem: Missing data**
```bash
# Error: Server not found
```

**Solutions:**
1. Check database integrity:
   ```bash
   sqlite3 instance/minecraft_manager.db "PRAGMA integrity_check;"
   ```

2. Verify data exists:
   ```bash
   sqlite3 instance/minecraft_manager.db "SELECT * FROM servers;"
   ```

3. Restore from backup if available

## Memory and Performance Issues

### Memory Problems

**Problem: Out of memory**
```bash
# Error: Cannot allocate memory
```

**Solutions:**
1. Check system memory:
   ```bash
   free -h
   ```

2. Reduce server memory allocation
3. Stop unused servers
4. Increase system memory or add swap:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

**Problem: Memory leak**
```bash
# Error: Memory usage keeps increasing
```

**Solutions:**
1. Monitor memory usage:
   ```bash
   top -p $(pgrep -f "python run.py")
   ```

2. Restart application periodically
3. Check for memory leaks in code
4. Use memory profiling tools

### Performance Issues

**Problem: Slow response times**
```bash
# Error: Application is slow
```

**Solutions:**
1. Check system resources:
   ```bash
   top
   iostat 1
   ```

2. Optimize database queries
3. Increase system resources
4. Use caching mechanisms

**Problem: High CPU usage**
```bash
# Error: CPU usage is high
```

**Solutions:**
1. Identify high CPU processes:
   ```bash
   top -o %CPU
   ```

2. Optimize code
3. Reduce server count
4. Use more efficient algorithms

## Network and Connectivity Issues

### Port Issues

**Problem: Port already in use**
```bash
# Error: Address already in use
```

**Solutions:**
1. Find process using port:
   ```bash
   sudo lsof -i :5000
   ```

2. Kill the process:
   ```bash
   sudo kill -9 <PID>
   ```

3. Use different port:
   ```bash
   export FLASK_RUN_PORT=5001
   ```

**Problem: Port not accessible**
```bash
# Error: Connection refused
```

**Solutions:**
1. Check firewall settings:
   ```bash
   sudo ufw status
   sudo ufw allow 5000
   ```

2. Check if service is running:
   ```bash
   netstat -tlnp | grep 5000
   ```

3. Check binding address:
   ```bash
   netstat -tlnp | grep python
   ```

### CORS Issues

**Problem: CORS errors in browser**
```bash
# Error: Access to fetch at 'http://localhost:5000' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solutions:**
1. Check CORS configuration in Flask app
2. Verify frontend proxy settings
3. Check browser console for errors
4. Test API directly with curl

## Frontend Issues

### Build Issues

**Problem: TypeScript errors**
```bash
# Error: TypeScript compilation fails
```

**Solutions:**
1. Check TypeScript configuration:
   ```bash
   npx tsc --noEmit
   ```

2. Fix type errors
3. Update type definitions:
   ```bash
   npm install @types/react @types/react-dom
   ```

**Problem: ESLint errors**
```bash
# Error: ESLint validation fails
```

**Solutions:**
1. Check ESLint configuration:
   ```bash
   npm run lint
   ```

2. Fix linting errors
3. Update ESLint rules if needed

### Runtime Issues

**Problem: React errors**
```bash
# Error: React component errors
```

**Solutions:**
1. Check browser console for errors
2. Use React DevTools
3. Check component props and state
4. Verify API responses

**Problem: API connection issues**
```bash
# Error: API calls failing
```

**Solutions:**
1. Check backend is running:
   ```bash
   curl http://localhost:5000/api/v1/auth/status
   ```

2. Check network tab in browser DevTools
3. Verify API endpoints
4. Check authentication status

## System-Specific Issues

### Linux Issues

**Problem: Permission denied**
```bash
# Error: Permission denied
```

**Solutions:**
1. Check file permissions:
   ```bash
   ls -la
   chmod 755 scripts/
   chmod +x scripts/*.sh
   ```

2. Run with sudo if needed:
   ```bash
   sudo python run.py
   ```

**Problem: Systemd service issues**
```bash
# Error: Service won't start
```

**Solutions:**
1. Check service status:
   ```bash
   sudo systemctl status mcservermanager
   ```

2. Check service logs:
   ```bash
   sudo journalctl -u mcservermanager -f
   ```

3. Reload service configuration:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart mcservermanager
   ```

### macOS Issues

**Problem: Homebrew issues**
```bash
# Error: Homebrew installation fails
```

**Solutions:**
1. Update Homebrew:
   ```bash
   brew update
   brew upgrade
   ```

2. Fix Homebrew permissions:
   ```bash
   sudo chown -R $(whoami) /usr/local/bin /usr/local/lib /usr/local/sbin
   ```

**Problem: Python path issues**
```bash
# Error: Python not found
```

**Solutions:**
1. Use Homebrew Python:
   ```bash
   brew install python3
   ```

2. Update PATH:
   ```bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

### Windows Issues

**Problem: PowerShell execution policy**
```bash
# Error: Execution policy prevents running scripts
```

**Solutions:**
1. Change execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. Use Command Prompt instead of PowerShell

**Problem: Path issues**
```bash
# Error: Command not found
```

**Solutions:**
1. Add Python to PATH:
   - Go to System Properties → Environment Variables
   - Add Python installation directory to PATH

2. Use full paths:
   ```cmd
   C:\Python39\python.exe run.py
   ```

## Error Codes Reference

### HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Application Error Codes

- **AUTH_001**: Invalid credentials
- **AUTH_002**: Session expired
- **AUTH_003**: Admin privileges required
- **SERVER_001**: Server not found
- **SERVER_002**: Server already running
- **SERVER_003**: Insufficient memory
- **SERVER_004**: Port already in use
- **DB_001**: Database connection failed
- **DB_002**: Database locked
- **DB_003**: Data integrity error

### System Error Codes

- **SYS_001**: Java not found
- **SYS_002**: Insufficient disk space
- **SYS_003**: Permission denied
- **SYS_004**: Port already in use
- **SYS_005**: Process not found

## Log Analysis

### Application Logs

**Location**: `app.log`

**Common Log Entries:**
```
2024-12-19 10:30:00,123 INFO: Server started successfully
2024-12-19 10:30:01,456 ERROR: Failed to start server: Java not found
2024-12-19 10:30:02,789 WARNING: High memory usage detected
```

**Log Analysis Commands:**
```bash
# View recent logs
tail -f app.log

# Search for errors
grep -i error app.log

# Search for specific server
grep "ServerName" app.log

# Count log entries by level
grep -c "ERROR" app.log
grep -c "WARNING" app.log
grep -c "INFO" app.log
```

### Server Logs

**Location**: `servers/[server-name]/logs/`

**Common Server Log Entries:**
```
[10:30:00] [Server thread/INFO]: Starting minecraft server version 1.21.8
[10:30:01] [Server thread/ERROR]: Failed to start server
[10:30:02] [Server thread/WARN]: Can't keep up! Is the server overloaded?
```

**Server Log Analysis:**
```bash
# View latest server log
tail -f servers/[server-name]/logs/latest.log

# Search for errors
grep -i error servers/[server-name]/logs/latest.log

# Search for specific events
grep "Player joined" servers/[server-name]/logs/latest.log
```

### System Logs

**Location**: `/var/log/` (Linux)

**Common System Log Entries:**
```
Dec 19 10:30:00 hostname systemd[1]: Started Minecraft Server Manager
Dec 19 10:30:01 hostname python3[1234]: Server started on port 5000
```

**System Log Analysis:**
```bash
# View system logs
sudo journalctl -u mcservermanager -f

# Search for errors
sudo journalctl -u mcservermanager | grep -i error

# View logs for specific time
sudo journalctl -u mcservermanager --since "2024-12-19 10:00:00"
```

## Recovery Procedures

### Complete System Recovery

**Step 1: Stop All Services**
```bash
# Stop application
pkill -f "python run.py"

# Stop all Minecraft servers
pkill -f "java.*server.jar"

# Stop frontend
pkill -f "npm run dev"
```

**Step 2: Backup Current State**
```bash
# Create backup directory
mkdir -p backups/$(date +%Y%m%d_%H%M%S)

# Backup database
cp instance/minecraft_manager.db backups/$(date +%Y%m%d_%H%M%S)/

# Backup server files
cp -r servers/ backups/$(date +%Y%m%d_%H%M%S)/

# Backup configuration
cp config.json backups/$(date +%Y%m%d_%H%M%S)/
```

**Step 3: Clean System**
```bash
# Remove temporary files
rm -rf __pycache__/
rm -rf frontend/node_modules/
rm -rf frontend/dist/

# Clear logs
> app.log
```

**Step 4: Reinstall Dependencies**
```bash
# Backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

**Step 5: Restart Services**
```bash
# Start backend
python run.py

# Start frontend (in separate terminal)
cd frontend
npm run dev
```

### Database Recovery

**Step 1: Backup Current Database**
```bash
cp instance/minecraft_manager.db instance/minecraft_manager.db.backup
```

**Step 2: Check Database Integrity**
```bash
sqlite3 instance/minecraft_manager.db "PRAGMA integrity_check;"
```

**Step 3: Repair Database**
```bash
sqlite3 instance/minecraft_manager.db ".dump" | sqlite3 instance/minecraft_manager_new.db
mv instance/minecraft_manager_new.db instance/minecraft_manager.db
```

**Step 4: Verify Data**
```bash
sqlite3 instance/minecraft_manager.db "SELECT COUNT(*) FROM users;"
sqlite3 instance/minecraft_manager.db "SELECT COUNT(*) FROM servers;"
```

### Server Recovery

**Step 1: Identify Orphaned Processes**
```bash
ps aux | grep java
```

**Step 2: Kill Orphaned Processes**
```bash
kill -9 <PID>
```

**Step 3: Reconcile Server Status**
- Go to Admin → Process Management
- Click "Reconcile Server Statuses"

**Step 4: Restart Servers**
- Go to server list
- Start servers one by one
- Monitor logs for errors

## FAQ

### General Questions

**Q: How do I update the application?**
A: Stop all services, backup your data, pull the latest code, update dependencies, and restart the application.

**Q: Can I run multiple instances?**
A: Yes, but you'll need to use different ports and database files for each instance.

**Q: How do I backup my servers?**
A: Use the built-in backup feature in the web interface, or manually copy the `servers/` directory.

**Q: What's the maximum number of servers I can run?**
A: This depends on your system resources. Each server typically uses 1-4GB of RAM.

### Technical Questions

**Q: How do I change the default port?**
A: Set the `FLASK_RUN_PORT` environment variable or modify the configuration file.

**Q: Can I use a different database?**
A: Yes, the application supports SQLite, PostgreSQL, and MySQL. Modify the database configuration.

**Q: How do I enable HTTPS?**
A: Use a reverse proxy like Nginx with SSL certificates, or configure Flask with SSL.

**Q: How do I monitor server performance?**
A: Use the built-in monitoring features in the admin panel, or integrate with external monitoring tools.

### Troubleshooting Questions

**Q: My server won't start, what should I check?**
A: Check Java installation, EULA acceptance, available memory, port availability, and server logs.

**Q: The web interface is slow, what can I do?**
A: Check system resources, reduce the number of running servers, optimize server configurations, and ensure adequate RAM and CPU.

**Q: How do I recover from a corrupted database?**
A: Restore from a backup if available, or recreate the database and reconfigure your servers.

**Q: How do I fix permission issues?**
A: Check file permissions, ensure the application user has proper access, and use `chmod` and `chown` as needed.

### Security Questions

**Q: How do I secure the application?**
A: Use strong passwords, enable HTTPS, configure firewall rules, keep the system updated, and monitor access logs.

**Q: How do I change the admin password?**
A: Use the password change feature in the web interface, or reset it through the database.

**Q: How do I restrict access to certain users?**
A: Use the user management features to control user roles and permissions.

**Q: How do I enable two-factor authentication?**
A: This feature is not currently implemented, but you can use a reverse proxy with 2FA.

---

## Getting Help

### Support Resources

1. **Check Logs**: Review application and server logs for error messages
2. **Documentation**: Refer to the user guide and developer guide
3. **Community**: Check the project repository for issues and discussions
4. **Professional Support**: Contact the development team for enterprise support

### Reporting Issues

When reporting issues, please include:
- System information (OS, Python version, Java version)
- Error messages and logs
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable

### Emergency Contacts

- **Critical Issues**: Create a high-priority issue in the project repository
- **Security Issues**: Report privately to the development team
- **Data Loss**: Stop all operations and contact support immediately

---

**Minecraft Server Manager** - Troubleshooting Guide

*This guide covers the most common issues and solutions. For additional support, refer to the project documentation and community resources.*
