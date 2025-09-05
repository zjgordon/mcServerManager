"""
Server Management API Routes

Provides RESTful endpoints for Minecraft server management operations.
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy.exc import IntegrityError
from ..server_routes import check_server_access
from ...models import Server, User
from ...extensions import db
from ...utils import (
    is_valid_server_name,
    find_next_available_port,
    fetch_version_manifest,
    get_version_info,
    load_exclusion_list,
    get_memory_config,
    get_memory_usage_summary,
    validate_memory_allocation,
    verify_process_status,
    safe_execute
)
from ...error_handlers import (
    ValidationError, NetworkError, FileOperationError, ServerError, DatabaseError,
    SafeFileOperation, SafeDatabaseOperation, logger
)
import os
import subprocess
import psutil
import shutil
import signal
import tarfile
from datetime import datetime
import requests
import time

# Create server API blueprint
server_bp = Blueprint('server_api', __name__, url_prefix='/servers')

@server_bp.route('/', methods=['GET'])
@login_required
def get_servers():
    """
    Get list of servers for current user.
    
    Response:
    {
        "success": true,
        "servers": [
            {
                "id": 1,
                "server_name": "My Server",
                "version": "1.21.8",
                "port": 25565,
                "status": "Running",
                "pid": 12345,
                "memory_mb": 1024,
                "owner_id": 1,
                "created_at": "2025-09-04T00:00:00Z",
                "updated_at": "2025-09-04T00:00:00Z"
            }
        ]
    }
    """
    try:
        # Show all servers for admin, only user's servers for regular users
        if current_user.is_admin:
            servers = Server.query.all()
        else:
            servers = Server.query.filter_by(owner_id=current_user.id).all()

        # Verify actual process status for each server in real-time
        for server in servers:
            if server.status == 'Running' and server.pid:
                # Verify the process is actually running
                process_status = verify_process_status(server.pid)
                if not process_status['is_running']:
                    # Process is not running, update the status
                    logger.info(f"Server {server.server_name} marked as running but process {server.pid} is not active")
                    server.status = 'Stopped'
                    server.pid = None
                    # Don't commit here - just update the object for display
                
            # Set the is_running attribute based on verified status
            server.is_running = server.status == 'Running' and server.pid is not None

        # Convert servers to JSON-serializable format
        servers_data = []
        for server in servers:
            servers_data.append({
                'id': server.id,
                'server_name': server.server_name,
                'version': server.version,
                'port': server.port,
                'status': server.status,
                'pid': server.pid,
                'memory_mb': server.memory_mb,
                'owner_id': server.owner_id,
                'created_at': server.created_at.isoformat() if server.created_at else None,
                'updated_at': server.updated_at.isoformat() if server.updated_at else None,
                'is_running': getattr(server, 'is_running', False)
            })

        logger.debug(f"Loaded {len(servers)} servers for user {current_user.username}")
        
        return jsonify({
            'success': True,
            'servers': servers_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error loading servers: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error loading server list'
        }), 500

@server_bp.route('/', methods=['POST'])
@login_required
def create_server():
    """
    Create a new Minecraft server with full setup.
    
    Request Body:
    {
        "server_name": "My Server",
        "version": "1.21.8",
        "memory_mb": 1024,
        "level_seed": "optional_seed",
        "gamemode": "survival",
        "difficulty": "normal",
        "hardcore": false,
        "pvp": true,
        "spawn_monsters": true,
        "motd": "Welcome to my server!"
    }
    
    Response:
    {
        "success": true,
        "message": "Server created successfully",
        "server": {
            "id": 1,
            "server_name": "My Server",
            "version": "1.21.8",
            "port": 25565,
            "status": "Stopped",
            "memory_mb": 1024,
            "owner_id": 1
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        server_name = data.get('server_name', '').strip()
        version = data.get('version', '').strip()
        memory_mb = data.get('memory_mb', 1024)
        level_seed = data.get('level_seed', '').strip()
        gamemode = data.get('gamemode', 'survival').strip()
        difficulty = data.get('difficulty', 'normal').strip()
        hardcore = data.get('hardcore', False)
        pvp = data.get('pvp', True)
        spawn_monsters = data.get('spawn_monsters', True)
        motd = data.get('motd', 'A Minecraft Server').strip()
        
        # Validate required fields
        if not server_name or not version:
            return jsonify({
                'success': False,
                'message': 'Server name and version are required'
            }), 400
        
        # Validate server name
        if not is_valid_server_name(server_name):
            return jsonify({
                'success': False,
                'message': 'Invalid server name. Use only letters, numbers, underscores, and hyphens.'
            }), 400
        
        # Validate game settings
        valid_gamemodes = {'survival', 'creative', 'adventure', 'spectator'}
        valid_difficulties = {'peaceful', 'easy', 'normal', 'hard'}
        
        if gamemode not in valid_gamemodes:
            return jsonify({
                'success': False,
                'message': 'Invalid gamemode. Must be survival, creative, adventure, or spectator.'
            }), 400
        
        if difficulty not in valid_difficulties:
            return jsonify({
                'success': False,
                'message': 'Invalid difficulty. Must be peaceful, easy, normal, or hard.'
            }), 400
        
        if len(level_seed) > 100:
            return jsonify({
                'success': False,
                'message': 'Level seed is too long. Maximum length is 100 characters.'
            }), 400
        
        if len(motd) > 150:
            return jsonify({
                'success': False,
                'message': 'MOTD is too long. Maximum length is 150 characters.'
            }), 400
        
        # Validate memory allocation
        try:
            validate_memory_allocation(memory_mb)
        except ValidationError as e:
            return jsonify({
                'success': False,
                'message': str(e)
            }), 400
        
        # Check if server name already exists
        existing_server = Server.query.filter_by(server_name=server_name).first()
        if existing_server:
            return jsonify({
                'success': False,
                'message': 'Server name already exists'
            }), 400
        
        # Find available port
        success, port, error = safe_execute(find_next_available_port)
        if not success:
            return jsonify({
                'success': False,
                'message': error or 'No available ports found'
            }), 400
        
        # Create server directory
        server_dir = os.path.normpath(os.path.join('servers', server_name))
        if not server_dir.startswith('servers/'):
            return jsonify({
                'success': False,
                'message': 'Invalid server directory path'
            }), 400
        
        try:
            if not os.path.exists(server_dir):
                os.makedirs(server_dir, exist_ok=True)
                logger.info(f"Created server directory: {server_dir}")
        except OSError as e:
            return jsonify({
                'success': False,
                'message': f'Failed to create server directory: {str(e)}'
            }), 500
        
        # Get version metadata and download server JAR
        success, version_metadata, error = safe_execute(get_version_info, version)
        if not success:
            return jsonify({
                'success': False,
                'message': error or 'Failed to fetch version metadata'
            }), 500
        
        server_download_url = version_metadata.get('downloads', {}).get('server', {}).get('url')
        if not server_download_url:
            return jsonify({
                'success': False,
                'message': f'No server download URL found for version {version}'
            }), 400
        
        # Download server JAR
        server_jar_path = os.path.join(server_dir, 'server.jar')
        try:
            logger.info(f"Downloading server JAR to: {server_jar_path}")
            jar_response = requests.get(server_download_url, stream=True, timeout=30)
            jar_response.raise_for_status()
            
            with SafeFileOperation(server_jar_path, 'wb') as f:
                for chunk in jar_response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            
            if not os.path.exists(server_jar_path) or os.path.getsize(server_jar_path) == 0:
                return jsonify({
                    'success': False,
                    'message': 'Downloaded server JAR is empty or missing'
                }), 500
            
            logger.info(f"Successfully downloaded server JAR ({os.path.getsize(server_jar_path)} bytes)")
            
        except requests.exceptions.RequestException as e:
            return jsonify({
                'success': False,
                'message': f'Failed to download server JAR: {str(e)}'
            }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error saving server JAR: {str(e)}'
            }), 500
        
        # Create server.properties file
        template_file_path = 'app/static/server.properties.template'
        try:
            with SafeFileOperation(template_file_path, 'r') as template_file:
                template_content = template_file.read()
            
            properties_content = template_content.format(
                level_seed=level_seed or '',
                gamemode=gamemode,
                difficulty=difficulty,
                pvp=str(pvp).lower(),
                motd=motd or '',
                hardcore=str(hardcore).lower(),
                spawn_monsters=str(spawn_monsters).lower(),
                server_port=port
            )
            
        except FileNotFoundError:
            return jsonify({
                'success': False,
                'message': 'Server properties template file not found'
            }), 500
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error processing server properties template: {str(e)}'
            }), 500
        
        # Write server.properties
        properties_file_path = os.path.join(server_dir, 'server.properties')
        try:
            with SafeFileOperation(properties_file_path, 'w') as f:
                f.write(properties_content)
            logger.info(f"Created server.properties file: {properties_file_path}")
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Failed to write server.properties file: {str(e)}'
            }), 500
        
        # Create server record
        server = Server(
            server_name=server_name,
            version=version,
            port=port,
            status='Stopped',
            level_seed=level_seed or None,
            gamemode=gamemode,
            difficulty=difficulty,
            hardcore=hardcore,
            pvp=pvp,
            spawn_monsters=spawn_monsters,
            motd=motd or None,
            memory_mb=memory_mb,
            owner_id=current_user.id
        )
        
        try:
            with SafeDatabaseOperation(db.session) as session:
                session.add(server)
            logger.info(f"Server '{server_name}' added to database with ID {server.id}")
        except DatabaseError as e:
            # Clean up created files if database operation fails
            try:
                if os.path.exists(server_dir):
                    shutil.rmtree(server_dir)
                    logger.info(f"Cleaned up server directory after database error: {server_dir}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup server directory: {cleanup_error}")
            return jsonify({
                'success': False,
                'message': f'Failed to save server to database: {str(e)}'
            }), 500
        
        logger.info(f"Server '{server_name}' created by user {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': 'Server created successfully',
            'server': {
                'id': server.id,
                'server_name': server.server_name,
                'version': server.version,
                'port': server.port,
                'status': server.status,
                'memory_mb': server.memory_mb,
                'owner_id': server.owner_id,
                'level_seed': server.level_seed,
                'gamemode': server.gamemode,
                'difficulty': server.difficulty,
                'hardcore': server.hardcore,
                'pvp': server.pvp,
                'spawn_monsters': server.spawn_monsters,
                'motd': server.motd
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error creating server: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the server'
        }), 500

