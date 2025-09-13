# Security Scanning Documentation

This document describes the security scanning tools configured for the
mcServerManager project and how to use them.

## Overview

The project uses three main security scanning tools:

1. **Bandit** - Python security linter
2. **Safety** - Dependency vulnerability checker
3. **Semgrep** - Advanced security analysis tool

All tools are integrated with pre-commit hooks and run automatically on every commit.

## Tools Configuration

### Bandit

**Purpose:** Static analysis tool to find common security issues in Python code.

**Configuration:** `.bandit`

- Skips B101 (assert_used) test
- Excludes test directories and virtual environments
- Outputs JSON format to `bandit-report.json`
- Focuses on medium and high severity issues

**Usage:**

```bash
# Run bandit manually
bandit -c .bandit -r .

# Run with pre-commit
pre-commit run bandit --all-files
```

### Safety

**Purpose:** Checks for known security vulnerabilities in Python dependencies.

**Configuration:** `.safety`

- Checks both `requirements.txt` and `requirements-dev.txt`
- Uses short report format
- Exits with code 1 on vulnerabilities found

**Usage:**

```bash
# Run safety manually
safety check --config .safety

# Run with pre-commit
pre-commit run safety --all-files
```

### Semgrep

**Purpose:** Advanced static analysis tool with comprehensive security rules.

**Configuration:** `.semgrep.yml`

- Uses Python security rules and OWASP Top 10
- Excludes test directories and virtual environments
- Outputs JSON format to `semgrep-report.json`
- Focuses on ERROR and WARNING severity levels

**Usage:**

```bash
# Run semgrep manually
semgrep --config=.semgrep.yml .

# Run with pre-commit
pre-commit run semgrep --all-files
```

## Pre-commit Integration

All security tools are integrated with pre-commit hooks and run automatically:

- **Bandit:** Runs on Python files, excludes tests
- **Safety:** Runs on requirements files
- **Semgrep:** Runs on Python files, excludes tests

## Security Reports

Security scan results are generated in the following files:

- `bandit-report.json` - Bandit security findings
- `semgrep-report.json` - Semgrep security analysis
- Safety output is displayed in terminal

## Addressing Security Issues

1. **Review Reports:** Check the generated JSON reports for security findings
2. **Fix Issues:** Address high and medium severity issues
3. **Document Exceptions:** For issues that cannot be fixed, document the rationale
4. **Update Baselines:** Update configuration files to ignore false positives

## Continuous Integration

Security scanning is also integrated into the CI/CD pipeline through
pre-commit hooks, ensuring all code changes are automatically scanned for
security issues before being committed.

## Best Practices

1. **Regular Scans:** Run security scans regularly, not just on commits
2. **Review Findings:** Always review and address security findings
3. **Keep Updated:** Keep security tools and rules updated
4. **Document Decisions:** Document any security exceptions or workarounds
5. **Team Awareness:** Ensure all team members understand security scanning requirements
