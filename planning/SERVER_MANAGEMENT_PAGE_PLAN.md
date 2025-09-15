# Server Management Page Development Plan

**Date:** January 27, 2025  
**Status:** Planning Phase  
**Target Sprint:** 09-2025_SPRINT_2  
**Feature:** Server Management Page with Real-Time Console Integration

---

## Overview

This plan outlines the development of a comprehensive Server Management Page that will replace the current dummy console modal with a full-featured server management interface. The feature will be gated behind an experimental feature flag, allowing for controlled rollout and testing.

## Current State Analysis

### Existing Infrastructure
- ✅ **Experimental Features System**: Fully implemented with `ExperimentalFeature` model
- ✅ **Feature Flag Utilities**: Complete API in `app/utils.py` for feature management
- ✅ **Admin Configuration**: UI exists with dummy experimental features
- ✅ **Server Routes**: Well-structured with proper access control and error handling
- ✅ **Console Modal**: Currently shows sample data, needs real implementation

### Current Console Implementation
- **Location**: `app/templates/home.html` (lines 387-421)
- **JavaScript**: `app/templates/base.html` (lines 440-465, 945-975)
- **Data**: Hardcoded sample logs in `loadConsoleLogs()` function
- **Functionality**: Basic modal with refresh, clear, and download buttons

---

## Technical Requirements

### 1. Feature Flag Management
- Remove dummy experimental features from admin config
- Add "Server Management Page" feature flag
- Default state: **DISABLED** (experimental)
- Admin can toggle via existing UI

### 2. Server Management Page Structure
- **Route**: `/server/manage/<int:server_id>`
- **Template**: `app/templates/server_management.html`
- **Access Control**: Same as existing server routes (admin or owner)
- **Layout**: Full-page interface (not modal)

### 3. Page Components

#### 3.1 Server Information Section
- Server name, version, port, memory allocation
- Configuration options (gamemode, difficulty, etc.)
- Status indicator with real-time updates
- Owner information (for admins)

#### 3.2 Server Controls Section
- Start/Stop server buttons
- Copy server link functionality
- Manage backups (redirect to existing page)
- Delete server (with confirmation)

#### 3.3 Real-Time Console Section
- Live server log streaming
- Command input field
- Log filtering (INFO, WARN, ERROR)
- Auto-scroll and manual scroll controls
- Clear console functionality

#### 3.4 Server Commands Section
- Pre-defined command buttons (help, list, etc.)
- Custom command input
- Command history
- Command execution feedback

---

## Implementation Plan

### Phase 1: Feature Flag Setup (1-2 hours)

#### Task 1.1: Clean Up Dummy Data
- **File**: `app/templates/admin_config.html`
- **Action**: Remove dummy experimental feature cards (lines 151-239)
- **Replace**: Single "Server Management Page" feature card
- **Status**: Experimental, disabled by default

#### Task 1.2: Update Database
- **File**: `migrations/versions/`
- **Action**: Create migration to update experimental features
- **Remove**: Dummy features (advanced_monitoring, auto_backup, multi_user, plugin_manager)
- **Add**: `server_management_page` feature

#### Task 1.3: Update Admin Config Handler
- **File**: `app/routes/auth_routes.py`
- **Action**: Update `admin_config()` function to handle new feature
- **Integration**: Use existing `toggle_experimental_feature()` utility

### Phase 2: Server Management Route (2-3 hours)

#### Task 2.1: Create Server Management Route
- **File**: `app/routes/server_routes.py`
- **Route**: `@server_bp.route("/manage/<int:server_id>")`
- **Method**: GET only
- **Access Control**: Use existing `check_server_access()` function
- **Feature Check**: Verify `server_management_page` feature is enabled

#### Task 2.2: Create Server Management Template
- **File**: `app/templates/server_management.html`
- **Extends**: `base.html`
- **Sections**: Information, Controls, Console, Commands
- **Responsive**: Mobile-friendly layout
- **Styling**: Consistent with existing design system

#### Task 2.3: Add Feature Flag Check to Home Template
- **File**: `app/templates/home.html`
- **Action**: Conditionally show "Manage Server" button instead of "Console"
- **Logic**: Check `is_feature_enabled('server_management_page')`
- **Fallback**: Keep existing console button if feature disabled