@server_bp.route('/<int:server_id>', methods=['GET'])
@login_required
def get_server(server_id):
    """
    Get specific server details.
    
    Response:
    {
        "success": true,
        "server": {
            "id": 1,
            "server_name": "My Server",
            "version": "1.21.8",
            "port": 25565,
            "status": "Running",
            "pid": 12345,
            "memory_mb": 1024,
            "owner_id": 1,
            "level_seed": "optional_seed",
            "gamemode": "survival",
            "difficulty": "normal",
            "hardcore": false,
            "pvp": true,
            "spawn_monsters": true,
            "motd": "Welcome to my server!",
            "created_at": "2025-09-04T00:00:00Z",
            "updated_at": "2025-09-04T00:00:00Z"
        }
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        return jsonify({
            'success': True,
            'server': {
                'id': server.id,
                'server_name': server.server_name,
                'version': server.version,
                'port': server.port,
                'status': server.status,
                'pid': server.pid,
                'memory_mb': server.memory_mb,
                'owner_id': server.owner_id,
                'level_seed': server.level_seed,
                'gamemode': server.gamemode,
                'difficulty': server.difficulty,
                'hardcore': server.hardcore,
                'pvp': server.pvp,
                'spawn_monsters': server.spawn_monsters,
                'motd': server.motd,
                'created_at': server.created_at.isoformat() if server.created_at else None,
                'updated_at': server.updated_at.isoformat() if server.updated_at else None
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting server {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching server details'
        }), 500

@server_bp.route('/<int:server_id>/start', methods=['POST'])
@login_required
def start_server(server_id):
    """
    Start a Minecraft server.
    
    Response:
    {
        "success": true,
        "message": "Server started successfully",
        "server": {
            "id": 1,
            "status": "Running",
            "pid": 12345
        }
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        if server.status == 'Running' and server.pid:
            return jsonify({
                'success': False,
                'message': 'Server is already running'
            }), 400
        
        server_dir = os.path.normpath(os.path.join('servers', server.server_name))
        eula_file_path = os.path.join(server_dir, 'eula.txt')
        
        # Validate server directory path for security
        if not server_dir.startswith('servers/'):
            return jsonify({
                'success': False,
                'message': 'Invalid server directory path'
            }), 400
        
        # Check if EULA has been accepted
        try:
            if os.path.exists(eula_file_path):
                with SafeFileOperation(eula_file_path, 'r') as eula_file:
                    eula_content = eula_file.read()
                    if 'eula=true' not in eula_content:
                        return jsonify({
                            'success': False,
                            'message': 'EULA must be accepted before starting the server',
                            'eula_required': True
                        }), 400
            else:
                return jsonify({
                    'success': False,
                    'message': 'EULA file not found. Please ensure the server is set up correctly.'
                }), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error checking EULA file: {str(e)}'
            }), 500
        
        server_jar_path = os.path.join(server_dir, 'server.jar')
        
        # Check if server JAR exists
        if not os.path.exists(server_jar_path):
            return jsonify({
                'success': False,
                'message': f'Server JAR not found: {server_jar_path}'
            }), 400
        
        # Build the command to start the server with the server's allocated memory
        memory_mb = server.memory_mb
        command = [
            'java',
            f'-Xms{memory_mb}M',
            f'-Xmx{memory_mb}M',
            '-jar',
            'server.jar',
            'nogui'
        ]
        
        logger.info(f"Starting server {server.server_name} with command: {' '.join(command)}")
        
        try:
            # Start the server
            process = subprocess.Popen(
                command,
                cwd=server_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Update the server status and PID in the database
            try:
                with SafeDatabaseOperation(db.session) as session:
                    server.status = 'Running'
                    server.pid = process.pid
                
                logger.info(f"Server {server.server_name} started successfully with PID {process.pid}")
                
                return jsonify({
                    'success': True,
                    'message': 'Server started successfully',
                    'server': {
                        'id': server.id,
                        'status': server.status,
                        'pid': server.pid
                    }
                }), 200
                
            except DatabaseError as e:
                # If database update fails, try to terminate the process
                try:
                    process.terminate()
                    logger.warning(f"Terminated server process due to database error")
                except Exception as term_error:
                    logger.error(f"Failed to terminate process after database error: {term_error}")
                return jsonify({
                    'success': False,
                    'message': f'Failed to update server status in database: {str(e)}'
                }), 500
                
        except subprocess.SubprocessError as e:
            logger.error(f"Failed to start server {server.server_name}: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Failed to start server process: {str(e)}'
            }), 500
        except Exception as e:
            logger.error(f"Unexpected error starting server {server.server_name}: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Unexpected error starting server: {str(e)}'
            }), 500
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error starting server {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while starting the server'
        }), 500

