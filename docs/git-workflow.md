# Git Workflow Documentation

This document describes the git workflow and commit conventions for the
mcServerManager project.

## Commit Message Format

All commits must follow the
[Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```text
feat: add user authentication system
fix: resolve memory leak in server management
docs: update API documentation
style: format code with black
refactor: extract common validation logic
perf: optimize database queries
test: add unit tests for user model
chore: update dependencies
```

## Git Hooks

### Commit Message Hook (commit-msg)

The `commit-msg` hook validates that commit messages follow the conventional
commit format. It will reject commits that don't match the required pattern.

### Pre-push Hook (pre-push)

The `pre-push` hook runs the following checks before allowing a push:

1. **Tests**: Runs the full test suite using `dev.sh test` or `pytest`
2. **Linting**: Runs flake8 to check code quality
3. **Pre-commit**: Ensures all pre-commit hooks pass

If any check fails, the push is aborted.

## Branch Protection

### Main Branch

- All changes must go through pull requests
- All tests must pass before merging
- All pre-commit hooks must pass
- Conventional commit format is enforced

### Development Workflow

1. Create a feature branch from `main`
2. Make changes following conventional commit format
3. Run tests locally: `./dev.sh test`
4. Run pre-commit hooks: `pre-commit run --all-files`
5. Commit changes with conventional commit format
6. Push to remote branch
7. Create pull request
8. Address any review feedback
9. Merge after approval

## Commit Message Template

A commit message template is available at `.gitmessage`. To use it:

```bash
git config commit.template .gitmessage
```

This will pre-populate commit messages with the conventional commit format.

## Merge Conflict Prevention

- Always pull latest changes before starting work
- Use `git pull --rebase` to maintain clean history
- Resolve conflicts immediately when they occur
- Test after resolving conflicts

## Automated Changelog

Conventional commits enable automatic changelog generation. The commit
messages are parsed to generate release notes and changelog entries.

## Commit Signing

For enhanced security, consider enabling commit signing:

```bash
git config --global user.signingkey <your-gpg-key>
git config --global commit.gpgsign true
```

## Troubleshooting

### Hook Not Running

If hooks aren't running, ensure they're executable:

```bash
chmod +x .git/hooks/commit-msg
chmod +x .git/hooks/pre-push
```

### Bypassing Hooks (Not Recommended)

Hooks can be bypassed with `--no-verify`, but this is strongly discouraged
as it bypasses important quality checks.

### Common Issues

1. **Commit message rejected**: Ensure your message follows conventional commit format
2. **Tests failing**: Fix failing tests before pushing
3. **Linting errors**: Fix code quality issues before pushing
4. **Pre-commit failures**: Run `pre-commit run --all-files` to fix issues