### Phase 3: Real-Time Console Integration (4-6 hours)

#### Task 3.1: Create Console API Endpoints
- **File**: `app/routes/api/console_routes.py` (new file)
- **Endpoints**:
  - `GET /api/console/<server_id>/logs` - Stream server logs
  - `POST /api/console/<server_id>/command` - Execute console command
  - `GET /api/console/<server_id>/status` - Get server status

#### Task 3.2: Implement Log Parsing
- **File**: `app/utils.py`
- **Function**: `parse_server_logs(log_file_path)`
- **Features**:
  - Extract timestamp, level, message
  - Handle different log formats
  - Error handling for missing/corrupted logs

#### Task 3.3: Create Console JavaScript Module
- **File**: `app/static/js/server_management.js` (new file)
- **Features**:
  - Real-time log streaming with WebSocket or polling
  - Command execution
  - Auto-scroll management
  - Log filtering
  - Error handling and user feedback

#### Task 3.4: Integrate with Server Management Page
- **File**: `app/templates/server_management.html`
- **Action**: Include console JavaScript and API calls
- **Features**: Real-time updates, command input, log display

### Phase 4: Server Commands Implementation (2-3 hours)

#### Task 4.1: Create Command Execution System
- **File**: `app/utils.py`
- **Function**: `execute_server_command(server_id, command)`
- **Features**:
  - Validate server is running
  - Execute command via process input
  - Return execution result
  - Error handling

#### Task 4.2: Add Pre-defined Commands
- **File**: `app/templates/server_management.html`
- **Commands**:
  - Help (`/help`)
  - List players (`/list`)
  - Server info (`/info`)
  - Stop server (`/stop`)
  - Custom command input

#### Task 4.3: Command History and Feedback
- **File**: `app/static/js/server_management.js`
- **Features**:
  - Command history storage
  - Execution feedback display
  - Error message handling

### Phase 5: UI/UX Enhancements (2-3 hours)

#### Task 5.1: Responsive Design
- **File**: `app/static/css/style.css`
- **Features**:
  - Mobile-optimized layout
  - Touch-friendly controls
  - Responsive console display

#### Task 5.2: Real-time Status Updates
- **File**: `app/static/js/server_management.js`
- **Features**:
  - Server status polling
  - Memory usage updates
  - Player count updates
  - Visual status indicators

#### Task 5.3: User Experience Improvements
- **Features**:
  - Loading states
  - Error messages
  - Success confirmations
  - Keyboard shortcuts

### Phase 6: Testing and Integration (2-3 hours)

#### Task 6.1: Unit Tests
- **Files**: `tests/unit/test_server_management.py`
- **Coverage**:
  - Feature flag functionality
  - Route access control
  - Console API endpoints
  - Command execution

#### Task 6.2: Integration Tests
- **Files**: `tests/integration/test_server_management.py`
- **Coverage**:
  - End-to-end server management flow
  - Console functionality
  - Feature flag integration

#### Task 6.3: Manual Testing
- **Scenarios**:
  - Feature disabled (fallback to console modal)
  - Feature enabled (server management page)
  - Console log streaming
  - Command execution
  - Error handling

---

## File Structure Changes

### New Files
```
app/
├── routes/
│   └── api/
│       └── console_routes.py          # Console API endpoints
├── static/
│   └── js/
│       └── server_management.js       # Server management JavaScript
├── templates/
│   └── server_management.html         # Server management page template
└── tests/
    ├── unit/
    │   └── test_server_management.py  # Unit tests
    └── integration/
        └── test_server_management.py  # Integration tests
```

### Modified Files
```
app/
├── routes/
│   ├── auth_routes.py                 # Update admin config handler
│   └── server_routes.py               # Add server management route
├── templates/
│   ├── admin_config.html              # Remove dummy features, add server management
│   └── home.html                      # Conditional console/manage button
├── static/
│   └── css/
│       └── style.css                  # Server management page styles
└── utils.py                           # Add console and command utilities
```

---

## Database Changes

### Migration: Update Experimental Features
```sql
-- Remove dummy features
DELETE FROM experimental_feature WHERE feature_key IN (
    'advanced_monitoring', 'auto_backup', 'multi_user', 'plugin_manager'
);

-- Add server management page feature
INSERT INTO experimental_feature 
(feature_key, feature_name, description, enabled, is_stable, created_at, updated_at)
VALUES 
('server_management_page', 'Server Management Page', 
 'Enhanced server management interface with real-time console and advanced controls',
 false, false, datetime('now'), datetime('now'));
```