@server_bp.route('/<int:server_id>/stop', methods=['POST'])
@login_required
def stop_server(server_id):
    """
    Stop a Minecraft server.
    
    Response:
    {
        "success": true,
        "message": "Server stopped successfully",
        "server": {
            "id": 1,
            "status": "Stopped",
            "pid": null
        }
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        if server.status != 'Running' or not server.pid:
            return jsonify({
                'success': False,
                'message': 'Server is already stopped'
            }), 400
        
        pid = server.pid
        logger.info(f"Stopping server {server.server_name} with PID {pid}")
        
        try:
            process = psutil.Process(pid)
            
            # First, try graceful termination
            process.terminate()
            logger.debug(f"Sent SIGTERM to process {pid}")
            
            try:
                process.wait(timeout=10)
                logger.info(f"Process {pid} terminated gracefully")
            except psutil.TimeoutExpired:
                # If the process did not terminate gracefully, force kill it
                logger.warning(f"Process {pid} did not terminate gracefully, force killing")
                process.kill()
                process.wait(timeout=5)  # Give it a moment to die
                logger.info(f"Process {pid} force killed")
            
            # Update database status
            try:
                with SafeDatabaseOperation(db.session) as session:
                    server.status = 'Stopped'
                    server.pid = None
                
                logger.info(f"Server {server.server_name} stopped successfully")
                
                return jsonify({
                    'success': True,
                    'message': 'Server stopped successfully',
                    'server': {
                        'id': server.id,
                        'status': server.status,
                        'pid': server.pid
                    }
                }), 200
                
            except DatabaseError as e:
                logger.error(f"Database error updating server status: {str(e)}")
                return jsonify({
                    'success': False,
                    'message': f'Server was stopped but failed to update status: {str(e)}'
                }), 500
                
        except psutil.NoSuchProcess:
            logger.info(f"Process {pid} for server {server.server_name} was not running")
            # Update status anyway since the process doesn't exist
            try:
                with SafeDatabaseOperation(db.session) as session:
                    server.status = 'Stopped'
                    server.pid = None
            except DatabaseError as e:
                logger.error(f"Failed to update status for non-existent process: {str(e)}")
                return jsonify({
                    'success': False,
                    'message': f'Failed to update status: {str(e)}'
                }), 500
            
            return jsonify({
                'success': True,
                'message': 'Server was not running. Status updated.',
                'server': {
                    'id': server.id,
                    'status': server.status,
                    'pid': server.pid
                }
            }), 200
            
        except psutil.AccessDenied:
            logger.error(f"Access denied when trying to stop process {pid}")
            return jsonify({
                'success': False,
                'message': f'Permission denied when stopping server {server.server_name}'
            }), 500
            
        except Exception as e:
            logger.error(f"Unexpected error stopping server {server.server_name}: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Unexpected error stopping server: {str(e)}'
            }), 500
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error stopping server {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while stopping the server'
        }), 500

@server_bp.route('/<int:server_id>/status', methods=['GET'])
@login_required
def get_server_status(server_id):
    """
    Get real-time server status.
    
    Response:
    {
        "success": true,
        "status": {
            "is_running": true,
            "pid": 12345,
            "memory_usage": 512,
            "cpu_usage": 15.5,
            "uptime": 3600
        }
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        # Get real-time process status
        if server.pid:
            process_status = verify_process_status(server.pid)
            return jsonify({
                'success': True,
                'status': {
                    'is_running': process_status['is_running'],
                    'pid': server.pid,
                    'memory_usage': process_status.get('memory_usage', 0),
                    'cpu_usage': process_status.get('cpu_usage', 0),
                    'uptime': process_status.get('uptime', 0)
                }
            }), 200
        else:
            return jsonify({
                'success': True,
                'status': {
                    'is_running': False,
                    'pid': None,
                    'memory_usage': 0,
                    'cpu_usage': 0,
                    'uptime': 0
                }
            }), 200
            
    except Exception as e:
        logger.error(f"Error getting server status {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching server status'
        }), 500

