import { vi } from 'vitest'

// Performance testing utilities
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number> = new Map()

  mark(name: string): void {
    const timestamp = performance.now()
    this.marks.set(name, timestamp)
    if (window.performance.mark) {
      window.performance.mark(name)
    }
  }

  measure(name: string, startMark?: string, endMark?: string): number {
    const startTime = startMark ? this.marks.get(startMark) : 0
    const endTime = endMark ? this.marks.get(endMark) : performance.now()
    
    if (startTime === undefined) {
      throw new Error(`Start mark "${startMark}" not found`)
    }
    
    const duration = endTime - startTime
    this.measures.set(name, duration)
    
    if (window.performance.measure) {
      window.performance.measure(name, startMark, endMark)
    }
    
    return duration
  }

  getMeasure(name: string): number | undefined {
    return this.measures.get(name)
  }

  getAllMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures)
  }

  clear(): void {
    this.marks.clear()
    this.measures.clear()
  }
}

// Core Web Vitals testing utilities
export class CoreWebVitals {
  static measureLCP(): Promise<number> {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        resolve(lastEntry.startTime)
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      
      // Fallback timeout
      setTimeout(() => resolve(0), 5000)
    })
  }

  static measureFID(): Promise<number> {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const firstEntry = entries[0]
        resolve(firstEntry.processingStart - firstEntry.startTime)
      })
      
      observer.observe({ entryTypes: ['first-input'] })
      
      // Fallback timeout
      setTimeout(() => resolve(0), 5000)
    })
  }

  static measureCLS(): Promise<number> {
    return new Promise((resolve) => {
      let clsValue = 0
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
        resolve(clsValue)
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
      
      // Fallback timeout
      setTimeout(() => resolve(clsValue), 5000)
    })
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  static getMemoryUsage(): {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  } | null {
    if ('memory' in performance) {
      return (performance as any).memory
    }
    return null
  }

  static measureMemoryLeak<T>(
    fn: () => T,
    iterations: number = 100
  ): Promise<{
    initialMemory: number
    finalMemory: number
    memoryIncrease: number
    result: T
  }> {
    return new Promise((resolve) => {
      const initialMemory = this.getMemoryUsage()?.usedJSHeapSize || 0
      
      let result: T
      for (let i = 0; i < iterations; i++) {
        result = fn()
      }
      
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc()
      }
      
      setTimeout(() => {
        const finalMemory = this.getMemoryUsage()?.usedJSHeapSize || 0
        resolve({
          initialMemory,
          finalMemory,
          memoryIncrease: finalMemory - initialMemory,
          result: result!
        })
      }, 100)
    })
  }
}

// Bundle size analysis utilities
export class BundleAnalyzer {
  static analyzeBundleSize(): {
    totalSize: number
    chunkSizes: Record<string, number>
    largestChunks: Array<{ name: string; size: number }>
  } {
    // Mock bundle analysis for testing
    const mockChunks = {
      'main': 500000,
      'vendor': 800000,
      'components': 300000,
      'utils': 100000
    }
    
    const totalSize = Object.values(mockChunks).reduce((sum, size) => sum + size, 0)
    const largestChunks = Object.entries(mockChunks)
      .map(([name, size]) => ({ name, size }))
      .sort((a, b) => b.size - a.size)
    
    return {
      totalSize,
      chunkSizes: mockChunks,
      largestChunks
    }
  }
}

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  LCP: 2500, // ms
  FID: 100,  // ms
  CLS: 0.1,  // score
  FCP: 1800, // ms
  TTI: 3800, // ms
  TBT: 200,  // ms
  MEMORY_LEAK_THRESHOLD: 1024 * 1024, // 1MB
  BUNDLE_SIZE_THRESHOLD: 1024 * 1024 * 2, // 2MB
  RENDER_TIME_THRESHOLD: 16, // ms (60fps)
} as const

// Performance test helpers
export const performanceTestHelpers = {
  waitForNextFrame: (): Promise<void> => {
    return new Promise(resolve => requestAnimationFrame(resolve))
  },

  measureRenderTime: async <T>(
    renderFn: () => T,
    iterations: number = 10
  ): Promise<{ averageTime: number; minTime: number; maxTime: number }> {
    const times: number[] = []
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      renderFn()
      await this.waitForNextFrame()
      const end = performance.now()
      times.push(end - start)
    }
    
    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times)
    }
  },

  simulateSlowNetwork: (delay: number = 1000): void => {
    vi.useFakeTimers()
    vi.advanceTimersByTime(delay)
  },

  restoreNetwork: (): void => {
    vi.useRealTimers()
  }
}
