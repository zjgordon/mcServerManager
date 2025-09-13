"""
Factory pattern for generating test data in the Minecraft Server Manager tests.

This module provides factory classes for creating test data objects with
sensible defaults and the ability to override specific attributes.
"""
import random
import string
from typing import Any, Dict, Optional

from werkzeug.security import generate_password_hash

from app.models import Server, User


class UserFactory:
    """Factory for creating User test data."""

    @staticmethod
    def create(
        username: Optional[str] = None,
        password: str = "testpass123",
        is_admin: bool = False,
        is_active: bool = True,
        **kwargs,
    ) -> User:
        """
        Create a User instance with test data.

        Args:
            username: Username for the user (auto-generated if None)
            password: Password for the user
            is_admin: Whether the user is an admin
            is_active: Whether the user is active
            **kwargs: Additional attributes to set on the user

        Returns:
            User instance with test data
        """
        if username is None:
            username = f"testuser_{random.randint(1000, 9999)}"

        user_data = {
            "username": username,
            "password_hash": generate_password_hash(
                password
            ),  # pragma: allowlist secret
            "is_admin": is_admin,
            "is_active": is_active,
            **kwargs,
        }

        return User(**user_data)

    @staticmethod
    def create_admin(
        username: Optional[str] = None, password: str = "adminpass123", **kwargs
    ) -> User:
        """Create an admin user."""
        return UserFactory.create(
            username=username, password=password, is_admin=True, **kwargs
        )

    @staticmethod
    def create_regular(
        username: Optional[str] = None, password: str = "userpass123", **kwargs
    ) -> User:
        """Create a regular user."""
        return UserFactory.create(
            username=username, password=password, is_admin=False, **kwargs
        )

    @staticmethod
    def create_inactive(
        username: Optional[str] = None, password: str = "inactivepass123", **kwargs
    ) -> User:
        """Create an inactive user."""
        return UserFactory.create(
            username=username,
            password=password,
            is_admin=False,
            is_active=False,
            **kwargs,
        )


class ServerFactory:
    """Factory for creating Server test data."""

    @staticmethod
    def create(
        server_name: Optional[str] = None,
        version: str = "1.20.1",
        port: Optional[int] = None,
        status: str = "Stopped",
        owner_id: Optional[int] = None,
        memory_mb: int = 1024,
        **kwargs,
    ) -> Server:
        """
        Create a Server instance with test data.

        Args:
            server_name: Name of the server (auto-generated if None)
            version: Minecraft version
            port: Server port (auto-generated if None)
            status: Server status
            owner_id: ID of the user who owns the server
            memory_mb: Memory allocation in MB
            **kwargs: Additional attributes to set on the server

        Returns:
            Server instance with test data
        """
        if server_name is None:
            server_name = f"testserver_{random.randint(1000, 9999)}"

        if port is None:
            port = random.randint(25565, 26565)

        server_data = {
            "server_name": server_name,
            "version": version,
            "port": port,
            "status": status,
            "pid": None,
            "level_seed": f"seed_{random.randint(1000, 9999)}",
            "gamemode": "survival",
            "difficulty": "normal",
            "hardcore": False,
            "pvp": True,
            "spawn_monsters": True,
            "motd": f"Test Server {server_name}",
            "memory_mb": memory_mb,
            "owner_id": owner_id,
            **kwargs,
        }

        return Server(**server_data)

    @staticmethod
    def create_running(
        server_name: Optional[str] = None,
        version: str = "1.20.1",
        port: Optional[int] = None,
        owner_id: Optional[int] = None,
        memory_mb: int = 1024,
        **kwargs,
    ) -> Server:
        """Create a running server."""
        return ServerFactory.create(
            server_name=server_name,
            version=version,
            port=port,
            status="Running",
            owner_id=owner_id,
            memory_mb=memory_mb,
            pid=random.randint(1000, 9999),
            **kwargs,
        )

    @staticmethod
    def create_stopped(
        server_name: Optional[str] = None,
        version: str = "1.20.1",
        port: Optional[int] = None,
        owner_id: Optional[int] = None,
        memory_mb: int = 1024,
        **kwargs,
    ) -> Server:
        """Create a stopped server."""
        return ServerFactory.create(
            server_name=server_name,
            version=version,
            port=port,
            status="Stopped",
            owner_id=owner_id,
            memory_mb=memory_mb,
            **kwargs,
        )

    @staticmethod
    def create_with_custom_settings(
        server_name: Optional[str] = None,
        gamemode: str = "creative",
        difficulty: str = "hard",
        hardcore: bool = True,
        pvp: bool = False,
        spawn_monsters: bool = False,
        motd: str = "Custom Test Server",
        **kwargs,
    ) -> Server:
        """Create a server with custom game settings."""
        return ServerFactory.create(
            server_name=server_name,
            gamemode=gamemode,
            difficulty=difficulty,
            hardcore=hardcore,
            pvp=pvp,
            spawn_monsters=spawn_monsters,
            motd=motd,
            **kwargs,
        )


