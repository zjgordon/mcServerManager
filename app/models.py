from datetime import datetime

from flask_login import UserMixin
from sqlalchemy import CheckConstraint, Index

from .extensions import db


class User(db.Model, UserMixin):
    """User model to store the username and password."""

    __tablename__ = "user"
    __table_args__ = (
        CheckConstraint("length(username) >= 3", name="check_username_length"),
        CheckConstraint("length(username) <= 80", name="check_username_max_length"),
        CheckConstraint(
            "email IS NULL OR length(email) >= 5", name="check_email_length"
        ),
        Index("idx_user_username", "username"),
        Index("idx_user_email", "email"),
        Index("idx_user_is_admin", "is_admin"),
        Index("idx_user_is_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(
        db.DateTime, default=db.func.current_timestamp(), nullable=False
    )
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

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


class Server(db.Model):
    """Server model to store the status and configuration."""

    __tablename__ = "server"
    __table_args__ = (
        CheckConstraint("length(server_name) >= 3", name="check_server_name_length"),
        CheckConstraint(
            "length(server_name) <= 150", name="check_server_name_max_length"
        ),
        CheckConstraint("port >= 1024 AND port <= 65535", name="check_port_range"),
        CheckConstraint(
            "status IN ('Running', 'Stopped', 'Starting', 'Stopping')",
            name="check_status_values",
        ),
        CheckConstraint("pid IS NULL OR pid > 0", name="check_pid_positive"),
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
        CheckConstraint("length(motd) <= 150", name="check_motd_length"),
        Index("idx_server_name", "server_name"),
        Index("idx_server_port", "port"),
        Index("idx_server_status", "status"),
        Index("idx_server_owner", "owner_id"),
        Index("idx_server_memory", "memory_mb"),
    )

    id = db.Column(db.Integer, primary_key=True)
    server_name = db.Column(db.String(150), nullable=False, unique=True)
    version = db.Column(db.String(50), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    status = db.Column(
        db.String(10), nullable=False
    )  # 'Running', 'Stopped', 'Starting', 'Stopping'
    pid = db.Column(db.Integer, nullable=True)  # Process ID
    level_seed = db.Column(db.String(150), nullable=True)
    gamemode = db.Column(db.String(50), nullable=True)
    difficulty = db.Column(db.String(50), nullable=True)
    hardcore = db.Column(db.Boolean, nullable=True)
    pvp = db.Column(db.Boolean, nullable=True)
    spawn_monsters = db.Column(db.Boolean, nullable=True)
    motd = db.Column(db.String(150), nullable=True)
    memory_mb = db.Column(
        db.Integer, nullable=False, default=1024
    )  # Memory allocation in MB
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    owner = db.relationship("User", backref=db.backref("servers", lazy=True))


class Configuration(db.Model):
    """Application configuration settings."""

    __tablename__ = "configuration"
    __table_args__ = (
        CheckConstraint("length(key) >= 1", name="check_config_key_length"),
        CheckConstraint("length(key) <= 100", name="check_config_key_max_length"),
        CheckConstraint("length(value) >= 1", name="check_config_value_length"),
        Index("idx_config_key", "key"),
        Index("idx_config_updated_at", "updated_at"),
        Index("idx_config_updated_by", "updated_by"),
    )

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    updated_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<Configuration {self.key}={self.value}>"
