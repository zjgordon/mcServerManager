# Tools Documentation

This guide covers the development tools, their configuration, and usage
patterns in the mcServerManager project.

## Development Tools

### Python Development Tools

#### Black - Code Formatter

**Purpose**: Automatic Python code formatting
**Configuration**: `pyproject.toml`

```toml
[tool.black]
line-length = 88
target-version = ['py38', 'py39', 'py310', 'py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | venv
  | _build
  | buck-out
  | build
  | dist
)/
'''
```

**Usage**:

```bash
# Format all Python files
black .

# Check formatting without changes
black --check .

# Format specific file
black app/models.py

# Format with diff output
black --diff .
```

#### isort - Import Sorter

**Purpose**: Sort and organize Python imports
**Configuration**: `pyproject.toml`

```toml
[tool.isort]
profile = "black"
line_length = 88
multi_line_output = 3
include_trailing_comma = true
force_grid_wrap = 0
use_parentheses = true
ensure_newline_before_comments = true
```

**Usage**:

```bash
# Sort imports in all files
isort .

# Check import sorting
isort --check-only .

# Sort specific file
isort app/models.py

# Show diff
isort --diff .
```

#### flake8 - Linter

**Purpose**: Python code linting and style checking
**Configuration**: `.flake8`

```ini
[flake8]
max-line-length = 88
extend-ignore = E203, W503, E501
max-complexity = 15
per-file-ignores =
    __init__.py:F401
    tests/*:S101
    app/routes/server_routes.py:C901
```

**Usage**:

```bash
# Lint all Python files
flake8 .

# Lint specific directory
flake8 app/

# Lint with specific error codes
flake8 --select=E,W app/

# Show statistics
flake8 --statistics .
```

#### mypy - Type Checker

**Purpose**: Static type checking for Python
**Configuration**: `pyproject.toml`

```toml
[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true
ignore_missing_imports = true
```

**Usage**:

```bash
# Type check all files
mypy .

# Type check specific module
mypy app/models.py

# Type check with strict mode
mypy --strict app/

# Generate type checking report
mypy --html-report mypy-report .
```

### Testing Tools

#### pytest - Test Framework

**Purpose**: Python testing framework
**Configuration**: `pytest.ini`

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = 
    --strict-markers
    --strict-config
    --cov=app
    --cov-report=html
    --cov-report=term-missing
    --cov-fail-under=80
    -n auto
    --html=reports/pytest-report.html
    --self-contained-html
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    performance: Performance tests
    auth: Authentication tests
    server: Server management tests
    memory: Memory management tests
    user: User management tests
    utils: Utility function tests
    security: Security tests
    slow: Slow running tests
    smoke: Smoke tests
    regression: Regression tests
```

**Usage**:

```bash
# Run all tests
pytest

# Run specific test category
pytest -m unit
pytest -m integration

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/unit/test_auth.py

# Run with parallel execution
pytest -n auto

# Run with HTML report
pytest --html=report.html --self-contained-html
```

#### pytest-cov - Coverage Tool

**Purpose**: Code coverage measurement
**Usage**:

```bash
# Generate coverage report
pytest --cov=app --cov-report=html

# Coverage with specific threshold
pytest --cov=app --cov-fail-under=80

# Coverage for specific modules
pytest --cov=app.models --cov=app.routes
```

### Security Tools

#### bandit - Security Linter

**Purpose**: Python security issue detection
**Configuration**: Command line arguments

```bash
# Run bandit
bandit -r app/ -f json -o bandit-report.json

# Skip specific tests
bandit -r app/ -s B101

# Exclude directories
bandit -r app/ -x tests/
```

**Usage**:

```bash
# Security scan
bandit -r app/

# Generate JSON report
bandit -r app/ -f json -o bandit-report.json

# Skip specific issues
bandit -r app/ -s B101,B601
```

#### safety - Dependency Scanner

**Purpose**: Check for known security vulnerabilities
**Usage**:

```bash
# Check dependencies
safety check

# Check specific requirements file
safety check -r requirements.txt

# Generate JSON report
safety check --json --output safety-report.json
```

#### semgrep - Advanced Security Scanner

**Purpose**: Advanced security and code quality analysis
**Usage**:

```bash
# Run semgrep
semgrep --config=auto .

# Run with specific rules
semgrep --config=p/security-audit .

# Generate SARIF report
semgrep --config=auto --sarif --output=semgrep-report.sarif .
```

### Documentation Tools

#### pydocstyle - Docstring Linter

**Purpose**: Check Python docstring conventions
**Configuration**: `.pre-commit-config.yaml`

```yaml
- repo: https://github.com/pycqa/pydocstyle
  rev: 6.3.0
  hooks:
    - id: pydocstyle
      args: [--ignore=D100,D101,D103,D104,D105,D107,D200,D205,D209,D212,D415]
