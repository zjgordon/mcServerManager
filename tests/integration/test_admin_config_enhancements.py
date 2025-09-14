"""
Integration tests for admin configuration enhancements.

Tests the complete admin configuration flow including memory bar gauge data display,
experimental features toggling, admin authentication, CSRF protection, and error
handling scenarios.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from flask import url_for

from app.models import Configuration, ExperimentalFeature, User


@pytest.mark.integration
class TestAdminConfigEnhancements:
    """Integration tests for admin configuration enhancements."""

    def test_admin_config_page_access_authenticated_admin(self, app, client, admin_user):
        """Test that authenticated admin can access admin config page."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        response = client.get("/admin_config")

        assert response.status_code == 200
        assert b"Admin Configuration" in response.data
        assert b"System Memory" in response.data
        assert b"Experimental Features" in response.data

    def test_admin_config_page_access_authenticated_user(self, app, client, regular_user):
        """Test that regular user cannot access admin config page."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(regular_user.id)
            sess["_fresh"] = True

        response = client.get("/admin_config")

        # admin_required decorator redirects to server.home with flash message
        assert response.status_code == 302
        assert response.location == "/" or "/home" in response.location

    def test_admin_config_page_access_unauthenticated(self, app, client):
        """Test that unauthenticated user is redirected to login."""
        response = client.get("/admin_config")

        assert response.status_code == 302
        assert "/login" in response.location

    def test_admin_config_memory_bar_gauge_display(self, app, client, admin_user):
        """Test that memory bar gauge displays correct data."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Mock system memory data
        with patch("app.routes.auth_routes.get_system_memory_for_admin") as mock_memory:
            mock_memory.return_value = {
                "total_memory_gb": 8.0,
                "used_memory_gb": 2.5,
                "usage_percentage": 31.25,
            }

            response = client.get("/admin_config")

            assert response.status_code == 200
            assert b"2.5GB Used / 8.0GB Total" in response.data
            assert b"31.25%" in response.data
            assert b"width: 31.25%" in response.data

    def test_admin_config_experimental_features_display(self, app, client, admin_user):
        """Test that experimental features are displayed correctly."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Use existing experimental feature from test fixture
        with app.app_context():
            from app.extensions import db

            # Get the existing feature created by the test fixture
            feature = ExperimentalFeature.query.filter_by(
                feature_key="server_management_page"
            ).first()

            # Ensure it exists and update its properties for this test
            if feature:
                feature.feature_name = "Server Management Page"
                feature.description = "Comprehensive server management interface with advanced controls and monitoring"
                feature.enabled = False
                feature.is_stable = False
                db.session.commit()

        response = client.get("/admin_config")

        assert response.status_code == 200
        assert b"Server Management Page" in response.data
        assert b"Comprehensive server management interface" in response.data
        assert b"Experimental" in response.data

    def test_experimental_features_toggle_success(self, app, client, admin_user):
        """Test successful experimental feature toggle via API."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Create test experimental feature
        with app.app_context():
            feature = ExperimentalFeature(
                feature_key="test_feature",
                feature_name="Test Feature",
                description="Test experimental feature",
                enabled=False,
                is_stable=False,
            )
            from app.extensions import db

            db.session.add(feature)
            db.session.commit()

        # Toggle feature on
        response = client.post(
            "/admin_config/experimental",
            json={"feature_key": "test_feature", "enabled": True},
            content_type="application/json",
        )

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is True
        assert "enabled successfully" in data["message"]
        assert "features" in data

        # Verify feature is enabled in database
        with app.app_context():
            updated_feature = ExperimentalFeature.query.filter_by(
                feature_key="test_feature"
            ).first()
            assert updated_feature.enabled is True

    def test_experimental_features_toggle_validation_errors(self, app, client, admin_user):
        """Test experimental feature toggle validation errors."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Test missing feature_key
        response = client.post(
            "/admin_config/experimental", json={"enabled": True}, content_type="application/json"
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False
        assert "feature_key is required" in data["error"]

        # Test missing enabled field
        response = client.post(
            "/admin_config/experimental",
            json={"feature_key": "test_feature"},
            content_type="application/json",
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False
        assert "enabled field is required" in data["error"]

        # Test invalid enabled type
        response = client.post(
            "/admin_config/experimental",
            json={"feature_key": "test_feature", "enabled": "true"},
            content_type="application/json",
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False
        assert "enabled must be a boolean" in data["error"]

    def test_experimental_features_toggle_non_json_request(self, app, client, admin_user):
        """Test experimental feature toggle with non-JSON request."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/admin_config/experimental", data={"feature_key": "test_feature", "enabled": True}
        )

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data["success"] is False
        assert "Request must be JSON" in data["error"]

    def test_experimental_features_toggle_unauthorized_user(self, app, client, regular_user):
        """Test that regular user cannot toggle experimental features."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(regular_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/admin_config/experimental",
            json={"feature_key": "test_feature", "enabled": True},
            content_type="application/json",
        )

        # admin_required decorator redirects to server.home with flash message
        assert response.status_code == 302
        assert response.location == "/" or "/home" in response.location

    def test_experimental_features_toggle_unauthenticated(self, app, client):
        """Test that unauthenticated user cannot toggle experimental features."""
        response = client.post(
            "/admin_config/experimental",
            json={"feature_key": "test_feature", "enabled": True},
            content_type="application/json",
        )

        assert response.status_code == 302
        assert "/login" in response.location

    def test_admin_config_csrf_protection(self, app, client, admin_user):
        """Test CSRF protection on admin config form submission."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Test POST without CSRF token
        response = client.post(
            "/admin_config",
            data={
                "app_title": "Test Title",
                "server_hostname": "test.example.com",
                "max_total_mb": 4096,
                "max_per_server_mb": 1024,
            },
        )

        # CSRF validation failure redirects back to form
        assert response.status_code == 302
        assert "/admin_config" in response.location

    def test_admin_config_form_validation_errors(self, app, client, admin_user):
        """Test admin config form validation error handling."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Get CSRF token first
        response = client.get("/admin_config")
        csrf_token = response.data.decode().split('name="csrf_token" value="')[1].split('"')[0]

        # Test empty app title
        response = client.post(
            "/admin_config",
            data={
                "csrf_token": csrf_token,
                "app_title": "",
                "server_hostname": "test.example.com",
                "max_total_mb": 4096,
                "max_per_server_mb": 1024,
            },
        )

        assert response.status_code == 302
        assert "/admin_config" in response.location

        # Test invalid memory values
        response = client.post(
            "/admin_config",
            data={
                "csrf_token": csrf_token,
                "app_title": "Test Title",
                "server_hostname": "test.example.com",
                "max_total_mb": "invalid",
                "max_per_server_mb": 1024,
            },
        )

        assert response.status_code == 302
        assert "/admin_config" in response.location

    def test_admin_config_successful_update(self, app, client, admin_user):
        """Test successful admin configuration update."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Get CSRF token first
        response = client.get("/admin_config")
        csrf_token = response.data.decode().split('name="csrf_token" value="')[1].split('"')[0]

        # Update configuration
        response = client.post(
            "/admin_config",
            data={
                "csrf_token": csrf_token,
                "app_title": "Updated Title",
                "server_hostname": "updated.example.com",
                "max_total_mb": 8192,
                "max_per_server_mb": 2048,
            },
        )

        assert response.status_code == 302
        assert "/admin_config" in response.location

        # Verify configuration was updated
        with app.app_context():
            from app.utils import get_app_config

            config = get_app_config()
            assert config["app_title"] == "Updated Title"
            assert config["server_hostname"] == "updated.example.com"
            assert config["max_total_mb"] == 8192
            assert config["max_server_mb"] == 2048

    def test_experimental_features_toggle_nonexistent_feature(self, app, client, admin_user):
        """Test toggling non-existent experimental feature."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        response = client.post(
            "/admin_config/experimental",
            json={"feature_key": "nonexistent_feature", "enabled": True},
            content_type="application/json",
        )

        # The route should handle this gracefully and return 200 with error message
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data["success"] is False
        assert "not found" in data["error"].lower()

    def test_admin_config_memory_validation_edge_cases(self, app, client, admin_user):
        """Test memory validation edge cases."""
        with client.session_transaction() as sess:
            sess["_user_id"] = str(admin_user.id)
            sess["_fresh"] = True

        # Get CSRF token first
        response = client.get("/admin_config")
        csrf_token = response.data.decode().split('name="csrf_token" value="')[1].split('"')[0]

        # Test max_per_server_mb > max_total_mb
        response = client.post(
            "/admin_config",
            data={
                "csrf_token": csrf_token,
                "app_title": "Test Title",
                "server_hostname": "test.example.com",
                "max_total_mb": 1024,
                "max_per_server_mb": 2048,
            },
        )

        assert response.status_code == 302
        assert "/admin_config" in response.location

        # Test max_total_mb < 1024
        response = client.post(
            "/admin_config",
            data={
                "csrf_token": csrf_token,
                "app_title": "Test Title",
                "server_hostname": "test.example.com",
                "max_total_mb": 512,
                "max_per_server_mb": 1024,
            },
        )

        assert response.status_code == 302
        assert "/admin_config" in response.location

        # Test max_per_server_mb < 512
        response = client.post(
            "/admin_config",
            data={
                "csrf_token": csrf_token,
                "app_title": "Test Title",
                "server_hostname": "test.example.com",
                "max_total_mb": 2048,
                "max_per_server_mb": 256,
            },
        )

        assert response.status_code == 302
        assert "/admin_config" in response.location
