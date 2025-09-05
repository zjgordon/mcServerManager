# Frontend Testing Setup

This directory contains the comprehensive testing setup for the Minecraft Server Manager frontend.

## Overview

The testing setup uses:
- **Vitest** - Fast unit test framework
- **React Testing Library** - React component testing utilities
- **Jest DOM** - Custom Jest matchers for DOM testing
- **jsdom** - DOM implementation for Node.js
- **@vitest/coverage-v8** - Code coverage reporting
- **@vitest/ui** - Interactive test UI

## File Structure

```
src/test/
├── setup.ts                 # Global test setup and mocks
├── utils.tsx                # Custom render functions and test utilities
├── index.ts                 # Test utilities exports
├── coverage.config.ts       # Coverage configuration
├── README.md               # This documentation
└── mocks/
    ├── api.ts              # API service mocks
    └── websocket.ts        # WebSocket service mocks
```

## Test Scripts

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run tests in watch mode
npm run test:watch
```

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../test'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
  })

  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    render(<MyComponent />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### Using Custom Render

The custom render function includes all necessary providers:

```typescript
import { render } from '../test'

// Basic render with all providers
render(<MyComponent />)

// Custom render options
render(<MyComponent />, {
  withAuth: false,        // Skip auth provider
  withWebSocket: false,   // Skip WebSocket provider
  withRouter: false,      // Skip router provider
  initialEntries: ['/custom-path'], // Custom router entries
})
```

### Testing with Mocks

```typescript
import { mockApiService, setupApiMocks } from '../test'

describe('Component with API calls', () => {
  beforeEach(() => {
    setupApiMocks.serversList()
  })

  it('displays servers from API', async () => {
    render(<ServerList />)
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument()
    })
  })
})
```

### Testing WebSocket Integration

```typescript
import { mockWebSocketService, setupWebSocketMocks } from '../test'

describe('Component with WebSocket', () => {
  beforeEach(() => {
    setupWebSocketMocks.connectSuccess()
  })

  it('receives real-time updates', async () => {
    render(<RealtimeComponent />)
    
    // Simulate WebSocket message
    setupWebSocketMocks.simulateServerStatusUpdate({
      serverId: 1,
      status: 'Running'
    })
    
    await waitFor(() => {
      expect(screen.getByText('Running')).toBeInTheDocument()
    })
  })
})
```

## Test Utilities

### Custom Render Function

The `render` function from `../test` includes:
- React Query client
- Router context
- Auth context
- WebSocket context
- Custom configuration options

### Test Data Factories

```typescript
import { TestDataFactory } from '../test'

// Create test data
const user = TestDataFactory.user({ username: 'testuser' })
const server = TestDataFactory.server({ server_name: 'Test Server' })
const users = TestDataFactory.users(5) // Create 5 users
```

### Mock Helpers

```typescript
import { setupApiMocks, setupWebSocketMocks } from '../test'

// API mocks
setupApiMocks.loginSuccess()
setupApiMocks.serversList()
setupApiMocks.userCreateSuccess()

// WebSocket mocks
setupWebSocketMocks.connectSuccess()
setupWebSocketMocks.simulateServerStatusUpdate()
```

## Coverage Configuration

### Coverage Thresholds

- **Global**: 80% for branches, functions, lines, statements
- **Auth Components**: 90% (critical security components)
- **Server Components**: 85% (core functionality)
- **Admin Components**: 85% (admin functionality)
- **Services**: 90% (API and WebSocket services)
- **Hooks**: 85% (custom React hooks)

### Coverage Reports

Coverage reports are generated in multiple formats:
- **HTML**: Interactive report in `coverage/index.html`
- **JSON**: Machine-readable format
- **LCOV**: CI/CD integration format
- **Text**: Console output

## Best Practices

### 1. Test Structure

- Use `describe` blocks to group related tests
- Use descriptive test names that explain the behavior
- Follow the AAA pattern: Arrange, Act, Assert

### 2. Component Testing

- Test user interactions, not implementation details
- Use accessible queries (getByRole, getByLabelText)
- Test error states and loading states
- Test accessibility features

### 3. Mock Usage

- Mock external dependencies (API, WebSocket)
- Use setup functions for common mock configurations
- Reset mocks between tests
- Test both success and error scenarios

### 4. Async Testing

- Use `waitFor` for async operations
- Use `findBy*` queries for elements that appear asynchronously
- Test loading states and error handling

### 5. Coverage

- Aim for high coverage on critical paths
- Don't sacrifice test quality for coverage numbers
- Focus on testing user-facing behavior
- Exclude trivial code from coverage requirements

## Common Patterns

### Testing Forms

```typescript
it('submits form with valid data', async () => {
  const user = userEvent.setup()
  render(<LoginForm />)
  
  await user.type(screen.getByLabelText('Username'), 'testuser')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
  
  await waitFor(() => {
    expect(mockApiService.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123'
    })
  })
})
```

### Testing Error States

```typescript
it('displays error message on API failure', async () => {
  setupApiMocks.loginError()
  render(<LoginForm />)
  
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Username'), 'testuser')
  await user.type(screen.getByLabelText('Password'), 'wrongpassword')
  await user.click(screen.getByRole('button', { name: 'Sign In' }))
  
  await waitFor(() => {
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })
})
```

### Testing Real-time Updates

```typescript
it('updates server status in real-time', async () => {
  render(<ServerStatus serverId={1} />)
  
  // Initial state
  expect(screen.getByText('Stopped')).toBeInTheDocument()
  
  // Simulate WebSocket update
  setupWebSocketMocks.simulateServerStatusUpdate({
    serverId: 1,
    status: 'Running'
  })
  
  await waitFor(() => {
    expect(screen.getByText('Running')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout or use proper async/await
2. **Mock not working**: Ensure mocks are reset between tests
3. **Coverage not accurate**: Check exclude patterns in coverage config
4. **WebSocket tests failing**: Use proper mock setup and event simulation

### Debug Tips

- Use `screen.debug()` to see current DOM state
- Use `--reporter=verbose` for detailed test output
- Use `--ui` flag for interactive test debugging
- Check coverage HTML report for uncovered lines

## Integration with CI/CD

The test setup is configured for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
