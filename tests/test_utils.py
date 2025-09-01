"""
Tests for utility functions.
"""
import pytest
import json
import tempfile
import os
from unittest.mock import patch, MagicMock
from app.utils import (
    is_valid_server_name,
    is_port_available,
    find_next_available_port,
    fetch_version_manifest,
    get_version_info,
    load_exclusion_list
)
from app.models import Server
from app.extensions import db


class TestUtilityFunctions:
    """Test utility functions."""
    
    def test_is_valid_server_name_valid(self):
        """Test valid server names."""
        valid_names = [
            'server1',
            'my-server',
            'test_server',
            'Server123',
            'a',
            '123',
            'test-server_123'
        ]
        
        for name in valid_names:
            assert is_valid_server_name(name), f"'{name}' should be valid"
    
    def test_is_valid_server_name_invalid(self):
        """Test invalid server names."""
        invalid_names = [
            'server name',  # space
            'server!',      # exclamation
            'server.name',  # period
            'server@home',  # at symbol
            'server#1',     # hash
            'server$',      # dollar
            'server%',      # percent
            'server^',      # caret
            'server&',      # ampersand
            'server*',      # asterisk
            'server(',      # parenthesis
            'server)',      # parenthesis
            'server+',      # plus
            'server=',      # equals
            'server[',      # bracket
            'server]',      # bracket
            'server{',      # brace
            'server}',      # brace
            'server|',      # pipe
            'server\\',     # backslash
            'server/',      # forward slash
            'server:',      # colon
            'server;',      # semicolon
            'server"',      # quote
            "server'",      # apostrophe
            'server<',      # less than
            'server>',      # greater than
            'server,',      # comma
            'server?',      # question mark
            ''              # empty string
        ]
        
        for name in invalid_names:
            assert not is_valid_server_name(name), f"'{name}' should be invalid"
    
    @patch('socket.socket')
    def test_is_port_available_true(self, mock_socket):
        """Test port availability when port is available."""
        mock_sock = MagicMock()
        mock_sock.connect_ex.return_value = 1  # Connection failed (port available)
        mock_socket.return_value.__enter__.return_value = mock_sock
        
        assert is_port_available(25565) is True
        mock_sock.connect_ex.assert_called_once_with(('localhost', 25565))
    
    @patch('socket.socket')
    def test_is_port_available_false(self, mock_socket):
        """Test port availability when port is in use."""
        mock_sock = MagicMock()
        mock_sock.connect_ex.return_value = 0  # Connection succeeded (port in use)
        mock_socket.return_value.__enter__.return_value = mock_sock
        
        assert is_port_available(25565) is False
        mock_sock.connect_ex.assert_called_once_with(('localhost', 25565))
    
    def test_find_next_available_port_first_available(self, app):
        """Test finding next available port when first port is available."""
        with app.app_context():
            with patch('app.utils.is_port_available') as mock_available:
                mock_available.return_value = True
                
                port = find_next_available_port()
                assert port == 25565
                mock_available.assert_called_once_with(25565)
    
    def test_find_next_available_port_second_available(self, app):
        """Test finding next available port when second port is available."""
        with app.app_context():
            with patch('app.utils.is_port_available') as mock_available:
                mock_available.side_effect = [False, True]  # First unavailable, second available
                
                port = find_next_available_port()
                assert port == 25575
                assert mock_available.call_count == 2
    
    def test_find_next_available_port_with_assigned_ports(self, app, admin_user):
        """Test finding port when some ports are assigned to servers."""
        with app.app_context():
            # Create a server with port 25565
            server = Server(
                server_name='testserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            with patch('app.utils.is_port_available') as mock_available:
                mock_available.return_value = True
                
                port = find_next_available_port()
                assert port == 25575  # Should skip 25565 and return 25575
                mock_available.assert_called_once_with(25575)
    
    def test_find_next_available_port_all_unavailable(self, app):
        """Test when no ports are available."""
        with app.app_context():
            with patch('app.utils.is_port_available') as mock_available:
                mock_available.return_value = False
                
                with pytest.raises(RuntimeError, match="No available ports found"):
                    find_next_available_port()
    
    @patch('requests.get')
    def test_fetch_version_manifest_success(self, mock_get):
        """Test successful version manifest fetch."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'latest': {'release': '1.20.1'},
            'versions': [{'id': '1.20.1', 'type': 'release'}]
        }
        mock_get.return_value = mock_response
        
        manifest = fetch_version_manifest()
        assert manifest['latest']['release'] == '1.20.1'
        mock_get.assert_called_once()
        mock_response.raise_for_status.assert_called_once()
    
    @patch('requests.get')
    def test_fetch_version_manifest_network_error(self, mock_get):
        """Test version manifest fetch with network error."""
        import requests
        mock_get.side_effect = requests.exceptions.RequestException("Network error")
        
        with pytest.raises(requests.exceptions.RequestException):
            fetch_version_manifest()
    
    @patch('app.utils.fetch_version_manifest')
    @patch('requests.get')
    def test_get_version_info_success(self, mock_get, mock_fetch):
        """Test successful version info retrieval."""
        # Mock manifest
        mock_fetch.return_value = {
            'versions': [
                {'id': '1.20.1', 'url': 'http://example.com/1.20.1.json'}
            ]
        }
        
        # Mock version metadata
        mock_response = MagicMock()
        mock_response.json.return_value = {
            'downloads': {'server': {'url': 'http://example.com/server.jar'}}
        }
        mock_get.return_value = mock_response
        
        version_info = get_version_info('1.20.1')
        assert 'downloads' in version_info
        assert 'server' in version_info['downloads']
    
    @patch('app.utils.fetch_version_manifest')
    def test_get_version_info_version_not_found(self, mock_fetch):
        """Test version info retrieval for non-existent version."""
        mock_fetch.return_value = {
            'versions': [
                {'id': '1.20.1', 'url': 'http://example.com/1.20.1.json'}
            ]
        }
        
        with pytest.raises(ValueError, match="Version nonexistent not found"):
            get_version_info('nonexistent')
    
    def test_load_exclusion_list_success(self):
        """Test loading exclusion list successfully."""
        # Create temporary exclusion file
        exclusions = ['1.0', '1.1', 'beta']
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(exclusions, f)
            temp_file = f.name
        
        try:
            loaded_exclusions = load_exclusion_list(temp_file)
            assert loaded_exclusions == exclusions
        finally:
            os.unlink(temp_file)
    
    def test_load_exclusion_list_file_not_found(self):
        """Test loading exclusion list when file doesn't exist."""
        exclusions = load_exclusion_list('nonexistent_file.json')
        assert exclusions == []
    
    def test_load_exclusion_list_invalid_json(self):
        """Test loading exclusion list with invalid JSON."""
        # Create temporary file with invalid JSON
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('invalid json content')
            temp_file = f.name
        
        try:
            with pytest.raises(json.JSONDecodeError):
                load_exclusion_list(temp_file)
        finally:
            os.unlink(temp_file)


class TestPortAllocation:
    """Test port allocation functionality in detail."""
    
    def test_port_range_logic(self, app, admin_user):
        """Test the port allocation follows the expected pattern."""
        with app.app_context():
            # Create servers with specific ports to test the logic
            ports_to_occupy = [25565, 25575, 25585]
            for i, port in enumerate(ports_to_occupy):
                server = Server(
                    server_name=f'testserver{i}',
                    version='1.20.1',
                    port=port,
                    status='Stopped',
                    owner_id=admin_user.id
                )
                db.session.add(server)
            db.session.commit()
            
            with patch('app.utils.is_port_available') as mock_available:
                mock_available.return_value = True
                
                port = find_next_available_port()
                # Should return 25595 (next in sequence)
                assert port == 25595
    
    def test_port_allocation_edge_cases(self, app, admin_user):
        """Test edge cases in port allocation."""
        with app.app_context():
            # Fill up many ports
            for i in range(19):  # Fill up to just before the limit
                server = Server(
                    server_name=f'testserver{i}',
                    version='1.20.1',
                    port=25565 + (i * 10),
                    status='Stopped',
                    owner_id=admin_user.id
                )
                db.session.add(server)
            db.session.commit()
            
            with patch('app.utils.is_port_available') as mock_available:
                # Make the last possible port available
                mock_available.return_value = True
                
                port = find_next_available_port()
                assert port == 25755  # 25565 + (19 * 10)
    
    def test_port_allocation_all_database_ports_taken(self, app, admin_user):
        """Test port allocation when all database ports are taken but system ports are free."""
        with app.app_context():
            # Fill up all 20 slots in the range
            for i in range(20):
                server = Server(
                    server_name=f'testserver{i}',
                    version='1.20.1',
                    port=25565 + (i * 10),
                    status='Stopped',
                    owner_id=admin_user.id
                )
                db.session.add(server)
            db.session.commit()
            
            with patch('app.utils.is_port_available') as mock_available:
                mock_available.return_value = True
                
                with pytest.raises(RuntimeError, match="No available ports found"):
                    find_next_available_port()
