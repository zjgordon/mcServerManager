import { vi } from 'vitest'
import { createMockUser, createMockServer, createMockSystemStats } from '../utils'

// Mock API responses
export const mockApiResponses = {
  // Authentication
  login: {
    success: {
      user: createMockUser(),
      message: 'Login successful'
    },
    error: {
      error: 'Invalid credentials'
    }
  },
  
  logout: {
    success: {
      message: 'Logout successful'
    }
  },
  
  getCurrentUser: {
    success: createMockUser(),
    error: {
      error: 'User not found'
    }
  },
  
  getAuthStatus: {
    success: {
      authenticated: true,
      user: createMockUser()
    },
    error: {
      authenticated: false,
      error: 'Not authenticated'
    }
  },
  
  // Server management
  servers: {
    list: [createMockServer()],
    create: createMockServer({ id: 2, server_name: 'New Server' }),
    update: createMockServer({ server_name: 'Updated Server' }),
    delete: { message: 'Server deleted successfully' },
    start: { message: 'Server started successfully' },
    stop: { message: 'Server stopped successfully' },
    status: {
      serverId: 1,
      status: 'Running',
      pid: 12345,
      memoryUsage: 512,
      cpuUsage: 15.5,
      uptime: 3600
    }
  },
  
  // User management
  users: {
    list: [createMockUser()],
    create: createMockUser({ id: 2, username: 'newuser' }),
    update: createMockUser({ username: 'updateduser' }),
    delete: { message: 'User deleted successfully' }
  },
  
  // System management
  system: {
    config: {
      max_memory_per_server: 2048,
      max_servers_per_user: 5,
      default_server_memory: 1024
    },
    stats: createMockSystemStats()
  }
}

// Mock API service implementation
export const createMockApiService = () => ({
  // Authentication methods
  login: vi.fn().mockResolvedValue(mockApiResponses.login.success),
  logout: vi.fn().mockResolvedValue(mockApiResponses.logout.success),
  getCurrentUser: vi.fn().mockResolvedValue(mockApiResponses.getCurrentUser.success),
  getAuthStatus: vi.fn().mockResolvedValue(mockApiResponses.getAuthStatus.success),
  
  // Server management methods
  getServers: vi.fn().mockResolvedValue(mockApiResponses.servers.list),
  createServer: vi.fn().mockResolvedValue(mockApiResponses.servers.create),
  updateServer: vi.fn().mockResolvedValue(mockApiResponses.servers.update),
  deleteServer: vi.fn().mockResolvedValue(mockApiResponses.servers.delete),
  startServer: vi.fn().mockResolvedValue(mockApiResponses.servers.start),
  stopServer: vi.fn().mockResolvedValue(mockApiResponses.servers.stop),
  getServerStatus: vi.fn().mockResolvedValue(mockApiResponses.servers.status),
  
  // User management methods
  getUsers: vi.fn().mockResolvedValue(mockApiResponses.users.list),
  createUser: vi.fn().mockResolvedValue(mockApiResponses.users.create),
  updateUser: vi.fn().mockResolvedValue(mockApiResponses.users.update),
  deleteUser: vi.fn().mockResolvedValue(mockApiResponses.users.delete),
  
  // System management methods
  getSystemConfig: vi.fn().mockResolvedValue(mockApiResponses.system.config),
  updateSystemConfig: vi.fn().mockResolvedValue(mockApiResponses.system.config),
  getSystemStats: vi.fn().mockResolvedValue(mockApiResponses.system.stats),
})

// Mock API service instance
export const mockApiService = createMockApiService()

// Mock fetch responses
export const mockFetchResponses = {
  success: (data: any) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  }),
  
  error: (status: number = 400, message: string = 'Bad Request') => ({
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ error: message }),
    text: vi.fn().mockResolvedValue(JSON.stringify({ error: message })),
  }),
  
  networkError: () => {
    const error = new Error('Network error')
    error.name = 'TypeError'
    throw error
  }
}

// Mock fetch implementation
export const mockFetch = vi.fn()

// Setup default fetch mock
beforeEach(() => {
  mockFetch.mockImplementation((url: string, options?: RequestInit) => {
    // Default to success response
    return Promise.resolve(mockFetchResponses.success({}))
  })
})

// Global fetch mock
global.fetch = mockFetch

// Helper functions for setting up API mocks
export const setupApiMocks = {
  // Authentication mocks
  loginSuccess: () => {
    mockApiService.login.mockResolvedValue(mockApiResponses.login.success)
  },
  
  loginError: () => {
    mockApiService.login.mockRejectedValue(new Error('Invalid credentials'))
  },
  
  // Server mocks
  serversList: (servers = mockApiResponses.servers.list) => {
    mockApiService.getServers.mockResolvedValue(servers)
  },
  
  serverCreateSuccess: () => {
    mockApiService.createServer.mockResolvedValue(mockApiResponses.servers.create)
  },
  
  serverCreateError: () => {
    mockApiService.createServer.mockRejectedValue(new Error('Server creation failed'))
  },
  
  serverStartSuccess: () => {
    mockApiService.startServer.mockResolvedValue(mockApiResponses.servers.start)
  },
  
  serverStopSuccess: () => {
    mockApiService.stopServer.mockResolvedValue(mockApiResponses.servers.stop)
  },
  
  // User mocks
  usersList: (users = mockApiResponses.users.list) => {
    mockApiService.getUsers.mockResolvedValue(users)
  },
  
  userCreateSuccess: () => {
    mockApiService.createUser.mockResolvedValue(mockApiResponses.users.create)
  },
  
  userCreateError: () => {
    mockApiService.createUser.mockRejectedValue(new Error('User creation failed'))
  },
  
  // System mocks
  systemStats: (stats = mockApiResponses.system.stats) => {
    mockApiService.getSystemStats.mockResolvedValue(stats)
  },
  
  systemConfig: (config = mockApiResponses.system.config) => {
    mockApiService.getSystemConfig.mockResolvedValue(config)
  },
}

// Reset all mocks
export const resetApiMocks = () => {
  Object.values(mockApiService).forEach(mock => {
    if (vi.isMockFunction(mock)) {
      mock.mockReset()
    }
  })
  mockFetch.mockReset()
}

// Export the mock service for use in tests
export default mockApiService
