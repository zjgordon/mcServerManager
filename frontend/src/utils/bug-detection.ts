import { AppError } from '../types/error'

// Bug Detection and Monitoring System
export class BugDetector {
  private static instance: BugDetector
  private errorQueue: AppError[] = []
  private maxQueueSize = 100
  private isMonitoring = false

  private constructor() {
    this.setupGlobalErrorHandlers()
  }

  public static getInstance(): BugDetector {
    if (!BugDetector.instance) {
      BugDetector.instance = new BugDetector()
    }
    return BugDetector.instance
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    // Unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.captureError({
        code: 'UNHANDLED_ERROR',
        message: event.message,
        details: `File: ${event.filename}, Line: ${event.lineno}, Column: ${event.colno}`,
        timestamp: new Date(),
        context: {
          type: 'javascript_error',
          stack: event.error?.stack,
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
        retryable: false,
      })
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        code: 'UNHANDLED_PROMISE_REJECTION',
        message: event.reason?.message || 'Unhandled promise rejection',
        details: event.reason?.stack || 'No stack trace available',
        timestamp: new Date(),
        context: {
          type: 'promise_rejection',
          reason: event.reason,
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
        retryable: false,
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.captureError({
          code: 'RESOURCE_LOAD_ERROR',
          message: `Failed to load resource: ${(event.target as any)?.src || (event.target as any)?.href}`,
          details: `Element: ${(event.target as any)?.tagName}`,
          timestamp: new Date(),
          context: {
            type: 'resource_error',
            element: event.target,
            userAgent: navigator.userAgent,
            url: window.location.href,
          },
          retryable: true,
        })
      }
    }, true)
  }

  // Capture and log errors
  public captureError(error: AppError): void {
    // Add to queue
    this.errorQueue.push(error)
    
    // Maintain queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift()
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Bug Detected:', error)
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(error)
    }

    // Trigger error reporting if critical
    if (this.isCriticalError(error)) {
      this.reportCriticalError(error)
    }
  }

  // Check if error is critical
  private isCriticalError(error: AppError): boolean {
    const criticalCodes = [
      'UNHANDLED_ERROR',
      'UNHANDLED_PROMISE_REJECTION',
      'MEMORY_LEAK_DETECTED',
      'PERFORMANCE_DEGRADATION',
      'DATA_CORRUPTION',
    ]
    
    return criticalCodes.includes(error.code)
  }

  // Report critical errors
  private reportCriticalError(error: AppError): void {
    // Show user notification
    this.showErrorNotification(error)
    
    // Send to monitoring service
    this.sendToMonitoringService(error)
    
    // Log to console
    console.error('Critical Error Detected:', error)
  }

  // Show error notification to user
  private showErrorNotification(error: AppError): void {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('critical-error', {
      detail: error
    }))
  }

  // Send error to monitoring service
  private sendToMonitoringService(error: AppError): void {
    // In a real application, this would send to services like Sentry, LogRocket, etc.
    fetch('/api/v1/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...error,
        sessionId: this.getSessionId(),
        userId: this.getUserId(),
        timestamp: error.timestamp.toISOString(),
      }),
    }).catch((err) => {
      console.error('Failed to send error to monitoring service:', err)
    })
  }

  // Get session ID
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId')
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('sessionId', sessionId)
    }
    return sessionId
  }

  // Get user ID
  private getUserId(): string | null {
    return localStorage.getItem('userId')
  }

  // Get error statistics
  public getErrorStats(): {
    totalErrors: number
    criticalErrors: number
    recentErrors: AppError[]
    errorTypes: Record<string, number>
  } {
    const recentErrors = this.errorQueue.slice(-10)
    const criticalErrors = this.errorQueue.filter(error => this.isCriticalError(error))
    
    const errorTypes = this.errorQueue.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalErrors: this.errorQueue.length,
      criticalErrors: criticalErrors.length,
      recentErrors,
      errorTypes,
    }
  }

  // Clear error queue
  public clearErrors(): void {
    this.errorQueue = []
  }

  // Start monitoring
  public startMonitoring(): void {
    this.isMonitoring = true
    console.log('Bug detection monitoring started')
  }

  // Stop monitoring
  public stopMonitoring(): void {
    this.isMonitoring = false
    console.log('Bug detection monitoring stopped')
  }

  // Check if monitoring is active
  public isActive(): boolean {
    return this.isMonitoring
  }
}

