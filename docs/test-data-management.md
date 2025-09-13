# Test Data Management

This document describes the comprehensive test data management system for the
Minecraft Server Manager project, including fixtures, factories, and utilities
for creating, managing, and cleaning up test data.

## Overview

The test data management system provides a structured approach to creating
and managing test data through:

- **Factory Pattern**: For generating test objects with sensible defaults
- **Organized Fixtures**: Categorized fixtures for different test scenarios
- **Database Seeding**: Utilities for populating the test database
- **Cleanup Utilities**: Functions for ensuring test isolation
- **Test Data Files**: JSON files containing sample test data

## Directory Structure

```text
tests/
├── fixtures/           # Organized test fixtures
│   ├── __init__.py
│   ├── database.py     # Database-related fixtures
│   ├── users.py        # User-related fixtures
│   ├── servers.py      # Server-related fixtures
│   ├── clients.py      # Client-related fixtures
│   └── utilities.py    # Utility fixtures
├── data/              # Test data files
│   ├── sample_users.json
│   ├── sample_servers.json
│   └── memory_test_scenarios.json
├── utils/             # Test utilities
│   ├── __init__.py
│   ├── database_seeder.py
│   ├── test_cleanup.py
│   └── test_helpers.py
└── factories.py       # Factory pattern for test data
```

## Factory Pattern

### UserFactory

The `UserFactory` class provides methods for creating User test data:

```python
from tests.factories import UserFactory

# Create a regular user
user = UserFactory.create_regular(username="testuser")

# Create an admin user
admin = UserFactory.create_admin(username="admin")

# Create an inactive user
inactive = UserFactory.create_inactive(username="inactive")

# Create a user with custom attributes
custom = UserFactory.create(
    username="custom",
    password="custompass",  # pragma: allowlist secret
    is_admin=True,
    is_active=True
)
```

### ServerFactory

The `ServerFactory` class provides methods for creating Server test data:

```python
from tests.factories import ServerFactory

# Create a stopped server
server = ServerFactory.create_stopped(server_name="testserver")

# Create a running server
running = ServerFactory.create_running(server_name="running")

# Create a server with custom settings
custom = ServerFactory.create_with_custom_settings(
    server_name="custom",
    gamemode="creative",
    difficulty="hard",
    hardcore=True
)
```

### TestDataFactory

The `TestDataFactory` class provides methods for creating complex test scenarios:

```python
from tests.factories import TestDataFactory

# Create multiple users with servers
data = TestDataFactory.create_user_with_servers(
    user_count=3,
    servers_per_user=2,
    admin_users=1
)

# Create memory test scenario
memory_data = TestDataFactory.create_memory_test_scenario(
    total_memory_mb=8192,
    server_count=5
)
```

## Test Fixtures

### Database Fixtures

Located in `tests/fixtures/database.py`:

- `app`: Creates a Flask app with test configuration
- `app_no_admin`: Creates a Flask app without admin user
- `clean_db`: Ensures database is clean before each test
- `db_session`: Provides a database session for tests

### User Fixtures

Located in `tests/fixtures/users.py`:

- `admin_user`: Creates or retrieves an admin user
- `regular_user`: Creates a regular user
- `inactive_user`: Creates an inactive user
- `multiple_users`: Creates multiple users
- `user_with_custom_attributes`: Creates a user with custom attributes

### Server Fixtures

Located in `tests/fixtures/servers.py`:

- `test_server`: Creates a basic test server
- `running_server`: Creates a running server
- `stopped_server`: Creates a stopped server
- `multiple_servers`: Creates multiple servers
- `server_with_custom_settings`: Creates a server with custom settings
- `servers_with_different_owners`: Creates servers owned by different users
- `memory_test_servers`: Creates servers for memory testing

### Client Fixtures

Located in `tests/fixtures/clients.py`:

- `client`: Basic test client
- `client_no_admin`: Test client without admin user
- `authenticated_client`: Client with authenticated admin user
- `authenticated_regular_client`: Client with authenticated regular user
- `authenticated_inactive_client`: Client with authenticated inactive user
- `unauthenticated_client`: Client without authentication

### Utility Fixtures

Located in `tests/fixtures/utilities.py`:

- `temp_server_dir`: Creates temporary directory for server files
- `temp_data_dir`: Creates temporary directory for test data
- `runner`: Test runner for Click commands
- `mock_file_system`: Mocks file system operations
- `mock_network_requests`: Mocks network requests
- `mock_subprocess`: Mocks subprocess operations

## Database Seeding

### Basic Seeding

```python
from tests.utils.database_seeder import seed_basic_data

# Seed with basic test data
data = seed_basic_data()
```

### Specialized Seeding

```python
from tests.utils.database_seeder import (
    seed_memory_test_data,
    seed_port_conflict_data,
    seed_multi_user_data,
    seed_stress_test_data
)

# Seed for memory testing
memory_data = seed_memory_test_data()

# Seed for port conflict testing
port_data = seed_port_conflict_data()

# Seed multiple users and servers
multi_data = seed_multi_user_data(
    user_count=5,
    servers_per_user=2,
    admin_count=1
)

# Seed for stress testing
stress_data = seed_stress_test_data()
```

### Custom Seeding

