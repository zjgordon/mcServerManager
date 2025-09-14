# Process Management for Minecraft Server Manager

This document describes the comprehensive process management system implemented to
address orphaned processes, incorrect status reporting, and process lifecycle
management.

## Overview

The process management system ensures that:

- Server statuses accurately reflect actual running processes
- Orphaned processes are detected and reported
- Process statuses are reconciled on app startup
- Periodic status checks maintain accuracy
- Only processes created by the app are managed (no heavy hammer approach)

## Features

### 1. Real-time Process Verification

- **`verify_process_status(pid)`**: Verifies if a process is actually running and
  validates it's a Java Minecraft server
- **Process Validation**: Checks process name, command line, and working directory
  ensure it's a legitimate Minecraft server
- **Error Handling**: Gracefully handles access denied, non-existent processes, and
  other edge cases

### 2. Startup Process Reconciliation

- **`reconcile_server_statuses()`**: Called automatically on app startup
- Updates database statuses to match actual running processes
- Detects and reports orphaned processes
- Ensures consistency between database and system state

### 3. Orphaned Process Detection

- **`find_orphaned_minecraft_processes()`**: Identifies Minecraft server processes
  not
  managed by the app
- Scans all Java processes for Minecraft server characteristics
- Cross-references with database to find unmanaged processes
- Provides detailed information about orphaned processes

### 4. Periodic Status Checks

- **`periodic_status_check()`**: Regularly verifies server process statuses
- Updates database for dead processes
- Can be called manually or via automated scheduling
- Lightweight operation for frequent execution

### 5. Admin Process Management Interface

- **Process Management Page**: Admin-only interface for process oversight
- Real-time process status display
- Manual reconciliation triggers
- Orphaned process reporting
- Process information details (CPU, memory, creation time)

## Usage

### Automatic Features

- **Startup Reconciliation**: Runs automatically when the app starts
- **Real-time Verification**: Home page displays accurate statuses
- **Process Validation**: All server operations verify process status

### Manual Admin Actions

1. **Access Process Management**: Admin dropdown → Process Management
2. **Reconcile Statuses**: Updates all server statuses based on actual processes
3. **Run Status Check**: Performs a quick check of all server processes
4. **Find Orphaned**: Identifies unmanaged Minecraft processes

### Automated Status Checks

```bash
# Set up periodic status checks (every 5 minutes)
cd /path/to/mcServerManager
chmod +x scripts/setup_status_check.sh
./scripts/setup_status_check.sh
```

## API Endpoint

### Status Check Endpoint

- **URL**: `/admin/status_check`
- **Method**: POST
- **Authentication**: API Key (X-API-Key header or api_key form field)
- **Purpose**: External schedulers can trigger status checks
- **Security**: Requires STATUS_CHECK_API_KEY environment variable

```bash
# Example usage
curl -X POST \
  -H "X-API-Key: your_api_key" \
  http://localhost:5000/admin/status_check
```

## Configuration

### Environment Variables

```bash
# API key for status check endpoint
STATUS_CHECK_API_KEY=your_secure_api_key_here
```

### Cron Job Setup

The setup script creates a cron job that runs every 5 minutes:

```bash
*/5 * * * * /path/to/mcServerManager/scripts/status_check.sh
```

## Process Detection Logic

### Minecraft Server Identification

A process is considered a Minecraft server if:

1. **Process Name**: Contains "java"
2. **Command Line**: Contains "server.jar" and "nogui"
3. **Working Directory**: Points to a server directory

### Status Reconciliation

- **Running Servers**: Verifies process exists and is responsive
- **Stopped Servers**: No action needed
- **Dead Processes**: Updates status to "Stopped" and clears PID
- **Orphaned Processes**: Reports but doesn't terminate (safety)

## Safety Features

### No Automatic Termination

- Orphaned processes are reported but not automatically killed
- Manual intervention required for process cleanup
- Prevents accidental termination of legitimate processes

### Process Validation

- Multiple validation layers ensure only Minecraft servers are managed
- Command line and working directory verification
- Cross-reference with database records

### Error Handling

- Graceful degradation when processes are inaccessible
- Comprehensive logging for debugging
- No single point of failure

## Monitoring and Logging

### Log Files

- **Application Logs**: `app.log` - General application logging
- **Status Check Logs**: `logs/status_check.log` - Periodic check results

### Log Levels

- **INFO**: Normal operations, status updates
- **WARNING**: Orphaned processes detected
- **ERROR**: Process verification failures, database errors

## Troubleshooting

### Common Issues

1. **Process Not Found Errors**
   - Check if the process actually exists
   - Verify PID in database matches system
   - Run manual reconciliation

2. **Access Denied Errors**
   - Ensure app has permission to read process information
   - Check if running as correct user
   - Verify system permissions

3. **Orphaned Process Reports**
   - Review process details in admin interface
   - Check if processes were started manually
   - Consider if processes should be managed by the app

### Debug Commands

```bash
# Check current cron jobs
crontab -l

# View status check logs
tail -f logs/status_check.log

# Manual status check
curl -X POST -H "X-API-Key: your_key" http://localhost:5000/admin/status_check

# Check process status directly
ps aux | grep java
```

## Best Practices

1. **Regular Monitoring**: Use the admin interface to monitor process health
2. **Scheduled Checks**: Set up automated status checks for production environments
3. **Secure API Keys**: Use strong, unique API keys for external access
4. **Log Rotation**: Implement log rotation for status check logs
5. **Backup Verification**: Ensure backup processes don't interfere with status checks

## Future Enhancements

- **Process Metrics**: CPU and memory usage tracking
- **Automatic Recovery**: Restart failed servers automatically
- **Process Groups**: Manage related processes together
- **Health Checks**: Network connectivity and server response verification
- **Integration**: Webhook notifications for process failures
