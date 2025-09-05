import { performanceMonitor, bugDetector } from './bug-detection'

// Performance Stability Manager
export class PerformanceStabilityManager {
  private static instance: PerformanceStabilityManager
  private performanceHistory: Map<string, number[]> = new Map()
  private stabilityThresholds: Map<string, { min: number; max: number; tolerance: number }> = new Map()
  private isMonitoring = false
  private monitoringInterval: number | null = null

  private constructor() {
    this.setupStabilityThresholds()
  }

  public static getInstance(): PerformanceStabilityManager {
    if (!PerformanceStabilityManager.instance) {
      PerformanceStabilityManager.instance = new PerformanceStabilityManager()
    }
    return PerformanceStabilityManager.instance
  }

  // Setup stability thresholds
  private setupStabilityThresholds(): void {
    this.stabilityThresholds.set('render_time', { min: 8, max: 16, tolerance: 0.2 })
    this.stabilityThresholds.set('memory_usage', { min: 0, max: 100 * 1024 * 1024, tolerance: 0.3 })
    this.stabilityThresholds.set('api_response_time', { min: 0, max: 1000, tolerance: 0.5 })
    this.stabilityThresholds.set('component_mount_time', { min: 0, max: 100, tolerance: 0.3 })
    this.stabilityThresholds.set('bundle_size', { min: 0, max: 2 * 1024 * 1024, tolerance: 0.1 })
  }

