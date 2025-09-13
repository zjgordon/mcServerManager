"""
Tests for memory management functionality.
"""
import pytest
from unittest.mock import patch, MagicMock
from app.models import Server, User
from app.extensions import db
from app.utils import (
    get_memory_config, get_total_allocated_memory, get_available_memory,
    validate_memory_allocation, format_memory_display, get_memory_usage_summary
)
from app.config import Config
import os


class TestMemoryConfiguration:
    """Test memory configuration functionality."""
    
    def test_get_memory_config_defaults(self, app):
        """Test getting memory configuration with defaults."""
        with app.app_context():
            config = get_memory_config()
            
            assert config['max_total_mb'] == 8192
            assert config['default_server_mb'] == 1024
            assert config['min_server_mb'] == 512
            assert config['max_server_mb'] == 4096
    
    def test_get_memory_config_with_env_vars(self, app):
        """Test getting memory configuration with environment variables."""
        with app.app_context():
            from app.models import Configuration
            from app.utils import update_app_config
            
            # Update configuration in database instead of environment variables
            update_app_config(
                app_title='Test App',
                server_hostname='testhost',
                max_total_mb=16384,
                max_per_server_mb=8192
            )
            
            # Also update the other memory settings
            config_entries = [
                ('default_server_mb', '2048'),
                ('min_server_mb', '1024')
            ]
            
            for key, value in config_entries:
                config_entry = Configuration.query.filter_by(key=key).first()
                if config_entry:
                    config_entry.value = value
                else:
                    config_entry = Configuration(key=key, value=value)
                    db.session.add(config_entry)
            db.session.commit()
            
            config = get_memory_config()
            
            assert config['max_total_mb'] == 16384
            assert config['default_server_mb'] == 2048
            assert config['min_server_mb'] == 1024
            assert config['max_server_mb'] == 8192


