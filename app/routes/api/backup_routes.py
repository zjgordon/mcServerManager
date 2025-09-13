"""
Backup management API endpoints for automated backup operations.

This module provides REST API endpoints for managing backup schedules,
viewing backup history, and triggering manual backup operations.
"""

import os
from datetime import datetime
from datetime import time as dt_time
from typing import Any, Dict, List, Optional

from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from ...backup_scheduler import backup_scheduler
from ...extensions import db
from ...models import BackupSchedule, Server
from ...security import audit_log, rate_limit

backup_api_bp = Blueprint("backup_api", __name__, url_prefix="/api/backups")


def admin_required_api(f):
    """API decorator to require admin privileges."""
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
        if not current_user.is_admin:
            return jsonify({"error": "Admin privileges required"}), 403
        return f(*args, **kwargs)

    return decorated_function


def validate_server_access(server_id: int) -> Optional[Server]:
    """
    Validate that the current user has access to the specified server.

    Args:
        server_id: ID of the server to validate access for

    Returns:
        Server object if access is allowed, None otherwise
    """
    server = Server.query.get(server_id)
    if not server:
        return None

    # Admin users can access all servers
    if current_user.is_admin:
        return server

    # Regular users can only access their own servers
    if server.owner_id == current_user.id:
        return server

    return None