  // Start performance monitoring
  public startMonitoring(interval = 5000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.checkPerformanceStability()
    }, interval)

    console.log('Performance stability monitoring started')
  }

  // Stop performance monitoring
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('Performance stability monitoring stopped')
  }

  // Record performance metric
  public recordMetric(name: string, value: number): void {
    if (!this.performanceHistory.has(name)) {
      this.performanceHistory.set(name, [])
    }

    const history = this.performanceHistory.get(name)!
    history.push(value)

    // Keep only last 100 measurements
    if (history.length > 100) {
      history.shift()
    }

    // Check stability
    this.checkMetricStability(name, value)
  }

  // Check metric stability
  private checkMetricStability(name: string, value: number): void {
    const threshold = this.stabilityThresholds.get(name)
    if (!threshold) return

    const history = this.performanceHistory.get(name)
    if (!history || history.length < 10) return

    // Calculate stability metrics
    const average = history.reduce((sum, val) => sum + val, 0) / history.length
    const variance = history.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / history.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = standardDeviation / average

    // Check if performance is stable
    if (coefficientOfVariation > threshold.tolerance) {
      this.reportInstability(name, {
        value,
        average,
        standardDeviation,
        coefficientOfVariation,
        threshold: threshold.tolerance,
      })
    }

    // Check if performance is within acceptable range
    if (value < threshold.min || value > threshold.max) {
      this.reportOutOfRange(name, {
        value,
        min: threshold.min,
        max: threshold.max,
      })
    }
  }

  // Check overall performance stability
  private checkPerformanceStability(): void {
    const metrics = performanceMonitor.getMetrics()
    
    for (const [name, metric] of Object.entries(metrics)) {
      this.recordMetric(name, metric.current)
    }

    // Check memory usage
    if ('memory' in performance) {
      const memory = (performance as any).memory
      this.recordMetric('memory_usage', memory.usedJSHeapSize)
    }
  }

  // Report performance instability
  private reportInstability(name: string, details: any): void {
    const appError = {
      code: 'PERFORMANCE_INSTABILITY',
      message: `Performance instability detected for ${name}`,
      details: JSON.stringify(details),
      timestamp: new Date(),
      context: {
        type: 'performance_instability',
        metric: name,
        ...details,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Report performance out of range
  private reportOutOfRange(name: string, details: any): void {
    const appError = {
      code: 'PERFORMANCE_OUT_OF_RANGE',
      message: `Performance out of acceptable range for ${name}`,
      details: JSON.stringify(details),
      timestamp: new Date(),
      context: {
        type: 'performance_out_of_range',
        metric: name,
        ...details,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Get performance stability report
  public getStabilityReport(): {
    isStable: boolean
    metrics: Record<string, {
      current: number
      average: number
      stability: number
      threshold: number
      isStable: boolean
    }>
    overallStability: number
  } {
    const metrics: Record<string, any> = {}
    let totalStability = 0
    let metricCount = 0

    for (const [name, history] of this.performanceHistory.entries()) {
      if (history.length < 10) continue

      const threshold = this.stabilityThresholds.get(name)
      if (!threshold) continue

      const current = history[history.length - 1]
      const average = history.reduce((sum, val) => sum + val, 0) / history.length
      const variance = history.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / history.length
      const standardDeviation = Math.sqrt(variance)
      const coefficientOfVariation = standardDeviation / average
      const stability = Math.max(0, 1 - coefficientOfVariation / threshold.tolerance)
      const isStable = stability > 0.8

      metrics[name] = {
        current,
        average,
        stability,
        threshold: threshold.tolerance,
        isStable,
      }

      totalStability += stability
      metricCount++
    }

    const overallStability = metricCount > 0 ? totalStability / metricCount : 1
    const isStable = overallStability > 0.8

    return {
      isStable,
      metrics,
      overallStability,
    }
  }

  // Get performance trends
  public getPerformanceTrends(): Record<string, {
    trend: 'improving' | 'stable' | 'degrading'
    change: number
    confidence: number
  }> {
    const trends: Record<string, any> = {}

    for (const [name, history] of this.performanceHistory.entries()) {
      if (history.length < 20) continue

      const recent = history.slice(-10)
      const older = history.slice(-20, -10)

      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
      const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length

      const change = (recentAvg - olderAvg) / olderAvg
      const confidence = Math.min(1, history.length / 50)

      let trend: 'improving' | 'stable' | 'degrading'
      if (change > 0.1) {
        trend = 'degrading'
      } else if (change < -0.1) {
        trend = 'improving'
      } else {
        trend = 'stable'
      }

      trends[name] = {
        trend,
        change,
        confidence,
      }
    }

    return trends
  }
}

// Performance Profiler
export class PerformanceProfiler {
  private static instance: PerformanceProfiler
  private profiles: Map<string, { start: number; end?: number; duration?: number }> = new Map()
  private isProfiling = false

  private constructor() {}

  public static getInstance(): PerformanceProfiler {
    if (!PerformanceProfiler.instance) {
      PerformanceProfiler.instance = new PerformanceProfiler()
    }
    return PerformanceProfiler.instance
  }

  // Start profiling
  public startProfile(name: string): void {
    this.profiles.set(name, { start: performance.now() })
  }

  // End profiling
  public endProfile(name: string): number | null {
    const profile = this.profiles.get(name)
    if (!profile) return null

    const end = performance.now()
    const duration = end - profile.start

    this.profiles.set(name, { ...profile, end, duration })

    // Record metric
    const stabilityManager = PerformanceStabilityManager.getInstance()
    stabilityManager.recordMetric(name, duration)

    return duration
  }

  // Get profile results
  public getProfileResults(): Record<string, number> {
    const results: Record<string, number> = {}
    
    for (const [name, profile] of this.profiles.entries()) {
      if (profile.duration !== undefined) {
        results[name] = profile.duration
      }
    }

    return results
  }

  // Clear profiles
  public clearProfiles(): void {
    this.profiles.clear()
  }
}

// Performance Optimizer
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer
  private optimizations: Map<string, () => void> = new Map()
  private isOptimizing = false

  private constructor() {
    this.setupOptimizations()
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer()
    }
    return PerformanceOptimizer.instance
  }

  // Setup optimizations
  private setupOptimizations(): void {
    this.optimizations.set('memory_cleanup', () => {
      // Force garbage collection if available
      if ('gc' in window) {
        (window as any).gc()
      }
    })

    this.optimizations.set('dom_cleanup', () => {
      // Remove unused DOM elements
      const unusedElements = document.querySelectorAll('[data-unused="true"]')
      unusedElements.forEach(el => el.remove())
    })

    this.optimizations.set('event_listener_cleanup', () => {
      // Clean up orphaned event listeners
      const elements = document.querySelectorAll('*')
      elements.forEach(el => {
        // This is a simplified check - in reality, you'd need more sophisticated tracking
        if (el.getAttribute('data-cleanup') === 'true') {
          el.remove()
        }
      })
    })
  }

  // Run optimization
  public runOptimization(name: string): void {
    const optimization = this.optimizations.get(name)
    if (optimization) {
      try {
        optimization()
        console.log(`Performance optimization '${name}' completed`)
      } catch (error) {
        console.error(`Performance optimization '${name}' failed:`, error)
      }
    }
  }

  // Run all optimizations
  public runAllOptimizations(): void {
    if (this.isOptimizing) return

    this.isOptimizing = true
    
    for (const [name, optimization] of this.optimizations.entries()) {
      try {
        optimization()
        console.log(`Performance optimization '${name}' completed`)
      } catch (error) {
        console.error(`Performance optimization '${name}' failed:`, error)
      }
    }

    this.isOptimizing = false
  }

  // Add custom optimization
  public addOptimization(name: string, optimization: () => void): void {
    this.optimizations.set(name, optimization)
  }

  // Remove optimization
  public removeOptimization(name: string): void {
    this.optimizations.delete(name)
  }
}

// Performance Throttler
export class PerformanceThrottler {
  private static instance: PerformanceThrottler
  private throttledFunctions: Map<string, { lastCall: number; timeoutId: number | null }> = new Map()

  private constructor() {}

  public static getInstance(): PerformanceThrottler {
    if (!PerformanceThrottler.instance) {
      PerformanceThrottler.instance = new PerformanceThrottler()
    }
    return PerformanceThrottler.instance
  }

  // Throttle function
  public throttle<T extends (...args: any[]) => any>(
    name: string,
    func: T,
    delay: number
  ): T {
    return ((...args: Parameters<T>) => {
      const now = Date.now()
      const throttled = this.throttledFunctions.get(name)

      if (!throttled || now - throttled.lastCall >= delay) {
        if (throttled?.timeoutId) {
          clearTimeout(throttled.timeoutId)
        }

        throttled.lastCall = now
        this.throttledFunctions.set(name, { lastCall: now, timeoutId: null })
        return func(...args)
      } else {
        // Schedule delayed execution
        if (throttled.timeoutId) {
          clearTimeout(throttled.timeoutId)
        }

        const timeoutId = setTimeout(() => {
          throttled.lastCall = Date.now()
          func(...args)
        }, delay - (now - throttled.lastCall))

        this.throttledFunctions.set(name, { ...throttled, timeoutId })
      }
    }) as T
  }

  // Debounce function
  public debounce<T extends (...args: any[]) => any>(
    name: string,
    func: T,
    delay: number
  ): T {
    return ((...args: Parameters<T>) => {
      const throttled = this.throttledFunctions.get(name)

      if (throttled?.timeoutId) {
        clearTimeout(throttled.timeoutId)
      }

      const timeoutId = setTimeout(() => {
        func(...args)
        this.throttledFunctions.delete(name)
      }, delay)

      this.throttledFunctions.set(name, { lastCall: Date.now(), timeoutId })
    }) as T
  }

  // Clear throttled function
  public clearThrottled(name: string): void {
    const throttled = this.throttledFunctions.get(name)
    if (throttled?.timeoutId) {
      clearTimeout(throttled.timeoutId)
    }
    this.throttledFunctions.delete(name)
  }

  // Clear all throttled functions
  public clearAll(): void {
    for (const throttled of this.throttledFunctions.values()) {
      if (throttled.timeoutId) {
        clearTimeout(throttled.timeoutId)
      }
    }
    this.throttledFunctions.clear()
  }
}

// Export singleton instances
export const performanceStabilityManager = PerformanceStabilityManager.getInstance()
export const performanceProfiler = PerformanceProfiler.getInstance()
export const performanceOptimizer = PerformanceOptimizer.getInstance()
export const performanceThrottler = PerformanceThrottler.getInstance()

// Initialize performance stability
export const initializePerformanceStability = (): void => {
  performanceStabilityManager.startMonitoring()
  
  // Run optimizations periodically
  setInterval(() => {
    performanceOptimizer.runAllOptimizations()
  }, 60000) // Every minute
}