@server_bp.route('/versions', methods=['GET'])
@login_required
def get_available_versions():
    """
    Get list of available Minecraft versions.
    
    Response:
    {
        "success": true,
        "versions": [
            {
                "id": "1.21.8",
                "type": "release",
                "url": "https://piston-meta.mojang.com/v1/packages/..."
            }
        ]
    }
    """
    try:
        # Fetch version manifest
        version_manifest = fetch_version_manifest()
        if not version_manifest:
            return jsonify({
                'success': False,
                'message': 'Failed to fetch version information'
            }), 500
        
        # Load exclusion list
        exclusion_list = load_exclusion_list()
        
        # Filter versions
        available_versions = []
        for version in version_manifest.get('versions', []):
            if version['id'] not in exclusion_list:
                available_versions.append({
                    'id': version['id'],
                    'type': version['type'],
                    'url': version['url']
                })
        
        return jsonify({
            'success': True,
            'versions': available_versions
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching versions: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching available versions'
        }), 500

@server_bp.route('/<int:server_id>', methods=['DELETE'])
@login_required
def delete_server(server_id):
    """
    Delete a server and all its files.
    
    Response:
    {
        "success": true,
        "message": "Server deleted successfully"
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        # Stop the server if it is running
        if server.status == 'Running' and server.pid:
            try:
                process = psutil.Process(server.pid)
                process.terminate()
                try:
                    process.wait(timeout=10)
                except psutil.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=5)
                logger.info(f"Stopped server {server.server_name} before deletion")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                logger.warning(f"Could not stop server process {server.pid}")
        
        # Remove server directory
        server_dir = os.path.join('servers', server.server_name)
        if os.path.exists(server_dir):
            try:
                shutil.rmtree(server_dir)
                logger.info(f"Deleted server directory: {server_dir}")
            except Exception as e:
                logger.error(f"Error deleting server files: {e}")
                return jsonify({
                    'success': False,
                    'message': f'Error deleting server files: {str(e)}'
                }), 500
        
        # Remove the server entry from the database
        server_name = server.server_name
        db.session.delete(server)
        db.session.commit()
        
        logger.info(f"Server '{server_name}' deleted by user {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': f'Server {server_name} deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting server {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the server'
        }), 500

@server_bp.route('/<int:server_id>/backup', methods=['POST'])
@login_required
def backup_server(server_id):
    """
    Create a backup of the server files.
    
    Response:
    {
        "success": true,
        "message": "Backup created successfully",
        "backup_file": "server_name_20250904120000.tar.gz"
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        server_dir = os.path.join('servers', server.server_name)
        backup_dir = os.path.join('backups', server.server_name)
        
        # Create the backup directory if it doesn't exist
        if not os.path.exists(backup_dir):
            os.makedirs(backup_dir)
        
        # Determine if the server is running
        was_running = server.status == 'Running' and server.pid is not None
        
        # Stop the server if it's running
        if was_running:
            pid = server.pid
            try:
                process = psutil.Process(pid)
                process.terminate()
                try:
                    process.wait(timeout=10)
                except psutil.TimeoutExpired:
                    process.kill()
                    process.wait()
                server.status = 'Stopped'
                server.pid = None
                db.session.commit()
                logger.info(f"Server {server.server_name} stopped for backup")
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                server.status = 'Stopped'
                server.pid = None
                db.session.commit()
                logger.info(f"Server {server.server_name} was not running")
            except Exception as e:
                logger.error(f"Error stopping server for backup: {e}")
                return jsonify({
                    'success': False,
                    'message': f'Error stopping server for backup: {str(e)}'
                }), 500
        
        # Create the backup file with a timestamp
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        backup_filename = f"{server.server_name}_{timestamp}.tar.gz"
        backup_filepath = os.path.join(backup_dir, backup_filename)
        
        try:
            # Create a tar.gz archive of the server directory
            with tarfile.open(backup_filepath, "w:gz") as tar:
                tar.add(server_dir, arcname=os.path.basename(server_dir))
            logger.info(f"Backup created: {backup_filepath}")
        except Exception as e:
            logger.error(f"Error creating backup: {e}")
            return jsonify({
                'success': False,
                'message': f'Error creating backup: {str(e)}'
            }), 500
        
        # Restart the server if it was running before
        if was_running:
            try:
                # Build the command to start the server
                command = [
                    'java',
                    f'-Xms{server.memory_mb}M',
                    f'-Xmx{server.memory_mb}M',
                    '-jar',
                    'server.jar',
                    'nogui'
                ]
                
                process = subprocess.Popen(
                    command,
                    cwd=server_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE
                )
                
                server.status = 'Running'
                server.pid = process.pid
                db.session.commit()
                logger.info(f"Server {server.server_name} restarted after backup")
            except Exception as e:
                logger.error(f"Error restarting server after backup: {e}")
                return jsonify({
                    'success': False,
                    'message': f'Backup created but error restarting server: {str(e)}'
                }), 500
        
        return jsonify({
            'success': True,
            'message': f'Backup of {server.server_name} completed successfully',
            'backup_file': backup_filename
        }), 200
        
    except Exception as e:
        logger.error(f"Error backing up server {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating the backup'
        }), 500

