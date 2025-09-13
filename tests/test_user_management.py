"""
Tests for user management functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.models import User, Server
from app.extensions import db
from datetime import datetime


class TestUserModel:
    """Test User model functionality."""
    
    def test_user_creation(self, app):
        """Test creating a user with all fields."""
        with app.app_context():
            user = User(
                username='testuser',
                password_hash='hashed_password',
                email='test@example.com',
                is_admin=False,
                is_active=True
            )
            db.session.add(user)
            db.session.commit()
            
            assert user.id is not None
            assert user.username == 'testuser'
            assert user.email == 'test@example.com'
            assert user.is_admin is False
            assert user.is_active is True
            assert user.created_at is not None
    
    def test_user_properties(self, app):
        """Test user properties for server count and memory."""
        with app.app_context():
            # Create user
            user = User(username='testuser', password_hash='hash')
            db.session.add(user)
            db.session.commit()
            
            # Create servers for this user
            server1 = Server(
                server_name='server1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=user.id
            )
            server2 = Server(
                server_name='server2',
                version='1.20.1',
                port=25575,
                status='Running',
                memory_mb=2048,
                owner_id=user.id
            )
            db.session.add_all([server1, server2])
            db.session.commit()
            
            # Test properties
            assert user.server_count == 2
            assert user.total_memory_allocated == 3072  # 1024 + 2048
    
    def test_user_repr(self, app):
        """Test user string representation."""
        with app.app_context():
            user = User(username='testuser', password_hash='hash')
            assert str(user) == '<User testuser>'


class TestAdminSetup:
    """Test admin account setup functionality."""
    
    def test_admin_setup_page_access(self, client_no_admin):
        """Test access to admin setup page."""
        response = client_no_admin.get('/set_admin_password')
        assert response.status_code == 200
        assert b'Create Admin Account' in response.data
    
    def test_admin_setup_validation(self, client_no_admin):
        """Test admin setup form validation."""
        # Test short username
        response = client_no_admin.post('/set_admin_password', data={
            'username': 'ab',
            'password': 'SecurePass123',
            'confirm_password': 'SecurePass123'
        })
        assert b'Username must be at least 3 characters long' in response.data
        
        # Test short password
        response = client_no_admin.post('/set_admin_password', data={
            'username': 'admin',
            'password': '123',
            'confirm_password': '123'
        })
        assert b'Password must be at least 8 characters long' in response.data
        
        # Test password mismatch
        response = client_no_admin.post('/set_admin_password', data={
            'username': 'admin',
            'password': 'SecurePass123',
            'confirm_password': 'SecurePass456'
        })
        assert b'Passwords do not match' in response.data
    
    def test_admin_setup_success(self, client_no_admin, app_no_admin):
        """Test successful admin account creation."""
        with app_no_admin.app_context():
            # Ensure no admin exists (should already be the case with app_no_admin)
            User.query.filter_by(is_admin=True).delete()
            db.session.commit()
            
            response = client_no_admin.post('/set_admin_password', data={
                'username': 'admin',
                'email': 'admin@example.com',
                'password': 'SecurePass123',
                'confirm_password': 'SecurePass123'
            })
            
            # Should redirect to login
            assert response.status_code == 302
            
            # Check admin was created
            admin = User.query.filter_by(username='admin').first()
            assert admin is not None
            assert admin.is_admin is True
            assert admin.email == 'admin@example.com'
            assert admin.is_active is True


class TestUserAuthentication:
    """Test user authentication functionality."""
    
    def test_login_success(self, client, app):
        """Test successful login."""
        with app.app_context():
            # Create user
            user = User(
                username='testuser',
                password_hash='pbkdf2:sha256:600000$hash',
                is_active=True
            )
            db.session.add(user)
            db.session.commit()
            
            # Mock password check
            with patch('app.routes.auth_routes.check_password_hash', return_value=True):
                response = client.post('/login', data={
                    'username': 'testuser',
                    'password': 'password123'
                })
                
                assert response.status_code == 302  # Redirect to home
    
    def test_login_inactive_user(self, client, app):
        """Test login with inactive user."""
        with app.app_context():
            # Create inactive user
            user = User(
                username='inactive',
                password_hash='hash',
                is_active=False
            )
            db.session.add(user)
            db.session.commit()
            
            response = client.post('/login', data={
                'username': 'inactive',
                'password': 'password123'
            })
            
            assert b'Invalid username or password' in response.data
    
    def test_logout(self, client, app):
        """Test user logout."""
        with app.app_context():
            # Create and login user
            user = User(username='testuser', password_hash='hash')
            db.session.add(user)
            db.session.commit()
            
            with client.session_transaction() as sess:
                sess['_user_id'] = str(user.id)
                sess['_fresh'] = True
            
            response = client.get('/logout')
            assert response.status_code == 302  # Redirect to login


class TestUserManagement:
    """Test user management functionality."""
    
    def test_add_user_admin_only(self, client, app):
        """Test that only admins can add users."""
        with app.app_context():
            # Create regular user
            user = User(username='regular', password_hash='hash', is_admin=False)
            db.session.add(user)
            db.session.commit()
            
            # Login as regular user
            with client.session_transaction() as sess:
                sess['_user_id'] = str(user.id)
                sess['_fresh'] = True
            
            response = client.get('/add_user')
            assert response.status_code == 302  # Redirect due to admin requirement
    
    def test_add_user_success(self, client, app):
        """Test successful user addition by admin."""
        with app.app_context():
            # Create admin user
            admin = User(username='admin_user_mgmt', password_hash='hash', is_admin=True)
            db.session.add(admin)
            db.session.commit()
            
            # Login as admin
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            response = client.post('/add_user', data={
                'username': 'newuser',
                'email': 'new@example.com',
                'password': 'password123',
                'confirm_password': 'password123',
                'is_admin': 'on'
            })
            
            assert response.status_code == 302  # Redirect to manage_users
            
            # Check user was created
            new_user = User.query.filter_by(username='newuser').first()
            assert new_user is not None
            assert new_user.email == 'new@example.com'
            assert new_user.is_admin is True
    
    def test_manage_users_page(self, client, app):
        """Test manage users page access."""
        with app.app_context():
            # Create admin user
            admin = User(username='admin_user_mgmt', password_hash='hash', is_admin=True)
            db.session.add(admin)
            db.session.commit()
            
            # Login as admin
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            response = client.get('/manage_users')
            assert response.status_code == 200
            assert b'Manage Users' in response.data
    
    def test_edit_user(self, client, app):
        """Test user editing functionality."""
        with app.app_context():
            # Create admin and regular user
            admin = User(username='admin_user_mgmt', password_hash='hash', is_admin=True)
            user = User(username='testuser', password_hash='hash', is_admin=False)
            db.session.add_all([admin, user])
            db.session.commit()
            
            # Login as admin
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            response = client.post(f'/edit_user/{user.id}', data={
                'username': 'updateduser',
                'email': 'updated@example.com',
                'is_admin': 'on',
                'is_active': 'on'
            })
            
            assert response.status_code == 302  # Redirect to manage_users
            
            # Check user was updated
            updated_user = User.query.get(user.id)
            assert updated_user.username == 'updateduser'
            assert updated_user.email == 'updated@example.com'
            assert updated_user.is_admin is True
            assert updated_user.is_active is True
    
    def test_delete_user(self, client, app):
        """Test user deletion functionality."""
        with app.app_context():
            # Create admin and regular user
            admin = User(username='admin_user_mgmt', password_hash='hash', is_admin=True)
            user = User(username='testuser', password_hash='hash', is_admin=False)
            db.session.add_all([admin, user])
            db.session.commit()
            
            # Login as admin
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            response = client.post(f'/delete_user/{user.id}')
            assert response.status_code == 302  # Redirect to manage_users
            
            # Check user was deleted
            deleted_user = User.query.get(user.id)
            assert deleted_user is None
    
    def test_delete_user_with_servers(self, client, app):
        """Test that users with servers cannot be deleted."""
        with app.app_context():
            # Create admin and user first
            admin = User(username='admin_user_mgmt', password_hash='hash', is_admin=True)
            user = User(username='testuser', password_hash='hash', is_admin=False)
            db.session.add_all([admin, user])
            db.session.commit()
            
            # Create server with user.id
            server = Server(
                server_name='testserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=user.id
            )
            db.session.add(server)
            db.session.commit()
            
            # Login as admin
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            response = client.post(f'/delete_user/{user.id}')
            assert response.status_code == 302  # Redirect to manage_users
            
            # Check user was not deleted
            user_still_exists = User.query.get(user.id)
            assert user_still_exists is not None


class TestServerOwnership:
    """Test server ownership functionality."""
    
    def test_server_creation_ownership(self, client, app):
        """Test that servers are created with correct ownership."""
        with app.app_context():
            # Create user
            user = User(username='testuser', password_hash='hash')
            db.session.add(user)
            db.session.commit()
            
            # Login as user
            with client.session_transaction() as sess:
                sess['_user_id'] = str(user.id)
                sess['_fresh'] = True
            
            # Mock server creation process
            with patch('app.routes.server_routes.find_next_available_port') as mock_port, \
                 patch('app.routes.server_routes.get_version_info') as mock_version, \
                 patch('requests.get') as mock_requests, \
                 patch('subprocess.Popen') as mock_popen, \
                 patch('subprocess.check_output') as mock_check_output, \
                 patch('os.makedirs'), \
                 patch('os.path.exists') as mock_exists, \
                 patch('builtins.open', create=True) as mock_open, \
                 patch('app.error_handlers.SafeFileOperation') as mock_safe_file, \
                 patch('app.error_handlers.SafeDatabaseOperation') as mock_safe_db, \
                 patch('time.sleep') as mock_sleep:
                
                mock_port.return_value = 25565
                mock_version.return_value = {
                    'downloads': {'server': {'url': 'http://example.com/server.jar'}}
                }
                mock_response = MagicMock()
                mock_response.iter_content.return_value = [b'jar content']
                mock_response.raise_for_status.return_value = None
                mock_requests.return_value = mock_response
                
                # Mock Java version check
                mock_check_output.return_value = "java version 1.8.0_291"
                
                # Mock subprocess for server startup
                mock_process = MagicMock()
                mock_process.pid = 12345
                mock_process.poll.return_value = None  # Process is running
                mock_process.communicate.return_value = ("Server started", "")
                mock_popen.return_value = mock_process
                
                mock_file = MagicMock()
                mock_file.__enter__.return_value.read.return_value = "template {server_port}"
                mock_file.__enter__.return_value.write.return_value = None
                mock_open.return_value = mock_file
                
                # Mock file existence checks
                def mock_exists_side_effect(path):
                    # Return True for server JAR file and EULA file
                    if 'server.jar' in path or 'eula.txt' in path or 'server.properties' in path:
                        return True
                    return False
                mock_exists.side_effect = mock_exists_side_effect
                
                # Mock context managers
                mock_safe_file.return_value.__enter__.return_value = mock_file
                mock_safe_file.return_value.__exit__.return_value = None
                
                # Mock the SafeDatabaseOperation to actually commit
                def mock_db_context_manager(session):
                    class MockContext:
                        def __enter__(self):
                            return session
                        def __exit__(self, exc_type, exc_val, exc_tb):
                            if not exc_type:
                                session.commit()
                            return False  # Don't suppress exceptions
                    return MockContext()
                mock_safe_db.side_effect = mock_db_context_manager
                
                # Mock time.sleep to prevent actual delays
                mock_sleep.return_value = None
                
                # Mock os.path.getsize to return non-zero for server JAR
                with patch('os.path.getsize') as mock_getsize:
                    mock_getsize.return_value = 1024  # Non-zero size
                    
                    response = client.post('/configure_server', data={
                        'server_name': 'testserver',
                        'level_seed': 'test',
                        'gamemode': 'survival',
                        'difficulty': 'normal',
                        'motd': 'Test Server',
                        'memory_mb': '1024'
                    }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Check server was created with correct ownership
                server = Server.query.filter_by(server_name='testserver').first()
                assert server is not None
                assert server.owner_id == user.id
    
    def test_server_access_control(self, client, app):
        """Test that users can only access their own servers."""
        with app.app_context():
            # Create two users
            user1 = User(username='user1', password_hash='hash')
            user2 = User(username='user2', password_hash='hash')
            db.session.add_all([user1, user2])
            db.session.commit()
            
            # Create servers for each user
            server1 = Server(
                server_name='server1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=user1.id
            )
            server2 = Server(
                server_name='server2',
                version='1.20.1',
                port=25575,
                status='Stopped',
                memory_mb=1024,
                owner_id=user2.id
            )
            db.session.add_all([server1, server2])
            db.session.commit()
            
            # Login as user1
            with client.session_transaction() as sess:
                sess['_user_id'] = str(user1.id)
                sess['_fresh'] = True
            
            # Try to access user2's server
            response = client.post(f'/start/{server2.id}')
            assert response.status_code == 302  # Redirect due to access denied
    
    def test_admin_server_access(self, client, app):
        """Test that admins can access all servers."""
        with app.app_context():
            # Create admin and regular user
            admin = User(username='admin_user_mgmt', password_hash='hash', is_admin=True)
            user = User(username='user', password_hash='hash', is_admin=False)
            db.session.add_all([admin, user])
            db.session.commit()
            
            # Create server for regular user
            server = Server(
                server_name='testserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=user.id
            )
            db.session.add(server)
            db.session.commit()
            
            # Login as admin
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            # Admin should be able to access the server
            response = client.post(f'/start/{server.id}')
            # Should not redirect due to access denied (would be 302 for access denied)
            assert response.status_code != 302 or 'access' not in response.location


class TestMemoryManagementWithUsers:
    """Test memory management with user ownership."""
    
    def test_user_specific_memory_calculation(self, app):
        """Test memory calculation for specific users."""
        with app.app_context():
            from app.utils import get_total_allocated_memory, get_available_memory, get_memory_usage_summary
            
            # Create two users
            user1 = User(username='user1', password_hash='hash')
            user2 = User(username='user2', password_hash='hash')
            db.session.add_all([user1, user2])
            db.session.commit()
            
            # Create servers for each user
            server1 = Server(
                server_name='server1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=user1.id
            )
            server2 = Server(
                server_name='server2',
                version='1.20.1',
                port=25575,
                status='Stopped',
                memory_mb=2048,
                owner_id=user2.id
            )
            db.session.add_all([server1, server2])
            db.session.commit()
            
            # Test user-specific calculations
            user1_memory = get_total_allocated_memory(user1.id)
            user2_memory = get_total_allocated_memory(user2.id)
            total_memory = get_total_allocated_memory()
            
            assert user1_memory == 1024
            assert user2_memory == 2048
            assert total_memory == 3072
            
            # Test memory usage summary (note: get_memory_usage_summary doesn't support user_id parameter)
            user1_summary = get_memory_usage_summary()
            assert user1_summary['allocated_memory_mb'] == 3072  # Total for all users
            assert user1_summary['available_memory_mb'] == 5120  # 8192 - 3072


class TestFirstTimeSetup:
    """Test first-time application setup."""
    
    def test_index_redirect_no_admin(self, client, app):
        """Test that index redirects to admin setup when no admin exists."""
        with app.app_context():
            # Ensure no admin exists
            User.query.filter_by(is_admin=True).delete()
            db.session.commit()
            
            response = client.get('/')
            assert response.status_code == 302
            assert 'set_admin_password' in response.location
    
    def test_index_redirect_with_admin(self, client, app):
        """Test that index redirects to login when admin exists."""
        with app.app_context():
            # Create admin with password
            admin = User(
                username='admin_user_mgmt',
                password_hash='hash',
                is_admin=True,
                is_active=True
            )
            db.session.add(admin)
            db.session.commit()
            
            response = client.get('/')
            assert response.status_code == 302
            assert 'login' in response.location
