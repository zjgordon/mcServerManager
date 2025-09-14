"""
Utility test fixtures.

This module provides fixtures for common test utilities and helper functions.
"""
import os
import shutil
import tempfile
from contextlib import contextmanager
from typing import Generator

import pytest


@contextmanager
def managed_temp_directory(
    prefix: str = "test_", cleanup: bool = True
) -> Generator[str, None, None]:
    """Context manager for temporary directories with guaranteed cleanup."""
    temp_dir = tempfile.mkdtemp(prefix=prefix)
    try:
        yield temp_dir
    finally:
        if cleanup:
            shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def temp_server_dir():
    """Create a temporary directory for server files with proper cleanup."""
    with managed_temp_directory(prefix="server_") as temp_dir:
        yield temp_dir


@pytest.fixture
def temp_data_dir():
    """Create a temporary directory for test data files with proper cleanup."""
    with managed_temp_directory(prefix="data_") as temp_dir:
        yield temp_dir


@pytest.fixture
def temp_backup_dir():
    """Create a temporary directory for backup files with proper cleanup."""
    with managed_temp_directory(prefix="backup_") as temp_dir:
        yield temp_dir


@pytest.fixture
def temp_test_base_dir():
    """Create a base temporary directory for complex test scenarios."""
    with managed_temp_directory(prefix="test_base_") as temp_dir:
        # Create subdirectories for different test components
        os.makedirs(os.path.join(temp_dir, "servers"), exist_ok=True)
        os.makedirs(os.path.join(temp_dir, "backups"), exist_ok=True)
        os.makedirs(os.path.join(temp_dir, "logs"), exist_ok=True)
        os.makedirs(os.path.join(temp_dir, "data"), exist_ok=True)
        yield temp_dir


@pytest.fixture
def runner(app):
    """A test runner for the app's Click commands."""
    return app.test_cli_runner()


@pytest.fixture
def mock_file_system():
    """Mock file system operations for testing."""
    from unittest.mock import patch

    with tempfile.TemporaryDirectory() as temp_dir:
        with patch("os.path.exists") as mock_exists, patch(
            "os.path.getsize"
        ) as mock_getsize, patch("os.makedirs") as mock_makedirs:
            # Configure mocks
            mock_exists.return_value = True
            mock_getsize.return_value = 1024
            mock_makedirs.return_value = None

            yield {
                "temp_dir": temp_dir,
                "mock_exists": mock_exists,
                "mock_getsize": mock_getsize,
                "mock_makedirs": mock_makedirs,
            }


@pytest.fixture
def mock_network_requests():
    """Mock network requests for testing."""
    from unittest.mock import patch

    import requests

    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        # Configure default successful responses
        mock_response = requests.Response()
        mock_response.status_code = 200
        mock_response._content = b'{"versions": [{"id": "1.20.1"}]}'

        mock_get.return_value = mock_response
        mock_post.return_value = mock_response

        yield {
            "mock_get": mock_get,
            "mock_post": mock_post,
        }


@pytest.fixture
def mock_subprocess():
    """Mock subprocess operations for testing."""
    import subprocess
    from unittest.mock import patch

    with patch("subprocess.Popen") as mock_popen, patch("subprocess.run") as mock_run:
        # Configure default successful subprocess behavior
        mock_process = subprocess.Popen.__new__(subprocess.Popen)
        mock_process.returncode = 0
        mock_process.pid = 1234

        mock_popen.return_value = mock_process
        mock_run.return_value = subprocess.CompletedProcess(
            args=[], returncode=0, stdout=b"", stderr=b""
        )

        yield {
            "mock_popen": mock_popen,
            "mock_run": mock_run,
        }


@pytest.fixture
def feature_flags_fixture(app):
    """Create default experimental feature flags for testing."""
    from app.extensions import db
    from app.models import ExperimentalFeature

    with app.app_context():
        # Create the server_management_page feature flag if it doesn't exist
        feature = ExperimentalFeature.query.filter_by(feature_key="server_management_page").first()

        if not feature:
            feature = ExperimentalFeature(
                feature_key="server_management_page",
                feature_name="Server Management Page",
                description="Enable the enhanced server management page with console integration",
                enabled=True,  # Default to enabled for tests
                is_stable=False,
                updated_by=None,
            )
            db.session.add(feature)
            db.session.commit()

        yield feature
