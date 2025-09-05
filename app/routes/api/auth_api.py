"""
Authentication API Routes

Provides RESTful endpoints for user authentication and session management.
"""

from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from werkzeug.security import check_password_hash, generate_password_hash
from ...security import SecurityUtils, rate_limit, audit_log, rate_limiter, PasswordPolicyError
from ...models import User
from ...extensions import db
from ...error_handlers import ValidationError, logger
from datetime import datetime
import re
import os

# Create authentication API blueprint
auth_bp = Blueprint('auth_api', __name__, url_prefix='/auth')

@auth_bp.route('/login', methods=['POST'])
@rate_limit(max_attempts=5, window_seconds=300)  # 5 attempts per 5 minutes
def login():
    """
    Authenticate user and create session.
    
    Request Body:
    {
        "username": "string",
        "password": "string"
    }
    
    Response:
    {
        "success": true,
        "message": "Login successful",
        "user": {
            "id": 1,
            "username": "admin",
            "is_admin": true
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        username = SecurityUtils.sanitize_input(data.get('username', ''))
        password = data.get('password', '')
        
        # Validate input
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400
        
        # Check rate limiting for this specific username
        remaining_attempts = rate_limiter.get_remaining_attempts(
            f"login_{username}", 5, 300
        )
        
        if remaining_attempts == 0:
            return jsonify({
                'success': False,
                'message': 'Too many login attempts. Please try again in 5 minutes.'
            }), 429
        
        # Find user
        user = User.query.filter_by(username=username).first()
        
        if user and user.password_hash and user.is_active:
            if check_password_hash(user.password_hash, password):
                # Update last login time
                user.last_login = datetime.utcnow()
                db.session.commit()
                
                # Login user
                login_user(user, remember=True)
                audit_log('login_success', {'username': username})
                
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'is_admin': user.is_admin,
                        'email': user.email,
                        'is_active': user.is_active,
                        'last_login': user.last_login.isoformat() if user.last_login else None
                    }
                }), 200
            else:
                audit_log('login_failed', {'username': username, 'reason': 'invalid_password'})
                return jsonify({
                    'success': False,
                    'message': 'Invalid username or password'
                }), 401
        else:
            audit_log('login_failed', {'username': username, 'reason': 'user_not_found_or_inactive'})
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login'
        }), 500

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    Logout current user and destroy session.
    
    Response:
    {
        "success": true,
        "message": "Logout successful"
    }
    """
    try:
        username = current_user.username
        logout_user()
        
        logger.info(f"User {username} logged out successfully")
        
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during logout'
        }), 500

@auth_bp.route('/me', methods=['GET'])
@login_required
def get_current_user():
    """
    Get current user information.
    
    Response:
    {
        "success": true,
        "user": {
            "id": 1,
            "username": "admin",
            "is_admin": true,
            "server_count": 3,
            "total_memory_allocated": 3072
        }
    }
    """
    try:
        return jsonify({
            'success': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'is_admin': current_user.is_admin,
                'server_count': current_user.server_count,
                'total_memory_allocated': current_user.total_memory_allocated
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Get current user error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching user information'
        }), 500

