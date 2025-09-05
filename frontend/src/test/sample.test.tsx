import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, userEvent } from '../test'
import { setupApiMocks, setupWebSocketMocks, TestDataFactory } from '../test'

// Sample component for testing
const SampleComponent = () => {
  return (
    <div>
      <h1>Test Component</h1>
      <button onClick={() => console.log('Button clicked')}>
        Click Me
      </button>
      <input type="text" placeholder="Enter text" />
    </div>
  )
}

describe('Sample Component Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<SampleComponent />)
    
    expect(screen.getByText('Test Component')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('handles button click', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    
    render(<SampleComponent />)
    
    const button = screen.getByRole('button', { name: 'Click Me' })
    fireEvent.click(button)
    
    expect(consoleSpy).toHaveBeenCalledWith('Button clicked')
    
    consoleSpy.mockRestore()
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<SampleComponent />)
    
    const input = screen.getByPlaceholderText('Enter text')
    await user.type(input, 'Hello World')
    
    expect(input).toHaveValue('Hello World')
  })
})

describe('Test Utilities Examples', () => {
  it('creates test data using factories', () => {
    const user = TestDataFactory.user({ username: 'testuser' })
    const server = TestDataFactory.server({ server_name: 'Test Server' })
    const users = TestDataFactory.users(3)
    
    expect(user.username).toBe('testuser')
    expect(server.server_name).toBe('Test Server')
    expect(users).toHaveLength(3)
    expect(users[0].username).toBe('user1')
  })

  it('sets up API mocks', () => {
    setupApiMocks.loginSuccess()
    setupApiMocks.serversList()
    setupApiMocks.userCreateSuccess()
    
    // Mocks are now configured for testing
    expect(true).toBe(true) // Placeholder assertion
  })

  it('sets up WebSocket mocks', () => {
    setupWebSocketMocks.connectSuccess()
    setupWebSocketMocks.simulateServerStatusUpdate()
    
    // WebSocket mocks are now configured for testing
    expect(true).toBe(true) // Placeholder assertion
  })
})

describe('Async Testing Examples', () => {
  it('waits for async operations', async () => {
    const AsyncComponent = () => {
      const [data, setData] = React.useState<string>('')
      
      React.useEffect(() => {
        setTimeout(() => setData('Loaded'), 100)
      }, [])
      
      return <div>{data || 'Loading...'}</div>
    }
    
    render(<AsyncComponent />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('Loaded')).toBeInTheDocument()
    })
  })
})

describe('Error Handling Examples', () => {
  it('handles errors gracefully', async () => {
    const ErrorComponent = () => {
      const [error, setError] = React.useState<string>('')
      
      const handleError = () => {
        try {
          throw new Error('Something went wrong')
        } catch (e) {
          setError(e.message)
        }
      }
      
      return (
        <div>
          {error && <div role="alert">{error}</div>}
          <button onClick={handleError}>Trigger Error</button>
        </div>
      )
    }
    
    render(<ErrorComponent />)
    
    const button = screen.getByRole('button', { name: 'Trigger Error' })
    fireEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    })
  })
})