```

**Usage**:

```bash
# Check docstrings
pydocstyle app/

# Check with specific conventions
pydocstyle --convention=pep257 app/
```

### Pre-commit Framework

#### Configuration

**File**: `.pre-commit-config.yaml`

```yaml
repos:
  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black
        language_version: python3

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/pycqa/flake8
    rev: 6.0.0
    hooks:
      - id: flake8

  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.3.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests, types-PyYAML]

  - repo: https://github.com/pycqa/bandit
    rev: 1.7.5
    hooks:
      - id: bandit
        args: [-r, app/, --exit-zero]

  - repo: https://github.com/pycqa/pydocstyle
    rev: 6.3.0
    hooks:
      - id: pydocstyle
        args: [--ignore=D100,D101,D103,D104,D105,D107,D200,D205,D209,D212,D415]

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.5.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']
```

**Usage**:

```bash
# Install pre-commit hooks
pre-commit install

# Run all hooks
pre-commit run --all-files

# Run specific hook
pre-commit run black

# Update hooks
pre-commit autoupdate

# Skip hooks (not recommended)
git commit --no-verify
```

### Database Tools

#### Flask-Migrate - Database Migrations

**Purpose**: Database schema versioning and migrations
**Usage**:

```bash
# Initialize migrations
flask db init

# Create migration
flask db migrate -m "Description of changes"

# Apply migrations
flask db upgrade

# Rollback migration
flask db downgrade

# Show migration history
flask db history

# Show current revision
flask db current
```

#### SQLite Browser

**Purpose**: Visual database management
**Usage**:

```bash
# Install (Ubuntu/Debian)
sudo apt install sqlitebrowser

# Open database
sqlitebrowser instance/dev_minecraft_manager.db

# Command line access
sqlite3 instance/dev_minecraft_manager.db
```

### Frontend Tools

#### Node.js and npm

**Purpose**: Frontend dependency management
**Usage**:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

#### TypeScript

**Purpose**: Type-safe JavaScript development
**Configuration**: `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Monitoring and Logging Tools

#### Application Logs

**Purpose**: Application monitoring and debugging
**Configuration**: `app/logging.py`

```python
# Structured logging configuration
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        handler = logging.FileHandler('logs/app.log')
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
```

**Usage**:

```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# View security logs
tail -f logs/security.log

# Search logs
grep "ERROR" logs/app.log
grep "User login" logs/security.log
```

#### Health Monitoring

**Purpose**: Application health monitoring
**Endpoints**:

- `/health/` - Basic health status
- `/health/detailed` - Detailed system metrics
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe

**Usage**:

```bash
# Check basic health
curl http://localhost:5000/health/

# Check detailed metrics
curl http://localhost:5000/health/detailed

# Monitor with watch
watch -n 5 'curl -s http://localhost:5000/health/ | jq'
```

### Git Tools

#### Git Hooks

**Purpose**: Automated quality checks
**Files**:

- `.gitmessage` - Commit message template
- `.git/hooks/commit-msg` - Commit message validation
- `.git/hooks/pre-push` - Pre-push quality checks

**Usage**:

```bash
# Install git hooks
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/pre-push

# Test commit message format
echo "feat: add new feature" | .git/hooks/commit-msg

# Test pre-push hook
.git/hooks/pre-push
```

### IDE Configuration

#### VS Code Settings

**File**: `.vscode/settings.json`

```json
{
    "python.defaultInterpreterPath": "./venv/bin/python",
    "python.linting.enabled": true,
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "python.formatting.provider": "black",
    "python.sortImports.args": ["--profile", "black"],
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    },
    "files.exclude": {
        "**/__pycache__": true,
        "**/*.pyc": true,
        "**/venv": true,
        "**/node_modules": true
    }
}
```

#### Recommended Extensions

- Python
- Pylance
- Black Formatter
- GitLens
- REST Client
- Thunder Client
- SQLite Viewer

## Tool Integration

### Development Workflow

1. **Code Changes**: Make changes to source code
2. **Pre-commit**: Automatic formatting and linting
3. **Testing**: Run test suite
4. **Security**: Security scanning
5. **Documentation**: Update documentation
6. **Commit**: Commit with conventional format
7. **Push**: Pre-push quality checks

### CI/CD Integration

- **GitHub Actions**: Automated testing and quality checks
- **Codecov**: Coverage reporting
- **Security Scanning**: Automated security analysis
- **Deployment**: Automated deployment pipeline

For more information about specific tools, refer to their official
documentation or the project's configuration files.
