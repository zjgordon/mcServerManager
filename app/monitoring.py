"""
System resource monitoring and application metrics for mcServerManager.

This module provides comprehensive monitoring capabilities including:
- CPU usage monitoring
- Memory usage monitoring
- Disk space monitoring
- Application performance metrics
- Process monitoring
- Alert integration
"""

import time
from typing import Any, Dict

import psutil

from .alerts import check_database_alerts, check_system_alerts
from .backup_scheduler import backup_scheduler
from .logging import logger


def get_system_metrics() -> Dict[str, Any]:
    """
    Get comprehensive system resource metrics.

    Returns:
        Dictionary containing system metrics including CPU, memory, and disk usage
    """
    try:
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()

        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()

        # Disk metrics
        disk = psutil.disk_usage("/")

        # Process metrics for current process
        current_process = psutil.Process()
        process_memory = current_process.memory_info()
        process_cpu = current_process.cpu_percent()

        metrics = {
            "status": "healthy",
            "timestamp": time.time(),
            "cpu": {
                "usage_percent": round(cpu_percent, 2),
                "count": cpu_count,
                "frequency_mhz": round(cpu_freq.current, 2) if cpu_freq else None,
                "process_usage_percent": round(process_cpu, 2),
            },
            "memory": {
                "total_bytes": memory.total,
                "available_bytes": memory.available,
                "used_bytes": memory.used,
                "usage_percent": round(memory.percent, 2),
                "swap_total_bytes": swap.total,
                "swap_used_bytes": swap.used,
                "swap_usage_percent": round(swap.percent, 2),
                "process_memory_bytes": process_memory.rss,
            },
            "disk": {
                "total_bytes": disk.total,
                "used_bytes": disk.used,
                "free_bytes": disk.free,
                "usage_percent": round((disk.used / disk.total) * 100, 2),
            },
        }

        # Check for alerts
        check_system_alerts(metrics)

        return metrics
    except Exception as e:
        logger.error(f"Failed to collect system metrics: {e}")
        return {
            "status": "unhealthy",
            "message": f"System metrics collection failed: {str(e)}",
            "timestamp": time.time(),
        }


def get_application_metrics() -> Dict[str, Any]:
    """
    Get application-specific performance metrics.

    Returns:
        Dictionary containing application metrics
    """
    try:
        from flask import current_app

        from .extensions import db
        from .models import Server, User

        # Database metrics
        user_count = User.query.count()
        server_count = Server.query.count()
        active_server_count = Server.query.filter_by(status="running").count()

        # Application configuration metrics
        config_metrics = {
            "debug_mode": current_app.debug,
            "testing": current_app.testing,
            "secret_key_configured": bool(current_app.secret_key),
        }

        # Database connection pool metrics (if available)
        pool_metrics = {}
        try:
            engine = db.engine
            pool = engine.pool
            pool_metrics = {
                "pool_size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid(),
            }
        except Exception as e:
            logger.debug(f"Could not get database pool metrics: {e}")
            pool_metrics = {"error": "Pool metrics unavailable"}

        metrics = {
            "status": "healthy",
            "timestamp": time.time(),
            "database": {
                "user_count": user_count,
                "server_count": server_count,
                "active_server_count": active_server_count,
                "pool_metrics": pool_metrics,
            },
            "application": config_metrics,
        }

        # Check database alerts
        check_database_alerts(pool_metrics)

        return metrics
    except Exception as e:
        logger.error(f"Failed to collect application metrics: {e}")
        return {
            "status": "unhealthy",
            "message": f"Application metrics collection failed: {str(e)}",
            "timestamp": time.time(),
        }