// Performance Monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  private thresholds: Map<string, number> = new Map()

  private constructor() {
    this.setupPerformanceObservers()
    this.setupThresholds()
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Setup performance observers
  private setupPerformanceObservers(): void {
    // Observe long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.recordMetric('long_tasks', entry.duration)
            this.checkPerformanceThreshold('long_tasks', entry.duration)
          }
        }
      })
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        console.warn('Long task observer not supported')
      }

      // Observe layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ((entry as any).value > 0.1) { // CLS > 0.1
            this.recordMetric('layout_shifts', (entry as any).value)
            this.checkPerformanceThreshold('layout_shifts', (entry as any).value)
          }
        }
      })
      
      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        console.warn('Layout shift observer not supported')
      }
    }
  }

  // Setup performance thresholds
  private setupThresholds(): void {
    this.thresholds.set('long_tasks', 50) // 50ms
    this.thresholds.set('layout_shifts', 0.1) // CLS threshold
    this.thresholds.set('memory_usage', 100 * 1024 * 1024) // 100MB
    this.thresholds.set('render_time', 16) // 16ms (60fps)
  }

  // Record performance metric
  public recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift()
    }
  }

  // Check performance threshold
  private checkPerformanceThreshold(name: string, value: number): void {
    const threshold = this.thresholds.get(name)
    if (threshold && value > threshold) {
      const bugDetector = BugDetector.getInstance()
      bugDetector.captureError({
        code: 'PERFORMANCE_DEGRADATION',
        message: `Performance threshold exceeded for ${name}`,
        details: `Value: ${value}, Threshold: ${threshold}`,
        timestamp: new Date(),
        context: {
          type: 'performance_degradation',
          metric: name,
          value,
          threshold,
        },
        retryable: true,
      })
    }
  }

  // Get performance metrics
  public getMetrics(): Record<string, {
    current: number
    average: number
    max: number
    min: number
    count: number
  }> {
    const result: Record<string, any> = {}
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[name] = {
          current: values[values.length - 1],
          average: values.reduce((a, b) => a + b, 0) / values.length,
          max: Math.max(...values),
          min: Math.min(...values),
          count: values.length,
        }
      }
    }
    
    return result
  }

  // Monitor memory usage
  public monitorMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const usedMB = memory.usedJSHeapSize / 1024 / 1024
      
      this.recordMetric('memory_usage', usedMB)
      this.checkPerformanceThreshold('memory_usage', usedMB)
      
      // Check for memory leaks
      if (usedMB > 200) { // 200MB threshold
        const bugDetector = BugDetector.getInstance()
        bugDetector.captureError({
          code: 'MEMORY_LEAK_DETECTED',
          message: 'High memory usage detected',
          details: `Memory usage: ${usedMB.toFixed(2)}MB`,
          timestamp: new Date(),
          context: {
            type: 'memory_leak',
            memoryUsage: usedMB,
            totalMemory: memory.totalJSHeapSize / 1024 / 1024,
            limit: memory.jsHeapSizeLimit / 1024 / 1024,
          },
          retryable: false,
        })
      }
    }
  }

  // Start memory monitoring
  public startMemoryMonitoring(interval = 30000): void {
    setInterval(() => {
      this.monitorMemoryUsage()
    }, interval)
  }
}

// Memory Leak Detection
export class MemoryLeakDetector {
  private static instance: MemoryLeakDetector
  private componentRefs: Map<string, WeakRef<any>> = new Map()
  private eventListeners: Map<string, Set<() => void>> = new Map()
  private intervals: Map<string, number> = new Map()
  private timeouts: Map<string, number> = new Map()

