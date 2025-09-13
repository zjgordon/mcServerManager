"""Database migration and management utilities for mcServerManager."""

import os
import shutil
from datetime import datetime
from typing import Any, Dict, List, Optional

from flask import current_app
from flask_migrate import Migrate, current, downgrade, revision, upgrade

from .extensions import db
from .models import Configuration, Server, User


class DatabaseManager:
    """Database management utilities for migrations, backups, and monitoring."""

    def __init__(self, app=None):
        """Initialize database manager with optional Flask app."""
        self.migrate = None
        if app:
            self.init_app(app)

    def init_app(self, app):
        """Initialize database manager with Flask app."""
        self.migrate = Migrate(app, db)

    def create_migration(self, message: str) -> bool:
        """Create a new database migration."""
        try:
            with current_app.app_context():
                revision("--autogenerate", "-m", message)
                return True
        except Exception as e:
            current_app.logger.error(f"Failed to create migration: {e}")
            return False

    def upgrade_database(self, revision: str = "head") -> bool:
        """Upgrade database to specified revision."""
        try:
            with current_app.app_context():
                upgrade(revision)
                return True
        except Exception as e:
            current_app.logger.error(f"Failed to upgrade database: {e}")
            return False

    def downgrade_database(self, revision: str) -> bool:
        """Downgrade database to specified revision."""
        try:
            with current_app.app_context():
                downgrade(revision)
                return True
        except Exception as e:
            current_app.logger.error(f"Failed to downgrade database: {e}")
            return False

    def get_current_revision(self) -> Optional[str]:
        """Get current database revision."""
        try:
            with current_app.app_context():
                revision = current()
                return str(revision) if revision else None
        except Exception as e:
            current_app.logger.error(f"Failed to get current revision: {e}")
            return None

    def get_migration_history(self) -> List[Dict[str, str]]:
        """Get migration history."""
        try:
            with current_app.app_context():
                # This would require implementing a custom command
                # For now, return empty list
                return []
        except Exception as e:
            current_app.logger.error(f"Failed to get migration history: {e}")
            return []


