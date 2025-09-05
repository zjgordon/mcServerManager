import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../utils'
import { PerformanceMonitor, performanceTestHelpers, PERFORMANCE_THRESHOLDS } from './utils'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Performance Benchmarks', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
    vi.clearAllMocks()
  })

  it('should benchmark component rendering performance', async () => {
    const { averageTime, minTime, maxTime } = await performanceTestHelpers.measureRenderTime(
      () => render(<App />),
      10
    )

    // Verify rendering performance
    expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(minTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(maxTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD * 2)
  })

  it('should benchmark server list rendering with large datasets', async () => {
    const largeServerList = Array.from({ length: 100 }, (_, i) => 
      TestDataFactory.server({ id: i, server_name: `Server ${i}` })
    )
    
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce(largeServerList)

    monitor.mark('server-list-start')
    const { container } = render(<App />)
    monitor.mark('server-list-end')
    
    const renderTime = monitor.measure('server-list-render', 'server-list-start', 'server-list-end')

    // Verify large dataset rendering performance
    expect(renderTime).toBeLessThan(100) // 100ms for 100 servers
    expect(container).toBeInTheDocument()
  })

  it('should benchmark form submission performance', async () => {
    const { getByRole, getByLabelText } = render(<App />)
    
    monitor.mark('form-start')
    
    // Fill form
    const usernameInput = getByLabelText(/username/i)
    const passwordInput = getByLabelText(/password/i)
    const submitButton = getByRole('button', { name: /login/i })
    
    await usernameInput.focus()
    await passwordInput.focus()
    await submitButton.click()
    
    monitor.mark('form-end')
    
    const formTime = monitor.measure('form-submission', 'form-start', 'form-end')

    // Verify form submission performance
    expect(formTime).toBeLessThan(50) // 50ms for form submission
  })

  it('should benchmark navigation performance', async () => {
    const { getByRole } = render(<App />)
    
    monitor.mark('navigation-start')
    
    // Navigate to different sections
    const adminButton = getByRole('button', { name: /admin/i })
    await adminButton.click()
    
    monitor.mark('navigation-end')
    
    const navigationTime = monitor.measure('navigation', 'navigation-start', 'navigation-end')

    // Verify navigation performance
    expect(navigationTime).toBeLessThan(100) // 100ms for navigation
  })

  it('should benchmark real-time updates performance', async () => {
    const { container } = render(<App />)
    
    monitor.mark('realtime-start')
    
    // Simulate real-time updates
    for (let i = 0; i < 10; i++) {
      // Simulate WebSocket update
      window.dispatchEvent(new CustomEvent('websocket_message', {
        detail: { type: 'server_update', data: TestDataFactory.serverStatus() }
      }))
    }
    
    monitor.mark('realtime-end')
    
    const realtimeTime = monitor.measure('realtime-updates', 'realtime-start', 'realtime-end')

    // Verify real-time updates performance
    expect(realtimeTime).toBeLessThan(200) // 200ms for 10 updates
    expect(container).toBeInTheDocument()
  })

  it('should benchmark search and filtering performance', async () => {
    const serverList = Array.from({ length: 50 }, (_, i) => 
      TestDataFactory.server({ id: i, server_name: `Server ${i}` })
    )
    
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce(serverList)
    
    const { getByLabelText } = render(<App />)
    
    monitor.mark('search-start')
    
    // Perform search
    const searchInput = getByLabelText(/search/i)
    await searchInput.focus()
    // Simulate typing
    for (let i = 0; i < 5; i++) {
      await searchInput.dispatchEvent(new Event('input'))
    }
    
    monitor.mark('search-end')
    
    const searchTime = monitor.measure('search-filter', 'search-start', 'search-end')

    // Verify search performance
    expect(searchTime).toBeLessThan(100) // 100ms for search
  })

  it('should benchmark memory usage during operations', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize || 0
    
    // Perform memory-intensive operations
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<App />)
      unmount()
    }
    
    const finalMemory = performance.memory?.usedJSHeapSize || 0
    const memoryIncrease = finalMemory - initialMemory

    // Verify memory usage is reasonable
    expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
  })

  it('should benchmark API call performance', async () => {
    monitor.mark('api-start')
    
    // Mock API call
    const mockResponse = TestDataFactory.server()
    vi.mocked(require('../../services/api').getServer).mockResolvedValueOnce(mockResponse)
    
    // Simulate API call
    await require('../../services/api').getServer(1)
    
    monitor.mark('api-end')
    
    const apiTime = monitor.measure('api-call', 'api-start', 'api-end')

    // Verify API call performance
    expect(apiTime).toBeLessThan(100) // 100ms for API call
  })

  it('should benchmark animation performance', async () => {
    const { container } = render(<App />)
    
    monitor.mark('animation-start')
    
    // Simulate animations
    for (let i = 0; i < 10; i++) {
      await performanceTestHelpers.waitForNextFrame()
    }
    
    monitor.mark('animation-end')
    
    const animationTime = monitor.measure('animation', 'animation-start', 'animation-end')

    // Verify animation performance
    expect(animationTime).toBeLessThan(200) // 200ms for 10 frames
    expect(container).toBeInTheDocument()
  })

  it('should benchmark concurrent operations performance', async () => {
    monitor.mark('concurrent-start')
    
    // Simulate concurrent operations
    const promises = Array.from({ length: 10 }, (_, i) => 
      new Promise(resolve => {
        setTimeout(() => resolve(i), 10)
      })
    )
    
    await Promise.all(promises)
    
    monitor.mark('concurrent-end')
    
    const concurrentTime = monitor.measure('concurrent-ops', 'concurrent-start', 'concurrent-end')

    // Verify concurrent operations performance
    expect(concurrentTime).toBeLessThan(100) // 100ms for 10 concurrent ops
  })
})