class TestDataFactory:
    """Factory for creating complex test data scenarios."""

    @staticmethod
    def create_user_with_servers(
        user_count: int = 1,
        servers_per_user: int = 2,
        admin_users: int = 0,
    ) -> Dict[str, Any]:
        """
        Create multiple users with multiple servers each.

        Args:
            user_count: Number of regular users to create
            servers_per_user: Number of servers per user
            admin_users: Number of admin users to create

        Returns:
            Dictionary containing users and servers lists
        """
        users = []
        servers = []

        # Create admin users
        for i in range(admin_users):
            admin = UserFactory.create_admin(username=f"admin_{i}")
            users.append(admin)

            # Create servers for admin
            for j in range(servers_per_user):
                server = ServerFactory.create(
                    server_name=f"admin_{i}_server_{j}",
                    owner_id=admin.id,
                )
                servers.append(server)

        # Create regular users
        for i in range(user_count):
            user = UserFactory.create_regular(username=f"user_{i}")
            users.append(user)

            # Create servers for user
            for j in range(servers_per_user):
                server = ServerFactory.create(
                    server_name=f"user_{i}_server_{j}",
                    owner_id=user.id,
                )
                servers.append(server)

        return {"users": users, "servers": servers}

    @staticmethod
    def create_memory_test_scenario(
        total_memory_mb: int = 8192,
        server_count: int = 5,
    ) -> Dict[str, Any]:
        """
        Create a test scenario for memory management testing.

        Args:
            total_memory_mb: Total available memory
            server_count: Number of servers to create

        Returns:
            Dictionary containing users, servers, and memory info
        """
        users = []
        servers = []

        # Create admin user
        admin = UserFactory.create_admin()
        users.append(admin)

        # Create servers with varying memory allocations
        memory_per_server = total_memory_mb // server_count
        for i in range(server_count):
            memory_mb = memory_per_server + (i * 100)  # Vary memory slightly
            server = ServerFactory.create(
                server_name=f"memory_test_server_{i}",
                owner_id=admin.id,
                memory_mb=memory_mb,
            )
            servers.append(server)

        return {
            "users": users,
            "servers": servers,
            "total_memory_mb": total_memory_mb,
        }

    @staticmethod
    def create_port_conflict_scenario(
        base_port: int = 25565,
        server_count: int = 3,
    ) -> Dict[str, Any]:
        """
        Create a test scenario for port conflict testing.

        Args:
            base_port: Base port number
            server_count: Number of servers to create

        Returns:
            Dictionary containing users and servers
        """
        users = []
        servers = []

        # Create admin user
        admin = UserFactory.create_admin()
        users.append(admin)

        # Create servers with sequential ports
        for i in range(server_count):
            port = base_port + i
            server = ServerFactory.create(
                server_name=f"port_test_server_{i}",
                owner_id=admin.id,
                port=port,
            )
            servers.append(server)

        return {"users": users, "servers": servers}


def generate_random_string(length: int = 8) -> str:
    """Generate a random string of specified length."""
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=length))


def generate_random_port() -> int:
    """Generate a random port number in the Minecraft range."""
    return random.randint(25565, 26565)


def generate_random_memory() -> int:
    """Generate a random memory allocation in MB."""
    return random.choice([512, 1024, 2048, 4096])
