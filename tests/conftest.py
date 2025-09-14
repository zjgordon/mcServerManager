"""
Pytest configuration and fixtures for the Minecraft Server Manager tests.

This module provides the main test configuration and imports all fixture modules
to ensure proper test setup and isolation.
"""
import pytest

# Import all fixture modules to make them available to tests
from tests.fixtures import clients, database, mocks, server_files, servers, users, utilities
from tests.fixtures.clients import authenticated_client, client, client_no_admin

# Re-export key fixtures from database module for backward compatibility
from tests.fixtures.database import app, app_no_admin, clean_db
from tests.fixtures.servers import running_server, test_server
from tests.fixtures.users import admin_user, inactive_user, regular_user
from tests.fixtures.utilities import runner, temp_backup_dir, temp_data_dir, temp_server_dir
