"""
Security utilities for the Minecraft Server Manager.
"""
import hashlib
import re
import time
from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import abort, current_app, request
from flask_login import current_user


class SecurityError(Exception):
    """Base exception for security-related errors."""

    pass


class PasswordPolicyError(SecurityError):
    """Exception raised when password doesn't meet policy requirements."""

    pass


class RateLimitError(SecurityError):
    """Exception raised when rate limit is exceeded."""

    pass


class SecurityUtils:
    """Security utility functions."""

    @staticmethod
    def validate_password(password, username=None):
        """
        Validate password against security policy.

        Args:
            password (str): Password to validate
            username (str): Username (to prevent username in password)

        Raises:
            PasswordPolicyError: If password doesn't meet requirements
        """
        if not password:
            raise PasswordPolicyError("Password cannot be empty")

        # Check for common weak passwords first (before other validations)
        weak_passwords = {
            "password",
            "123456",
            "123456789",
            "qwerty",
            "abc123",
            "password123",
            "admin",
            "letmein",
            "welcome",
            "monkey",
        }
        if password.lower() in weak_passwords:
            raise PasswordPolicyError("Password is too common. Please choose a stronger password")

        # Prevent username in password (before other validations)
        if username and username.lower() in password.lower():
            raise PasswordPolicyError("Password cannot contain your username")

        min_length = current_app.config["PASSWORD_MIN_LENGTH"]
        if len(password) < min_length:
            raise PasswordPolicyError(f"Password must be at least {min_length} characters long")

        if current_app.config["PASSWORD_REQUIRE_UPPERCASE"] and not re.search(r"[A-Z]", password):
            raise PasswordPolicyError("Password must contain at least one uppercase letter")

        if current_app.config["PASSWORD_REQUIRE_LOWERCASE"] and not re.search(r"[a-z]", password):
            raise PasswordPolicyError("Password must contain at least one lowercase letter")

        if current_app.config["PASSWORD_REQUIRE_DIGITS"] and not re.search(r"\d", password):
            raise PasswordPolicyError("Password must contain at least one digit")

        if current_app.config["PASSWORD_REQUIRE_SPECIAL"] and not re.search(
            r'[!@#$%^&*(),.?":{}|<>]', password
        ):
            raise PasswordPolicyError("Password must contain at least one special character")

        return True

    @staticmethod
    def sanitize_input(text, max_length=255):
        """
        Sanitize user input to prevent XSS and injection attacks.

        Args:
            text (str): Input text to sanitize
            max_length (int): Maximum allowed length

        Returns:
            str: Sanitized text
        """
        if not text:
            return ""

        # Convert to string and strip whitespace
        text = str(text).strip()

        # Limit length
        if len(text) > max_length:
            text = text[:max_length]

        # Remove potentially dangerous characters
        dangerous_chars = [
            "<",
            ">",
            '"',
            "'",
            "&",
            "javascript:",
            "vbscript:",
            "onload=",
            "onerror=",
        ]
        for char in dangerous_chars:
            text = text.replace(char, "")

        return text

    @staticmethod
    def generate_secure_token(data, expires_in=3600):
        """
        Generate a secure JWT token.

        Args:
            data (dict): Data to encode in token
            expires_in (int): Token expiration time in seconds

        Returns:
            str: JWT token
        """
        payload = {
            "data": data,
            "exp": datetime.utcnow() + timedelta(seconds=expires_in),
            "iat": datetime.utcnow(),
            "iss": "minecraft-server-manager",
        }
        return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")

    @staticmethod
    def verify_secure_token(token):
        """
        Verify and decode a secure JWT token.

        Args:
            token (str): JWT token to verify

        Returns:
            dict: Decoded data or None if invalid
        """
        try:
            payload = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
            return payload["data"]
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    @staticmethod
    def hash_file_content(content):
        """
        Generate SHA-256 hash of file content for integrity checking.

        Args:
            content (bytes): File content

        Returns:
            str: SHA-256 hash
        """
        return hashlib.sha256(content).hexdigest()


