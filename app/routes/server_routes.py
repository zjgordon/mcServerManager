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
    # ... other utility functions
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
def home():
    """Homepage with list of game servers."""
    servers = Server.query.all()

    # Update the is_running attribute based on server status
    for server in servers:
        server.is_running = server.status == 'Running' and server.pid is not None

    return render_template('home.html', servers=servers)

@server_bp.route('/create', methods=['GET', 'POST'])
@login_required
def create():
    """Create a new game server."""
    if request.method == 'POST':
        version_type = request.form['version_type']  
        selected_version = request.form['selected_version']

        # Redirect to the configure server page with the selected version and type
        return redirect(url_for('server.configure_server', version_type=version_type, version=selected_version))
    else:
        try:
            # Fetch the manifest data using the helper function
            manifest = fetch_version_manifest()
            excluded_versions = load_exclusion_list()

            latest_release = manifest['latest']['release']
            latest_snapshot = manifest['latest']['snapshot']

            releases = [
                version['id'] for version in manifest['versions']
                if version['type'] == 'release' and version['id'] not in excluded_versions
            ]
            snapshots = [
                version['id'] for version in manifest['versions']
                if version['type'] == 'snapshot' and version['id'] not in excluded_versions
            ]
            
            # Render the page and pass the versions
            return render_template(
                'select_version.html',
                latest_release=latest_release,
                latest_snapshot=latest_snapshot,
                releases=releases,
                snapshots=snapshots
            )
        except requests.exceptions.RequestException as e:
            flash(f"Error fetching version manifest: {e}")
            return redirect(url_for('server.home'))