@server_bp.route('/<int:server_id>/accept-eula', methods=['POST'])
@login_required
def accept_eula(server_id):
    """
    Accept the EULA for a server.
    
    Response:
    {
        "success": true,
        "message": "EULA accepted successfully"
    }
    """
    try:
        server = check_server_access(server_id)
        if not server:
            return jsonify({
                'success': False,
                'message': 'Server not found or access denied'
            }), 404
        
        server_dir = os.path.join('servers', server.server_name)
        eula_file_path = os.path.join(server_dir, 'eula.txt')
        
        if not os.path.exists(eula_file_path):
            return jsonify({
                'success': False,
                'message': 'EULA file not found. Please ensure the server is set up correctly.'
            }), 400
        
        # Accept the EULA
        try:
            with SafeFileOperation(eula_file_path, 'w') as eula_file:
                eula_file.write('eula=true\n')
            logger.info(f"EULA accepted for server {server.server_name}")
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error accepting EULA: {str(e)}'
            }), 500
        
        return jsonify({
            'success': True,
            'message': 'EULA accepted successfully. You can now start the server.'
        }), 200
        
    except Exception as e:
        logger.error(f"Error accepting EULA for server {server_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while accepting the EULA'
        }), 500

@server_bp.route('/memory-usage', methods=['GET'])
@login_required
def get_memory_usage():
    """
    Get system memory usage summary.
    
    Response:
    {
        "success": true,
        "memory_summary": {
            "total_allocated": 2048,
            "total_available": 8192,
            "utilization_percentage": 25.0
        }
    }
    """
    try:
        memory_summary = get_memory_usage_summary()
        
        return jsonify({
            'success': True,
            'memory_summary': memory_summary
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching memory usage: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching memory usage'
        }), 500
