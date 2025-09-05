import { vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Performance testing setup
beforeAll(() => {
  // Mock performance API for testing
  if (!window.performance) {
    window.performance = {
      now: vi.fn(() => Date.now()),
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByType: vi.fn(() => []),
      getEntriesByName: vi.fn(() => []),
      clearMarks: vi.fn(),
      clearMeasures: vi.fn(),
      navigation: {
        type: 0,
        redirectCount: 0
      } as PerformanceNavigation,
      timing: {
        navigationStart: Date.now(),
        unloadEventStart: 0,
        unloadEventEnd: 0,
        redirectStart: 0,
        redirectEnd: 0,
        fetchStart: Date.now(),
        domainLookupStart: Date.now(),
        domainLookupEnd: Date.now(),
        connectStart: Date.now(),
        connectEnd: Date.now(),
        secureConnectionStart: 0,
        requestStart: Date.now(),
        responseStart: Date.now(),
        responseEnd: Date.now(),
        domLoading: Date.now(),
        domInteractive: Date.now(),
        domContentLoadedEventStart: Date.now(),
        domContentLoadedEventEnd: Date.now(),
        domComplete: Date.now(),
        loadEventStart: Date.now(),
        loadEventEnd: Date.now()
      } as PerformanceTiming
    } as Performance
  }

  // Mock ResizeObserver for performance testing
  if (!window.ResizeObserver) {
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  }

  // Mock IntersectionObserver for performance testing
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  }
})

beforeEach(() => {
  // Clear performance marks before each test
  if (window.performance.clearMarks) {
    window.performance.clearMarks()
  }
  if (window.performance.clearMeasures) {
    window.performance.clearMeasures()
  }
})

afterEach(() => {
  // Cleanup after each test
  vi.clearAllTimers()
})

afterAll(() => {
  // Final cleanup
  vi.restoreAllMocks()
})
