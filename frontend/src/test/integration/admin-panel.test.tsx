import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitForApiCall } from './utils'
import { setupApiMocks } from '../mocks/api'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Admin Panel Integration Tests', () => {
  beforeEach(() => {
    setupApiMocks()
  })

  it('should complete user management workflow', async () => {
    const mockUsers = [TestDataFactory.user(), TestDataFactory.user({ id: 2, username: 'user2' })]
    vi.mocked(require('../../services/api').getUsers).mockResolvedValueOnce(mockUsers)
    
    const { user, getByRole, getByText, getByLabelText } = renderIntegration(<App />)
    
    // Navigate to admin panel
    const adminButton = getByRole('button', { name: /admin/i })
    await user.click(adminButton)
    
    // Verify users loaded
    expect(getByText('testuser')).toBeInTheDocument()
    expect(getByText('user2')).toBeInTheDocument()
    
    // Edit user
    const editButton = getByRole('button', { name: /edit user/i })
    await user.click(editButton)
    
    const roleSelect = getByLabelText(/role/i)
    await user.selectOptions(roleSelect, 'admin')
    
    const saveButton = getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').updateUser))
    
    // Verify update
    expect(getByText(/user updated successfully/i)).toBeInTheDocument()
  })

  it('should handle system configuration workflow', async () => {
    const { user, getByRole, getByLabelText, getByText } = renderIntegration(<App />)
    
    // Navigate to system config
    const configButton = getByRole('button', { name: /system config/i })
    await user.click(configButton)
    
    // Update configuration
    const maxServersInput = getByLabelText(/max servers/i)
    await user.clear(maxServersInput)
    await user.type(maxServersInput, '10')
    
    const saveButton = getByRole('button', { name: /save config/i })
    await user.click(saveButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').updateSystemConfig))
    
    // Verify update
    expect(getByText(/configuration updated/i)).toBeInTheDocument()
  })

  it('should handle process management workflow', async () => {
    const { user, getByRole, getByText } = renderIntegration(<App />)
    
    // Navigate to process management
    const processButton = getByRole('button', { name: /process management/i })
    await user.click(processButton)
    
    // Verify system stats
    expect(getByText(/system statistics/i)).toBeInTheDocument()
    
    // Restart system
    const restartButton = getByRole('button', { name: /restart system/i })
    await user.click(restartButton)
    
    // Confirm restart
    const confirmButton = getByRole('button', { name: /confirm restart/i })
    await user.click(confirmButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').restartSystem))
    
    // Verify restart
    expect(getByText(/system restart initiated/i)).toBeInTheDocument()
  })
})
