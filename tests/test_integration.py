"""
Integration tests for the Minecraft Server Manager.
"""
import pytest
import os
import shutil
import tempfile
from unittest.mock import patch, MagicMock
from app.models import User, Server
from app.extensions import db
from werkzeug.security import generate_password_hash


class TestCompleteWorkflows:
    """Test complete user workflows."""
    
    def test_complete_server_lifecycle(self, client, app, admin_user):
        """Test the complete lifecycle of a server from creation to deletion."""
        with app.app_context():
            # Login as admin using the fixture
            response = client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            }, follow_redirects=True)
            assert b'Logged in successfully' in response.data
            
            # Access home page
            response = client.get('/')
            assert response.status_code == 200
            
            # Go to create server page
            with patch('app.routes.server_routes.fetch_version_manifest') as mock_fetch:
                mock_fetch.return_value = {
                    'latest': {'release': '1.20.1', 'snapshot': '23w31a'},
                    'versions': [
                        {'id': '1.20.1', 'type': 'release'},
                        {'id': '23w31a', 'type': 'snapshot'}
                    ]
                }
                
                response = client.get('/create')
                assert response.status_code == 200
                assert b'1.20.1' in response.data
            
            # Select version and go to configure
            response = client.post('/create', data={
                'version_type': 'release',
                'selected_version': '1.20.1'
            })
            assert response.status_code == 302  # Redirect to configure
            
            # Configure server
            with patch('app.routes.server_routes.find_next_available_port') as mock_port, \
                 patch('app.routes.server_routes.get_version_info') as mock_version, \
                 patch('requests.get') as mock_requests, \
                 patch('subprocess.Popen') as mock_popen, \
                 patch('os.makedirs') as mock_makedirs, \
                 patch('builtins.open', create=True) as mock_open:
                
                mock_port.return_value = 25565
                mock_version.return_value = {
                    'downloads': {'server': {'url': 'http://example.com/server.jar'}}
                }
                
                # Mock file download
                mock_response = MagicMock()
                mock_response.iter_content.return_value = [b'fake jar content']
                mock_requests.return_value = mock_response
                
                # Mock subprocess
                mock_process = MagicMock()
                mock_process.pid = 12345
                mock_popen.return_value = mock_process
                
                # Mock file operations
                mock_file = MagicMock()
                mock_file.__enter__.return_value.read.return_value = "template {server_port}"
                mock_open.return_value = mock_file
                
                response = client.post('/configure_server', data={
                    'server_name': 'testserver',
                    'level_seed': 'testseed',
                    'gamemode': 'survival',
                    'difficulty': 'normal',
                    'motd': 'Test Server'
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Should redirect (either to EULA or home)
                assert response.status_code == 302
                
                # Verify server was created in database
                server = Server.query.filter_by(server_name='testserver').first()
                assert server is not None
                assert server.version == '1.20.1'
                assert server.port == 25565
                assert server.status == 'Stopped'
            
            # Accept EULA
            server = Server.query.filter_by(server_name='testserver').first()
            with patch('os.path.exists') as mock_exists, \
                 patch('builtins.open', create=True) as mock_open:
                
                mock_exists.return_value = True
                mock_file = MagicMock()
                mock_open.return_value.__enter__.return_value = mock_file
                
                response = client.post(f'/accept_eula/{server.id}', follow_redirects=True)
                assert b'EULA accepted' in response.data
            
            # Start server
            with patch('os.path.exists') as mock_exists, \
                 patch('builtins.open', create=True) as mock_open, \
                 patch('subprocess.Popen') as mock_popen:
                
                mock_exists.return_value = True
                mock_file = MagicMock()
                mock_file.read.return_value = 'eula=true\n'
                mock_open.return_value.__enter__.return_value = mock_file
                
                mock_process = MagicMock()
                mock_process.pid = 12345
                mock_popen.return_value = mock_process
                
                response = client.post(f'/start/{server.id}', follow_redirects=True)
                assert b'started successfully' in response.data
                
                # Verify server status
                server = Server.query.get(server.id)
                assert server.status == 'Running'
                assert server.pid == 12345
            
            # Stop server
            with patch('psutil.Process') as mock_psutil:
                mock_process = MagicMock()
                mock_psutil.return_value = mock_process
                
                response = client.post(f'/stop/{server.id}', follow_redirects=True)
                assert b'stopped successfully' in response.data
                
                # Verify server status
                server = Server.query.get(server.id)
                assert server.status == 'Stopped'
                assert server.pid is None
            
            # Create backup
            with patch('psutil.Process') as mock_psutil, \
                 patch('tarfile.open') as mock_tarfile, \
                 patch('os.makedirs') as mock_makedirs:
                
                mock_tar = MagicMock()
                mock_tarfile.return_value.__enter__.return_value = mock_tar
                
                response = client.post(f'/backup/{server.id}', follow_redirects=True)
                assert b'Backup' in response.data and b'completed successfully' in response.data
            
            # Delete server
            with patch('shutil.rmtree') as mock_rmtree, \
                 patch('os.path.exists') as mock_exists:
                
                mock_exists.return_value = True
                
                response = client.post(f'/delete/{server.id}', follow_redirects=True)
                assert b'deleted successfully' in response.data
                
                # Verify server was deleted from database
                server = Server.query.filter_by(server_name='testserver').first()
                assert server is None
            
            # Logout
            response = client.get('/logout', follow_redirects=True)
            assert b'logged out' in response.data.lower()
    
    def test_multi_user_workflow(self, client, app, admin_user):
        """Test workflow with multiple users."""
        with app.app_context():
            # Login as admin using the fixture
            client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            })
            
            # Add a regular user
            response = client.post('/add_user', data={
                'username': 'regularuser',
                'password': 'userpass',
                'confirm_password': 'userpass'
            }, follow_redirects=True)
            assert b'User regularuser added successfully' in response.data
            
            # Logout admin
            client.get('/logout')
            
            # Login as regular user
            response = client.post('/login', data={
                'username': 'regularuser',
                'password': 'userpass'
            }, follow_redirects=True)
            assert b'Logged in successfully' in response.data
            
            # Regular user should be able to access home
            response = client.get('/')
            assert response.status_code == 200
            
            # But should not be able to add users
            response = client.get('/add_user', follow_redirects=True)
            assert b'Only the admin can add new users' in response.data
            
            # Regular user should be able to change their own password
            response = client.post('/change_password', data={
                'current_password': 'userpass',
                'new_password': 'newpass',
                'confirm_password': 'newpass'
            }, follow_redirects=True)
            assert b'Password changed successfully' in response.data
            
            # Verify new password works
            client.get('/logout')
            response = client.post('/login', data={
                'username': 'regularuser',
                'password': 'newpass'
            }, follow_redirects=True)
            assert b'Logged in successfully' in response.data
    
    def test_error_recovery_workflow(self, client, app, admin_user):
        """Test workflow with various error conditions."""
        with app.app_context():
            # Login using the fixture
            client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            })
            
            # Try to create server with network error
            with patch('app.routes.server_routes.fetch_version_manifest') as mock_fetch:
                import requests
                mock_fetch.side_effect = requests.exceptions.RequestException("Network error")
                
                response = client.get('/create', follow_redirects=True)
                assert b'Unexpected error: Network error' in response.data
            
            # Try to configure server with invalid data
            response = client.post('/configure_server', data={
                'server_name': 'invalid name!',  # Invalid characters
                'level_seed': 'seed',
                'gamemode': 'survival',
                'difficulty': 'normal',
                'motd': 'Test'
            }, query_string={'version_type': 'release', 'version': '1.20.1'})
            assert b'Invalid server name' in response.data
            
            # Try to configure with invalid gamemode
            response = client.post('/configure_server', data={
                'server_name': 'validname',
                'level_seed': 'seed',
                'gamemode': 'invalid',  # Invalid gamemode
                'difficulty': 'normal',
                'motd': 'Test'
            }, query_string={'version_type': 'release', 'version': '1.20.1'})
            assert b'Invalid gamemode selected' in response.data
    
    def test_concurrent_server_operations(self, client, app, admin_user):
        """Test handling of concurrent server operations."""
        with app.app_context():
            # Create servers with admin_user.id
            server1 = Server(
                server_name='concurrentserver1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                owner_id=admin_user.id
            )
            
            server2 = Server(
                server_name='concurrentserver2',
                version='1.20.1',
                port=25575,
                status='Running',
                pid=12345,
                owner_id=admin_user.id
            )
            
            db.session.add_all([server1, server2])
            db.session.commit()
            
            # Login using the fixture
            client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            })
            
            # Try to start already running server
            response = client.post(f'/start/{server2.id}', follow_redirects=True)
            assert b'already running' in response.data
            
            # Try to stop already stopped server
            response = client.post(f'/stop/{server1.id}', follow_redirects=True)
            assert b'already stopped' in response.data
    
    def test_data_persistence_workflow(self, client, app, admin_user):
        """Test that data persists correctly across operations."""
        with app.app_context():
            # Login using the fixture
            client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            })
            
            # Create server
            with patch('app.routes.server_routes.find_next_available_port') as mock_port, \
                 patch('app.routes.server_routes.get_version_info') as mock_version, \
                 patch('requests.get') as mock_requests, \
                 patch('subprocess.Popen') as mock_popen, \
                 patch('os.makedirs'), \
                 patch('builtins.open', create=True) as mock_open:
                
                mock_port.return_value = 25565
                mock_version.return_value = {
                    'downloads': {'server': {'url': 'http://example.com/server.jar'}}
                }
                mock_response = MagicMock()
                mock_response.iter_content.return_value = [b'jar']
                mock_requests.return_value = mock_response
                mock_process = MagicMock()
                mock_popen.return_value = mock_process
                mock_file = MagicMock()
                mock_file.__enter__.return_value.read.return_value = "template {server_port}"
                mock_open.return_value = mock_file
                
                client.post('/configure_server', data={
                    'server_name': 'persistentserver',
                    'level_seed': 'persistence_test',
                    'gamemode': 'creative',
                    'difficulty': 'hard',
                    'hardcore': 'on',
                    'pvp': 'on',
                    'spawn_monsters': 'on',
                    'motd': 'Persistence Test Server'
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
            
            # Verify server was created with correct data
            server = Server.query.filter_by(server_name='persistentserver').first()
            assert server is not None
            assert server.level_seed == 'persistence_test'
            assert server.gamemode == 'creative'
            assert server.difficulty == 'hard'
            assert server.hardcore is True
            assert server.pvp is True
            assert server.spawn_monsters is True
            assert server.motd == 'Persistence Test Server'
            
            server_id = server.id
            
            # Logout and login again
            client.get('/logout')
            client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            })
            
            # Verify data still exists
            admin = User.query.get(admin_user.id)
            assert admin is not None
            assert admin.username == 'admin'
            assert admin.is_admin is True
            
            server = Server.query.get(server_id)
            assert server is not None
            assert server.server_name == 'persistentserver'
            assert server.level_seed == 'persistence_test'
            assert server.gamemode == 'creative'
            assert server.difficulty == 'hard'
            assert server.hardcore is True
            assert server.pvp is True
            assert server.spawn_monsters is True
            assert server.motd == 'Persistence Test Server'
    
    def test_edge_case_workflows(self, client, app, admin_user):
        """Test edge cases and boundary conditions."""
        with app.app_context():
            # Login using the fixture
            client.post('/login', data={
                'username': 'admin',
                'password': 'adminpass'
            })
            
            # Test with maximum length inputs
            with patch('app.routes.server_routes.find_next_available_port') as mock_port, \
                 patch('app.routes.server_routes.get_version_info') as mock_version, \
                 patch('requests.get') as mock_requests, \
                 patch('subprocess.Popen') as mock_popen, \
                 patch('os.makedirs'), \
                 patch('builtins.open', create=True) as mock_open:
                
                mock_port.return_value = 25565
                mock_version.return_value = {
                    'downloads': {'server': {'url': 'http://example.com/server.jar'}}
                }
                mock_response = MagicMock()
                mock_response.iter_content.return_value = [b'jar']
                mock_requests.return_value = mock_response
                mock_process = MagicMock()
                mock_popen.return_value = mock_process
                mock_file = MagicMock()
                mock_file.__enter__.return_value.read.return_value = "template {server_port}"
                mock_open.return_value = mock_file
                
                # Test with 100-character seed (at the limit)
                response = client.post('/configure_server', data={
                    'server_name': 'maxlengthtest',
                    'level_seed': 'a' * 100,  # Exactly at the limit
                    'gamemode': 'survival',
                    'difficulty': 'normal',
                    'motd': 'a' * 150  # Exactly at the limit
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Should succeed
                assert response.status_code == 302
                
                # Test with 101-character seed (over the limit)
                response = client.post('/configure_server', data={
                    'server_name': 'overlimittest',
                    'level_seed': 'a' * 101,  # Over the limit
                    'gamemode': 'survival',
                    'difficulty': 'normal',
                    'motd': 'Test'
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Should fail
                assert b'Level seed is too long' in response.data
                
                # Test with 151-character MOTD (over the limit)
                response = client.post('/configure_server', data={
                    'server_name': 'motdoverlimit',
                    'level_seed': 'test',
                    'gamemode': 'survival',
                    'difficulty': 'normal',
                    'motd': 'a' * 151  # Over the limit
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Should fail
                assert b'MOTD is too long' in response.data
