import re
import socket
import os
from flask import redirect, url_for, request
from flask_login import current_user
from .models import Server, User
from .extensions import db
import requests
import json
from .error_handlers import (
    ValidationError, NetworkError, FileOperationError, ServerError,
    handle_network_error, handle_file_operations, safe_execute,
    SafeFileOperation, SafeDatabaseOperation, logger
)
from .models import Server
from flask import current_app

def is_valid_server_name(name):
    """
    Validate server name to contain only letters, numbers, underscores, and hyphens.
    Enhanced security validation to prevent directory traversal and injection attacks.
    """
    if not name or not isinstance(name, str):
        return False
    
    # Check length constraints
    if len(name) < 1 or len(name) > 150:
        return False
    
    # Check for valid characters only (alphanumeric, underscore, hyphen)
    if not re.match(r'^[a-zA-Z0-9_-]+$', name):
        return False
    
    # Prevent directory traversal patterns
    forbidden_patterns = ['..', './', '\\', '/', '~', '$', '`']
    for pattern in forbidden_patterns:
        if pattern in name:
            return False
    
    # Prevent reserved names
    reserved_names = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 
                     'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 
                     'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9']
    if name.lower() in reserved_names:
        return False
    
    return True

def is_port_available(port):
    """
    Check if a port is available to use.
    Enhanced with proper error handling and validation.
    """
    try:
        # Validate port number
        if not isinstance(port, int) or port < 1 or port > 65535:
            raise ValidationError(f"Invalid port number: {port}")
        
        # Check if port is in reserved range (below 1024 on Unix systems)
        if port < 1024:
            logger.warning(f"Attempting to use reserved port {port}")
        
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)  # Add timeout to prevent hanging
            result = s.connect_ex(('localhost', port))
            return result != 0
    except socket.error as e:
        logger.error(f"Socket error checking port {port}: {str(e)}")
        raise ServerError(f"Unable to check port availability: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error checking port {port}: {str(e)}")
        raise ServerError(f"Port check failed: {str(e)}")

def find_next_available_port():
    """
    Find the next available port, starting from 25565 and incrementing by 10.
    Enhanced with better error handling and logging.
    """
    base_port = 25565
    increment = 10
    max_checks = 20
    
    try:
        # Get a list of all ports already assigned to servers
        assigned_ports = {server.port for server in Server.query.all()}
        logger.info(f"Found {len(assigned_ports)} ports already assigned: {assigned_ports}")

        for i in range(max_checks):
            port_to_check = base_port + (i * increment)

            # Check if the port is already assigned in the database
            if port_to_check in assigned_ports:
                logger.debug(f"Port {port_to_check} already assigned in database")
                continue
            
            # Check if the port is currently in use
            try:
                if is_port_available(port_to_check):
                    logger.info(f"Found available port: {port_to_check}")
                    return port_to_check
                else:
                    logger.debug(f"Port {port_to_check} is currently in use")
            except (ValidationError, ServerError) as e:
                logger.warning(f"Error checking port {port_to_check}: {str(e)}")
                continue

        # If we get here, no ports were available
        error_msg = f"No available ports found after checking {max_checks} ports starting from {base_port}"
        logger.error(error_msg)
        raise ServerError(error_msg)
        
    except Exception as e:
        if isinstance(e, ServerError):
            raise
        logger.error(f"Unexpected error in find_next_available_port: {str(e)}")
        raise ServerError(f"Port allocation failed: {str(e)}")

@handle_network_error
def fetch_version_manifest():
    """
    Fetches the main version manifest from Mojang's API.
    Enhanced with proper error handling and logging.
    """
    manifest_url = 'https://piston-meta.mojang.com/mc/game/version_manifest.json'
    
    logger.info(f"Fetching version manifest from: {manifest_url}")
    
    try:
        response = requests.get(manifest_url, timeout=15)
        response.raise_for_status()
        
        manifest_data = response.json()
        logger.info(f"Successfully fetched manifest with {len(manifest_data.get('versions', []))} versions")
        
        return manifest_data
    except requests.exceptions.JSONDecodeError as e:
        error_msg = "Invalid JSON response from version manifest API"
        logger.error(f"{error_msg}: {str(e)}")
        raise NetworkError(error_msg)
    except Exception as e:
        # The @handle_network_error decorator will catch and convert network errors
        # Any other errors should be logged and re-raised
        logger.error(f"Unexpected error fetching manifest: {str(e)}")
        raise

