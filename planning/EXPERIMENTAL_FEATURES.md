# Experimental Features Implementation Plan

## Overview

This document outlines a detailed, incremental plan to enhance the Admin Configuration page (`admin_config`) with three key features:

1. **Memory Bar Gauge**: Visual representation of system memory usage to assist admins in memory allocation decisions
2. **Experimental Features Section**: Toggle-based feature gating system for testing new functionality
3. **Updated Configuration Help**: Enhanced sidebar documentation for new features

## Current System Analysis

### Existing Infrastructure
- **Admin Configuration Page**: Located at `app/templates/admin_config.html` with form-based memory configuration
- **Memory Management**: Existing system uses `psutil` for system metrics in `app/monitoring.py`
- **Configuration Storage**: `Configuration` model in `app/models.py` stores key-value pairs
- **Memory Utilities**: `app/utils.py` contains memory calculation and validation functions
- **Current Memory Display**: Shows current settings in an info alert box

### Key Components Identified
- System memory detection via `psutil.virtual_memory()` in `get_system_metrics()`
- Configuration management through `Configuration` database model
- Admin route at `app/routes/auth_routes.py:admin_config()`
- Memory validation and allocation logic in `app/utils.py`

## Implementation Plan

### Phase 1: Memory Bar Gauge Implementation

#### 1.1 Backend Changes

**File: `app/routes/auth_routes.py`**
- **Modification**: Enhance `admin_config()` function
- **Changes**:
  - Import `get_system_metrics` from `app.monitoring`
  - Add system memory data to template context
  - Calculate memory usage percentages for bar gauge display

**File: `app/utils.py`**
- **New Function**: `get_system_memory_for_admin()`
- **Purpose**: Extract and format system memory data specifically for admin configuration page
- **Returns**: Dictionary with total system memory, used memory, available memory, and percentages
- **Integration**: Leverage existing `get_system_metrics()` function

#### 1.2 Frontend Changes

**File: `app/templates/admin_config.html`**
- **Location**: Under Memory Configuration section (after line 107)
- **Implementation**: Add memory bar gauge component
- **Features**:
  - Visual bar showing total system memory
  - Overlay showing current used memory
  - Color-coded indicators (green: healthy, yellow: warning, red: critical)
  - Real-time memory usage display
  - Responsive design matching existing UI

**File: `app/static/css/style.css`** (if exists) or inline styles
- **New CSS Classes**:
  - `.memory-gauge-container`
  - `.memory-gauge-bar`
  - `.memory-gauge-used`
  - `.memory-gauge-labels`

#### 1.3 Technical Specifications

