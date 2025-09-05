# shadcn/ui Setup - Minecraft Server Manager Frontend

## Overview

This document describes the shadcn/ui component library setup and integration with our Minecraft Server Manager frontend. shadcn/ui provides high-quality, accessible, and customizable React components built on top of Radix UI primitives.

## Installation & Configuration

### Dependencies

**Core shadcn/ui Dependencies:**
- `class-variance-authority` - For component variants
- `clsx` - For conditional class names
- `tailwind-merge` - For merging Tailwind classes

**Radix UI Primitives:**
- `@radix-ui/react-slot` - Polymorphic component support
- `@radix-ui/react-dialog` - Modal dialogs
- `@radix-ui/react-dropdown-menu` - Dropdown menus
- `@radix-ui/react-toast` - Toast notifications
- `@radix-ui/react-tooltip` - Tooltips
- `@radix-ui/react-popover` - Popovers
- `@radix-ui/react-select` - Select components
- `@radix-ui/react-switch` - Toggle switches
- `@radix-ui/react-tabs` - Tab navigation
- `@radix-ui/react-accordion` - Accordion components
- `@radix-ui/react-label` - Form labels

### Configuration Files

**`components.json`** - shadcn/ui configuration:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

**Path Aliases:**
- `@/components` → `./src/components`
- `@/lib/utils` → `./src/lib/utils`
- `@/components/ui` → `./src/components/ui`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks`

## Installed Components

### Core Components

#### Button (`@/components/ui/button`)
- **Variants**: default, destructive, outline, secondary, ghost, link, minecraft
- **Sizes**: default, sm, lg, icon
- **Features**: Polymorphic support with `asChild` prop
- **Custom**: Minecraft variant with 3D styling

#### Card (`@/components/ui/card`)
- **Subcomponents**: CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Features**: Consistent spacing and styling
- **Usage**: Server cards, content containers

#### Input (`@/components/ui/input`)
- **Features**: Consistent styling with focus states
- **Integration**: Works with form validation
- **Accessibility**: Proper focus management

#### Label (`@/components/ui/label`)
- **Features**: Accessible form labels
- **Integration**: Works with Radix UI form primitives
- **Styling**: Consistent with design system

#### Badge (`@/components/ui/badge`)
- **Variants**: default, secondary, destructive, outline, running, stopped, starting, stopping
- **Custom**: Server status variants with animations
- **Usage**: Status indicators, labels

#### Dialog (`@/components/ui/dialog`)
- **Subcomponents**: DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
- **Features**: Accessible modal dialogs
- **Usage**: Confirmations, forms, detailed views

#### Toast (`@/components/ui/toast`)
- **Features**: Non-blocking notifications
- **Variants**: default, destructive
- **Integration**: useToast hook for programmatic control

### Utility Components

#### Toaster (`@/components/ui/toaster`)
- **Purpose**: Toast notification container
- **Integration**: Added to App component
- **Features**: Automatic positioning and management

## Integration with Custom Theme

### CSS Variables

**shadcn/ui Color System:**
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222.2 84% 4.9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --muted: 210 40% 96%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96%;
  --accent-foreground: 222.2 84% 4.9%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}
```

**Dark Mode Support:**
```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... other dark mode variables */
}
```

### Tailwind Integration

**Color System:**
```javascript
colors: {
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  // ... other color mappings
}
```

**Border Radius:**
```javascript
borderRadius: {
  lg: "var(--radius)",
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
  minecraft: "0.25rem",
  "minecraft-lg": "0.5rem",
}
```

## Custom Components

### Minecraft Button Variant

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // ... other variants
        minecraft: "bg-minecraft-green text-white border-2 border-minecraft-dark-green shadow-minecraft hover:bg-minecraft-dark-green hover:shadow-minecraft-lg transition-all duration-150",
      },
    },
  }
)
```

### Server Status Badges

```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // ... other variants
        running: "border-transparent bg-green-100 text-green-800 border-green-200",
        stopped: "border-transparent bg-gray-100 text-gray-800 border-gray-200",
        starting: "border-transparent bg-yellow-100 text-yellow-800 border-yellow-200 animate-pulse",
        stopping: "border-transparent bg-orange-100 text-orange-800 border-orange-200 animate-pulse",
      },
    },
  }
)
```

## Usage Examples

### Basic Button Usage
```tsx
import { Button } from "@/components/ui/button"

<Button>Default Button</Button>
<Button variant="minecraft">Minecraft Style</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">
  <Plus className="h-4 w-4" />
</Button>
```

### Card Layout
```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Server Name</CardTitle>
    <CardDescription>Minecraft 1.21.8 - Port 25565</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Server content goes here</p>
  </CardContent>
</Card>
```

### Form Elements
```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="username">Username</Label>
  <Input id="username" placeholder="Enter username" />
</div>
```

### Status Badges
```tsx
import { Badge } from "@/components/ui/badge"

<Badge variant="running">Running</Badge>
<Badge variant="stopped">Stopped</Badge>
<Badge variant="starting">Starting</Badge>
```

### Dialog Modal
```tsx
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Server</DialogTitle>
      <DialogDescription>
        Set up a new Minecraft server.
      </DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Create</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Toast Notifications
```tsx
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

const handleSuccess = () => {
  toast({
    title: "Success!",
    description: "Server created successfully.",
  })
}
```

## Build Integration

### Path Resolution
- **Vite Config**: `@` alias configured for `./src`
- **TypeScript**: Path mapping in `tsconfig.app.json`
- **Build**: All imports resolve correctly

### CSS Processing
- **Tailwind**: Processes all component styles
- **CSS Variables**: Dynamic theming support
- **Build Size**: ~28.31 kB CSS (includes all components)

## Best Practices

### Component Usage
1. **Import from UI directory**: `@/components/ui/button`
2. **Use variants consistently**: Prefer semantic variants
3. **Leverage composition**: Combine subcomponents for complex layouts
4. **Accessibility**: All components are accessible by default

### Styling
1. **Use CSS variables**: For consistent theming
2. **Custom variants**: Add Minecraft-specific variants
3. **Responsive design**: Components work on all screen sizes
4. **Dark mode**: Ready for future implementation

### Development
1. **Type safety**: Full TypeScript support
2. **IntelliSense**: Auto-completion for all props
3. **Consistent API**: Similar patterns across components
4. **Extensible**: Easy to add new variants and features

## Future Enhancements

### Additional Components
- [ ] Select component for version selection
- [ ] Switch component for server settings
- [ ] Tabs for server management sections
- [ ] Accordion for collapsible content
- [ ] Tooltip for help text
- [ ] Popover for contextual actions

### Advanced Features
- [ ] Form validation integration
- [ ] Animation library integration
- [ ] Custom theme variants
- [ ] Component composition patterns
- [ ] Storybook documentation

## Troubleshooting

### Common Issues

**Import Errors:**
- Ensure path aliases are configured correctly
- Check TypeScript configuration
- Verify component exports

**Styling Issues:**
- Check CSS variables are defined
- Verify Tailwind configuration
- Ensure proper class merging

**Build Errors:**
- Check all dependencies are installed
- Verify TypeScript types
- Ensure proper component structure

### Debugging
- Use browser dev tools to inspect component styles
- Check console for missing dependencies
- Verify CSS variables are applied correctly

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Class Variance Authority](https://cva.style/)
- [Lucide React Icons](https://lucide.dev/)
