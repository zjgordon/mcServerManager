# Advanced UI Interactions

## Overview

This document outlines the comprehensive advanced UI interactions system implemented for the Minecraft Server Manager, providing enhanced user experience through animations, interactive components, drag-and-drop functionality, data visualization, and accessibility features.

## Architecture

### Animation System

The animation system is built on top of Tailwind CSS with custom keyframes and provides a comprehensive set of animation utilities.

**Key Features:**
- Custom animation keyframes and utilities
- Animation presets for common use cases
- Reduced motion support
- Performance optimization
- Event-driven animations

**Animation Types:**
- `fade-in` / `fade-out`: Opacity transitions
- `slide-in-up` / `slide-in-down` / `slide-in-left` / `slide-in-right`: Slide transitions
- `scale-in` / `scale-out`: Scale transformations
- `wiggle`: Rotation animation
- `float`: Vertical floating animation
- `glow`: Glowing effect
- `shimmer`: Shimmer loading effect
- `progress`: Progress bar animation
- `typing`: Typewriter effect

### Interactive Components

Enhanced versions of standard UI components with advanced interactions and feedback.

**Components:**
- **EnhancedButton**: Advanced button with ripple effects, loading states, and animations
- **EnhancedCard**: Interactive card with hover effects, collapsible content, and actions
- **EnhancedInput**: Advanced input with validation, suggestions, and real-time feedback
- **DragDrop**: Drag-and-drop container with file support and reordering
- **DataVisualization**: Chart components with interactive features

## Components

### EnhancedButton

An advanced button component with multiple interaction states and animations.

**Features:**
- Multiple variants (default, destructive, outline, minecraft, etc.)
- Loading, success, and error states
- Ripple effect on click
- Icon support with positioning
- Animation support
- Keyboard navigation
- Accessibility compliance

**Props:**
```typescript
interface EnhancedButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'minecraft' | 'success' | 'warning' | 'info';
  size?: 'sm' | 'default' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-lg';
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  tooltip?: string;
  ripple?: boolean;
  animation?: 'none' | 'pulse' | 'bounce' | 'glow' | 'float' | 'wiggle';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
```

**Usage:**
```typescript
<EnhancedButton
  variant="minecraft"
  size="lg"
  loading={isLoading}
  ripple
  animation="glow"
  onClick={handleClick}
>
  Start Server
</EnhancedButton>
```

### EnhancedCard

An interactive card component with advanced features and animations.

**Features:**
- Multiple variants (default, elevated, outlined, minecraft, glass, gradient)
- Collapsible content
- Favorite and bookmark functionality
- Visibility toggle
- Badge support
- Shimmer loading effect
- Hover animations
- Click and double-click handlers

**Props:**
```typescript
interface EnhancedCardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'minecraft' | 'glass' | 'gradient';
  size?: 'sm' | 'default' | 'lg' | 'xl';
  interactive?: boolean;
  animated?: boolean;
  glow?: boolean;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  favorite?: boolean;
  onFavorite?: (favorited: boolean) => void;
  bookmarked?: boolean;
  onBookmark?: (bookmarked: boolean) => void;
  visible?: boolean;
  onVisibilityToggle?: (visible: boolean) => void;
  loading?: boolean;
  error?: boolean;
  success?: boolean;
  tooltip?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  shimmer?: boolean;
  gradient?: string;
}
```

**Usage:**
```typescript
<EnhancedCard
  variant="minecraft"
  interactive
  animated
  title="Server Status"
  description="Minecraft server running"
  favorite={isFavorited}
  onFavorite={setIsFavorited}
  collapsible
  badge="Online"
  badgeVariant="success"
>
  <ServerDetails />
</EnhancedCard>
```

### EnhancedInput

An advanced input component with enhanced interactions and validation.

**Features:**
- Multiple variants (default, filled, outlined, ghost, minecraft)
- Real-time validation with visual feedback
- Icon support with positioning
- Clearable input
- Copy to clipboard
- Password visibility toggle
- Search functionality with suggestions
- Character count
- Floating labels
- Prefix and suffix support
- Status indicators (error, success, warning, loading)

