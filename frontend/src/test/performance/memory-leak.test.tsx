import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '../utils'
import { MemoryMonitor, PERFORMANCE_THRESHOLDS } from './utils'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Memory Leak Detection Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Force cleanup
    vi.clearAllTimers()
  })

  it('should not leak memory during component mounting and unmounting', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      unmount()
      return true
    }, 100)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
    expect(result.result).toBe(true)
  })

  it('should not leak memory during repeated server list rendering', async () => {
    const serverList = Array.from({ length: 50 }, (_, i) => 
      TestDataFactory.server({ id: i, server_name: `Server ${i}` })
    )
    
    vi.mocked(require('../../services/api').getServers).mockResolvedValue(serverList)

    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      unmount()
      return true
    }, 50)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during WebSocket operations', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      
      // Simulate WebSocket events
      for (let i = 0; i < 100; i++) {
        window.dispatchEvent(new CustomEvent('websocket_message', {
          detail: { type: 'server_update', data: TestDataFactory.serverStatus() }
        }))
      }
      
      unmount()
      return true
    }, 20)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during form interactions', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { getByLabelText, unmount } = render(<App />)
      
      // Simulate form interactions
      const usernameInput = getByLabelText(/username/i)
      const passwordInput = getByLabelText(/password/i)
      
      for (let i = 0; i < 50; i++) {
        usernameInput.focus()
        passwordInput.focus()
      }
      
      unmount()
      return true
    }, 30)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during navigation', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { getByRole, unmount } = render(<App />)
      
      // Simulate navigation
      const adminButton = getByRole('button', { name: /admin/i })
      
      for (let i = 0; i < 20; i++) {
        adminButton.click()
      }
      
      unmount()
      return true
    }, 25)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during API calls', async () => {
    const mockResponse = TestDataFactory.server()
    vi.mocked(require('../../services/api').getServer).mockResolvedValue(mockResponse)

    const result = await MemoryMonitor.measureMemoryLeak(async () => {
      const { unmount } = render(<App />)
      
      // Simulate API calls
      for (let i = 0; i < 50; i++) {
        await require('../../services/api').getServer(i)
      }
      
      unmount()
      return true
    }, 20)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during timer operations', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      
      // Simulate timer operations
      const timers: NodeJS.Timeout[] = []
      for (let i = 0; i < 100; i++) {
        const timer = setTimeout(() => {}, 1000)
        timers.push(timer)
      }
      
      // Clear timers
      timers.forEach(timer => clearTimeout(timer))
      
      unmount()
      return true
    }, 30)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during event listener operations', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      
      // Simulate event listener operations
      const listeners: Array<() => void> = []
      for (let i = 0; i < 100; i++) {
        const listener = () => {}
        window.addEventListener('test-event', listener)
        listeners.push(listener)
      }
      
      // Remove event listeners
      listeners.forEach(listener => {
        window.removeEventListener('test-event', listener)
      })
      
      unmount()
      return true
    }, 25)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during large data processing', async () => {
    const largeData = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      data: `Large data item ${i}`,
      timestamp: Date.now()
    }))

    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      
      // Process large data
      const processed = largeData.map(item => ({
        ...item,
        processed: true,
        hash: JSON.stringify(item).length
      }))
      
      // Clear processed data
      processed.length = 0
      
      unmount()
      return true
    }, 20)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should not leak memory during animation operations', async () => {
    const result = await MemoryMonitor.measureMemoryLeak(() => {
      const { unmount } = render(<App />)
      
      // Simulate animation operations
      const animations: number[] = []
      for (let i = 0; i < 100; i++) {
        const animationId = requestAnimationFrame(() => {})
        animations.push(animationId)
      }
      
      // Cancel animations
      animations.forEach(id => cancelAnimationFrame(id))
      
      unmount()
      return true
    }, 25)

    // Verify no significant memory leak
    expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should monitor memory usage during long-running operations', async () => {
    const initialMemory = MemoryMonitor.getMemoryUsage()
    
    // Perform long-running operation
    const { unmount } = render(<App />)
    
    // Simulate long-running operation
    for (let i = 0; i < 1000; i++) {
      // Simulate work
      const data = new Array(1000).fill(0).map((_, j) => j)
      data.length = 0 // Clear array
    }
    
    unmount()
    
    const finalMemory = MemoryMonitor.getMemoryUsage()
    
    if (initialMemory && finalMemory) {
      const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
      
      // Verify memory usage is reasonable
      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
    }
  })
})
