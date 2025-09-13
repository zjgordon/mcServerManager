"""
Tests for database models.
"""
import pytest
from app.models import User, Server
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash


class TestUserModel:
    """Test User model functionality."""
    
    def test_user_creation(self, app):
        """Test creating a new user."""
        with app.app_context():
            user = User(
                username='testuser',
                password_hash=generate_password_hash('testpass'),
                is_admin=False
            )
            db.session.add(user)
            db.session.commit()
            
            # Verify user was created
            created_user = User.query.filter_by(username='testuser').first()
            assert created_user is not None
            assert created_user.username == 'testuser'
            assert created_user.is_admin is False
            assert check_password_hash(created_user.password_hash, 'testpass')
    
    def test_user_unique_username(self, app):
        """Test that usernames must be unique."""
        with app.app_context():
            # Create first user
            user1 = User(
                username='testuser',
                password_hash=generate_password_hash('pass1'),
                is_admin=False
            )
            db.session.add(user1)
            db.session.commit()
            
            # Try to create second user with same username
            user2 = User(
                username='testuser',
                password_hash=generate_password_hash('pass2'),
                is_admin=False
            )
            db.session.add(user2)
            
            with pytest.raises(Exception):  # Should raise IntegrityError
                db.session.commit()
    
    def test_user_admin_flag(self, app):
        """Test admin flag functionality."""
        with app.app_context():
            # Create admin user
            admin = User(
                username='admin_models',
                password_hash=generate_password_hash('adminpass'),
                is_admin=True
            )
            db.session.add(admin)
            
            # Create regular user
            user = User(
                username='user',
                password_hash=generate_password_hash('userpass'),
                is_admin=False
            )
            db.session.add(user)
            db.session.commit()
            
            # Verify admin status
            admin_user = User.query.filter_by(username='admin_models').first()
            regular_user = User.query.filter_by(username='user').first()
            
            assert admin_user.is_admin is True
            assert regular_user.is_admin is False
    
    def test_user_default_admin_false(self, app):
        """Test that is_admin defaults to False."""
        with app.app_context():
            user = User(
                username='testuser',
                password_hash=generate_password_hash('testpass')
                # is_admin not specified
            )
            db.session.add(user)
            db.session.commit()
            
            created_user = User.query.filter_by(username='testuser').first()
            assert created_user.is_admin is False
    
    def test_user_password_nullable(self, app):
        """Test that password_hash can be null (for initial admin setup)."""
        with app.app_context():
            user = User(
                username='admin_models',
                password_hash=None,
                is_admin=True
            )
            db.session.add(user)
            db.session.commit()
            
            created_user = User.query.filter_by(username='admin_models').first()
            assert created_user.password_hash is None
    
    def test_user_flask_login_integration(self, app):
        """Test Flask-Login integration."""
        with app.app_context():
            user = User(
                username='testuser',
                password_hash=generate_password_hash('testpass'),
                is_admin=False
            )
            db.session.add(user)
            db.session.commit()
            
            # Test UserMixin methods
            assert user.is_authenticated is True
            assert user.is_active is True
            assert user.is_anonymous is False
            assert user.get_id() == str(user.id)


