# Console Commands Implementation Plan

**Date:** January 27, 2025  
**Status:** Planning Phase  
**Target Sprint:** 09-2025_SPRINT_3  
**Feature:** Real-Time Console Streaming and Command Injection for Server Management Page

---

## Executive Summary

This plan outlines the implementation of real-time console streaming and command injection capabilities for the Minecraft Server Manager's Server Management Page. The current implementation uses polling-based log fetching and basic command execution. This enhancement will provide true real-time console streaming and seamless command injection, making the server management experience equivalent to directly interacting with a terminal.

## Current State Analysis

### Existing Infrastructure ✅
- **Server Management Page**: Fully implemented with template (`server_management.html`)
- **Console API Endpoints**: Complete REST API in `app/routes/api/console_routes.py`
- **Command Execution**: Working `execute_server_command()` function in `app/utils.py`
- **Frontend JavaScript**: Comprehensive `server_management.js` with polling-based updates
- **Process Management**: Robust server start/stop with PID tracking
- **Feature Flag System**: Experimental features properly gated

### Current Limitations ❌
- **Polling-Based Updates**: Console uses 2.5-second polling instead of real-time streaming
- **No WebSocket Support**: Missing real-time bidirectional communication
- **Limited Process Integration**: Commands sent via stdin but no real-time output capture
- **Static Log Reading**: Reads from log files instead of live process output
- **No Process Output Streaming**: Missing real-time stdout/stderr capture from running processes

---

## Technical Requirements

### 1. Real-Time Console Streaming
- **WebSocket Implementation**: Bidirectional real-time communication
- **Process Output Capture**: Live stdout/stderr streaming from Minecraft server processes
- **Log Formatting**: Proper parsing and display of Minecraft server logs
- **Connection Management**: Handle disconnections, reconnections, and cleanup
- **Performance Optimization**: Efficient streaming without overwhelming the client

### 2. Command Injection System
- **Process Input Integration**: Direct stdin injection to running Minecraft processes
- **Command Validation**: Security validation and sanitization
- **Real-Time Feedback**: Immediate command execution feedback
- **Command History**: Persistent command history per server
- **Error Handling**: Graceful handling of command execution failures

### 3. Server Status Integration
- **Process Monitoring**: Real-time server process status updates
- **Resource Usage**: Live memory and CPU usage tracking
- **Connection State**: WebSocket connection status indicators
- **Server State Changes**: Automatic updates when server starts/stops

---

## Implementation Plan

### Phase 1: WebSocket Infrastructure (4-6 hours)

#### Task 1.1: Install WebSocket Dependencies
- **File**: `requirements.txt`
- **Dependencies**: 
  - `flask-socketio` for WebSocket support
  - `eventlet` or `gevent` for async support
- **Configuration**: Update Flask app configuration for SocketIO

#### Task 1.2: Create WebSocket Service
- **File**: `app/services/websocket_service.py` (new)
- **Features**:
  - WebSocket connection management
  - Room-based connections (per server)
  - Connection authentication and authorization
  - Message routing and broadcasting

#### Task 1.3: Integrate WebSocket with Flask App
- **File**: `app/__init__.py`
- **Changes**:
  - Initialize SocketIO with Flask app
  - Register WebSocket service
  - Configure CORS and security settings

#### Task 1.4: Create WebSocket Routes
- **File**: `app/routes/websocket_routes.py` (new)
- **Events**:
  - `connect` - Handle client connections
  - `disconnect` - Handle client disconnections
  - `join_server` - Join server-specific room
  - `leave_server` - Leave server room

### Phase 2: Process Output Streaming (6-8 hours)

#### Task 2.1: Create Process Stream Manager
- **File**: `app/services/process_stream_manager.py` (new)
- **Features**:
  - Track running Minecraft server processes
  - Capture stdout/stderr in real-time
  - Parse Minecraft log format
  - Stream output to WebSocket clients