@server_bp.route('/configure_server', methods=['GET', 'POST'])
@login_required
def configure_server():
    """Get server config from user and create the game server instance."""
    version_type = request.args.get('version_type')
    version = request.args.get('version')

    if request.method == 'POST':
        server_name = request.form.get('server_name').strip()
        level_seed = request.form.get('level_seed')
        gamemode = request.form.get('gamemode')
        difficulty = request.form.get('difficulty')
        hardcore = 'hardcore' in request.form
        pvp = 'pvp' in request.form
        spawn_monsters = 'spawn_monsters' in request.form
        motd = request.form.get('motd')

        valid_gamemodes = {'survival', 'creative', 'adventure', 'spectator'}
        valid_difficulties = {'peaceful', 'easy', 'normal', 'hard'}

        if gamemode not in valid_gamemodes:
            flash('Invalid gamemode selected.')
            return redirect(request.url)

        if difficulty not in valid_difficulties:
            flash('Invalid difficulty selected.')
            return redirect(request.url)
        
        if len(level_seed) > 100:
            flash('Level seed is too long. Maximum length is 100 characters.')
            return redirect(request.url)

        if len(motd) > 150:
            flash('MOTD is too long. Maximum length is 150 characters.')
            return redirect(request.url)

        # Validate server name
        if not server_name or not is_valid_server_name(server_name):
            flash('Invalid server name. Use only letters, numbers, underscores, and hyphens.')
            return redirect(request.url)
        
        # Check for duplicate server name
        existing_server = Server.query.filter_by(server_name=server_name).first()
        if existing_server:
            flash('A server with this name already exists. Please choose a different name.')
            return redirect(request.url)

        # Create the server directory inside 'servers/'
        server_dir = os.path.join('servers', server_name)
        if not os.path.exists(server_dir):
            os.makedirs(server_dir)

        # Find the next available port
        try:
            server_port = find_next_available_port()  # Call the function to get the available port
        except RuntimeError as e:
            flash(f"Error allocating port: {e}")
            return redirect(request.url)

        try:
        # Get the server jar download URL from the version metadata
            version_metadata = get_version_info(version)
            server_download_url = version_metadata['downloads']['server']['url']
        except ValueError as e:
            flash(str(e))
            return redirect(request.url)
        except requests.exceptions.RequestException as e:
            flash(f"Error fetching version metadata: {e}")
            return redirect(request.url)

        # Download the server jar
        server_jar_path = os.path.join(server_dir, 'server.jar')
        try:
            jar_response = requests.get(server_download_url, stream=True)
            jar_response.raise_for_status()

            with open(server_jar_path, 'wb') as f:
                for chunk in jar_response.iter_content(chunk_size=8192):
                    f.write(chunk)

        except requests.exceptions.RequestException as e:
            flash(f"Error downloading server jar: {e}")
            return redirect(request.url)

        # Load and format the server.properties template
        template_file_path = './app/static/server.properties.template'  # Update the path if needed
        try:
            with open(template_file_path, 'r') as template_file:
                template_content = template_file.read()

            # Use str.format() to replace the placeholders with actual values
            properties_content = template_content.format(
                level_seed=level_seed,
                gamemode=gamemode,
                difficulty=difficulty,
                pvp=str(pvp).lower(),  # Convert boolean to lowercase string 'true' or 'false'
                motd=motd,
                hardcore=str(hardcore).lower(),
                spawn_monsters=str(spawn_monsters).lower(),
                server_port=server_port
            )
        except FileNotFoundError:
            flash("Server properties template file not found.")
            return redirect(request.url)

        # Write the formatted content to the server.properties file
        properties_file_path = os.path.join(server_dir, 'server.properties')
        with open(properties_file_path, 'w') as f:
            f.write(properties_content)

        # Add the server to the database
        new_server = Server(
            server_name=server_name,
            version=version,
            port=server_port,  
            status='Stopped',
            pid=None,
            level_seed=level_seed,
            gamemode=gamemode,
            difficulty=difficulty,
            hardcore=hardcore,
            pvp=pvp,
            spawn_monsters=spawn_monsters,
            motd=motd
        )
        db.session.add(new_server)
        try:
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            flash('A server with this name already exists. Please choose a different name.')
            return redirect(request.url)
        # Run server for the first time to produce eula.txt
        try:
            # Start the server to generate eula.txt
            process = subprocess.Popen(
                ['java', '-jar', 'server.jar'],
                cwd=server_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            # Wait for a short time to ensure eula.txt is generated
            time.sleep(5)
            process.terminate()
        except Exception as e:
            flash(f"Error starting server: {e}")

        # Check if eula.txt exists and eula is not accepted
        eula_file_path = os.path.join(server_dir, 'eula.txt')
        if os.path.exists(eula_file_path):
            with open(eula_file_path, 'r') as eula_file:
                eula_content = eula_file.read()
                if 'eula=false' in eula_content:
                    flash('You need to accept the EULA to proceed.')
                    return redirect(url_for('server.accept_eula', server_id=new_server.id))
        else:
            flash('eula.txt not found. Please ensure the server started correctly.')
            return redirect(url_for('server.home'))

        flash(f'Server {server_name} created successfully on port {server_port}!')
        return redirect(url_for('server.home'))

    return render_template('configure_server.html', version_type=version_type, version=version)

@server_bp.route('/start/<int:server_id>', methods=['POST'])
@login_required
def start_server(server_id):
    """Start the server if not running."""
    server = Server.query.get_or_404(server_id)

    server_dir = os.path.join('servers', server.server_name)
    eula_file_path = os.path.join(server_dir, 'eula.txt')

    # Check if EULA has been accepted
    if os.path.exists(eula_file_path):
        with open(eula_file_path, 'r') as eula_file:
            eula_content = eula_file.read()
            if 'eula=true' not in eula_content:
                flash('You must accept the EULA before starting the server.')
                return redirect(url_for('.accept_eula', server_id=server.id))
    else:
        flash('eula.txt not found. Please ensure the server is set up correctly.')
        return redirect(url_for('.home'))

    # Check if the server is already running
    if server.status == 'Running' and server.pid:
        flash(f"Server {server.server_name} is already running.")
        return redirect(url_for('server.home'))

    server_dir = os.path.join('servers', server.server_name)
    server_jar_path = os.path.join(server_dir, 'server.jar')

    # Build the command to start the server
    command = [
        'java',
        '-Xms1024M',
        '-Xmx1024M',
        '-jar',
        'server.jar',
        'nogui'
    ]

    try:
        # Start the server
        process = subprocess.Popen(
            command,
            cwd=server_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        # Update the server status and PID in the db
        server.status = 'Running'
        server.pid = process.pid
        db.session.commit()

        flash(f"Server {server.server_name} started successfully.")
    except Exception as e:
        flash(f"Error starting server: {e}")

    return redirect(url_for('server.home'))

@server_bp.route('/stop/<int:server_id>', methods=['POST'])
@login_required
def stop_server(server_id):
    """Stop the server if running."""
    server = Server.query.get_or_404(server_id)

    if server.status != 'Running' or not server.pid:
        flash(f"Server {server.server_name} is already stopped.")
        return redirect(url_for('server.home'))

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
        flash(f"Server {server.server_name} stopped successfully.")
    except psutil.NoSuchProcess:
        server.status = 'Stopped'
        server.pid = None
        db.session.commit()
        flash(f"Server {server.server_name} was not running. Updated status.")
    except Exception as e:
        flash(f"Error stopping server: {e}")

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
