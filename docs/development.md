# Development Guide

This guide covers development workflows, best practices, and architectural
patterns for the mcServerManager project.

## Project Architecture

### Directory Structure

```text
mcServerManager/
├── app/                    # Main application code
│   ├── __init__.py        # Flask app factory
│   ├── config.py          # Configuration management
│   ├── models.py          # Database models
│   ├── routes/            # Route blueprints
│   │   ├── auth_routes.py # Authentication routes
│   │   └── server_routes.py # Server management routes
│   ├── static/            # Static assets
│   └── templates/         # Jinja2 templates
├── config/                # Configuration files
│   ├── base.py           # Base configuration
│   ├── development.py    # Development settings
│   ├── production.py     # Production settings
│   └── testing.py        # Test settings
├── docs/                 # Documentation
├── frontend/             # Frontend code (React/TypeScript)
├── migrations/           # Database migrations
├── tests/                # Test suite
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   ├── e2e/             # End-to-end tests
│   └── fixtures/        # Test fixtures
└── scripts/             # Utility scripts
```

### Core Components

#### Flask Application Factory

The app uses a factory pattern for better testability and configuration:

```python
# app/__init__.py
def create_app(config_name=None):
    app = Flask(__name__)
    # Configuration and extensions setup
    return app
```

#### Configuration Management

Environment-specific configurations in `config/` directory:

- `base.py`: Common settings and validation
- `development.py`: Development-specific settings
- `production.py`: Production settings with security
- `testing.py`: Test-optimized settings

#### Database Models

SQLAlchemy models in `app/models.py`:

- `User`: User authentication and management
- `Server`: Minecraft server instances
- `Configuration`: Server configuration settings

## Development Workflow

### 1. Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Create bugfix branch
git checkout -b bugfix/issue-description

# Create hotfix branch
git checkout -b hotfix/critical-fix
```

### 2. Development Process

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Make changes and test
# ... make your changes ...

# 4. Run tests
pytest

# 5. Run code quality checks
pre-commit run --all-files

# 6. Commit changes
git add .
git commit -m "feat: add new feature"

# 7. Push and create PR
git push origin feature/new-feature
```

### 3. Code Quality Standards

#### Python Code Style

- Follow PEP 8 with 88-character line length
- Use Black for automatic formatting
- Use isort for import organization
- Use flake8 for linting
- Use mypy for type checking

#### Commit Message Format

Use Conventional Commits format:

```text
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

```text
feat(auth): add password reset functionality
fix(server): resolve memory allocation bug
docs: update API documentation
test: add integration tests for user management
```

### 4. Testing Strategy

#### Test Categories

- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: Full workflow testing
- **Performance Tests**: Load and performance testing

#### Running Tests

```bash
# Run all tests
pytest

# Run specific categories
pytest -m unit
pytest -m integration
pytest -m e2e

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_auth.py

# Run specific test
pytest tests/unit/test_auth.py::TestAuth::test_login
```

#### Test Data Management

- Use factories for test data generation
- Clean up test data after each test
- Use fixtures for common test setup
- Mock external dependencies

### 5. Database Management

#### Migrations

```bash
# Create migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade

# Show migration history
flask db history
```

#### Database Seeding

```bash
# Seed test data
python scripts/seed_database.py

# Reset database
python scripts/reset_database.py
```

### 6. Frontend Development

#### React/TypeScript Setup

```bash
cd frontend
npm install
npm run dev
```

#### Frontend Testing

```bash
# Run frontend tests
npm test

# Run with coverage
npm run test:coverage

# Run linting
npm run lint
```

## Best Practices

### 1. Code Organization

- Keep functions small and focused
- Use meaningful variable and function names
- Add docstrings for public functions
- Group related functionality in modules

### 2. Error Handling

- Use specific exception types
- Log errors with context
- Provide user-friendly error messages
- Handle edge cases gracefully

### 3. Security

- Validate all user inputs
- Use parameterized queries
- Implement proper authentication
- Follow OWASP guidelines

### 4. Performance

- Use database indexes appropriately
- Implement caching where beneficial
- Monitor memory usage
- Optimize database queries

### 5. Documentation

- Keep documentation up to date
- Use clear and concise language
- Include code examples
- Document API endpoints

## Development Tools

### Pre-commit Hooks

Automatically run on every commit:

- Code formatting (Black, isort)
- Linting (flake8, mypy)
- Security scanning (bandit, safety)
- Documentation checks (pydocstyle)

### IDE Configuration

Recommended VS Code extensions:

- Python
- Pylance
- Black Formatter
- GitLens
- REST Client

### Debugging

```bash
# Enable debug mode
export FLASK_DEBUG=True

# Use debugger
import pdb; pdb.set_trace()

# Use logging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Deployment

### Development Deployment

```bash
# Use development script
./dev.sh

# Or manual deployment
python run.py
```

### Production Deployment

```bash
# Set production environment
export FLASK_ENV=production

# Run with production server
gunicorn -w 4 -b 0.0.0.0:8000 run:app
```

## Monitoring and Logging

### Application Logs

- Structured JSON logging
- Request tracking
- Error monitoring
- Performance metrics

### Health Checks

- `/health/` - Basic health status
- `/health/detailed` - Detailed system metrics
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

## Troubleshooting

### Common Issues

1. **Port conflicts**: Use `./dev.sh` for automatic port detection
2. **Database issues**: Check migrations and permissions
3. **Memory issues**: Adjust memory limits in configuration
4. **Test failures**: Check test data and mocking

### Debugging Steps

1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Check external dependencies
5. Review error messages and stack traces

## Contributing

### Pull Request Process

1. Create feature branch
2. Make changes with tests
3. Ensure all checks pass
4. Create pull request
5. Address review feedback
6. Merge after approval

### Code Review Guidelines

- Review for functionality and security
- Check test coverage
- Verify documentation updates
- Ensure code quality standards

For more detailed information, see the [Troubleshooting Guide](troubleshooting.md)
and [Tools Documentation](tools.md).
