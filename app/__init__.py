from flask import Flask
from .config import Config
from .extensions import db, login_manager
from .models import User
from .routes.auth_routes import auth_bp
from .routes.server_routes import server_bp
from .utils import check_admin_password
from .error_handlers import init_error_handlers
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)

    # Initialize error handlers
    init_error_handlers(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(server_bp)

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
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
