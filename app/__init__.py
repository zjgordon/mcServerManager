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

    # Run admin password check before each request
    app.before_request(check_admin_password)

    # Create database tables if they don't exist
    with app.app_context():
        db.create_all()
        # Create default admin user if none exists
        admin_username = os.environ.get('ADMIN_USERNAME', 'admin')
        if not User.query.filter_by(username=admin_username).first():
            new_user = User(username=admin_username, password_hash=None, is_admin=True)
            db.session.add(new_user)
            db.session.commit()

    return app
