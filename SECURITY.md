# Security Documentation

## Overview

The Minecraft Server Manager implements comprehensive security measures appropriate for hobbyist use on local networks and the internet. This document outlines the security features, best practices, and recommendations for secure deployment.

## 🔒 Security Features

### Authentication & Authorization

#### Password Security

- **Strong Password Policy**: Minimum 8 characters with uppercase, lowercase, and digits required
- **Password Hashing**: Uses Werkzeug's secure password hashing (scrypt)
- **Password Validation**: Prevents common weak passwords and username-in-password
- **Password Expiry**: Configurable password expiration (default: 1 year)

#### Session Management

- **Secure Sessions**: HTTPOnly cookies with SameSite protection
- **Session Timeout**: Configurable session lifetime (default: 1 hour)
- **Session Refresh**: Sessions refresh on each request
- **HTTPS Enforcement**: Optional HTTPS requirement in production

#### Access Control

- **Role-Based Access Control (RBAC)**: Admin and regular user roles
- **Resource Ownership**: Users can only manage their own servers
- **Admin Privileges**: Admins can manage all servers and users
- **Decorator Protection**: `@admin_required` and `@login_required` decorators

### Input Validation & Sanitization

#### Server Name Validation

- **Path Traversal Prevention**: Blocks `../`, `./`, `\`, `/` patterns
- **Character Restrictions**: Only alphanumeric, underscore, hyphen allowed
- **Length Limits**: 1-150 characters
- **Reserved Name Protection**: Blocks Windows reserved names

#### Input Sanitization

- **XSS Prevention**: Removes dangerous HTML/JavaScript characters
- **Length Limits**: Configurable maximum input lengths
- **Type Validation**: Ensures proper data types

#### File Upload Security

- **Extension Validation**: Only allows specific file types (jar, zip, tar.gz)
- **Size Limits**: Configurable maximum file sizes
- **Path Traversal Prevention**: Blocks dangerous filenames
- **Secure Filenames**: Generates safe filenames with timestamps

### Rate Limiting & Brute Force Protection

#### Login Protection

- **Rate Limiting**: 5 login attempts per 5 minutes per IP
- **Username-Specific Limits**: Additional limits per username
- **Account Lockout**: Temporary lockout after failed attempts
- **Audit Logging**: Logs all login attempts (success/failure)

#### General Rate Limiting

- **Request Limits**: Configurable limits per day/hour/minute
- **IP-Based Tracking**: Tracks requests by IP address
- **Graceful Degradation**: Returns 429 status on limit exceeded

### Security Headers

#### HTTP Security Headers

- **X-Content-Type-Options**: Prevents MIME type sniffing
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-XSS-Protection**: Enables browser XSS protection
- **Strict-Transport-Security**: Enforces HTTPS (when enabled)
- **Content-Security-Policy**: Restricts resource loading

#### CSP Configuration

```javascript
default-src 'self';
script-src 'self' 'unsafe-inline' https://code.jquery.com https://cdnjs.cloudflare.com https://maxcdn.bootstrapcdn.com;
style-src 'self' 'unsafe-inline' https://maxcdn.bootstrapcdn.com;
img-src 'self' data:;
font-src 'self' https://maxcdn.bootstrapcdn.com;
```

### CSRF Protection

#### Form Protection

- **CSRF Tokens**: All forms include CSRF tokens
- **Token Validation**: Server-side token verification
- **Token Expiry**: Tokens expire after 1 hour
- **Secure Generation**: Cryptographically secure token generation

### Audit Logging

#### Security Events

- **Login Attempts**: Success and failure logging
- **User Management**: Account creation, modification, deletion
- **Server Operations**: Start, stop, delete, backup actions
- **Admin Actions**: Configuration changes, user management
- **System Events**: Application startup, errors, warnings

#### Log Format

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "action": "login_success",
  "user_id": 123,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "details": {
    "username": "admin"
  }
}
```

## 🛡️ Security Configuration

### Environment Variables

#### Required Security Settings

```bash
# Generate a secure secret key
SECRET_KEY=your_secure_random_key_here

# Enable HTTPS in production
SESSION_COOKIE_SECURE=True

# Database security
DATABASE_URL=sqlite:///minecraft_manager.db
```

#### Optional Security Settings

```bash
# Rate limiting configuration
RATELIMIT_DEFAULT=200 per day;50 per hour;10 per minute
RATELIMIT_LOGIN=5 per minute

# Password policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_SPECIAL=False

# Session configuration
PERMANENT_SESSION_LIFETIME=3600
```

### Configuration File

The application uses a JSON configuration file for persistent settings:

