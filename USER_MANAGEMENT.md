# User Management System

## Overview

The Minecraft Server Manager now includes a comprehensive user management system with role-based access control. This system provides secure user authentication, admin privileges, and server ownership management.

## Features

### 🔐 **User Authentication**
- **Secure Login**: Password-based authentication with hashing
- **Session Management**: Flask-Login integration for secure sessions
- **Last Login Tracking**: Monitor user activity and login history
- **Account Status**: Active/inactive account management

### 👑 **Admin Privileges**
- **Role-Based Access**: Admin and regular user roles
- **Admin Controls**: Full system access and user management
- **Server Oversight**: Admins can manage all servers from any user
- **User Management**: Create, edit, delete, and manage user accounts

### 🎮 **Server Ownership**
- **User Isolation**: Users can only manage their own servers
- **Admin Override**: Admins can access and manage any server
- **Ownership Tracking**: Each server is linked to its creator
- **Access Control**: Secure server operations with ownership validation

### 🚀 **First-Time Setup**
- **Admin Creation**: Initial admin account setup on first run
- **Guided Setup**: Step-by-step admin account creation
- **Validation**: Comprehensive input validation and error handling
- **Security**: Secure password requirements and validation

## User Roles

### Admin User
- **Full System Access**: Can manage all servers and users
- **User Management**: Create, edit, delete, and manage user accounts
- **Server Oversight**: Access and control any server in the system
- **System Configuration**: Access to all administrative features
- **Memory Management**: View system-wide memory usage

### Regular User
- **Own Server Management**: Can only manage their own servers
- **Limited Access**: Restricted to their own server list
- **Memory Tracking**: View their own memory allocation
- **Server Operations**: Create, start, stop, backup, and delete their servers

## Database Schema

### User Model
```python
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    # Properties
    @property
    def server_count(self):
        return len(self.servers)
    
    @property
    def total_memory_allocated(self):
        return sum(server.memory_mb for server in self.servers)
```

### Server Model Updates
```python
class Server(db.Model):
    # ... existing fields ...
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    owner = db.relationship('User', backref=db.backref('servers', lazy=True))
```

## User Management Routes

### Authentication Routes
- `GET/POST /login` - User login
- `GET /logout` - User logout
- `GET/POST /set_admin_password` - First-time admin setup
- `GET /` - Index redirect based on authentication status

### Admin Routes
- `GET/POST /add_user` - Add new user (admin only)
- `GET /manage_users` - User management dashboard (admin only)
- `GET/POST /edit_user/<user_id>` - Edit user details (admin only)
- `POST /delete_user/<user_id>` - Delete user (admin only)
- `POST /reset_user_password/<user_id>` - Reset user password (admin only)

### User Routes
- `GET/POST /change_password` - Change own password

## First-Time Setup

### Initial Admin Creation
When the application is first launched:

1. **Automatic Redirect**: Users are redirected to admin setup if no admin exists
2. **Admin Creation Form**: Comprehensive form with validation
3. **Security Requirements**: Username (3+ chars), password (8+ chars)
4. **Email Optional**: Optional email address for admin account
5. **Automatic Setup**: Admin account created and ready for use

### Setup Process
```bash
# Start the application
python3 run.py

# Navigate to http://localhost:5000
# You'll be redirected to admin setup if no admin exists
```

## User Management Interface

### Admin Dashboard
The admin dashboard (`/manage_users`) provides:

1. **User List**: Comprehensive table with all users
2. **User Statistics**: Server count, memory usage, creation date
3. **User Actions**: Edit, delete, and manage user accounts
4. **Status Indicators**: Active/inactive, admin/regular user badges
5. **Quick Actions**: Add new users, manage existing accounts

### User Information Display
- **Username**: User's login name
- **Email**: Contact information (optional)
- **Role**: Admin or regular user badge
- **Status**: Active or inactive account
- **Servers**: Number of servers owned
- **Memory Used**: Total memory allocation
- **Created**: Account creation date
- **Last Login**: Most recent login time

## Security Features

### Access Control
- **Admin Decorator**: `@admin_required` for admin-only routes
- **Ownership Validation**: `check_server_access()` for server operations
- **Session Security**: Flask-Login session management
- **Password Security**: Werkzeug password hashing

### Validation
- **Input Validation**: Comprehensive form validation
- **Duplicate Prevention**: Username and email uniqueness
- **Password Requirements**: Minimum length and confirmation
- **Account Status**: Active/inactive account management