def validate_schedule_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate and sanitize schedule data from API request.

    Args:
        data: Raw schedule data from request

    Returns:
        Dict containing validated schedule data

    Raises:
        ValueError: If validation fails
    """
    if not data:
        raise ValueError("No schedule data provided")

    # Required fields
    if "schedule_type" not in data:
        raise ValueError("schedule_type is required")

    if "schedule_time" not in data:
        raise ValueError("schedule_time is required")

    # Validate schedule_type
    schedule_type = data["schedule_type"]
    if schedule_type not in ["daily", "weekly", "monthly"]:
        raise ValueError("schedule_type must be one of: daily, weekly, monthly")

    # Validate and parse schedule_time
    schedule_time_str = data["schedule_time"]
    try:
        # Parse time string in HH:MM format
        time_parts = schedule_time_str.split(":")
        if len(time_parts) != 2:
            raise ValueError("schedule_time must be in HH:MM format")

        hour = int(time_parts[0])
        minute = int(time_parts[1])

        if not (0 <= hour <= 23):
            raise ValueError("Hour must be between 0 and 23")
        if not (0 <= minute <= 59):
            raise ValueError("Minute must be between 0 and 59")

        schedule_time = dt_time(hour, minute)
    except (ValueError, IndexError) as e:
        raise ValueError(f"Invalid schedule_time format: {e}")

    # Validate retention_days
    retention_days = data.get("retention_days", 30)
    try:
        retention_days = int(retention_days)
        if not (1 <= retention_days <= 365):
            raise ValueError("retention_days must be between 1 and 365")
    except (ValueError, TypeError):
        raise ValueError("retention_days must be a valid integer between 1 and 365")

    # Validate enabled flag
    enabled = data.get("enabled", True)
    if not isinstance(enabled, bool):
        if isinstance(enabled, str):
            enabled = enabled.lower() in ("true", "1", "yes", "on")
        else:
            enabled = bool(enabled)

    return {
        "schedule_type": schedule_type,
        "schedule_time": schedule_time,
        "retention_days": retention_days,
        "enabled": enabled,
    }


@backup_api_bp.route("/schedules", methods=["GET"])
@login_required
@rate_limit(max_attempts=10, window_seconds=60)
def list_schedules():
    """
    List all backup schedules.

    GET /api/backups/schedules

    Returns:
        JSON response with list of all backup schedules
    """
    try:
        # Get all schedules (admin) or user's schedules only
        if current_user.is_admin:
            schedules = BackupSchedule.query.all()
        else:
            # Get schedules for user's servers only
            user_server_ids = [s.id for s in current_user.servers]
            schedules = BackupSchedule.query.filter(
                BackupSchedule.server_id.in_(user_server_ids)
            ).all()

        schedule_list = []
        for schedule in schedules:
            # Get server info for each schedule
            server = Server.query.get(schedule.server_id)
            if not server:
                continue

            # Check access for non-admin users
            if not current_user.is_admin and server.owner_id != current_user.id:
                continue

            schedule_data = {
                "id": schedule.id,
                "server_id": schedule.server_id,
                "server_name": server.server_name,
                "schedule_type": schedule.schedule_type,
                "schedule_time": str(schedule.schedule_time),
                "retention_days": schedule.retention_days,
                "enabled": schedule.enabled,
                "last_backup": schedule.last_backup.isoformat() if schedule.last_backup else None,
                "created_at": schedule.created_at.isoformat(),
            }
            schedule_list.append(schedule_data)

        return jsonify(
            {
                "success": True,
                "schedules": schedule_list,
                "count": len(schedule_list),
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to retrieve schedules: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/schedules", methods=["POST"])
@login_required
@rate_limit(max_attempts=5, window_seconds=300)
def create_schedule():
    """
    Create a new backup schedule.

    POST /api/backups/schedules
    Body: {
        "server_id": int,
        "schedule_type": "daily|weekly|monthly",
        "schedule_time": "HH:MM",
        "retention_days": int (optional, default: 30),
        "enabled": bool (optional, default: true)
    }

    Returns:
        JSON response with created schedule information
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON data required"}), 400

        # Validate server_id
        if "server_id" not in data:
            return jsonify({"error": "server_id is required"}), 400

        try:
            server_id = int(data["server_id"])
        except (ValueError, TypeError):
            return jsonify({"error": "server_id must be a valid integer"}), 400

        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Validate schedule data
        try:
            validated_data = validate_schedule_data(data)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        # Check if schedule already exists for this server
        existing_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
        if existing_schedule:
            return jsonify({"error": "Backup schedule already exists for this server"}), 409

        # Create new schedule using backup scheduler
        success = backup_scheduler.add_schedule(server_id, validated_data)

        if success:
            # Get the created schedule
            new_schedule = BackupSchedule.query.filter_by(server_id=server_id).first()

            audit_log(
                "backup_schedule_created",
                {
                    "server_id": server_id,
                    "server_name": server.server_name,
                    "schedule_type": validated_data["schedule_type"],
                    "schedule_time": str(validated_data["schedule_time"]),
                    "retention_days": validated_data["retention_days"],
                },
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Backup schedule created successfully",
                        "schedule": {
                            "id": new_schedule.id,
                            "server_id": new_schedule.server_id,
                            "server_name": server.server_name,
                            "schedule_type": new_schedule.schedule_type,
                            "schedule_time": str(new_schedule.schedule_time),
                            "retention_days": new_schedule.retention_days,
                            "enabled": new_schedule.enabled,
                            "created_at": new_schedule.created_at.isoformat(),
                        },
                    }
                ),
                201,
            )
        else:
            return jsonify({"error": "Failed to create backup schedule"}), 500

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to create schedule: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/schedules/<int:server_id>", methods=["GET"])
@login_required
@rate_limit(max_attempts=10, window_seconds=60)
def get_schedule(server_id):
    """
    Get backup schedule for a specific server.

    GET /api/backups/schedules/<server_id>

    Args:
        server_id: ID of the server to get schedule for

    Returns:
        JSON response with schedule information
    """
    try:
        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Get schedule
        schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
        if not schedule:
            return jsonify({"error": "No backup schedule found for this server"}), 404

        return jsonify(
            {
                "success": True,
                "schedule": {
                    "id": schedule.id,
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
                },
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to retrieve schedule: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/schedules/<int:server_id>", methods=["PUT"])
@login_required
@rate_limit(max_attempts=5, window_seconds=300)
def update_schedule(server_id):
    """
    Update backup schedule for a specific server.

    PUT /api/backups/schedules/<server_id>
    Body: {
        "schedule_type": "daily|weekly|monthly",
        "schedule_time": "HH:MM",
        "retention_days": int (optional),
        "enabled": bool (optional)
    }

    Args:
        server_id: ID of the server to update schedule for

    Returns:
        JSON response with updated schedule information
    """
    try:
        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Get existing schedule
        schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
        if not schedule:
            return jsonify({"error": "No backup schedule found for this server"}), 404

        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON data required"}), 400

        # Validate schedule data
        try:
            validated_data = validate_schedule_data(data)
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        # Update schedule using backup scheduler
        success = backup_scheduler.update_schedule(server_id, validated_data)

        if success:
            # Refresh the schedule object
            db.session.refresh(schedule)

            audit_log(
                "backup_schedule_updated",
                {
                    "server_id": server_id,
                    "server_name": server.server_name,
                    "schedule_type": validated_data["schedule_type"],
                    "schedule_time": str(validated_data["schedule_time"]),
                    "retention_days": validated_data["retention_days"],
                    "enabled": validated_data["enabled"],
                },
            )

            return jsonify(
                {
                    "success": True,
                    "message": "Backup schedule updated successfully",
                    "schedule": {
                        "id": schedule.id,
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
                    },
                }
            )
        else:
            return jsonify({"error": "Failed to update backup schedule"}), 500

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to update schedule: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/schedules/<int:server_id>", methods=["DELETE"])
@login_required
@rate_limit(max_attempts=5, window_seconds=300)
def delete_schedule(server_id):
    """
    Delete backup schedule for a specific server.

    DELETE /api/backups/schedules/<server_id>

    Args:
        server_id: ID of the server to delete schedule for

    Returns:
        JSON response with deletion confirmation
    """
    try:
        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Get existing schedule
        schedule = BackupSchedule.query.filter_by(server_id=server_id).first()
        if not schedule:
            return jsonify({"error": "No backup schedule found for this server"}), 404

        # Delete schedule using backup scheduler
        success = backup_scheduler.remove_schedule(server_id)

        if success:
            audit_log(
                "backup_schedule_deleted",
                {
                    "server_id": server_id,
                    "server_name": server.server_name,
                },
            )

            return jsonify(
                {
                    "success": True,
                    "message": "Backup schedule deleted successfully",
                }
            )
        else:
            return jsonify({"error": "Failed to delete backup schedule"}), 500

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to delete schedule: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/<int:server_id>/trigger", methods=["POST"])
@login_required
@rate_limit(max_attempts=3, window_seconds=600)  # 3 attempts per 10 minutes
def trigger_backup(server_id):
    """
    Trigger a manual backup for a specific server.

    POST /api/backups/<server_id>/trigger

    Args:
        server_id: ID of the server to backup

    Returns:
        JSON response with backup operation status
    """
    try:
        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Trigger manual backup
        backup_result = backup_scheduler.execute_backup_job(server_id)

        if backup_result["success"]:
            audit_log(
                "manual_backup_triggered",
                {
                    "server_id": server_id,
                    "server_name": server.server_name,
                    "backup_file": backup_result.get("backup_filename"),
                    "backup_size": backup_result.get("size"),
                    "duration": backup_result.get("duration"),
                },
            )

            return jsonify(
                {
                    "success": True,
                    "message": "Manual backup completed successfully",
                    "backup": {
                        "server_id": server_id,
                        "server_name": server.server_name,
                        "backup_file": backup_result.get("backup_filename"),
                        "backup_path": backup_result.get("backup_file"),
                        "size": backup_result.get("size"),
                        "checksum": backup_result.get("checksum"),
                        "duration": backup_result.get("duration"),
                        "was_running": backup_result.get("was_running"),
                    },
                }
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": f"Backup failed: {backup_result.get('error')}",
                    }
                ),
                500,
            )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to trigger backup: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/<int:server_id>/history", methods=["GET"])