**Memory Bar Gauge Design**:
- **Width**: Full width of the form group container
- **Height**: 20px for the bar, additional space for labels
- **Colors**: 
  - Background: Light gray (#e9ecef)
  - Used memory: Gradient from green to yellow to red based on usage percentage
  - Text: Dark gray for labels
- **Labels**: 
  - Left: "System Memory"
  - Right: "X.X GB Used / Y.Y GB Total"
  - Below: Percentage usage

**Data Flow**:
1. Admin visits `/admin_config`
2. Backend calls `get_system_memory_for_admin()`
3. Template renders bar gauge with system memory data
4. JavaScript (optional) for real-time updates every 30 seconds

### Phase 2: Experimental Features Section

#### 2.1 Database Schema Extension

**File: `app/models.py`**
- **New Model**: `ExperimentalFeature`
- **Fields**:
  - `id`: Primary key
  - `feature_key`: Unique identifier (e.g., "server_management_console")
  - `feature_name`: Display name (e.g., "Server Management Console")
  - `description`: Feature description for admin
  - `enabled`: Boolean toggle state
  - `is_stable`: Boolean indicating if feature is ready for production
  - `created_at`: Timestamp
  - `updated_at`: Timestamp
  - `updated_by`: Foreign key to User (admin who last modified)

**Migration Strategy**:
- Create new migration file in `migrations/versions/`
- Add `ExperimentalFeature` table
- Insert default features (starting with "Server Management Console")

#### 2.2 Backend Implementation

**File: `app/utils.py`**
- **New Functions**:
  - `get_experimental_features()`: Retrieve all experimental features
  - `toggle_experimental_feature(feature_key, enabled)`: Toggle feature state
  - `is_feature_enabled(feature_key)`: Check if feature is enabled
  - `add_experimental_feature(feature_key, name, description)`: Add new feature

**File: `app/routes/auth_routes.py`**
- **New Route**: `@auth_bp.route("/admin_config/experimental", methods=["POST"])`
- **Purpose**: Handle experimental feature toggle requests
- **Validation**: Admin-only access, CSRF protection
- **Response**: JSON response with success/error status

**File: `app/routes/auth_routes.py` (modify existing)**
- **Enhancement**: `admin_config()` function
- **Addition**: Include experimental features data in template context

#### 2.3 Frontend Implementation

**File: `app/templates/admin_config.html`**
- **Location**: New section at bottom of main card (after line 131)
- **Structure**:
  ```html
  <hr class="my-4">
  <h6 class="pixel-font text-gradient-mc">
      <i class="fas fa-flask"></i> Experimental Features
  </h6>
  <div class="experimental-features">
      <!-- Feature toggles here -->
  </div>
  ```

**Feature Toggle Design**:
- **Layout**: Card-based layout for each feature
- **Components**:
  - Toggle switch (Bootstrap custom switch)
  - Feature name and description
  - Status indicator (Experimental/Stable)
  - Warning text for experimental features

**JavaScript Enhancement**:
- **File**: `app/static/js/admin_config.js` (new file)
- **Functionality**:
  - AJAX calls to toggle features
  - Real-time UI updates
  - Confirmation dialogs for experimental features
  - Error handling and user feedback

#### 2.4 Feature Gating Strategy

**Implementation Pattern**:
```python
# In any route or function that uses experimental features
from app.utils import is_feature_enabled

if is_feature_enabled('server_management_console'):
    # Feature-specific code here
    pass
```

**Feature Lifecycle Management**:
1. **Development**: Feature added as experimental with `is_stable=False`
2. **Testing**: Admin can enable for testing
3. **Stabilization**: Feature marked as `is_stable=True` when ready
4. **Production**: Feature moved to main application, removed from experimental section

**Default Features to Include**:
- **Server Management Console**: Advanced server control interface (greyed out initially)
- **Placeholder for future features**: Template for easy addition

### Phase 3: Updated Configuration Help Sidebar

#### 3.1 Content Updates

**File: `app/templates/admin_config.html`**
- **Location**: Configuration Help sidebar (lines 134-168)
- **New Sections**:

**Memory Bar Gauge Help**:
```html
<h6><i class="fas fa-chart-bar"></i> Memory Bar Gauge</h6>
<p class="small text-muted">
    Visual representation of your system's memory usage. The bar shows total 
    system memory with current usage highlighted. Use this to make informed 
    decisions about memory allocation for Minecraft servers.
</p>
```

**Experimental Features Help**:
```html
<h6><i class="fas fa-flask"></i> Experimental Features</h6>
<p class="small text-muted">
    Toggle new features for testing. Experimental features may be unstable 
    and should only be enabled for testing purposes. Features marked as 
    "Stable" are ready for production use.
</p>
```

#### 3.2 Enhanced Help Content

**Additional Help Sections**:
- **Memory Usage Guidelines**: Best practices for memory allocation
- **Experimental Feature Warnings**: Clear warnings about experimental features
- **Troubleshooting**: Common issues and solutions
- **System Requirements**: Minimum system requirements for optimal performance

## Implementation Timeline

### Week 1: Memory Bar Gauge
- **Day 1-2**: Backend implementation (`app/utils.py`, `app/routes/auth_routes.py`)
- **Day 3-4**: Frontend implementation (template and styling)
- **Day 5**: Testing and refinement

### Week 2: Experimental Features Foundation
- **Day 1-2**: Database model and migration
- **Day 3-4**: Backend utilities and routes
- **Day 5**: Basic frontend implementation

### Week 3: Experimental Features UI
- **Day 1-2**: Advanced frontend with JavaScript
- **Day 3-4**: Feature gating implementation
- **Day 5**: Testing and integration

### Week 4: Help Documentation and Polish
- **Day 1-2**: Updated help sidebar content
- **Day 3-4**: End-to-end testing
- **Day 5**: Documentation and deployment preparation

## Technical Considerations

### Performance
- **Memory Bar Gauge**: Cache system metrics for 30 seconds to avoid excessive `psutil` calls
- **Experimental Features**: Use database indexes on `feature_key` for fast lookups
- **JavaScript**: Debounce toggle requests to prevent rapid-fire API calls

### Security
- **Admin-Only Access**: All experimental feature routes require admin authentication
- **CSRF Protection**: All form submissions include CSRF tokens
- **Input Validation**: Validate all feature keys and toggle states
- **Audit Trail**: Log all experimental feature changes with admin user ID

### User Experience
- **Progressive Enhancement**: Features work without JavaScript, enhanced with it
- **Clear Feedback**: Success/error messages for all actions
- **Consistent Styling**: Match existing Minecraft-themed UI
- **Responsive Design**: Works on all screen sizes

### Maintenance
- **Feature Lifecycle**: Clear process for moving features from experimental to production
- **Documentation**: Comprehensive inline documentation for all new functions
- **Testing**: Unit tests for all new utility functions
- **Monitoring**: Log experimental feature usage for analytics

## Risk Mitigation

### Development Risks
- **Database Migration**: Test migration on development database first
- **Template Changes**: Backup existing template before modifications
- **JavaScript Dependencies**: Ensure compatibility with existing JavaScript

### User Experience Risks
- **Performance Impact**: Monitor system metrics collection performance
- **UI Consistency**: Maintain existing design patterns
- **Feature Confusion**: Clear labeling and help text for experimental features

### Production Risks
- **Database Schema**: Use proper migration tools and rollback procedures
- **Configuration Changes**: Validate all configuration updates
- **Feature Stability**: Thoroughly test experimental features before enabling

## Success Criteria

### Memory Bar Gauge
- [ ] Visual bar gauge displays system memory usage
- [ ] Real-time updates every 30 seconds
- [ ] Color-coded usage indicators
- [ ] Responsive design on all screen sizes
- [ ] Performance impact < 100ms per page load

### Experimental Features
- [ ] Toggle system for experimental features
- [ ] Database storage for feature states
- [ ] Admin-only access controls
- [ ] Feature gating implementation
- [ ] Clear UI indicators for experimental vs stable features

### Configuration Help
- [ ] Updated help content for new features
- [ ] Clear explanations of memory bar gauge
- [ ] Experimental features documentation
- [ ] Troubleshooting guidance
- [ ] Consistent formatting with existing help

## Future Enhancements

### Phase 2+ Features
- **Real-time Memory Updates**: WebSocket-based live memory monitoring
- **Memory Usage History**: Charts showing memory usage over time
- **Advanced Experimental Features**: More sophisticated feature management
- **Feature Usage Analytics**: Track which experimental features are used
- **A/B Testing Framework**: Built-in testing for experimental features

### Integration Opportunities
- **Health Monitoring**: Integrate with existing health monitoring system
- **Alerting**: Memory usage alerts based on bar gauge thresholds
- **Reporting**: Admin reports on system resource usage
- **API Endpoints**: REST API for external monitoring tools

This plan provides a comprehensive, incremental approach to implementing the requested features while maintaining the application's stability and user experience. Each phase builds upon the previous one, ensuring a smooth development process and minimal risk to the existing functionality.
