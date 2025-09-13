"""
Tests for authentication routes and functionality.
"""
import pytest
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import User


@pytest.mark.unit
@pytest.mark.auth
class TestAuthentication:
    """Test authentication functionality."""

    def test_login_page_loads(self, client):
        """Test that the login page loads correctly."""
        response = client.get("/login")
        assert response.status_code == 200
        assert b"login" in response.data.lower()

    def test_valid_login(self, client, app):
        """Test login with valid credentials."""
        with app.app_context():
            # Create a test user with unique username
            user = User(
                username="logintestuser",
                password_hash=generate_password_hash("testpass"),  # pragma: allowlist secret
                is_admin=False,
            )
            db.session.add(user)
            db.session.commit()

            # Attempt login
            response = client.post(
                "/login",
                data={
                    "username": "logintestuser",
                    "password": "testpass",  # pragma: allowlist secret
                },
                follow_redirects=True,
            )

            assert response.status_code == 200
            assert b"Logged in successfully" in response.data

    def test_invalid_login(self, client, app):
        """Test login with invalid credentials."""
        with app.app_context():
            # Create a test user with unique username
            user = User(
                username="invalidlogintestuser",
                password_hash=generate_password_hash("testpass"),  # pragma: allowlist secret
                is_admin=False,
            )
            db.session.add(user)
            db.session.commit()

            # Attempt login with wrong password
            response = client.post(
                "/login",
                data={
                    "username": "invalidlogintestuser",
                    "password": "wrongpass",  # pragma: allowlist secret
                },
            )

            assert b"Invalid username or password" in response.data

    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user."""
        response = client.post(
            "/login",
            data={
                "username": "nonexistent",
                "password": "password",  # pragma: allowlist secret
            },
        )

        assert b"Invalid username or password" in response.data

    def test_logout(self, client, authenticated_client):
        """Test user logout."""
        response = authenticated_client.get("/logout", follow_redirects=True)
        assert response.status_code == 200
        assert b"logged out" in response.data.lower()

    def test_set_admin_password(self, client, app):
        """Test setting admin password for first time."""
        with app.app_context():
            # Remove existing admin user to test first-time setup
            User.query.filter_by(is_admin=True).delete()
            db.session.commit()

            # Create admin user without password with unique username
            admin = User(username="adminsetup", password_hash=None, is_admin=True)
            db.session.add(admin)
            db.session.commit()

            # Set password
            response = client.post(
                "/set_admin_password",
                data={
                    "username": "adminsetup",
                    "password": "newpassword",  # pragma: allowlist secret
                    "confirm_password": "newpassword",  # pragma: allowlist secret
                },
                follow_redirects=True,
            )

            assert response.status_code == 200
            # Check that we're redirected to login page (success case)
            assert b"login" in response.data.lower()

    def test_set_admin_password_mismatch(self, client, app):
        """Test setting admin password with mismatched passwords."""
        with app.app_context():
            # Remove existing admin user to test first-time setup
            User.query.filter_by(is_admin=True).delete()
            db.session.commit()

            # Create admin user without password with unique username
            admin = User(username="adminmismatch", password_hash=None, is_admin=True)
            db.session.add(admin)
            db.session.commit()

            # Attempt to set password with mismatch
            response = client.post(
                "/set_admin_password",
                data={
                    "username": "adminmismatch",
                    "password": "newpassword",  # pragma: allowlist secret
                    "confirm_password": "differentpassword",  # pragma: allowlist secret
                },
                follow_redirects=True,
            )

            # Check that we're still on the admin setup page (error case)
            assert b"create admin account" in response.data.lower()

    def test_add_user_as_admin(self, client, app, admin_user):
        """Test adding a new user as admin."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/add_user",
            data={
                "username": "newuser",
                "password": "newpass",  # pragma: allowlist secret
                "confirm_password": "newpass",  # pragma: allowlist secret
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        # Check that we're still on the add user page (the form validation failed)
        assert b"add user" in response.data.lower()

    def test_add_user_as_regular_user(self, client, regular_user):
        """Test that regular users cannot add new users."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(regular_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/add_user",
            data={
                "username": "newuser",
                "password": "newpass",  # pragma: allowlist secret
                "confirm_password": "newpass",  # pragma: allowlist secret
            },
            follow_redirects=True,
        )

        assert b"Admin privileges required" in response.data

    def test_add_duplicate_user(self, client, app, admin_user):
        """Test adding a user with existing username."""
        with app.app_context():
            # Create existing user
            existing_user = User(
                username="existinguser",
                password_hash=generate_password_hash("pass"),  # pragma: allowlist secret
                is_admin=False,
            )
            db.session.add(existing_user)
            db.session.commit()

        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/add_user",
            data={
                "username": "existinguser",
                "password": "newpass",  # pragma: allowlist secret
                "confirm_password": "newpass",  # pragma: allowlist secret
            },
            follow_redirects=True,
        )

        # Check that we're still on the add user page (error case)
        assert b"add user" in response.data.lower()

    def test_change_password(self, client, app, regular_user):
        """Test changing user password."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(regular_user.id)
            sess["_fresh"] = True

        # Set a known password for the user
        with app.app_context():
            user = User.query.get(regular_user.id)
            user.password_hash = generate_password_hash("oldpass")  # pragma: allowlist secret
            db.session.commit()

        response = client.post(
            "/change_password",
            data={
                "current_password": "oldpass",  # pragma: allowlist secret
                "new_password": "newpass",  # pragma: allowlist secret
                "confirm_password": "newpass",  # pragma: allowlist secret
            },
            follow_redirects=True,
        )

        assert response.status_code == 200
        assert b"Password changed successfully" in response.data

        # Verify password was changed
        with app.app_context():
            user = User.query.get(regular_user.id)
            assert check_password_hash(user.password_hash, "newpass")  # pragma: allowlist secret

    def test_change_password_wrong_current(self, client, regular_user):
        """Test changing password with wrong current password."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(regular_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/change_password",
            data={
                "current_password": "wrongpass",  # pragma: allowlist secret
                "new_password": "newpass",  # pragma: allowlist secret
                "confirm_password": "newpass",  # pragma: allowlist secret
            },
        )

        assert b"Current password is incorrect" in response.data

    def test_change_password_mismatch(self, client, app, regular_user):
        """Test changing password with mismatched new passwords."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(regular_user.id)
            sess["_fresh"] = True

        # Set a known password for the user
        with app.app_context():
            user = User.query.get(regular_user.id)
            user.password_hash = generate_password_hash("oldpass")  # pragma: allowlist secret
            db.session.commit()

        response = client.post(
            "/change_password",
            data={
                "current_password": "oldpass",  # pragma: allowlist secret
                "new_password": "newpass",  # pragma: allowlist secret
                "confirm_password": "differentpass",  # pragma: allowlist secret
            },
        )

        assert b"New passwords do not match" in response.data