#### Task 2.2: Implement Log Parser
- **File**: `app/utils/log_parser.py` (new)
- **Features**:
  - Parse Minecraft server log format
  - Extract timestamps, log levels, and messages
  - Handle different Minecraft versions
  - Error handling for malformed logs

#### Task 2.3: Create Process Monitor Service
- **File**: `app/services/process_monitor.py` (new)
- **Features**:
  - Monitor server process lifecycle
  - Detect process start/stop events
  - Track process resource usage
  - Notify WebSocket clients of status changes

#### Task 2.4: Integrate with Existing Server Management
- **File**: `app/routes/server_routes.py`
- **Changes**:
  - Start process streaming when server starts
  - Stop streaming when server stops
  - Handle process cleanup

### Phase 3: Enhanced Command Execution (3-4 hours)

#### Task 3.1: Create Command Manager Service
- **File**: `app/services/command_manager.py` (new)
- **Features**:
  - Real-time command execution
  - Command validation and sanitization
  - Command history management
  - Execution feedback via WebSocket

#### Task 3.2: Enhance Command Execution
- **File**: `app/utils.py`
- **Function**: `execute_server_command_realtime()`
- **Features**:
  - Direct stdin injection to process
  - Real-time execution feedback
  - Command result streaming
  - Error handling and logging

#### Task 3.3: Create Command History System
- **File**: `app/models.py`
- **Model**: `CommandHistory`
- **Features**:
  - Store command history per server
  - Track execution timestamps
  - Store command results
  - User association

### Phase 4: Frontend WebSocket Integration (4-5 hours)

#### Task 4.1: Create WebSocket Client
- **File**: `app/static/js/websocket_client.js` (new)
- **Features**:
  - WebSocket connection management
  - Automatic reconnection
  - Message handling and routing
  - Error handling and user feedback

#### Task 4.2: Update Server Management JavaScript
- **File**: `app/static/js/server_management.js`
- **Changes**:
  - Replace polling with WebSocket streaming
  - Real-time console updates
  - Live command execution feedback
  - Connection status indicators

#### Task 4.3: Enhance Console Display
- **File**: `app/templates/server_management.html`
- **Changes**:
  - Real-time console output
  - Connection status indicators
  - Enhanced command input
  - Live server status updates

### Phase 5: Process Management Integration (3-4 hours)

#### Task 5.1: Update Server Start Process
- **File**: `app/routes/server_routes.py`
- **Function**: `start_server()`
- **Changes**:
  - Start process streaming immediately
  - Initialize WebSocket room for server
  - Handle streaming errors gracefully

#### Task 5.2: Update Server Stop Process
- **File**: `app/routes/server_routes.py`
- **Function**: `stop_server()`
- **Changes**:
  - Stop process streaming
  - Clean up WebSocket connections
  - Notify clients of server stop

#### Task 5.3: Create Process Lifecycle Manager
- **File**: `app/services/process_lifecycle_manager.py` (new)
- **Features**:
  - Coordinate server start/stop with streaming
  - Handle process crashes and recovery
  - Manage WebSocket room lifecycle
  - Cleanup orphaned connections

### Phase 6: Testing and Optimization (4-6 hours)

#### Task 6.1: Unit Tests
- **Files**: `tests/unit/test_websocket_service.py`, `tests/unit/test_process_stream_manager.py`
- **Coverage**:
  - WebSocket connection handling
  - Process output streaming
  - Command execution
  - Error handling

#### Task 6.2: Integration Tests
- **Files**: `tests/integration/test_realtime_console.py`
- **Coverage**:
  - End-to-end WebSocket communication
  - Real-time console streaming
  - Command execution flow
  - Process lifecycle management

#### Task 6.3: Performance Testing
- **Scenarios**:
  - Multiple concurrent connections
  - High-frequency log output
  - Memory usage monitoring
  - Connection stability testing

---

## Technical Architecture