**Props:**
```typescript
interface EnhancedInputProps {
  variant?: 'default' | 'filled' | 'outlined' | 'ghost' | 'minecraft';
  size?: 'sm' | 'default' | 'lg';
  state?: 'default' | 'error' | 'success' | 'warning' | 'loading';
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  warning?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  clearable?: boolean;
  onClear?: () => void;
  copyable?: boolean;
  onCopy?: (value: string) => void;
  showPasswordToggle?: boolean;
  searchable?: boolean;
  onSearch?: (value: string) => void;
  suggestions?: string[];
  onSuggestionSelect?: (suggestion: string) => void;
  animated?: boolean;
  floatingLabel?: boolean;
  characterCount?: boolean;
  maxLength?: number;
  tooltip?: string;
  prefix?: string;
  suffix?: string;
}
```

**Usage:**
```typescript
<EnhancedInput
  variant="minecraft"
  label="Server Name"
  placeholder="Enter server name"
  clearable
  copyable
  characterCount
  maxLength={50}
  suggestions={serverNames}
  onSuggestionSelect={handleSuggestionSelect}
  error={errors.serverName}
/>
```

### DragDrop

A comprehensive drag-and-drop component for managing items and files.

**Features:**
- Item reordering with drag-and-drop
- File drop support with type validation
- Add, remove, and duplicate items
- Visual feedback during drag operations
- Animation support
- Loading and error states
- Minimum and maximum item limits
- Custom item rendering

**Props:**
```typescript
interface DragDropProps {
  items: DragDropItem[];
  onReorder?: (items: DragDropItem[]) => void;
  onAdd?: (item: DragDropItem) => void;
  onRemove?: (itemId: string) => void;
  onDuplicate?: (item: DragDropItem) => void;
  onMove?: (itemId: string, targetId: string) => void;
  acceptFiles?: boolean;
  acceptedFileTypes?: string[];
  onFileDrop?: (files: File[]) => void;
  maxItems?: number;
  minItems?: number;
  allowReorder?: boolean;
  allowAdd?: boolean;
  allowRemove?: boolean;
  allowDuplicate?: boolean;
  className?: string;
  placeholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  error?: string;
  success?: string;
  animated?: boolean;
}
```

**Usage:**
```typescript
<DragDrop
  items={serverList}
  onReorder={handleReorder}
  onAdd={handleAddServer}
  onRemove={handleRemoveServer}
  acceptFiles
  acceptedFileTypes={['.jar', '.zip']}
  onFileDrop={handleFileDrop}
  maxItems={10}
  allowReorder
  animated
/>
```

### DataVisualization

Advanced chart components for data visualization.

**Features:**
- Multiple chart types (bar, line, pie, area, gauge, sparkline)
- Interactive data points
- Animation support
- Color schemes (default, minecraft, monochrome, rainbow)
- Tooltip support
- Legend display
- Grid and axes options
- Responsive design

**Chart Types:**
- **BarChart**: Vertical bar chart with hover effects
- **LineChart**: Line chart with data points
- **PieChart**: Pie chart with legend
- **GaugeChart**: Gauge chart for single values
- **Sparkline**: Minimal line chart for trends

**Props:**
```typescript
interface ChartProps {
  title?: string;
  description?: string;
  data: DataPoint[] | TimeSeriesData[];
  type: 'bar' | 'line' | 'pie' | 'area' | 'gauge' | 'sparkline';
  animated?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  colorScheme?: 'default' | 'minecraft' | 'monochrome' | 'rainbow';
  maxValue?: number;
  minValue?: number;
  unit?: string;
  className?: string;
  onDataPointClick?: (dataPoint: DataPoint | TimeSeriesData) => void;
  onHover?: (dataPoint: DataPoint | TimeSeriesData) => void;
}
```

**Usage:**
```typescript
<DataVisualization
  type="bar"
  data={serverStats}
  title="Server Performance"
  animated
  showLegend
  colorScheme="minecraft"
  onDataPointClick={handleDataPointClick}
/>
```

## Keyboard Shortcuts

