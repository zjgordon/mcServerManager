from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS

db = SQLAlchemy()
login_manager = LoginManager()
csrf = CSRFProtect()
cors = CORS()

login_manager.login_view = 'auth.login'
login_manager.login_message_category = 'info'