```python
from tests.utils.database_seeder import seed_custom_scenario

# Define custom users and servers
users = [
    {"username": "user1", "is_admin": False},
    {"username": "user2", "is_admin": True}
]

servers = [
    {"server_name": "server1", "owner_id": 1},
    {"server_name": "server2", "owner_id": 2}
]

# Seed with custom data
data = seed_custom_scenario(users, servers)
```

## Test Data Cleanup

### Basic Cleanup

```python
from tests.utils.test_cleanup import (
    cleanup_database,
    cleanup_test_files,
    cleanup_temp_files,
    cleanup_test_data
)

# Clean up database only
cleanup_database()

# Clean up test files
cleanup_test_files(["/tmp/test_dir1", "/tmp/test_dir2"])

# Clean up temporary files
cleanup_temp_files()

# Clean up everything
cleanup_test_data()
```

### Targeted Cleanup

```python
from tests.utils.test_cleanup import (
    cleanup_user_data,
    cleanup_server_data,
    cleanup_orphaned_data
)

# Clean up specific user and their servers
cleanup_user_data(user_id=1)

# Clean up specific server
cleanup_server_data(server_id=1)

# Clean up orphaned data
cleanup_orphaned_data()
```

### Test Isolation

```python
from tests.utils.test_cleanup import isolate_test, reset_test_environment

# Decorator for test isolation
@isolate_test
def test_something():
    # Test code here
    pass

# Reset entire test environment
reset_test_environment()
```

## Test Helpers

### Response Assertions

```python
from tests.utils.test_helpers import (
    assert_response_contains,
    assert_response_not_contains,
    assert_response_status,
    assert_json_response
)

# Assert response contains text
assert_response_contains(response, "Success")

# Assert response status
assert_response_status(response, 200)

# Assert JSON response
assert_json_response(response, {"status": "success"})
```

### Authentication Helpers

```python
from tests.utils.test_helpers import login_user, logout_user

# Login user
success = login_user(client, "username", "password")

# Logout user
success = logout_user(client)
```

### Database State Assertions

```python
from tests.utils.test_helpers import (
    assert_database_state,
    assert_user_exists,
    assert_server_exists
)

# Assert database state
assert_database_state(app, expected_users=2, expected_servers=3)

# Assert user exists with specific attributes
assert_user_exists(app, "username", is_admin=True, is_active=True)

# Assert server exists with specific attributes
assert_server_exists(app, "servername", owner_username="owner", status="Running")
```

### Test Data Files

```python
from tests.utils.test_helpers import load_test_data, save_test_data

# Load test data from JSON file
users_data = load_test_data("sample_users.json")

# Save test data to JSON file
save_test_data("custom_data.json", {"key": "value"})
```

## Best Practices

### 1. Use Factories for Data Creation

```python
# Good: Use factory with sensible defaults
user = UserFactory.create_regular()

# Good: Override specific attributes
user = UserFactory.create_regular(username="specific_user")

# Avoid: Creating objects manually
user = User(username="test", password_hash="hash", ...)
```

### 2. Use Appropriate Fixtures

```python
# Good: Use specific fixtures for test needs
def test_admin_function(authenticated_client, admin_user):
    # Test admin functionality
    pass

# Good: Use multiple fixtures for complex tests
def test_user_server_access(authenticated_regular_client, servers_with_different_owners):
    # Test user access to different servers
    pass
```

### 3. Ensure Test Isolation

```python
# Good: Use cleanup utilities
def test_something(app, clean_db):
    # Test code - database is clean
    pass

# Good: Use isolation decorator
@isolate_test
def test_isolated():
    # Test code - automatically cleaned up
    pass
```

### 4. Use Test Data Files for Complex Scenarios

```python
# Good: Load complex test data from files
def test_memory_scenarios():
    scenarios = load_test_data("memory_test_scenarios.json")
    for scenario in scenarios["scenarios"]:
        # Test each scenario
        pass
```

### 5. Validate Test Data Integrity

```python
# Good: Validate data integrity
def test_data_integrity():
    assert validate_test_data_integrity()
```

## Troubleshooting

### Common Issues

1. **Test Data Leakage**: Use `clean_db` fixture or `isolate_test` decorator
2. **Foreign Key Violations**: Ensure users are created before servers
3. **Port Conflicts**: Use `ServerFactory` with random ports
4. **Memory Issues**: Use `cleanup_temp_files()` to clean up temporary files

### Debugging

```python
# Check database state
from tests.utils.test_helpers import assert_database_state
assert_database_state(app, expected_users=1, expected_servers=0)

# Validate data integrity
from tests.utils.test_cleanup import validate_test_data_integrity
assert validate_test_data_integrity()

# Check for orphaned data
from tests.utils.test_cleanup import cleanup_orphaned_data
cleanup_orphaned_data()
```

## Integration with Existing Tests

The new test data management system is designed to work alongside existing
test fixtures in `conftest.py`. Existing tests will continue to work
unchanged, while new tests can take advantage of the enhanced fixtures
and utilities.

To migrate existing tests:

1. Import the new fixtures from `tests.fixtures`
2. Replace manual object creation with factory methods
3. Use cleanup utilities for better test isolation
4. Leverage test helpers for common assertions
