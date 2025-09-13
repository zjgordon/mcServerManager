# Test Organization Guide

This document describes the test organization structure and tagging system for
the Minecraft Server Manager project.

## Directory Structure

The test suite is organized into the following directories:

```text
tests/
├── unit/              # Unit tests for individual components
├── integration/       # Integration tests for component interactions
├── e2e/              # End-to-end tests for full workflows
├── performance/      # Performance and load tests
├── fixtures/         # Test fixtures and data management
├── utils/            # Test utilities and helpers
└── data/             # Test data files
```

## Test Categories

### Unit Tests (`tests/unit/`)

Unit tests focus on testing individual components in isolation:

- **test_auth.py** - Authentication functionality
- **test_models.py** - Database models (User, Server)
- **test_utils.py** - Utility functions
- **test_security.py** - Security validation
- **test_error_handling.py** - Error handling system

**Markers:** `@pytest.mark.unit`

### Integration Tests (`tests/integration/`)

Integration tests verify component interactions:

- **test_integration.py** - Complete workflows
- **test_server_routes.py** - Server management routes
- **test_user_management.py** - User management workflows
- **test_memory_management.py** - Memory management integration

**Markers:** `@pytest.mark.integration`

### End-to-End Tests (`tests/e2e/`)

E2E tests verify complete user workflows from start to finish.

**Markers:** `@pytest.mark.e2e`

### Performance Tests (`tests/performance/`)

Performance tests measure system performance and load handling.

**Markers:** `@pytest.mark.performance`

## Test Markers

The following pytest markers are available for test categorization:

### Category Markers

- `@pytest.mark.unit` - Unit tests
- `@pytest.mark.integration` - Integration tests
- `@pytest.mark.e2e` - End-to-end tests
- `@pytest.mark.performance` - Performance tests

### Feature Markers

- `@pytest.mark.auth` - Authentication related
- `@pytest.mark.server` - Server management related
- `@pytest.mark.memory` - Memory management related
- `@pytest.mark.user` - User management related
- `@pytest.mark.utils` - Utility function related
- `@pytest.mark.security` - Security focused

### Quality Markers

- `@pytest.mark.slow` - Slow running tests
- `@pytest.mark.smoke` - Smoke tests for basic functionality
- `@pytest.mark.regression` - Regression tests

## Running Tests

### Run All Tests

```bash
pytest
```

### Run by Category

```bash
# Unit tests only
pytest -m unit

# Integration tests only
pytest -m integration

# E2E tests only
pytest -m e2e

# Performance tests only
pytest -m performance
```

### Run by Feature

```bash
# Authentication tests
pytest -m auth

# Server management tests
pytest -m server

# Memory management tests
pytest -m memory

# User management tests
pytest -m user

# Security tests
pytest -m security

# Utility function tests
pytest -m utils
```

### Run by Quality

```bash
# Fast tests only (exclude slow)
pytest -m "not slow"

# Smoke tests only
pytest -m smoke

# Regression tests only
pytest -m regression
```

### Combined Markers

```bash
# Unit tests for authentication
pytest -m "unit and auth"

# Integration tests for server management
pytest -m "integration and server"

# All tests except slow performance tests
pytest -m "not (slow and performance)"
```

## Test Execution Strategies

### Development Workflow

1. **Quick feedback:** `pytest -m "unit and not slow"`
2. **Feature testing:** `pytest -m "unit and auth"`
3. **Integration check:** `pytest -m integration`
4. **Full validation:** `pytest`

### CI/CD Pipeline

1. **Unit tests:** `pytest -m unit`
2. **Integration tests:** `pytest -m integration`
3. **E2E tests:** `pytest -m e2e`
4. **Performance tests:** `pytest -m performance`

### Debugging

1. **Specific feature:** `pytest -m "unit and auth" -v`
2. **Failed tests only:** `pytest --lf`
3. **Specific test file:** `pytest tests/unit/test_auth.py`

## Best Practices

### Writing Tests

1. **Use appropriate markers** for test categorization
2. **Place tests in correct directories** based on scope
3. **Write focused tests** that test one thing well
4. **Use descriptive test names** that explain the scenario
5. **Group related tests** in test classes

### Test Organization

1. **Unit tests** should be fast and isolated
2. **Integration tests** should test component interactions
3. **E2E tests** should test complete user workflows
4. **Performance tests** should measure system performance

### Maintenance

1. **Keep tests organized** by moving them to appropriate directories
2. **Update markers** when test scope changes
3. **Document test purposes** in docstrings
4. **Regularly review** test organization for improvements

## Migration Notes

This test organization was implemented in CARD-015 to improve test
maintainability and execution flexibility. The existing test files were moved
to appropriate directories and marked with relevant pytest markers while
maintaining all existing functionality.
