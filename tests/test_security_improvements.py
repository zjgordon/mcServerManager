"""
Security improvement tests for the Minecraft Server Manager.
"""
import pytest
import re
from unittest.mock import patch, MagicMock
from app.security import (
    SecurityUtils, RateLimiter, rate_limiter, PasswordPolicyError,
    SecurityError, validate_file_upload, secure_filename, audit_log
)
from app.models import User
from app.extensions import db


class TestPasswordPolicy:
    """Test password policy validation."""
    
    def test_password_minimum_length(self, app):
        """Test password minimum length requirement."""
        with app.app_context():
            # Test short password
            with pytest.raises(PasswordPolicyError, match="at least 8 characters"):
                SecurityUtils.validate_password("short")
            
            # Test valid password
            assert SecurityUtils.validate_password("ValidPass123") is True
    
    def test_password_uppercase_requirement(self, app):
        """Test password uppercase requirement."""
        with app.app_context():
            # Test password without uppercase
            with pytest.raises(PasswordPolicyError, match="uppercase"):
                SecurityUtils.validate_password("lowercase123")
            
            # Test valid password
            assert SecurityUtils.validate_password("ValidPass123") is True
    
    def test_password_lowercase_requirement(self, app):
        """Test password lowercase requirement."""
        with app.app_context():
            # Test password without lowercase
            with pytest.raises(PasswordPolicyError, match="lowercase"):
                SecurityUtils.validate_password("UPPERCASE123")
            
            # Test valid password
            assert SecurityUtils.validate_password("ValidPass123") is True
    
    def test_password_digit_requirement(self, app):
        """Test password digit requirement."""
        with app.app_context():
            # Test password without digits
            with pytest.raises(PasswordPolicyError, match="digit"):
                SecurityUtils.validate_password("NoDigits")
            
            # Test valid password
            assert SecurityUtils.validate_password("ValidPass123") is True
    
    def test_username_in_password(self, app):
        """Test that password cannot contain username."""
        with app.app_context():
            # Test password containing username
            with pytest.raises(PasswordPolicyError, match="cannot contain your username"):
                SecurityUtils.validate_password("admin123", "admin")
            
            # Test valid password
            assert SecurityUtils.validate_password("ValidPass123", "admin") is True
    
    def test_weak_password_detection(self, app):
        """Test detection of common weak passwords."""
        with app.app_context():
            weak_passwords = ['password', '123456', 'qwerty', 'admin']
            
            for weak_pass in weak_passwords:
                with pytest.raises(PasswordPolicyError, match="too common"):
                    SecurityUtils.validate_password(weak_pass)


class TestInputSanitization:
    """Test input sanitization functions."""
    
    def test_sanitize_input_removes_dangerous_chars(self, app):
        """Test that dangerous characters are removed."""
        with app.app_context():
            dangerous_inputs = [
                "<script>alert('xss')</script>",
                "javascript:alert('xss')",
                "onload=alert('xss')",
                "vbscript:alert('xss')"
            ]
            
            for dangerous_input in dangerous_inputs:
                sanitized = SecurityUtils.sanitize_input(dangerous_input)
                assert "<script>" not in sanitized
                assert "javascript:" not in sanitized
                assert "onload=" not in sanitized
                assert "vbscript:" not in sanitized
    
    def test_sanitize_input_length_limit(self, app):
        """Test input length limiting."""
        with app.app_context():
            long_input = "a" * 300
            sanitized = SecurityUtils.sanitize_input(long_input, max_length=255)
            assert len(sanitized) <= 255
    
    def test_sanitize_input_empty_handling(self, app):
        """Test handling of empty input."""
        with app.app_context():
            assert SecurityUtils.sanitize_input("") == ""
            assert SecurityUtils.sanitize_input(None) == ""


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_rate_limiter_basic_functionality(self):
        """Test basic rate limiting functionality."""
        limiter = RateLimiter()
        
        # Should allow first 5 attempts
        for i in range(5):
            assert limiter.is_allowed("test_key", 5, 60) is True
        
        # Should block 6th attempt
        assert limiter.is_allowed("test_key", 5, 60) is False
    
    def test_rate_limiter_window_expiry(self):
        """Test that rate limits expire after window."""
        limiter = RateLimiter()
        
        # Make 5 attempts
        for i in range(5):
            limiter.is_allowed("test_key", 5, 1)  # 1 second window
        
        # Should be blocked
        assert limiter.is_allowed("test_key", 5, 1) is False
        
        # Wait for window to expire (simulate with time manipulation)
        import time
        with patch('time.time', return_value=time.time() + 2):
            assert limiter.is_allowed("test_key", 5, 1) is True
    
    def test_rate_limiter_remaining_attempts(self):
        """Test remaining attempts calculation."""
        limiter = RateLimiter()
        
        # Should start with 5 attempts
        assert limiter.get_remaining_attempts("test_key", 5, 60) == 5
        
        # After 2 attempts, should have 3 remaining
        limiter.is_allowed("test_key", 5, 60)
        limiter.is_allowed("test_key", 5, 60)
        assert limiter.get_remaining_attempts("test_key", 5, 60) == 3


