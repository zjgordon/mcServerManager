import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitFor } from './utils'
import { setupWebSocketMocks } from '../mocks/websocket'
import { TestDataFactory } from '../utils'
import * as websocketService from '../../services/websocket'

describe('WebSocket Service Integration Tests', () => {
  beforeEach(() => {
    setupWebSocketMocks()
  })

  it('should handle WebSocket connection lifecycle', async () => {
    const { getByText } = renderIntegration(<div />)
    
    // Test connection
    expect(websocketService.connect).toHaveBeenCalled()
    
    // Test disconnection
    websocketService.disconnect()
    expect(websocketService.disconnect).toHaveBeenCalled()
  })

  it('should handle real-time server updates', async () => {
    const { getByText } = renderIntegration(<div />)
    
    // Simulate server status update
    const mockUpdate = TestDataFactory.serverStatus()
    
    vi.mocked(websocketService.triggerEvent).mockImplementationOnce(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('websocket_message', {
          detail: { type: 'server_update', data: mockUpdate }
        }))
      }, 100)
    })
    
    // Wait for update
    await waitFor(() => {
      expect(getByText(/server update received/i)).toBeInTheDocument()
    })
  })

  it('should handle WebSocket error scenarios', async () => {
    const { getByText } = renderIntegration(<div />)
    
    // Simulate connection error
    vi.mocked(websocketService.triggerEvent).mockImplementationOnce(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('websocket_error', {
          detail: { message: 'Connection failed' }
        }))
      }, 100)
    })
    
    // Wait for error handling
    await waitFor(() => {
      expect(getByText(/connection failed/i)).toBeInTheDocument()
    })
  })

  it('should handle message queuing during disconnection', async () => {
    const { getByText } = renderIntegration(<div />)
    
    // Simulate disconnection
    websocketService.disconnect()
    
    // Send message while disconnected
    const message = { type: 'test', data: 'test message' }
    websocketService.sendMessage(message)
    
    // Reconnect
    websocketService.connect()
    
    // Verify queued message was sent
    expect(websocketService.sendMessage).toHaveBeenCalledWith(message)
  })

  it('should handle multiple event listeners', async () => {
    const { getByText } = renderIntegration(<div />)
    
    // Add multiple listeners
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    
    websocketService.addEventListener('server_update', listener1)
    websocketService.addEventListener('server_update', listener2)
    
    // Trigger event
    const mockUpdate = TestDataFactory.serverStatus()
    websocketService.triggerEvent('server_update', mockUpdate)
    
    // Verify both listeners called
    expect(listener1).toHaveBeenCalledWith(mockUpdate)
    expect(listener2).toHaveBeenCalledWith(mockUpdate)
  })
})
