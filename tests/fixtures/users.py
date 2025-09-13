"""
User-related test fixtures.

This module provides fixtures for creating and managing user test data.
"""
import pytest

from app.models import User
from tests.factories import UserFactory


@pytest.fixture
def admin_user(app):
    """Get or create an admin user for testing."""
    with app.app_context():
        from app.extensions import db

        # Check if admin user already exists (created by app fixture)
        user = User.query.filter_by(username="admin").first()
        if not user:
            # Create a fresh admin user if none exists
            user = UserFactory.create_admin(
                username="admin", password="adminpass"  # pragma: allowlist secret
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
        from app.extensions import db

        # Always create a fresh regular user for each test
        user = UserFactory.create_regular(username="testuser")
        db.session.add(user)
        db.session.commit()
        # Refresh the user to ensure it's properly attached to the session
        db.session.refresh(user)
        return user


@pytest.fixture
def inactive_user(app):
    """Create an inactive user for testing."""
    with app.app_context():
        from app.extensions import db

        user = UserFactory.create_inactive(username="inactiveuser")
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user


@pytest.fixture
def multiple_users(app):
    """Create multiple users for testing."""
    with app.app_context():
        from app.extensions import db

        users = []
        # Create 3 regular users
        for i in range(3):
            user = UserFactory.create_regular(username=f"user_{i}")
            db.session.add(user)
            users.append(user)

        # Create 1 admin user
        admin = UserFactory.create_admin(username="multi_admin")
        db.session.add(admin)
        users.append(admin)

        db.session.commit()

        # Refresh all users
        for user in users:
            db.session.refresh(user)

        return users


@pytest.fixture
def user_with_custom_attributes(app):
    """Create a user with custom attributes for testing."""
    with app.app_context():
        from app.extensions import db

        user = UserFactory.create(
            username="customuser",
            password="custompass",  # pragma: allowlist secret
            is_admin=False,
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user
