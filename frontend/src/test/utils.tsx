import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { WebSocketProvider } from '../contexts/WebSocketContext'

// Create a custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  queryClient?: QueryClient
  withAuth?: boolean
  withWebSocket?: boolean
  withRouter?: boolean
}

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
})

const AllTheProviders = ({ 
  children, 
  initialEntries = ['/'],
  queryClient = createTestQueryClient(),
  withAuth = true,
  withWebSocket = true,
  withRouter = true
}: {
  children: React.ReactNode
  initialEntries?: string[]
  queryClient?: QueryClient
  withAuth?: boolean
  withWebSocket?: boolean
  withRouter?: boolean
}) => {
  const content = withAuth ? (
    <AuthProvider>
      {withWebSocket ? (
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      ) : (
        children
      )}
    </AuthProvider>
  ) : (
    children
  )

  const routerContent = withRouter ? (
    <BrowserRouter>
      {content}
    </BrowserRouter>
  ) : (
    content
  )

  return (
    <QueryClientProvider client={queryClient}>
      {routerContent}
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    initialEntries,
    queryClient,
    withAuth,
    withWebSocket,
    withRouter,
    ...renderOptions
  } = options

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders
        initialEntries={initialEntries}
        queryClient={queryClient}
        withAuth={withAuth}
        withWebSocket={withWebSocket}
        withRouter={withRouter}
      >
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }

// Utility functions for testing
export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockServer = (overrides = {}) => ({
  id: 1,
  server_name: 'Test Server',
  version: '1.20.1',
  port: 25565,
  status: 'Stopped',
  pid: null,
  memory_mb: 1024,
  owner_id: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

export const createMockServerStatus = (overrides = {}) => ({
  serverId: 1,
  status: 'Running',
  pid: 12345,
  memoryUsage: 512,
  cpuUsage: 15.5,
  uptime: 3600,
  ...overrides,
})

export const createMockSystemStats = (overrides = {}) => ({
  totalUsers: 10,
  totalServers: 5,
  runningServers: 3,
  totalMemoryUsage: 2048,
  systemMemoryTotal: 8192,
  systemMemoryUsed: 4096,
  systemCpuUsage: 25.5,
  ...overrides,
})

// Mock API responses
export const mockApiResponses = {
  login: {
    success: {
      user: createMockUser(),
      message: 'Login successful'
    },
    error: {
      error: 'Invalid credentials'
    }
  },
  servers: {
    list: [createMockServer()],
    create: createMockServer({ id: 2, server_name: 'New Server' }),
    update: createMockServer({ server_name: 'Updated Server' }),
    delete: { message: 'Server deleted successfully' }
  },
  users: {
    list: [createMockUser()],
    create: createMockUser({ id: 2, username: 'newuser' }),
    update: createMockUser({ username: 'updateduser' }),
    delete: { message: 'User deleted successfully' }
  }
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock router navigation
export const mockNavigate = vi.fn()
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default'
}

// Mock router hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

// Mock toast notifications
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

vi.mock('../hooks/use-toast', () => ({
  useToast: () => mockToast,
}))

// Mock WebSocket service
export const mockWebSocketService = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  connected: false,
  connecting: false,
}

vi.mock('../services/websocket', () => ({
  createWebSocketService: vi.fn(() => mockWebSocketService),
}))

// Mock API service
export const mockApiService = {
  login: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  getAuthStatus: vi.fn(),
  getServers: vi.fn(),
  createServer: vi.fn(),
  updateServer: vi.fn(),
  deleteServer: vi.fn(),
  startServer: vi.fn(),
  stopServer: vi.fn(),
  getServerStatus: vi.fn(),
  getUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getSystemConfig: vi.fn(),
  updateSystemConfig: vi.fn(),
  getSystemStats: vi.fn(),
}

vi.mock('../services/api', () => ({
  apiService: mockApiService,
}))

// Test data factories
export const TestDataFactory = {
  user: createMockUser,
  server: createMockServer,
  serverStatus: createMockServerStatus,
  systemStats: createMockSystemStats,
  
  // Create multiple items
  users: (count: number) => Array.from({ length: count }, (_, i) => 
    createMockUser({ id: i + 1, username: `user${i + 1}` })
  ),
  
  servers: (count: number) => Array.from({ length: count }, (_, i) => 
    createMockServer({ id: i + 1, server_name: `Server ${i + 1}` })
  ),
}

// Custom matchers for testing
export const customMatchers = {
  toBeInTheDocument: expect.toBeInTheDocument,
  toHaveClass: expect.toHaveClass,
  toHaveTextContent: expect.toHaveTextContent,
  toHaveAttribute: expect.toHaveAttribute,
  toHaveValue: expect.toHaveValue,
  toBeChecked: expect.toBeChecked,
  toBeDisabled: expect.toBeDisabled,
  toBeEnabled: expect.toBeEnabled,
  toBeVisible: expect.toBeVisible,
  toBeHidden: expect.toBeHidden,
}

// Export vi for use in tests
export { vi } from 'vitest'
