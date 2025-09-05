import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../utils'
import { PerformanceMonitor, performanceTestHelpers, PERFORMANCE_THRESHOLDS } from './utils'
import { TestDataFactory } from '../utils'
import App from '../../App'

describe('Rendering Performance Tests', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
    vi.clearAllMocks()
  })

  it('should render main app within performance threshold', async () => {
    monitor.mark('app-render-start')
    const { container } = render(<App />)
    monitor.mark('app-render-end')
    
    const renderTime = monitor.measure('app-render', 'app-render-start', 'app-render-end')

    // Verify main app rendering performance
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(container).toBeInTheDocument()
  })

  it('should render server list efficiently with many items', async () => {
    const serverList = Array.from({ length: 100 }, (_, i) => 
      TestDataFactory.server({ id: i, server_name: `Server ${i}` })
    )
    
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce(serverList)

    monitor.mark('server-list-start')
    const { container } = render(<App />)
    monitor.mark('server-list-end')
    
    const renderTime = monitor.measure('server-list-render', 'server-list-start', 'server-list-end')

    // Verify server list rendering performance
    expect(renderTime).toBeLessThan(100) // 100ms for 100 servers
    expect(container).toBeInTheDocument()
  })

  it('should render forms efficiently', async () => {
    monitor.mark('form-render-start')
    const { getByLabelText } = render(<App />)
    monitor.mark('form-render-end')
    
    const renderTime = monitor.measure('form-render', 'form-render-start', 'form-render-end')

    // Verify form rendering performance
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(getByLabelText(/username/i)).toBeInTheDocument()
  })

  it('should render admin panels efficiently', async () => {
    monitor.mark('admin-render-start')
    const { getByRole } = render(<App />)
    monitor.mark('admin-render-end')
    
    const renderTime = monitor.measure('admin-render', 'admin-render-start', 'admin-render-end')

    // Verify admin panel rendering performance
    expect(renderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(getByRole('button', { name: /admin/i })).toBeInTheDocument()
  })

  it('should handle rapid re-renders efficiently', async () => {
    const { rerender } = render(<App />)
    
    monitor.mark('rerender-start')
    
    // Simulate rapid re-renders
    for (let i = 0; i < 10; i++) {
      rerender(<App />)
    }
    
    monitor.mark('rerender-end')
    
    const rerenderTime = monitor.measure('rapid-rerender', 'rerender-start', 'rerender-end')

    // Verify rapid re-render performance
    expect(rerenderTime).toBeLessThan(200) // 200ms for 10 re-renders
  })

  it('should render with different data efficiently', async () => {
    const serverVariations = [
      TestDataFactory.server({ status: 'Running' }),
      TestDataFactory.server({ status: 'Stopped' }),
      TestDataFactory.server({ status: 'Starting' }),
      TestDataFactory.server({ status: 'Stopping' })
    ]

    monitor.mark('variation-render-start')
    
    // Render with different server statuses
    for (const server of serverVariations) {
      vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce([server])
      const { unmount } = render(<App />)
      unmount()
    }
    
    monitor.mark('variation-render-end')
    
    const variationTime = monitor.measure('variation-render', 'variation-render-start', 'variation-render-end')

    // Verify variation rendering performance
    expect(variationTime).toBeLessThan(300) // 300ms for 4 variations
  })

  it('should render with empty states efficiently', async () => {
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce([])

    monitor.mark('empty-render-start')
    const { container } = render(<App />)
    monitor.mark('empty-render-end')
    
    const emptyRenderTime = monitor.measure('empty-render', 'empty-render-start', 'empty-render-end')

    // Verify empty state rendering performance
    expect(emptyRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(container).toBeInTheDocument()
  })

  it('should render with error states efficiently', async () => {
    vi.mocked(require('../../services/api').getServers).mockRejectedValueOnce(new Error('API Error'))

    monitor.mark('error-render-start')
    const { container } = render(<App />)
    monitor.mark('error-render-end')
    
    const errorRenderTime = monitor.measure('error-render', 'error-render-start', 'error-render-end')

    // Verify error state rendering performance
    expect(errorRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(container).toBeInTheDocument()
  })

  it('should render with loading states efficiently', async () => {
    // Mock slow API response
    vi.mocked(require('../../services/api').getServers).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 1000))
    )

    monitor.mark('loading-render-start')
    const { container } = render(<App />)
    monitor.mark('loading-render-end')
    
    const loadingRenderTime = monitor.measure('loading-render', 'loading-render-start', 'loading-render-end')

    // Verify loading state rendering performance
    expect(loadingRenderTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
    expect(container).toBeInTheDocument()
  })

  it('should handle concurrent rendering efficiently', async () => {
    monitor.mark('concurrent-render-start')
    
    // Simulate concurrent rendering
    const renderPromises = Array.from({ length: 5 }, () => 
      new Promise(resolve => {
        const { unmount } = render(<App />)
        setTimeout(() => {
          unmount()
          resolve(true)
        }, 10)
      })
    )
    
    await Promise.all(renderPromises)
    
    monitor.mark('concurrent-render-end')
    
    const concurrentTime = monitor.measure('concurrent-render', 'concurrent-render-start', 'concurrent-render-end')

    // Verify concurrent rendering performance
    expect(concurrentTime).toBeLessThan(200) // 200ms for 5 concurrent renders
  })

  it('should maintain performance with complex nested components', async () => {
    const complexData = {
      servers: Array.from({ length: 50 }, (_, i) => TestDataFactory.server({ id: i })),
      users: Array.from({ length: 20 }, (_, i) => TestDataFactory.user({ id: i })),
      systemStats: TestDataFactory.systemStats()
    }
    
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce(complexData.servers)
    vi.mocked(require('../../services/api').getUsers).mockResolvedValueOnce(complexData.users)
    vi.mocked(require('../../services/api').getSystemStats).mockResolvedValueOnce(complexData.systemStats)

    monitor.mark('complex-render-start')
    const { container } = render(<App />)
    monitor.mark('complex-render-end')
    
    const complexRenderTime = monitor.measure('complex-render', 'complex-render-start', 'complex-render-end')

    // Verify complex rendering performance
    expect(complexRenderTime).toBeLessThan(150) // 150ms for complex data
    expect(container).toBeInTheDocument()
  })

  it('should handle animation rendering efficiently', async () => {
    monitor.mark('animation-render-start')
    const { container } = render(<App />)
    
    // Simulate animation frames
    for (let i = 0; i < 10; i++) {
      await performanceTestHelpers.waitForNextFrame()
    }
    
    monitor.mark('animation-render-end')
    
    const animationTime = monitor.measure('animation-render', 'animation-render-start', 'animation-render-end')

    // Verify animation rendering performance
    expect(animationTime).toBeLessThan(200) // 200ms for 10 animation frames
    expect(container).toBeInTheDocument()
  })

  it('should maintain performance with frequent updates', async () => {
    const { container } = render(<App />)
    
    monitor.mark('updates-start')
    
    // Simulate frequent updates
    for (let i = 0; i < 20; i++) {
      window.dispatchEvent(new CustomEvent('websocket_message', {
        detail: { type: 'server_update', data: TestDataFactory.serverStatus() }
      }))
      await performanceTestHelpers.waitForNextFrame()
    }
    
    monitor.mark('updates-end')
    
    const updatesTime = monitor.measure('frequent-updates', 'updates-start', 'updates-end')

    // Verify frequent updates performance
    expect(updatesTime).toBeLessThan(300) // 300ms for 20 updates
    expect(container).toBeInTheDocument()
  })
})
