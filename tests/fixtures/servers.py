"""
Server-related test fixtures.

This module provides fixtures for creating and managing server test data.
"""
import pytest

from tests.factories import ServerFactory


@pytest.fixture
def test_server(app, admin_user):
    """Create a test server for testing."""
    with app.app_context():
        from app.extensions import db

        server = ServerFactory.create(
            server_name="testserver",
            owner_id=admin_user.id,
        )
        db.session.add(server)
        db.session.commit()
        # Refresh the server to ensure it's properly attached to the session
        db.session.refresh(server)
        return server


@pytest.fixture
def running_server(app, admin_user):
    """Create a running server for testing."""
    with app.app_context():
        from app.extensions import db

        server = ServerFactory.create_running(
            server_name="runningserver",
            owner_id=admin_user.id,
        )
        db.session.add(server)
        db.session.commit()
        db.session.refresh(server)
        return server


@pytest.fixture
def stopped_server(app, admin_user):
    """Create a stopped server for testing."""
    with app.app_context():
        from app.extensions import db

        server = ServerFactory.create_stopped(
            server_name="stoppedserver",
            owner_id=admin_user.id,
        )
        db.session.add(server)
        db.session.commit()
        db.session.refresh(server)
        return server


@pytest.fixture
def multiple_servers(app, admin_user):
    """Create multiple servers for testing."""
    with app.app_context():
        from app.extensions import db

        servers = []
        # Create 3 servers with different configurations
        for i in range(3):
            server = ServerFactory.create(
                server_name=f"multiserver_{i}",
                owner_id=admin_user.id,
                memory_mb=1024 + (i * 512),  # Vary memory
                port=25565 + i,  # Vary ports
            )
            db.session.add(server)
            servers.append(server)

        db.session.commit()

        # Refresh all servers
        for server in servers:
            db.session.refresh(server)

        return servers


@pytest.fixture
def server_with_custom_settings(app, admin_user):
    """Create a server with custom game settings for testing."""
    with app.app_context():
        from app.extensions import db

        server = ServerFactory.create_with_custom_settings(
            server_name="customserver",
            owner_id=admin_user.id,
        )
        db.session.add(server)
        db.session.commit()
        db.session.refresh(server)
        return server


@pytest.fixture
def servers_with_different_owners(app, multiple_users):
    """Create servers owned by different users."""
    with app.app_context():
        from app.extensions import db

        servers = []
        # Create one server for each user
        for i, user in enumerate(multiple_users):
            server = ServerFactory.create(
                server_name=f"user_{i}_server",
                owner_id=user.id,
                port=25565 + i,
            )
            db.session.add(server)
            servers.append(server)

        db.session.commit()

        # Refresh all servers
        for server in servers:
            db.session.refresh(server)

        return servers


@pytest.fixture
def memory_test_servers(app, admin_user):
    """Create servers for memory management testing."""
    with app.app_context():
        from app.extensions import db

        servers = []
        memory_allocations = [512, 1024, 2048, 4096]

        for i, memory in enumerate(memory_allocations):
            server = ServerFactory.create(
                server_name=f"memory_server_{i}",
                owner_id=admin_user.id,
                memory_mb=memory,
                port=25565 + i,
            )
            db.session.add(server)
            servers.append(server)

        db.session.commit()

        # Refresh all servers
        for server in servers:
            db.session.refresh(server)

        return servers
