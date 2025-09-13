#!/usr/bin/env python3
"""
Database backup and recovery script for mcServerManager.

This script provides functionality to backup and restore the database,
including data validation and integrity checks.
"""

import argparse
import json
import os
import shutil
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402


class DatabaseBackup:
    """Database backup and recovery manager."""

    def __init__(self, app=None):
        """Initialize the backup manager."""
        self.app = app or create_app()
        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)

    def create_backup(self, backup_name=None):
        """Create a database backup with metadata."""
        if not backup_name:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}"

        backup_path = self.backup_dir / f"{backup_name}.db"
        metadata_path = self.backup_dir / f"{backup_name}_metadata.json"

        with self.app.app_context():
            # Get database path from SQLAlchemy URI
            db_uri = self.app.config["SQLALCHEMY_DATABASE_URI"]
            if db_uri.startswith("sqlite:///"):
                source_db = db_uri.replace("sqlite:///", "")
            else:
                raise ValueError("Only SQLite databases are supported for backup")

            # Copy database file
            shutil.copy2(source_db, backup_path)

            # Create metadata
            metadata = self._get_database_metadata(source_db)
            metadata["backup_name"] = backup_name
            metadata["backup_timestamp"] = datetime.now().isoformat()
            metadata["source_database"] = source_db

            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)

            print(f"Backup created: {backup_path}")
            print(f"Metadata saved: {metadata_path}")
            return str(backup_path)

    def restore_backup(self, backup_name):
        """Restore database from backup."""
        backup_path = self.backup_dir / f"{backup_name}.db"
        metadata_path = self.backup_dir / f"{backup_name}_metadata.json"

        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")

        with self.app.app_context():
            # Get current database path
            db_uri = self.app.config["SQLALCHEMY_DATABASE_URI"]
            if db_uri.startswith("sqlite:///"):
                target_db = db_uri.replace("sqlite:///", "")
            else:
                raise ValueError("Only SQLite databases are supported for restore")

            # Create backup of current database before restore
            current_backup = f"{target_db}.pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            shutil.copy2(target_db, current_backup)
            print(f"Current database backed up to: {current_backup}")

            # Restore from backup
            shutil.copy2(backup_path, target_db)

            # Validate restored database
            if self._validate_database(target_db):
                print(f"Database restored successfully from: {backup_name}")
                if metadata_path.exists():
                    with open(metadata_path, "r") as f:
                        metadata = json.load(f)
                    print(f"Restored from backup created: {metadata.get('backup_timestamp')}")
            else:
                raise ValueError("Restored database failed validation")

    def list_backups(self):
        """List available backups."""
        backups = []
        for file in self.backup_dir.glob("backup_*.db"):
            metadata_file = file.with_suffix("_metadata.json")
            metadata = {}
            if metadata_file.exists():
                with open(metadata_file, "r") as f:
                    metadata = json.load(f)

            backups.append(
                {
                    "name": file.stem,
                    "file": str(file),
                    "size": file.stat().st_size,
                    "created": metadata.get("backup_timestamp", "Unknown"),
                    "tables": metadata.get("tables", {}),
                }
            )

        return sorted(backups, key=lambda x: x["created"], reverse=True)

    def _get_database_metadata(self, db_path):
        """Get metadata about the database."""
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Get table information
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {}
        for (table_name,) in cursor.fetchall():
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            tables[table_name] = {
                "columns": len(columns),
                "rows": row_count,
            }

        # Get database file size
        file_size = os.path.getsize(db_path)

        conn.close()

        return {
            "tables": tables,
            "file_size": file_size,
            "database_version": sqlite3.sqlite_version,
        }

    def _validate_database(self, db_path):
        """Validate database integrity."""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check database integrity
            cursor.execute("PRAGMA integrity_check")
            result = cursor.fetchone()[0]
            if result != "ok":
                print(f"Database integrity check failed: {result}")
                return False

            # Check if required tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            required_tables = ["user", "server", "configuration"]
            missing_tables = set(required_tables) - set(tables)
            if missing_tables:
                print(f"Missing required tables: {missing_tables}")
                return False

            conn.close()
            return True

        except Exception as e:
            print(f"Database validation error: {e}")
            return False

    def cleanup_old_backups(self, keep_count=10):
        """Clean up old backups, keeping only the most recent ones."""
        backups = self.list_backups()
        if len(backups) <= keep_count:
            print(f"Only {len(backups)} backups found, no cleanup needed")
            return

        # Remove old backups
        for backup in backups[keep_count:]:
            backup_file = Path(backup["file"])
            metadata_file = backup_file.with_suffix("_metadata.json")

            backup_file.unlink(missing_ok=True)
            metadata_file.unlink(missing_ok=True)
            print(f"Removed old backup: {backup['name']}")

        print(f"Cleanup complete. Kept {keep_count} most recent backups.")


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(description="Database backup and recovery tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Create backup command
    create_parser = subparsers.add_parser("create", help="Create a database backup")
    create_parser.add_argument("--name", help="Custom backup name")

    # Restore backup command
    restore_parser = subparsers.add_parser("restore", help="Restore from backup")
    restore_parser.add_argument("name", help="Backup name to restore")

    # List backups command
    subparsers.add_parser("list", help="List available backups")

    # Cleanup command
    cleanup_parser = subparsers.add_parser("cleanup", help="Clean up old backups")
    cleanup_parser.add_argument("--keep", type=int, default=10, help="Number of backups to keep")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    backup_manager = DatabaseBackup()

    try:
        if args.command == "create":
            backup_manager.create_backup(args.name)
        elif args.command == "restore":
            backup_manager.restore_backup(args.name)
        elif args.command == "list":
            backups = backup_manager.list_backups()
            if not backups:
                print("No backups found")
            else:
                print(f"{'Name':<30} {'Size':<10} {'Created':<20} {'Tables'}")
                print("-" * 80)
                for backup in backups:
                    table_info = ", ".join(
                        [f"{k}({v['rows']})" for k, v in backup["tables"].items()]
                    )
                    print(
                        f"{backup['name']:<30} {backup['size']:<10} {backup['created']:<20} {table_info}"
                    )
        elif args.command == "cleanup":
            backup_manager.cleanup_old_backups(args.keep)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
