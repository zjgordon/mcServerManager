"""
System resource monitoring and application metrics for mcServerManager.

This module provides comprehensive monitoring capabilities including:
- CPU usage monitoring
- Memory usage monitoring
- Disk space monitoring
- Application performance metrics
- Process monitoring
"""

import logging
import time
from typing import Any, Dict

import psutil

logger = logging.getLogger(__name__)


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

        return {
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

        return {
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


def check_disk_space(
    path: str = "/", threshold_percent: float = 90.0
) -> Dict[str, Any]:
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
