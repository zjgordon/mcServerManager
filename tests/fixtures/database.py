"""
Database-related test fixtures.

This module provides fixtures for database setup, teardown, and state management
in tests.
"""
import os
import tempfile
from contextlib import contextmanager
from typing import Generator

import pytest

from app import create_app
from app.extensions import db


@contextmanager
def app_context_with_cleanup(app) -> Generator[None, None, None]:
    """Context manager for Flask app context with proper cleanup."""
    with app.app_context():
        try:
            # Ensure clean database state
            db.drop_all()
            db.create_all()
            yield
        finally:
            # Clean up any pending transactions
            db.session.rollback()
            db.drop_all()


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

    with app_context_with_cleanup(app):
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

        # Create default experimental feature flags for testing
        from app.models import ExperimentalFeature

        # Check if the feature already exists to avoid UNIQUE constraint errors
        existing_feature = ExperimentalFeature.query.filter_by(
            feature_key="server_management_page"
        ).first()
        if not existing_feature:
            server_management_feature = ExperimentalFeature(
                feature_key="server_management_page",
                feature_name="Server Management Page",
                description="Enable the enhanced server management page with console integration",
                enabled=True,  # Default to enabled for tests
                is_stable=False,
                updated_by=None,
            )
            db.session.add(server_management_feature)

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

    with app_context_with_cleanup(app):
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


@pytest.fixture
def clean_test_environment(app):
    """Ensure a completely clean test environment with proper setup."""
    with app.app_context():
        # Clean database state
        db.drop_all()
        db.create_all()

        # Create admin user
        from werkzeug.security import generate_password_hash

        from app.models import ExperimentalFeature, User

        admin_user = User(
            username="admin",
            password_hash=generate_password_hash("adminpass"),  # pragma: allowlist secret
            is_admin=True,
            is_active=True,
        )
        db.session.add(admin_user)

        # Create default experimental feature
        server_management_feature = ExperimentalFeature(
            feature_key="server_management_page",
            feature_name="Server Management Page",
            description="Enable the enhanced server management page with console integration",
            enabled=True,
            is_stable=False,
            updated_by=None,
        )
        db.session.add(server_management_feature)

        db.session.commit()

        yield app

        # Cleanup after test
        db.session.rollback()
        db.drop_all()