### Global Shortcuts

**Navigation:**
- `Ctrl + H`: Go to Dashboard
- `Ctrl + S`: Go to Servers
- `Ctrl + A`: Go to Admin
- `Ctrl + U`: Go to Settings

**Server Management:**
- `Ctrl + N`: Create New Server
- `Ctrl + R`: Refresh Servers
- `Ctrl + F`: Focus Search

**General:**
- `Escape`: Close Modal/Dropdown
- `?`: Show Keyboard Shortcuts Help
- `Ctrl + K`: Open Command Palette

### Accessibility Features

**Focus Management:**
- Tab navigation support
- Focus indicators
- Skip links
- Focus trapping in modals

**Screen Reader Support:**
- ARIA labels and descriptions
- Live regions for dynamic content
- Semantic HTML structure
- Role attributes

**Reduced Motion Support:**
- Respects `prefers-reduced-motion` setting
- Disables animations when requested
- Provides alternative feedback

**High Contrast Support:**
- Respects `prefers-contrast: high` setting
- Enhanced color contrast
- Alternative visual indicators

## Animation System

### Animation Utilities

**useAnimation Hook:**
```typescript
const { ref, isVisible, isAnimating, trigger, stop } = useAnimation({
  type: 'fade-in',
  trigger: 'scroll',
  duration: 500,
  delay: 100
});
```

**useStaggeredAnimation Hook:**
```typescript
const { setItemRef, visibleItems, isItemVisible } = useStaggeredAnimation({
  type: 'slide-in-up',
  staggerDelay: 100
});
```

**Animation Presets:**
```typescript
// Page transitions
const pageEnter = animationPresets.pageEnter;
const pageExit = animationPresets.pageExit;

// Card animations
const cardHover = animationPresets.cardHover;
const cardEnter = animationPresets.cardEnter;

// Button animations
const buttonPress = animationPresets.buttonPress;
const buttonHover = animationPresets.buttonHover;

// Loading animations
const loading = animationPresets.loading;
const spinner = animationPresets.spinner;
```

### Performance Optimization

**Hardware Acceleration:**
- Automatic GPU acceleration for animations
- `transform` and `opacity` properties for smooth animations
- `will-change` property management

**Reduced Motion Support:**
- Automatic detection of user preferences
- Graceful degradation of animations
- Alternative feedback mechanisms

**Memory Management:**
- Automatic cleanup of animation listeners
- Event handler optimization
- Animation state management

## Usage Examples

### Basic Button with Animation
```typescript
import { EnhancedButton } from '../components/ui/enhanced-button';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await performAction();
    setLoading(false);
  };

  return (
    <EnhancedButton
      variant="minecraft"
      loading={loading}
      ripple
      animation="glow"
      onClick={handleClick}
    >
      Start Server
    </EnhancedButton>
  );
};
```

### Interactive Card with Actions
```typescript
import { EnhancedCard } from '../components/ui/enhanced-card';

const ServerCard = ({ server }) => {
  const [favorited, setFavorited] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <EnhancedCard
      variant="minecraft"
      interactive
      animated
      title={server.name}
      description={`${server.players} players online`}
      favorite={favorited}
      onFavorite={setFavorited}
      collapsible
      defaultCollapsed={collapsed}
      onToggle={setCollapsed}
      badge={server.status}
      badgeVariant={server.status === 'online' ? 'success' : 'destructive'}
    >
      <ServerDetails server={server} />
    </EnhancedCard>
  );
};
```

### Advanced Input with Validation
```typescript
import { EnhancedInput } from '../components/ui/enhanced-input';

const ServerNameInput = () => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const validateName = (name: string) => {
    if (name.length < 3) {
      setError('Server name must be at least 3 characters');
    } else if (name.length > 50) {
      setError('Server name must be less than 50 characters');
    } else {
      setError('');
    }
  };

  return (
    <EnhancedInput
      variant="minecraft"
      label="Server Name"
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        validateName(e.target.value);
      }}
      clearable
      copyable
      characterCount
      maxLength={50}
      error={error}
      animated
    />
  );
};
```

