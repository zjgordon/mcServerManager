"""
Production Security Hardening for Minecraft Server Manager

This module provides comprehensive security hardening measures for production
deployment of the Minecraft Server Manager application.
"""

import os
import sys
import hashlib
import secrets
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class SecurityLevel(Enum):
    """Security level enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class SecurityCheck:
    """Security check result data class."""
    name: str
    level: SecurityLevel
    status: str
    message: str
    recommendation: str
    details: Dict[str, Any]


class ProductionSecurityHardener:
    """Production security hardening utility."""
    
    def __init__(self, app_dir: str = None):
        self.app_dir = app_dir or os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.checks: List[SecurityCheck] = []
        
    def run_all_security_checks(self) -> List[SecurityCheck]:
        """Run all security checks and return results."""
        self.checks = []
        
        # File system security
        self.check_file_permissions()
        self.check_sensitive_files()
        self.check_directory_permissions()
        
        # Application security
        self.check_secret_key_security()
        self.check_database_security()
        self.check_session_security()
        
        # Network security
        self.check_firewall_configuration()
        self.check_ssl_configuration()
        self.check_cors_configuration()
        
        # System security
        self.check_user_permissions()
        self.check_system_updates()
        self.check_logging_security()
        
        # Application-specific security
        self.check_minecraft_server_security()
        self.check_backup_security()
        self.check_api_security()
        
        return self.checks
    
    def check_file_permissions(self):
        """Check file permissions for security."""
        critical_files = [
            'instance/minecraft_manager.db',
            'config.json',
            'run.py',
            'requirements.txt'
        ]
        
        for file_path in critical_files:
            full_path = os.path.join(self.app_dir, file_path)
            if os.path.exists(full_path):
                stat = os.stat(full_path)
                mode = stat.st_mode
                
                # Check if file is readable by others
                if mode & 0o004:
                    self.checks.append(SecurityCheck(
                        name="file_permissions",
                        level=SecurityLevel.HIGH,
                        status="FAIL",
                        message=f"File {file_path} is readable by others",
                        recommendation="Set file permissions to 600 (owner read/write only)",
                        details={
                            "file": file_path,
                            "current_permissions": oct(mode),
                            "recommended_permissions": "0o600"
                        }
                    ))
                else:
                    self.checks.append(SecurityCheck(
                        name="file_permissions",
                        level=SecurityLevel.LOW,
                        status="PASS",
                        message=f"File {file_path} has secure permissions",
                        recommendation="Continue monitoring file permissions",
                        details={
                            "file": file_path,
                            "current_permissions": oct(mode)
                        }
                    ))
    
    def check_sensitive_files(self):
        """Check for sensitive files that should not be exposed."""
        sensitive_patterns = [
            '*.key',
            '*.pem',
            '*.p12',
            '*.pfx',
            '*.env',
            '.env*',
            '*.log',
            '*.sql',
            '*.db',
            'instance/*.db'
        ]
        
        exposed_files = []
        for pattern in sensitive_patterns:
            # This is a simplified check - in production, use proper glob matching
            if pattern.endswith('*'):
                base_pattern = pattern[:-1]
                for root, dirs, files in os.walk(self.app_dir):
                    for file in files:
                        if file.startswith(base_pattern):
                            exposed_files.append(os.path.join(root, file))
            else:
                file_path = os.path.join(self.app_dir, pattern)
                if os.path.exists(file_path):
                    exposed_files.append(file_path)
        
        if exposed_files:
            self.checks.append(SecurityCheck(
                name="sensitive_files",
                level=SecurityLevel.CRITICAL,
                status="FAIL",
                message=f"Found {len(exposed_files)} sensitive files that may be exposed",
                recommendation="Ensure sensitive files are not accessible via web server",
                details={
                    "exposed_files": exposed_files,
                    "count": len(exposed_files)
                }
            ))
        else:
            self.checks.append(SecurityCheck(
                name="sensitive_files",
                level=SecurityLevel.LOW,
                status="PASS",
                message="No sensitive files found in web-accessible directories",
                recommendation="Continue monitoring for sensitive file exposure",
                details={"exposed_files": []}
            ))
    
    def check_directory_permissions(self):
        """Check directory permissions."""
        critical_directories = [
            'instance',
            'servers',
            'backups',
            'logs'
        ]
        
        for dir_path in critical_directories:
            full_path = os.path.join(self.app_dir, dir_path)
            if os.path.exists(full_path):
                stat = os.stat(full_path)
                mode = stat.st_mode
                
                # Check if directory is writable by others
                if mode & 0o002:
                    self.checks.append(SecurityCheck(
                        name="directory_permissions",
                        level=SecurityLevel.HIGH,
                        status="FAIL",
                        message=f"Directory {dir_path} is writable by others",
                        recommendation="Set directory permissions to 755 or 700",
                        details={
                            "directory": dir_path,
                            "current_permissions": oct(mode),
                            "recommended_permissions": "0o755"
                        }
                    ))
                else:
                    self.checks.append(SecurityCheck(
                        name="directory_permissions",
                        level=SecurityLevel.LOW,
                        status="PASS",
                        message=f"Directory {dir_path} has secure permissions",
                        recommendation="Continue monitoring directory permissions",
                        details={
                            "directory": dir_path,
                            "current_permissions": oct(mode)
                        }
                    ))
    
    def check_secret_key_security(self):
        """Check secret key security."""
        # Check if secret key is set in environment
        secret_key = os.environ.get('SECRET_KEY')
        
        if not secret_key:
            self.checks.append(SecurityCheck(
                name="secret_key",
                level=SecurityLevel.CRITICAL,
                status="FAIL",
                message="SECRET_KEY environment variable is not set",
                recommendation="Set a strong SECRET_KEY environment variable",
                details={"secret_key_set": False}
            ))
        elif secret_key == 'production-secret-key-change-this':
            self.checks.append(SecurityCheck(
                name="secret_key",
                level=SecurityLevel.CRITICAL,
                status="FAIL",
                message="SECRET_KEY is using default value",
                recommendation="Change SECRET_KEY to a strong, unique value",
                details={"secret_key_set": True, "is_default": True}
            ))
        elif len(secret_key) < 32:
            self.checks.append(SecurityCheck(
                name="secret_key",
                level=SecurityLevel.HIGH,
                status="FAIL",
                message="SECRET_KEY is too short (minimum 32 characters)",
                recommendation="Use a longer, more secure SECRET_KEY",
                details={"secret_key_set": True, "length": len(secret_key)}
            ))
        else:
            self.checks.append(SecurityCheck(
                name="secret_key",
                level=SecurityLevel.LOW,
                status="PASS",
                message="SECRET_KEY is properly configured",
                recommendation="Continue using current SECRET_KEY",
                details={"secret_key_set": True, "length": len(secret_key)}
            ))
    
    def check_database_security(self):
        """Check database security configuration."""
        database_url = os.environ.get('DATABASE_URL', 'sqlite:///instance/minecraft_manager.db')
        
        if database_url.startswith('sqlite://'):
            # Check SQLite database file permissions
            db_path = database_url.replace('sqlite:///', '')
            if os.path.exists(db_path):
                stat = os.stat(db_path)
                mode = stat.st_mode
                
                if mode & 0o004:
                    self.checks.append(SecurityCheck(
                        name="database_security",
                        level=SecurityLevel.HIGH,
                        status="FAIL",
                        message="SQLite database is readable by others",
                        recommendation="Set database file permissions to 600",
                        details={
                            "database_type": "sqlite",
                            "database_path": db_path,
                            "current_permissions": oct(mode)
                        }
                    ))
                else:
                    self.checks.append(SecurityCheck(
                        name="database_security",
                        level=SecurityLevel.LOW,
                        status="PASS",
                        message="SQLite database has secure permissions",
                        recommendation="Continue monitoring database permissions",
                        details={
                            "database_type": "sqlite",
                            "database_path": db_path,
                            "current_permissions": oct(mode)
                        }
                    ))
        elif database_url.startswith('postgresql://'):
            self.checks.append(SecurityCheck(
                name="database_security",
                level=SecurityLevel.LOW,
                status="PASS",
                message="Using PostgreSQL database (recommended for production)",
                recommendation="Ensure PostgreSQL is properly secured",
                details={"database_type": "postgresql"}
            ))
        else:
            self.checks.append(SecurityCheck(
                name="database_security",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="Unknown database type",
                recommendation="Verify database security configuration",
                details={"database_type": "unknown", "database_url": database_url}
            ))
    
    def check_session_security(self):
        """Check session security configuration."""
        session_secure = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
        session_httponly = os.environ.get('SESSION_COOKIE_HTTPONLY', 'True').lower() == 'true'
        session_samesite = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
        
        security_issues = []
        
        if not session_secure:
            security_issues.append("SESSION_COOKIE_SECURE should be True in production")
        
        if not session_httponly:
            security_issues.append("SESSION_COOKIE_HTTPONLY should be True")
        
        if session_samesite not in ['Strict', 'Lax']:
            security_issues.append("SESSION_COOKIE_SAMESITE should be 'Strict' or 'Lax'")
        
        if security_issues:
            self.checks.append(SecurityCheck(
                name="session_security",
                level=SecurityLevel.HIGH,
                status="FAIL",
                message=f"Session security issues found: {len(security_issues)}",
                recommendation="Configure secure session settings",
                details={
                    "issues": security_issues,
                    "session_secure": session_secure,
                    "session_httponly": session_httponly,
                    "session_samesite": session_samesite
                }
            ))
        else:
            self.checks.append(SecurityCheck(
                name="session_security",
                level=SecurityLevel.LOW,
                status="PASS",
                message="Session security is properly configured",
                recommendation="Continue monitoring session security",
                details={
                    "session_secure": session_secure,
                    "session_httponly": session_httponly,
                    "session_samesite": session_samesite
                }
            ))
    
    def check_firewall_configuration(self):
        """Check firewall configuration."""
        try:
            # Check if ufw is active
            result = subprocess.run(['ufw', 'status'], capture_output=True, text=True)
            if result.returncode == 0:
                if 'Status: active' in result.stdout:
                    self.checks.append(SecurityCheck(
                        name="firewall",
                        level=SecurityLevel.LOW,
                        status="PASS",
                        message="UFW firewall is active",
                        recommendation="Continue monitoring firewall rules",
                        details={"firewall_type": "ufw", "status": "active"}
                    ))
                else:
                    self.checks.append(SecurityCheck(
                        name="firewall",
                        level=SecurityLevel.HIGH,
                        status="FAIL",
                        message="UFW firewall is not active",
                        recommendation="Enable and configure UFW firewall",
                        details={"firewall_type": "ufw", "status": "inactive"}
                    ))
            else:
                self.checks.append(SecurityCheck(
                    name="firewall",
                    level=SecurityLevel.MEDIUM,
                    status="WARN",
                    message="UFW firewall not found or not accessible",
                    recommendation="Install and configure a firewall",
                    details={"firewall_type": "ufw", "error": result.stderr}
                ))
        except FileNotFoundError:
            self.checks.append(SecurityCheck(
                name="firewall",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="UFW firewall not installed",
                recommendation="Install and configure UFW or another firewall",
                details={"firewall_type": "ufw", "error": "not_found"}
            ))
    
    def check_ssl_configuration(self):
        """Check SSL/TLS configuration."""
        ssl_cert_path = os.environ.get('SSL_CERT_PATH')
        ssl_key_path = os.environ.get('SSL_KEY_PATH')
        
        if ssl_cert_path and ssl_key_path:
            if os.path.exists(ssl_cert_path) and os.path.exists(ssl_key_path):
                self.checks.append(SecurityCheck(
                    name="ssl_configuration",
                    level=SecurityLevel.LOW,
                    status="PASS",
                    message="SSL certificate and key files exist",
                    recommendation="Verify SSL certificate validity and expiration",
                    details={
                        "ssl_cert_path": ssl_cert_path,
                        "ssl_key_path": ssl_key_path,
                        "cert_exists": os.path.exists(ssl_cert_path),
                        "key_exists": os.path.exists(ssl_key_path)
                    }
                ))
            else:
                self.checks.append(SecurityCheck(
                    name="ssl_configuration",
                    level=SecurityLevel.HIGH,
                    status="FAIL",
                    message="SSL certificate or key file not found",
                    recommendation="Ensure SSL certificate and key files exist",
                    details={
                        "ssl_cert_path": ssl_cert_path,
                        "ssl_key_path": ssl_key_path,
                        "cert_exists": os.path.exists(ssl_cert_path) if ssl_cert_path else False,
                        "key_exists": os.path.exists(ssl_key_path) if ssl_key_path else False
                    }
                ))
        else:
            self.checks.append(SecurityCheck(
                name="ssl_configuration",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="SSL configuration not set",
                recommendation="Configure SSL/TLS for production",
                details={
                    "ssl_cert_path": ssl_cert_path,
                    "ssl_key_path": ssl_key_path
                }
            ))
    
    def check_cors_configuration(self):
        """Check CORS configuration."""
        cors_origins = os.environ.get('CORS_ORIGINS', '')
        
        if not cors_origins:
            self.checks.append(SecurityCheck(
                name="cors_configuration",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="CORS origins not configured",
                recommendation="Configure CORS_ORIGINS environment variable",
                details={"cors_origins": cors_origins}
            ))
        elif '*' in cors_origins:
            self.checks.append(SecurityCheck(
                name="cors_configuration",
                level=SecurityLevel.HIGH,
                status="FAIL",
                message="CORS allows all origins (*)",
                recommendation="Restrict CORS to specific domains",
                details={"cors_origins": cors_origins}
            ))
        else:
            self.checks.append(SecurityCheck(
                name="cors_configuration",
                level=SecurityLevel.LOW,
                status="PASS",
                message="CORS is properly configured",
                recommendation="Continue monitoring CORS configuration",
                details={"cors_origins": cors_origins}
            ))
    
    def check_user_permissions(self):
        """Check user permissions and privileges."""
        current_user = os.environ.get('USER', 'unknown')
        is_root = os.geteuid() == 0
        
        if is_root:
            self.checks.append(SecurityCheck(
                name="user_permissions",
                level=SecurityLevel.CRITICAL,
                status="FAIL",
                message="Application is running as root",
                recommendation="Run application as non-root user",
                details={
                    "current_user": current_user,
                    "is_root": is_root,
                    "euid": os.geteuid()
                }
            ))
        else:
            self.checks.append(SecurityCheck(
                name="user_permissions",
                level=SecurityLevel.LOW,
                status="PASS",
                message="Application is running as non-root user",
                recommendation="Continue running as non-root user",
                details={
                    "current_user": current_user,
                    "is_root": is_root,
                    "euid": os.geteuid()
                }
            ))
    
    def check_system_updates(self):
        """Check system update status."""
        try:
            # Check if apt is available (Ubuntu/Debian)
            result = subprocess.run(['apt', 'list', '--upgradable'], capture_output=True, text=True)
            if result.returncode == 0:
                upgradable_packages = len([line for line in result.stdout.split('\n') if 'upgradable' in line])
                
                if upgradable_packages > 0:
                    self.checks.append(SecurityCheck(
                        name="system_updates",
                        level=SecurityLevel.MEDIUM,
                        status="WARN",
                        message=f"{upgradable_packages} packages can be upgraded",
                        recommendation="Update system packages regularly",
                        details={
                            "upgradable_packages": upgradable_packages,
                            "package_manager": "apt"
                        }
                    ))
                else:
                    self.checks.append(SecurityCheck(
                        name="system_updates",
                        level=SecurityLevel.LOW,
                        status="PASS",
                        message="System packages are up to date",
                        recommendation="Continue regular system updates",
                        details={
                            "upgradable_packages": 0,
                            "package_manager": "apt"
                        }
                    ))
            else:
                self.checks.append(SecurityCheck(
                    name="system_updates",
                    level=SecurityLevel.MEDIUM,
                    status="WARN",
                    message="Cannot check system updates",
                    recommendation="Manually check for system updates",
                    details={"package_manager": "apt", "error": result.stderr}
                ))
        except FileNotFoundError:
            self.checks.append(SecurityCheck(
                name="system_updates",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="Package manager not found",
                recommendation="Install package manager or check updates manually",
                details={"package_manager": "unknown"}
            ))
    
    def check_logging_security(self):
        """Check logging security configuration."""
        log_file = os.environ.get('LOG_FILE', 'logs/app.log')
        log_level = os.environ.get('LOG_LEVEL', 'INFO')
        
        # Check if log file exists and has proper permissions
        if os.path.exists(log_file):
            stat = os.stat(log_file)
            mode = stat.st_mode
            
            if mode & 0o004:
                self.checks.append(SecurityCheck(
                    name="logging_security",
                    level=SecurityLevel.HIGH,
                    status="FAIL",
                    message="Log file is readable by others",
                    recommendation="Set log file permissions to 600",
                    details={
                        "log_file": log_file,
                        "current_permissions": oct(mode),
                        "log_level": log_level
                    }
                ))
            else:
                self.checks.append(SecurityCheck(
                    name="logging_security",
                    level=SecurityLevel.LOW,
                    status="PASS",
                    message="Log file has secure permissions",
                    recommendation="Continue monitoring log file permissions",
                    details={
                        "log_file": log_file,
                        "current_permissions": oct(mode),
                        "log_level": log_level
                    }
                ))
        else:
            self.checks.append(SecurityCheck(
                name="logging_security",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="Log file does not exist",
                recommendation="Ensure logging is properly configured",
                details={
                    "log_file": log_file,
                    "log_level": log_level
                }
            ))
    
    def check_minecraft_server_security(self):
        """Check Minecraft server security configuration."""
        servers_dir = os.path.join(self.app_dir, 'servers')
        
        if os.path.exists(servers_dir):
            # Check server directory permissions
            stat = os.stat(servers_dir)
            mode = stat.st_mode
            
            if mode & 0o002:
                self.checks.append(SecurityCheck(
                    name="minecraft_server_security",
                    level=SecurityLevel.HIGH,
                    status="FAIL",
                    message="Server directory is writable by others",
                    recommendation="Set server directory permissions to 755",
                    details={
                        "servers_dir": servers_dir,
                        "current_permissions": oct(mode)
                    }
                ))
            else:
                self.checks.append(SecurityCheck(
                    name="minecraft_server_security",
                    level=SecurityLevel.LOW,
                    status="PASS",
                    message="Server directory has secure permissions",
                    recommendation="Continue monitoring server directory permissions",
                    details={
                        "servers_dir": servers_dir,
                        "current_permissions": oct(mode)
                    }
                ))
        else:
            self.checks.append(SecurityCheck(
                name="minecraft_server_security",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="Server directory does not exist",
                recommendation="Create server directory with proper permissions",
                details={"servers_dir": servers_dir}
            ))
    
    def check_backup_security(self):
        """Check backup security configuration."""
        backups_dir = os.path.join(self.app_dir, 'backups')
        
        if os.path.exists(backups_dir):
            # Check backup directory permissions
            stat = os.stat(backups_dir)
            mode = stat.st_mode
            
            if mode & 0o004:
                self.checks.append(SecurityCheck(
                    name="backup_security",
                    level=SecurityLevel.HIGH,
                    status="FAIL",
                    message="Backup directory is readable by others",
                    recommendation="Set backup directory permissions to 700",
                    details={
                        "backups_dir": backups_dir,
                        "current_permissions": oct(mode)
                    }
                ))
            else:
                self.checks.append(SecurityCheck(
                    name="backup_security",
                    level=SecurityLevel.LOW,
                    status="PASS",
                    message="Backup directory has secure permissions",
                    recommendation="Continue monitoring backup directory permissions",
                    details={
                        "backups_dir": backups_dir,
                        "current_permissions": oct(mode)
                    }
                ))
        else:
            self.checks.append(SecurityCheck(
                name="backup_security",
                level=SecurityLevel.MEDIUM,
                status="WARN",
                message="Backup directory does not exist",
                recommendation="Create backup directory with proper permissions",
                details={"backups_dir": backups_dir}
            ))
    
    def check_api_security(self):
        """Check API security configuration."""
        api_rate_limit = os.environ.get('API_RATE_LIMIT', '1000 per day;100 per hour;20 per minute')
        
        # Check if rate limiting is configured
        if 'per day' in api_rate_limit and 'per hour' in api_rate_limit and 'per minute' in api_rate_limit:
            self.checks.append(SecurityCheck(
                name="api_security",
                level=SecurityLevel.LOW,
                status="PASS",
                message="API rate limiting is configured",
                recommendation="Continue monitoring API rate limiting",
                details={"api_rate_limit": api_rate_limit}
            ))
        else:
            self.checks.append(SecurityCheck(
                name="api_security",
                level=SecurityLevel.HIGH,
                status="FAIL",
                message="API rate limiting is not properly configured",
                recommendation="Configure comprehensive API rate limiting",
                details={"api_rate_limit": api_rate_limit}
            ))
    
    def generate_security_report(self) -> Dict[str, Any]:
        """Generate a comprehensive security report."""
        # Count checks by level and status
        level_counts = {}
        status_counts = {}
        
        for check in self.checks:
            level_counts[check.level] = level_counts.get(check.level, 0) + 1
            status_counts[check.status] = status_counts.get(check.status, 0) + 1
        
        # Determine overall security status
        if status_counts.get('FAIL', 0) > 0:
            overall_status = 'CRITICAL' if any(check.level == SecurityLevel.CRITICAL for check in self.checks if check.status == 'FAIL') else 'HIGH'
        elif status_counts.get('WARN', 0) > 0:
            overall_status = 'MEDIUM'
        else:
            overall_status = 'LOW'
        
        return {
            "overall_status": overall_status,
            "timestamp": os.popen('date').read().strip(),
            "checks": [
                {
                    "name": check.name,
                    "level": check.level.value,
                    "status": check.status,
                    "message": check.message,
                    "recommendation": check.recommendation,
                    "details": check.details
                }
                for check in self.checks
            ],
            "summary": {
                "total_checks": len(self.checks),
                "level_counts": {level.value: count for level, count in level_counts.items()},
                "status_counts": status_counts
            }
        }
    
    def apply_security_hardening(self):
        """Apply security hardening measures."""
        hardening_applied = []
        
        for check in self.checks:
            if check.status == 'FAIL' and check.level in [SecurityLevel.CRITICAL, SecurityLevel.HIGH]:
                # Apply specific hardening based on check type
                if check.name == 'file_permissions':
                    file_path = check.details.get('file')
                    if file_path:
                        full_path = os.path.join(self.app_dir, file_path)
                        if os.path.exists(full_path):
                            os.chmod(full_path, 0o600)
                            hardening_applied.append(f"Set {file_path} permissions to 600")
                
                elif check.name == 'directory_permissions':
                    dir_path = check.details.get('directory')
                    if dir_path:
                        full_path = os.path.join(self.app_dir, dir_path)
                        if os.path.exists(full_path):
                            os.chmod(full_path, 0o755)
                            hardening_applied.append(f"Set {dir_path} permissions to 755")
        
        return hardening_applied


def main():
    """Main function for running security checks."""
    hardener = ProductionSecurityHardener()
    
    # Run all security checks
    checks = hardener.run_all_security_checks()
    
    # Generate report
    report = hardener.generate_security_report()
    
    # Print report
    print(f"Security Report - {report['timestamp']}")
    print(f"Overall Status: {report['overall_status']}")
    print(f"Total Checks: {report['summary']['total_checks']}")
    print()
    
    for check in report['checks']:
        status_emoji = {
            'PASS': '✅',
            'WARN': '⚠️',
            'FAIL': '❌'
        }
        level_emoji = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        }
        print(f"{status_emoji.get(check['status'], '❓')} {level_emoji.get(check['level'], '⚪')} {check['name']}: {check['message']}")
        if check['status'] in ['FAIL', 'WARN']:
            print(f"   Recommendation: {check['recommendation']}")
    
    # Apply hardening if requested
    if len(sys.argv) > 1 and sys.argv[1] == '--apply':
        hardening_applied = hardener.apply_security_hardening()
        if hardening_applied:
            print("\nApplied security hardening:")
            for item in hardening_applied:
                print(f"  - {item}")
        else:
            print("\nNo security hardening applied")


if __name__ == '__main__':
    main()
