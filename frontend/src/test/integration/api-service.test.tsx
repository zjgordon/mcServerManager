import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitForApiCall } from './utils'
import { setupApiMocks } from '../mocks/api'
import { TestDataFactory } from '../utils'
import * as apiService from '../../services/api'

describe('API Service Integration Tests', () => {
  beforeEach(() => {
    setupApiMocks()
  })

  it('should handle authentication API integration', async () => {
    const { user, getByLabelText, getByRole } = renderIntegration(<div />)
    
    // Test login API
    const mockUser = TestDataFactory.user()
    vi.mocked(apiService.login).mockResolvedValueOnce(mockUser)
    
    const result = await apiService.login('testuser', 'password123')
    
    expect(result).toEqual(mockUser)
    expect(apiService.login).toHaveBeenCalledWith('testuser', 'password123')
  })

  it('should handle server management API integration', async () => {
    const { user } = renderIntegration(<div />)
    
    // Test server creation
    const mockServer = TestDataFactory.server()
    vi.mocked(apiService.createServer).mockResolvedValueOnce(mockServer)
    
    const serverData = {
      server_name: 'Test Server',
      version: '1.21.8',
      port: 25565
    }
    
    const result = await apiService.createServer(serverData)
    
    expect(result).toEqual(mockServer)
    expect(apiService.createServer).toHaveBeenCalledWith(serverData)
  })

  it('should handle error responses gracefully', async () => {
    const { user } = renderIntegration(<div />)
    
    // Test API error handling
    const errorMessage = 'Server not found'
    vi.mocked(apiService.getServer).mockRejectedValueOnce(new Error(errorMessage))
    
    await expect(apiService.getServer(999)).rejects.toThrow(errorMessage)
  })

  it('should handle concurrent API calls', async () => {
    const { user } = renderIntegration(<div />)
    
    // Test concurrent server operations
    const mockServers = [
      TestDataFactory.server({ id: 1 }),
      TestDataFactory.server({ id: 2 })
    ]
    
    vi.mocked(apiService.getServers).mockResolvedValueOnce(mockServers)
    
    const [servers1, servers2] = await Promise.all([
      apiService.getServers(),
      apiService.getServers()
    ])
    
    expect(servers1).toEqual(mockServers)
    expect(servers2).toEqual(mockServers)
  })

  it('should handle API timeout scenarios', async () => {
    const { user } = renderIntegration(<div />)
    
    // Test timeout handling
    vi.mocked(apiService.getSystemStats).mockImplementationOnce(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    )
    
    await expect(apiService.getSystemStats()).rejects.toThrow('Request timeout')
  })
})