@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """
    Change user password.
    
    Request Body:
    {
        "current_password": "string",
        "new_password": "string"
    }
    
    Response:
    {
        "success": true,
        "message": "Password changed successfully"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        # Validate input
        if not current_password or not new_password:
            return jsonify({
                'success': False,
                'message': 'Current password and new password are required'
            }), 400
        
        # Verify current password
        if not check_password_hash(current_user.password_hash, current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 401
        
        # Validate new password strength
        try:
            SecurityUtils.validate_password(new_password)
        except Exception as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 400
        
        # Update password
        from werkzeug.security import generate_password_hash
        current_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        logger.info(f"User {current_user.username} changed password successfully")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Change password error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while changing password'
        }), 500

@auth_bp.route('/status', methods=['GET'])
def auth_status():
    """
    Check authentication status.
    
    Response:
    {
        "authenticated": true,
        "user": {
            "id": 1,
            "username": "admin",
            "is_admin": true
        }
    }
    """
    try:
        if current_user.is_authenticated:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': current_user.id,
                    'username': current_user.username,
                    'is_admin': current_user.is_admin
                }
            }), 200
        else:
            return jsonify({
                'authenticated': False
            }), 200
            
    except Exception as e:
        logger.error(f"Auth status error: {str(e)}")
        return jsonify({
            'authenticated': False,
            'error': 'An error occurred while checking authentication status'
        }), 500

@auth_bp.route('/setup', methods=['POST'])
def setup_admin():
    """
    Set up the initial admin account on first run.
    
    Request Body:
    {
        "username": "admin",
        "password": "securepassword",
        "confirm_password": "securepassword",
        "email": "admin@example.com"
    }
    
    Response:
    {
        "success": true,
        "message": "Admin account created successfully",
        "user": {
            "id": 1,
            "username": "admin",
            "is_admin": true
        }
    }
    """
    try:
        # Check if any admin user exists
        admin_user = User.query.filter_by(is_admin=True).first()
        
        if admin_user and admin_user.password_hash:
            return jsonify({
                'success': False,
                'message': 'Admin account is already set up'
            }), 400
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        username = SecurityUtils.sanitize_input(data.get('username', ''))
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        email = SecurityUtils.sanitize_input(data.get('email', ''))
        
        # Validation
        if not username or len(username) < 3:
            return jsonify({
                'success': False,
                'message': 'Username must be at least 3 characters long'
            }), 400
        
        try:
            SecurityUtils.validate_password(password, username)
        except PasswordPolicyError as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 400
        
        if password != confirm_password:
            return jsonify({
                'success': False,
                'message': 'Passwords do not match'
            }), 400
        
        # Check if email already exists (if provided)
        if email and User.query.filter_by(email=email).first():
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 400
        
        # Handle admin user creation/update
        if admin_user and not admin_user.password_hash:
            # Update existing admin user
            admin_user.username = username
            admin_user.password_hash = generate_password_hash(password)
            admin_user.email = email if email else None
            db.session.commit()
            
            audit_log('admin_account_updated', {'username': username, 'email': email})
            message = 'Admin account updated successfully'
        else:
            # Create new admin user
            # Check if username already exists (only for new users)
            if User.query.filter_by(username=username).first():
                return jsonify({
                    'success': False,
                    'message': 'Username already exists'
                }), 400
            
            new_admin_user = User(
                username=username,
                password_hash=generate_password_hash(password),
                email=email if email else None,
                is_admin=True,
                is_active=True
            )
            db.session.add(new_admin_user)
            db.session.commit()
            
            audit_log('admin_account_created', {'username': username, 'email': email})
            message = 'Admin account created successfully'
        
        return jsonify({
            'success': True,
            'message': message,
            'user': {
                'id': admin_user.id if admin_user else new_admin_user.id,
                'username': username,
                'is_admin': True
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Admin setup error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while setting up admin account'
        }), 500

@auth_bp.route('/setup/status', methods=['GET'])
def setup_status():
    """
    Check if admin setup is required.
    
    Response:
    {
        "setup_required": true,
        "has_admin": false
    }
    """
    try:
        admin_user = User.query.filter_by(is_admin=True).first()
        setup_required = not admin_user or not admin_user.password_hash
        
        return jsonify({
            'setup_required': setup_required,
            'has_admin': bool(admin_user)
        }), 200
        
    except Exception as e:
        logger.error(f"Setup status error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while checking setup status'
        }), 500

@auth_bp.route('/reset-password', methods=['POST'])
@login_required
def reset_password():
    """
    Reset user password (admin only for other users, self for own password).
    
    Request Body:
    {
        "user_id": 2,  // Optional, if not provided resets own password
        "new_password": "newpassword",
        "confirm_password": "newpassword"
    }
    
    Response:
    {
        "success": true,
        "message": "Password reset successfully"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        user_id = data.get('user_id')
        new_password = data.get('new_password', '')
        confirm_password = data.get('confirm_password', '')
        
        # Determine target user
        if user_id:
            # Admin resetting another user's password
            if not current_user.is_admin:
                return jsonify({
                    'success': False,
                    'message': 'Admin privileges required'
                }), 403
            
            target_user = User.query.get_or_404(user_id)
        else:
            # User resetting their own password
            target_user = current_user
        
        # Validate password
        if len(new_password) < 8:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 8 characters long'
            }), 400
        
        if new_password != confirm_password:
            return jsonify({
                'success': False,
                'message': 'Passwords do not match'
            }), 400
        
        # Update password
        target_user.password_hash = generate_password_hash(new_password)
        db.session.commit()
        
        logger.info(f"Password reset for user {target_user.username} by {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': f'Password reset successfully for {target_user.username}'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Password reset error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while resetting password'
        }), 500