def get_process_metrics() -> Dict[str, Any]:
    """
    Get detailed process metrics for the current application.

    Returns:
        Dictionary containing process-specific metrics
    """
    try:
        current_process = psutil.Process()

        # Process information
        process_info = {
            "pid": current_process.pid,
            "name": current_process.name(),
            "status": current_process.status(),
            "create_time": current_process.create_time(),
            "num_threads": current_process.num_threads(),
        }

        # Memory information
        memory_info = current_process.memory_info()
        memory_percent = current_process.memory_percent()

        # CPU information
        cpu_percent = current_process.cpu_percent()
        cpu_times = current_process.cpu_times()

        # File descriptors (Unix only)
        try:
            num_fds = current_process.num_fds()
        except (AttributeError, psutil.AccessDenied):
            num_fds = None

        return {
            "status": "healthy",
            "timestamp": time.time(),
            "process": process_info,
            "memory": {
                "rss_bytes": memory_info.rss,
                "vms_bytes": memory_info.vms,
                "percent": round(memory_percent, 2),
            },
            "cpu": {
                "percent": round(cpu_percent, 2),
                "user_time": cpu_times.user,
                "system_time": cpu_times.system,
            },
            "resources": {
                "num_fds": num_fds,
            },
        }
    except Exception as e:
        logger.error(f"Failed to collect process metrics: {e}")
        return {
            "status": "unhealthy",
            "message": f"Process metrics collection failed: {str(e)}",
            "timestamp": time.time(),
        }


def check_disk_space(path: str = "/", threshold_percent: float = 90.0) -> Dict[str, Any]:
    """
    Check disk space for a given path and return status.

    Args:
        path: Path to check disk space for
        threshold_percent: Threshold percentage for warning (default: 90%)

    Returns:
        Dictionary containing disk space status
    """
    try:
        disk = psutil.disk_usage(path)
        usage_percent = (disk.used / disk.total) * 100

        status = "healthy"
        if usage_percent >= threshold_percent:
            status = "warning"
        if usage_percent >= 95.0:
            status = "critical"

        return {
            "status": status,
            "path": path,
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "usage_percent": round(usage_percent, 2),
            "threshold_percent": threshold_percent,
        }
    except Exception as e:
        logger.error(f"Failed to check disk space for {path}: {e}")
        return {
            "status": "unhealthy",
            "path": path,
            "message": f"Disk space check failed: {str(e)}",
        }


def get_network_metrics() -> Dict[str, Any]:
    """
    Get network interface metrics.

    Returns:
        Dictionary containing network metrics
    """
    try:
        net_io = psutil.net_io_counters()
        net_connections = len(psutil.net_connections())

        return {
            "status": "healthy",
            "timestamp": time.time(),
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
            "active_connections": net_connections,
        }
    except Exception as e:
        logger.error(f"Failed to collect network metrics: {e}")
        return {
            "status": "unhealthy",
            "message": f"Network metrics collection failed: {str(e)}",
            "timestamp": time.time(),
        }


def get_backup_metrics() -> Dict[str, Any]:
    """
    Get comprehensive backup monitoring metrics.

    Returns:
        Dictionary containing backup-specific metrics and health status
    """
    try:
        # Get backup scheduler metrics
        backup_metrics = backup_scheduler.get_backup_metrics()

        # Get backup disk space metrics
        backup_disk_metrics = check_disk_space("backups", threshold_percent=85.0)

        # Get backup schedule status
        schedule_status = get_backup_schedule_status()

        # Combine all backup metrics
        combined_metrics = {
            "status": backup_metrics["status"],
            "timestamp": backup_metrics["timestamp"],
            "backup_operations": backup_metrics["metrics"],
            "health_summary": backup_metrics["health_summary"],
            "disk_usage": {
                "backup_directory": backup_disk_metrics,
                "usage_percent": backup_metrics["metrics"]["disk_usage_percent"],
            },
            "schedule_status": schedule_status,
            "alert_status": get_backup_alert_status(),
        }

        return combined_metrics

    except Exception as e:
        logger.error(f"Failed to collect backup metrics: {e}")
        return {
            "status": "unhealthy",
            "message": f"Backup metrics collection failed: {str(e)}",
            "timestamp": time.time(),
        }


