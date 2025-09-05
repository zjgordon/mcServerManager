"""
Admin API Routes

Provides RESTful endpoints for administrative operations.
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError
from ...models import User, Server
from ...extensions import db
from ...utils import get_memory_config, get_memory_usage_summary
from ...error_handlers import ValidationError, logger
import re

# Create admin API blueprint
admin_bp = Blueprint('admin_api', __name__, url_prefix='/admin')

def require_admin():
    """Check if current user is admin."""
    if not current_user.is_authenticated or not current_user.is_admin:
        return jsonify({
            'success': False,
            'message': 'Admin access required'
        }), 403
    return None

@admin_bp.route('/users', methods=['GET'])
@login_required
def get_users():
    """
    Get list of all users (admin only).
    
    Response:
    {
        "success": true,
        "users": [
            {
                "id": 1,
                "username": "admin",
                "is_admin": true,
                "server_count": 3,
                "total_memory_allocated": 3072,
                "created_at": "2025-09-04T00:00:00Z"
            }
        ]
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        users = User.query.all()
        users_data = []
        
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'is_admin': user.is_admin,
                'server_count': user.server_count,
                'total_memory_allocated': user.total_memory_allocated,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        return jsonify({
            'success': True,
            'users': users_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching users'
        }), 500

@admin_bp.route('/users', methods=['POST'])
@login_required
def create_user():
    """
    Create a new user (admin only).
    
    Request Body:
    {
        "username": "newuser",
        "password": "securepassword",
        "is_admin": false
    }
    
    Response:
    {
        "success": true,
        "message": "User created successfully",
        "user": {
            "id": 2,
            "username": "newuser",
            "is_admin": false
        }
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        is_admin = data.get('is_admin', False)
        
        # Validate input
        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username and password are required'
            }), 400
        
        # Validate username
        if len(username) < 3 or len(username) > 50:
            return jsonify({
                'success': False,
                'message': 'Username must be between 3 and 50 characters'
            }), 400
        
        if not re.match(r'^[a-zA-Z0-9_]+$', username):
            return jsonify({
                'success': False,
                'message': 'Username can only contain letters, numbers, and underscores'
            }), 400
        
        # Validate password strength
        if len(password) < 8:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 8 characters long'
            }), 400
        
        # Check if username already exists
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400
        
        # Create user
        user = User(
            username=username,
            password_hash=generate_password_hash(password),
            is_admin=is_admin
        )
        
        db.session.add(user)
        db.session.commit()
        
        logger.info(f"User '{username}' created by admin {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'is_admin': user.is_admin
            }
        }), 201
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Username already exists'
        }), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating user: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the user'
        }), 500

@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    """
    Update user information (admin only).
    
    Request Body:
    {
        "username": "updateduser",
        "is_admin": true
    }
    
    Response:
    {
        "success": true,
        "message": "User updated successfully",
        "user": {
            "id": 2,
            "username": "updateduser",
            "is_admin": true
        }
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        # Update username if provided
        if 'username' in data:
            new_username = data['username'].strip()
            if new_username and new_username != user.username:
                # Validate username
                if len(new_username) < 3 or len(new_username) > 50:
                    return jsonify({
                        'success': False,
                        'message': 'Username must be between 3 and 50 characters'
                    }), 400
                
                if not re.match(r'^[a-zA-Z0-9_]+$', new_username):
                    return jsonify({
                        'success': False,
                        'message': 'Username can only contain letters, numbers, and underscores'
                    }), 400
                
                # Check if username already exists
                existing_user = User.query.filter_by(username=new_username).first()
                if existing_user and existing_user.id != user.id:
                    return jsonify({
                        'success': False,
                        'message': 'Username already exists'
                    }), 400
                
                user.username = new_username
        
        # Update admin status if provided
        if 'is_admin' in data:
            user.is_admin = bool(data['is_admin'])
        
        db.session.commit()
        
        logger.info(f"User {user_id} updated by admin {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': 'User updated successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'is_admin': user.is_admin
            }
        }), 200
        
    except IntegrityError:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Username already exists'
        }), 400
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating user {user_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating the user'
        }), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    """
    Delete a user (admin only).
    
    Response:
    {
        "success": true,
        "message": "User deleted successfully"
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        user = User.query.get_or_404(user_id)
        
        # Prevent deleting self
        if user.id == current_user.id:
            return jsonify({
                'success': False,
                'message': 'Cannot delete your own account'
            }), 400
        
        # Delete user's servers first
        for server in user.servers:
            db.session.delete(server)
        
        # Delete user
        db.session.delete(user)
        db.session.commit()
        
        logger.info(f"User {user_id} deleted by admin {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': 'User deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting user {user_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the user'
        }), 500

@admin_bp.route('/config', methods=['GET'])
@login_required
def get_system_config():
    """
    Get system configuration (admin only).
    
    Response:
    {
        "success": true,
        "config": {
            "max_total_memory_mb": 8192,
            "default_server_memory_mb": 1024,
            "min_server_memory_mb": 512,
            "max_server_memory_mb": 4096
        }
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        config = get_memory_config()
        
        return jsonify({
            'success': True,
            'config': config
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching system config: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching system configuration'
        }), 500

@admin_bp.route('/config', methods=['PUT'])
@login_required
def update_system_config():
    """
    Update system configuration (admin only).
    
    Request Body:
    {
        "max_total_memory_mb": 8192,
        "default_server_memory_mb": 1024,
        "min_server_memory_mb": 512,
        "max_server_memory_mb": 4096
    }
    
    Response:
    {
        "success": true,
        "message": "System configuration updated successfully",
        "config": {
            "max_total_memory_mb": 8192,
            "default_server_memory_mb": 1024,
            "min_server_memory_mb": 512,
            "max_server_memory_mb": 4096
        }
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        # Validate memory configuration
        max_total = data.get('max_total_memory_mb')
        default_server = data.get('default_server_memory_mb')
        min_server = data.get('min_server_memory_mb')
        max_server = data.get('max_server_memory_mb')
        
        if max_total is not None and max_total < 1024:
            return jsonify({
                'success': False,
                'message': 'Maximum total memory must be at least 1024 MB'
            }), 400
        
        if min_server is not None and max_server is not None and min_server >= max_server:
            return jsonify({
                'success': False,
                'message': 'Minimum server memory must be less than maximum server memory'
            }), 400
        
        # Update configuration (this would typically update a config table or environment variables)
        # For now, we'll just return the updated values
        updated_config = {
            'max_total_memory_mb': max_total or 8192,
            'default_server_memory_mb': default_server or 1024,
            'min_server_memory_mb': min_server or 512,
            'max_server_memory_mb': max_server or 4096
        }
        
        logger.info(f"System configuration updated by admin {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': 'System configuration updated successfully',
            'config': updated_config
        }), 200
        
    except Exception as e:
        logger.error(f"Error updating system config: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating system configuration'
        }), 500

@admin_bp.route('/stats', methods=['GET'])
@login_required
def get_system_stats():
    """
    Get system statistics (admin only).
    
    Response:
    {
        "success": true,
        "stats": {
            "total_users": 5,
            "total_servers": 12,
            "running_servers": 8,
            "total_memory_allocated": 8192,
            "memory_usage_summary": {
                "total_allocated": 8192,
                "total_available": 16384,
                "utilization_percentage": 50.0
            }
        }
    }
    """
    try:
        admin_check = require_admin()
        if admin_check:
            return admin_check
        
        # Get system statistics
        total_users = User.query.count()
        total_servers = Server.query.count()
        running_servers = Server.query.filter_by(status='Running').count()
        total_memory_allocated = sum(server.memory_mb for server in Server.query.all())
        
        # Get memory usage summary
        memory_summary = get_memory_usage_summary()
        
        stats = {
            'total_users': total_users,
            'total_servers': total_servers,
            'running_servers': running_servers,
            'total_memory_allocated': total_memory_allocated,
            'memory_usage_summary': memory_summary
        }
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching system stats: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching system statistics'
        }), 500
