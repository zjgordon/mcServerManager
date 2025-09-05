# Forms Components

This directory contains all form-related React components for the Minecraft Server Manager frontend.

## Components

### CreateServerForm
A comprehensive multi-step form for creating new Minecraft servers with validation and user-friendly interface.

**Features:**
- Multi-step form with progress indicator
- Comprehensive validation for all fields
- Real-time error feedback
- Integration with server creation API
- Support for all server configuration options
- Responsive design with Minecraft theme
- Loading states and error handling

**Form Steps:**
1. **Basic Information**: Server name, version, memory allocation
2. **Game Settings**: Game mode, difficulty, level seed, MOTD
3. **Advanced Settings**: Hardcore mode, PvP, monster spawning

**Props:**
- `onSuccess?: (server: any) => void` - Success callback
- `onCancel?: () => void` - Cancel callback

**Validation Rules:**
- **Server Name**: 3+ characters, alphanumeric + underscore/hyphen only, unique
- **Version**: Required, must be from available versions list
- **Memory**: 512-8192 MB range
- **Level Seed**: Optional, max 100 characters
- **MOTD**: Optional, max 150 characters
- **Game Mode**: Must be valid (survival, creative, adventure, spectator)
- **Difficulty**: Must be valid (peaceful, easy, normal, hard)

**Usage:**
```tsx
import { CreateServerForm } from '../components/forms';

<CreateServerForm 
  onSuccess={(server) => console.log('Server created:', server)}
  onCancel={() => navigate('/servers')}
/>
```

## Form Structure

### Step 1: Basic Server Information
- Server name input with confirmation
- Minecraft version selector
- Memory allocation slider/input
- Real-time validation feedback

### Step 2: Game Settings
- Game mode dropdown (Survival, Creative, Adventure, Spectator)
- Difficulty dropdown (Peaceful, Easy, Normal, Hard)
- Level seed input (optional)
- Message of the Day input (optional)

### Step 3: Advanced Settings
- Hardcore mode checkbox (with warning)
- PvP enabled checkbox
- Spawn monsters checkbox
- Help text and warnings

## Validation System

### Client-Side Validation
- Real-time validation as user types
- Field-specific error messages
- Form-level validation before submission
- Duplicate server name checking

### Server-Side Integration
- API validation error handling
- Network error handling
- Loading states during submission
- Success/error toast notifications

## User Experience Features

### Progress Indicator
- Visual step progress with numbers
- Completed steps show checkmark
- Current step highlighted
- Clear navigation between steps

### Error Handling
- Field-level error messages
- General form error display
- Network error handling
- Validation error prevention

### Loading States
- Form submission loading
- Version fetching loading
- Disabled states during operations
- Loading spinners and indicators

### Help and Guidance
- Inline help text for complex fields
- Warning messages for irreversible settings
- Recommended values and ranges
- Contextual information

## Integration

### API Integration
- Uses `useCreateServer` hook for server creation
- Fetches available versions via `useQuery`
- Integrates with existing server list for duplicate checking
- Toast notifications for user feedback

### Navigation
- Automatic navigation to servers list on success
- Cancel button with optional callback
- Back navigation support
- Route integration

### State Management
- Local form state management
- React Query for server data
- Form validation state
- Error state management

## Styling

### Design System
- shadcn/ui components for consistency
- Minecraft-inspired color scheme
- Responsive design for all screen sizes
- Accessible form controls

### Visual Elements
- Progress indicator with step numbers
- Icon integration for visual clarity
- Color-coded validation states
- Loading animations

## Testing

### Test Coverage
- Form rendering and interaction
- Validation logic testing
- Step navigation testing
- Error handling testing
- Integration testing

### Test Files
- `CreateServerForm.test.tsx` - Comprehensive test suite
- Mock API responses
- User interaction simulation
- Validation testing

## Dependencies

- React 18+
- TypeScript
- React Query
- React Router
- shadcn/ui components
- Lucide React icons
- Tailwind CSS

## Performance Considerations

- Lazy loading of version data
- Debounced validation
- Optimized re-renders
- Efficient state updates
- Memory management

## Accessibility

- Proper form labels and ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Error announcement

## Future Enhancements

- Server template support
- Advanced configuration options
- Plugin/mod selection
- World generation options
- Server backup integration