### WebSocket Communication Flow
```
Client (Browser) ←→ WebSocket Server ←→ Process Stream Manager ←→ Minecraft Process
                      ↓
                 Command Manager ←→ Process stdin
```

### Process Output Streaming
```
Minecraft Process (stdout/stderr) → Process Stream Manager → Log Parser → WebSocket → Client
```

### Command Execution Flow
```
Client → WebSocket → Command Manager → Process stdin → Minecraft Process
                    ↓
               Execution Feedback → WebSocket → Client
```

---

## Database Changes

### New Tables
```sql
-- Command History Table
CREATE TABLE command_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    command TEXT NOT NULL,
    result TEXT,
    executed_at DATETIME NOT NULL,
    success BOOLEAN NOT NULL,
    FOREIGN KEY (server_id) REFERENCES server (id),
    FOREIGN KEY (user_id) REFERENCES user (id)
);

-- WebSocket Connections Table (for monitoring)
CREATE TABLE websocket_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    server_id INTEGER,
    user_id INTEGER NOT NULL,
    connected_at DATETIME NOT NULL,
    last_activity DATETIME,
    FOREIGN KEY (server_id) REFERENCES server (id),
    FOREIGN KEY (user_id) REFERENCES user (id)
);
```

---

## API Endpoints

### WebSocket Events
- `connect` - Client connects to WebSocket
- `disconnect` - Client disconnects
- `join_server` - Join server-specific room
- `leave_server` - Leave server room
- `execute_command` - Execute server command
- `get_logs` - Request current log history

### REST API Extensions
- `GET /api/console/<server_id>/stream/status` - Get streaming status
- `POST /api/console/<server_id>/stream/start` - Start streaming
- `POST /api/console/<server_id>/stream/stop` - Stop streaming
- `GET /api/console/<server_id>/commands/history` - Get command history

---

## Security Considerations

### WebSocket Security
- **Authentication**: Verify user authentication on connection
- **Authorization**: Check server access permissions
- **Rate Limiting**: Limit WebSocket message frequency
- **Input Validation**: Sanitize all WebSocket messages

### Command Execution Security
- **Command Validation**: Whitelist allowed commands
- **Input Sanitization**: Prevent command injection
- **User Permissions**: Verify user can execute commands on server
- **Audit Logging**: Log all command executions

### Process Security
- **Process Isolation**: Ensure process streaming doesn't expose system
- **Resource Limits**: Limit WebSocket connection resources
- **Cleanup**: Proper cleanup of process streams and connections

---

## Performance Considerations

### WebSocket Optimization
- **Connection Pooling**: Efficient connection management
- **Message Batching**: Batch log messages to reduce overhead
- **Compression**: Compress large log messages
- **Heartbeat**: Implement connection health checks

### Process Streaming Optimization
- **Buffer Management**: Efficient stdout/stderr buffering
- **Log Parsing**: Optimized log parsing for performance
- **Memory Usage**: Monitor and limit memory usage
- **Cleanup**: Automatic cleanup of inactive streams

---

## File Structure Changes

### New Files
```
app/
├── services/
│   ├── websocket_service.py          # WebSocket management
│   ├── process_stream_manager.py     # Process output streaming
│   ├── process_monitor.py            # Process monitoring
│   ├── command_manager.py            # Command execution
│   └── process_lifecycle_manager.py  # Process lifecycle coordination
├── utils/
│   └── log_parser.py                 # Log parsing utilities
├── routes/
│   └── websocket_routes.py           # WebSocket routes
├── static/
│   └── js/
│       └── websocket_client.js       # WebSocket client
└── models/
    └── command_history.py            # Command history model
```

### Modified Files
```
app/
├── __init__.py                       # SocketIO integration
├── routes/
│   ├── server_routes.py              # Enhanced server management
│   └── api/
│       └── console_routes.py         # Extended console API
├── static/
│   └── js/
│       └── server_management.js      # WebSocket integration
├── templates/
│   └── server_management.html        # Enhanced UI
└── utils.py                          # Enhanced command execution
```

