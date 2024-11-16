import re
import socket
from flask import redirect, url_for, request
from flask_login import current_user
from .models import Server, User
from .extensions import db
import requests
import json

def is_valid_server_name(name):
    """Validate server name to contain only letters, numbers, underscores, and hyphens."""
    return re.match(r'^[\w-]+$', name) is not None

def is_port_available(port):
    """Check if a port is available to use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) != 0

def find_next_available_port():
    """Find the next available port, starting from 25565 and incrementing by 10."""
    base_port = 25565
    increment = 10
    max_checks = 20  

    # Get a list of all ports already assigned to servers
    assigned_ports = {server.port for server in Server.query.all()}

    for i in range(max_checks):
        port_to_check = base_port + (i * increment)

        # Check if the port is already assigned in the database or currently in use
        if port_to_check not in assigned_ports and is_port_available(port_to_check):
            return port_to_check

    raise RuntimeError("No available ports found.")

def fetch_version_manifest():
    """Fetches the main version manifest from Mojang's API."""
    manifest_url = 'https://piston-meta.mojang.com/mc/game/version_manifest.json'
    response = requests.get(manifest_url, timeout=10)
    response.raise_for_status()
    return response.json()

def get_version_info(version_id):
    """Fetches the version-specific metadata for a given version ID."""
    manifest = fetch_version_manifest()
    # Find the selected version's metadata URL
    version_info = next((v for v in manifest['versions'] if v['id'] == version_id), None)
    if not version_info:
        raise ValueError(f"Version {version_id} not found in the manifest.")
    version_metadata_url = version_info['url']

    # Fetch the version-specific metadata file
    version_metadata_response = requests.get(version_metadata_url, timeout=10)
    version_metadata_response.raise_for_status()
    return version_metadata_response.json()

def check_admin_password():
    admin_user = User.query.filter_by(username='admin').first()
    if admin_user and not admin_user.password_hash:
        allowed_endpoints = ['auth.set_admin_password', 'static']
        if request.endpoint not in allowed_endpoints and not (request.endpoint or '').startswith('static'):
            return redirect(url_for('auth.set_admin_password'))

def load_exclusion_list(filename='excluded_versions.json'):
    try:
        with open(filename, 'r') as f:
            excluded_versions = json.load(f)
        return excluded_versions
    except FileNotFoundError:
        # Handle the case where the file doesn't exist
        return []