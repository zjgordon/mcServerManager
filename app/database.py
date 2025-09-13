"""
Database management utilities for mcServerManager.

This module provides database performance monitoring, data validation,
and integrity checking functionality.
"""

import time
from typing import Any, Dict, List

from flask import current_app
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .extensions import db
from .logging import logger


class DatabaseManager:
    """Database management and monitoring utilities."""

    @staticmethod
    def get_database_stats() -> Dict[str, Any]:
        """Get comprehensive database statistics."""
        try:
            with db.engine.connect() as conn:
                stats: Dict[str, Any] = {}

                # Get database file size
                db_uri = current_app.config["SQLALCHEMY_DATABASE_URI"]
                if db_uri.startswith("sqlite:///"):
                    import os

                    db_path = db_uri.replace("sqlite:///", "")
                    if os.path.exists(db_path):
                        file_size_bytes = os.path.getsize(db_path)
                        stats["file_size_bytes"] = file_size_bytes
                        stats["file_size_mb"] = round(
                            file_size_bytes / (1024 * 1024), 2
                        )

                # Get table statistics
                tables = ["user", "server", "configuration"]
                table_stats: Dict[str, Any] = {}

                for table in tables:
                    try:
                        # Get row count
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        row_count = result.scalar()

                        # Get table info
                        result = conn.execute(text(f"PRAGMA table_info({table})"))
                        columns = result.fetchall()

                        table_stats[table] = {
                            "row_count": row_count,
                            "column_count": len(columns),
                            "columns": [col[1] for col in columns],  # Column names
                        }
                    except SQLAlchemyError as e:
                        logger.warning(f"Could not get stats for table {table}: {e}")
                        table_stats[table] = {"error": str(e)}

                stats["tables"] = table_stats

                # Get database integrity status
                result = conn.execute(text("PRAGMA integrity_check"))
                integrity_result = result.scalar()
                stats["integrity_check"] = integrity_result == "ok"

                # Get database version
                result = conn.execute(text("SELECT sqlite_version()"))
                stats["sqlite_version"] = result.scalar()

                return stats

        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {"error": str(e)}

    @staticmethod
    def validate_data_integrity() -> Dict[str, Any]:
        """Validate data integrity across all tables."""
        validation_results: Dict[str, Any] = {
            "overall_status": "passed",
            "checks": {},
            "errors": [],
        }

        try:
            # Check foreign key constraints
            fk_check = DatabaseManager._check_foreign_keys()
            validation_results["checks"]["foreign_keys"] = fk_check

            # Check required fields
            required_check = DatabaseManager._check_required_fields()
            validation_results["checks"]["required_fields"] = required_check

            # Check unique constraints
            unique_check = DatabaseManager._check_unique_constraints()
            validation_results["checks"]["unique_constraints"] = unique_check

            # Check data consistency
            consistency_check = DatabaseManager._check_data_consistency()
            validation_results["checks"]["data_consistency"] = consistency_check

            # Determine overall status
            all_checks = [
                fk_check["status"] == "passed",
                required_check["status"] == "passed",
                unique_check["status"] == "passed",
                consistency_check["status"] == "passed",
            ]

            if not all(all_checks):
                validation_results["overall_status"] = "failed"

        except Exception as e:
            logger.error(f"Error during data integrity validation: {e}")
            validation_results["overall_status"] = "error"
            validation_results["errors"].append(str(e))

        return validation_results

    @staticmethod
    def _check_foreign_keys() -> Dict[str, Any]:
        """Check foreign key constraints."""
        try:
            with db.engine.connect() as conn:
                # Check for orphaned server records
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM server s
                    LEFT JOIN user u ON s.owner_id = u.id
                    WHERE u.id IS NULL
                """
                    )
                )
                orphaned_servers = result.scalar()

                # Check for orphaned configuration records
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM configuration c
                    LEFT JOIN user u ON c.updated_by = u.id
                    WHERE c.updated_by IS NOT NULL AND u.id IS NULL
                """
                    )
                )
                orphaned_configs = result.scalar()

                return {
                    "status": "passed"
                    if orphaned_servers == 0 and orphaned_configs == 0
                    else "failed",
                    "orphaned_servers": orphaned_servers,
                    "orphaned_configurations": orphaned_configs,
                }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    @staticmethod
    def _check_required_fields() -> Dict[str, Any]:
        """Check required field constraints."""
        try:
            with db.engine.connect() as conn:
                issues: List[str] = []

                # Check user table
                result = conn.execute(
                    text(
                        "SELECT COUNT(*) FROM user WHERE username IS NULL OR username = ''"
                    )
                )
                null_usernames = result.scalar()
                if null_usernames > 0:
                    issues.append(f"Users with null/empty usernames: {null_usernames}")

                # Check server table
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM server
                    WHERE server_name IS NULL OR server_name = ''
                    OR version IS NULL OR version = ''
                    OR port IS NULL OR owner_id IS NULL
                """
                    )
                )
                null_server_fields = result.scalar()
                if null_server_fields > 0:
                    issues.append(
                        f"Servers with null required fields: {null_server_fields}"
                    )

                # Check configuration table
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM configuration
                    WHERE key IS NULL OR key = '' OR value IS NULL
                """
                    )
                )
                null_config_fields = result.scalar()
                if null_config_fields > 0:
                    issues.append(
                        f"Configurations with null required fields: {null_config_fields}"
                    )

                return {
                    "status": "passed" if not issues else "failed",
                    "issues": issues,
                }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    @staticmethod
    def _check_unique_constraints() -> Dict[str, Any]:
        """Check unique constraint violations."""
        try:
            with db.engine.connect() as conn:
                issues: List[str] = []

                # Check user username uniqueness
                result = conn.execute(
                    text(
                        """
                    SELECT username, COUNT(*) as count
                    FROM user
                    GROUP BY username
                    HAVING COUNT(*) > 1
                """
                    )
                )
                duplicate_usernames = result.fetchall()
                if duplicate_usernames:
                    issues.append(
                        f"Duplicate usernames: {[row[0] for row in duplicate_usernames]}"
                    )

                # Check user email uniqueness (if not null)
                result = conn.execute(
                    text(
                        """
                    SELECT email, COUNT(*) as count
                    FROM user
                    WHERE email IS NOT NULL
                    GROUP BY email
                    HAVING COUNT(*) > 1
                """
                    )
                )
                duplicate_emails = result.fetchall()
                if duplicate_emails:
                    issues.append(
                        f"Duplicate emails: {[row[0] for row in duplicate_emails]}"
                    )

                # Check server name uniqueness
                result = conn.execute(
                    text(
                        """
                    SELECT server_name, COUNT(*) as count
                    FROM server
                    GROUP BY server_name
                    HAVING COUNT(*) > 1
                """
                    )
                )
                duplicate_servers = result.fetchall()
                if duplicate_servers:
                    issues.append(
                        f"Duplicate server names: {[row[0] for row in duplicate_servers]}"
                    )

                # Check server port uniqueness
                result = conn.execute(
                    text(
                        """
                    SELECT port, COUNT(*) as count
                    FROM server
                    GROUP BY port
                    HAVING COUNT(*) > 1
                """
                    )
                )
                duplicate_ports = result.fetchall()
                if duplicate_ports:
                    issues.append(
                        f"Duplicate ports: {[row[0] for row in duplicate_ports]}"
                    )

                # Check configuration key uniqueness
                result = conn.execute(
                    text(
                        """
                    SELECT key, COUNT(*) as count
                    FROM configuration
                    GROUP BY key
                    HAVING COUNT(*) > 1
                """
                    )
                )
                duplicate_configs = result.fetchall()
                if duplicate_configs:
                    issues.append(
                        f"Duplicate configuration keys: {[row[0] for row in duplicate_configs]}"
                    )

                return {
                    "status": "passed" if not issues else "failed",
                    "issues": issues,
                }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    @staticmethod
    def _check_data_consistency() -> Dict[str, Any]:
        """Check data consistency rules."""
        try:
            with db.engine.connect() as conn:
                issues: List[str] = []

                # Check server port range validity
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM server
                    WHERE port < 1 OR port > 65535
                """
                    )
                )
                invalid_ports = result.scalar()
                if invalid_ports > 0:
                    issues.append(f"Servers with invalid ports: {invalid_ports}")

                # Check memory allocation validity
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM server
                    WHERE memory_mb < 0 OR memory_mb > 32768
                """
                    )
                )
                invalid_memory = result.scalar()
                if invalid_memory > 0:
                    issues.append(
                        f"Servers with invalid memory allocation: {invalid_memory}"
                    )

                # Check user email format (basic validation)
                result = conn.execute(
                    text(
                        """
                    SELECT COUNT(*) FROM user
                    WHERE email IS NOT NULL
                    AND email NOT LIKE '%@%'
                """
                    )
                )
                invalid_emails = result.scalar()
                if invalid_emails > 0:
                    issues.append(f"Users with invalid email format: {invalid_emails}")

                return {
                    "status": "passed" if not issues else "failed",
                    "issues": issues,
                }

        except Exception as e:
            return {"status": "error", "error": str(e)}

    @staticmethod
    def optimize_database() -> Dict[str, Any]:
        """Optimize database performance."""
        optimization_results: Dict[str, Any] = {
            "status": "completed",
            "operations": [],
            "errors": [],
        }

        try:
            with db.engine.connect() as conn:
                # Analyze database
                conn.execute(text("ANALYZE"))
                optimization_results["operations"].append("Database analyzed")

                # Vacuum database (reclaim space)
                conn.execute(text("VACUUM"))
                optimization_results["operations"].append("Database vacuumed")

                # Set pragma optimizations
                conn.execute(text("PRAGMA optimize"))
                optimization_results["operations"].append(
                    "Pragma optimizations applied"
                )

                conn.commit()

        except Exception as e:
            logger.error(f"Error optimizing database: {e}")
            optimization_results["status"] = "failed"
            optimization_results["errors"].append(str(e))

        return optimization_results

    @staticmethod
    def get_performance_metrics() -> Dict[str, Any]:
        """Get database performance metrics."""
        try:
            with db.engine.connect() as conn:
                metrics = {}

                # Get query execution time
                start_time = time.time()
                conn.execute(text("SELECT 1"))
                query_time = (
                    time.time() - start_time
                ) * 1000  # Convert to milliseconds
                metrics["query_response_time_ms"] = round(query_time, 2)

                # Get database page count and size
                result = conn.execute(text("PRAGMA page_count"))
                page_count = result.scalar()

                result = conn.execute(text("PRAGMA page_size"))
                page_size = result.scalar()

                metrics["page_count"] = page_count
                metrics["page_size_bytes"] = page_size
                metrics["total_pages_mb"] = round(
                    (page_count * page_size) / (1024 * 1024), 2
                )

                # Get cache size
                result = conn.execute(text("PRAGMA cache_size"))
                cache_size = result.scalar()
                metrics["cache_size_pages"] = abs(cache_size)  # Cache size is negative

                return metrics

        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {"error": str(e)}
