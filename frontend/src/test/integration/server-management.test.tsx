import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitForApiCall } from './utils'
import { setupApiMocks } from '../mocks/api'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Server Management Integration Tests', () => {
  beforeEach(() => {
    setupApiMocks()
  })

  it('should complete server creation workflow', async () => {
    const { user, getByRole, getByLabelText, getByText } = renderIntegration(<App />)
    
    // Navigate to server creation
    const createButton = getByRole('button', { name: /create server/i })
    await user.click(createButton)
    
    // Fill server form
    const serverNameInput = getByLabelText(/server name/i)
    const versionSelect = getByLabelText(/version/i)
    const portInput = getByLabelText(/port/i)
    const submitButton = getByRole('button', { name: /create/i })
    
    await user.type(serverNameInput, 'Test Server')
    await user.selectOptions(versionSelect, '1.21.8')
    await user.type(portInput, '25565')
    await user.click(submitButton)
    
    // Wait for API call
    await waitForApiCall(vi.mocked(require('../../services/api').createServer))
    
    // Verify success
    expect(getByText(/server created successfully/i)).toBeInTheDocument()
  })

  it('should handle server start/stop workflow', async () => {
    const mockServer = TestDataFactory.server({ status: 'Stopped' })
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce([mockServer])
    
    const { user, getByRole, getByText } = renderIntegration(<App />)
    
    // Find server card
    const serverCard = getByText(mockServer.server_name)
    expect(serverCard).toBeInTheDocument()
    
    // Start server
    const startButton = getByRole('button', { name: /start/i })
    await user.click(startButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').startServer))
    
    // Verify status change
    expect(getByText(/running/i)).toBeInTheDocument()
  })

  it('should handle server deletion workflow', async () => {
    const mockServer = TestDataFactory.server()
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce([mockServer])
    
    const { user, getByRole, getByText } = renderIntegration(<App />)
    
    // Find delete button
    const deleteButton = getByRole('button', { name: /delete/i })
    await user.click(deleteButton)
    
    // Confirm deletion
    const confirmButton = getByRole('button', { name: /confirm/i })
    await user.click(confirmButton)
    
    await waitForApiCall(vi.mocked(require('../../services/api').deleteServer))
    
    // Verify server removed
    expect(getByText(/server deleted successfully/i)).toBeInTheDocument()
  })
})
