import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { setupApiMocks } from '../mocks/api'
import { setupWebSocketMocks } from '../mocks/websocket'

// Global integration test setup
beforeAll(() => {
  // Setup API mocks for integration tests
  setupApiMocks()
  
  // Setup WebSocket mocks for integration tests
  setupWebSocketMocks()
})

beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
  
  // Reset localStorage and sessionStorage
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  // Cleanup after each test
  vi.clearAllTimers()
})

afterAll(() => {
  // Final cleanup
  vi.restoreAllMocks()
})
