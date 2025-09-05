# Authentication Components

This directory contains all authentication-related React components for the Minecraft Server Manager frontend.

## Components

### LoginForm
A comprehensive login form component with validation and error handling.

**Features:**
- Username and password validation
- Password visibility toggle
- Real-time form validation
- Loading states
- Error handling and display
- Accessibility support

**Props:**
- `onSuccess?: () => void` - Callback when login is successful
- `onError?: (error: string) => void` - Callback when login fails

**Usage:**
```tsx
import { LoginForm } from '../components/auth';

<LoginForm 
  onSuccess={() => navigate('/dashboard')}
  onError={(error) => console.error(error)}
/>
```

### SetupForm
A form for initial admin account setup with comprehensive validation.

**Features:**
- Username, email, and password validation
- Password strength requirements
- Password confirmation
- Real-time password strength indicators
- Loading states
- Error handling

**Props:**
- `onSuccess?: (user: any) => void` - Callback when setup is successful
- `onError?: (error: string) => void` - Callback when setup fails

**Usage:**
```tsx
import { SetupForm } from '../components/auth';

<SetupForm 
  onSuccess={(user) => console.log('Admin created:', user)}
  onError={(error) => console.error(error)}
/>
```

### ChangePasswordForm
A form for changing user passwords with validation.

**Features:**
- Current password verification
- New password validation
- Password confirmation
- Password strength requirements
- Real-time validation feedback
- Loading states

**Props:**
- `onSuccess?: () => void` - Callback when password change is successful
- `onError?: (error: string) => void` - Callback when password change fails
- `onCancel?: () => void` - Callback when user cancels the operation

**Usage:**
```tsx
import { ChangePasswordForm } from '../components/auth';

<ChangePasswordForm 
  onSuccess={() => setShowChangePassword(false)}
  onError={(error) => setError(error)}
  onCancel={() => setShowChangePassword(false)}
/>
```

## Validation Rules

### Username
- Required field
- Minimum 3 characters
- Only letters, numbers, underscores, and hyphens allowed

### Password
- Required field
- Minimum 8 characters
- Must contain at least one uppercase letter
- Must contain at least one lowercase letter
- Must contain at least one number
- Must be different from current password (for change password form)

### Email (Optional)
- Valid email format when provided

## Styling

All components use the shadcn/ui design system with:
- Consistent spacing and typography
- Minecraft-inspired color scheme
- Responsive design
- Dark/light mode support
- Accessibility features

## Error Handling

Components handle various error scenarios:
- Network errors
- Validation errors
- Server-side errors
- Rate limiting
- Authentication failures

## Accessibility

All components include:
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Testing

Components include comprehensive test coverage:
- Unit tests for validation logic
- Integration tests for user interactions
- Accessibility tests
- Error handling tests

Run tests with:
```bash
npm test
```

## Dependencies

- React 18+
- TypeScript
- shadcn/ui components
- Lucide React icons
- React Hook Form (for advanced forms)
- Zod (for validation schemas)

## Integration

These components integrate with:
- AuthContext for state management
- API service for backend communication
- React Router for navigation
- Toast notifications for user feedback