class TestFileUploadSecurity:
    """Test file upload security functions."""
    
    def test_validate_file_upload_valid_file(self, app):
        """Test validation of valid file upload."""
        with app.app_context():
            # Mock request with valid file
            with patch('app.security.request') as mock_request:
                mock_request.content_length = 1024  # 1KB
                
                assert validate_file_upload("test.jar") is True
                assert validate_file_upload("backup.zip") is True
                assert validate_file_upload("server.tar.gz") is True
    
    def test_validate_file_upload_invalid_extension(self, app):
        """Test rejection of invalid file extensions."""
        with app.app_context():
            invalid_files = ["test.exe", "malicious.bat", "script.sh", "virus.com"]
            
            for invalid_file in invalid_files:
                with pytest.raises(SecurityError, match="not allowed"):
                    validate_file_upload(invalid_file)
    
    def test_validate_file_upload_path_traversal(self, app):
        """Test rejection of path traversal attempts."""
        with app.app_context():
            dangerous_files = [
                "../../../etc/passwd",
                "..\\..\\..\\windows\\system32\\cmd.exe",
                "/etc/passwd",
                "C:\\Windows\\System32\\cmd.exe"
            ]
            
            for dangerous_file in dangerous_files:
                with pytest.raises(SecurityError, match="Invalid filename"):
                    validate_file_upload(dangerous_file)
    
    def test_validate_file_upload_size_limit(self, app):
        """Test file size limit enforcement."""
        with app.app_context():
            # Mock request with oversized file
            with patch('app.security.request') as mock_request:
                mock_request.content_length = 20 * 1024 * 1024  # 20MB
                
                with pytest.raises(SecurityError, match="exceeds maximum"):
                    validate_file_upload("large.jar")
    
    def test_secure_filename_generation(self, app):
        """Test secure filename generation."""
        with app.app_context():
            dangerous_names = [
                "file<script>alert('xss')</script>.jar",
                "file with spaces.jar",
                "file/with/slashes.jar",
                "file\\with\\backslashes.jar"
            ]
            
            for dangerous_name in dangerous_names:
                secure_name = secure_filename(dangerous_name)
                
                # Should not contain dangerous characters
                assert "<script>" not in secure_name
                assert " " not in secure_name
                assert "/" not in secure_name
                assert "\\" not in secure_name
                
                # Should contain timestamp
                assert re.search(r'\d{8}_\d{6}', secure_name)


class TestSecurityHeaders:
    """Test security headers functionality."""
    
    def test_security_headers_presence(self, app):
        """Test that security headers are added to responses."""
        with app.app_context():
            from app.security import add_security_headers
            from flask import make_response
            
            response = make_response("test")
            secured_response = add_security_headers(response)
            
            # Check for security headers
            assert secured_response.headers.get('X-Content-Type-Options') == 'nosniff'
            assert secured_response.headers.get('X-Frame-Options') == 'SAMEORIGIN'
            assert secured_response.headers.get('X-XSS-Protection') == '1; mode=block'
            assert 'Content-Security-Policy' in secured_response.headers