class DatabaseBackup:
    """Database backup and recovery utilities."""

    @staticmethod
    def create_backup(backup_dir: str = None) -> Optional[str]:
        """Create a database backup."""
        try:
            if not backup_dir:
                backup_dir = os.path.join(current_app.instance_path, "backups")

            os.makedirs(backup_dir, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(backup_dir, f"db_backup_{timestamp}.db")

            # Get database URI
            db_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
            if db_uri.startswith("sqlite:///"):
                db_path = db_uri.replace("sqlite:///", "")
                if os.path.exists(db_path):
                    shutil.copy2(db_path, backup_file)
                    current_app.logger.info(f"Database backup created: {backup_file}")
                    return backup_file
                else:
                    current_app.logger.error(f"Database file not found: {db_path}")
                    return None
            else:
                current_app.logger.error("Backup only supported for SQLite databases")
                return None

        except Exception as e:
            current_app.logger.error(f"Failed to create backup: {e}")
            return None

    @staticmethod
    def restore_backup(backup_file: str) -> bool:
        """Restore database from backup."""
        try:
            if not os.path.exists(backup_file):
                current_app.logger.error(f"Backup file not found: {backup_file}")
                return False

            db_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
            if db_uri.startswith("sqlite:///"):
                db_path = db_uri.replace("sqlite:///", "")

                # Create backup of current database
                current_backup = (
                    f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
                )
                if os.path.exists(db_path):
                    shutil.copy2(db_path, current_backup)

                # Restore from backup
                shutil.copy2(backup_file, db_path)
                current_app.logger.info(f"Database restored from: {backup_file}")
                return True
            else:
                current_app.logger.error("Restore only supported for SQLite databases")
                return False

        except Exception as e:
            current_app.logger.error(f"Failed to restore backup: {e}")
            return False


class DatabaseValidator:
    """Database validation and integrity checking utilities."""

    @staticmethod
    def validate_data_integrity() -> Dict[str, List[str]]:
        """Validate database data integrity."""
        issues: Dict[str, List[str]] = {
            "foreign_key_violations": [],
            "constraint_violations": [],
            "data_inconsistencies": [],
            "orphaned_records": [],
        }

        try:
            with current_app.app_context():
                # Check for orphaned servers
                orphaned_servers = (
                    db.session.query(Server)
                    .filter(~Server.owner_id.in_(db.session.query(User.id)))
                    .all()
                )

                for server in orphaned_servers:
                    issues["orphaned_records"].append(
                        f"Server '{server.server_name}' has invalid owner_id: {server.owner_id}"
                    )

                # Check for duplicate server names
                duplicate_servers = (
                    db.session.query(Server.server_name)
                    .group_by(Server.server_name)
                    .having(db.func.count(Server.server_name) > 1)
                    .all()
                )

                for (server_name,) in duplicate_servers:
                    issues["constraint_violations"].append(
                        f"Duplicate server name found: {server_name}"
                    )

                # Check for duplicate usernames
                duplicate_users = (
                    db.session.query(User.username)
                    .group_by(User.username)
                    .having(db.func.count(User.username) > 1)
                    .all()
                )

                for (username,) in duplicate_users:
                    issues["constraint_violations"].append(
                        f"Duplicate username found: {username}"
                    )

                # Check for invalid memory allocations
                invalid_memory = (
                    db.session.query(Server).filter(Server.memory_mb <= 0).all()
                )

                for server in invalid_memory:
                    issues["data_inconsistencies"].append(
                        f"Server '{server.server_name}' has invalid memory allocation: {server.memory_mb}MB"
                    )

        except Exception as e:
            current_app.logger.error(f"Failed to validate data integrity: {e}")
            issues["validation_errors"] = [f"Validation failed: {str(e)}"]

        return issues

    @staticmethod
    def validate_schema() -> Dict[str, List[str]]:
        """Validate database schema integrity."""
        issues: Dict[str, List[str]] = {
            "missing_tables": [],
            "missing_columns": [],
            "schema_inconsistencies": [],
        }

        try:
            with current_app.app_context():
                # Check if all expected tables exist
                inspector = db.inspect(db.engine)
                existing_tables = inspector.get_table_names()

                expected_tables = ["user", "server", "configuration"]
                for table in expected_tables:
                    if table not in existing_tables:
                        issues["missing_tables"].append(f"Missing table: {table}")

                # Check table columns for each model
                if "user" in existing_tables:
                    user_columns = [
                        col["name"] for col in inspector.get_columns("user")
                    ]
                    expected_user_columns = [
                        "id",
                        "username",
                        "password_hash",
                        "is_admin",
                        "email",
                        "created_at",
                        "last_login",
                        "is_active",
                    ]
                    for col in expected_user_columns:
                        if col not in user_columns:
                            issues["missing_columns"].append(
                                f"Missing column: user.{col}"
                            )

                if "server" in existing_tables:
                    server_columns = [
                        col["name"] for col in inspector.get_columns("server")
                    ]
                    expected_server_columns = [
                        "id",
                        "server_name",
                        "version",
                        "port",
                        "status",
                        "pid",
                        "level_seed",
                        "gamemode",
                        "difficulty",
                        "hardcore",
                        "pvp",
                        "spawn_monsters",
                        "motd",
                        "memory_mb",
                        "owner_id",
                    ]
                    for col in expected_server_columns:
                        if col not in server_columns:
                            issues["missing_columns"].append(
                                f"Missing column: server.{col}"
                            )

        except Exception as e:
            current_app.logger.error(f"Failed to validate schema: {e}")
            issues["validation_errors"] = [f"Schema validation failed: {str(e)}"]

        return issues


class DatabaseMonitor:
    """Database performance monitoring utilities."""

    @staticmethod
    def get_database_stats() -> Dict[str, Any]:
        """Get database performance statistics."""
        stats = {
            "table_counts": {},
            "database_size": 0,
            "connection_info": {},
            "performance_metrics": {},
        }

        try:
            with current_app.app_context():
                # Get table row counts
                stats["table_counts"] = {
                    "users": User.query.count(),
                    "servers": Server.query.count(),
                    "configurations": Configuration.query.count(),
                }

                # Get database file size (SQLite only)
                db_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
                if db_uri.startswith("sqlite:///"):
                    db_path = db_uri.replace("sqlite:///", "")
                    if os.path.exists(db_path):
                        stats["database_size"] = os.path.getsize(db_path)

                # Get connection pool info
                if hasattr(db.engine.pool, "size"):
                    stats["connection_info"] = {
                        "pool_size": db.engine.pool.size(),
                        "checked_in": db.engine.pool.checkedin(),
                        "checked_out": db.engine.pool.checkedout(),
                        "overflow": db.engine.pool.overflow(),
                    }

        except Exception as e:
            current_app.logger.error(f"Failed to get database stats: {e}")
            stats["error"] = str(e)

        return stats

    @staticmethod
    def check_database_health() -> Dict[str, Any]:
        """Check overall database health."""
        health = {"status": "healthy", "issues": [], "recommendations": []}

        try:
            with current_app.app_context():
                # Test database connection
                db.session.execute("SELECT 1")

                # Check data integrity
                data_issues = DatabaseValidator.validate_data_integrity()
                total_issues = sum(len(issues) for issues in data_issues.values())

                if total_issues > 0:
                    health["status"] = "degraded"
                    health["issues"].extend(
                        [
                            f"{category}: {len(issues)} issues"
                            for category, issues in data_issues.items()
                            if issues
                        ]
                    )

                # Check schema integrity
                schema_issues = DatabaseValidator.validate_schema()
                schema_issue_count = sum(
                    len(issues) for issues in schema_issues.values()
                )

                if schema_issue_count > 0:
                    health["status"] = "unhealthy"
                    health["issues"].extend(
                        [
                            f"Schema {category}: {len(issues)} issues"
                            for category, issues in schema_issues.items()
                            if issues
                        ]
                    )

                # Performance recommendations
                stats = DatabaseMonitor.get_database_stats()
                if stats.get("database_size", 0) > 100 * 1024 * 1024:  # 100MB
                    health["recommendations"].append(
                        "Consider database optimization - size exceeds 100MB"
                    )

        except Exception as e:
            health["status"] = "unhealthy"
            health["issues"].append(f"Database connection failed: {str(e)}")
            current_app.logger.error(f"Database health check failed: {e}")

        return health


# Initialize database manager
db_manager = DatabaseManager()
