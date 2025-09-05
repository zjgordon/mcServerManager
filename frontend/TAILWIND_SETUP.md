# Tailwind CSS Setup - Minecraft Server Manager Frontend

## Overview

This document describes the Tailwind CSS configuration and custom styling system for the Minecraft Server Manager frontend.

## Configuration

### Tailwind CSS v4

We're using Tailwind CSS v4 with the new `@tailwindcss/postcss` plugin for optimal performance and modern features.

### Configuration Files

- **`tailwind.config.js`** - Main Tailwind configuration with custom theme extensions
- **`postcss.config.js`** - PostCSS configuration for Tailwind processing
- **`src/index.css`** - Base CSS with Tailwind imports and custom variables
- **`src/App.css`** - Component-specific styles and utility classes

## Custom Theme Extensions

### Colors

#### Minecraft-Inspired Palette
```css
minecraft: {
  green: '#7CB342',      /* Minecraft grass green */
  darkGreen: '#558B2F',  /* Darker green for borders */
  brown: '#8D6E63',      /* Minecraft wood brown */
  darkBrown: '#5D4037',  /* Darker brown for borders */
  stone: '#9E9E9E',      /* Minecraft stone gray */
  darkStone: '#616161',  /* Darker stone gray */
  red: '#F44336',        /* Minecraft red */
  darkRed: '#D32F2F',    /* Darker red */
  blue: '#2196F3',       /* Minecraft blue */
  darkBlue: '#1976D2',   /* Darker blue */
  yellow: '#FFEB3B',     /* Minecraft yellow */
  darkYellow: '#FBC02D', /* Darker yellow */
}
```

#### Brand Colors
```css
brand: {
  primary: '#3B82F6',    /* Primary blue */
  secondary: '#6366F1',  /* Secondary purple */
  accent: '#10B981',     /* Accent green */
  danger: '#EF4444',     /* Danger red */
  warning: '#F59E0B',    /* Warning orange */
  success: '#10B981',    /* Success green */
  info: '#3B82F6',       /* Info blue */
}
```

### Typography

```css
fontFamily: {
  'minecraft': ['Minecraft', 'monospace'],
  'sans': ['Inter', 'system-ui', 'sans-serif'],
}
```

### Spacing

```css
spacing: {
  '18': '4.5rem',   /* 72px */
  '88': '22rem',    /* 352px */
  '128': '32rem',   /* 512px */
}
```

### Animations

```css
animation: {
  'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'bounce-slow': 'bounce 2s infinite',
  'spin-slow': 'spin 3s linear infinite',
}
```

### Shadows

```css
boxShadow: {
  'minecraft': '0 4px 0 0 rgba(0, 0, 0, 0.3)',
  'minecraft-lg': '0 8px 0 0 rgba(0, 0, 0, 0.3)',
  'minecraft-xl': '0 12px 0 0 rgba(0, 0, 0, 0.3)',
}
```

### Border Radius

```css
borderRadius: {
  'minecraft': '0.25rem',   /* 4px */
  'minecraft-lg': '0.5rem', /* 8px */
}
```

## Custom Component Classes

### Buttons

#### Minecraft-Style Button
```css
.btn-minecraft {
  @apply relative inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-minecraft-green border-2 border-minecraft-dark-green rounded-minecraft shadow-minecraft transition-all duration-150 ease-in-out;
}
```

#### Standard Button Variants
- `.btn-primary` - Primary blue button
- `.btn-secondary` - Secondary gray button
- `.btn-danger` - Danger red button
- `.btn-success` - Success green button
- `.btn-warning` - Warning orange button

### Cards

#### Standard Card
```css
.card {
  @apply bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200;
}
```

#### Minecraft Card
```css
.card-minecraft {
  @apply bg-white shadow-minecraft rounded-minecraft overflow-hidden border-2 border-minecraft-brown;
}
```

#### Server Card
```css
.server-card {
  @apply bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:border-brand-primary;
}
```

### Forms

#### Form Input
```css
.form-input {
  @apply block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors duration-200;
}
```

#### Form Labels and Errors
- `.form-label` - Form field labels
- `.form-input-error` - Error state for inputs
- `.form-error` - Error message text
- `.form-help` - Help text

### Status Badges

```css
.status-running {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200;
}

.status-stopped {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200;
}

.status-starting {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse;
}

.status-stopping {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 animate-pulse;
}
```

### Loading States

```css
.loading-skeleton {
  @apply animate-pulse bg-gray-200 rounded;
}

.loading-spinner {
  @apply animate-spin rounded-full border-2 border-gray-300 border-t-brand-primary;
}
```

### Notifications

```css
.notification {
  @apply fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg border border-gray-200;
}

.notification-success {
  @apply border-l-4 border-l-green-500;
}

.notification-error {
  @apply border-l-4 border-l-red-500;
}

.notification-warning {
  @apply border-l-4 border-l-yellow-500;
}

.notification-info {
  @apply border-l-4 border-l-blue-500;
}
```

## Usage Examples

### Basic Button Usage
```jsx
<button className="btn-primary">Primary Action</button>
<button className="btn-minecraft">Minecraft Style</button>
<button className="btn-danger">Delete</button>
```

### Card Layout
```jsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content goes here</p>
  </div>
  <div className="card-footer">
    <button className="btn-primary">Action</button>
  </div>
</div>
```

### Form Elements
```jsx
<div>
  <label className="form-label">Username</label>
  <input className="form-input" placeholder="Enter username" />
  <p className="form-help">This is help text</p>
</div>
```

### Status Indicators
```jsx
<span className="status-running">Server Running</span>
<span className="status-stopped">Server Stopped</span>
```

## Responsive Design

The system includes responsive utilities and mobile-first design:

```css
@media (max-width: 640px) {
  .card {
    @apply mx-2;
  }
  
  .btn-minecraft {
    @apply text-xs px-3 py-1.5;
  }
}
```

## Dark Mode Support

Prepared for future dark mode implementation:

```css
@media (prefers-color-scheme: dark) {
  .card {
    @apply bg-gray-800 border-gray-700;
  }
  
  .form-input {
    @apply bg-gray-800 border-gray-600 text-white placeholder-gray-400;
  }
}
```

## CSS Variables

Custom CSS variables for consistent theming:

```css
:root {
  --minecraft-green: #7CB342;
  --minecraft-dark-green: #558B2F;
  --minecraft-brown: #8D6E63;
  --minecraft-dark-brown: #5D4037;
  --minecraft-stone: #9E9E9E;
  --minecraft-dark-stone: #616161;
}
```

## Testing

A test component (`TailwindTest.tsx`) is available at `/test` route to verify all custom styles and utilities are working correctly.

## Build Process

The Tailwind CSS is processed through:
1. **PostCSS** - Processes Tailwind directives
2. **Vite** - Bundles and optimizes CSS
3. **Production Build** - Generates optimized CSS (currently ~15.5 kB)

## Best Practices

1. **Use Custom Classes** - Prefer custom component classes over inline Tailwind utilities
2. **Consistent Spacing** - Use the design system spacing scale
3. **Color Consistency** - Use the defined color palette
4. **Responsive Design** - Always consider mobile-first approach
5. **Accessibility** - Ensure proper contrast and focus states

## Future Enhancements

- [ ] Dark mode implementation
- [ ] Additional Minecraft-themed components
- [ ] Animation library integration
- [ ] Component variants system
- [ ] Design token system
