"""
Health check endpoints for mcServerManager application.

This module provides comprehensive health monitoring endpoints including:
- Basic health status (/health)
- Detailed health status (/health/detailed)
- Database connectivity checks
- External service dependency checks
- System resource monitoring
- Application performance metrics
"""

import logging
import time
from datetime import datetime
from typing import Any, Dict

from flask import Blueprint, jsonify
from sqlalchemy import text

from .extensions import db
from .monitoring import (
    get_application_metrics,
    get_backup_health_dashboard,
    get_backup_metrics,
    get_system_metrics,
)

logger = logging.getLogger(__name__)

# Create health blueprint
health_bp = Blueprint("health", __name__, url_prefix="/health")


def check_database_connectivity() -> Dict[str, Any]:
    """Check database connectivity and return status information."""
    try:
        # Test database connection with a simple query
        result = db.session.execute(text("SELECT 1")).scalar()
        if result == 1:
            return {
                "status": "healthy",
                "message": "Database connection successful",
                "response_time_ms": 0,  # Will be calculated by caller
            }
        else:
            return {
                "status": "unhealthy",
                "message": "Database query returned unexpected result",
                "response_time_ms": 0,
            }
    except Exception as e:
        logger.error(f"Database connectivity check failed: {e}")
        return {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}",
            "response_time_ms": 0,
        }


def check_external_dependencies() -> Dict[str, Any]:
    """Check external service dependencies and return status information."""
    dependencies = {
        "database": {"status": "unknown", "message": "Not checked"},
        "file_system": {"status": "unknown", "message": "Not checked"},
    }

    # Check database
    db_check = check_database_connectivity()
    dependencies["database"] = db_check

    # Check file system access
    try:
        import tempfile

        # Test write access to temp directory
        with tempfile.NamedTemporaryFile(delete=True) as tmp_file:
            tmp_file.write(b"test")
            tmp_file.flush()
        dependencies["file_system"] = {
            "status": "healthy",
            "message": "File system access successful",
        }
    except Exception as e:
        logger.error(f"File system check failed: {e}")
        dependencies["file_system"] = {
            "status": "unhealthy",
            "message": f"File system access failed: {str(e)}",
        }

    return dependencies


@health_bp.route("/", methods=["GET"])
def health_check():
    """
    Basic health check endpoint.

    Returns:
        JSON response with basic health status
    """
    start_time = time.time()

    # Check database connectivity
    db_check = check_database_connectivity()
    db_response_time = (time.time() - start_time) * 1000
    db_check["response_time_ms"] = round(db_response_time, 2)

    # Determine overall health status
    overall_status = "healthy" if db_check["status"] == "healthy" else "unhealthy"

    response = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "mcServerManager",
        "version": "1.0.0",
        "checks": {
            "database": db_check,
        },
    }

    status_code = 200 if overall_status == "healthy" else 503
    return jsonify(response), status_code


@health_bp.route("/detailed", methods=["GET"])
def detailed_health_check():
    """
    Detailed health check endpoint with comprehensive monitoring.

    Returns:
        JSON response with detailed health status including system metrics
    """
    start_time = time.time()

    # Check database connectivity
    db_start = time.time()
    db_check = check_database_connectivity()
    db_response_time = (time.time() - db_start) * 1000
    db_check["response_time_ms"] = round(db_response_time, 2)

    # Check external dependencies
    dependencies = check_external_dependencies()

    # Get system metrics
    try:
        system_metrics = get_system_metrics()
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        system_metrics = {
            "status": "unhealthy",
            "message": f"System metrics collection failed: {str(e)}",
        }

    # Get application metrics
    try:
        app_metrics = get_application_metrics()
    except Exception as e:
        logger.error(f"Failed to get application metrics: {e}")
        app_metrics = {
            "status": "unhealthy",
            "message": f"Application metrics collection failed: {str(e)}",
        }

    # Determine overall health status
    all_checks = [db_check, system_metrics, app_metrics]
    all_checks.extend(dependencies.values())

    overall_status = "healthy"
    for check in all_checks:
        if isinstance(check, dict) and check.get("status") == "unhealthy":
            overall_status = "unhealthy"
            break

    total_response_time = (time.time() - start_time) * 1000

    response = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "mcServerManager",
        "version": "1.0.0",
        "response_time_ms": round(total_response_time, 2),
        "checks": {
            "database": db_check,
            "dependencies": dependencies,
            "system": system_metrics,
            "application": app_metrics,
        },
    }

    status_code = 200 if overall_status == "healthy" else 503
    return jsonify(response), status_code


@health_bp.route("/ready", methods=["GET"])
def readiness_check():
    """
    Readiness check endpoint for Kubernetes/container orchestration.

    Returns:
        JSON response indicating if the service is ready to accept traffic
    """
    # Check if database is accessible
    db_check = check_database_connectivity()

    if db_check["status"] == "healthy":
        return (
            jsonify(
                {
                    "status": "ready",
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "mcServerManager",
                }
            ),
            200,
        )
    else:
        return (
            jsonify(
                {
                    "status": "not_ready",
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "mcServerManager",
                    "reason": "Database not accessible",
                }
            ),
            503,
        )


@health_bp.route("/live", methods=["GET"])
def liveness_check():
    """
    Liveness check endpoint for Kubernetes/container orchestration.

    Returns:
        JSON response indicating if the service is alive
    """
    return (
        jsonify(
            {
                "status": "alive",
                "timestamp": datetime.utcnow().isoformat(),
                "service": "mcServerManager",
            }
        ),
        200,
    )


@health_bp.route("/backup", methods=["GET"])
def backup_health_check():
    """
    Backup health check endpoint.

    Returns:
        JSON response with backup system health status
    """
    start_time = time.time()

    try:
        # Get backup metrics
        backup_metrics = get_backup_metrics()

        # Determine overall backup health status
        overall_status = backup_metrics.get("status", "unhealthy")

        total_response_time = (time.time() - start_time) * 1000

        response = {
            "status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "mcServerManager-backup",
            "response_time_ms": round(total_response_time, 2),
            "backup_health": backup_metrics,
        }

        status_code = 200 if overall_status == "healthy" else 503
        return jsonify(response), status_code

    except Exception as e:
        logger.error(f"Backup health check failed: {e}")
        return (
            jsonify(
                {
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "mcServerManager-backup",
                    "error": f"Backup health check failed: {str(e)}",
                }
            ),
            503,
        )


@health_bp.route("/backup/dashboard", methods=["GET"])
def backup_health_dashboard():
    """
    Backup health dashboard endpoint with comprehensive monitoring.

    Returns:
        JSON response with detailed backup health dashboard data
    """
    start_time = time.time()

    try:
        # Get comprehensive backup health dashboard
        dashboard_data = get_backup_health_dashboard()

        total_response_time = (time.time() - start_time) * 1000
        dashboard_data["response_time_ms"] = round(total_response_time, 2)

        status_code = 200 if dashboard_data.get("status") == "healthy" else 503
        return jsonify(dashboard_data), status_code

    except Exception as e:
        logger.error(f"Backup health dashboard failed: {e}")
        return (
            jsonify(
                {
                    "status": "unhealthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "service": "mcServerManager-backup-dashboard",
                    "error": f"Backup health dashboard failed: {str(e)}",
                }
            ),
            503,
        )
