"""
Pytest configuration and fixtures for the Minecraft Server Manager tests.
"""
import os
import tempfile

import pytest

from app import create_app
from app.extensions import db
from app.models import Server, User


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()

    # Set test configuration
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        "SECRET_KEY": "test-secret-key-for-testing-only",
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

        admin_user = User(
            username="admin",
            password_hash=generate_password_hash(  # pragma: allowlist secret"adminpass"),
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
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture
def admin_user(app):
    """Get or create an admin user for testing."""
    with app.app_context():
        # Check if admin user already exists (created by app fixture)
        user = User.query.filter_by(username="admin").first()
        if not user:
            # Create a fresh admin user if none exists
            from werkzeug.security import generate_password_hash

            user = User(
                username="admin",
                password_hash=generate_password_hash(  # pragma: allowlist secret"adminpass"),
                is_admin=True,
                is_active=True,
            )
            db.session.add(user)
            db.session.commit()
            # Refresh the user to ensure it's properly attached to the session
            db.session.refresh(user)
        return user


@pytest.fixture
def regular_user(app):
    """Create a regular user for testing."""
    with app.app_context():
        # Always create a fresh regular user for each test
        user = User(
            username="testuser",
            password_hash="pbkdf2:sha256:600000$test$test_hash",
            is_admin=False,
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()
        # Refresh the user to ensure it's properly attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture
def test_server(app, admin_user):
    """Create a test server for testing."""
    with app.app_context():
        server = Server(
            server_name="testserver",
            version="1.20.1",
            port=25565,
            status="Stopped",
            pid=None,
            level_seed="test_seed",
            gamemode="survival",
            difficulty="normal",
            hardcore=False,
            pvp=True,
            spawn_monsters=True,
            motd="Test Server",
            memory_mb=1024,
            owner_id=admin_user.id,
        )
        db.session.add(server)
        db.session.commit()
        # Refresh the server to ensure it's properly attached to the session
        db.session.refresh(server)
        return server


@pytest.fixture
def authenticated_client(client, admin_user):
    """Provide a client with an authenticated admin user."""
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
    return client


@pytest.fixture
def app_no_admin():
    """Create and configure a new app instance for each test without admin user."""
    # Create a temporary file for the test database
    db_fd, db_path = tempfile.mkstemp()

    # Set test configuration
    test_config = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": f"sqlite:///{db_path}",
        "SECRET_KEY": "test-secret-key-for-testing-only",
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
def client_no_admin(app_no_admin):
    """A test client for the app without admin user."""
    return app_no_admin.test_client()


@pytest.fixture
def temp_server_dir():
    """Create a temporary directory for server files."""
    import shutil
    import tempfile

    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)