```json
{
  "memory": {
    "max_total_mb": 8192,
    "default_server_mb": 1024,
    "min_server_mb": 512,
    "max_server_mb": 4096
  },
  "system": {
    "auto_refresh_interval": 30,
    "max_servers_per_user": 10
  }
}
```

## 🔧 Security Best Practices

### Deployment Security

#### Production Checklist

- [ ] **Use HTTPS**: Configure SSL/TLS certificates
- [ ] **Secure Secret Key**: Generate a strong SECRET_KEY
- [ ] **Database Security**: Use secure database connections
- [ ] **File Permissions**: Restrict access to application files
- [ ] **Firewall Configuration**: Limit network access
- [ ] **Regular Updates**: Keep dependencies updated
- [ ] **Backup Security**: Secure backup storage

#### Network Security

- **Local Network**: Suitable for home/hobbyist use
- **Internet Access**: Use reverse proxy (nginx/Apache) with HTTPS
- **Port Management**: Only expose necessary ports
- **VPN Access**: Consider VPN for remote access

### User Management

#### Admin Account Security

- **Strong Admin Password**: Use complex password for admin account
- **Regular Password Changes**: Enforce password updates
- **Account Monitoring**: Monitor admin account activity
- **Backup Admin**: Create secondary admin account

#### User Account Security

- **Password Policy**: Enforce strong passwords
- **Account Lockout**: Temporary lockout after failed attempts
- **Session Management**: Monitor active sessions
- **Account Cleanup**: Remove inactive accounts

### Server Security

#### Minecraft Server Security

- **Process Isolation**: Servers run with limited privileges
- **Resource Limits**: Memory and CPU limits enforced
- **File Permissions**: Restrict server file access
- **Network Isolation**: Servers bind to specific interfaces

#### Backup Security

- **Encrypted Backups**: Consider encrypting backup files
- **Secure Storage**: Store backups in secure location
- **Access Control**: Limit backup file access
- **Regular Testing**: Test backup restoration

## 🚨 Security Monitoring

### Log Monitoring

#### Key Log Events

- **Failed Login Attempts**: Monitor for brute force attacks
- **Admin Actions**: Track all administrative activities
- **Server Operations**: Monitor server start/stop patterns
- **Error Patterns**: Identify potential security issues

#### Log Analysis

```bash
# Monitor failed login attempts
grep "login_failed" app.log

# Monitor admin actions
grep "admin_" app.log

# Monitor rate limiting
grep "rate_limit" app.log
```

### Security Alerts

#### Automated Monitoring

- **Rate Limit Exceeded**: Alert on excessive login attempts
- **Admin Account Changes**: Alert on admin account modifications
- **Unusual Activity**: Alert on unusual access patterns
- **System Errors**: Alert on security-related errors

## 🔍 Security Testing

### Vulnerability Assessment

#### Regular Testing

- **Input Validation**: Test all input fields for injection
- **Authentication**: Test login/logout functionality
- **Authorization**: Test role-based access control
- **Session Management**: Test session security
- **File Upload**: Test file upload security

#### Penetration Testing

- **OWASP Top 10**: Test against common vulnerabilities
- **Authentication Bypass**: Test authentication mechanisms
- **Privilege Escalation**: Test role escalation attempts
- **Data Exposure**: Test for sensitive data leaks

### Security Tools

#### Recommended Tools

- **OWASP ZAP**: Web application security scanner
- **Burp Suite**: Web application security testing
- **Nmap**: Network security scanner
- **Wireshark**: Network traffic analysis

## 📋 Incident Response

### Security Incident Types

#### Common Incidents

- **Brute Force Attacks**: Multiple failed login attempts
- **Unauthorized Access**: Successful unauthorized login
- **Data Breach**: Exposure of sensitive information
- **System Compromise**: Malware or unauthorized changes

#### Response Procedures

1. **Immediate Response**: Isolate affected systems
2. **Investigation**: Analyze logs and evidence
3. **Containment**: Prevent further damage
4. **Recovery**: Restore normal operations
5. **Post-Incident**: Document lessons learned

### Contact Information

#### Security Contacts

- **Primary Contact**: Application administrator
- **Backup Contact**: Secondary administrator
- **Emergency Contact**: System administrator

## 📚 Additional Resources

### Security References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Flask Security Documentation](https://flask-security.readthedocs.io/)
- [Python Security Best Practices](https://python-security.readthedocs.io/)

### Security Updates

- **Dependencies**: Regularly update Python packages
- **Security Patches**: Apply security patches promptly
- **Vulnerability Monitoring**: Monitor for new vulnerabilities
- **Security News**: Stay informed about security threats

---

**Note**: This security documentation is designed for hobbyist use. For enterprise deployments, consider additional security measures and professional security assessment.