class TestMemoryCalculation:
    """Test memory calculation functions."""
    
    def test_get_total_allocated_memory_empty(self, app):
        """Test total allocated memory with no servers."""
        with app.app_context():
            total = get_total_allocated_memory()
            assert total == 0
    
    def test_get_total_allocated_memory_with_servers(self, app, admin_user):
        """Test total allocated memory with servers."""
        with app.app_context():
            # Create test servers with different memory allocations using admin_user
            server1 = Server(
                server_name='server1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=admin_user.id
            )
            server2 = Server(
                server_name='server2',
                version='1.20.1',
                port=25575,
                status='Running',
                memory_mb=2048,
                owner_id=admin_user.id
            )
            
            db.session.add_all([server1, server2])
            db.session.commit()
            
            total = get_total_allocated_memory()
            assert total == 3072  # 1024 + 2048
    
    def test_get_available_memory(self, app, admin_user):
        """Test available memory calculation."""
        with app.app_context():
            # Create a server with 1024MB allocation using admin_user
            server = Server(
                server_name='testserver',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            available = get_available_memory()
            expected = 8192 - 1024  # Default max - allocated
            assert available == expected


class TestMemoryValidation:
    """Test memory allocation validation."""
    
    def test_validate_memory_allocation_valid(self, app):
        """Test valid memory allocation."""
        with app.app_context():
            is_valid, error_msg, available = validate_memory_allocation(1024)
            assert is_valid is True
            assert error_msg == ""
            assert available == 8192 - 1024  # Default max - requested
    
    def test_validate_memory_allocation_too_low(self, app):
        """Test memory allocation below minimum."""
        with app.app_context():
            is_valid, error_msg, available = validate_memory_allocation(256)
            assert is_valid is False
            assert "Memory must be at least 512MB" in error_msg
    
    def test_validate_memory_allocation_too_high(self, app):
        """Test memory allocation above maximum."""
        with app.app_context():
            is_valid, error_msg, available = validate_memory_allocation(8192)
            assert is_valid is False
            assert "Memory cannot exceed 4096MB" in error_msg
    
    def test_validate_memory_allocation_exceeds_total(self, app, admin_user):
        """Test memory allocation that exceeds total limit."""
        with app.app_context():
            # Create servers that use most of the available memory using admin_user
            server1 = Server(
                server_name='server1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=7000,  # Use most of 8192MB limit
                owner_id=admin_user.id
            )
            db.session.add(server1)
            db.session.commit()
            
            # Try to allocate more than available
            is_valid, error_msg, available = validate_memory_allocation(2000)
            assert is_valid is False
            assert "Total memory allocation would exceed limit" in error_msg
            assert available == 1192  # 8192 - 7000
    
    def test_validate_memory_allocation_with_exclude(self, app, admin_user):
        """Test memory validation excluding a specific server (for updates)."""
        with app.app_context():
            # Create a server using admin_user
            server = Server(
                server_name='server1',
                version='1.20.1',
                port=25565,
                status='Stopped',
                memory_mb=1024,
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            # Validate allocation excluding this server
            is_valid, error_msg, available = validate_memory_allocation(2048, exclude_server_id=server.id)
            assert is_valid is True  # Should be valid since we're excluding the existing allocation
            assert available == 8192 - 2048  # Should be based on new allocation only


class TestMemoryDisplay:
    """Test memory display formatting."""
    
    def test_format_memory_display_mb(self):
        """Test formatting memory in MB."""
        assert format_memory_display(512) == "512MB"
        assert format_memory_display(1023) == "1023MB"
    
    def test_format_memory_display_gb(self):
        """Test formatting memory in GB."""
        assert format_memory_display(1024) == "1.0GB"
        assert format_memory_display(2048) == "2.0GB"
        assert format_memory_display(1536) == "1.5GB"
    
    def test_get_memory_usage_summary(self, app, admin_user):
        """Test memory usage summary."""
        with app.app_context():
            # Create a server using admin_user
            server = Server(
                server_name='testserver2',
                version='1.20.1',
                port=25566,
                status='Stopped',
                memory_mb=1024,
                owner_id=admin_user.id
            )
            db.session.add(server)
            db.session.commit()
            
            summary = get_memory_usage_summary()
            
            assert summary['total_memory_mb'] == 8192
            assert summary['allocated_memory_mb'] == 1024  # Only the new server
            assert summary['available_memory_mb'] == 7168
            assert summary['total_memory_display'] == "8.0GB"
            assert summary['allocated_memory_display'] == "1.0GB"
            assert summary['available_memory_display'] == "7.0GB"
            assert summary['usage_percentage'] == 12.5  # 1024/8192 * 100


class TestMemoryInServerCreation:
    """Test memory validation in server creation."""
    
    def test_server_creation_with_valid_memory(self, client, app):
        """Test server creation with valid memory allocation."""
        with app.app_context():
            # Create admin user
            admin = User(
                username='admin_memory',
                password_hash='test_hash',
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            
            # Login
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            # Mock the necessary functions
            with patch('app.routes.server_routes.find_next_available_port') as mock_port, \
                 patch('app.routes.server_routes.get_version_info') as mock_version, \
                 patch('requests.get') as mock_requests, \
                 patch('subprocess.Popen') as mock_popen, \
                 patch('subprocess.check_output') as mock_check_output, \
                 patch('os.makedirs'), \
                 patch('os.path.exists') as mock_exists, \
                 patch('builtins.open', create=True) as mock_open, \
                 patch('app.error_handlers.SafeFileOperation') as mock_safe_file, \
                 patch('app.error_handlers.SafeDatabaseOperation') as mock_safe_db:
                
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
                mock_exists.return_value = True
                
                # Mock context managers
                mock_safe_file.return_value.__enter__.return_value = mock_file
                mock_safe_file.return_value.__exit__.return_value = None
                mock_safe_db.return_value.__enter__.return_value = db.session
                mock_safe_db.return_value.__exit__.return_value = None
                
                response = client.post('/configure_server', data={
                    'server_name': 'testserver',
                    'level_seed': 'test',
                    'gamemode': 'survival',
                    'difficulty': 'normal',
                    'motd': 'Test Server',
                    'memory_mb': '2048'
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Should redirect (either to EULA or home)
                assert response.status_code == 302
                
                # Verify server was created with correct memory
                server = Server.query.filter_by(server_name='testserver').first()
                assert server is not None
                assert server.memory_mb == 2048
    
    def test_server_creation_with_invalid_memory(self, client, app):
        """Test server creation with invalid memory allocation."""
        with app.app_context():
            # Create admin user
            admin = User(
                username='admin_memory',
                password_hash='test_hash',
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            
            # Login
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            response = client.post('/configure_server', data={
                'server_name': 'testserver',
                'level_seed': 'test',
                'gamemode': 'survival',
                'difficulty': 'normal',
                'motd': 'Test Server',
                'memory_mb': '8192'  # Exceeds max server memory
            }, query_string={'version_type': 'release', 'version': '1.20.1'})
            
            # Should show validation error
            assert b'Memory cannot exceed 4096MB' in response.data
    
    def test_server_creation_with_default_memory(self, client, app):
        """Test server creation with default memory (no memory_mb specified)."""
        with app.app_context():
            # Create admin user
            admin = User(
                username='admin_memory',
                password_hash='test_hash',
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            
            # Login
            with client.session_transaction() as sess:
                sess['_user_id'] = str(admin.id)
                sess['_fresh'] = True
            
            # Mock the necessary functions
            with patch('app.routes.server_routes.find_next_available_port') as mock_port, \
                 patch('app.routes.server_routes.get_version_info') as mock_version, \
                 patch('requests.get') as mock_requests, \
                 patch('subprocess.Popen') as mock_popen, \
                 patch('subprocess.check_output') as mock_check_output, \
                 patch('os.makedirs'), \
                 patch('os.path.exists') as mock_exists, \
                 patch('builtins.open', create=True) as mock_open, \
                 patch('app.error_handlers.SafeFileOperation') as mock_safe_file, \
                 patch('app.error_handlers.SafeDatabaseOperation') as mock_safe_db:
                
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
                mock_exists.return_value = True
                
                # Mock context managers
                mock_safe_file.return_value.__enter__.return_value = mock_file
                mock_safe_file.return_value.__exit__.return_value = None
                mock_safe_db.return_value.__enter__.return_value = db.session
                mock_safe_db.return_value.__exit__.return_value = None
                
                response = client.post('/configure_server', data={
                    'server_name': 'testserver',
                    'level_seed': 'test',
                    'gamemode': 'survival',
                    'difficulty': 'normal',
                    'motd': 'Test Server'
                    # No memory_mb specified
                }, query_string={'version_type': 'release', 'version': '1.20.1'})
                
                # Should redirect (either to EULA or home)
                assert response.status_code == 302
                
                # Verify server was created with default memory
                server = Server.query.filter_by(server_name='testserver').first()
                assert server is not None
                assert server.memory_mb == 1024  # Default value


class TestMemoryInServerStart:
    """Test memory usage in server start process."""
    
    def test_server_memory_allocation_stored_correctly(self, app, test_server):
        """Test that server memory allocation is stored correctly."""
        with app.app_context():
            # Set server memory to 2048MB
            server = Server.query.get(test_server.id)
            server.memory_mb = 2048
            db.session.commit()
            
            # Verify the memory allocation is stored correctly
            updated_server = Server.query.get(test_server.id)
            assert updated_server.memory_mb == 2048


class TestMemoryEdgeCases:
    """Test edge cases in memory management."""
    
    def test_memory_validation_with_zero_memory(self, app):
        """Test memory validation with zero memory."""
        with app.app_context():
            is_valid, error_msg, available = validate_memory_allocation(0)
            assert is_valid is False
            assert "Memory must be at least 512MB" in error_msg
    
    def test_memory_validation_with_negative_memory(self, app):
        """Test memory validation with negative memory."""
        with app.app_context():
            is_valid, error_msg, available = validate_memory_allocation(-100)
            assert is_valid is False
            assert "Memory must be at least 512MB" in error_msg
    
    def test_memory_validation_with_exact_max_total(self, app):
        """Test memory validation when allocation equals total limit."""
        with app.app_context():
            is_valid, error_msg, available = validate_memory_allocation(8192)
            assert is_valid is False  # Should fail because it exceeds max server memory (4096)
    
    def test_memory_validation_with_multiple_servers(self, app, admin_user):
        """Test memory validation with multiple servers."""
        with app.app_context():
            # Create multiple servers using admin_user
            servers = []
            for i in range(5):
                server = Server(
                    server_name=f'server{i}',
                    version='1.20.1',
                    port=25565 + i,
                    status='Stopped',
                    memory_mb=1024,
                    owner_id=admin_user.id
                )
                servers.append(server)
            
            db.session.add_all(servers)
            db.session.commit()
            
            # Try to create another server
            is_valid, error_msg, available = validate_memory_allocation(1024)
            assert is_valid is True  # Should be valid (5 * 1024 + 1024 = 6144 < 8192)
            
            # Try to create a server that would exceed the limit
            is_valid, error_msg, available = validate_memory_allocation(4096)
            assert is_valid is False  # Should fail (5 * 1024 + 4096 = 9216 > 8192)
