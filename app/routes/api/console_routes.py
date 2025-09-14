"""
Console API endpoints for Minecraft server management.

This module provides REST API endpoints for:
- Streaming server logs with pagination
- Executing console commands on running servers
- Getting server status and metadata
"""

import os
import subprocess
from datetime import datetime
from typing import Any, Dict, List, Optional

import psutil
from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from ...extensions import csrf, db
from ...models import Server
from ...security import audit_log, rate_limit
from ...utils import execute_server_command, is_feature_enabled

console_api_bp = Blueprint("console_api", __name__, url_prefix="/api/console")


def user_or_admin_required_api(f):
    """API decorator to require user authentication (admin or regular user)."""
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)

    return decorated_function


def validate_server_access(server_id: int) -> Server:
    """
    Validate that the current user has access to the specified server.

    Args:
        server_id: ID of the server to validate access for

    Returns:
        Server object if access is allowed

    Raises:
        ValueError: If server not found or access denied
    """
    server = Server.query.get(server_id)
    if not server:
        raise ValueError("Server not found")

    # Admin users can access all servers
    if current_user.is_admin:
        return server

    # Regular users can only access their own servers
    if server.owner_id != current_user.id:
        raise ValueError("Access denied")

    return server


def get_server_logs(server: Server, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """
    Get server logs from the server's log file.

    Args:
        server: Server object
        limit: Maximum number of log lines to return
        offset: Number of log lines to skip

    Returns:
        List of log entries with timestamp, level, and message
    """
    server_dir = os.path.join("servers", server.server_name)
    log_file = os.path.join(server_dir, "logs", "latest.log")

    if not os.path.exists(log_file):
        return []

    logs = []
    try:
        with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        # Get the last 'limit' lines, skipping 'offset' from the end
        start_idx = max(0, len(lines) - limit - offset)
        end_idx = len(lines) - offset

        for line in lines[start_idx:end_idx]:
            line = line.strip()
            if not line:
                continue

            # Parse log line format: [HH:MM:SS] [LEVEL] message
            timestamp = ""
            level = "info"
            message = line

            if line.startswith("[") and "]" in line:
                # Extract timestamp
                timestamp_end = line.find("]")
                if timestamp_end > 1:
                    timestamp = line[1:timestamp_end]
                    remaining = line[timestamp_end + 1 :].strip()

                    # Extract level if present
                    if remaining.startswith("[") and "]" in remaining:
                        level_end = remaining.find("]")
                        if level_end > 1:
                            level = remaining[1:level_end].lower()
                            message = remaining[level_end + 1 :].strip()

            logs.append({"timestamp": timestamp, "level": level, "message": message, "raw": line})

    except Exception:
        # Return empty list on error, don't fail the API call
        pass

    return logs


def send_console_command(server: Server, command: str) -> Dict[str, Any]:
    """
    Send a console command to a running Minecraft server.

    Args:
        server: Server object
        command: Command to send to the server

    Returns:
        Dict with success status and result information
    """
    # Use the new execute_server_command function from utils
    return execute_server_command(server.id, command)


def get_server_status(server: Server) -> Dict[str, Any]:
    """
    Get comprehensive server status and metadata.

    Args:
        server: Server object

    Returns:
        Dict with server status information
    """
    status_info = {
        "server_id": server.id,
        "server_name": server.server_name,
        "version": server.version,
        "port": server.port,
        "status": server.status,
        "pid": server.pid,
        "memory_mb": server.memory_mb,
        "owner_id": server.owner_id,
        "created_at": server.created_at.isoformat() if hasattr(server, "created_at") else None,
    }

    # Add process information if server is running
    if server.pid:
        try:
            process = psutil.Process(server.pid)
            if process.is_running():
                status_info.update(
                    {
                        "process_info": {
                            "pid": process.pid,
                            "cpu_percent": process.cpu_percent(),
                            "memory_info": {
                                "rss": process.memory_info().rss,
                                "vms": process.memory_info().vms,
                            },
                            "create_time": process.create_time(),
                            "status": process.status(),
                        },
                        "is_actually_running": True,
                    }
                )
            else:
                status_info["is_actually_running"] = False
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            status_info["is_actually_running"] = False

    return status_info


@console_api_bp.route("/<int:server_id>/logs", methods=["GET"])
@csrf.exempt
@user_or_admin_required_api
@rate_limit(max_attempts=60, window_seconds=60)
def get_server_logs_api(server_id):
    """
    Get server logs with pagination.

    GET /api/console/<server_id>/logs?limit=100&offset=0

    Args:
        server_id: ID of the server to get logs for

    Returns:
        JSON response with server logs
    """
    try:
        # Check feature flag
        if not is_feature_enabled("server_management_page"):
            return jsonify({"error": "Console API is not enabled"}), 403

        # Validate server access
        try:
            server = validate_server_access(server_id)
        except ValueError as e:
            if "Server not found" in str(e):
                return jsonify({"error": "Server not found"}), 404
            else:  # Access denied
                return jsonify({"error": "Access denied"}), 403

        # Get pagination parameters
        limit = min(int(request.args.get("limit", 100)), 1000)  # Cap at 1000
        offset = max(int(request.args.get("offset", 0)), 0)

        # Get server logs
        logs = get_server_logs(server, limit, offset)

        return jsonify(
            {
                "success": True,
                "server_id": server_id,
                "server_name": server.server_name,
                "logs": logs,
                "count": len(logs),
                "limit": limit,
                "offset": offset,
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to retrieve logs: {str(e)}",
                }
            ),
            500,
        )


