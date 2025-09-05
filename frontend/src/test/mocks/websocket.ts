import { vi } from 'vitest'

// Mock WebSocket events
export const mockWebSocketEvents = {
  connected: { type: 'connected', timestamp: Date.now() },
  disconnected: { type: 'disconnected', timestamp: Date.now() },
  error: { type: 'error', error: 'Connection failed', timestamp: Date.now() },
  serverStatusUpdate: {
    type: 'server_status_update',
    data: {
      serverId: 1,
      status: 'Running',
      pid: 12345,
      memoryUsage: 512,
      cpuUsage: 15.5,
      uptime: 3600,
    },
    timestamp: Date.now(),
  },
  systemStatsUpdate: {
    type: 'system_stats_update',
    data: {
      totalUsers: 10,
      totalServers: 5,
      runningServers: 3,
      totalMemoryUsage: 2048,
      systemMemoryTotal: 8192,
      systemMemoryUsed: 4096,
      systemCpuUsage: 25.5,
    },
    timestamp: Date.now(),
  },
  alert: {
    type: 'alert',
    data: {
      id: 'alert-1',
      level: 'warning',
      message: 'High memory usage detected',
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  },
}

// Mock WebSocket service implementation
export const createMockWebSocketService = () => {
  const eventListeners: Record<string, Function[]> = {}
  let connected = false
  let connecting = false
  let reconnectAttempts = 0
  let messageQueue: any[] = []

  const service = {
    connected,
    connecting,
    reconnectAttempts,
    messageQueue,

    // Connection methods
    connect: vi.fn().mockImplementation(async () => {
      connecting = true
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 10))
      connected = true
      connecting = false
      reconnectAttempts = 0
      
      // Process queued messages
      messageQueue.forEach(message => {
        service.send(message)
      })
      messageQueue = []
      
      // Emit connected event
      service.emit('connected', mockWebSocketEvents.connected)
      return Promise.resolve()
    }),

    disconnect: vi.fn().mockImplementation(() => {
      connected = false
      connecting = false
      service.emit('disconnected', mockWebSocketEvents.disconnected)
    }),

    // Message methods
    send: vi.fn().mockImplementation((message: any) => {
      if (connected) {
        // Simulate sending message
        return Promise.resolve()
      } else {
        // Queue message for later
        messageQueue.push(message)
        return Promise.resolve()
      }
    }),

    // Subscription methods
    subscribe: vi.fn().mockImplementation((channel: string) => {
      const message = {
        type: 'subscribe',
        channel,
        timestamp: Date.now(),
      }
      return service.send(message)
    }),

    unsubscribe: vi.fn().mockImplementation((channel: string) => {
      const message = {
        type: 'unsubscribe',
        channel,
        timestamp: Date.now(),
      }
      return service.send(message)
    }),

    // Event handling methods
    on: vi.fn().mockImplementation((event: string, callback: Function) => {
      if (!eventListeners[event]) {
        eventListeners[event] = []
      }
      eventListeners[event].push(callback)
    }),

    off: vi.fn().mockImplementation((event: string, callback: Function) => {
      if (eventListeners[event]) {
        const index = eventListeners[event].indexOf(callback)
        if (index > -1) {
          eventListeners[event].splice(index, 1)
        }
      }
    }),

    emit: vi.fn().mockImplementation((event: string, data: any) => {
      if (eventListeners[event]) {
        eventListeners[event].forEach(callback => {
          try {
            callback(data)
          } catch (error) {
            console.error(`Error in WebSocket event listener for ${event}:`, error)
          }
        })
      }
    }),

    // Heartbeat methods
    startHeartbeat: vi.fn().mockImplementation(() => {
      // Mock heartbeat implementation
    }),

    stopHeartbeat: vi.fn().mockImplementation(() => {
      // Mock heartbeat stop implementation
    }),

    // Utility methods
    isConnected: vi.fn().mockImplementation(() => connected),
    isConnecting: vi.fn().mockImplementation(() => connecting),
    getReconnectAttempts: vi.fn().mockImplementation(() => reconnectAttempts),
    getMessageQueueLength: vi.fn().mockImplementation(() => messageQueue.length),
  }

  return service
}

// Mock WebSocket service instance
export const mockWebSocketService = createMockWebSocketService()

// Mock WebSocket factory function
export const mockCreateWebSocketService = vi.fn().mockReturnValue(mockWebSocketService)

// Helper functions for WebSocket testing
export const setupWebSocketMocks = {
  // Connection mocks
  connectSuccess: () => {
    mockWebSocketService.connect.mockResolvedValue(undefined)
  },

  connectError: () => {
    mockWebSocketService.connect.mockRejectedValue(new Error('Connection failed'))
  },

  disconnectSuccess: () => {
    mockWebSocketService.disconnect.mockImplementation(() => {
      mockWebSocketService.connected = false
      mockWebSocketService.emit('disconnected', mockWebSocketEvents.disconnected)
    })
  },

  // Message mocks
  sendSuccess: () => {
    mockWebSocketService.send.mockResolvedValue(undefined)
  },

  sendError: () => {
    mockWebSocketService.send.mockRejectedValue(new Error('Send failed'))
  },

  // Event simulation
  simulateConnected: () => {
    mockWebSocketService.emit('connected', mockWebSocketEvents.connected)
  },

  simulateDisconnected: () => {
    mockWebSocketService.emit('disconnected', mockWebSocketEvents.disconnected)
  },

  simulateError: (error = 'Connection failed') => {
    mockWebSocketService.emit('error', { ...mockWebSocketEvents.error, error })
  },

  simulateServerStatusUpdate: (data = mockWebSocketEvents.serverStatusUpdate.data) => {
    mockWebSocketService.emit('serverStatusUpdate', data)
  },

  simulateSystemStatsUpdate: (data = mockWebSocketEvents.systemStatsUpdate.data) => {
    mockWebSocketService.emit('systemStatsUpdate', data)
  },

  simulateAlert: (data = mockWebSocketEvents.alert.data) => {
    mockWebSocketService.emit('alert', data)
  },

  // Subscription mocks
  subscribeSuccess: () => {
    mockWebSocketService.subscribe.mockResolvedValue(undefined)
  },

  unsubscribeSuccess: () => {
    mockWebSocketService.unsubscribe.mockResolvedValue(undefined)
  },
}

// Mock WebSocket class for testing
export class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null
  public onclose: ((event: CloseEvent) => void) | null = null
  public onmessage: ((event: MessageEvent) => void) | null = null
  public onerror: ((event: Event) => void) | null = null
  public readyState: number = WebSocket.CONNECTING
  public url: string

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  constructor(url: string) {
    this.url = url
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 10)
  }

  send(data: string) {
    // Mock send implementation
  }

  close(code?: number, reason?: string) {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }

  // Helper methods for testing
  simulateOpen() {
    this.readyState = WebSocket.OPEN
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }

  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }))
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage) {
      const messageEvent = new MessageEvent('message', {
        data: typeof data === 'string' ? data : JSON.stringify(data),
      })
      this.onmessage(messageEvent)
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any

// Reset all WebSocket mocks
export const resetWebSocketMocks = () => {
  Object.values(mockWebSocketService).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  mockCreateWebSocketService.mockReset()
}

// Export the mock service for use in tests
export default mockWebSocketService
