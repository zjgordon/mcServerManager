import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitForApiCall } from './utils'
import { setupApiMocks } from '../mocks/api'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    setupApiMocks()
  })

  it('should complete full login flow', async () => {
    const { user, getByLabelText, getByRole, queryByText } = renderIntegration(<App />)
    
    // Navigate to login
    const usernameInput = getByLabelText(/username/i)
    const passwordInput = getByLabelText(/password/i)
    const loginButton = getByRole('button', { name: /login/i })
    
    // Fill login form
    await user.type(usernameInput, 'testuser')
    await user.type(passwordInput, 'password123')
    await user.click(loginButton)
    
    // Wait for API call
    await waitForApiCall(vi.mocked(require('../../services/api').login))
    
    // Verify successful login
    expect(queryByText(/dashboard/i)).toBeInTheDocument()
  })

  it('should handle login failure and show error', async () => {
    const { user, getByLabelText, getByRole, getByText } = renderIntegration(<App />)
    
    // Mock login failure
    vi.mocked(require('../../services/api').login).mockRejectedValueOnce(
      new Error('Invalid credentials')
    )
    
    const usernameInput = getByLabelText(/username/i)
    const passwordInput = getByLabelText(/password/i)
    const loginButton = getByRole('button', { name: /login/i })
    
    await user.type(usernameInput, 'wronguser')
    await user.type(passwordInput, 'wrongpass')
    await user.click(loginButton)
    
    // Verify error message
    expect(getByText(/invalid credentials/i)).toBeInTheDocument()
  })

  it('should handle logout flow', async () => {
    const { user, getByRole, queryByText } = renderIntegration(<App />, {
      withAuth: true
    })
    
    // Mock authenticated state
    vi.mocked(require('../../services/api').getCurrentUser).mockResolvedValueOnce(
      TestDataFactory.user()
    )
    
    // Find and click logout button
    const logoutButton = getByRole('button', { name: /logout/i })
    await user.click(logoutButton)
    
    // Verify redirect to login
    expect(queryByText(/login/i)).toBeInTheDocument()
  })
})