### Error Handling
- **Access Denied**: Clear error messages for unauthorized access
- **Validation Errors**: User-friendly validation feedback
- **Database Integrity**: Foreign key constraints and relationships
- **Graceful Degradation**: Proper error handling and fallbacks

## Memory Management Integration

### User-Specific Memory
- **Per-User Tracking**: Memory allocation tracked by user
- **Admin Overview**: System-wide memory usage for admins
- **User Limits**: Individual user memory allocation display
- **Memory Validation**: User-specific memory validation

### Memory Functions
```python
def get_total_allocated_memory(user_id=None):
    """Get memory allocated by specific user or all users."""
    
def get_available_memory(user_id=None):
    """Get available memory for specific user or system-wide."""
    
def get_memory_usage_summary(user_id=None):
    """Get memory usage summary for specific user or system-wide."""
```

## User Interface

### Navigation
- **Admin Navigation**: "Manage Users" link in navigation bar
- **User Information**: Current user display in navigation
- **Role-Based UI**: Different interfaces for admin and regular users
- **Contextual Actions**: Role-appropriate action buttons

### Templates
- **set_admin_password.html**: First-time admin setup
- **add_user.html**: Add new user form
- **manage_users.html**: User management dashboard
- **edit_user.html**: Edit user details
- **Updated home.html**: Role-based server display

## Testing

### Test Coverage
Comprehensive tests in `tests/test_user_management.py`:

1. **User Model Tests**:
   - User creation and properties
   - Server count and memory calculation
   - String representation

2. **Admin Setup Tests**:
   - First-time admin creation
   - Form validation
   - Setup process

3. **Authentication Tests**:
   - Login/logout functionality
   - Session management
   - Account status validation

4. **User Management Tests**:
   - Admin-only access control
   - User CRUD operations
   - Password management

5. **Server Ownership Tests**:
   - Ownership assignment
   - Access control validation
   - Admin override functionality

6. **Memory Integration Tests**:
   - User-specific memory calculation
   - Memory usage summaries

### Running Tests
```bash
# Run user management tests
python3 -m pytest tests/test_user_management.py -v

# Run all tests
python3 -m pytest tests/ -v
```

## Usage Examples

### Creating Admin Account
1. Start the application
2. Navigate to the application URL
3. You'll be redirected to admin setup
4. Fill in admin details:
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `securepassword123`
   - Confirm Password: `securepassword123`
5. Submit the form
6. Login with your new admin account

### Adding Users (Admin)
1. Login as admin
2. Click "Manage Users" in navigation
3. Click "Add New User"
4. Fill in user details:
   - Username: `newuser`
   - Email: `user@example.com`
   - Password: `userpassword123`
   - Admin privileges: Check if needed
5. Submit the form

### Managing Servers (User)
1. Login as regular user
2. View your servers on the home page
3. Create new servers (they'll be owned by you)
4. Manage your servers (start, stop, backup, delete)
5. View your memory usage

### Managing All Servers (Admin)
1. Login as admin
2. View all servers on the home page
3. See server ownership in the "Owner" column
4. Manage any server regardless of ownership
5. View system-wide memory usage

## Benefits

### 🔒 **Security**
- Role-based access control
- Secure authentication
- Server ownership isolation
- Admin oversight capabilities

### 👥 **User Management**
- Comprehensive user administration
- Account status management
- User activity tracking
- Password management

### 🎯 **User Experience**
- Clear role distinction
- Intuitive navigation
- Helpful error messages
- Guided first-time setup

### 🔧 **Administrative Control**
- Centralized user management
- Server oversight capabilities
- Memory usage monitoring
- System-wide administration

## Future Enhancements

### Planned Features
1. **User Groups**: Group-based permissions and access control
2. **Advanced Permissions**: Granular permission system
3. **User Activity Logs**: Detailed user activity tracking
4. **Password Policies**: Configurable password requirements
5. **Email Verification**: Email-based account verification
6. **Two-Factor Authentication**: Enhanced security options
7. **User Quotas**: Configurable limits per user
8. **Audit Logging**: Comprehensive system audit trails

## Troubleshooting

### Common Issues
1. **Migration Errors**: Run database migration if upgrading
2. **Access Denied**: Check user role and permissions
3. **User Not Found**: Verify user exists and is active
4. **Server Access**: Check server ownership and user permissions

### Debug Information
Enable debug logging for user management:
```python
import logging
logging.getLogger('app.routes.auth_routes').setLevel(logging.DEBUG)
```

## Conclusion

The user management system provides a robust, secure foundation for multi-user Minecraft server management. It ensures proper access control, user isolation, and administrative oversight while maintaining a user-friendly interface and comprehensive security features.
