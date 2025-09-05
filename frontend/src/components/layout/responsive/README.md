# Responsive Layout Components

This directory contains responsive layout components for the Minecraft Server Manager frontend, providing a comprehensive set of tools for creating responsive user interfaces.

## Components

### MobileNavigation
A responsive mobile navigation component that provides a slide-out menu for mobile devices.

**Features:**
- Slide-out navigation drawer
- User information display
- Navigation links with active states
- Quick stats section
- Logout functionality
- Responsive design for mobile devices

**Props:**
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { MobileNavigation } from '../components/layout/responsive';

<MobileNavigation />
```

### ResponsiveGrid
A flexible grid layout component that adapts to different screen sizes.

**Features:**
- Configurable column counts for different breakpoints
- Auto-fit grid option
- Customizable gap sizes
- Responsive breakpoint support
- Flexible column configuration

**Props:**
- `children: React.ReactNode` - Grid items
- `className?: string` - Additional CSS classes
- `cols?: object` - Column configuration for breakpoints
- `gap?: 'sm' | 'md' | 'lg' | 'xl'` - Gap size
- `autoFit?: boolean` - Enable auto-fit grid
- `minWidth?: string` - Minimum width for auto-fit

**Usage:**
```tsx
import { ResponsiveGrid } from '../components/layout/responsive';

<ResponsiveGrid cols={{ default: 1, sm: 2, md: 3, lg: 4 }}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</ResponsiveGrid>
```

### ResponsiveCard
A responsive card component with flexible sizing and styling options.

**Features:**
- Multiple size variants
- Flexible styling options
- Header and footer support
- Hover effects
- Full height option
- Customizable padding

**Props:**
- `children: React.ReactNode` - Card content
- `className?: string` - Additional CSS classes
- `title?: string` - Card title
- `description?: string` - Card description
- `header?: React.ReactNode` - Custom header
- `footer?: React.ReactNode` - Custom footer
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Card size
- `variant?: 'default' | 'outline' | 'elevated' | 'flat'` - Card variant
- `padding?: 'none' | 'sm' | 'md' | 'lg'` - Padding size
- `fullHeight?: boolean` - Full height card
- `hover?: boolean` - Hover effects

**Usage:**
```tsx
import { ResponsiveCard } from '../components/layout/responsive';

<ResponsiveCard 
  title="Server Status" 
  description="Current server information"
  size="lg"
  hover
>
  <p>Server is running</p>
</ResponsiveCard>
```

### ResponsiveForm
A responsive form layout component for organizing form fields.

**Features:**
- Configurable column layouts
- Responsive breakpoint support
- Customizable spacing and gaps
- Centered layout option
- Flexible width options

**Props:**
- `children: React.ReactNode` - Form fields
- `className?: string` - Additional CSS classes
- `columns?: object` - Column configuration for breakpoints
- `gap?: 'sm' | 'md' | 'lg'` - Gap size
- `spacing?: 'sm' | 'md' | 'lg'` - Spacing between sections
- `maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'` - Maximum width
- `centered?: boolean` - Center the form

**Usage:**
```tsx
import { ResponsiveForm } from '../components/layout/responsive';

<ResponsiveForm columns={{ default: 1, md: 2 }} gap="md">
  <input type="text" placeholder="Server Name" />
  <input type="number" placeholder="Memory (MB)" />
</ResponsiveForm>
```

### ResponsiveDashboard
A comprehensive dashboard layout component for admin and main pages.

**Features:**
- Sidebar support with collapse option
- Header and footer integration
- Flexible content area
- Responsive sidebar positioning
- Customizable padding and gaps

**Props:**
- `children: React.ReactNode` - Main content
- `className?: string` - Additional CSS classes
- `sidebar?: React.ReactNode` - Sidebar content
- `header?: React.ReactNode` - Header content
- `footer?: React.ReactNode` - Footer content
- `sidebarCollapsed?: boolean` - Collapse sidebar
- `sidebarPosition?: 'left' | 'right'` - Sidebar position
- `maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'` - Maximum width
- `padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'` - Padding size
- `gap?: 'sm' | 'md' | 'lg' | 'xl'` - Gap size

**Usage:**
```tsx
import { ResponsiveDashboard } from '../components/layout/responsive';

<ResponsiveDashboard 
  sidebar={<Sidebar />}
  header={<Header />}
  maxWidth="full"
>
  <DashboardContent />
</ResponsiveDashboard>
```

### ResponsiveContainer
A flexible container component for responsive content wrapping.

**Features:**
- Multiple size options
- Centered layout option
- Fluid width option
- Customizable padding
- Semantic HTML support

