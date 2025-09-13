import re
from datetime import datetime

from flask_login import UserMixin
from sqlalchemy import CheckConstraint

from .extensions import db


class User(db.Model, UserMixin):
    """User model to store the username and password."""

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    # Add constraints
    __table_args__ = (
        CheckConstraint("LENGTH(username) >= 3", name="check_username_length"),
        CheckConstraint("LENGTH(username) <= 80", name="check_username_max_length"),
        CheckConstraint("email IS NULL OR email LIKE '%@%'", name="check_email_format"),
    )

    def __repr__(self) -> str:
        return f"<User {self.username}>"

    @property
    def server_count(self) -> int:
        """Get the number of servers owned by this user."""
        return len(self.servers)

    @property
    def total_memory_allocated(self) -> int:
        """Get the total memory allocated by this user's servers."""
        return sum(server.memory_mb for server in self.servers)

    def validate_username(self) -> bool:
        """Validate username format and length."""
        if not self.username:
            return False
        if len(self.username) < 3 or len(self.username) > 80:
            return False
        # Username should contain only alphanumeric characters and underscores
        return bool(re.match(r"^[a-zA-Z0-9_]+$", self.username))

    def validate_email(self) -> bool:
        """Validate email format if provided."""
        if not self.email:
            return True  # Email is optional
        # Basic email validation
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        return bool(re.match(email_pattern, self.email))

    def validate(self) -> list:
        """Validate user data and return list of errors."""
        errors = []

        if not self.validate_username():
            errors.append(
                "Username must be 3-80 characters and contain only alphanumeric characters and underscores"
            )

        if not self.validate_email():
            errors.append("Invalid email format")

        return errors


class Server(db.Model):
    """Server model to store the status and configuration."""

    id = db.Column(db.Integer, primary_key=True)
    server_name = db.Column(db.String(150), nullable=False, unique=True)
    version = db.Column(db.String(50), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(10), nullable=False)  # 'Running' or 'Stopped'
    pid = db.Column(db.Integer)  # Process ID
    level_seed = db.Column(db.String(150))
    gamemode = db.Column(db.String(50))
    difficulty = db.Column(db.String(50))
    hardcore = db.Column(db.Boolean)
    pvp = db.Column(db.Boolean)
    spawn_monsters = db.Column(db.Boolean)
    motd = db.Column(db.String(150))
    memory_mb = db.Column(
        db.Integer, nullable=False, default=1024
    )  # Memory allocation in MB
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    owner = db.relationship("User", backref=db.backref("servers", lazy=True))

    # Add constraints
    __table_args__ = (
        CheckConstraint("LENGTH(server_name) >= 1", name="check_server_name_length"),
        CheckConstraint(
            "LENGTH(server_name) <= 150", name="check_server_name_max_length"
        ),
        CheckConstraint("port >= 1 AND port <= 65535", name="check_port_range"),
        CheckConstraint("status IN ('Running', 'Stopped')", name="check_status_values"),
        CheckConstraint(
            "memory_mb >= 512 AND memory_mb <= 32768", name="check_memory_range"
        ),
        CheckConstraint(
            "gamemode IS NULL OR gamemode IN ('survival', 'creative', 'adventure', 'spectator')",
            name="check_gamemode_values",
        ),
        CheckConstraint(
            "difficulty IS NULL OR difficulty IN ('peaceful', 'easy', 'normal', 'hard')",
            name="check_difficulty_values",
        ),
    )

    def validate_server_name(self) -> bool:
        """Validate server name format and length."""
        if not self.server_name:
            return False
        if len(self.server_name) < 1 or len(self.server_name) > 150:
            return False
        # Server name should contain only alphanumeric characters, hyphens, and underscores
        return bool(re.match(r"^[a-zA-Z0-9_-]+$", self.server_name))

    def validate_port(self) -> bool:
        """Validate port number range."""
        return self.port is not None and 1 <= self.port <= 65535

    def validate_memory(self) -> bool:
        """Validate memory allocation range."""
        return self.memory_mb is not None and 512 <= self.memory_mb <= 32768

    def validate_status(self) -> bool:
        """Validate status value."""
        return self.status in ["Running", "Stopped"]

    def validate_gamemode(self) -> bool:
        """Validate gamemode value if provided."""
        if not self.gamemode:
            return True  # Gamemode is optional
        return self.gamemode in ["survival", "creative", "adventure", "spectator"]

    def validate_difficulty(self) -> bool:
        """Validate difficulty value if provided."""
        if not self.difficulty:
            return True  # Difficulty is optional
        return self.difficulty in ["peaceful", "easy", "normal", "hard"]

    def validate(self) -> list:
        """Validate server data and return list of errors."""
        errors = []

        if not self.validate_server_name():
            errors.append(
                "Server name must be 1-150 characters and contain only alphanumeric characters, hyphens, and underscores"
            )

        if not self.validate_port():
            errors.append("Port must be between 1 and 65535")

        if not self.validate_memory():
            errors.append("Memory allocation must be between 512 and 32768 MB")

        if not self.validate_status():
            errors.append("Status must be 'Running' or 'Stopped'")

        if not self.validate_gamemode():
            errors.append(
                "Gamemode must be one of: survival, creative, adventure, spectator"
            )

        if not self.validate_difficulty():
            errors.append("Difficulty must be one of: peaceful, easy, normal, hard")

        return errors


class Configuration(db.Model):
    """Application configuration settings."""

    __tablename__ = "configuration"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    updated_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    # Add constraints
    __table_args__ = (
        CheckConstraint("LENGTH(key) >= 1", name="check_config_key_length"),
        CheckConstraint("LENGTH(key) <= 100", name="check_config_key_max_length"),
        CheckConstraint("LENGTH(value) >= 1", name="check_config_value_length"),
    )

    def __repr__(self) -> str:
        return f"<Configuration {self.key}={self.value}>"

    def validate_key(self) -> bool:
        """Validate configuration key format."""
        if not self.key:
            return False
        if len(self.key) < 1 or len(self.key) > 100:
            return False
        # Key should contain only alphanumeric characters, dots, hyphens, and underscores
        return bool(re.match(r"^[a-zA-Z0-9._-]+$", self.key))

    def validate_value(self) -> bool:
        """Validate configuration value."""
        return self.value is not None and len(self.value) >= 1

    def validate(self) -> list:
        """Validate configuration data and return list of errors."""
        errors = []

        if not self.validate_key():
            errors.append(
                "Configuration key must be 1-100 characters and contain only alphanumeric characters, dots, hyphens, and underscores"
            )

        if not self.validate_value():
            errors.append("Configuration value cannot be empty")

        return errors