@handle_network_error
def get_version_info(version_id):
    """
    Fetches the version-specific metadata for a given version ID.
    Enhanced with proper validation and error handling.
    """
    if not version_id or not isinstance(version_id, str):
        raise ValidationError("Invalid version ID provided")
    
    logger.info(f"Fetching version info for: {version_id}")
    
    try:
        manifest = fetch_version_manifest()
        
        # Validate manifest structure
        if not isinstance(manifest, dict) or 'versions' not in manifest:
            raise NetworkError("Invalid manifest structure received")
        
        # Find the selected version's metadata URL
        version_info = next((v for v in manifest['versions'] if v['id'] == version_id), None)
        if not version_info:
            available_versions = [v['id'] for v in manifest['versions'][:10]]  # Show first 10 for reference
            error_msg = f"Version '{version_id}' not found in manifest. Available versions include: {', '.join(available_versions)}"
            logger.warning(error_msg)
            raise ValidationError(error_msg)
        
        version_metadata_url = version_info.get('url')
        if not version_metadata_url:
            raise NetworkError(f"No metadata URL found for version {version_id}")

        logger.info(f"Fetching version metadata from: {version_metadata_url}")
        
        # Fetch the version-specific metadata file
        version_metadata_response = requests.get(version_metadata_url, timeout=15)
        version_metadata_response.raise_for_status()
        
        metadata = version_metadata_response.json()
        
        # Validate that the metadata contains required fields
        if not isinstance(metadata, dict) or 'downloads' not in metadata:
            raise NetworkError(f"Invalid metadata structure for version {version_id}")
        
        if 'server' not in metadata['downloads']:
            raise ValidationError(f"Version {version_id} does not have a server download available")
        
        logger.info(f"Successfully fetched metadata for version {version_id}")
        return metadata
        
    except requests.exceptions.JSONDecodeError as e:
        error_msg = f"Invalid JSON response for version {version_id} metadata"
        logger.error(f"{error_msg}: {str(e)}")
        raise NetworkError(error_msg)
    except (ValidationError, NetworkError):
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting version info for {version_id}: {str(e)}")
        raise NetworkError(f"Failed to get version information: {str(e)}")

def check_admin_password():
    """
    Check if admin password is set and redirect if needed.
    Enhanced with proper error handling and logging.
    """
    try:
        admin_user = User.query.filter_by(username='admin').first()
        if admin_user and not admin_user.password_hash:
            allowed_endpoints = ['auth.set_admin_password', 'static']
            current_endpoint = request.endpoint or ''
            
            if (current_endpoint not in allowed_endpoints and 
                not current_endpoint.startswith('static')):
                logger.info("Redirecting to admin password setup")
                return redirect(url_for('auth.set_admin_password'))
    except Exception as e:
        logger.error(f"Error checking admin password: {str(e)}")
        # Don't block the request if there's an error checking admin password
        return None

@handle_file_operations
def load_exclusion_list(filename='app/static/excluded_versions.json'):
    """
    Load the list of excluded Minecraft versions from JSON file.
    Enhanced with proper error handling and validation.
    """
    if not filename or not isinstance(filename, str):
        raise ValidationError("Invalid filename provided")
    
    # Ensure the filename uses a safe path
    safe_filename = os.path.normpath(filename)
    if '..' in safe_filename:
        raise ValidationError("Invalid file path - directory traversal not allowed")
    
    logger.info(f"Loading exclusion list from: {safe_filename}")
    
    try:
        with SafeFileOperation(safe_filename, 'r') as f:
            excluded_versions = json.load(f)
            
        # Validate the loaded data
        if not isinstance(excluded_versions, list):
            logger.warning(f"Exclusion list is not a list, got {type(excluded_versions)}")
            return []
        
        # Validate each version string
        valid_versions = []
        for version in excluded_versions:
            if isinstance(version, str) and version.strip():
                valid_versions.append(version.strip())
            else:
                logger.warning(f"Invalid version entry in exclusion list: {version}")
        
        logger.info(f"Loaded {len(valid_versions)} excluded versions")
        return valid_versions
        
    except FileNotFoundError:
        logger.info(f"Exclusion list file not found: {safe_filename}, returning empty list")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in exclusion list file: {str(e)}")
        raise FileOperationError(f"Invalid JSON format in exclusion list: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error loading exclusion list: {str(e)}")
        raise FileOperationError(f"Failed to load exclusion list: {str(e)}")


