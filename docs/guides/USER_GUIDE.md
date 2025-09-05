# Minecraft Server Manager - User Guide

Welcome to the Minecraft Server Manager! This comprehensive guide will help you get started with creating, managing, and monitoring your Minecraft servers.

## Table of Contents

1. [Getting Started](#getting-started)
2. [First-Time Setup](#first-time-setup)
3. [Creating Your First Server](#creating-your-first-server)
4. [Managing Servers](#managing-servers)
5. [Server Configuration](#server-configuration)
6. [User Management](#user-management)
7. [System Administration](#system-administration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

## Getting Started

### What is Minecraft Server Manager?

Minecraft Server Manager is a professional web application that allows you to:
- Create and manage multiple Minecraft servers
- Monitor server performance and status
- Manage users and permissions
- Configure server settings through a web interface
- Backup and restore server data

### System Requirements

**Minimum Requirements:**
- **Operating System**: Linux/Unix (Ubuntu, CentOS, Debian recommended)
- **Python**: 3.8 or higher
- **Java**: 8 or higher (for Minecraft servers)
- **RAM**: 2GB minimum (4GB+ recommended)
- **Storage**: 10GB free space minimum

**Recommended Requirements:**
- **RAM**: 8GB or more
- **Storage**: 50GB+ SSD storage
- **CPU**: Multi-core processor
- **Network**: Stable internet connection

### Installation

1. **Download and Extract**
   ```bash
   git clone <repository-url>
   cd mcServerManager
   ```

2. **Set Up Python Environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Start the Application**
   ```bash
   python run.py
   ```

4. **Access the Web Interface**
   Open your browser and navigate to `http://localhost:5000`

## First-Time Setup

### Initial Admin Account Setup

When you first start the application, you'll need to create an administrator account:

1. **Navigate to Setup Page**
   - The application will automatically redirect you to the setup page
   - If not, go to `http://localhost:5000/setup`

2. **Create Admin Account**
   - **Username**: Choose a secure username (e.g., `admin`)
   - **Password**: Create a strong password (minimum 8 characters)
   - **Email**: Enter your email address
   - **Confirm Password**: Re-enter your password

3. **Complete Setup**
   - Click "Create Admin Account"
   - You'll be automatically logged in as the administrator

### System Configuration

After creating your admin account, configure the system:

1. **Access Admin Panel**
   - Click on "Admin" in the navigation menu
   - Select "System Configuration"

2. **Configure Memory Settings**
   - **Maximum Total Memory**: Set the total memory limit for all servers
   - **Default Server Memory**: Set the default memory for new servers
   - **Maximum Server Memory**: Set the maximum memory per server

3. **Configure System Settings**
   - **Application Title**: Customize the application name
   - **Server Hostname**: Set your server's hostname
   - **Save Configuration**: Click "Save" to apply changes

## Creating Your First Server

### Step-by-Step Server Creation

1. **Navigate to Server Creation**
   - Click "Create Server" in the main navigation
   - Or click the "+" button on the servers page

2. **Basic Server Information**
   - **Server Name**: Enter a descriptive name (e.g., "My Creative Server")
   - **Minecraft Version**: Select from available versions
   - **Memory Allocation**: Set memory (default: 1024MB)

3. **Server Configuration**
   - **Game Mode**: Choose from Survival, Creative, Adventure, or Spectator
   - **Difficulty**: Select Peaceful, Easy, Normal, or Hard
   - **Level Seed**: Enter a world seed (optional)
   - **PvP**: Enable/disable player vs player combat
   - **Spawn Monsters**: Enable/disable monster spawning
   - **MOTD**: Enter a message of the day

4. **Advanced Settings**
   - **Hardcore Mode**: Enable for permanent death
   - **Custom Port**: Specify a custom port (optional)
   - **Additional Properties**: Configure other server properties

5. **Create Server**
   - Review your settings
   - Click "Create Server"
   - Wait for the server files to be generated

### Accepting the EULA

Before starting your server, you must accept the Minecraft EULA:

1. **Navigate to Server Details**
   - Click on your newly created server
   - You'll see an "Accept EULA" button

2. **Accept EULA**
   - Click "Accept EULA"
   - Confirm your acceptance
   - The server is now ready to start

## Managing Servers

### Starting and Stopping Servers

**Starting a Server:**
1. Navigate to your server list
2. Click the "Start" button next to your server
3. Wait for the server to start (this may take 1-2 minutes)
4. The status will change to "Running"

**Stopping a Server:**
1. Click the "Stop" button next to your running server
2. Confirm the shutdown
3. Wait for the server to stop gracefully
4. The status will change to "Stopped"

### Server Status Monitoring

The application provides real-time server monitoring:

- **Status Indicators**: Green (Running), Red (Stopped), Yellow (Starting/Stopping)
- **Process ID**: Shows the server's process ID when running
- **Memory Usage**: Displays current memory consumption
- **Uptime**: Shows how long the server has been running

### Server Actions

**Available Actions:**
- **Start**: Start the server
- **Stop**: Stop the server
- **Restart**: Stop and start the server
- **Backup**: Create a backup of server files
- **Configure**: Edit server settings
- **Delete**: Remove the server and all files

### Creating Backups

1. **Navigate to Server**
   - Click on the server you want to backup
   - Click the "Backup" button

2. **Backup Process**
   - The system will create a compressed backup
   - Backups are stored in the `backups/` directory
   - You'll receive a confirmation when complete

3. **Backup Management**
   - Backups are automatically named with timestamps
   - Old backups can be manually deleted to save space
   - Backups include all server files and world data

## Server Configuration

### Editing Server Settings

1. **Access Server Configuration**
   - Click on your server
   - Click "Configure" or "Edit Settings"

2. **Modify Settings**
   - **Basic Settings**: Name, memory, game mode, difficulty
   - **World Settings**: Seed, spawn settings, world type
   - **Gameplay Settings**: PvP, monsters, animals, structures
   - **Server Settings**: MOTD, port, max players

3. **Apply Changes**
   - Click "Save Changes"
   - Restart the server to apply most changes
   - Some changes require server restart

### Advanced Configuration

**Server Properties File:**
- The system generates a `server.properties` file
- Advanced users can modify this file directly
- Changes take effect after server restart

**World Management:**
- Worlds are stored in the `world/` directory
- You can replace world files manually
- Backup before making changes

## User Management

### Creating Users (Admin Only)

1. **Access User Management**
   - Go to Admin → User Management
   - Click "Add New User"

2. **User Information**
   - **Username**: Choose a unique username
   - **Password**: Set a secure password
   - **Email**: Enter user's email address
   - **Role**: Select Admin or Regular User

3. **User Permissions**
   - **Admin Users**: Can manage all servers and users
   - **Regular Users**: Can only manage their own servers

### Managing Existing Users

**Edit User:**
- Click on a user in the user list
- Modify username, email, or role
- Save changes

**Reset Password:**
- Click "Reset Password" next to a user
- Enter new password
- Confirm the change

**Deactivate User:**
- Click "Deactivate" to disable a user account
- User cannot log in until reactivated

### User Roles and Permissions

**Administrator:**
- Full access to all servers
- User management capabilities
- System configuration access
- Process management tools

**Regular User:**
- Can create and manage their own servers
- Limited to their assigned servers
- Cannot access admin functions
- Can change their own password

## System Administration

### System Monitoring

**Dashboard Overview:**
- Total servers and running servers
- Memory usage and allocation
- User statistics
- System health status

**Process Management:**
- View all running Minecraft processes
- Identify orphaned processes
- Reconcile server statuses
- Monitor system resources

### Memory Management

**Memory Allocation:**
- Set system-wide memory limits
- Configure per-server memory limits
- Monitor memory usage across all servers
- Prevent memory over-allocation

**Memory Monitoring:**
- Real-time memory usage display
- Memory allocation statistics
- Server-specific memory consumption
- System memory availability

### System Maintenance

**Regular Maintenance Tasks:**
- Monitor server logs for errors
- Check for orphaned processes
- Verify server status accuracy
- Clean up old backup files

**Automated Tasks:**
- Status checks every 5 minutes
- Process reconciliation
- Memory usage monitoring
- Log rotation

## Troubleshooting

### Common Issues

**Server Won't Start:**
1. Check if EULA has been accepted
2. Verify Java is installed and accessible
3. Check available memory
4. Review server logs for errors
5. Ensure port is not in use

**Server Keeps Stopping:**
1. Check memory allocation
2. Review server logs
3. Verify Java version compatibility
4. Check system resources
5. Look for error messages

**Can't Access Web Interface:**
1. Verify the application is running
2. Check firewall settings
3. Confirm port 5000 is accessible
4. Check application logs
5. Verify Python environment

**Memory Issues:**
1. Check system memory usage
2. Reduce server memory allocation
3. Stop unused servers
4. Monitor for memory leaks
5. Restart the application

### Error Messages

**"EULA not accepted":**
- Accept the EULA before starting the server
- Go to server details and click "Accept EULA"

**"Port already in use":**
- Choose a different port
- Stop the service using the port
- Check for other Minecraft servers

**"Insufficient memory":**
- Reduce server memory allocation
- Stop other servers
- Increase system memory

**"Java not found":**
- Install Java 8 or higher
- Verify Java is in system PATH
- Check Java installation

### Getting Help

**Log Files:**
- Application logs: `app.log`
- Server logs: `servers/[server-name]/logs/`
- Status check logs: `logs/status_check.log`

**Support Resources:**
- Check this user guide
- Review error messages
- Check application logs
- Verify system requirements

## Best Practices

### Server Management

**Memory Allocation:**
- Allocate memory based on expected player count
- Leave 1-2GB for the system
- Monitor memory usage regularly
- Use 1GB per 10-20 players as a guideline

**Backup Strategy:**
- Create regular backups
- Test backup restoration
- Keep multiple backup versions
- Store backups in safe locations

**Server Configuration:**
- Start with default settings
- Make changes gradually
- Test changes on non-production servers
- Document custom configurations

### Security

**User Accounts:**
- Use strong passwords
- Regularly update passwords
- Limit admin accounts
- Monitor user activity

**System Security:**
- Keep the system updated
- Use firewall protection
- Regular security audits
- Monitor access logs

### Performance

**System Optimization:**
- Use SSD storage for better performance
- Ensure adequate RAM
- Monitor CPU usage
- Optimize network settings

**Server Optimization:**
- Use appropriate Minecraft versions
- Configure server properties for performance
- Monitor server performance
- Regular maintenance

## FAQ

### General Questions

**Q: How many servers can I run simultaneously?**
A: This depends on your system resources. Each server typically uses 1-4GB of RAM. Monitor your system's memory usage and adjust accordingly.

**Q: Can I run different Minecraft versions?**
A: Yes, you can run different versions simultaneously. Each server can use a different Minecraft version.

**Q: Is there a limit to the number of users?**
A: No, there's no hard limit on users. However, consider your system resources and management overhead.

### Technical Questions

**Q: Can I use a different database?**
A: Yes, the system supports SQLite (default), PostgreSQL, and MySQL. Modify the database configuration in the settings.

**Q: How do I update the application?**
A: Stop all servers, backup your data, update the code, and restart the application. Always test updates in a non-production environment first.

**Q: Can I run this on Windows?**
A: The application is designed for Linux/Unix systems. While it may work on Windows with modifications, it's not officially supported.

### Server Questions

**Q: How do I add plugins to my server?**
A: You can manually add plugins to the server's `plugins/` directory. The web interface doesn't currently support plugin management.

**Q: Can I import existing servers?**
A: Yes, you can manually copy server files to the `servers/` directory and configure them through the web interface.

**Q: How do I change server ports?**
A: Edit the server configuration and specify a custom port. Ensure the port is not in use by other services.

### Troubleshooting Questions

**Q: My server won't start, what should I check?**
A: Check the EULA acceptance, Java installation, available memory, port availability, and server logs for specific error messages.

**Q: How do I recover from a corrupted server?**
A: Restore from a backup if available. If no backup exists, you may need to recreate the server and restore world files manually.

**Q: The web interface is slow, what can I do?**
A: Check system resources, reduce the number of running servers, optimize server configurations, and ensure adequate RAM and CPU.

---

## Support and Resources

### Documentation
- **API Documentation**: See [API_DOCUMENTATION.md](../api/API_DOCUMENTATION.md)
- **Process Management**: See [PROCESS_MANAGEMENT.md](../development/PROCESS_MANAGEMENT.md)
- **Security Guide**: See [SECURITY.md](../../.github/SECURITY.md)
- **Contributing Guide**: See [CONTRIBUTING.md](../../.github/CONTRIBUTING.md)

### Getting Help
- **Check Logs**: Review application and server logs
- **Error Messages**: Read error messages carefully
- **System Requirements**: Verify your system meets requirements
- **Community**: Check project repository for issues and discussions

### Updates and Maintenance
- **Regular Updates**: Keep the application updated
- **Backup Strategy**: Maintain regular backups
- **Monitoring**: Monitor system and server performance
- **Security**: Keep security practices up to date

---

**Minecraft Server Manager** - Professional server management made simple.

*This guide covers the essential features and usage of Minecraft Server Manager. For advanced configuration and troubleshooting, refer to the technical documentation and support resources.*
