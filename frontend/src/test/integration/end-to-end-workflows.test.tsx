import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitForApiCall, waitForNavigation } from './utils'
import { setupApiMocks } from '../mocks/api'
import { setupWebSocketMocks } from '../mocks/websocket'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('End-to-End User Workflow Tests', () => {
  beforeEach(() => {
    setupApiMocks()
    setupWebSocketMocks()
  })

  it('should complete full user onboarding workflow', async () => {
    const { user, getByLabelText, getByRole, getByText } = renderIntegration(<App />)
    
    // Step 1: Initial setup
    const setupButton = getByRole('button', { name: /get started/i })
    await user.click(setupButton)
    
    // Step 2: Create admin user
    const usernameInput = getByLabelText(/username/i)
    const emailInput = getByLabelText(/email/i)
    const passwordInput = getByLabelText(/password/i)
    const confirmPasswordInput = getByLabelText(/confirm password/i)
    
    await user.type(usernameInput, 'admin')
    await user.type(emailInput, 'admin@example.com')
    await user.type(passwordInput, 'admin123')
    await user.type(confirmPasswordInput, 'admin123')
    
    const createButton = getByRole('button', { name: /create account/i })
    await user.click(createButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').createUser))
    
    // Step 3: Login
    await user.type(usernameInput, 'admin')
    await user.type(passwordInput, 'admin123')
    
    const loginButton = getByRole('button', { name: /login/i })
    await user.click(loginButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').login))
    
    // Step 4: Verify dashboard access
    expect(getByText(/dashboard/i)).toBeInTheDocument()
  })

  it('should complete server lifecycle management workflow', async () => {
    const { user, getByRole, getByLabelText, getByText } = renderIntegration(<App />)
    
    // Step 1: Create server
    const createButton = getByRole('button', { name: /create server/i })
    await user.click(createButton)
    
    const serverNameInput = getByLabelText(/server name/i)
    const versionSelect = getByLabelText(/version/i)
    const portInput = getByLabelText(/port/i)
    
    await user.type(serverNameInput, 'My Test Server')
    await user.selectOptions(versionSelect, '1.21.8')
    await user.type(portInput, '25565')
    
    const submitButton = getByRole('button', { name: /create/i })
    await user.click(submitButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').createServer))
    
    // Step 2: Start server
    const startButton = getByRole('button', { name: /start/i })
    await user.click(startButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').startServer))
    
    // Step 3: Monitor server
    expect(getByText(/running/i)).toBeInTheDocument()
    
    // Step 4: Stop server
    const stopButton = getByRole('button', { name: /stop/i })
    await user.click(stopButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').stopServer))
    
    // Step 5: Delete server
    const deleteButton = getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    const confirmButton = getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').deleteServer))
    
    // Verify completion
    expect(getByText(/server deleted successfully/i)).toBeInTheDocument()
  })

  it('should complete admin management workflow', async () => {
    const { user, getByRole, getByLabelText, getByText } = renderIntegration(<App />)
    
    // Step 1: Navigate to admin panel
    const adminButton = getByRole('button', { name: /admin/i })
    await user.click(adminButton)
    
    // Step 2: Manage users
    const userManagementButton = getByRole('button', { name: /user management/i })
    await user.click(userManagementButton)
    
    // Step 3: Create new user
    const createUserButton = getByRole('button', { name: /create user/i })
    await user.click(createUserButton)
    
    const usernameInput = getByLabelText(/username/i)
    const emailInput = getByLabelText(/email/i)
    const roleSelect = getByLabelText(/role/i)
    
    await user.type(usernameInput, 'newuser')
    await user.type(emailInput, 'newuser@example.com')
    await user.selectOptions(roleSelect, 'user')
    
    const saveButton = getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').createUser))
    
    // Step 4: Configure system
    const systemConfigButton = getByRole('button', { name: /system config/i })
    await user.click(systemConfigButton)
    
    const maxServersInput = getByLabelText(/max servers/i)
    await user.clear(maxServersInput)
    await user.type(maxServersInput, '20')
    
    const saveConfigButton = getByRole('button', { name: /save config/i })
    await user.click(saveConfigButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').updateSystemConfig))
    
    // Verify completion
    expect(getByText(/configuration updated/i)).toBeInTheDocument()
  })
})
