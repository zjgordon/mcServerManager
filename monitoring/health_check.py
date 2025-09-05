"""
Health Check System for Minecraft Server Manager

This module provides comprehensive health checking capabilities for production
monitoring and alerting.
"""

import os
import sys
import time
import psutil
import requests
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum

# Add the parent directory to the path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app import create_app, db
    from app.models import User, Server
except ImportError:
    # Fallback for when app modules are not available
    create_app = None
    db = None
    User = None
    Server = None


class HealthStatus(Enum):
    """Health check status enumeration."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


@dataclass
class HealthCheckResult:
    """Health check result data class."""
    name: str
    status: HealthStatus
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    duration_ms: float


class HealthChecker:
    """Comprehensive health checker for the Minecraft Server Manager."""
    
    def __init__(self):
        self.app = None
        self.results: List[HealthCheckResult] = []
        
    def initialize_app(self):
        """Initialize Flask app for health checks."""
        if create_app:
            self.app = create_app()
            self.app.config['TESTING'] = True
    
    def run_all_checks(self) -> List[HealthCheckResult]:
        """Run all health checks and return results."""
        self.results = []
        
        # System health checks
        self.check_system_resources()
        self.check_disk_space()
        self.check_memory_usage()
        self.check_cpu_usage()
        
        # Application health checks
        self.check_database_connection()
        self.check_database_integrity()
        self.check_application_responsiveness()
        
        # Service health checks
        self.check_nginx_status()
        self.check_redis_status()
        self.check_java_processes()
        
        # Minecraft server health checks
        self.check_minecraft_servers()
        self.check_orphaned_processes()
        
        # Security health checks
        self.check_file_permissions()
        self.check_ssl_certificates()
        
        return self.results
    
    def check_system_resources(self):
        """Check overall system resource usage."""
        start_time = time.time()
        
        try:
            # Get system load average
            load_avg = os.getloadavg()
            cpu_count = psutil.cpu_count()
            
            # Calculate load percentage
            load_percentage = (load_avg[0] / cpu_count) * 100
            
            if load_percentage < 70:
                status = HealthStatus.HEALTHY
                message = f"System load is normal: {load_percentage:.1f}%"
            elif load_percentage < 90:
                status = HealthStatus.WARNING
                message = f"System load is high: {load_percentage:.1f}%"
            else:
                status = HealthStatus.CRITICAL
                message = f"System load is critical: {load_percentage:.1f}%"
            
            self.results.append(HealthCheckResult(
                name="system_resources",
                status=status,
                message=message,
                details={
                    "load_average": load_avg,
                    "cpu_count": cpu_count,
                    "load_percentage": load_percentage
                },
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="system_resources",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check system resources: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_disk_space(self):
        """Check disk space usage."""
        start_time = time.time()
        
        try:
            # Check root filesystem
            root_usage = psutil.disk_usage('/')
            root_percentage = (root_usage.used / root_usage.total) * 100
            
            # Check application directory
            app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            app_usage = psutil.disk_usage(app_dir)
            app_percentage = (app_usage.used / app_usage.total) * 100
            
            # Determine status based on usage
            if root_percentage < 80 and app_percentage < 80:
                status = HealthStatus.HEALTHY
                message = f"Disk usage is normal: {root_percentage:.1f}% (root), {app_percentage:.1f}% (app)"
            elif root_percentage < 90 and app_percentage < 90:
                status = HealthStatus.WARNING
                message = f"Disk usage is high: {root_percentage:.1f}% (root), {app_percentage:.1f}% (app)"
            else:
                status = HealthStatus.CRITICAL
                message = f"Disk usage is critical: {root_percentage:.1f}% (root), {app_percentage:.1f}% (app)"
            
            self.results.append(HealthCheckResult(
                name="disk_space",
                status=status,
                message=message,
                details={
                    "root_usage": {
                        "total": root_usage.total,
                        "used": root_usage.used,
                        "free": root_usage.free,
                        "percentage": root_percentage
                    },
                    "app_usage": {
                        "total": app_usage.total,
                        "used": app_usage.used,
                        "free": app_usage.free,
                        "percentage": app_percentage
                    }
                },
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="disk_space",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check disk space: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_memory_usage(self):
        """Check memory usage."""
        start_time = time.time()
        
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            if memory.percent < 80:
                status = HealthStatus.HEALTHY
                message = f"Memory usage is normal: {memory.percent:.1f}%"
            elif memory.percent < 90:
                status = HealthStatus.WARNING
                message = f"Memory usage is high: {memory.percent:.1f}%"
            else:
                status = HealthStatus.CRITICAL
                message = f"Memory usage is critical: {memory.percent:.1f}%"
            
            self.results.append(HealthCheckResult(
                name="memory_usage",
                status=status,
                message=message,
                details={
                    "memory": {
                        "total": memory.total,
                        "available": memory.available,
                        "used": memory.used,
                        "percentage": memory.percent
                    },
                    "swap": {
                        "total": swap.total,
                        "used": swap.used,
                        "percentage": swap.percent
                    }
                },
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="memory_usage",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check memory usage: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_cpu_usage(self):
        """Check CPU usage."""
        start_time = time.time()
        
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            if cpu_percent < 70:
                status = HealthStatus.HEALTHY
                message = f"CPU usage is normal: {cpu_percent:.1f}%"
            elif cpu_percent < 90:
                status = HealthStatus.WARNING
                message = f"CPU usage is high: {cpu_percent:.1f}%"
            else:
                status = HealthStatus.CRITICAL
                message = f"CPU usage is critical: {cpu_percent:.1f}%"
            
            self.results.append(HealthCheckResult(
                name="cpu_usage",
                status=status,
                message=message,
                details={
                    "cpu_percent": cpu_percent,
                    "cpu_count": cpu_count,
                    "cpu_freq": {
                        "current": cpu_freq.current if cpu_freq else None,
                        "min": cpu_freq.min if cpu_freq else None,
                        "max": cpu_freq.max if cpu_freq else None
                    }
                },
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="cpu_usage",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check CPU usage: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_database_connection(self):
        """Check database connection."""
        start_time = time.time()
        
        try:
            if self.app and db:
                with self.app.app_context():
                    # Test database connection
                    db.session.execute('SELECT 1')
                    
                    status = HealthStatus.HEALTHY
                    message = "Database connection is healthy"
                    details = {"connection": "successful"}
            else:
                # Fallback check using sqlite3 directly
                db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'instance', 'minecraft_manager.db')
                if os.path.exists(db_path):
                    conn = sqlite3.connect(db_path)
                    conn.execute('SELECT 1')
                    conn.close()
                    
                    status = HealthStatus.HEALTHY
                    message = "Database connection is healthy"
                    details = {"connection": "successful", "path": db_path}
                else:
                    status = HealthStatus.CRITICAL
                    message = "Database file not found"
                    details = {"path": db_path}
            
            self.results.append(HealthCheckResult(
                name="database_connection",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="database_connection",
                status=HealthStatus.CRITICAL,
                message=f"Database connection failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_database_integrity(self):
        """Check database integrity."""
        start_time = time.time()
        
        try:
            if self.app and db:
                with self.app.app_context():
                    # Check if tables exist
                    tables = db.engine.table_names()
                    required_tables = ['users', 'servers']
                    missing_tables = [table for table in required_tables if table not in tables]
                    
                    if missing_tables:
                        status = HealthStatus.CRITICAL
                        message = f"Missing database tables: {', '.join(missing_tables)}"
                        details = {"missing_tables": missing_tables, "existing_tables": tables}
                    else:
                        # Check data integrity
                        user_count = db.session.query(User).count() if User else 0
                        server_count = db.session.query(Server).count() if Server else 0
                        
                        status = HealthStatus.HEALTHY
                        message = f"Database integrity is healthy: {user_count} users, {server_count} servers"
                        details = {
                            "user_count": user_count,
                            "server_count": server_count,
                            "tables": tables
                        }
            else:
                status = HealthStatus.UNKNOWN
                message = "Cannot check database integrity without app context"
                details = {"error": "App context not available"}
            
            self.results.append(HealthCheckResult(
                name="database_integrity",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="database_integrity",
                status=HealthStatus.CRITICAL,
                message=f"Database integrity check failed: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_application_responsiveness(self):
        """Check if the application is responding."""
        start_time = time.time()
        
        try:
            # Try to connect to the application
            response = requests.get('http://localhost:5000/health', timeout=5)
            
            if response.status_code == 200:
                status = HealthStatus.HEALTHY
                message = "Application is responding normally"
                details = {
                    "status_code": response.status_code,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
            else:
                status = HealthStatus.WARNING
                message = f"Application returned status code: {response.status_code}"
                details = {
                    "status_code": response.status_code,
                    "response_time_ms": response.elapsed.total_seconds() * 1000
                }
            
            self.results.append(HealthCheckResult(
                name="application_responsiveness",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except requests.exceptions.RequestException as e:
            self.results.append(HealthCheckResult(
                name="application_responsiveness",
                status=HealthStatus.CRITICAL,
                message=f"Application is not responding: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_nginx_status(self):
        """Check Nginx status."""
        start_time = time.time()
        
        try:
            # Check if Nginx is running
            nginx_processes = [p for p in psutil.process_iter(['pid', 'name']) if 'nginx' in p.info['name'].lower()]
            
            if nginx_processes:
                status = HealthStatus.HEALTHY
                message = f"Nginx is running with {len(nginx_processes)} processes"
                details = {"process_count": len(nginx_processes)}
            else:
                status = HealthStatus.CRITICAL
                message = "Nginx is not running"
                details = {"process_count": 0}
            
            self.results.append(HealthCheckResult(
                name="nginx_status",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="nginx_status",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check Nginx status: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_redis_status(self):
        """Check Redis status."""
        start_time = time.time()
        
        try:
            # Check if Redis is running
            redis_processes = [p for p in psutil.process_iter(['pid', 'name']) if 'redis' in p.info['name'].lower()]
            
            if redis_processes:
                # Try to connect to Redis
                import redis
                r = redis.Redis(host='localhost', port=6379, db=0)
                r.ping()
                
                status = HealthStatus.HEALTHY
                message = f"Redis is running and responding"
                details = {"process_count": len(redis_processes), "connection": "successful"}
            else:
                status = HealthStatus.CRITICAL
                message = "Redis is not running"
                details = {"process_count": 0}
            
            self.results.append(HealthCheckResult(
                name="redis_status",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="redis_status",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check Redis status: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_java_processes(self):
        """Check Java processes (Minecraft servers)."""
        start_time = time.time()
        
        try:
            java_processes = []
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'memory_info', 'cpu_percent']):
                if 'java' in proc.info['name'].lower():
                    cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                    if 'server.jar' in cmdline:
                        java_processes.append({
                            'pid': proc.info['pid'],
                            'cmdline': cmdline,
                            'memory_mb': proc.info['memory_info'].rss / 1024 / 1024 if proc.info['memory_info'] else 0,
                            'cpu_percent': proc.info['cpu_percent'] or 0
                        })
            
            if java_processes:
                total_memory = sum(p['memory_mb'] for p in java_processes)
                status = HealthStatus.HEALTHY
                message = f"Found {len(java_processes)} Minecraft server processes using {total_memory:.1f}MB"
                details = {
                    "process_count": len(java_processes),
                    "total_memory_mb": total_memory,
                    "processes": java_processes
                }
            else:
                status = HealthStatus.HEALTHY
                message = "No Minecraft server processes running"
                details = {"process_count": 0}
            
            self.results.append(HealthCheckResult(
                name="java_processes",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="java_processes",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check Java processes: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_minecraft_servers(self):
        """Check Minecraft server status."""
        start_time = time.time()
        
        try:
            if self.app and db and Server:
                with self.app.app_context():
                    servers = db.session.query(Server).all()
                    
                    running_servers = 0
                    stopped_servers = 0
                    server_details = []
                    
                    for server in servers:
                        # Check if process is actually running
                        is_running = False
                        if server.pid:
                            try:
                                proc = psutil.Process(server.pid)
                                if proc.is_running() and 'java' in proc.name().lower():
                                    is_running = True
                            except psutil.NoSuchProcess:
                                pass
                        
                        server_details.append({
                            'id': server.id,
                            'name': server.server_name,
                            'status': server.status,
                            'pid': server.pid,
                            'is_running': is_running,
                            'memory_mb': server.memory_mb
                        })
                        
                        if is_running:
                            running_servers += 1
                        else:
                            stopped_servers += 1
                    
                    if running_servers > 0:
                        status = HealthStatus.HEALTHY
                        message = f"{running_servers} servers running, {stopped_servers} stopped"
                    else:
                        status = HealthStatus.HEALTHY
                        message = f"No servers running ({stopped_servers} stopped)"
                    
                    details = {
                        "total_servers": len(servers),
                        "running_servers": running_servers,
                        "stopped_servers": stopped_servers,
                        "servers": server_details
                    }
            else:
                status = HealthStatus.UNKNOWN
                message = "Cannot check Minecraft servers without app context"
                details = {"error": "App context not available"}
            
            self.results.append(HealthCheckResult(
                name="minecraft_servers",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="minecraft_servers",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check Minecraft servers: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_orphaned_processes(self):
        """Check for orphaned Java processes."""
        start_time = time.time()
        
        try:
            if self.app and db and Server:
                with self.app.app_context():
                    # Get all server PIDs from database
                    server_pids = set()
                    for server in db.session.query(Server).filter(Server.pid.isnot(None)):
                        server_pids.add(server.pid)
                    
                    # Find all Java processes
                    orphaned_processes = []
                    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                        if 'java' in proc.info['name'].lower():
                            cmdline = ' '.join(proc.info['cmdline']) if proc.info['cmdline'] else ''
                            if 'server.jar' in cmdline and proc.info['pid'] not in server_pids:
                                orphaned_processes.append({
                                    'pid': proc.info['pid'],
                                    'cmdline': cmdline
                                })
                    
                    if orphaned_processes:
                        status = HealthStatus.WARNING
                        message = f"Found {len(orphaned_processes)} orphaned Java processes"
                        details = {"orphaned_processes": orphaned_processes}
                    else:
                        status = HealthStatus.HEALTHY
                        message = "No orphaned Java processes found"
                        details = {"orphaned_processes": []}
            else:
                status = HealthStatus.UNKNOWN
                message = "Cannot check orphaned processes without app context"
                details = {"error": "App context not available"}
            
            self.results.append(HealthCheckResult(
                name="orphaned_processes",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="orphaned_processes",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check orphaned processes: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_file_permissions(self):
        """Check critical file permissions."""
        start_time = time.time()
        
        try:
            app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            critical_files = [
                os.path.join(app_dir, 'instance', 'minecraft_manager.db'),
                os.path.join(app_dir, 'config.json'),
                os.path.join(app_dir, 'run.py')
            ]
            
            permission_issues = []
            for file_path in critical_files:
                if os.path.exists(file_path):
                    stat = os.stat(file_path)
                    # Check if file is readable by others (security issue)
                    if stat.st_mode & 0o004:
                        permission_issues.append({
                            'file': file_path,
                            'permissions': oct(stat.st_mode),
                            'issue': 'File is readable by others'
                        })
            
            if permission_issues:
                status = HealthStatus.WARNING
                message = f"Found {len(permission_issues)} file permission issues"
                details = {"permission_issues": permission_issues}
            else:
                status = HealthStatus.HEALTHY
                message = "File permissions are secure"
                details = {"permission_issues": []}
            
            self.results.append(HealthCheckResult(
                name="file_permissions",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="file_permissions",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check file permissions: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def check_ssl_certificates(self):
        """Check SSL certificate validity."""
        start_time = time.time()
        
        try:
            # This is a placeholder for SSL certificate checking
            # In a real implementation, you would check certificate expiration dates
            status = HealthStatus.HEALTHY
            message = "SSL certificate check not implemented"
            details = {"note": "SSL certificate validation requires domain configuration"}
            
            self.results.append(HealthCheckResult(
                name="ssl_certificates",
                status=status,
                message=message,
                details=details,
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
            
        except Exception as e:
            self.results.append(HealthCheckResult(
                name="ssl_certificates",
                status=HealthStatus.UNKNOWN,
                message=f"Failed to check SSL certificates: {str(e)}",
                details={"error": str(e)},
                timestamp=datetime.now(),
                duration_ms=(time.time() - start_time) * 1000
            ))
    
    def get_overall_status(self) -> HealthStatus:
        """Get overall health status based on all checks."""
        if not self.results:
            return HealthStatus.UNKNOWN
        
        # Count statuses
        status_counts = {}
        for result in self.results:
            status_counts[result.status] = status_counts.get(result.status, 0) + 1
        
        # Determine overall status
        if HealthStatus.CRITICAL in status_counts:
            return HealthStatus.CRITICAL
        elif HealthStatus.WARNING in status_counts:
            return HealthStatus.WARNING
        elif HealthStatus.UNKNOWN in status_counts:
            return HealthStatus.UNKNOWN
        else:
            return HealthStatus.HEALTHY
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate a comprehensive health report."""
        overall_status = self.get_overall_status()
        
        return {
            "overall_status": overall_status.value,
            "timestamp": datetime.now().isoformat(),
            "checks": [
                {
                    "name": result.name,
                    "status": result.status.value,
                    "message": result.message,
                    "details": result.details,
                    "timestamp": result.timestamp.isoformat(),
                    "duration_ms": result.duration_ms
                }
                for result in self.results
            ],
            "summary": {
                "total_checks": len(self.results),
                "healthy": len([r for r in self.results if r.status == HealthStatus.HEALTHY]),
                "warning": len([r for r in self.results if r.status == HealthStatus.WARNING]),
                "critical": len([r for r in self.results if r.status == HealthStatus.CRITICAL]),
                "unknown": len([r for r in self.results if r.status == HealthStatus.UNKNOWN])
            }
        }


def main():
    """Main function for running health checks."""
    checker = HealthChecker()
    checker.initialize_app()
    
    # Run all health checks
    results = checker.run_all_checks()
    
    # Generate report
    report = checker.generate_report()
    
    # Print report
    print(f"Health Check Report - {report['timestamp']}")
    print(f"Overall Status: {report['overall_status'].upper()}")
    print(f"Total Checks: {report['summary']['total_checks']}")
    print(f"Healthy: {report['summary']['healthy']}, Warning: {report['summary']['warning']}, Critical: {report['summary']['critical']}, Unknown: {report['summary']['unknown']}")
    print()
    
    for check in report['checks']:
        status_emoji = {
            'healthy': '✅',
            'warning': '⚠️',
            'critical': '❌',
            'unknown': '❓'
        }
        print(f"{status_emoji.get(check['status'], '❓')} {check['name']}: {check['message']}")
    
    # Exit with appropriate code
    if report['overall_status'] == 'critical':
        sys.exit(2)
    elif report['overall_status'] == 'warning':
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