@console_api_bp.route("/<int:server_id>/command", methods=["POST"])
@csrf.exempt
@user_or_admin_required_api
@rate_limit(max_attempts=20, window_seconds=300)
def execute_command(server_id):
    """
    Execute a console command on the server.

    POST /api/console/<server_id>/command
    Body: {
        "command": "string"
    }

    Args:
        server_id: ID of the server to execute command on

    Returns:
        JSON response with command execution result
    """
    try:
        # Check feature flag
        if not is_feature_enabled("server_management_page"):
            return jsonify({"error": "Console API is not enabled"}), 403

        # Validate server access
        try:
            server = validate_server_access(server_id)
        except ValueError as e:
            if "Server not found" in str(e):
                return jsonify({"error": "Server not found"}), 404
            else:  # Access denied
                return jsonify({"error": "Access denied"}), 403

        # Get command from request
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON data required"}), 400

        command = data.get("command", "").strip()
        if not command:
            return jsonify({"error": "Command is required"}), 400

        # Execute command
        result = send_console_command(server, command)

        if result["success"]:
            # Log the command execution
            audit_log(
                "console_command_executed",
                {
                    "server_id": server_id,
                    "server_name": server.server_name,
                    "command": command,
                    "user_id": current_user.id,
                },
            )

            return jsonify(
                {
                    "success": True,
                    "message": result["message"],
                    "command": result["command"],
                    "timestamp": result["timestamp"],
                }
            )
        else:
            return (
                jsonify(
                    {
                        "success": False,
                        "error": result["error"],
                    }
                ),
                400,
            )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to execute command: {str(e)}",
                }
            ),
            500,
        )


@console_api_bp.route("/<int:server_id>/status", methods=["GET"])
@csrf.exempt
@user_or_admin_required_api
@rate_limit(max_attempts=60, window_seconds=60)
def get_server_status_api(server_id):
    """
    Get server status and metadata.

    GET /api/console/<server_id>/status

    Args:
        server_id: ID of the server to get status for

    Returns:
        JSON response with server status information
    """
    try:
        # Check feature flag
        if not is_feature_enabled("server_management_page"):
            return jsonify({"error": "Console API is not enabled"}), 403

        # Validate server access
        try:
            server = validate_server_access(server_id)
        except ValueError as e:
            if "Server not found" in str(e):
                return jsonify({"error": "Server not found"}), 404
            else:  # Access denied
                return jsonify({"error": "Access denied"}), 403

        # Get server status
        status_info = get_server_status(server)

        return jsonify(
            {
                "success": True,
                "status": status_info,
            }
        )

    except Exception as e:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Failed to retrieve server status: {str(e)}",
                }
            ),
            500,
        )
