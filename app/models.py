from .extensions import db
from flask_login import UserMixin

class User(db.Model, UserMixin):
    """User model to store the username and password."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    @property
    def server_count(self):
        """Get the number of servers owned by this user."""
        return len(self.servers)
    
    @property
    def total_memory_allocated(self):
        """Get the total memory allocated by this user's servers."""
        return sum(server.memory_mb for server in self.servers)

class Server(db.Model):
    """Server model to store the status and configuration."""
    id = db.Column(db.Integer, primary_key=True)
    server_name = db.Column(db.String(150), nullable=False, unique=True)
    version = db.Column(db.String(50), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(10), nullable=False)  # 'Running' or 'Stopped'
    pid = db.Column(db.Integer)  # Process ID
    level_seed = db.Column(db.String(150))
    gamemode = db.Column(db.String(50))
    difficulty = db.Column(db.String(50))
    hardcore = db.Column(db.Boolean)
    pvp = db.Column(db.Boolean)
    spawn_monsters = db.Column(db.Boolean)
    motd = db.Column(db.String(150))
    memory_mb = db.Column(db.Integer, nullable=False, default=1024)  # Memory allocation in MB
    owner_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    owner = db.relationship('User', backref=db.backref('servers', lazy=True))
