"""
Mock fixtures for external dependencies.

This module provides comprehensive mock objects for testing external dependencies
like network requests, file system operations, and subprocess calls.
"""
import json
import subprocess
import tempfile
from typing import Any, Dict, Optional
from unittest.mock import MagicMock, patch

import pytest
import requests


@pytest.fixture
def mock_requests_success():
    """Mock successful HTTP requests."""
    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        # Default successful response
        mock_response = MagicMock(spec=requests.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mock_response.content = b'{"success": true}'
        mock_response.text = '{"success": true}'
        mock_response.raise_for_status.return_value = None

        mock_get.return_value = mock_response
        mock_post.return_value = mock_response

        yield {
            "mock_get": mock_get,
            "mock_post": mock_post,
            "mock_response": mock_response,
        }


@pytest.fixture
def mock_requests_failure():
    """Mock failed HTTP requests."""
    with patch("requests.get") as mock_get, patch("requests.post") as mock_post:
        # Failed response
        mock_response = MagicMock(spec=requests.Response)
        mock_response.status_code = 404
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("404 Not Found")

        mock_get.return_value = mock_response
        mock_post.return_value = mock_response

        yield {
            "mock_get": mock_get,
            "mock_post": mock_post,
            "mock_response": mock_response,
        }


@pytest.fixture
def mock_minecraft_version_api():
    """Mock Minecraft version API responses."""
    with patch("requests.get") as mock_get:
        # Mock version manifest
        manifest_response = MagicMock(spec=requests.Response)
        manifest_response.status_code = 200
        manifest_response.json.return_value = {
            "latest": {"release": "1.20.1", "snapshot": "23w45a"},
            "versions": [
                {
                    "id": "1.20.1",
                    "type": "release",
                    "url": "https://launchermeta.mojang.com/mc/game/version_manifest.json",
                },
                {
                    "id": "1.20",
                    "type": "release",
                    "url": "https://launchermeta.mojang.com/mc/game/version_manifest.json",
                },
                {
                    "id": "23w45a",
                    "type": "snapshot",
                    "url": "https://launchermeta.mojang.com/mc/game/version_manifest.json",
                },
            ],
        }

        # Mock version metadata
        version_response = MagicMock(spec=requests.Response)
        version_response.status_code = 200
        version_response.json.return_value = {
            "id": "1.20.1",
            "type": "release",
            "downloads": {
                "server": {
                    "sha1": "a1d5e5d892192dced969bdceb634a158f9876565",
                    "size": 45463194,
                    "url": "https://launcher.mojang.com/v1/objects/a1d5e5d892192dced969bdceb634a158f9876565/server.jar",
                }
            },
        }

        def mock_get_side_effect(url, **kwargs):
            if "version_manifest" in url:
                return manifest_response
            else:
                return version_response

        mock_get.side_effect = mock_get_side_effect

        yield {
            "mock_get": mock_get,
            "manifest_response": manifest_response,
            "version_response": version_response,
        }


@pytest.fixture
def mock_subprocess_success():
    """Mock successful subprocess operations."""
    with patch("subprocess.Popen") as mock_popen, patch("subprocess.run") as mock_run:
        # Mock successful process
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.pid = 12345
        mock_process.poll.return_value = 0
        mock_process.terminate.return_value = None
        mock_process.kill.return_value = None

        # Mock successful run result
        mock_run_result = subprocess.CompletedProcess(
            args=["java", "-jar", "server.jar"],
            returncode=0,
            stdout=b"Server started successfully\n",
            stderr=b"",
        )

        mock_popen.return_value = mock_process
        mock_run.return_value = mock_run_result

        yield {
            "mock_popen": mock_popen,
            "mock_run": mock_run,
            "mock_process": mock_process,
            "mock_run_result": mock_run_result,
        }


@pytest.fixture
def mock_subprocess_failure():
    """Mock failed subprocess operations."""
    with patch("subprocess.Popen") as mock_popen, patch("subprocess.run") as mock_run:
        # Mock failed process
        mock_process = MagicMock()
        mock_process.returncode = 1
        mock_process.pid = 12345
        mock_process.poll.return_value = 1

        # Mock failed run result
        mock_run_result = subprocess.CompletedProcess(
            args=["java", "-jar", "server.jar"],
            returncode=1,
            stdout=b"",
            stderr=b"Error: Could not find or load main class",
        )

        mock_popen.return_value = mock_process
        mock_run.return_value = mock_run_result

        yield {
            "mock_popen": mock_popen,
            "mock_run": mock_run,
            "mock_process": mock_process,
            "mock_run_result": mock_run_result,
        }


@pytest.fixture
def mock_file_operations():
    """Mock file system operations."""
    with patch("os.path.exists") as mock_exists, patch("os.path.getsize") as mock_getsize, patch(
        "os.makedirs"
    ) as mock_makedirs, patch("os.remove") as mock_remove, patch(
        "shutil.copy2"
    ) as mock_copy, patch(
        "shutil.rmtree"
    ) as mock_rmtree:
        # Configure default behaviors
        mock_exists.return_value = True
        mock_getsize.return_value = 1024
        mock_makedirs.return_value = None
        mock_remove.return_value = None
        mock_copy.return_value = None
        mock_rmtree.return_value = None

        yield {
            "mock_exists": mock_exists,
            "mock_getsize": mock_getsize,
            "mock_makedirs": mock_makedirs,
            "mock_remove": mock_remove,
            "mock_copy": mock_copy,
            "mock_rmtree": mock_rmtree,
        }


@pytest.fixture
def mock_socket_operations():
    """Mock socket operations for port testing."""
    with patch("socket.socket") as mock_socket:
        mock_sock = MagicMock()
        mock_sock.connect_ex.return_value = 0  # Port in use by default
        mock_sock.__enter__.return_value = mock_sock
        mock_sock.__exit__.return_value = None
        mock_socket.return_value = mock_sock

        yield {
            "mock_socket": mock_socket,
            "mock_sock": mock_sock,
        }


@pytest.fixture
def mock_time_operations():
    """Mock time operations for consistent testing."""
    with patch("time.time") as mock_time, patch("time.sleep") as mock_sleep:
        mock_time.return_value = 1640995200.0  # Fixed timestamp
        mock_sleep.return_value = None

        yield {
            "mock_time": mock_time,
            "mock_sleep": mock_sleep,
        }


@pytest.fixture
def mock_logging():
    """Mock logging operations."""
    with patch("logging.getLogger") as mock_get_logger:
        mock_logger = MagicMock()
        mock_logger.info.return_value = None
        mock_logger.warning.return_value = None
        mock_logger.error.return_value = None
        mock_logger.debug.return_value = None
        mock_get_logger.return_value = mock_logger

        yield {
            "mock_get_logger": mock_get_logger,
            "mock_logger": mock_logger,
        }


@pytest.fixture
def mock_backup_operations():
    """Mock backup-related operations."""
    with patch("tarfile.open") as mock_tarfile_open, patch("gzip.open") as mock_gzip_open:
        # Mock tarfile
        mock_tar = MagicMock()
        mock_tar.__enter__.return_value = mock_tar
        mock_tar.__exit__.return_value = None
        mock_tar.add.return_value = None
        mock_tar.extractall.return_value = None
        mock_tar.getnames.return_value = ["server.jar", "eula.txt", "server.properties"]

        # Mock gzip
        mock_gzip = MagicMock()
        mock_gzip.__enter__.return_value = mock_gzip
        mock_gzip.__exit__.return_value = None
        mock_gzip.read.return_value = b"compressed data"
        mock_gzip.write.return_value = None

        mock_tarfile_open.return_value = mock_tar
        mock_gzip_open.return_value = mock_gzip

        yield {
            "mock_tarfile_open": mock_tarfile_open,
            "mock_gzip_open": mock_gzip_open,
            "mock_tar": mock_tar,
            "mock_gzip": mock_gzip,
        }


@pytest.fixture
def mock_config_operations():
    """Mock configuration file operations."""
    with patch("builtins.open") as mock_open, patch("json.load") as mock_json_load, patch(
        "json.dump"
    ) as mock_json_dump:
        # Mock file handle
        mock_file = MagicMock()
        mock_file.__enter__.return_value = mock_file
        mock_file.__exit__.return_value = None
        mock_file.read.return_value = '{"test": "config"}'
        mock_file.write.return_value = None

        # Mock JSON operations
        mock_json_load.return_value = {"test": "config"}
        mock_json_dump.return_value = None

        mock_open.return_value = mock_file

        yield {
            "mock_open": mock_open,
            "mock_json_load": mock_json_load,
            "mock_json_dump": mock_json_dump,
            "mock_file": mock_file,
        }


@pytest.fixture
def mock_psutil_process():
    """Mock psutil.Process for process verification testing."""
    with patch("psutil.Process") as mock_process_class:
        # Create a comprehensive mock process
        mock_process = MagicMock()

        # Basic process attributes
        mock_process.pid = 12345
        mock_process.is_running.return_value = True

        # Process information methods that return proper data types
        mock_process.name.return_value = "java"
        mock_process.cmdline.return_value = ["java", "-jar", "server.jar", "nogui"]
        mock_process.cwd.return_value = "/path/to/server"
        mock_process.create_time.return_value = 1640995200.0

        # Memory and CPU info
        mock_memory_info = MagicMock()
        mock_memory_info.rss = 1024 * 1024 * 100  # 100MB
        mock_memory_info.vms = 1024 * 1024 * 200  # 200MB
        mock_process.memory_info.return_value = mock_memory_info
        mock_process.cpu_percent.return_value = 5.0

        # Process control methods
        mock_process.stdin = MagicMock()
        mock_process.stdin.write.return_value = None
        mock_process.stdin.flush.return_value = None
        mock_process.terminate.return_value = None
        mock_process.kill.return_value = None
        mock_process.wait.return_value = 0

        # Configure the class to return our mock
        mock_process_class.return_value = mock_process

        yield {
            "mock_process_class": mock_process_class,
            "mock_process": mock_process,
        }


@pytest.fixture
def mock_psutil_process_not_running():
    """Mock psutil.Process for a non-running process."""
    with patch("psutil.Process") as mock_process_class:
        mock_process = MagicMock()
        mock_process.pid = 12345
        mock_process.is_running.return_value = False
        mock_process_class.return_value = mock_process

        yield {
            "mock_process_class": mock_process_class,
            "mock_process": mock_process,
        }


@pytest.fixture
def mock_psutil_process_error():
    """Mock psutil.Process that raises NoSuchProcess error."""
    with patch("psutil.Process") as mock_process_class:
        from psutil import NoSuchProcess

        mock_process_class.side_effect = NoSuchProcess(12345)

        yield {
            "mock_process_class": mock_process_class,
        }


@pytest.fixture
def comprehensive_mock_setup():
    """Provide all mock fixtures in one comprehensive setup."""
    # This fixture combines multiple mocks for complex test scenarios
    with patch("requests.get") as mock_get, patch("subprocess.Popen") as mock_popen, patch(
        "os.path.exists"
    ) as mock_exists, patch("socket.socket") as mock_socket, patch("time.time") as mock_time:
        # Configure all mocks with sensible defaults
        mock_response = MagicMock(spec=requests.Response)
        mock_response.status_code = 200
        mock_response.json.return_value = {"success": True}
        mock_response.raise_for_status.return_value = None

        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.pid = 12345

        mock_sock = MagicMock()
        mock_sock.connect_ex.return_value = 1  # Port available

        mock_get.return_value = mock_response
        mock_popen.return_value = mock_process
        mock_exists.return_value = True
        mock_socket.return_value.__enter__.return_value = mock_sock
        mock_time.return_value = 1640995200.0

        yield {
            "mock_get": mock_get,
            "mock_popen": mock_popen,
            "mock_exists": mock_exists,
            "mock_socket": mock_socket,
            "mock_time": mock_time,
            "mock_response": mock_response,
            "mock_process": mock_process,
            "mock_sock": mock_sock,
        }
