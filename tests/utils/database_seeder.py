"""
Database seeding utilities for tests.

This module provides functions for seeding the test database with
various data scenarios.
"""
from typing import Any, Dict, List

from app.extensions import db
from tests.factories import ServerFactory, TestDataFactory, UserFactory


def seed_basic_data() -> Dict[str, Any]:
    """
    Seed the database with basic test data.

    Returns:
        Dictionary containing created users and servers
    """
    # Create admin user
    admin = UserFactory.create_admin(username="seed_admin")
    db.session.add(admin)

    # Create regular user
    user = UserFactory.create_regular(username="seed_user")
    db.session.add(user)

    # Create servers
    admin_server = ServerFactory.create(
        server_name="admin_server",
        owner_id=admin.id,
    )
    db.session.add(admin_server)

    user_server = ServerFactory.create(
        server_name="user_server",
        owner_id=user.id,
    )
    db.session.add(user_server)

    db.session.commit()

    return {
        "users": [admin, user],
        "servers": [admin_server, user_server],
    }


def seed_memory_test_data() -> Dict[str, Any]:
    """
    Seed the database with data for memory management testing.

    Returns:
        Dictionary containing created users, servers, and memory info
    """
    return TestDataFactory.create_memory_test_scenario(
        total_memory_mb=8192,
        server_count=5,
    )


def seed_port_conflict_data() -> Dict[str, Any]:
    """
    Seed the database with data for port conflict testing.

    Returns:
        Dictionary containing created users and servers
    """
    return TestDataFactory.create_port_conflict_scenario(
        base_port=25565,
        server_count=3,
    )


def seed_multi_user_data(
    user_count: int = 5,
    servers_per_user: int = 2,
    admin_count: int = 1,
) -> Dict[str, Any]:
    """
    Seed the database with multiple users and servers.

    Args:
        user_count: Number of regular users to create
        servers_per_user: Number of servers per user
        admin_count: Number of admin users to create

    Returns:
        Dictionary containing created users and servers
    """
    return TestDataFactory.create_user_with_servers(
        user_count=user_count,
        servers_per_user=servers_per_user,
        admin_users=admin_count,
    )


def seed_stress_test_data() -> Dict[str, Any]:
    """
    Seed the database with data for stress testing.

    Returns:
        Dictionary containing created users and servers
    """
    # Create many users with many servers
    users = []
    servers = []

    # Create 10 users
    for i in range(10):
        user = UserFactory.create_regular(username=f"stress_user_{i}")
        db.session.add(user)
        users.append(user)

        # Create 3 servers per user
        for j in range(3):
            server = ServerFactory.create(
                server_name=f"stress_server_{i}_{j}",
                owner_id=user.id,
                port=25565 + (i * 3) + j,
            )
            db.session.add(server)
            servers.append(server)

    # Create 2 admin users
    for i in range(2):
        admin = UserFactory.create_admin(username=f"stress_admin_{i}")
        db.session.add(admin)
        users.append(admin)

        # Create 5 servers per admin
        for j in range(5):
            server = ServerFactory.create(
                server_name=f"stress_admin_server_{i}_{j}",
                owner_id=admin.id,
                port=26565 + (i * 5) + j,
            )
            db.session.add(server)
            servers.append(server)

    db.session.commit()

    return {
        "users": users,
        "servers": servers,
    }


def seed_custom_scenario(
    users: List[Dict[str, Any]],
    servers: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Seed the database with custom user and server data.

    Args:
        users: List of user data dictionaries
        servers: List of server data dictionaries

    Returns:
        Dictionary containing created users and servers
    """
    created_users = []
    created_servers = []

    # Create users
    for user_data in users:
        user = UserFactory.create(**user_data)
        db.session.add(user)
        created_users.append(user)

    db.session.commit()

    # Create servers (need user IDs)
    for server_data in servers:
        server = ServerFactory.create(**server_data)
        db.session.add(server)
        created_servers.append(server)

    db.session.commit()

    return {
        "users": created_users,
        "servers": created_servers,
    }


def clear_database():
    """Clear all data from the database."""
    db.drop_all()
    db.create_all()


def reset_database():
    """Reset the database to a clean state."""
    clear_database()
    seed_basic_data()
