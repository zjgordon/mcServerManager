import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderIntegration, waitFor } from './utils'
import { setupWebSocketMocks } from '../mocks/websocket'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Real-time Features Integration Tests', () => {
  beforeEach(() => {
    setupWebSocketMocks()
  })

  it('should handle real-time server status updates', async () => {
    const { getByText } = renderIntegration(<App />)
    
    // Verify initial connection
    expect(getByText(/connected/i)).toBeInTheDocument()
    
    // Simulate server status update
    const mockStatusUpdate = {
      type: 'server_status_update',
      data: TestDataFactory.serverStatus({ status: 'Running' })
    }
    
    // Trigger WebSocket event
    vi.mocked(require('../../services/websocket').triggerEvent).mockImplementationOnce(() => {
      // Simulate real-time update
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('websocket_message', { 
          detail: mockStatusUpdate 
        }))
      }, 100)
    })
    
    // Wait for status update
    await waitFor(() => {
      expect(getByText(/running/i)).toBeInTheDocument()
    })
  })

  it('should handle real-time alerts', async () => {
    const { getByText, getByRole } = renderIntegration(<App />)
    
    // Simulate alert
    const mockAlert = TestDataFactory.alert({
      type: 'warning',
      message: 'Server memory usage high'
    })
    
    vi.mocked(require('../../services/websocket').triggerEvent).mockImplementationOnce(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('websocket_message', { 
          detail: { type: 'alert', data: mockAlert }
        }))
      }, 100)
    })
    
    // Wait for alert
    await waitFor(() => {
      expect(getByText(/server memory usage high/i)).toBeInTheDocument()
    })
    
    // Dismiss alert
    const dismissButton = getByRole('button', { name: /dismiss/i })
    await dismissButton.click()
    
    // Verify alert dismissed
    expect(getByText(/server memory usage high/i)).not.toBeInTheDocument()
  })

  it('should handle WebSocket connection loss and recovery', async () => {
    const { getByText } = renderIntegration(<App />)
    
    // Simulate connection loss
    vi.mocked(require('../../services/websocket').triggerEvent).mockImplementationOnce(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('websocket_disconnect'))
      }, 100)
    })
    
    // Wait for disconnected state
    await waitFor(() => {
      expect(getByText(/disconnected/i)).toBeInTheDocument()
    })
    
    // Simulate reconnection
    vi.mocked(require('../../services/websocket').triggerEvent).mockImplementationOnce(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('websocket_connect'))
      }, 200)
    })
    
    // Wait for reconnected state
    await waitFor(() => {
      expect(getByText(/connected/i)).toBeInTheDocument()
    })
  })
})