@login_required
@rate_limit(max_attempts=10, window_seconds=60)
def get_backup_history(server_id):
    """
    Get backup history for a specific server.

    GET /api/backups/<server_id>/history

    Args:
        server_id: ID of the server to get backup history for

    Returns:
        JSON response with backup history
    """
    try:
        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Get backup files from backup directory
        backup_dir = os.path.join("backups", server.server_name)

        if not os.path.exists(backup_dir):
            return jsonify(
                {
                    "success": True,
                    "backups": [],
                    "count": 0,
                    "message": "No backup directory found",
                }
            )

        # Get all backup files for this server
        backup_files = backup_scheduler._get_backup_files(backup_dir, server.server_name)

        # Format backup history
        backup_history = []
        for backup_file in backup_files:
            backup_info = {
                "filename": backup_file["filename"],
                "size": backup_file["size"],
                "size_mb": round(backup_file["size"] / (1024 * 1024), 2),
                "created": backup_file["created"].isoformat(),
                "age_days": round(
                    (datetime.now().timestamp() - backup_file["mtime"]) / (24 * 3600), 1
                ),
            }
            backup_history.append(backup_info)

        return jsonify(
            {
                "success": True,
                "server_id": server_id,
                "server_name": server.server_name,
                "backups": backup_history,
                "count": len(backup_history),
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to retrieve backup history: {str(e)}",
                }
            ),
            500,
        )


@backup_api_bp.route("/<int:server_id>/status", methods=["GET"])
@login_required
@rate_limit(max_attempts=10, window_seconds=60)
def get_backup_status(server_id):
    """
    Get backup status for a specific server.

    GET /api/backups/<server_id>/status

    Args:
        server_id: ID of the server to get backup status for

    Returns:
        JSON response with backup status information
    """
    try:
        # Validate server access
        server = validate_server_access(server_id)
        if not server:
            return jsonify({"error": "Server not found or access denied"}), 404

        # Get schedule status from backup scheduler
        status = backup_scheduler.get_schedule_status(server_id)

        if status is None:
            return jsonify(
                {
                    "success": True,
                    "server_id": server_id,
                    "server_name": server.server_name,
                    "has_schedule": False,
                    "message": "No backup schedule configured",
                }
            )

        # Add server information
        status["server_name"] = server.server_name
        status["has_schedule"] = True

        return jsonify(
            {
                "success": True,
                "status": status,
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to retrieve backup status: {str(e)}",
                }
            ),
            500,
        )