def get_app_config():
    """Get application configuration from database."""
    try:
        from .models import Configuration
        
        # Get configuration from database
        config_entries = Configuration.query.all()
        config = {}
        
        for entry in config_entries:
            config[entry.key] = entry.value
        
        # Set defaults if not in database
        app_title = config.get('app_title', 'Minecraft Server Manager')
        server_hostname = config.get('server_hostname', 'localhost')
        max_total_mb = int(config.get('max_total_mb', '8192'))
        default_server_mb = int(config.get('default_server_mb', '1024'))
        min_server_mb = int(config.get('min_server_mb', '512'))
        max_server_mb = int(config.get('max_server_mb', '4096'))
        
        result = {
            'app_title': app_title,
            'server_hostname': server_hostname,
            'max_total_mb': max_total_mb,
            'default_server_mb': default_server_mb,
            'min_server_mb': min_server_mb,
            'max_server_mb': max_server_mb
        }
        
        logger.debug(f"App config from database: {result}")
        return result
    except Exception as e:
        logger.error(f"Error getting app config: {str(e)}")
        # Return safe defaults
        return {
            'app_title': 'Minecraft Server Manager',
            'server_hostname': 'localhost',
            'max_total_mb': 8192,
            'default_server_mb': 1024,
            'min_server_mb': 512,
            'max_server_mb': 4096
        }


def get_memory_config():
    """Get memory configuration from app config (backward compatibility)."""
    config = get_app_config()
    return {
        'max_total_mb': config['max_total_mb'],
        'default_server_mb': config['default_server_mb'],
        'min_server_mb': config['min_server_mb'],
        'max_server_mb': config['max_server_mb']
    }


def get_total_allocated_memory(user_id=None):
    """Get total allocated memory across all servers or for a specific user."""
    try:
        if user_id is None:
            # Get total for all servers (admin view)
            total = db.session.query(db.func.sum(Server.memory_mb)).scalar() or 0
            logger.debug(f"Total allocated memory across all servers: {total}MB")
        else:
            # Get total for specific user
            total = db.session.query(db.func.sum(Server.memory_mb)).filter_by(owner_id=user_id).scalar() or 0
            logger.debug(f"Total allocated memory for user {user_id}: {total}MB")
        return total
    except Exception as e:
        logger.error(f"Error getting total allocated memory: {str(e)}")
        return 0


def get_available_memory(user_id=None):
    """Get available memory based on total system memory and allocated memory."""
    try:
        config = get_memory_config()
        allocated = get_total_allocated_memory(user_id)
        available = config['max_total_mb'] - allocated
        return max(0, available)  # Don't return negative values
    except Exception as e:
        logger.error(f"Error getting available memory: {str(e)}")
        return 8192  # Default to 8GB if error


def validate_memory_allocation(requested_memory_mb, exclude_server_id=None):
    """
    Validate if the requested memory allocation is possible.
    
    Args:
        requested_memory_mb: Memory requested in MB
        exclude_server_id: Server ID to exclude from calculation (for updates)
    
    Returns:
        tuple: (is_valid, error_message, available_memory)
    """
    try:
        config = get_memory_config()
        
        # Validate memory bounds
        if requested_memory_mb < config['min_server_mb']:
            return False, f"Memory must be at least {config['min_server_mb']}MB", 0
        
        if requested_memory_mb > config['max_server_mb']:
            return False, f"Memory cannot exceed {config['max_server_mb']}MB", 0
        
        # Calculate current allocation excluding the server being updated
        current_allocation = 0
        servers = Server.query.all()
        
        for server in servers:
            if exclude_server_id is None or server.id != exclude_server_id:
                current_allocation += server.memory_mb
        
        # Check if new allocation would exceed total limit
        new_total = current_allocation + requested_memory_mb
        if new_total > config['max_total_mb']:
            available = config['max_total_mb'] - current_allocation
            return False, f"Total memory allocation would exceed limit. Available: {available}MB", available
        
        available = config['max_total_mb'] - new_total
        return True, "", available
        
    except Exception as e:
        logger.error(f"Error validating memory allocation: {str(e)}")
        return False, "Error validating memory allocation", 0




