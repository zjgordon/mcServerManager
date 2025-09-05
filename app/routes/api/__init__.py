"""
API Blueprint Package

This package contains all API routes for the Minecraft Server Manager.
The API provides RESTful endpoints for frontend applications and external integrations.

API Version: v1
Base URL: /api/v1
"""

from flask import Blueprint

# Create the main API blueprint
api_bp = Blueprint('api', __name__, url_prefix='/api/v1')

# Import all API route modules
from . import auth_api, server_api, admin_api

# Register sub-blueprints
api_bp.register_blueprint(auth_api.auth_bp)
api_bp.register_blueprint(server_api.server_bp)
api_bp.register_blueprint(admin_api.admin_bp)

# API Information endpoint
@api_bp.route('/')
def api_info():
    """API information and version details."""
    return {
        'name': 'Minecraft Server Manager API',
        'version': '1.0.0',
        'description': 'RESTful API for Minecraft server management',
        'endpoints': {
            'auth': '/api/v1/auth',
            'servers': '/api/v1/servers',
            'admin': '/api/v1/admin'
        },
        'documentation': '/api/v1/docs'
    }

# Health check endpoint
@api_bp.route('/health')
def health_check():
    """Health check endpoint for monitoring."""
    return {
        'status': 'healthy',
        'timestamp': '2025-09-04T00:00:00Z',
        'version': '1.0.0'
    }
