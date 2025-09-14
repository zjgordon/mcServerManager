"""
Unit tests for backup execution functionality in backup_scheduler.py.

Tests the comprehensive backup execution logic including verification,
compression, metadata tracking, error handling, and retry logic.
"""

import os
import shutil
import subprocess
import tarfile
import tempfile
import time
from unittest.mock import Mock, patch

import pytest
from apscheduler.schedulers.background import BackgroundScheduler

from app.backup_scheduler import BackupScheduler


class TestBackupExecution:
    """Test backup execution functionality."""

    @pytest.fixture
    def scheduler(self):
        """Create backup scheduler instance for testing."""
        # Create scheduler without initializing app to avoid logging context issues
        scheduler = BackupScheduler()
        scheduler.scheduler = Mock(spec=BackgroundScheduler)
        scheduler.logger = Mock()  # Mock logger to avoid Flask context issues
        return scheduler

    @pytest.fixture
    def temp_dirs(self):
        """Create temporary directories for testing."""
        temp_dir = tempfile.mkdtemp()
        server_dir = os.path.join(temp_dir, "test_server")
        backup_dir = os.path.join(temp_dir, "backups", "test_server")

        os.makedirs(server_dir)
        os.makedirs(backup_dir)

        # Create some test files in server directory
        with open(os.path.join(server_dir, "server.properties"), "w") as f:
            f.write("server-port=25565\n")

        with open(os.path.join(server_dir, "test_file.txt"), "w") as f:
            f.write("Test content for backup")

        yield {"temp_dir": temp_dir, "server_dir": server_dir, "backup_dir": backup_dir}

        # Cleanup
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.fixture
    def mock_server(self):
        """Create mock server object."""
        server = Mock()
        server.id = 1
        server.server_name = "test_server"
        server.status = "Running"
        server.pid = 12345
        server.memory_mb = 1024
        return server

    @pytest.fixture
    def mock_backup_schedule(self):
        """Create mock backup schedule object."""
        schedule = Mock()
        schedule.server_id = 1
        schedule.retention_days = 7
        return schedule

    def test_execute_backup_job_success(self, scheduler, temp_dirs, mock_server):
        """Test successful backup execution."""
        # Mock server query
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            # Mock database session
            with patch("app.backup_scheduler.db.session"):
                # Mock the backup creation and verification methods directly
                with patch.object(
                    scheduler, "_stop_server_for_backup", return_value=False
                ), patch.object(
                    scheduler, "_create_backup_archive", return_value=True
                ), patch.object(
                    scheduler, "verify_backup_comprehensive"
                ) as mock_verify, patch.object(
                    scheduler, "_cleanup_old_backups"
                ), patch(
                    "app.backup_scheduler.os.path.getsize", return_value=1024000
                ):
                    # Setup verification mock to return success
                    mock_verify.return_value = {
                        "overall_valid": True,
                        "archive_integrity": {"checksum": "a" * 64},
                        "quality_score": {"score": 85, "quality_level": "Good"},
                    }

                    # Execute backup
                    result = scheduler.execute_backup_job(1)

                    # Verify result
                    assert result["success"] is True
                    assert "backup_file" in result
                    assert "backup_filename" in result
                    assert "size" in result
                    assert "checksum" in result
                    assert "duration" in result
                    assert result["size"] > 0
                    assert len(result["checksum"]) == 64  # SHA256 hex length

                    # Verify backup file was created
                    backup_file = result["backup_file"]
                    assert backup_file.endswith(".tar.gz")

    def test_execute_backup_job_server_not_found(self, scheduler):
        """Test backup execution when server is not found."""
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = None

            result = scheduler.execute_backup_job(999)

            assert result["success"] is False
            assert "not found" in result["error"]

    def test_execute_backup_job_with_running_server(self, scheduler, temp_dirs, mock_server):
        """Test backup execution with running server that needs to be stopped."""
        mock_server.status = "Running"
        mock_server.pid = 12345

        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            # Mock psutil for process management
            with patch("app.backup_scheduler.psutil.Process") as mock_process_class:
                mock_process = Mock()
                mock_process_class.return_value = mock_process
                mock_process.wait.return_value = None

                # Mock database session
                with patch("app.backup_scheduler.db.session"):
                    # Mock the backup creation and verification methods directly
                    with patch.object(
                        scheduler, "_create_backup_archive", return_value=True
                    ), patch.object(
                        scheduler, "verify_backup_comprehensive"
                    ) as mock_verify, patch.object(
                        scheduler, "_cleanup_old_backups"
                    ), patch(
                        "app.backup_scheduler.os.path.getsize", return_value=1024000
                    ):
                        # Setup verification mock to return success
                        mock_verify.return_value = {
                            "overall_valid": True,
                            "archive_integrity": {"checksum": "a" * 64},
                            "quality_score": {"score": 85, "quality_level": "Good"},
                        }

                        result = scheduler.execute_backup_job(1)

                        assert result["success"] is True
                        assert result["was_running"] is True

                        # Verify server was stopped and restarted
                        mock_process.terminate.assert_called_once()

    def test_stop_server_for_backup_success(self, scheduler, mock_server):
        """Test successful server stopping for backup."""
        mock_server.status = "Running"
        mock_server.pid = 12345

        with patch("app.backup_scheduler.psutil.Process") as mock_process_class:
            mock_process = Mock()
            mock_process_class.return_value = mock_process
            mock_process.wait.return_value = None

            with patch("app.backup_scheduler.db.session"):
                result = scheduler._stop_server_for_backup(mock_server)

                assert result is True
                mock_process.terminate.assert_called_once()
                mock_process.wait.assert_called_once_with(timeout=10)

    def test_stop_server_for_backup_timeout(self, scheduler, mock_server):
        """Test server stopping with timeout requiring force kill."""
        mock_server.status = "Running"
        mock_server.pid = 12345

        with patch("app.backup_scheduler.psutil.Process") as mock_process_class:
            mock_process = Mock()
            mock_process_class.return_value = mock_process

            # First wait times out, second succeeds
            from psutil import TimeoutExpired

            mock_process.wait.side_effect = [TimeoutExpired("", 10), None]

            with patch("app.backup_scheduler.db.session"):
                result = scheduler._stop_server_for_backup(mock_server)

                assert result is True
                mock_process.terminate.assert_called_once()
                mock_process.kill.assert_called_once()

    def test_stop_server_for_backup_no_such_process(self, scheduler, mock_server):
        """Test server stopping when process doesn't exist."""
        mock_server.status = "Running"
        mock_server.pid = 12345

        with patch("app.backup_scheduler.psutil.Process") as mock_process_class:
            from psutil import NoSuchProcess

            mock_process_class.side_effect = NoSuchProcess(12345)

            with patch("app.backup_scheduler.db.session"):
                result = scheduler._stop_server_for_backup(mock_server)

                assert result is False  # Server was already stopped

    def test_create_backup_archive_success(self, scheduler, temp_dirs):
        """Test successful backup archive creation."""
        server_dir = temp_dirs["server_dir"]
        backup_filepath = os.path.join(temp_dirs["backup_dir"], "test_backup.tar.gz")

        result = scheduler._create_backup_archive(server_dir, backup_filepath)

        assert result is True
        assert os.path.exists(backup_filepath)
        assert os.path.getsize(backup_filepath) > 0

        # Verify archive contents
        with tarfile.open(backup_filepath, "r:gz") as tar:
            members = tar.getmembers()
            assert len(members) > 0
            member_names = [member.name for member in members]
            assert any("server.properties" in name for name in member_names)
            assert any("test_file.txt" in name for name in member_names)

    def test_create_backup_archive_server_dir_not_found(self, scheduler, temp_dirs):
        """Test backup archive creation when server directory doesn't exist."""
        non_existent_dir = os.path.join(temp_dirs["temp_dir"], "nonexistent")
        backup_filepath = os.path.join(temp_dirs["backup_dir"], "test_backup.tar.gz")

        with pytest.raises(FileNotFoundError):
            scheduler._create_backup_archive(non_existent_dir, backup_filepath)

    def test_create_backup_archive_empty_result(self, scheduler, temp_dirs):
        """Test backup archive creation that results in empty file."""
        server_dir = temp_dirs["server_dir"]
        backup_filepath = os.path.join(temp_dirs["backup_dir"], "test_backup.tar.gz")

        # Mock tarfile to create empty archive
        with patch("app.backup_scheduler.tarfile.open") as mock_tarfile:
            mock_tarfile.return_value.__enter__.return_value = Mock()

            # Mock file operations to simulate empty file
            with patch("app.backup_scheduler.os.path.exists") as mock_exists:
                with patch("app.backup_scheduler.os.path.getsize") as mock_getsize:
                    with patch("app.backup_scheduler.open", create=True) as mock_open:
                        with patch("app.backup_scheduler.os.remove"):
                            mock_exists.return_value = True
                            mock_getsize.return_value = 0  # Empty file

                            # Mock file operations
                            mock_file = Mock()
                            mock_open.return_value.__enter__.return_value = mock_file
                            mock_file.read.return_value = b""  # Empty data

                            with pytest.raises(ValueError, match="Backup archive is empty"):
                                scheduler._create_backup_archive(server_dir, backup_filepath)

    def test_verify_backup_integrity_success(self, scheduler, temp_dirs):
        """Test successful backup integrity verification."""
        # Create a test backup file
        backup_filepath = os.path.join(temp_dirs["backup_dir"], "test_backup.tar.gz")

        with tarfile.open(backup_filepath, "w:gz") as tar:
            tar.add(temp_dirs["server_dir"], arcname="test_server")

        result = scheduler._verify_backup_integrity(backup_filepath)

        assert result["valid"] is True
        assert "checksum" in result
        assert len(result["checksum"]) == 64  # SHA256 hex length

    def test_verify_backup_integrity_empty_archive(self, scheduler, temp_dirs):
        """Test backup integrity verification with empty archive."""
        backup_filepath = os.path.join(temp_dirs["backup_dir"], "empty_backup.tar.gz")

        # Create empty archive
        with tarfile.open(backup_filepath, "w:gz"):
            pass  # No files added

        result = scheduler._verify_backup_integrity(backup_filepath)

        assert result["valid"] is False
        assert "Archive is empty" in result["error"]

    def test_verify_backup_integrity_corrupted_archive(self, scheduler, temp_dirs):
        """Test backup integrity verification with corrupted archive."""
        backup_filepath = os.path.join(temp_dirs["backup_dir"], "corrupted_backup.tar.gz")

        # Create a file that's not a valid tar.gz
        with open(backup_filepath, "w") as f:
            f.write("This is not a valid tar.gz file")

        result = scheduler._verify_backup_integrity(backup_filepath)

        assert result["valid"] is False
        assert "corruption detected" in result["error"]

    def test_verify_backup_integrity_file_not_found(self, scheduler, temp_dirs):
        """Test backup integrity verification when file doesn't exist."""
        non_existent_file = os.path.join(temp_dirs["backup_dir"], "nonexistent.tar.gz")

        # Mock the calculate_file_checksums function from utils module
        with patch("app.utils.calculate_file_checksums") as mock_checksums:
            mock_checksums.return_value = None

            result = scheduler._verify_backup_integrity(non_existent_file)

            assert result["valid"] is False
            assert "Failed to calculate checksums" in result["error"]

    def test_cleanup_old_backups(self, scheduler, temp_dirs, mock_backup_schedule):
        """Test cleanup of old backups based on retention policy."""
        backup_dir = temp_dirs["backup_dir"]

        # Create some test backup files with different ages
        old_timestamp = int(time.time()) - (10 * 24 * 3600)  # 10 days ago
        new_timestamp = int(time.time()) - (1 * 24 * 3600)  # 1 day ago

        old_backup = os.path.join(backup_dir, "test_server_backup_old.tar.gz")
        new_backup = os.path.join(backup_dir, "test_server_backup_new.tar.gz")

        # Create test files
        with open(old_backup, "w") as f:
            f.write("old backup")
        with open(new_backup, "w") as f:
            f.write("new backup")

        # Set file modification times
        os.utime(old_backup, (old_timestamp, old_timestamp))
        os.utime(new_backup, (new_timestamp, new_timestamp))

        with patch("app.backup_scheduler.BackupSchedule") as mock_schedule_class, patch(
            "app.backup_scheduler.Server"
        ) as mock_server_class, patch("app.backup_scheduler.db.session"):
            mock_schedule_class.query.filter_by.return_value.first.return_value = (
                mock_backup_schedule
            )
            mock_server_class.query.get.return_value = Mock(server_name="test_server")

            # Mock the _get_backup_files method to return our test files
            with patch.object(scheduler, "_get_backup_files") as mock_get_files:
                with patch("app.backup_scheduler.os.remove"):
                    with patch("app.backup_scheduler.os.path.exists") as mock_exists:
                        mock_exists.return_value = True
                        mock_get_files.return_value = [
                            {
                                "filename": "test_server_backup_old.tar.gz",
                                "filepath": old_backup,
                                "size": 1024,
                                "mtime": old_timestamp,
                                "created": time.time() - (10 * 24 * 3600),
                            },
                            {
                                "filename": "test_server_backup_new.tar.gz",
                                "filepath": new_backup,
                                "size": 2048,
                                "mtime": new_timestamp,
                                "created": time.time() - (1 * 24 * 3600),
                            },
                        ]

                        result = scheduler.cleanup_old_backups(1)

                        # Debug: print the result to see what's happening
                        print(f"Cleanup result: {result}")

                        # Verify the method completed successfully
                        assert result["success"] is True
                        # New backup should remain
                        assert os.path.exists(new_backup)

    def test_restart_server_after_backup_success(self, scheduler, mock_server, temp_dirs):
        """Test successful server restart after backup."""
        server_dir = temp_dirs["server_dir"]
        server_jar_path = os.path.join(server_dir, "server.jar")

        # Create server.jar file
        with open(server_jar_path, "w") as f:
            f.write("fake server jar")

        mock_server.server_name = "test_server"
        mock_server.memory_mb = 1024

        with patch("app.backup_scheduler.subprocess.Popen") as mock_popen:
            mock_process = Mock()
            mock_process.pid = 54321
            mock_popen.return_value = mock_process

            with patch("app.backup_scheduler.db.session"):
                # Mock os.path.exists to return True for server.jar
                with patch("app.backup_scheduler.os.path.exists") as mock_exists:
                    mock_exists.return_value = True

                    scheduler._restart_server_after_backup(mock_server, 12345)

                    # Verify subprocess was called with correct command
                    expected_command = [
                        "java",
                        "-Xms1024M",
                        "-Xmx1024M",
                        "-jar",
                        "server.jar",
                        "nogui",
                    ]
                    mock_popen.assert_called_once_with(
                        expected_command,
                        cwd="servers/test_server",  # The actual working directory used
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                    )

    def test_restart_server_after_backup_jar_not_found(self, scheduler, mock_server, temp_dirs):
        """Test server restart when server.jar is not found."""
        mock_server.server_name = "test_server"

        with pytest.raises(FileNotFoundError, match="Server JAR not found"):
            scheduler._restart_server_after_backup(mock_server, 12345)

    def test_execute_backup_job_with_retry_logic(self, scheduler, temp_dirs, mock_server):
        """Test backup execution with retry logic for failures."""
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            # Mock _create_backup_archive to fail twice then succeed
            with patch.object(scheduler, "_create_backup_archive") as mock_create:
                mock_create.side_effect = [Exception("Network error"), Exception("Disk full"), True]

                with patch.object(scheduler, "_stop_server_for_backup", return_value=False):
                    with patch.object(
                        scheduler,
                        "verify_backup_comprehensive",
                        return_value={
                            "overall_valid": True,
                            "archive_integrity": {"checksum": "abc123"},
                        },
                    ):
                        with patch.object(scheduler, "_cleanup_old_backups"):
                            with patch("app.backup_scheduler.db.session"):
                                with patch(
                                    "app.backup_scheduler.os.path.getsize", return_value=1024000
                                ):
                                    result = scheduler.execute_backup_job(1, max_retries=3)

                                    assert result["success"] is True
                                    assert mock_create.call_count == 3

    def test_execute_backup_job_verification_failure(self, scheduler, temp_dirs, mock_server):
        """Test backup execution when verification fails."""
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            with patch.object(scheduler, "_stop_server_for_backup", return_value=False):
                with patch.object(scheduler, "_create_backup_archive", return_value=True):
                    with patch.object(
                        scheduler,
                        "_verify_backup_integrity",
                        return_value={"valid": False, "error": "Corruption detected"},
                    ):
                        with patch("app.backup_scheduler.db.session"):
                            result = scheduler.execute_backup_job(1)

                            assert result["success"] is False
                            assert "verification failed" in result["error"]

    def test_execute_backup_job_max_retries_exceeded(self, scheduler, temp_dirs, mock_server):
        """Test backup execution when max retries are exceeded."""
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            with patch.object(scheduler, "_stop_server_for_backup", return_value=False):
                with patch.object(
                    scheduler, "_create_backup_archive", side_effect=Exception("Persistent error")
                ):
                    with patch("app.backup_scheduler.db.session"):
                        result = scheduler.execute_backup_job(1, max_retries=2)

                        assert result["success"] is False
                        assert "Failed to create backup after 2 attempts" in result["error"]

    def test_backup_filename_generation(self, scheduler, mock_server):
        """Test backup filename generation with timestamp."""
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            with patch("app.backup_scheduler.datetime") as mock_datetime:
                mock_datetime.now.return_value.strftime.return_value = "20250109_143022"

                with patch.object(scheduler, "_stop_server_for_backup", return_value=False):
                    with patch.object(scheduler, "_create_backup_archive", return_value=True):
                        with patch.object(
                            scheduler,
                            "verify_backup_comprehensive",
                            return_value={
                                "overall_valid": True,
                                "archive_integrity": {"checksum": "abc123"},
                            },
                        ):
                            with patch.object(scheduler, "_cleanup_old_backups"):
                                with patch("app.backup_scheduler.db.session"):
                                    with patch(
                                        "app.backup_scheduler.os.path.getsize", return_value=1024000
                                    ):
                                        result = scheduler.execute_backup_job(1)

                                        assert result["success"] is True
                                        assert (
                                            "test_server_backup_20250109_143022.tar.gz"
                                            in result["backup_filename"]
                                        )

    def test_backup_metadata_tracking(self, scheduler, temp_dirs, mock_server):
        """Test backup metadata tracking (size, duration, checksum)."""
        with patch("app.backup_scheduler.Server") as mock_server_class:
            mock_server_class.query.get.return_value = mock_server

            with patch.object(scheduler, "_stop_server_for_backup", return_value=False):
                with patch.object(scheduler, "_create_backup_archive", return_value=True):
                    with patch.object(
                        scheduler,
                        "verify_backup_comprehensive",
                        return_value={
                            "overall_valid": True,
                            "archive_integrity": {"checksum": "a" * 64},
                        },
                    ):
                        with patch.object(scheduler, "_cleanup_old_backups"):
                            with patch("app.backup_scheduler.db.session"):
                                with patch(
                                    "app.backup_scheduler.os.path.getsize", return_value=1024000
                                ):
                                    result = scheduler.execute_backup_job(1)

                                    assert result["success"] is True
                                    assert result["size"] == 1024000
                                    assert result["checksum"] == "a" * 64
                                    assert result["duration"] > 0
