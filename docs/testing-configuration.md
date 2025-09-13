# Testing Configuration

This document describes the comprehensive pytest configuration for the
Minecraft Server Manager project.

## Overview

The project uses pytest as the primary testing framework with several
plugins to enhance testing capabilities, coverage reporting, and
performance.

## Plugins Used

### Core Testing

- **pytest**: Main testing framework (v7.4.3)
- **pytest-flask**: Flask-specific testing utilities (v1.3.0)
- **pytest-mock**: Enhanced mocking capabilities (v3.12.0)

### Coverage & Reporting

- **pytest-cov**: Code coverage reporting (v4.1.0)
- **pytest-html**: HTML test reports (v4.1.1)

### Performance & Parallelization

- **pytest-xdist**: Parallel test execution (v3.3.1)
- **pytest-cache**: Test result caching (v1.0)

## Configuration Files

### pytest.ini

Located at `config/pytest.ini`, this file contains the primary pytest
configuration including:

- Test discovery patterns
- Execution options with coverage and parallelization
- Test markers for categorization
- Warning filters
- Environment variables for testing

### pyproject.toml

Contains pytest configuration in the `[tool.pytest.ini_options]` section
and coverage settings in the `[tool.coverage.*]` sections.

## Key Features

### Test Discovery

- Tests located in the `tests/` directory
- Files matching `test_*.py` pattern
- Classes prefixed with `Test`
- Functions prefixed with `test_`

### Coverage Reporting

- Minimum coverage threshold: 65%
- HTML reports generated in `htmlcov/` directory
- XML reports for CI/CD integration
- Terminal output with missing lines

### Parallel Execution

- Automatic worker detection (`-n auto`)
- Load-based distribution (`--dist=loadscope`)
- Worker restart enabled for stability

### Test Markers

- `slow`: Long-running tests
- `integration`: Integration tests
- `unit`: Unit tests
- `security`: Security-focused tests
- `smoke`: Basic functionality tests
- `regression`: Regression tests
- `performance`: Performance tests

### HTML Reports

- Self-contained HTML reports in `reports/test-report.html`
- Includes test results, coverage, and timing information

## Usage Examples

### Run All Tests

```bash
pytest
```

### Run Tests with Coverage

```bash
pytest --cov=app --cov-report=html
```

### Run Tests in Parallel

```bash
pytest -n auto
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest -m unit

# Skip slow tests
pytest -m "not slow"

# Security tests only
pytest -m security
```

### Generate HTML Report

```bash
pytest --html=reports/test-report.html --self-contained-html
```

## Environment Variables

The following environment variables are set for testing:

- `SECRET_KEY`: Test-specific secret key
- `RATELIMIT_ENABLED`: Disabled for testing
- `WTF_CSRF_ENABLED`: Disabled for testing
- `TESTING`: Set to true

## Coverage Configuration

### Sources

- Primary source: `app/` directory
- Excludes: test files, virtual environments, cache directories, migrations

### Thresholds

- Minimum coverage: 65%
- Coverage reports: HTML, XML, and terminal output

## Best Practices

1. **Test Organization**: Use markers to categorize tests appropriately
2. **Parallel Testing**: Leverage pytest-xdist for faster test execution
3. **Coverage**: Maintain minimum 65% coverage threshold
4. **Documentation**: Document test behavior and expected outcomes
5. **Performance**: Mark slow tests appropriately to enable selective execution

## Troubleshooting

### Common Issues

- **Import Errors**: Ensure test environment variables are properly set
- **Coverage Issues**: Check source paths and omit patterns
- **Parallel Execution**: Reduce worker count if encountering resource conflicts

### Cache Management

- Clear pytest cache: `pytest --cache-clear`
- Cache directory: `.pytest_cache/`

## Integration with CI/CD

The configuration supports CI/CD integration through:

- XML coverage reports for coverage tracking
- HTML reports for detailed analysis
- Parallel execution for faster builds
- Strict markers to prevent undefined markers