def get_backup_schedule_status() -> Dict[str, Any]:
    """
    Get status of all backup schedules.

    Returns:
        Dictionary containing schedule status information
    """
    try:
        from .models import BackupSchedule, Server

        schedules = BackupSchedule.query.all()
        schedule_status = {
            "total_schedules": len(schedules),
            "enabled_schedules": len([s for s in schedules if s.enabled]),
            "disabled_schedules": len([s for s in schedules if not s.enabled]),
            "schedules": [],
        }

        for schedule in schedules:
            server = Server.query.get(schedule.server_id)
            if server:
                schedule_info = {
                    "server_id": schedule.server_id,
                    "server_name": server.server_name,
                    "schedule_type": schedule.schedule_type,
                    "schedule_time": str(schedule.schedule_time),
                    "retention_days": schedule.retention_days,
                    "enabled": schedule.enabled,
                    "last_backup": schedule.last_backup.isoformat()
                    if schedule.last_backup
                    else None,
                    "created_at": schedule.created_at.isoformat(),
                }
                schedule_status["schedules"].append(schedule_info)

        return schedule_status

    except Exception as e:
        logger.error(f"Failed to get backup schedule status: {e}")
        return {
            "error": f"Schedule status collection failed: {str(e)}",
            "total_schedules": 0,
            "enabled_schedules": 0,
            "disabled_schedules": 0,
            "schedules": [],
        }


def get_backup_alert_status() -> Dict[str, Any]:
    """
    Get current backup alert status.

    Returns:
        Dictionary containing active backup alerts
    """
    try:
        from .alerts import alert_manager

        active_alerts = alert_manager.get_active_alerts()
        backup_alerts = [alert for alert in active_alerts if "backup" in alert["rule_name"]]

        return {
            "active_backup_alerts": len(backup_alerts),
            "alerts": backup_alerts,
            "alert_rules": {
                "backup_failure_rate": "backup_failure_rate" in alert_manager.alert_rules,
                "backup_corruption_detected": "backup_corruption_detected"
                in alert_manager.alert_rules,
                "backup_schedule_execution_failure": "backup_schedule_execution_failure"
                in alert_manager.alert_rules,
                "backup_verification_failure": "backup_verification_failure"
                in alert_manager.alert_rules,
                "backup_disk_space_warning": "backup_disk_space_warning"
                in alert_manager.alert_rules,
                "backup_disk_space_critical": "backup_disk_space_critical"
                in alert_manager.alert_rules,
            },
        }

    except Exception as e:
        logger.error(f"Failed to get backup alert status: {e}")
        return {
            "error": f"Alert status collection failed: {str(e)}",
            "active_backup_alerts": 0,
            "alerts": [],
            "alert_rules": {},
        }


def get_backup_health_dashboard() -> Dict[str, Any]:
    """
    Get comprehensive backup health dashboard data.

    Returns:
        Dictionary containing all backup health information for dashboard display
    """
    try:
        # Get all backup-related metrics
        backup_metrics = get_backup_metrics()
        system_metrics = get_system_metrics()

        # Calculate health score
        health_score = calculate_backup_health_score(backup_metrics)

        # Get recent backup history
        recent_backups = get_recent_backup_history()

        dashboard_data = {
            "status": "healthy"
            if health_score >= 80
            else "warning"
            if health_score >= 60
            else "critical",
            "timestamp": time.time(),
            "health_score": health_score,
            "backup_metrics": backup_metrics,
            "system_metrics": system_metrics,
            "recent_backups": recent_backups,
            "recommendations": generate_backup_recommendations(backup_metrics),
        }

        return dashboard_data

    except Exception as e:
        logger.error(f"Failed to generate backup health dashboard: {e}")
        return {
            "status": "unhealthy",
            "message": f"Dashboard generation failed: {str(e)}",
            "timestamp": time.time(),
        }