class TestServerModel:
    """Test Server model functionality."""
    
    def test_server_creation(self, app):
        """Test creating a new server."""
        with app.app_context():
            # Create admin user in the same session context
            admin_user = User(
                username='admin_models',
                password_hash='test_hash',
                is_admin=True,
                is_active=True
            )
            db.session.add(admin_user)
            db.session.commit()
            
            server = Server(
                server_name='testserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                pid=None,
                level_seed='testseed',
                gamemode='survival',
                difficulty='normal',
                hardcore=False,
                pvp=True,
                spawn_monsters=True,
                motd='Test Server',
                memory_mb=1024,
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            # Verify server was created
            created_server = Server.query.filter_by(server_name='testserver').first()
            assert created_server is not None
            assert created_server.server_name == 'testserver'
            assert created_server.version == '1.20.1'
            assert created_server.port == 25565
            assert created_server.status == 'Stopped'
            assert created_server.pid is None
            assert created_server.level_seed == 'testseed'
            assert created_server.gamemode == 'survival'
            assert created_server.difficulty == 'normal'
            assert created_server.hardcore is False
            assert created_server.pvp is True
            assert created_server.spawn_monsters is True
            assert created_server.motd == 'Test Server'
    
    def test_server_unique_name(self, app):
        """Test that server names must be unique."""
        with app.app_context():
            # Create admin user in the same session context
            admin_user = User(
                username='admin_models',
                password_hash='test_hash',
                is_admin=True,
                is_active=True
            )
            db.session.add(admin_user)
            db.session.commit()
            
            # Create first server
            server1 = Server(
                server_name='testserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                owner_id=admin_user.id
            )
            db.session.add(server1)
            db.session.commit()
            
            # Try to create second server with same name
            server2 = Server(
                server_name='testserver',
                version='1.19.4',
                port=25575,
                status='Stopped',
                owner_id=admin_user.id
            )
            db.session.add(server2)
            
            with pytest.raises(Exception):  # Should raise IntegrityError
                db.session.commit()
    
    def test_server_required_fields(self, app):
        """Test that required fields are enforced."""
        with app.app_context():
            # Try to create server without required fields
            incomplete_server = Server()
            db.session.add(incomplete_server)
            
            with pytest.raises(Exception):  # Should raise IntegrityError
                db.session.commit()
    
    def test_server_nullable_fields(self, app, admin_user):
        """Test that nullable fields can be None."""
        with app.app_context():
            server = Server(
                server_name='minimalserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                owner_id=admin_user.id
                # All other fields should be nullable
            )
            db.session.add(server)
            db.session.commit()
            
            created_server = Server.query.filter_by(server_name='minimalserver').first()
            assert created_server is not None
            assert created_server.pid is None
            assert created_server.level_seed is None
            assert created_server.gamemode is None
            assert created_server.difficulty is None
            assert created_server.hardcore is None
            assert created_server.pvp is None
            assert created_server.spawn_monsters is None
            assert created_server.motd is None
    
    def test_server_boolean_fields(self, app, admin_user):
        """Test boolean field handling."""
        with app.app_context():
            server = Server(
                server_name='boolserver',
                version='1.20.1',
                port=25565,
                status='Running',
                hardcore=True,
                pvp=False,
                spawn_monsters=True,
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            created_server = Server.query.filter_by(server_name='boolserver').first()
            assert created_server.hardcore is True
            assert created_server.pvp is False
            assert created_server.spawn_monsters is True
    
    def test_server_status_values(self, app, admin_user):
        """Test different server status values."""
        with app.app_context():
            # Test Running status
            running_server = Server(
                server_name='runningserver',
                version='1.20.1',
                port=25565,
                status='Running',
                pid=12345,
                owner_id=admin_user.id
            )
            db.session.add(running_server)
            
            # Test Stopped status
            stopped_server = Server(
                server_name='stoppedserver',
                version='1.20.1',
                port=25575,
                status='Stopped',
                pid=None,
                owner_id=admin_user.id
            )
            db.session.add(stopped_server)
            db.session.commit()
            
            # Verify statuses
            running = Server.query.filter_by(server_name='runningserver').first()
            stopped = Server.query.filter_by(server_name='stoppedserver').first()
            
            assert running.status == 'Running'
            assert running.pid == 12345
            assert stopped.status == 'Stopped'
            assert stopped.pid is None
    
    def test_server_port_type(self, app, admin_user):
        """Test that port is stored as integer."""
        with app.app_context():
            server = Server(
                server_name='portserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            created_server = Server.query.filter_by(server_name='portserver').first()
            assert isinstance(created_server.port, int)
            assert created_server.port == 25565
    
    def test_server_string_length_limits(self, app, admin_user):
        """Test string field length constraints."""
        with app.app_context():
            # Test maximum length strings
            server = Server(
                server_name='a' * 150,  # Max length for server_name
                version='a' * 50,       # Max length for version
                port=25565,
                status='Running',       # Max length for status is 10
                level_seed='a' * 150,   # Max length for level_seed
                gamemode='a' * 50,      # Max length for gamemode
                difficulty='a' * 50,    # Max length for difficulty
                motd='a' * 150,        # Max length for motd
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            # Should succeed with max length strings
            created_server = Server.query.filter_by(server_name='a' * 150).first()
            assert created_server is not None
    
    def test_multiple_servers_different_ports(self, app, admin_user):
        """Test creating multiple servers with different ports."""
        with app.app_context():
            servers_data = [
                ('server1', 25565),
                ('server2', 25575),
                ('server3', 25585)
            ]
            
            for name, port in servers_data:
                server = Server(
                    server_name=name,
                    version='1.20.1',
                    port=port,
                    status='Stopped',
                    owner_id=admin_user.id
                )
                db.session.add(server)
            
            db.session.commit()
            
            # Verify all servers were created
            for name, port in servers_data:
                server = Server.query.filter_by(server_name=name).first()
                assert server is not None
                assert server.port == port