**Props:**
- `children: React.ReactNode` - Container content
- `className?: string` - Additional CSS classes
- `size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'` - Container size
- `padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'` - Padding size
- `centered?: boolean` - Center the container
- `fluid?: boolean` - Fluid width
- `as?: string` - HTML element type

**Usage:**
```tsx
import { ResponsiveContainer } from '../components/layout/responsive';

<ResponsiveContainer size="lg" padding="md" centered>
  <p>Content goes here</p>
</ResponsiveContainer>
```

### ResponsiveBreakpoint
A component for conditionally rendering content based on screen size.

**Features:**
- Show/hide content based on breakpoints
- Mobile, tablet, and desktop support
- Real-time breakpoint detection
- Flexible rendering options

**Props:**
- `children: React.ReactNode` - Content to render
- `className?: string` - Additional CSS classes
- `showOn?: 'mobile' | 'tablet' | 'desktop' | 'mobile-only' | 'tablet-only' | 'desktop-only'` - Show on specific breakpoints
- `hideOn?: 'mobile' | 'tablet' | 'desktop' | 'mobile-only' | 'tablet-only' | 'desktop-only'` - Hide on specific breakpoints
- `as?: string` - HTML element type

**Usage:**
```tsx
import { ResponsiveBreakpoint } from '../components/layout/responsive';

<ResponsiveBreakpoint showOn="desktop">
  <DesktopOnlyContent />
</ResponsiveBreakpoint>
```

## Hooks

### useResponsive
A hook for responsive breakpoint detection and screen size information.

**Returns:**
- `breakpoint: Breakpoint` - Current breakpoint
- `isMobile: boolean` - Is mobile screen
- `isTablet: boolean` - Is tablet screen
- `isDesktop: boolean` - Is desktop screen
- `width: number` - Screen width
- `height: number` - Screen height

**Usage:**
```tsx
import { useResponsive } from '../hooks/useResponsive';

const MyComponent = () => {
  const { breakpoint, isMobile, width } = useResponsive();
  
  return (
    <div>
      <p>Current breakpoint: {breakpoint}</p>
      <p>Screen width: {width}px</p>
      {isMobile && <p>Mobile view active</p>}
    </div>
  );
};
```

### useBreakpoint
A hook for checking specific breakpoints.

**Usage:**
```tsx
import { useBreakpoint } from '../hooks/useResponsive';

const MyComponent = () => {
  const isMobile = useBreakpoint('mobile');
  const isDesktop = useBreakpoint('desktop');
  
  return (
    <div>
      {isMobile && <MobileContent />}
      {isDesktop && <DesktopContent />}
    </div>
  );
};
```

## Breakpoint System

The responsive system uses the following breakpoints:

- **Mobile**: < 768px
- **Tablet**: 768px - 1023px
- **Desktop**: ≥ 1024px

## Integration

### Updated Layout Components

The existing layout components have been updated to use responsive components:

- **Header**: Now includes mobile navigation
- **MainLayout**: Uses ResponsiveContainer for better mobile support
- **AuthLayout**: Uses ResponsiveContainer for consistent sizing
- **Sidebar**: Hidden on mobile, shown on desktop

### Usage Patterns

1. **Grid Layouts**: Use ResponsiveGrid for card layouts and content organization
2. **Forms**: Use ResponsiveForm for multi-column form layouts
3. **Cards**: Use ResponsiveCard for consistent card styling
4. **Conditional Rendering**: Use ResponsiveBreakpoint for device-specific content
5. **Containers**: Use ResponsiveContainer for consistent content wrapping

## Styling

### Design System Integration
- Uses Tailwind CSS for responsive utilities
- Integrates with shadcn/ui design system
- Maintains Minecraft-inspired color scheme
- Consistent spacing and typography

### Responsive Utilities
- Mobile-first approach
- Flexible grid systems
- Adaptive spacing
- Responsive typography
- Touch-friendly interactions

## Performance Considerations

- Efficient breakpoint detection
- Minimal re-renders on resize
- Optimized CSS classes
- Lazy loading support
- Memory-efficient event listeners

## Accessibility

- Screen reader compatibility
- Keyboard navigation support
- Touch-friendly interfaces
- High contrast support
- Focus management

## Testing

### Test Coverage
- Component rendering and props
- Responsive behavior
- Breakpoint detection
- Event handling
- Accessibility compliance

### Test Files
- `ResponsiveGrid.test.tsx` - Comprehensive test suite
- Mock responsive behavior
- Breakpoint testing
- Component interaction testing

## Future Enhancements

- Advanced grid layouts
- Container queries support
- Enhanced breakpoint system
- Animation and transitions
- Performance optimizations
- Advanced responsive patterns
