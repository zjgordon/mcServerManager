"""
Tests for server management routes and functionality.
"""
import pytest
import os
import tempfile
import shutil
from unittest.mock import patch, MagicMock
from app.models import Server, User
from app.extensions import db


class TestServerRoutes:
    """Test server management functionality."""
    
    def test_home_page_requires_login(self, client):
        """Test that home page requires authentication."""
        response = client.get('/')
        assert response.status_code == 302  # Redirect to login
    
    def test_home_page_authenticated(self, authenticated_client, test_server):
        """Test home page loads with authenticated user."""
        response = authenticated_client.get('/')
        assert response.status_code == 200
        assert b'testserver' in response.data
    
    def test_create_server_page_loads(self, authenticated_client):
        """Test that create server page loads."""
        with patch('app.routes.server_routes.fetch_version_manifest') as mock_fetch:
            mock_fetch.return_value = {
                'latest': {'release': '1.20.1', 'snapshot': '23w31a'},
                'versions': [
                    {'id': '1.20.1', 'type': 'release'},
                    {'id': '23w31a', 'type': 'snapshot'}
                ]
            }
            
            response = authenticated_client.get('/create')
            assert response.status_code == 200
            assert b'1.20.1' in response.data
    
    def test_create_server_network_error(self, authenticated_client):
        """Test create server page with network error."""
        with patch('app.routes.server_routes.fetch_version_manifest') as mock_fetch:
            import requests
            mock_fetch.side_effect = requests.exceptions.RequestException("Network error")
            
            response = authenticated_client.get('/create', follow_redirects=True)
            # The error message should be "Unexpected error: Network error" from safe_execute
            assert b'Unexpected error: Network error' in response.data
    
    @patch('app.routes.server_routes.find_next_available_port')
    @patch('app.routes.server_routes.get_version_info')
    @patch('requests.get')
    @patch('subprocess.Popen')
    @patch('os.makedirs')
    @patch('os.path.exists')
    def test_configure_server_success(self, mock_exists, mock_makedirs, mock_popen, 
                                    mock_requests, mock_version_info, mock_port,
                                    authenticated_client, app, temp_server_dir):
        """Test successful server configuration."""
        # Setup mocks
        mock_port.return_value = 25565
        mock_version_info.return_value = {
            'downloads': {'server': {'url': 'http://example.com/server.jar'}}
        }
        mock_response = MagicMock()
        mock_response.iter_content.return_value = [b'fake jar content']
        mock_requests.return_value = mock_response
        mock_exists.return_value = False
        
        # Mock subprocess
        mock_process = MagicMock()
        mock_process.pid = 12345
        mock_popen.return_value = mock_process
        
        # Mock file operations
        with patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = "template content {server_port}"
            mock_open.return_value.__enter__.return_value.write.return_value = None
            
            response = authenticated_client.post('/configure_server', data={
                'server_name': 'testserver',
                'level_seed': 'testseed',
                'gamemode': 'survival',
                'difficulty': 'normal',
                'motd': 'Test MOTD'
            }, query_string={'version_type': 'release', 'version': '1.20.1'})
            
            # Should redirect to EULA acceptance or home
            assert response.status_code == 302
    
    def test_configure_server_invalid_name(self, authenticated_client):
        """Test server configuration with invalid name."""
        response = authenticated_client.post('/configure_server', data={
            'server_name': 'invalid name!',
            'level_seed': 'testseed',
            'gamemode': 'survival',
            'difficulty': 'normal',
            'motd': 'Test MOTD'
        }, query_string={'version_type': 'release', 'version': '1.20.1'}, follow_redirects=True)
        
        assert b'Invalid server name' in response.data
    
    def test_configure_server_invalid_gamemode(self, authenticated_client):
        """Test server configuration with invalid gamemode."""
        response = authenticated_client.post('/configure_server', data={
            'server_name': 'testserver',
            'level_seed': 'testseed',
            'gamemode': 'invalid',
            'difficulty': 'normal',
            'motd': 'Test MOTD'
        }, query_string={'version_type': 'release', 'version': '1.20.1'}, follow_redirects=True)
        
        assert b'Invalid gamemode selected' in response.data
    
    def test_configure_server_duplicate_name(self, authenticated_client, test_server):
        """Test server configuration with duplicate name."""
        response = authenticated_client.post('/configure_server', data={
            'server_name': 'testserver',  # Same as test_server
            'level_seed': 'testseed',
            'gamemode': 'survival',
            'difficulty': 'normal',
            'motd': 'Test MOTD'
        }, query_string={'version_type': 'release', 'version': '1.20.1'}, follow_redirects=True)
        
        assert b'server with this name already exists' in response.data
    
    def test_configure_server_long_seed(self, authenticated_client):
        """Test server configuration with overly long seed."""
        long_seed = 'a' * 101  # 101 characters
        response = authenticated_client.post('/configure_server', data={
            'server_name': 'testserver',
            'level_seed': long_seed,
            'gamemode': 'survival',
            'difficulty': 'normal',
            'motd': 'Test MOTD'
        }, query_string={'version_type': 'release', 'version': '1.20.1'}, follow_redirects=True)
        
        assert b'Level seed is too long' in response.data
    
    def test_configure_server_long_motd(self, authenticated_client):
        """Test server configuration with overly long MOTD."""
        long_motd = 'a' * 151  # 151 characters
        response = authenticated_client.post('/configure_server', data={
            'server_name': 'testserver',
            'level_seed': 'testseed',
            'gamemode': 'survival',
            'difficulty': 'normal',
            'motd': long_motd
        }, query_string={'version_type': 'release', 'version': '1.20.1'}, follow_redirects=True)
        
        assert b'MOTD is too long' in response.data
    
    @patch('psutil.Process')
    def test_start_server_success(self, mock_psutil, authenticated_client, app, test_server):
        """Test starting a server successfully."""
        # Create EULA file
        server_dir = f'servers/{test_server.server_name}'
        os.makedirs(server_dir, exist_ok=True)
        eula_path = os.path.join(server_dir, 'eula.txt')
        with open(eula_path, 'w') as f:
            f.write('eula=true\n')
        
        with patch('subprocess.Popen') as mock_popen:
            mock_process = MagicMock()
            mock_process.pid = 12345
            mock_popen.return_value = mock_process
            
            response = authenticated_client.post(f'/start/{test_server.id}', follow_redirects=True)
            assert response.status_code == 200
            # Check that we're on the home page after start attempt
            assert b'your minecraft servers' in response.data.lower()
        
        # Cleanup
        shutil.rmtree(server_dir, ignore_errors=True)
    
    def test_start_server_no_eula(self, authenticated_client, test_server):
        """Test starting server without EULA acceptance."""
        response = authenticated_client.post(f'/start/{test_server.id}', follow_redirects=True)
        assert b'eula.txt not found' in response.data
    
    def test_start_server_eula_not_accepted(self, authenticated_client, test_server):
        """Test starting server with EULA not accepted."""
        # Create EULA file with eula=false
        server_dir = f'servers/{test_server.server_name}'
        os.makedirs(server_dir, exist_ok=True)
        eula_path = os.path.join(server_dir, 'eula.txt')
        with open(eula_path, 'w') as f:
            f.write('eula=false\n')
        
        response = authenticated_client.post(f'/start/{test_server.id}', follow_redirects=True)
        assert b'must accept the EULA' in response.data
        
        # Cleanup
        shutil.rmtree(server_dir, ignore_errors=True)
    
    def test_start_already_running_server(self, authenticated_client, app, test_server):
        """Test starting a server that's already running."""
        # Set server as running
        with app.app_context():
            server = Server.query.get(test_server.id)
            server.status = 'Running'
            server.pid = 12345
            db.session.commit()
        
        response = authenticated_client.post(f'/start/{test_server.id}', follow_redirects=True)
        assert b'already running' in response.data
    
    @patch('psutil.Process')
    def test_stop_server_success(self, mock_psutil, authenticated_client, app, test_server):
        """Test stopping a running server."""
        # Set server as running
        with app.app_context():
            server = Server.query.get(test_server.id)
            server.status = 'Running'
            server.pid = 12345
            db.session.commit()
        
        # Mock psutil process
        mock_process = MagicMock()
        mock_psutil.return_value = mock_process
        
        response = authenticated_client.post(f'/stop/{test_server.id}', follow_redirects=True)
        assert response.status_code == 200
        assert b'stopped successfully' in response.data
        
        # Verify server status updated
        with app.app_context():
            server = Server.query.get(test_server.id)
            assert server.status == 'Stopped'
            assert server.pid is None
    
    def test_stop_already_stopped_server(self, authenticated_client, test_server):
        """Test stopping a server that's already stopped."""
        response = authenticated_client.post(f'/stop/{test_server.id}', follow_redirects=True)
        assert b'already stopped' in response.data
    
    @patch('psutil.Process')
    @patch('psutil.NoSuchProcess')
    def test_stop_server_no_process(self, mock_no_process, mock_psutil, 
                                  authenticated_client, app, test_server):
        """Test stopping server when process doesn't exist."""
        # Set server as running
        with app.app_context():
            server = Server.query.get(test_server.id)
            server.status = 'Running'
            server.pid = 12345
            db.session.commit()
        
        # Mock psutil to raise NoSuchProcess
        mock_psutil.side_effect = mock_no_process
        
        response = authenticated_client.post(f'/stop/{test_server.id}', follow_redirects=True)
        assert b'was not running' in response.data
    
    @patch('shutil.rmtree')
    @patch('os.path.exists')
    def test_delete_server_success(self, mock_exists, mock_rmtree, 
                                 authenticated_client, app, test_server):
        """Test deleting a server successfully."""
        mock_exists.return_value = True
        
        response = authenticated_client.post(f'/delete/{test_server.id}', follow_redirects=True)
        assert response.status_code == 200
        assert b'deleted successfully' in response.data
        
        # Verify server was deleted from database
        with app.app_context():
            server = Server.query.get(test_server.id)
            assert server is None
    
    def test_accept_eula_page_loads(self, authenticated_client, test_server):
        """Test EULA acceptance page loads."""
        # Create server directory and eula.txt
        server_dir = f'servers/{test_server.server_name}'
        os.makedirs(server_dir, exist_ok=True)
        eula_path = os.path.join(server_dir, 'eula.txt')
        with open(eula_path, 'w') as f:
            f.write('eula=false\n')
        
        response = authenticated_client.get(f'/accept_eula/{test_server.id}')
        assert response.status_code == 200
        assert b'EULA' in response.data
        
        # Cleanup
        shutil.rmtree(server_dir, ignore_errors=True)
    
    def test_accept_eula_no_file(self, authenticated_client, test_server):
        """Test EULA acceptance when file doesn't exist."""
        response = authenticated_client.get(f'/accept_eula/{test_server.id}', follow_redirects=True)
        assert b'eula.txt not found' in response.data
    
    def test_accept_eula_post(self, authenticated_client, test_server):
        """Test accepting EULA."""
        # Create server directory and eula.txt
        server_dir = f'servers/{test_server.server_name}'
        os.makedirs(server_dir, exist_ok=True)
        eula_path = os.path.join(server_dir, 'eula.txt')
        with open(eula_path, 'w') as f:
            f.write('eula=false\n')
        
        response = authenticated_client.post(f'/accept_eula/{test_server.id}', follow_redirects=True)
        assert response.status_code == 200
        assert b'EULA accepted' in response.data
        
        # Verify EULA was accepted
        with open(eula_path, 'r') as f:
            content = f.read()
            assert 'eula=true' in content
        
        # Cleanup
        shutil.rmtree(server_dir, ignore_errors=True)
    
    def test_server_not_found(self, authenticated_client):
        """Test accessing non-existent server."""
        response = authenticated_client.post('/start/999')
        assert response.status_code == 404
