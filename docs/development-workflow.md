# Development Workflow Guide

## Overview

This document outlines the development workflow for the Minecraft Server Manager project,
including the simplified pre-commit configuration and best practices for rapid development.

## Pre-commit Configuration

The project uses a simplified pre-commit configuration with 16 essential hooks focused
on core code quality without over-engineering. This configuration is optimized for
rapid development and "vibe-coding" methodology.

### Active Hooks

#### Python Quality
- **black**: Code formatting with 100-character line length
- **isort**: Import sorting with black compatibility
- **flake8**: Linting with development-friendly ignore patterns (E501, F401)

#### File Quality
- **trailing-whitespace**: Remove trailing whitespace
- **end-of-file-fixer**: Ensure files end with newline
- **check-yaml**: YAML syntax validation
- **check-json**: JSON syntax validation
- **check-toml**: TOML syntax validation

#### Conflict Detection
- **check-merge-conflict**: Detect merge conflict markers
- **check-added-large-files**: Prevent large file commits
- **check-case-conflict**: Detect case conflicts

#### Security
- **detect-private-key**: Detect private keys in commits

#### Shell Scripts
- **shellcheck**: Shell script linting and validation
- **shfmt**: Shell script formatting

#### Debug Detection
- **debug-statements**: Detect debug statements in Python code

## Development Workflow

### 1. Daily Development

```bash
# Start development environment
./dev.sh test

# Make your changes
# ... edit code ...

# Commit changes (pre-commit runs automatically)
git add .
git commit -m "feat: add new feature"

# Push changes
git push origin feature-branch
```

### 2. Code Formatting

Code is automatically formatted on commit:
- **Black** formats Python code with 100-character line length
- **isort** organizes imports
- **flake8** provides linting with relaxed rules

### 3. Bypass Procedures

In specific cases, you can bypass pre-commit hooks:

```bash
# Documentation commits (no Python changes)
git commit --no-verify -m "docs: update README"

# Rapid prototyping (temporary code)
git commit --no-verify -m "wip: experimental feature"

# Emergency fixes (urgent production issues)
git commit --no-verify -m "fix: critical security patch"
```

**Important**: Use bypasses sparingly and ensure code quality through other means.

### 4. Testing Workflow

```bash
# Run all tests
pytest

# Run tests with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_models.py

# Run tests in parallel
pytest -n auto
```

### 5. Code Quality Checks

```bash
# Run pre-commit on all files
pre-commit run --all-files

# Run specific hook
pre-commit run black
pre-commit run flake8

# Update pre-commit hooks
pre-commit autoupdate
```

## Best Practices

### Code Style
- Use 100-character line length limit
- Follow PEP 8 guidelines
- Write meaningful variable and function names
- Keep functions small and focused

### Commit Messages
Use conventional commit format:
```
type(scope): brief description

Detailed explanation if needed.

Fixes #issue_number
```

**Types**: feat, fix, docs, style, refactor, test, chore

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Pull Request Process
1. Create feature branch
2. Make changes following style guidelines
3. Add tests for new functionality
4. Update documentation if needed
5. Run tests and pre-commit checks
6. Create pull request with clear description

## Troubleshooting

### Common Issues

1. **Pre-commit fails on first run**
   ```bash
   pre-commit run --all-files
   ```

2. **Black and isort conflicts**
   ```bash
   black .
   isort .
   ```

3. **Flake8 errors**
   ```bash
   flake8 --statistics
   ```

4. **Hook update needed**
   ```bash
   pre-commit autoupdate
   pre-commit install --install-hooks --overwrite
   ```

### Getting Help

- Check the [pre-commit setup documentation](pre-commit-setup.md)
- Review [contributing guidelines](../CONTRIBUTING.md)
- Ask questions in project discussions

## Configuration Files

- `.pre-commit-config.yaml` - Pre-commit configuration
- `pyproject.toml` - Black and isort settings
- `.flake8` - Flake8 configuration
- `pytest.ini` - Pytest configuration

## Performance Notes

The simplified configuration provides:
- **Faster commit times** (reduced from 25+ hooks to 16)
- **Reduced friction** (eliminated documentation and security hooks)
- **Better developer experience** (focus on essential quality)
- **Maintained standards** (core code quality preserved)

This workflow is optimized for rapid development while maintaining code quality
standards appropriate for Minecraft server management applications.
