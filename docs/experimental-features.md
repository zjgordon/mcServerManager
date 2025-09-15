# Experimental Features System

## Overview

The Minecraft Server Manager includes a comprehensive feature gating system that allows administrators to safely test new functionality before making it available to all users. This system provides a controlled way to introduce experimental features, manage their lifecycle, and gradually promote them to production.

## Architecture

The experimental features system consists of:

- **Database Model**: `ExperimentalFeature` stores feature metadata and toggle states
- **Utility Functions**: Core API for feature management and checking
- **Admin Interface**: Web-based toggle controls for administrators
- **Feature Gating**: Runtime checks throughout the application

## Core API

### Database Model

The `ExperimentalFeature` model includes:

```python
class ExperimentalFeature(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    feature_key = db.Column(db.String(100), unique=True, nullable=False)
    feature_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    enabled = db.Column(db.Boolean, nullable=False, default=False)
    is_stable = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp())
    updated_at = db.Column(db.DateTime, default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())
    updated_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
```

### Utility Functions

#### `is_feature_enabled(feature_key)`

Check if an experimental feature is currently enabled.

```python
from app.utils import is_feature_enabled

# Basic usage
if is_feature_enabled('advanced_monitoring'):
    # Feature-specific code here
    enable_advanced_monitoring()
```

**Parameters:**
- `feature_key` (str): Unique identifier for the feature

**Returns:**
- `bool`: True if feature is enabled, False otherwise

**Error Handling:**
- Returns `False` if feature doesn't exist
- Returns `False` if database error occurs
- Logs errors for debugging

#### `get_experimental_features()`

Retrieve all experimental features with their current state.

```python
from app.utils import get_experimental_features

# Get all features
features = get_experimental_features()
for feature in features:
    print(f"{feature['feature_name']}: {'Enabled' if feature['enabled'] else 'Disabled'}")
```

**Returns:**
- `list`: List of feature dictionaries with complete metadata

#### `toggle_experimental_feature(feature_key, enabled)`

Enable or disable an experimental feature.

```python
from app.utils import toggle_experimental_feature

# Enable a feature
success = toggle_experimental_feature('advanced_monitoring', True)
if success:
    print("Feature enabled successfully")
else:
    print("Failed to enable feature")
```

**Parameters:**
- `feature_key` (str): Unique identifier for the feature
- `enabled` (bool): Whether to enable (True) or disable (False) the feature

**Returns:**
- `bool`: True if successful, False otherwise

#### `add_experimental_feature(feature_key, feature_name, description, enabled=False, is_stable=False)`

Add a new experimental feature to the system.

```python
from app.utils import add_experimental_feature

# Add a new experimental feature
success = add_experimental_feature(
    feature_key='plugin_manager',
    feature_name='Plugin Management System',
    description='Advanced plugin installation and management interface',
    enabled=False,
    is_stable=False
)
```

**Parameters:**
- `feature_key` (str): Unique identifier for the feature
- `feature_name` (str): Human-readable name
- `description` (str): Detailed description of the feature
- `enabled` (bool): Whether to enable by default (default: False)
- `is_stable` (bool): Whether feature is considered stable (default: False)

**Returns:**
- `bool`: True if successful, False if feature already exists

## Implementation Examples

### Route-Level Feature Gating

Control entire routes based on feature flags:

```python
from flask import render_template, abort
from app.utils import is_feature_enabled

@server_bp.route('/advanced-monitoring')
@login_required
def advanced_monitoring():
    """Advanced server monitoring dashboard."""
    if not is_feature_enabled('advanced_monitoring'):
        abort(404)  # Hide route completely
    
    # Feature-specific implementation
    monitoring_data = get_advanced_monitoring_data()
    return render_template('advanced_monitoring.html', data=monitoring_data)
```

### Conditional UI Elements

Show/hide UI elements based on feature state:

```python
# In template
{% if is_feature_enabled('advanced_monitoring') %}
<div class="advanced-monitoring-panel">
    <h3>Advanced Monitoring</h3>
    <!-- Advanced monitoring UI -->
</div>
{% endif %}
```

### Function-Level Feature Gating

Wrap specific functionality with feature checks:

```python
from app.utils import is_feature_enabled

def create_server_backup(server_id):
    """Create a server backup with optional advanced features."""
    
    # Standard backup process
    backup_result = perform_standard_backup(server_id)
    
    # Advanced backup features (experimental)
    if is_feature_enabled('advanced_backup'):
        backup_result = enhance_backup_with_advanced_features(backup_result)
    
    return backup_result
```

### Configuration-Based Feature Gating

Use features to control configuration options:

```python
from app.utils import is_feature_enabled

def get_server_configuration_options():
    """Get available server configuration options."""
    options = {
        'basic_settings': True,
        'memory_allocation': True,
        'port_configuration': True,
    }
    
    # Add experimental configuration options
    if is_feature_enabled('advanced_configuration'):
        options.update({
            'jvm_arguments': True,
            'plugin_management': True,
            'performance_tuning': True,
        })
    
    return options
```

