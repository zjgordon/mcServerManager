# Contributing to Minecraft Server Manager

Thank you for your interest in contributing to Minecraft Server Manager! This document
provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- Git
- Basic knowledge of Flask, SQLAlchemy, and web development
- Understanding of Minecraft server management concepts

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/yourusername/mcServerManager.git
   cd mcServerManager
   ```

2. **Create Virtual Environment**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # If available
   ```

4. **Set Up Development Environment**

   ```bash
   # Create development configuration
   cp config.example.json config.json
   # Edit config.json with your development settings
   ```

5. **Run Tests**

   ```bash
   pytest
   ```

6. **Start Development Server**

   ```bash
   python run.py
   ```

## 📋 Development Guidelines

### Code Style

- Follow PEP 8 Python style guidelines
- Use meaningful variable and function names
- Write comprehensive docstrings for functions and classes
- Keep functions small and focused on single responsibilities

### Commit Messages

Use clear, descriptive commit messages following this format:

```
type(scope): brief description

Detailed explanation of changes if needed.

Fixes #issue_number
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(auth): add two-factor authentication support

Implements 2FA using TOTP for enhanced security.
Users can enable 2FA in their profile settings.

Fixes #123
```

```
fix(server): resolve memory leak in process monitoring

Fixed memory leak that occurred when monitoring
long-running server processes.

Fixes #456
```

### Pull Request Process

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write your code following the style guidelines
   - Add tests for new functionality
   - Update documentation if needed

3. **Test Your Changes**

   ```bash
   pytest
   pytest --cov=app  # Run with coverage
   ```

4. **Commit Changes**

   ```bash
   git add .
   git commit -m "feat(scope): your commit message"
   ```

5. **Push and Create PR**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then create a pull request on GitHub.

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app

# Run specific test file
pytest tests/test_auth.py

# Run with verbose output
pytest -v
```

### Writing Tests

- Write tests for all new functionality
- Aim for high test coverage
- Use descriptive test names
- Test both success and failure cases
- Mock external dependencies

### Test Categories

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test component interactions
- **Security Tests**: Test authentication, authorization, and security features
- **Performance Tests**: Test memory management and resource usage

## 🏗️ Architecture Guidelines

### Project Structure

```
app/
├── __init__.py          # Flask app initialization
├── config.py            # Configuration management
├── models.py            # Database models
├── utils.py             # Utility functions
├── security.py          # Security utilities
├── error_handlers.py    # Error handling
├── extensions.py        # Flask extensions
├── routes/              # Route handlers
│   ├── auth_routes.py   # Authentication routes
│   └── server_routes.py # Server management routes
├── templates/           # HTML templates
└── static/              # Static files
```

### Adding New Features

1. **Database Changes**
   - Update models in `app/models.py`
   - Create migration scripts if needed
   - Update tests

2. **New Routes**
   - Add routes to appropriate file in `app/routes/`
   - Follow existing patterns for error handling
   - Add authentication/authorization as needed

3. **New Templates**
   - Add templates to `app/templates/`
   - Follow existing styling patterns
   - Ensure responsive design

4. **Configuration**
   - Add new config options to `app/config.py`
   - Update `config.example.json`
   - Document new options

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - Python version
   - Operating system
   - Browser (for UI issues)

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior

3. **Error Messages**
   - Full error traceback
   - Log file excerpts

4. **Additional Context**
   - Screenshots if applicable
   - Related issues or PRs

## 💡 Feature Requests

When requesting features:

1. **Describe the Problem**
   - What problem does this solve?
   - Who would benefit from this feature?

2. **Propose a Solution**
   - How should this feature work?
   - Any specific requirements or constraints?

3. **Additional Context**
   - Related issues or discussions
   - Mockups or examples if applicable

## 🔒 Security

### Reporting Security Issues

- **DO NOT** create public issues for security vulnerabilities
- Email security issues to: [security@example.com]
- Include detailed information about the vulnerability
- Allow time for response before public disclosure

### Security Guidelines

- Never commit secrets or API keys
- Use environment variables for sensitive configuration
- Follow secure coding practices
- Validate all user inputs
- Use parameterized queries for database operations

## 📚 Documentation

### Code Documentation

- Write docstrings for all public functions and classes
- Use type hints where appropriate
- Comment complex logic
- Keep README.md updated

### API Documentation

- Document all API endpoints
- Include request/response examples
- Specify authentication requirements
- Document error responses

## 🏷️ Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version numbers updated
- [ ] Security review completed

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different opinions and approaches

### Getting Help

- Check existing issues and discussions
- Ask questions in GitHub discussions
- Join our community chat (if available)
- Read the documentation thoroughly

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/yourusername/mcServerManager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mcServerManager/discussions)
- **Security**: [security@example.com]

---

Thank you for contributing to Minecraft Server Manager! Your contributions help make
this project better for everyone.
