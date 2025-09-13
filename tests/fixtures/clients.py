"""
Client-related test fixtures.

This module provides fixtures for creating test clients with different
authentication states.
"""
import pytest


@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()


@pytest.fixture
def client_no_admin(app_no_admin):
    """A test client for the app without admin user."""
    return app_no_admin.test_client()


@pytest.fixture
def authenticated_client(client, admin_user):
    """Provide a client with an authenticated admin user."""
    with client.session_transaction() as sess:
        sess["_user_id"] = str(admin_user.id)
        sess["_fresh"] = True
    return client


@pytest.fixture
def authenticated_regular_client(client, regular_user):
    """Provide a client with an authenticated regular user."""
    with client.session_transaction() as sess:
        sess["_user_id"] = str(regular_user.id)
        sess["_fresh"] = True
    return client


@pytest.fixture
def authenticated_inactive_client(client, inactive_user):
    """Provide a client with an authenticated inactive user."""
    with client.session_transaction() as sess:
        sess["_user_id"] = str(inactive_user.id)
        sess["_fresh"] = True
    return client


@pytest.fixture
def unauthenticated_client(client):
    """Provide a client without authentication."""
    return client
