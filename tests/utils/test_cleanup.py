"""
Test data cleanup utilities.

This module provides functions for cleaning up test data and ensuring
test isolation.
"""
import os
import shutil
from typing import List

from app.extensions import db
from app.models import Server, User


def cleanup_database():
    """Clean up all database data."""
    # Delete all servers first (due to foreign key constraints)
    Server.query.delete()
    # Delete all users
    User.query.delete()
    db.session.commit()


def cleanup_test_files(directories: List[str]):
    """
    Clean up test files and directories.

    Args:
        directories: List of directory paths to clean up
    """
    for directory in directories:
        if os.path.exists(directory):
            shutil.rmtree(directory, ignore_errors=True)


def cleanup_temp_files():
    """Clean up temporary files created during tests."""
    import glob
    import tempfile

    # Clean up temporary files in the system temp directory
    temp_patterns = [
        "/tmp/test_*",
        "/tmp/mcserver_*",
        tempfile.gettempdir() + "/test_*",
        tempfile.gettempdir() + "/mcserver_*",
    ]

    for pattern in temp_patterns:
        for file_path in glob.glob(pattern):
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path, ignore_errors=True)
            except (OSError, PermissionError):
                # Ignore errors when cleaning up temp files
                pass


def cleanup_test_data():
    """Clean up all test data (database and files)."""
    cleanup_database()
    cleanup_temp_files()


def isolate_test(test_func):
    """
    Decorator to ensure test isolation by cleaning up before and after test.

    Args:
        test_func: The test function to wrap

    Returns:
        Wrapped test function with cleanup
    """

    def wrapper(*args, **kwargs):
        # Clean up before test
        cleanup_test_data()

        try:
            # Run the test
            return test_func(*args, **kwargs)
        finally:
            # Clean up after test
            cleanup_test_data()

    return wrapper


def reset_test_environment():
    """Reset the entire test environment to a clean state."""
    cleanup_test_data()

    # Reset any global state if needed
    # This can be extended based on specific needs


def cleanup_user_data(user_id: int):
    """
    Clean up all data associated with a specific user.

    Args:
        user_id: ID of the user to clean up
    """
    # Delete user's servers
    Server.query.filter_by(owner_id=user_id).delete()
    # Delete the user
    User.query.filter_by(id=user_id).delete()
    db.session.commit()


def cleanup_server_data(server_id: int):
    """
    Clean up all data associated with a specific server.

    Args:
        server_id: ID of the server to clean up
    """
    Server.query.filter_by(id=server_id).delete()
    db.session.commit()


def cleanup_orphaned_data():
    """Clean up orphaned data (servers without owners, etc.)."""
    # Find servers with non-existent owners
    orphaned_servers = (
        db.session.query(Server).filter(~Server.owner_id.in_(db.session.query(User.id))).all()
    )

    for server in orphaned_servers:
        db.session.delete(server)

    db.session.commit()


def validate_test_data_integrity() -> bool:
    """
    Validate that test data maintains referential integrity.

    Returns:
        True if data is valid, False otherwise
    """
    try:
        # Check for orphaned servers
        orphaned_count = (
            db.session.query(Server).filter(~Server.owner_id.in_(db.session.query(User.id))).count()
        )

        if orphaned_count > 0:
            return False

        # Check for invalid memory allocations
        invalid_memory = db.session.query(Server).filter(Server.memory_mb < 0).count()

        if invalid_memory > 0:
            return False

        # Check for invalid ports
        invalid_ports = (
            db.session.query(Server).filter(Server.port < 1 or Server.port > 65535).count()
        )

        if invalid_ports > 0:
            return False

        return True

    except Exception:
        return False
