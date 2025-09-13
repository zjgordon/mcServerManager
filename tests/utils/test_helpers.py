"""
Test helper utilities.

This module provides helper functions for common test operations
and assertions.
"""
import json
from typing import Any, Dict, Optional

from flask import Flask
from flask.testing import FlaskClient


def assert_response_contains(response, text: str):
    """Assert that a response contains specific text."""
    assert text in response.get_data(as_text=True)


def assert_response_not_contains(response, text: str):
    """Assert that a response does not contain specific text."""
    assert text not in response.get_data(as_text=True)


def assert_response_status(response, expected_status: int):
    """Assert that a response has the expected status code."""
    assert response.status_code == expected_status


def assert_json_response(response, expected_data: Dict[str, Any]):
    """Assert that a JSON response contains expected data."""
    data = response.get_json()
    for key, value in expected_data.items():
        assert key in data
        assert data[key] == value


def assert_flash_message(response, message: str, category: str = "message"):
    """Assert that a flash message was set."""
    # This would need to be implemented based on how flash messages are tested
    # in the specific application
    pass


def login_user(client: FlaskClient, username: str, password: str) -> bool:
    """
    Helper to log in a user for testing.

    Args:
        client: Flask test client
        username: Username to log in
        password: Password for the user

    Returns:
        True if login successful, False otherwise
    """
    response = client.post(
        "/login",
        data={
            "username": username,
            "password": password,
        },
        follow_redirects=True,
    )

    return response.status_code == 200


def logout_user(client: FlaskClient) -> bool:
    """
    Helper to log out a user for testing.

    Args:
        client: Flask test client

    Returns:
        True if logout successful, False otherwise
    """
    response = client.get("/logout", follow_redirects=True)
    return response.status_code == 200


def create_test_user_data(
    username: str = "testuser",
    password: str = "testpass",
    is_admin: bool = False,
) -> Dict[str, Any]:
    """
    Create test user data dictionary.

    Args:
        username: Username for the user
        password: Password for the user
        is_admin: Whether the user is an admin

    Returns:
        Dictionary containing user data
    """
    return {
        "username": username,
        "password": password,
        "is_admin": is_admin,
    }


def create_test_server_data(
    server_name: str = "testserver",
    version: str = "1.20.1",
    port: int = 25565,
    memory_mb: int = 1024,
) -> Dict[str, Any]:
    """
    Create test server data dictionary.

    Args:
        server_name: Name of the server
        version: Minecraft version
        port: Server port
        memory_mb: Memory allocation in MB

    Returns:
        Dictionary containing server data
    """
    return {
        "server_name": server_name,
        "version": version,
        "port": port,
        "memory_mb": memory_mb,
        "level_seed": "test_seed",
        "gamemode": "survival",
        "difficulty": "normal",
        "hardcore": False,
        "pvp": True,
        "spawn_monsters": True,
        "motd": f"Test Server {server_name}",
    }


def assert_database_state(
    app: Flask,
    expected_users: int = 0,
    expected_servers: int = 0,
):
    """
    Assert the current state of the database.

    Args:
        app: Flask application instance
        expected_users: Expected number of users
        expected_servers: Expected number of servers
    """
    from app.models import Server, User

    with app.app_context():
        user_count = User.query.count()
        server_count = Server.query.count()

        assert (
            user_count == expected_users
        ), f"Expected {expected_users} users, got {user_count}"
        assert (
            server_count == expected_servers
        ), f"Expected {expected_servers} servers, got {server_count}"


def assert_user_exists(
    app: Flask,
    username: str,
    is_admin: Optional[bool] = None,
    is_active: Optional[bool] = None,
) -> bool:
    """
    Assert that a user exists with specific attributes.

    Args:
        app: Flask application instance
        username: Username to check
        is_admin: Expected admin status (optional)
        is_active: Expected active status (optional)

    Returns:
        True if user exists with expected attributes
    """
    from app.models import User

    with app.app_context():
        user = User.query.filter_by(username=username).first()
        assert user is not None, f"User {username} not found"

        if is_admin is not None:
            assert user.is_admin == is_admin, f"User {username} admin status mismatch"

        if is_active is not None:
            assert (
                user.is_active == is_active
            ), f"User {username} active status mismatch"

        return True


def assert_server_exists(
    app: Flask,
    server_name: str,
    owner_username: Optional[str] = None,
    status: Optional[str] = None,
) -> bool:
    """
    Assert that a server exists with specific attributes.

    Args:
        app: Flask application instance
        server_name: Server name to check
        owner_username: Expected owner username (optional)
        status: Expected server status (optional)

    Returns:
        True if server exists with expected attributes
    """
    from app.models import Server, User

    with app.app_context():
        server = Server.query.filter_by(server_name=server_name).first()
        assert server is not None, f"Server {server_name} not found"

        if owner_username is not None:
            owner = User.query.get(server.owner_id)
            assert owner is not None, f"Server {server_name} has no owner"
            assert (
                owner.username == owner_username
            ), f"Server {server_name} owner mismatch"

        if status is not None:
            assert server.status == status, f"Server {server_name} status mismatch"

        return True


def get_test_data_file_path(filename: str) -> str:
    """
    Get the path to a test data file.

    Args:
        filename: Name of the test data file

    Returns:
        Full path to the test data file
    """
    import os

    return os.path.join(os.path.dirname(__file__), "..", "data", filename)


def load_test_data(filename: str) -> Dict[str, Any]:
    """
    Load test data from a JSON file.

    Args:
        filename: Name of the test data file

    Returns:
        Dictionary containing the test data
    """
    file_path = get_test_data_file_path(filename)
    with open(file_path, "r") as f:
        return json.load(f)


def save_test_data(filename: str, data: Dict[str, Any]):
    """
    Save test data to a JSON file.

    Args:
        filename: Name of the test data file
        data: Data to save
    """
    import os

    file_path = get_test_data_file_path(filename)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)