### Drag and Drop Server List
```typescript
import { DragDrop } from '../components/ui/drag-drop';

const ServerList = () => {
  const [servers, setServers] = useState(serverData);

  const handleReorder = (newServers) => {
    setServers(newServers);
    // Save to backend
  };

  const handleAddServer = (server) => {
    setServers([...servers, server]);
  };

  return (
    <DragDrop
      items={servers}
      onReorder={handleReorder}
      onAdd={handleAddServer}
      onRemove={(id) => setServers(servers.filter(s => s.id !== id))}
      acceptFiles
      acceptedFileTypes={['.jar']}
      onFileDrop={handleFileDrop}
      maxItems={20}
      animated
    />
  );
};
```

### Data Visualization
```typescript
import { DataVisualization } from '../components/ui/data-visualization';

const ServerStats = () => {
  const serverData = [
    { label: 'CPU Usage', value: 45, color: '#7CB342' },
    { label: 'Memory Usage', value: 78, color: '#F44336' },
    { label: 'Disk Usage', value: 32, color: '#2196F3' },
  ];

  return (
    <DataVisualization
      type="bar"
      data={serverData}
      title="Server Performance"
      animated
      showLegend
      colorScheme="minecraft"
      onDataPointClick={(point) => console.log('Clicked:', point)}
    />
  );
};
```

## Testing

### Test Coverage

**Unit Tests:**
- Animation utilities and hooks
- Component rendering and interactions
- Event handling and state management
- Accessibility features

**Integration Tests:**
- Component composition
- User interaction flows
- Keyboard navigation
- Screen reader compatibility

**Visual Tests:**
- Animation performance
- Responsive design
- Cross-browser compatibility
- Accessibility compliance

### Test Files

```
src/utils/__tests__/animations.test.ts
src/components/ui/__tests__/enhanced-button.test.tsx
src/components/ui/__tests__/enhanced-card.test.tsx
src/components/ui/__tests__/enhanced-input.test.tsx
src/components/ui/__tests__/drag-drop.test.tsx
src/components/ui/__tests__/data-visualization.test.tsx
src/hooks/__tests__/useKeyboardShortcuts.test.tsx
```

## Performance Considerations

### Optimization Strategies

**Animation Performance:**
- Use `transform` and `opacity` for animations
- Enable hardware acceleration
- Debounce rapid state changes
- Clean up animation listeners

**Component Performance:**
- Memoize expensive calculations
- Use `useCallback` for event handlers
- Implement virtual scrolling for large lists
- Lazy load heavy components

**Bundle Size:**
- Tree-shake unused animations
- Code-split visualization components
- Optimize icon imports
- Compress animation assets

### Best Practices

**Accessibility:**
- Always provide alternative feedback
- Test with screen readers
- Ensure keyboard navigation
- Respect user preferences

**User Experience:**
- Provide immediate feedback
- Use consistent animation timing
- Avoid overwhelming animations
- Test on various devices

**Performance:**
- Monitor animation frame rates
- Optimize for mobile devices
- Use appropriate animation durations
- Implement loading states

## Future Enhancements

### Planned Features

**Advanced Animations:**
- Physics-based animations
- Gesture recognition
- 3D transformations
- Particle effects

**Enhanced Interactions:**
- Multi-touch support
- Voice commands
- Eye tracking
- Haptic feedback

**Accessibility Improvements:**
- Voice navigation
- High contrast themes
- Font size scaling
- Color blind support

**Performance Optimizations:**
- WebGL animations
- Canvas-based charts
- Web Workers for calculations
- Service Worker caching

## Conclusion

The advanced UI interactions system provides a comprehensive foundation for creating engaging and accessible user interfaces. With support for animations, interactive components, drag-and-drop functionality, data visualization, and keyboard shortcuts, it enables developers to build sophisticated applications while maintaining excellent performance and accessibility standards.

The modular architecture allows for easy customization and extension, while the comprehensive testing ensures reliability and maintainability. The system is designed to work seamlessly with the existing shadcn/ui components and provides a consistent user experience across the entire application.
