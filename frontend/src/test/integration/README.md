# Integration Testing

This directory contains integration tests that verify the interaction between different components, services, and user workflows.

## Overview

Integration tests ensure that:
- Components work together correctly
- API services integrate properly with the UI
- WebSocket real-time features function as expected
- Complete user workflows work end-to-end
- Error handling works across component boundaries

## Test Categories

### 1. Authentication Flow Tests (`auth-flow.test.tsx`)
- Complete login/logout workflows
- Error handling for authentication failures
- Session management across components

### 2. Server Management Tests (`server-management.test.tsx`)
- Server creation, start, stop, and deletion workflows
- Server status updates and monitoring
- Error handling for server operations

### 3. Admin Panel Tests (`admin-panel.test.tsx`)
- User management workflows
- System configuration updates
- Process management operations

### 4. Real-time Features Tests (`realtime-features.test.tsx`)
- WebSocket connection lifecycle
- Real-time status updates
- Alert handling and dismissal
- Connection loss and recovery

### 5. API Service Tests (`api-service.test.tsx`)
- API service integration
- Error handling and timeout scenarios
- Concurrent API calls
- Authentication token management

### 6. WebSocket Service Tests (`websocket-service.test.tsx`)
- WebSocket connection management
- Message queuing during disconnection
- Event listener management
- Error handling and reconnection

### 7. End-to-End Workflows (`end-to-end-workflows.test.tsx`)
- Complete user onboarding
- Server lifecycle management
- Admin management workflows
- Cross-feature integration

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- auth-flow

# Run with coverage
npm run test:integration:coverage
```

## Test Utilities

### `renderIntegration()`
Enhanced render function that includes all necessary providers:
- React Query for data fetching
- Auth Context for authentication state
- WebSocket Context for real-time features
- React Router for navigation

### `waitForApiCall()`
Utility to wait for API calls to complete in tests.

### `waitForNavigation()`
Utility to wait for navigation to complete in tests.

## Mocking Strategy

Integration tests use the same mock system as unit tests but with additional setup:
- API mocks are configured for integration scenarios
- WebSocket mocks simulate real-time events
- Browser APIs are mocked for consistent testing

## Best Practices

1. **Test Real Workflows**: Focus on testing actual user workflows rather than isolated component behavior
2. **Use Realistic Data**: Use test data factories to create realistic test scenarios
3. **Test Error Scenarios**: Include tests for error handling and edge cases
4. **Keep Tests Independent**: Each test should be able to run independently
5. **Use Appropriate Wait Strategies**: Use `waitFor` and custom wait utilities for async operations

## Examples

### Testing a Complete Workflow
```typescript
it('should complete server creation workflow', async () => {
  const { user, getByRole, getByLabelText } = renderIntegration(<App />)
  
  // Navigate to server creation
  const createButton = getByRole('button', { name: /create server/i })
  await user.click(createButton)
  
  // Fill form and submit
  await user.type(getByLabelText(/server name/i), 'Test Server')
  await user.click(getByRole('button', { name: /create/i }))
  
  // Wait for API call and verify result
  await waitForApiCall(vi.mocked(apiService.createServer))
  expect(getByText(/server created successfully/i)).toBeInTheDocument()
})
```

### Testing Real-time Features
```typescript
it('should handle real-time updates', async () => {
  const { getByText } = renderIntegration(<App />)
  
  // Simulate WebSocket event
  websocketService.triggerEvent('server_update', mockData)
  
  // Wait for UI update
  await waitFor(() => {
    expect(getByText(/updated/i)).toBeInTheDocument()
  })
})
```
