from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from sqlalchemy.exc import IntegrityError
from ..models import Server
from ..extensions import db
from ..utils import (
    is_valid_server_name,
    find_next_available_port,
    fetch_version_manifest,
    get_version_info,
    load_exclusion_list,
    get_memory_config,
    get_memory_usage_summary,
    validate_memory_allocation,
    format_memory_display,
)
from ..error_handlers import (
    route_error_handler, handle_network_error, handle_file_operations,
    handle_server_operations, handle_database_operations, safe_execute,
    ValidationError, NetworkError, FileOperationError, ServerError, DatabaseError,
    SafeFileOperation, SafeDatabaseOperation, logger, create_error_response
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

server_bp = Blueprint('server', __name__)

@server_bp.route('/')
@login_required
@route_error_handler
def home():
    """Homepage with list of game servers."""
    logger.info(f"User {current_user.username} accessing home page")
    
    try:
        servers = Server.query.all()

        # Update the is_running attribute based on server status
        for server in servers:
            server.is_running = server.status == 'Running' and server.pid is not None

        # Get memory usage summary
        memory_summary = get_memory_usage_summary()
        
        logger.debug(f"Loaded {len(servers)} servers for home page")
        return render_template('home.html', servers=servers, memory_summary=memory_summary)
    except Exception as e:
        logger.error(f"Error loading home page: {str(e)}")
        flash("Error loading server list. Please try again.", "danger")
        return render_template('home.html', servers=[])

@server_bp.route('/create', methods=['GET', 'POST'])
@login_required
@route_error_handler
def create():
    """Create a new game server."""
    logger.info(f"User {current_user.username} accessing create server page")
    
    if request.method == 'POST':
        version_type = request.form.get('version_type', '').strip()
        selected_version = request.form.get('selected_version', '').strip()
        
        # Validate inputs
        if not version_type or version_type not in ['release', 'snapshot']:
            raise ValidationError("Invalid version type selected")
        
        if not selected_version:
            raise ValidationError("No version selected")

        logger.info(f"User selected version: {selected_version} ({version_type})")
        # Redirect to the configure server page with the selected version and type
        return redirect(url_for('server.configure_server', version_type=version_type, version=selected_version))
    else:
        # Fetch the manifest data and exclusion list
        success, manifest, error = safe_execute(fetch_version_manifest)
        if not success:
            raise NetworkError(error or "Failed to fetch version manifest")
        
        success, excluded_versions, error = safe_execute(load_exclusion_list)
        if not success:
            logger.warning(f"Failed to load exclusion list: {error}")
            excluded_versions = []  # Continue with empty list

        # Extract version information safely
        latest_release = manifest.get('latest', {}).get('release', 'Unknown')
        latest_snapshot = manifest.get('latest', {}).get('snapshot', 'Unknown')

        releases = [
            version['id'] for version in manifest.get('versions', [])
            if version.get('type') == 'release' and version.get('id') not in excluded_versions
        ]
        snapshots = [
            version['id'] for version in manifest.get('versions', [])
            if version.get('type') == 'snapshot' and version.get('id') not in excluded_versions
        ]
        
        logger.info(f"Loaded {len(releases)} releases and {len(snapshots)} snapshots")
        
        # Render the page and pass the versions
        return render_template(
            'select_version.html',
            latest_release=latest_release,
            latest_snapshot=latest_snapshot,
            releases=releases,
            snapshots=snapshots
        )

@server_bp.route('/configure_server', methods=['GET', 'POST'])
@login_required
@route_error_handler
def configure_server():
    """Get server config from user and create the game server instance."""
    version_type = request.args.get('version_type')
    version = request.args.get('version')
    
    logger.info(f"User {current_user.username} configuring server for version {version} ({version_type})")

    if request.method == 'POST':
        # Extract and validate form data
        server_name = (request.form.get('server_name') or '').strip()
        level_seed = (request.form.get('level_seed') or '').strip()
        gamemode = (request.form.get('gamemode') or '').strip()
        difficulty = (request.form.get('difficulty') or '').strip()
        hardcore = 'hardcore' in request.form
        pvp = 'pvp' in request.form
        spawn_monsters = 'spawn_monsters' in request.form
        motd = (request.form.get('motd') or '').strip()

        # Validation with proper error handling
        valid_gamemodes = {'survival', 'creative', 'adventure', 'spectator'}
        valid_difficulties = {'peaceful', 'easy', 'normal', 'hard'}

        if gamemode not in valid_gamemodes:
            raise ValidationError('Invalid gamemode selected. Please choose survival, creative, adventure, or spectator.')

        if difficulty not in valid_difficulties:
            raise ValidationError('Invalid difficulty selected. Please choose peaceful, easy, normal, or hard.')
        
        if len(level_seed) > 100:
            raise ValidationError('Level seed is too long. Maximum length is 100 characters.')

        if len(motd) > 150:
            raise ValidationError('MOTD is too long. Maximum length is 150 characters.')

        # Validate server name
        if not server_name or not is_valid_server_name(server_name):
            raise ValidationError('Invalid server name. Use only letters, numbers, underscores, and hyphens.')
        
        # Check for duplicate server name
        existing_server = Server.query.filter_by(server_name=server_name).first()
        if existing_server:
            raise ValidationError('A server with this name already exists. Please choose a different name.')
        
        # Validate memory allocation
        try:
            memory_mb = int(request.form.get('memory_mb', get_memory_config()['default_server_mb']))
        except (ValueError, TypeError):
            memory_mb = get_memory_config()['default_server_mb']
        
        is_valid, error_msg, available_memory = validate_memory_allocation(memory_mb)
        if not is_valid:
            raise ValidationError(error_msg)
        
        logger.info(f"Creating server '{server_name}' with gamemode '{gamemode}', difficulty '{difficulty}', and memory '{memory_mb}MB'")

        # Create the server directory inside 'servers/' with proper error handling
        server_dir = os.path.normpath(os.path.join('servers', server_name))
        
        # Ensure the path is safe and within the servers directory
        if not server_dir.startswith('servers/'):
            raise ValidationError("Invalid server directory path")
        
        try:
            if not os.path.exists(server_dir):
                os.makedirs(server_dir, exist_ok=True)
                logger.info(f"Created server directory: {server_dir}")
        except OSError as e:
            raise FileOperationError(f"Failed to create server directory: {str(e)}")

        # Find the next available port
        success, server_port, error = safe_execute(find_next_available_port)
        if not success:
            raise ServerError(error or "Failed to allocate port")

        # Get the server jar download URL from the version metadata
        success, version_metadata, error = safe_execute(get_version_info, version)
        if not success:
            raise NetworkError(error or "Failed to fetch version metadata")
        
        server_download_url = version_metadata.get('downloads', {}).get('server', {}).get('url')
        if not server_download_url:
            raise ValidationError(f"No server download URL found for version {version}")
        
        logger.info(f"Server JAR download URL: {server_download_url}")

        # Download the server jar with proper error handling
        server_jar_path = os.path.join(server_dir, 'server.jar')
        
        try:
            logger.info(f"Downloading server JAR to: {server_jar_path}")
            jar_response = requests.get(server_download_url, stream=True, timeout=30)
            jar_response.raise_for_status()

            with SafeFileOperation(server_jar_path, 'wb') as f:
                for chunk in jar_response.iter_content(chunk_size=8192):
                    if chunk:  # Filter out keep-alive chunks
                        f.write(chunk)
            
            # Verify the file was downloaded
            if not os.path.exists(server_jar_path) or os.path.getsize(server_jar_path) == 0:
                raise FileOperationError("Downloaded server JAR is empty or missing")
            
            logger.info(f"Successfully downloaded server JAR ({os.path.getsize(server_jar_path)} bytes)")
            
        except requests.exceptions.RequestException as e:
            raise NetworkError(f"Failed to download server JAR: {str(e)}")
        except Exception as e:
            raise FileOperationError(f"Error saving server JAR: {str(e)}")

        # Load and format the server.properties template with error handling
        template_file_path = 'app/static/server.properties.template'
        
        try:
            with SafeFileOperation(template_file_path, 'r') as template_file:
                template_content = template_file.read()

            # Use str.format() to replace the placeholders with actual values
            properties_content = template_content.format(
                level_seed=level_seed or '',
                gamemode=gamemode,
                difficulty=difficulty,
                pvp=str(pvp).lower(),
                motd=motd or '',
                hardcore=str(hardcore).lower(),
                spawn_monsters=str(spawn_monsters).lower(),
                server_port=server_port
            )
            
            logger.debug(f"Generated server properties for {server_name}")
            
        except FileNotFoundError:
            raise FileOperationError("Server properties template file not found")
        except Exception as e:
            raise FileOperationError(f"Error processing server properties template: {str(e)}")

        # Write the formatted content to the server.properties file
        properties_file_path = os.path.join(server_dir, 'server.properties')
        
        try:
            with SafeFileOperation(properties_file_path, 'w') as f:
                f.write(properties_content)
            logger.info(f"Created server.properties file: {properties_file_path}")
        except Exception as e:
            raise FileOperationError(f"Failed to write server.properties file: {str(e)}")

        # Add the server to the database with proper error handling
        new_server = Server(
            server_name=server_name,
            version=version,
            port=server_port,  
            status='Stopped',
            pid=None,
            level_seed=level_seed or None,
            gamemode=gamemode,
            difficulty=difficulty,
            hardcore=hardcore,
            pvp=pvp,
            spawn_monsters=spawn_monsters,
            motd=motd or None,
            memory_mb=memory_mb
        )
        
        try:
            with SafeDatabaseOperation(db.session) as session:
                session.add(new_server)
                # Session will be committed automatically by context manager
            logger.info(f"Server '{server_name}' added to database with ID {new_server.id}")
        except DatabaseError as e:
            # Clean up created files if database operation fails
            try:
                if os.path.exists(server_dir):
                    shutil.rmtree(server_dir)
                    logger.info(f"Cleaned up server directory after database error: {server_dir}")
            except Exception as cleanup_error:
                logger.warning(f"Failed to cleanup server directory: {cleanup_error}")
            raise DatabaseError(f"Failed to save server to database: {str(e)}")
        # Run server for the first time to produce eula.txt with proper error handling
        try:
            logger.info(f"Running initial server startup to generate EULA for {server_name}")
            # Start the server to generate eula.txt
            process = subprocess.Popen(
                ['java', '-jar', 'server.jar', 'nogui'],
                cwd=server_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            # Wait for a short time to ensure eula.txt is generated
            try:
                stdout, stderr = process.communicate(timeout=10)
                logger.debug(f"Initial server run output: {stdout[:200]}...")
            except subprocess.TimeoutExpired:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            
        except subprocess.SubprocessError as e:
            logger.warning(f"Subprocess error during initial server run: {str(e)}")
            # Continue execution as this is not critical
        except Exception as e:
            logger.warning(f"Error starting server for EULA generation: {str(e)}")
            # Continue execution as this is not critical

        # Check if eula.txt exists and eula is not accepted
        eula_file_path = os.path.join(server_dir, 'eula.txt')
        
        try:
            if os.path.exists(eula_file_path):
                with SafeFileOperation(eula_file_path, 'r') as eula_file:
                    eula_content = eula_file.read()
                    if 'eula=false' in eula_content:
                        logger.info(f"EULA not accepted for server {server_name}, redirecting to EULA page")
                        flash('You need to accept the EULA to proceed.', 'info')
                        return redirect(url_for('server.accept_eula', server_id=new_server.id))
                    elif 'eula=true' in eula_content:
                        logger.info(f"EULA already accepted for server {server_name}")
            else:
                logger.warning(f"EULA file not found for server {server_name}, redirecting to EULA page")
                flash('EULA file not found. You will need to accept the EULA.', 'warning')
                return redirect(url_for('server.accept_eula', server_id=new_server.id))

            logger.info(f"Server '{server_name}' created successfully on port {server_port}")
            flash(f'Server {server_name} created successfully on port {server_port}!', 'success')
            return redirect(url_for('server.home'))
            
        except Exception as e:
            logger.error(f"Error checking EULA file: {str(e)}")
            flash('Server created but there was an issue checking the EULA. Please try starting the server.', 'warning')
            return redirect(url_for('server.home'))

    # Handle GET request - display the configuration form
    if not version_type or not version:
        raise ValidationError("Missing version information")
    
    # Get memory configuration for the form
    memory_config = get_memory_config()
    memory_summary = get_memory_usage_summary()
    
    logger.info(f"Displaying configuration form for version {version} ({version_type})")
    return render_template('configure_server.html', 
                         version_type=version_type, 
                         version=version,
                         memory_config=memory_config,
                         memory_summary=memory_summary)

@server_bp.route('/start/<int:server_id>', methods=['POST'])
@login_required
@route_error_handler
def start_server(server_id):
    """Start the server if not running."""
    logger.info(f"User {current_user.username} attempting to start server ID {server_id}")
    server = Server.query.get_or_404(server_id)

    server_dir = os.path.normpath(os.path.join('servers', server.server_name))
    eula_file_path = os.path.join(server_dir, 'eula.txt')
    
    # Validate server directory path for security
    if not server_dir.startswith('servers/'):
        raise ValidationError("Invalid server directory path")

    # Check if EULA has been accepted
    try:
        if os.path.exists(eula_file_path):
            with SafeFileOperation(eula_file_path, 'r') as eula_file:
                eula_content = eula_file.read()
                if 'eula=true' not in eula_content:
                    logger.info(f"EULA not accepted for server {server.server_name}")
                    flash('You must accept the EULA before starting the server.', 'warning')
                    return redirect(url_for('server.accept_eula', server_id=server.id))
        else:
            logger.warning(f"EULA file not found for server {server.server_name}")
            raise FileOperationError('EULA file not found. Please ensure the server is set up correctly.')
    except FileOperationError:
        raise
    except Exception as e:
        logger.error(f"Error checking EULA for server {server.server_name}: {str(e)}")
        raise FileOperationError(f"Error checking EULA file: {str(e)}")

    # Check if the server is already running
    if server.status == 'Running' and server.pid:
        logger.info(f"Server {server.server_name} is already running (PID: {server.pid})")
        flash(f"Server {server.server_name} is already running.", 'info')
        return redirect(url_for('server.home'))

    server_jar_path = os.path.join(server_dir, 'server.jar')
    
    # Check if server JAR exists
    if not os.path.exists(server_jar_path):
        raise FileOperationError(f"Server JAR not found: {server_jar_path}")

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
                # Session will be committed automatically
            
            logger.info(f"Server {server.server_name} started successfully with PID {process.pid}")
            flash(f"Server {server.server_name} started successfully.", 'success')
            
        except DatabaseError as e:
            # If database update fails, try to terminate the process
            try:
                process.terminate()
                logger.warning(f"Terminated server process due to database error")
            except Exception as term_error:
                logger.error(f"Failed to terminate process after database error: {term_error}")
            raise DatabaseError(f"Failed to update server status in database: {str(e)}")
            
    except subprocess.SubprocessError as e:
        logger.error(f"Failed to start server {server.server_name}: {str(e)}")
        raise ServerError(f"Failed to start server process: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error starting server {server.server_name}: {str(e)}")
        raise ServerError(f"Unexpected error starting server: {str(e)}")

    return redirect(url_for('server.home'))

@server_bp.route('/stop/<int:server_id>', methods=['POST'])
@login_required
@route_error_handler
@handle_server_operations
def stop_server(server_id):
    """Stop the server if running."""
    logger.info(f"User {current_user.username} attempting to stop server ID {server_id}")
    server = Server.query.get_or_404(server_id)

    if server.status != 'Running' or not server.pid:
        logger.info(f"Server {server.server_name} is already stopped")
        flash(f"Server {server.server_name} is already stopped.", 'info')
        return redirect(url_for('server.home'))

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
                # Session will be committed automatically
            
            logger.info(f"Server {server.server_name} stopped successfully")
            flash(f"Server {server.server_name} stopped successfully.", 'success')
            
        except DatabaseError as e:
            logger.error(f"Database error updating server status: {str(e)}")
            # The process was stopped, but we couldn't update the database
            raise DatabaseError(f"Server was stopped but failed to update status: {str(e)}")
            
    except psutil.NoSuchProcess:
        logger.info(f"Process {pid} for server {server.server_name} was not running")
        # Update status anyway since the process doesn't exist
        try:
            with SafeDatabaseOperation(db.session) as session:
                server.status = 'Stopped'
                server.pid = None
        except DatabaseError as e:
            logger.error(f"Failed to update status for non-existent process: {str(e)}")
            raise
        
        flash(f"Server {server.server_name} was not running. Status updated.", 'info')
        
    except psutil.AccessDenied:
        logger.error(f"Access denied when trying to stop process {pid}")
        raise ServerError(f"Permission denied when stopping server {server.server_name}")
        
    except Exception as e:
        logger.error(f"Unexpected error stopping server {server.server_name}: {str(e)}")
        raise ServerError(f"Unexpected error stopping server: {str(e)}")

    return redirect(url_for('server.home'))

@server_bp.route('/delete/<int:server_id>', methods=['POST', 'GET'])
@login_required
def delete_server(server_id):
    """Delete the server entry and files."""
    server = Server.query.get_or_404(server_id)

    if request.method == 'POST':
        # Stop the server if it is running
        if server.status == 'Running':
            server_dir = os.path.join('servers', server.server_name)
            pid_file = os.path.join(server_dir, 'server.pid')
            if server.pid:
                try:
                    os.kill(server.pid, signal.SIGTERM)  # Stop the server
                except Exception as e:
                    flash(f"Error stopping server: {e}")
            server.status = 'Stopped'
            server.pid = None
            db.session.commit()

        # Remove server directory
        server_dir = os.path.join('servers', server.server_name)
        if os.path.exists(server_dir):
            try:
                shutil.rmtree(server_dir)  # Delete the server folder
            except Exception as e:
                flash(f"Error deleting server files: {e}")
                return redirect(url_for('server.home'))

        # Remove the server entry from the database
        db.session.delete(server)
        db.session.commit()

        flash(f'Server {server.server_name} deleted successfully!')
    return redirect(url_for('server.home'))

@server_bp.route('/backup/<int:server_id>', methods=['POST'])
@login_required
def backup_server(server_id):
    """Backup the server files."""
    server = Server.query.get_or_404(server_id)

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
            # Terminate the process
            process.terminate()
            try:
                process.wait(timeout=10)
            except psutil.TimeoutExpired:
                # If the process did not terminate, kill it
                process.kill()
            server.status = 'Stopped'
            server.pid = None
            db.session.commit()
            flash(f"Server {server.server_name} stopped for backup.")
        except psutil.NoSuchProcess:
            server.status = 'Stopped'
            server.pid = None
            db.session.commit()
            flash(f"Server {server.server_name} was not running.")
        except Exception as e:
            flash(f"Error stopping server: {e}")
            return redirect(url_for('server.home'))

    # Create the backup file with a timestamp
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    backup_filename = f"{server.server_name}_{timestamp}.tar.gz"
    backup_filepath = os.path.join(backup_dir, backup_filename)

    try:
        # Create a tar.gz archive of the server directory
        with tarfile.open(backup_filepath, "w:gz") as tar:
            tar.add(server_dir, arcname=os.path.basename(server_dir))
        flash(f"Backup of {server.server_name} completed successfully.")
    except Exception as e:
        flash(f"Error creating backup: {e}")
        return redirect(url_for('server.home'))

    # Restart the server if it was running before
    if was_running:
        try:
            # Build the command to start the server
            command = [
                'java',
                '-Xms1024M',
                '-Xmx1024M',
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
            flash(f"Server {server.server_name} restarted after backup.")
        except Exception as e:
            flash(f"Error restarting server: {e}")
            return redirect(url_for('server.home'))

    return redirect(url_for('server.home'))

@server_bp.route('/accept_eula/<int:server_id>', methods=['GET', 'POST'])
@login_required
def accept_eula(server_id):
    server = Server.query.get_or_404(server_id)
    server_dir = os.path.join('servers', server.server_name)
    eula_file_path = os.path.join(server_dir, 'eula.txt')

    if not os.path.exists(eula_file_path):
        flash('eula.txt not found. Please ensure the server started correctly.')
        return redirect(url_for('.home'))

    if request.method == 'POST':
        # User has accepted the EULA
        with open(eula_file_path, 'w') as eula_file:
            eula_file.write('eula=true\n')
        flash('EULA accepted. You can now start the server.')
        return redirect(url_for('.home'))

    return render_template('accept_eula.html', server=server)
