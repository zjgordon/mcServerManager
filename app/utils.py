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
    SafeFileOperation, logger
)

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
    if '..' in safe_filename or safe_filename.startswith('/'):
        raise ValidationError("Invalid file path")
    
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