### API Endpoint Feature Gating

Control API endpoints with feature flags:

```python
from flask import jsonify, request
from app.utils import is_feature_enabled

@api_bp.route('/api/experimental/plugin-manager')
@login_required
def plugin_manager_api():
    """Plugin management API endpoint."""
    if not is_feature_enabled('plugin_manager'):
        return jsonify({'error': 'Feature not available'}), 404
    
    # Plugin management implementation
    plugins = get_available_plugins()
    return jsonify({'plugins': plugins})
```

## Feature Lifecycle Management

### 1. Development Phase

```python
# Add feature as experimental
add_experimental_feature(
    feature_key='new_feature',
    feature_name='New Feature',
    description='Description of the new feature',
    enabled=False,  # Disabled by default
    is_stable=False  # Marked as experimental
)
```

### 2. Testing Phase

```python
# Enable for testing (via admin interface or programmatically)
toggle_experimental_feature('new_feature', True)
```

### 3. Stabilization Phase

```python
# Mark as stable when ready
feature = ExperimentalFeature.query.filter_by(feature_key='new_feature').first()
if feature:
    feature.is_stable = True
    db.session.commit()
```

### 4. Production Migration

When a feature is ready for production:

1. Remove feature gating checks from code
2. Remove feature from experimental features table
3. Update documentation
4. Deploy to production

## Best Practices

### Feature Naming

- Use descriptive, kebab-case keys: `advanced_monitoring`, `plugin_manager`
- Keep names consistent with functionality
- Avoid generic names like `feature1` or `test`

### Error Handling

Always handle feature check failures gracefully:

```python
def safe_feature_check(feature_key):
    """Safely check if a feature is enabled with proper error handling."""
    try:
        return is_feature_enabled(feature_key)
    except Exception as e:
        logger.error(f"Error checking feature {feature_key}: {e}")
        return False  # Default to disabled on error
```

### Performance Considerations

- Feature checks are database queries - cache results when possible
- Use feature flags sparingly in performance-critical paths
- Consider using application-level caching for frequently checked features

### Security

- All feature management functions require admin privileges
- Feature states are logged for audit trails
- Never expose feature management endpoints to regular users

## Admin Interface

The experimental features system includes a web-based admin interface at `/admin_config` that allows administrators to:

- View all experimental features
- Toggle features on/off
- See feature descriptions and stability status
- Track who last modified each feature

### Admin Interface Usage

1. Navigate to Admin Configuration page
2. Scroll to "Experimental Features" section
3. Toggle features using the provided switches
4. Confirm changes for experimental features
5. View feature status and descriptions

## Monitoring and Logging

The system provides comprehensive logging for:

- Feature state changes
- Feature check failures
- Admin actions on features
- Error conditions

### Log Examples

```
INFO: Experimental feature 'advanced_monitoring' enabled by user admin
DEBUG: Feature 'plugin_manager' not found, returning False
ERROR: Error checking if feature 'invalid_feature' is enabled: Database connection failed
```

## Migration and Deployment

### Adding New Features

1. Create feature in database using `add_experimental_feature()`
2. Implement feature gating in code using `is_feature_enabled()`
3. Add admin interface controls
4. Test thoroughly in development
5. Deploy with feature disabled by default

### Removing Features

1. Remove feature gating code
2. Remove feature from database
3. Update documentation
4. Deploy changes

## Troubleshooting

### Common Issues

**Feature not working after enabling:**
- Check feature key spelling
- Verify database connection
- Check application logs for errors

**Admin interface not showing features:**
- Ensure user has admin privileges
- Check database for feature records
- Verify template rendering

**Performance issues:**
- Consider caching feature states
- Optimize database queries
- Review feature check frequency

### Debug Commands

```python
# Check if feature exists and is enabled
from app.models import ExperimentalFeature
feature = ExperimentalFeature.query.filter_by(feature_key='your_feature').first()
print(f"Feature exists: {feature is not None}")
print(f"Feature enabled: {feature.enabled if feature else 'N/A'}")

# List all features
from app.utils import get_experimental_features
features = get_experimental_features()
for f in features:
    print(f"{f['feature_key']}: {f['enabled']}")
```

## Future Enhancements

Planned improvements to the experimental features system:

- **A/B Testing**: Built-in A/B testing framework
- **Feature Analytics**: Usage tracking and analytics
- **Conditional Features**: Features based on user roles or conditions
- **Feature Dependencies**: Features that depend on other features
- **Rollback Capabilities**: Automatic rollback on feature failures
- **Feature Scheduling**: Time-based feature activation/deactivation

This experimental features system provides a robust foundation for safely introducing new functionality while maintaining system stability and providing administrators with full control over feature availability.