---

## Success Criteria

### Functional Requirements
- ✅ Real-time console streaming without polling
- ✅ Live command execution with immediate feedback
- ✅ WebSocket connection stability and reconnection
- ✅ Process output streaming from running servers
- ✅ Command history persistence and retrieval
- ✅ Server status updates in real-time

### Technical Requirements
- ✅ WebSocket implementation with proper error handling
- ✅ Process streaming without performance impact
- ✅ Secure command execution and validation
- ✅ Comprehensive test coverage
- ✅ Backward compatibility with existing features

### User Experience
- ✅ Instant console updates (no 2.5-second delay)
- ✅ Real-time command execution feedback
- ✅ Seamless connection management
- ✅ Intuitive error handling and recovery
- ✅ Mobile-friendly real-time interface

---

## Risk Mitigation

### Technical Risks
- **Risk**: WebSocket connection instability
- **Mitigation**: Implement robust reconnection logic and fallback to polling

- **Risk**: Process streaming performance impact
- **Mitigation**: Implement efficient buffering and resource monitoring

- **Risk**: Command execution security vulnerabilities
- **Mitigation**: Comprehensive input validation and audit logging

### Integration Risks
- **Risk**: Breaking existing server management functionality
- **Mitigation**: Maintain backward compatibility and comprehensive testing

- **Risk**: WebSocket scaling issues
- **Mitigation**: Implement connection pooling and resource limits

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: WebSocket Infrastructure | 4-6 hours | None |
| Phase 2: Process Output Streaming | 6-8 hours | Phase 1 |
| Phase 3: Enhanced Command Execution | 3-4 hours | Phase 2 |
| Phase 4: Frontend WebSocket Integration | 4-5 hours | Phase 3 |
| Phase 5: Process Management Integration | 3-4 hours | Phase 4 |
| Phase 6: Testing and Optimization | 4-6 hours | Phase 5 |
| **Total** | **24-33 hours** | |

---

## Dependencies

### External Dependencies
- `flask-socketio` - WebSocket support for Flask
- `eventlet` or `gevent` - Async support for WebSockets
- No additional database dependencies

### Internal Dependencies
- Existing server management infrastructure
- Process management system
- Authentication and authorization system
- Feature flag system

---

## Implementation Notes

### WebSocket Implementation Choice
- **Flask-SocketIO**: Chosen for seamless Flask integration
- **Eventlet**: Recommended for production async support
- **Room-based Architecture**: Server-specific rooms for efficient message routing

### Process Streaming Approach
- **Direct Process Access**: Stream directly from process stdout/stderr
- **Non-blocking I/O**: Use async I/O for process streaming
- **Buffer Management**: Implement efficient buffering for high-frequency output

### Command Execution Strategy
- **Direct stdin Injection**: Send commands directly to process stdin
- **Real-time Feedback**: Stream command results immediately
- **History Persistence**: Store command history in database

---

## Post-Implementation

### Monitoring
- WebSocket connection metrics
- Process streaming performance
- Command execution success rates
- Resource usage monitoring

### Future Enhancements
- **Advanced Log Filtering**: Real-time log filtering and search
- **Command Autocomplete**: Intelligent command suggestions
- **Multi-Server Management**: Manage multiple servers simultaneously
- **Performance Metrics**: Real-time server performance monitoring
- **Plugin Integration**: Support for server plugins and mods

---

## Conclusion

This plan provides a comprehensive roadmap for implementing real-time console streaming and command injection capabilities. The implementation will transform the current polling-based system into a true real-time experience, making server management as intuitive as working directly with a terminal.

The phased approach ensures incremental development with continuous testing, maintaining application stability throughout the implementation process. The WebSocket-based architecture provides a solid foundation for future real-time features while maintaining security and performance standards.

By following this plan, the development team will deliver a professional-grade server management interface that significantly enhances the user experience while maintaining the application's reliability and security standards.