def calculate_backup_health_score(backup_metrics: Dict[str, Any]) -> int:
    """
    Calculate overall backup health score (0-100).

    Args:
        backup_metrics: Backup metrics dictionary

    Returns:
        Health score as integer (0-100)
    """
    try:
        score = 100

        # Deduct points for failures
        if "backup_operations" in backup_metrics:
            ops = backup_metrics["backup_operations"]
            total_backups = ops.get("total_backups", 0)

            if total_backups > 0:
                failure_rate = (ops.get("failed_backups", 0) / total_backups) * 100
                corruption_rate = (ops.get("corrupted_backups", 0) / total_backups) * 100
                verification_failure_rate = (
                    ops.get("verification_failures", 0) / total_backups
                ) * 100

                # Deduct points based on failure rates
                score -= min(failure_rate * 2, 40)  # Up to 40 points for failures
                score -= min(corruption_rate * 5, 30)  # Up to 30 points for corruption
                score -= min(
                    verification_failure_rate * 3, 20
                )  # Up to 20 points for verification failures

        # Deduct points for disk usage
        if "disk_usage" in backup_metrics:
            usage_percent = backup_metrics["disk_usage"].get("usage_percent", 0)
            if usage_percent > 90:
                score -= 20
            elif usage_percent > 80:
                score -= 10

        # Deduct points for active alerts
        if "alert_status" in backup_metrics:
            active_alerts = backup_metrics["alert_status"].get("active_backup_alerts", 0)
            score -= min(active_alerts * 5, 25)  # Up to 25 points for alerts

        return max(int(score), 0)

    except Exception as e:
        logger.error(f"Failed to calculate backup health score: {e}")
        return 0


def get_recent_backup_history(limit: int = 10) -> list:
    """
    Get recent backup history.

    Args:
        limit: Maximum number of recent backups to return

    Returns:
        List of recent backup information
    """
    try:
        import glob
        import os
        from datetime import datetime

        backup_files = []
        backup_dir = "backups"

        if os.path.exists(backup_dir):
            # Find all backup files
            for server_dir in os.listdir(backup_dir):
                server_path = os.path.join(backup_dir, server_dir)
                if os.path.isdir(server_path):
                    for backup_file in glob.glob(os.path.join(server_path, "*.tar.gz")):
                        try:
                            stat = os.stat(backup_file)
                            backup_files.append(
                                {
                                    "server_name": server_dir,
                                    "backup_file": os.path.basename(backup_file),
                                    "file_path": backup_file,
                                    "size_bytes": stat.st_size,
                                    "created_time": datetime.fromtimestamp(
                                        stat.st_mtime
                                    ).isoformat(),
                                    "age_hours": (time.time() - stat.st_mtime) / 3600,
                                }
                            )
                        except OSError:
                            continue

        # Sort by creation time (newest first) and limit results
        backup_files.sort(key=lambda x: x["created_time"], reverse=True)
        return backup_files[:limit]

    except Exception as e:
        logger.error(f"Failed to get recent backup history: {e}")
        return []


def generate_backup_recommendations(backup_metrics: Dict[str, Any]) -> list:
    """
    Generate backup health recommendations.

    Args:
        backup_metrics: Backup metrics dictionary

    Returns:
        List of recommendation strings
    """
    recommendations = []

    try:
        if "backup_operations" in backup_metrics:
            ops = backup_metrics["backup_operations"]
            total_backups = ops.get("total_backups", 0)

            if total_backups > 0:
                failure_rate = (ops.get("failed_backups", 0) / total_backups) * 100
                corruption_rate = (ops.get("corrupted_backups", 0) / total_backups) * 100

                if failure_rate > 20:
                    recommendations.append(
                        f"High backup failure rate ({failure_rate:.1f}%) - investigate backup process"
                    )

                if corruption_rate > 5:
                    recommendations.append(
                        f"Backup corruption detected ({corruption_rate:.1f}%) - check storage integrity"
                    )

        if "disk_usage" in backup_metrics:
            usage_percent = backup_metrics["disk_usage"].get("usage_percent", 0)
            if usage_percent > 90:
                recommendations.append("Critical disk usage - clean up old backups immediately")
            elif usage_percent > 80:
                recommendations.append("High disk usage - consider cleaning up old backups")

        if "alert_status" in backup_metrics:
            active_alerts = backup_metrics["alert_status"].get("active_backup_alerts", 0)
            if active_alerts > 0:
                recommendations.append(
                    f"{active_alerts} active backup alerts - review alert status"
                )

        if not recommendations:
            recommendations.append("Backup system is healthy - no immediate action required")

        return recommendations

    except Exception as e:
        logger.error(f"Failed to generate backup recommendations: {e}")
        return ["Unable to generate recommendations - check system logs"]
