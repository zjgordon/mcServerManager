# CI/CD Setup Documentation

This document describes the GitHub Actions workflows configured for the
mcServerManager project.

## Overview

The project uses GitHub Actions for continuous integration and deployment
with four main workflows:

1. **Test Suite** (`test.yml`) - Runs tests on multiple Python versions
2. **Code Quality** (`quality.yml`) - Enforces code formatting and linting
   standards
3. **Security Scanning** (`security.yml`) - Performs security analysis and
   vulnerability checks
4. **Deployment** (`deploy.yml`) - Handles staging and production deployments

## Workflow Details

### Test Suite Workflow

**File:** `.github/workflows/test.yml`

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Features:**

- Tests on Python versions 3.8, 3.9, 3.10, and 3.11
- Caches pip dependencies for faster builds
- Generates coverage reports (XML and HTML)
- Uploads test results and coverage reports as artifacts
- Integrates with Codecov for coverage tracking

**Usage:**

```bash
# Tests run automatically on push/PR
# View results in GitHub Actions tab
```

### Code Quality Workflow

**File:** `.github/workflows/quality.yml`

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Features:**

- Black code formatting check
- isort import sorting check
- flake8 linting
- mypy type checking
- pydocstyle documentation check
- markdownlint for markdown files
- Trailing whitespace detection
- Merge conflict marker detection

**Usage:**

```bash
# Quality checks run automatically
# Fix issues locally before pushing:
black .
isort .
flake8 .
mypy .
```

### Security Scanning Workflow

**File:** `.github/workflows/security.yml`

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Mondays at 2 AM)

**Features:**

- Bandit security scanning for Python code
- Safety dependency vulnerability checking
- Semgrep advanced security analysis
- detect-secrets for secret detection
- Automated PR comments with security findings
- Security report artifacts

**Usage:**

```bash
# Security scans run automatically
# View reports in GitHub Actions artifacts
# Check PR comments for security findings
```

### Deployment Workflow

**File:** `.github/workflows/deploy.yml`

**Triggers:**

- Push to `develop` branch (staging deployment)
- Manual workflow dispatch (staging or production)

**Features:**

- Pre-deployment testing and security scanning
- Environment-specific deployment
- Health checks after deployment
- Deployment artifact creation and storage
- Deployment status notifications

**Usage:**

```bash
# Automatic staging deployment on develop branch
# Manual deployment via GitHub Actions UI
```

## Configuration

### Required Secrets

For deployment workflows, configure these repository secrets:

- `STAGING_HOST` - Staging server hostname/IP
- `STAGING_USER` - Staging server username
- `STAGING_KEY` - Staging server SSH private key
- `PRODUCTION_HOST` - Production server hostname/IP
- `PRODUCTION_USER` - Production server username
- `PRODUCTION_KEY` - Production server SSH private key

### Environment Variables

Set these in repository settings:

- `CODECOV_TOKEN` - Codecov integration token
- `SECURITY_SCAN_ENABLED` - Enable/disable security scanning

## Quality Gates

### Pull Request Requirements

All pull requests must pass:

1. **Test Suite** - All tests must pass on all Python versions
2. **Code Quality** - All linting and formatting checks must pass
3. **Security Scanning** - No high-severity security issues
4. **Coverage** - Maintain minimum 80% test coverage

### Branch Protection Rules

Configure branch protection for `main` and `develop`:

- Require status checks to pass before merging
- Require up-to-date branches before merging
- Require pull request reviews
- Restrict pushes to protected branches

## Monitoring and Notifications

### Workflow Status

- View workflow runs in GitHub Actions tab
- Check individual job logs for detailed information
- Download artifacts for test results and security reports

### Notifications

- GitHub notifications for workflow failures
- PR comments for security findings
- Email notifications for deployment status

## Troubleshooting

### Common Issues

1. **Test Failures**
   - Check test logs for specific error messages
   - Ensure all dependencies are properly installed
   - Verify test data and fixtures are correct

2. **Quality Check Failures**
   - Run quality checks locally before pushing
   - Use `black .` and `isort .` to fix formatting
   - Address linting issues reported by flake8

3. **Security Scan Failures**
   - Review security findings in PR comments
   - Update `.secrets.baseline` for false positives
   - Address high-severity security issues

4. **Deployment Failures**
   - Check deployment logs for error messages
   - Verify environment variables and secrets
   - Ensure target environment is accessible

### Local Development

Run quality checks locally:

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run all quality checks
black --check .
isort --check-only .
flake8 .
mypy .
pydocstyle .

# Run security checks
bandit -r app/
safety check
semgrep --config=auto .
```

## Best Practices

1. **Always run quality checks locally before pushing**
2. **Address security findings promptly**
3. **Keep test coverage above 80%**
4. **Use conventional commit messages**
5. **Review PR comments for automated feedback**
6. **Monitor deployment status and health checks**

## Workflow Customization

### Adding New Checks

1. Add new tools to `requirements-dev.txt`
2. Update the appropriate workflow file
3. Test the changes in a feature branch
4. Update this documentation

### Modifying Triggers

1. Edit the `on:` section in workflow files
2. Test trigger changes in a feature branch
3. Update documentation as needed

### Environment-Specific Settings

1. Use GitHub environments for different deployment targets
2. Configure environment-specific secrets and variables
3. Add environment-specific workflow steps as needed