class TestAuditLogging:
    """Test audit logging functionality."""
    
    def test_audit_log_format(self, app):
        """Test audit log entry format."""
        with app.app_context():
            with patch('app.security.current_user') as mock_user:
                mock_user.is_authenticated = True
                mock_user.id = 123
                
                with patch('app.security.request') as mock_request:
                    mock_request.remote_addr = '192.168.1.100'
                    mock_request.headers.get.return_value = 'Test Browser'
                    
                    # Capture log output
                    with patch('app.security.current_app.logger.info') as mock_logger:
                        audit_log('test_action', {'detail': 'test'})
                        
                        # Verify log was called
                        mock_logger.assert_called_once()
                        
                        # Verify log format
                        log_call = mock_logger.call_args[0][0]
                        assert 'AUDIT:' in log_call
                        assert 'test_action' in log_call
                        assert '192.168.1.100' in log_call


class TestCSRFProtection:
    """Test CSRF protection functionality."""
    
    def test_csrf_token_in_forms(self, client):
        """Test that forms include CSRF tokens."""
        response = client.get('/login')
        assert response.status_code == 200
        assert 'csrf_token' in response.data.decode()


class TestAuthenticationSecurity:
    """Test authentication security features."""
    
    def test_login_rate_limiting(self, client, app):
        """Test login rate limiting."""
        # Enable rate limiting for this test
        app.config['RATELIMIT_ENABLED'] = True
        
        # Make multiple login attempts
        for i in range(6):
            response = client.post('/login', data={
                'username': f'testuser{i}',
                'password': 'wrongpassword'
            })
        
        # Should get rate limited
        assert response.status_code == 429  # Too Many Requests
    
    def test_password_policy_enforcement(self, client, app):
        """Test password policy enforcement."""
        # Try to create admin with weak password
        response = client.post('/set_admin_password', data={
            'username': 'admin',
            'password': 'weak',
            'confirm_password': 'weak'
        })
        
        assert b'Password must be at least 8 characters long' in response.data
    
    def test_input_sanitization_in_forms(self, client, app):
        """Test input sanitization in forms."""
        # Try to submit form with XSS payload
        response = client.post('/login', data={
            'username': '<script>alert("xss")</script>',
            'password': 'password123'
        })
        
        # Should not crash and should sanitize input
        assert response.status_code == 200


class TestSessionSecurity:
    """Test session security features."""
    
    def test_session_configuration(self, app):
        """Test session security configuration."""
        assert app.config['SESSION_COOKIE_HTTPONLY'] is True
        assert app.config['SESSION_COOKIE_SAMESITE'] == 'Lax'
        assert app.config['PERMANENT_SESSION_LIFETIME'] == 3600  # 1 hour
        assert app.config['SESSION_REFRESH_EACH_REQUEST'] is True


class TestConfigurationSecurity:
    """Test security configuration."""
    
    def test_secret_key_generation(self, app):
        """Test secure secret key generation."""
        # Should not use default weak key
        assert app.config['SECRET_KEY'] != 'your_secret_key'
        
        # Should be a secure random key
        assert len(app.config['SECRET_KEY']) >= 32
    
    def test_security_headers_configuration(self, app):
        """Test security headers configuration."""
        headers = app.config.get('SECURITY_HEADERS', {})
        
        assert 'X-Content-Type-Options' in headers
        assert 'X-Frame-Options' in headers
        assert 'X-XSS-Protection' in headers
        assert 'Content-Security-Policy' in headers
    
    def test_password_policy_configuration(self, app):
        """Test password policy configuration."""
        assert app.config['PASSWORD_MIN_LENGTH'] >= 8
        assert app.config['PASSWORD_REQUIRE_UPPERCASE'] is True
        assert app.config['PASSWORD_REQUIRE_LOWERCASE'] is True
        assert app.config['PASSWORD_REQUIRE_DIGITS'] is True