def update_app_config(app_title=None, server_hostname=None, max_total_mb=None, max_per_server_mb=None):
    """Update application configuration in database."""
    try:
        from .models import Configuration
        
        # Try to get current user, but don't fail if not available
        try:
            from flask_login import current_user
            user_id = current_user.id if current_user.is_authenticated else None
        except:
            user_id = None
        
        # Update each configuration value
        if app_title is not None:
            config_entry = Configuration.query.filter_by(key='app_title').first()
            if config_entry:
                config_entry.value = str(app_title)
                config_entry.updated_by = user_id
            else:
                config_entry = Configuration(
                    key='app_title',
                    value=str(app_title),
                    updated_by=user_id
                )
                db.session.add(config_entry)
        
        if server_hostname is not None:
            config_entry = Configuration.query.filter_by(key='server_hostname').first()
            if config_entry:
                config_entry.value = str(server_hostname)
                config_entry.updated_by = user_id
            else:
                config_entry = Configuration(
                    key='server_hostname',
                    value=str(server_hostname),
                    updated_by=user_id
                )
                db.session.add(config_entry)
        
        if max_total_mb is not None:
            config_entry = Configuration.query.filter_by(key='max_total_mb').first()
            if config_entry:
                config_entry.value = str(max_total_mb)
                config_entry.updated_by = user_id
            else:
                config_entry = Configuration(
                    key='max_total_mb',
                    value=str(max_total_mb),
                    updated_by=user_id
                )
                db.session.add(config_entry)
        
        if max_per_server_mb is not None:
            config_entry = Configuration.query.filter_by(key='max_server_mb').first()
            if config_entry:
                config_entry.value = str(max_per_server_mb)
                config_entry.updated_by = user_id
            else:
                config_entry = Configuration(
                    key='max_server_mb',
                    value=str(max_per_server_mb),
                    updated_by=user_id
                )
                db.session.add(config_entry)
        
        # Commit changes to database
        db.session.commit()
        
        logger.info(f"App configuration updated in database: Title={app_title}, Hostname={server_hostname}, Total={max_total_mb}MB, Per Server={max_per_server_mb}MB")
        return True
    except Exception as e:
        logger.error(f"Failed to update app configuration: {str(e)}")
        db.session.rollback()
        return False


def update_memory_config(max_total_mb, max_per_server_mb):
    """Update memory configuration by setting environment variables (backward compatibility)."""
    return update_app_config(max_total_mb=max_total_mb, max_per_server_mb=max_per_server_mb)

def format_memory_display(memory_mb):
    """Format memory in MB to human-readable format."""
    if memory_mb >= 1024:
        # Use decimal GB for amounts >= 1GB
        gb = memory_mb / 1024
        return f"{gb:.1f}GB"
    else:
        # Use MB for amounts < 1GB
        return f"{memory_mb}MB"




def get_memory_usage_summary(user_id=None):
    """Get a summary of memory usage for display."""
    try:
        config = get_memory_config()
        # Always show total system allocation for all users
        allocated = get_total_allocated_memory()  # No user_id - show total system
        available = get_available_memory()  # No user_id - show total system
        
        logger.debug(f"Memory summary - Total: {config['max_total_mb']}MB, Allocated: {allocated}MB, Available: {available}MB")
        
        return {
            'total_memory_mb': config['max_total_mb'],
            'allocated_memory_mb': allocated,
            'available_memory_mb': available,
            'total_memory_display': format_memory_display(config['max_total_mb']),
            'allocated_memory_display': format_memory_display(allocated),
            'available_memory_display': format_memory_display(available),
            'usage_percentage': round((allocated / config['max_total_mb']) * 100, 1) if config['max_total_mb'] > 0 else 0
        }
    except Exception as e:
        logger.error(f"Error getting memory usage summary: {str(e)}")
        return {
            'total_memory_mb': 8192,
            'allocated_memory_mb': 0,
            'available_memory_mb': 8192,
            'total_memory_display': '8GB',
            'allocated_memory_display': '0MB',
            'available_memory_display': '8GB',
            'usage_percentage': 0
        }

def initialize_default_config():
    """Initialize default configuration values in database if they don't exist."""
    try:
        from .models import Configuration
        
        # Default configuration values
        default_config = {
            'app_title': 'Minecraft Server Manager',
            'server_hostname': 'localhost',
            'max_total_mb': '8192',
            'default_server_mb': '1024',
            'min_server_mb': '512',
            'max_server_mb': '4096'
        }
        
        # Check which configurations exist and add missing ones
        for key, value in default_config.items():
            existing = Configuration.query.filter_by(key=key).first()
            if not existing:
                config_entry = Configuration(
                    key=key,
                    value=value,
                    updated_by=None
                )
                db.session.add(config_entry)
                logger.info(f"Added default configuration: {key}={value}")
        
        # Commit any new configurations
        if db.session.new:
            db.session.commit()
            logger.info("Default configuration initialized successfully")
        
        return True
    except Exception as e:
        logger.error(f"Failed to initialize default configuration: {str(e)}")
        db.session.rollback()
        return False