  private constructor() {
    this.setupCleanup()
  }

  public static getInstance(): MemoryLeakDetector {
    if (!MemoryLeakDetector.instance) {
      MemoryLeakDetector.instance = new MemoryLeakDetector()
    }
    return MemoryLeakDetector.instance
  }

  // Register component reference
  public registerComponent(id: string, component: any): void {
    this.componentRefs.set(id, new WeakRef(component))
  }

  // Register event listener
  public registerEventListener(id: string, cleanup: () => void): void {
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, new Set())
    }
    this.eventListeners.get(id)!.add(cleanup)
  }

  // Register interval
  public registerInterval(id: string, intervalId: number): void {
    this.intervals.set(id, intervalId)
  }

  // Register timeout
  public registerTimeout(id: string, timeoutId: number): void {
    this.timeouts.set(id, timeoutId)
  }

  // Cleanup component
  public cleanupComponent(id: string): void {
    // Cleanup event listeners
    const listeners = this.eventListeners.get(id)
    if (listeners) {
      listeners.forEach(cleanup => cleanup())
      this.eventListeners.delete(id)
    }

    // Cleanup intervals
    const intervalId = this.intervals.get(id)
    if (intervalId) {
      clearInterval(intervalId)
      this.intervals.delete(id)
    }

    // Cleanup timeouts
    const timeoutId = this.timeouts.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      this.timeouts.delete(id)
    }

    // Remove component reference
    this.componentRefs.delete(id)
  }

  // Setup automatic cleanup
  private setupCleanup(): void {
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanupAll()
    })

    // Periodic cleanup check
    setInterval(() => {
      this.checkForLeaks()
    }, 60000) // Check every minute
  }

  // Check for memory leaks
  private checkForLeaks(): void {
    // Check for dead component references
    for (const [id, ref] of this.componentRefs.entries()) {
      if (ref.deref() === undefined) {
        this.cleanupComponent(id)
      }
    }

    // Check for orphaned intervals/timeouts
    const now = Date.now()
    for (const [id, intervalId] of this.intervals.entries()) {
      // This is a simplified check - in reality, you'd need more sophisticated tracking
      if (now - (intervalId as any) > 300000) { // 5 minutes
        clearInterval(intervalId)
        this.intervals.delete(id)
      }
    }
  }

  // Cleanup all resources
  public cleanupAll(): void {
    // Cleanup all event listeners
    for (const listeners of this.eventListeners.values()) {
      listeners.forEach(cleanup => cleanup())
    }
    this.eventListeners.clear()

    // Cleanup all intervals
    for (const intervalId of this.intervals.values()) {
      clearInterval(intervalId)
    }
    this.intervals.clear()

    // Cleanup all timeouts
    for (const timeoutId of this.timeouts.values()) {
      clearTimeout(timeoutId)
    }
    this.timeouts.clear()

    // Clear component references
    this.componentRefs.clear()
  }

  // Get leak statistics
  public getLeakStats(): {
    componentCount: number
    eventListenerCount: number
    intervalCount: number
    timeoutCount: number
  } {
    return {
      componentCount: this.componentRefs.size,
      eventListenerCount: Array.from(this.eventListeners.values()).reduce((sum, set) => sum + set.size, 0),
      intervalCount: this.intervals.size,
      timeoutCount: this.timeouts.size,
    }
  }
}

// Export singleton instances
export const bugDetector = BugDetector.getInstance()
export const performanceMonitor = PerformanceMonitor.getInstance()
export const memoryLeakDetector = MemoryLeakDetector.getInstance()

// Initialize monitoring
export const initializeBugDetection = (): void => {
  bugDetector.startMonitoring()
  performanceMonitor.startMemoryMonitoring()
  
  // Monitor memory usage every 30 seconds
  setInterval(() => {
    performanceMonitor.monitorMemoryUsage()
  }, 30000)
}
