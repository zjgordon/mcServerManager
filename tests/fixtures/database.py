"""
Database-related test fixtures.

This module provides fixtures for database setup, teardown, and state management
in tests.
"""
import os
import tempfile

import pytest

from app import create_app
from app.extensions import db


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()

    # Set test configuration
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        "SECRET_KEY": "test-secret-key-for-testing-only",  # pragma: allowlist secret
        "WTF_CSRF_ENABLED": False,  # Disable CSRF for testing
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "RATELIMIT_ENABLED": False,  # Disable rate limiting for testing
        "APP_TITLE": "Minecraft Server Manager Test",
        "SERVER_HOSTNAME": "localhost",
        "MAX_TOTAL_MEMORY_MB": "8192",
        "DEFAULT_SERVER_MEMORY_MB": "1024",
        "MIN_SERVER_MEMORY_MB": "512",
        "MAX_SERVER_MEMORY_MB": "4096",
    }

    # Create app with test config
    app = create_app()
    app.config.update(test_config)

    with app.app_context():
        # Drop all tables first to ensure clean state
        db.drop_all()
        db.create_all()

        # Create a default admin user to prevent admin setup redirects in tests
        from werkzeug.security import generate_password_hash

        from app.models import User

        admin_user = User(
            username="admin",
            password_hash=generate_password_hash("adminpass"),  # pragma: allowlist secret
            is_admin=True,
            is_active=True,
        )
        db.session.add(admin_user)
        db.session.commit()

        yield app

    # Clean up
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def app_no_admin():
    """Create and configure a new app instance for each test without admin user."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()

    # Set test configuration
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        "SECRET_KEY": "test-secret-key-for-testing-only",  # pragma: allowlist secret
        "WTF_CSRF_ENABLED": False,  # Disable CSRF for testing
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        "RATELIMIT_ENABLED": False,  # Disable rate limiting for testing
        "APP_TITLE": "Minecraft Server Manager Test",
        "SERVER_HOSTNAME": "localhost",
        "MAX_TOTAL_MEMORY_MB": "8192",
        "DEFAULT_SERVER_MEMORY_MB": "1024",
        "MIN_SERVER_MEMORY_MB": "512",
        "MAX_SERVER_MEMORY_MB": "4096",
    }

    # Create app with test config
    app = create_app()
    app.config.update(test_config)

    with app.app_context():
        # Drop all tables first to ensure clean state
        db.drop_all()
        db.create_all()

        # Don't create admin user - for tests that need to test admin setup

        yield app

    # Clean up
    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def clean_db(app):
    """Ensure database is clean before each test."""
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield
        db.session.rollback()


@pytest.fixture
def db_session(app):
    """Provide a database session for tests."""
    with app.app_context():
        yield db.session
        db.session.rollback()
