# Pre-commit Setup Documentation

## Overview

This project uses pre-commit hooks to ensure code quality, consistency, and security
across all commits. Pre-commit runs automated checks before each commit to catch
issues early in the development process.

## Installation

Pre-commit is already installed in the development environment. To set up pre-commit
hooks for this repository:

```bash
# Install pre-commit hooks
pre-commit install

# Install pre-commit hooks for all environments
pre-commit install --install-hooks --overwrite
```

## Configuration

The pre-commit configuration is defined in `.pre-commit-config.yaml` and includes:

### Python Hooks

- **black**: Code formatting with 88-character line length
- **isort**: Import sorting with black compatibility
- **flake8**: Linting with extended ignore patterns
- **mypy**: Type checking with relaxed settings
- **bandit**: Security vulnerability scanning
- **safety**: Dependency vulnerability checking
- **pydocstyle**: Documentation style checking

### JavaScript/TypeScript Hooks

- **prettier**: Code formatting for JS/TS/CSS/HTML/Markdown
- **eslint**: Linting with TypeScript and React support

### Shell Script Hooks

- **shellcheck**: Shell script linting and validation
- **shfmt**: Shell script formatting

### Security Hooks

- **detect-secrets**: Secret detection and prevention
- **semgrep**: Advanced security scanning

### Documentation Hooks

- **markdownlint**: Markdown linting and formatting

### General Hooks

- **trailing-whitespace**: Remove trailing whitespace
- **end-of-file-fixer**: Ensure files end with newline
- **check-yaml**: YAML syntax validation
- **check-json**: JSON syntax validation
- **check-toml**: TOML syntax validation
- **check-merge-conflict**: Detect merge conflict markers
- **check-added-large-files**: Prevent large file commits
- **check-case-conflict**: Detect case conflicts
- **debug-statements**: Detect debug statements
- **detect-private-key**: Detect private keys

## Usage

### Running Hooks Manually

```bash
# Run all hooks on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black

# Run hooks on specific files
pre-commit run --files app/models.py tests/test_models.py
```

### Updating Hooks

```bash
# Update all hooks to latest versions
pre-commit autoupdate

# Update specific hook
pre-commit autoupdate --repo https://github.com/psf/black
```

### Pre-commit Enforcement

Pre-commit hooks are now fully operational and should not be bypassed. All code
quality issues have been resolved, and the hooks provide valuable automated
checks for code formatting, linting, security scanning, and documentation
standards. The development workflow now relies on these automated checks to
maintain code quality.

## Excluded Files

The following files and directories are excluded from pre-commit hooks:

- `venv/` - Python virtual environment
- `node_modules/` - Node.js dependencies
- `.venv/` - Alternative virtual environment
- `.git/` - Git repository data
- `__pycache__/` - Python cache files
- `.pytest_cache/` - Pytest cache
- `.coverage*` - Coverage reports
- `.mypy_cache/` - MyPy cache
- `.bandit*` - Bandit reports
- `.secrets.baseline*` - Secrets baseline
- `dist/`, `build/` - Build artifacts
- `.eggs/`, `.tox/` - Python packaging
- `.env*` - Environment files
- `.DS_Store`, `Thumbs.db` - System files

## Troubleshooting

### Common Issues

1. **Hook fails on first run**: This is normal for new hooks. Run
   `pre-commit run --all-files` to fix all issues.

2. **Black and isort conflicts**: The configuration uses black-compatible isort
   settings. If conflicts occur, run both hooks together.

3. **MyPy errors**: The configuration uses relaxed settings. For strict type
   checking, modify the mypy configuration.

4. **Bandit false positives**: Review bandit reports and add exceptions to
   `.bandit` file if needed.

### Updating Dependencies

When updating Python dependencies, you may need to update pre-commit hooks:

```bash
# Update pre-commit itself
pip install --upgrade pre-commit

# Update all hooks
pre-commit autoupdate

# Reinstall hooks
pre-commit install --install-hooks --overwrite
```

## Integration with CI/CD

Pre-commit hooks can be integrated with CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Run pre-commit
  uses: pre-commit/action@v3.0.0
```

## Best Practices

1. **Run hooks before committing**: Always run `pre-commit run --all-files` before
   pushing changes.

2. **Fix issues immediately**: Don't accumulate linting issues. Fix them as they
   appear.

3. **Update hooks regularly**: Keep hooks updated to benefit from latest
   improvements.

4. **Customize as needed**: Modify `.pre-commit-config.yaml` to match project
   requirements.

5. **Document exceptions**: If you need to skip hooks, document the reason.

## Configuration Files

- `.pre-commit-config.yaml` - Main configuration file
- `.pre-commit-hooks.yaml` - Additional hook configuration
- `.secrets.baseline` - Secrets detection baseline (generated)
- `.bandit` - Bandit configuration (if needed)
- `.eslintrc.js` - ESLint configuration (if needed)