class RateLimiter:
    """Simple in-memory rate limiter."""

    def __init__(self):
        self.attempts = {}

    def is_allowed(self, key, max_attempts, window_seconds):
        """
        Check if request is allowed based on rate limiting.

        Args:
            key (str): Unique identifier (IP, username, etc.)
            max_attempts (int): Maximum attempts allowed
            window_seconds (int): Time window in seconds

        Returns:
            bool: True if allowed, False if rate limited
        """
        now = time.time()

        if key not in self.attempts:
            self.attempts[key] = []

        # Remove old attempts outside the window
        self.attempts[key] = [t for t in self.attempts[key] if now - t < window_seconds]

        # Check if under limit
        if len(self.attempts[key]) < max_attempts:
            self.attempts[key].append(now)
            return True

        return False

    def get_remaining_attempts(self, key, max_attempts, window_seconds):
        """Get remaining attempts for a key."""
        now = time.time()

        if key not in self.attempts:
            return max_attempts

        # Remove old attempts outside the window
        self.attempts[key] = [t for t in self.attempts[key] if now - t < window_seconds]

        return max(0, max_attempts - len(self.attempts[key]))


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_attempts=5, window_seconds=60, key_func=None):
    """
    Decorator to implement rate limiting.

    Args:
        max_attempts (int): Maximum attempts allowed
        window_seconds (int): Time window in seconds
        key_func (callable): Function to generate rate limit key
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Skip rate limiting if disabled in configuration
            if not current_app.config.get("RATELIMIT_ENABLED", True):
                return f(*args, **kwargs)

            if key_func:
                key = key_func()
            else:
                key = request.remote_addr

            if not rate_limiter.is_allowed(key, max_attempts, window_seconds):
                abort(429, description="Rate limit exceeded.")

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_https():
    """Decorator to require HTTPS in production."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_secure and not current_app.debug:
                abort(400, description="HTTPS is required for this endpoint.")
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def audit_log(action, details=None, user_id=None):
    """
    Log security-relevant actions for audit purposes using structured logging.

    Args:
        action (str): Action being performed
        details (dict): Additional details about the action
        user_id (int): ID of the user performing the action
    """
    from .logging import logger

    if not user_id and current_user.is_authenticated:
        user_id = current_user.id

    # Use structured logging for security events
    logger.security_event(
        action,
        {
            "user_id": user_id,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get("User-Agent", ""),
            "details": details or {},
        },
    )


def add_security_headers(response):
    """
    Add security headers to response.

    Args:
        response: Flask response object

    Returns:
        response: Response with security headers
    """
    headers = current_app.config.get("SECURITY_HEADERS", {})

    for header, value in headers.items():
        response.headers[header] = value

    return response


def validate_file_upload(filename, allowed_extensions=None, max_size=None):
    """
    Validate file upload for security.

    Args:
        filename (str): Name of uploaded file
        allowed_extensions (set): Allowed file extensions
        max_size (int): Maximum file size in bytes

    Returns:
        bool: True if file is valid

    Raises:
        SecurityError: If file is invalid
    """
    if not filename:
        raise SecurityError("No file provided")

    # Check for path traversal in filename first
    if ".." in filename or "/" in filename or "\\" in filename:
        raise SecurityError("Invalid filename")

    # Check file extension
    if allowed_extensions is None:
        allowed_extensions = current_app.config.get("ALLOWED_EXTENSIONS", {"jar", "zip", "tar.gz"})

    # Handle compound extensions like .tar.gz
    filename_lower = filename.lower()
    file_ext = ""
    if filename_lower.endswith(".tar.gz"):
        file_ext = "tar.gz"
    elif "." in filename:
        file_ext = filename.rsplit(".", 1)[1].lower()

    if file_ext not in allowed_extensions:
        raise SecurityError(f"File type '{file_ext}' is not allowed")

    # Check file size
    if max_size is None:
        max_size = current_app.config.get("MAX_CONTENT_LENGTH", 16 * 1024 * 1024)

    if request.content_length and request.content_length > max_size:
        raise SecurityError(f"File size exceeds maximum allowed size of {max_size} bytes")

    return True


def secure_filename(filename):
    """
    Generate a secure filename for uploaded files.

    Args:
        filename (str): Original filename

    Returns:
        str: Secure filename
    """
    # Remove dangerous characters
    filename = re.sub(r"[^\w\-_.]", "_", filename)

    # Add timestamp to prevent conflicts
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    name, ext = filename.rsplit(".", 1) if "." in filename else (filename, "")

    return f"{name}_{timestamp}.{ext}" if ext else f"{name}_{timestamp}"


# Password validation decorator
def validate_password_policy(f):
    """Decorator to validate password policy in forms."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == "POST":
            password = request.form.get("password") or request.form.get("new_password")
            username = request.form.get("username")

            if password:
                try:
                    SecurityUtils.validate_password(password, username)
                except PasswordPolicyError as e:
                    from flask import flash

                    flash(str(e), "danger")
                    return f(*args, **kwargs)

        return f(*args, **kwargs)

    return decorated_function