---

## API Endpoints

### Console API
- `GET /api/console/<server_id>/logs` - Get server logs
- `POST /api/console/<server_id>/command` - Execute command
- `GET /api/console/<server_id>/status` - Get server status

### Server Management
- `GET /server/manage/<server_id>` - Server management page
- `POST /server/manage/<server_id>/command` - Execute server command

---

## Security Considerations

### Access Control
- Use existing `check_server_access()` function
- Admin can access any server
- Regular users can only access their own servers
- Feature flag check prevents unauthorized access

### Command Execution
- Validate commands before execution
- Sanitize input to prevent injection
- Log all command executions
- Rate limiting for command execution

### Error Handling
- Graceful degradation if feature disabled
- Proper error messages for users
- Logging for debugging
- Fallback to existing console modal

---

## Performance Considerations

### Real-time Updates
- Efficient log streaming (avoid full file reads)
- Debounced API calls
- Client-side caching
- Connection management

### Memory Usage
- Limit log history in memory
- Efficient log parsing
- Cleanup of old data
- Monitor resource usage

---

## Success Criteria

### Functional Requirements
- ✅ Feature flag controls access to server management page
- ✅ Server management page displays all required information
- ✅ Real-time console log streaming works correctly
- ✅ Server commands execute properly
- ✅ UI is responsive and user-friendly
- ✅ Fallback to console modal when feature disabled

### Technical Requirements
- ✅ All existing tests continue to pass
- ✅ New functionality has comprehensive test coverage
- ✅ Code follows existing patterns and conventions
- ✅ No performance degradation
- ✅ Proper error handling and logging

### User Experience
- ✅ Intuitive interface for server management
- ✅ Real-time feedback for all operations
- ✅ Clear error messages and loading states
- ✅ Mobile-friendly design
- ✅ Consistent with existing application design

---

## Risk Mitigation

### Development Risks
- **Risk**: Feature flag system not working correctly
- **Mitigation**: Comprehensive testing of feature flag functionality

- **Risk**: Real-time console performance issues
- **Mitigation**: Implement efficient streaming and client-side optimization

- **Risk**: Command execution security vulnerabilities
- **Mitigation**: Input validation, sanitization, and proper error handling

### Integration Risks
- **Risk**: Breaking existing console modal functionality
- **Mitigation**: Maintain backward compatibility and thorough testing

- **Risk**: Database migration issues
- **Mitigation**: Test migration on development environment first

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Feature Flag Setup | 1-2 hours | None |
| Phase 2: Server Management Route | 2-3 hours | Phase 1 |
| Phase 3: Real-Time Console | 4-6 hours | Phase 2 |
| Phase 4: Server Commands | 2-3 hours | Phase 3 |
| Phase 5: UI/UX Enhancements | 2-3 hours | Phase 4 |
| Phase 6: Testing and Integration | 2-3 hours | Phase 5 |
| **Total** | **13-20 hours** | |

---

## Dependencies

### External Dependencies
- No new external dependencies required
- Uses existing Flask, SQLAlchemy, and JavaScript infrastructure

### Internal Dependencies
- Experimental features system (already implemented)
- Server routes and access control (already implemented)
- Console modal functionality (to be enhanced)

---

## Post-Implementation

### Monitoring
- Monitor feature flag usage
- Track console performance
- Monitor command execution success rates
- User feedback collection

### Future Enhancements
- WebSocket implementation for real-time updates
- Advanced log filtering and search
- Command autocomplete
- Server performance metrics integration
- Multi-server management interface

---

## Conclusion

This plan provides a comprehensive roadmap for implementing the Server Management Page feature while maintaining application stability and following existing patterns. The phased approach allows for incremental development and testing, ensuring that the application remains functional throughout the development process.

The implementation leverages existing infrastructure (experimental features, server routes, access control) while adding significant new functionality. The real-time console integration addresses the current limitation of dummy data and provides users with actual server management capabilities.

By following this plan, the development team can deliver a robust, user-friendly server management interface that enhances the overall user experience while maintaining the application's reliability and security standards.

