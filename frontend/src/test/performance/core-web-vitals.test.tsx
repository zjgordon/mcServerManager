import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../utils'
import { CoreWebVitals, PERFORMANCE_THRESHOLDS } from './utils'
import App from '../../App'

describe('Core Web Vitals Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should meet Largest Contentful Paint (LCP) threshold', async () => {
    const { container } = render(<App />)
    
    // Measure LCP
    const lcpTime = await CoreWebVitals.measureLCP()
    
    // Verify LCP is within acceptable range
    expect(lcpTime).toBeLessThan(PERFORMANCE_THRESHOLDS.LCP)
    expect(container).toBeInTheDocument()
  })

  it('should meet First Input Delay (FID) threshold', async () => {
    const { getByRole } = render(<App />)
    
    // Simulate user interaction
    const button = getByRole('button', { name: /login/i })
    
    // Measure FID
    const fidTime = await CoreWebVitals.measureFID()
    
    // Verify FID is within acceptable range
    expect(fidTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FID)
    expect(button).toBeInTheDocument()
  })

  it('should meet Cumulative Layout Shift (CLS) threshold', async () => {
    const { container } = render(<App />)
    
    // Measure CLS
    const clsScore = await CoreWebVitals.measureCLS()
    
    // Verify CLS is within acceptable range
    expect(clsScore).toBeLessThan(PERFORMANCE_THRESHOLDS.CLS)
    expect(container).toBeInTheDocument()
  })

  it('should load main content within First Contentful Paint (FCP) threshold', async () => {
    const startTime = performance.now()
    const { getByText } = render(<App />)
    const endTime = performance.now()
    
    const fcpTime = endTime - startTime
    
    // Verify FCP is within acceptable range
    expect(fcpTime).toBeLessThan(PERFORMANCE_THRESHOLDS.FCP)
    expect(getByText(/minecraft server manager/i)).toBeInTheDocument()
  })

  it('should achieve Time to Interactive (TTI) within threshold', async () => {
    const startTime = performance.now()
    const { getByRole } = render(<App />)
    
    // Wait for interactive elements
    const button = getByRole('button', { name: /login/i })
    const endTime = performance.now()
    
    const ttiTime = endTime - startTime
    
    // Verify TTI is within acceptable range
    expect(ttiTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TTI)
    expect(button).toBeInTheDocument()
  })

  it('should maintain Total Blocking Time (TBT) within threshold', async () => {
    const startTime = performance.now()
    render(<App />)
    
    // Simulate main thread blocking
    await new Promise(resolve => setTimeout(resolve, 50))
    
    const endTime = performance.now()
    const tbtTime = endTime - startTime
    
    // Verify TBT is within acceptable range
    expect(tbtTime).toBeLessThan(PERFORMANCE_THRESHOLDS.TBT)
  })

  it('should handle performance under slow network conditions', async () => {
    // Simulate slow network
    vi.useFakeTimers()
    
    const startTime = performance.now()
    const { container } = render(<App />)
    
    // Advance timers to simulate slow network
    vi.advanceTimersByTime(2000)
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    // Verify app still loads within reasonable time
    expect(loadTime).toBeLessThan(5000)
    expect(container).toBeInTheDocument()
    
    vi.useRealTimers()
  })

  it('should maintain performance with multiple rapid interactions', async () => {
    const { getByRole, getByLabelText } = render(<App />)
    
    const startTime = performance.now()
    
    // Simulate rapid interactions
    for (let i = 0; i < 10; i++) {
      const usernameInput = getByLabelText(/username/i)
      const passwordInput = getByLabelText(/password/i)
      
      // Simulate typing
      usernameInput.focus()
      passwordInput.focus()
    }
    
    const endTime = performance.now()
    const interactionTime = endTime - startTime
    
    // Verify interactions remain responsive
    expect(interactionTime).toBeLessThan(1000)
  })

  it('should handle performance with large datasets', async () => {
    // Mock large dataset
    const largeServerList = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      server_name: `Server ${i}`,
      version: '1.21.8',
      port: 25565 + i,
      status: 'Running',
      memory_mb: 1024,
      owner_id: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))
    
    vi.mocked(require('../../services/api').getServers).mockResolvedValueOnce(largeServerList)
    
    const startTime = performance.now()
    const { container } = render(<App />)
    const endTime = performance.now()
    
    const renderTime = endTime - startTime
    
    // Verify large dataset rendering is still performant
    expect(renderTime).toBeLessThan(2000)
    expect(container).toBeInTheDocument()
  })
})
