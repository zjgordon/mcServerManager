from flask import Flask, request, redirect, url_for
from flask_login import current_user
from .config import Config
from .extensions import db, login_manager, csrf
from .models import User
from .routes.auth_routes import auth_bp
from .routes.server_routes import server_bp
from .utils import check_admin_password
from .error_handlers import init_error_handlers
from .security import add_security_headers, audit_log
import os
import logging

logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    # Initialize error handlers
    init_error_handlers(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(server_bp)
    
    # Template context processor for global variables
    @app.context_processor
    def inject_app_config():
        from .utils import get_app_config
        config = get_app_config()
        return {
            'app_title': config['app_title'],
            'server_hostname': config['server_hostname']
        }
    
    # Custom Jinja filters
    @app.template_filter('datetime')
    def format_datetime(timestamp):
        """Format Unix timestamp as readable datetime."""
        try:
            from datetime import datetime
            return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
        except:
            return str(timestamp)
    
    # Security middleware
    @app.after_request
    def security_headers(response):
        return add_security_headers(response)
    
    @app.before_request
    def check_admin_setup():
        """Check if admin setup is needed and redirect accordingly."""
        # Skip check for admin setup and static endpoints
        if request.endpoint in ['auth.set_admin_password', 'static'] or (request.endpoint and request.endpoint.startswith('static')):
            return
        
        # Check if any admin user exists with a password
        admin_user = User.query.filter_by(is_admin=True).first()
        if not admin_user or not admin_user.password_hash:
            # No admin user or admin has no password - redirect to setup
            return redirect(url_for('auth.set_admin_password'))
    
    @app.before_request
    def log_request():
        # Skip logging for authentication-related endpoints to avoid interference
        if request.endpoint in ['auth.login', 'auth.logout', 'auth.set_admin_password']:
            return
        
        # Only log if user is authenticated and not during login process
        if hasattr(current_user, 'is_authenticated') and current_user.is_authenticated:
            audit_log('request', {
                'method': request.method,
                'endpoint': request.endpoint,
                'path': request.path
            })

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        
        # Initialize default configuration
        from .utils import initialize_default_config
        initialize_default_config()
        
        # Reconcile server statuses with actual running processes
        from .utils import reconcile_server_statuses
        reconciliation_summary = reconcile_server_statuses()
        logger.info(f"Startup process reconciliation: {reconciliation_summary}")
        
        # Check if any admin user exists
        admin_user = User.query.filter_by(is_admin=True).first()
        if not admin_user:
            # Create default admin user without password (will be set via setup)
            admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
            new_user = User(
                username=admin_username, 
                password_hash=None, 
                is_admin=True,
                is_active=True
            )
            db.session.add(new_user)
            db.session.commit()

    return app
