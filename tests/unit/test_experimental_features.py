"""
Tests for experimental feature utility functions.
"""
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from flask_login import current_user

from app.extensions import db
from app.models import ExperimentalFeature, User
from app.utils import (
    add_experimental_feature,
    get_experimental_features,
    is_feature_enabled,
    toggle_experimental_feature,
)


@pytest.mark.unit
@pytest.mark.experimental_features
class TestExperimentalFeatures:
    """Test experimental feature utility functions."""

    def test_get_experimental_features_success(self, app, client):
        """Test getting all experimental features successfully."""
        with app.app_context():
            # Create test features
            feature1 = ExperimentalFeature(
                feature_key="test_feature_1",
                feature_name="Test Feature 1",
                description="Test description 1",
                enabled=True,
                is_stable=False,
            )
            feature2 = ExperimentalFeature(
                feature_key="test_feature_2",
                feature_name="Test Feature 2",
                description="Test description 2",
                enabled=False,
                is_stable=True,
            )

            db.session.add(feature1)
            db.session.add(feature2)
            db.session.commit()

            # Test the function
            features = get_experimental_features()

            # Verify results
            assert len(features) == 2
            assert any(f["feature_key"] == "test_feature_1" for f in features)
            assert any(f["feature_key"] == "test_feature_2" for f in features)

            # Verify structure
            feature1_data = next(f for f in features if f["feature_key"] == "test_feature_1")
            assert feature1_data["feature_name"] == "Test Feature 1"
            assert feature1_data["description"] == "Test description 1"
            assert feature1_data["enabled"] is True
            assert feature1_data["is_stable"] is False
            assert "created_at" in feature1_data
            assert "updated_at" in feature1_data

    def test_get_experimental_features_empty(self, app, client):
        """Test getting experimental features when none exist."""
        with app.app_context():
            features = get_experimental_features()
            assert features == []

    def test_get_experimental_features_database_error(self, app, client):
        """Test getting experimental features with database error."""
        with app.app_context():
            with patch("app.models.ExperimentalFeature.query") as mock_query:
                mock_query.all.side_effect = Exception("Database error")

                features = get_experimental_features()
                assert features == []

    def test_toggle_experimental_feature_success(self, app, client):
        """Test toggling experimental feature successfully."""
        with app.app_context():
            # Create test feature
            feature = ExperimentalFeature(
                feature_key="test_toggle",
                feature_name="Test Toggle",
                description="Test toggle feature",
                enabled=False,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            # Test enabling feature
            result = toggle_experimental_feature("test_toggle", True)
            assert result is True

            # Verify feature was enabled
            updated_feature = ExperimentalFeature.query.filter_by(feature_key="test_toggle").first()
            assert updated_feature.enabled is True

            # Test disabling feature
            result = toggle_experimental_feature("test_toggle", False)
            assert result is True

            # Verify feature was disabled
            updated_feature = ExperimentalFeature.query.filter_by(feature_key="test_toggle").first()
            assert updated_feature.enabled is False

    def test_toggle_experimental_feature_not_found(self, app, client):
        """Test toggling non-existent experimental feature."""
        with app.app_context():
            result = toggle_experimental_feature("nonexistent_feature", True)
            assert result is False

    def test_toggle_experimental_feature_with_user(self, app, client):
        """Test toggling experimental feature with authenticated user."""
        with app.app_context():
            # Create test user
            user = User(username="testuser", password_hash="hash")
            db.session.add(user)
            db.session.commit()

            # Create test feature
            feature = ExperimentalFeature(
                feature_key="test_user_toggle",
                feature_name="Test User Toggle",
                description="Test toggle with user",
                enabled=False,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            # Mock current_user
            with patch("app.utils.current_user") as mock_user:
                mock_user.is_authenticated = True
                mock_user.id = user.id

                result = toggle_experimental_feature("test_user_toggle", True)
                assert result is True

                # Verify updated_by was set
                updated_feature = ExperimentalFeature.query.filter_by(
                    feature_key="test_user_toggle"
                ).first()
                assert updated_feature.updated_by == user.id

    def test_toggle_experimental_feature_database_error(self, app, client):
        """Test toggling experimental feature with database error."""
        with app.app_context():
            # Create test feature
            feature = ExperimentalFeature(
                feature_key="test_error",
                feature_name="Test Error",
                description="Test error feature",
                enabled=False,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            with patch("app.utils.db.session.commit") as mock_commit:
                mock_commit.side_effect = Exception("Database error")

                result = toggle_experimental_feature("test_error", True)
                assert result is False

    def test_is_feature_enabled_true(self, app, client):
        """Test checking enabled feature."""
        with app.app_context():
            # Create enabled feature
            feature = ExperimentalFeature(
                feature_key="enabled_feature",
                feature_name="Enabled Feature",
                description="Test enabled feature",
                enabled=True,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            result = is_feature_enabled("enabled_feature")
            assert result is True

    def test_is_feature_enabled_false(self, app, client):
        """Test checking disabled feature."""
        with app.app_context():
            # Create disabled feature
            feature = ExperimentalFeature(
                feature_key="disabled_feature",
                feature_name="Disabled Feature",
                description="Test disabled feature",
                enabled=False,
                is_stable=False,
            )
            db.session.add(feature)
            db.session.commit()

            result = is_feature_enabled("disabled_feature")
            assert result is False

    def test_is_feature_enabled_not_found(self, app, client):
        """Test checking non-existent feature."""
        with app.app_context():
            result = is_feature_enabled("nonexistent_feature")
            assert result is False

    def test_is_feature_enabled_database_error(self, app, client):
        """Test checking feature with database error."""
        with app.app_context():
            with patch("app.models.ExperimentalFeature.query") as mock_query:
                mock_query.filter_by.return_value.first.side_effect = Exception("Database error")

                result = is_feature_enabled("any_feature")
                assert result is False

    def test_add_experimental_feature_success(self, app, client):
        """Test adding new experimental feature successfully."""
        with app.app_context():
            result = add_experimental_feature(
                feature_key="new_feature",
                feature_name="New Feature",
                description="Test new feature",
                enabled=True,
                is_stable=False,
            )
            assert result is True

            # Verify feature was created
            feature = ExperimentalFeature.query.filter_by(feature_key="new_feature").first()
            assert feature is not None
            assert feature.feature_name == "New Feature"
            assert feature.description == "Test new feature"
            assert feature.enabled is True
            assert feature.is_stable is False

    def test_add_experimental_feature_with_user(self, app, client):
        """Test adding experimental feature with authenticated user."""
        with app.app_context():
            # Create test user
            user = User(username="testuser2", password_hash="hash")
            db.session.add(user)
            db.session.commit()

            # Mock current_user
            with patch("app.utils.current_user") as mock_user:
                mock_user.is_authenticated = True
                mock_user.id = user.id

                result = add_experimental_feature(
                    feature_key="user_feature",
                    feature_name="User Feature",
                    description="Test user feature",
                )
                assert result is True

                # Verify updated_by was set
                feature = ExperimentalFeature.query.filter_by(feature_key="user_feature").first()
                assert feature.updated_by == user.id

    def test_add_experimental_feature_already_exists(self, app, client):
        """Test adding experimental feature that already exists."""
        with app.app_context():
            # Create existing feature
            existing_feature = ExperimentalFeature(
                feature_key="existing_feature",
                feature_name="Existing Feature",
                description="Test existing feature",
                enabled=False,
                is_stable=False,
            )
            db.session.add(existing_feature)
            db.session.commit()

            result = add_experimental_feature(
                feature_key="existing_feature",
                feature_name="New Name",
                description="New description",
            )
            assert result is False

    def test_add_experimental_feature_database_error(self, app, client):
        """Test adding experimental feature with database error."""
        with app.app_context():
            with patch("app.utils.db.session.commit") as mock_commit:
                mock_commit.side_effect = Exception("Database error")

                result = add_experimental_feature(
                    feature_key="error_feature",
                    feature_name="Error Feature",
                    description="Test error feature",
                )
                assert result is False

    def test_add_experimental_feature_default_values(self, app, client):
        """Test adding experimental feature with default values."""
        with app.app_context():
            result = add_experimental_feature(
                feature_key="default_feature",
                feature_name="Default Feature",
                description="Test default feature",
            )
            assert result is True

            # Verify default values
            feature = ExperimentalFeature.query.filter_by(feature_key="default_feature").first()
            assert feature.enabled is False
            assert feature.is_stable is False

    def test_experimental_feature_edge_cases(self, app, client):
        """Test edge cases for experimental features."""
        with app.app_context():
            # Test with empty feature_key
            result = add_experimental_feature(
                feature_key="",
                feature_name="Empty Key",
                description="Test empty key",
            )
            # This should fail due to database constraints
            assert result is False

            # Test with very long feature_key
            long_key = "a" * 101  # Exceeds 100 character limit
            result = add_experimental_feature(
                feature_key=long_key,
                feature_name="Long Key",
                description="Test long key",
            )
            # This should fail due to database constraints
            assert result is False

    def test_experimental_feature_user_context_errors(self, app, client):
        """Test experimental features with user context errors."""
        with app.app_context():
            # Test with unauthenticated user (simulates AttributeError/RuntimeError)
            with patch("app.utils.current_user") as mock_user:
                mock_user.is_authenticated = False

                result = add_experimental_feature(
                    feature_key="unauthenticated_feature",
                    feature_name="Unauthenticated Feature",
                    description="Test unauthenticated user",
                )
                # Should still succeed but with user_id=None
                assert result is True

            # Test with unauthenticated user for toggle
            with patch("app.utils.current_user") as mock_user:
                mock_user.is_authenticated = False

                result = toggle_experimental_feature("any_feature", True)
                # Should handle gracefully
                assert result is False  # Feature doesn't exist, but no crash
