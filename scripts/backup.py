#!/usr/bin/env python3
"""Database backup and recovery script for mcServerManager."""

import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app import create_app
from app.database import DatabaseBackup, DatabaseMonitor, DatabaseValidator


def create_backup(backup_dir: str = None, verbose: bool = False):
    """Create a database backup."""
    app = create_app()

    with app.app_context():
        backup_file = DatabaseBackup.create_backup(backup_dir)

        if backup_file:
            print(f"✅ Database backup created successfully: {backup_file}")

            if verbose:
                # Get file size
                file_size = os.path.getsize(backup_file)
                print(
                    f"   File size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)"
                )

                # Validate backup
                print("   Validating backup...")
                health = DatabaseMonitor.check_database_health()
                if health["status"] == "healthy":
                    print("   ✅ Backup validation successful")
                else:
                    print(
                        f"   ⚠️  Backup validation warnings: {', '.join(health['issues'])}"
                    )
        else:
            print("❌ Failed to create database backup")
            return 1

    return 0


def restore_backup(backup_file: str, verbose: bool = False):
    """Restore database from backup."""
    if not os.path.exists(backup_file):
        print(f"❌ Backup file not found: {backup_file}")
        return 1

    app = create_app()

    with app.app_context():
        if verbose:
            print(f"Restoring database from: {backup_file}")
            file_size = os.path.getsize(backup_file)
            print(
                f"Backup file size: {file_size:,} bytes ({file_size / 1024 / 1024:.2f} MB)"
            )

        success = DatabaseBackup.restore_backup(backup_file)

        if success:
            print("✅ Database restored successfully")

            if verbose:
                # Validate restored database
                print("Validating restored database...")
                health = DatabaseMonitor.check_database_health()
                if health["status"] == "healthy":
                    print("✅ Database validation successful")
                else:
                    print(
                        f"⚠️  Database validation warnings: {', '.join(health['issues'])}"
                    )
        else:
            print("❌ Failed to restore database")
            return 1

    return 0


def list_backups(backup_dir: str = None):
    """List available database backups."""
    if not backup_dir:
        backup_dir = os.path.join(os.getcwd(), "instance", "backups")

    if not os.path.exists(backup_dir):
        print(f"❌ Backup directory not found: {backup_dir}")
        return 1

    backup_files = []
    for file in os.listdir(backup_dir):
        if file.startswith("db_backup_") and file.endswith(".db"):
            file_path = os.path.join(backup_dir, file)
            stat = os.stat(file_path)
            backup_files.append(
                {
                    "filename": file,
                    "path": file_path,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime),
                }
            )

    if not backup_files:
        print("No database backups found")
        return 0

    # Sort by modification time (newest first)
    backup_files.sort(key=lambda x: x["modified"], reverse=True)

    print(f"Available database backups in {backup_dir}:")
    print("-" * 80)
    print(f"{'Filename':<30} {'Size':<15} {'Modified':<20}")
    print("-" * 80)

    for backup in backup_files:
        size_mb = backup["size"] / 1024 / 1024
        modified_str = backup["modified"].strftime("%Y-%m-%d %H:%M:%S")
        print(f"{backup['filename']:<30} {size_mb:>8.2f} MB {modified_str:<20}")

    return 0


def validate_database():
    """Validate database integrity."""
    app = create_app()

    with app.app_context():
        print("Validating database integrity...")

        # Check data integrity
        data_issues = DatabaseValidator.validate_data_integrity()
        total_data_issues = sum(len(issues) for issues in data_issues.values())

        if total_data_issues == 0:
            print("✅ Data integrity check passed")
        else:
            print(f"❌ Data integrity issues found: {total_data_issues}")
            for category, issues in data_issues.items():
                if issues:
                    print(f"   {category}: {len(issues)} issues")
                    for issue in issues[:5]:  # Show first 5 issues
                        print(f"     - {issue}")
                    if len(issues) > 5:
                        print(f"     ... and {len(issues) - 5} more")

        # Check schema integrity
        schema_issues = DatabaseValidator.validate_schema()
        total_schema_issues = sum(len(issues) for issues in schema_issues.values())

        if total_schema_issues == 0:
            print("✅ Schema integrity check passed")
        else:
            print(f"❌ Schema integrity issues found: {total_schema_issues}")
            for category, issues in schema_issues.items():
                if issues:
                    print(f"   {category}: {len(issues)} issues")
                    for issue in issues:
                        print(f"     - {issue}")

        # Check overall health
        health = DatabaseMonitor.check_database_health()
        print(f"\nDatabase health status: {health['status'].upper()}")

        if health["issues"]:
            print("Issues found:")
            for issue in health["issues"]:
                print(f"  - {issue}")

        if health["recommendations"]:
            print("Recommendations:")
            for rec in health["recommendations"]:
                print(f"  - {rec}")

        return 0 if total_data_issues == 0 and total_schema_issues == 0 else 1


def show_stats():
    """Show database statistics."""
    app = create_app()

    with app.app_context():
        print("Database Statistics:")
        print("-" * 40)

        stats = DatabaseMonitor.get_database_stats()

        print("Table counts:")
        for table, count in stats.get("table_counts", {}).items():
            print(f"  {table}: {count:,} records")

        db_size = stats.get("database_size", 0)
        if db_size > 0:
            print(
                f"\nDatabase size: {db_size:,} bytes ({db_size / 1024 / 1024:.2f} MB)"
            )

        conn_info = stats.get("connection_info", {})
        if conn_info:
            print("\nConnection pool:")
            for key, value in conn_info.items():
                print(f"  {key}: {value}")

        return 0


def main():
    """Main CLI interface."""
    parser = argparse.ArgumentParser(
        description="Database backup and recovery tool for mcServerManager",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s backup                    # Create backup in default location
  %(prog)s backup -d /path/to/backups -v  # Create backup with verbose output
  %(prog)s restore backup.db         # Restore from specific backup file
  %(prog)s list                      # List available backups
  %(prog)s validate                  # Validate database integrity
  %(prog)s stats                     # Show database statistics
        """,
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Create database backup")
    backup_parser.add_argument("-d", "--backup-dir", help="Backup directory")
    backup_parser.add_argument(
        "-v", "--verbose", action="store_true", help="Verbose output"
    )

    # Restore command
    restore_parser = subparsers.add_parser(
        "restore", help="Restore database from backup"
    )
    restore_parser.add_argument("backup_file", help="Backup file to restore")
    restore_parser.add_argument(
        "-v", "--verbose", action="store_true", help="Verbose output"
    )

    # List command
    list_parser = subparsers.add_parser("list", help="List available backups")
    list_parser.add_argument("-d", "--backup-dir", help="Backup directory to list")

    # Validate command
    subparsers.add_parser("validate", help="Validate database integrity")

    # Stats command
    subparsers.add_parser("stats", help="Show database statistics")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    try:
        if args.command == "backup":
            return create_backup(backup_dir=args.backup_dir, verbose=args.verbose)
        elif args.command == "restore":
            return restore_backup(backup_file=args.backup_file, verbose=args.verbose)
        elif args.command == "list":
            return list_backups(backup_dir=args.backup_dir)
        elif args.command == "validate":
            return validate_database()
        elif args.command == "stats":
            return show_stats()
        else:
            parser.print_help()
            return 1

    except KeyboardInterrupt:
        print("\n❌ Operation cancelled by user")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
