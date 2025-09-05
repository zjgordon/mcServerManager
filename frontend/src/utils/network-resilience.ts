import { bugDetector } from './bug-detection'

// Network Resilience Manager
export class NetworkResilienceManager {
  private static instance: NetworkResilienceManager
  private isOnline = navigator.onLine
  private retryQueue: Array<{ id: string; request: () => Promise<any>; retries: number; maxRetries: number }> = []
  private isProcessingQueue = false
  private connectionQuality: 'excellent' | 'good' | 'poor' | 'offline' = 'excellent'
  private lastSuccessfulRequest = Date.now()
  private requestTimeouts: Map<string, number> = new Map()

  private constructor() {
    this.setupNetworkListeners()
    this.startConnectionMonitoring()
  }

  public static getInstance(): NetworkResilienceManager {
    if (!NetworkResilienceManager.instance) {
      NetworkResilienceManager.instance = new NetworkResilienceManager()
    }
    return NetworkResilienceManager.instance
  }

  // Setup network event listeners
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.connectionQuality = 'excellent'
      this.processRetryQueue()
      console.log('Network connection restored')
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.connectionQuality = 'offline'
      console.log('Network connection lost')
    })
  }

  // Start connection monitoring
  private startConnectionMonitoring(): void {
    setInterval(() => {
      this.checkConnectionQuality()
    }, 10000) // Check every 10 seconds
  }

  // Check connection quality
  private checkConnectionQuality(): void {
    if (!this.isOnline) {
      this.connectionQuality = 'offline'
      return
    }

    // Test connection quality with a small request
    this.testConnectionQuality()
  }

  // Test connection quality
  private async testConnectionQuality(): Promise<void> {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/v1/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      const endTime = Date.now()
      const responseTime = endTime - startTime

      if (response.ok) {
        this.lastSuccessfulRequest = Date.now()
        
        if (responseTime < 500) {
          this.connectionQuality = 'excellent'
        } else if (responseTime < 2000) {
          this.connectionQuality = 'good'
        } else {
          this.connectionQuality = 'poor'
        }
      } else {
        this.connectionQuality = 'poor'
      }
    } catch (error) {
      this.connectionQuality = 'poor'
      
      // If we haven't had a successful request in a while, mark as offline
      if (Date.now() - this.lastSuccessfulRequest > 30000) { // 30 seconds
        this.connectionQuality = 'offline'
      }
    }
  }

  // Make resilient request
  public async makeResilientRequest<T>(
    requestFn: () => Promise<T>,
    options: {
      maxRetries?: number
      retryDelay?: number
      timeout?: number
      id?: string
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 10000,
      id = Math.random().toString(36).substr(2, 9)
    } = options

    // If offline, queue the request
    if (!this.isOnline) {
      return this.queueRequest(id, requestFn, maxRetries)
    }

    // If connection quality is poor, reduce timeout
    const adjustedTimeout = this.connectionQuality === 'poor' ? timeout * 2 : timeout

    try {
      const result = await this.executeRequest(requestFn, adjustedTimeout, id)
      return result
    } catch (error) {
      // If request failed and we have retries left, retry
      if (maxRetries > 0) {
        await this.delay(retryDelay)
        return this.makeResilientRequest(requestFn, {
          ...options,
          maxRetries: maxRetries - 1,
          retryDelay: retryDelay * 2, // Exponential backoff
        })
      }

      // If all retries failed, queue the request
      return this.queueRequest(id, requestFn, maxRetries)
    }
  }

  // Execute request with timeout
  private async executeRequest<T>(
    requestFn: () => Promise<T>,
    timeout: number,
    id: string
  ): Promise<T> {
    const timeoutId = setTimeout(() => {
      this.requestTimeouts.set(id, Date.now())
    }, timeout)

    try {
      const result = await requestFn()
      clearTimeout(timeoutId)
      this.requestTimeouts.delete(id)
      return result
    } catch (error) {
      clearTimeout(timeoutId)
      this.requestTimeouts.delete(id)
      throw error
    }
  }

  // Queue request for retry
  private async queueRequest<T>(
    id: string,
    requestFn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.retryQueue.push({
        id,
        request: async () => {
          try {
            const result = await requestFn()
            resolve(result)
            return result
          } catch (error) {
            reject(error)
            throw error
          }
        },
        retries: 0,
        maxRetries,
      })

      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processRetryQueue()
      }
    })
  }

  // Process retry queue
  private async processRetryQueue(): Promise<void> {
    if (this.isProcessingQueue || this.retryQueue.length === 0) return

    this.isProcessingQueue = true

    while (this.retryQueue.length > 0 && this.isOnline) {
      const item = this.retryQueue.shift()!
      
      try {
        await item.request()
        // Request succeeded, remove from queue
      } catch (error) {
        // Request failed, retry if we have retries left
        if (item.retries < item.maxRetries) {
          item.retries++
          this.retryQueue.push(item)
          
          // Wait before retrying
          await this.delay(1000 * Math.pow(2, item.retries)) // Exponential backoff
        } else {
          // Max retries reached, report error
          this.reportNetworkError(item.id, error)
        }
      }
    }

    this.isProcessingQueue = false
  }

  // Report network error
  private reportNetworkError(id: string, error: any): void {
    const appError = {
      code: 'NETWORK_ERROR',
      message: `Network request failed after retries: ${id}`,
      details: error.message || 'Unknown network error',
      timestamp: new Date(),
      context: {
        type: 'network_error',
        requestId: id,
        connectionQuality: this.connectionQuality,
        isOnline: this.isOnline,
        queueLength: this.retryQueue.length,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Delay utility
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Get network status
  public getNetworkStatus(): {
    isOnline: boolean
    connectionQuality: string
    queueLength: number
    lastSuccessfulRequest: number
    isProcessingQueue: boolean
  } {
    return {
      isOnline: this.isOnline,
      connectionQuality: this.connectionQuality,
      queueLength: this.retryQueue.length,
      lastSuccessfulRequest: this.lastSuccessfulRequest,
      isProcessingQueue: this.isProcessingQueue,
    }
  }

  // Clear retry queue
  public clearRetryQueue(): void {
    this.retryQueue = []
  }

  // Force retry queue processing
  public forceRetryQueueProcessing(): void {
    if (this.isOnline) {
      this.processRetryQueue()
    }
  }
}

// Offline Storage Manager
export class OfflineStorageManager {
  private static instance: OfflineStorageManager
  private offlineData: Map<string, any> = new Map()
  private syncQueue: Array<{ key: string; data: any; timestamp: number }> = []

  private constructor() {
    this.loadOfflineData()
  }

  public static getInstance(): OfflineStorageManager {
    if (!OfflineStorageManager.instance) {
      OfflineStorageManager.instance = new OfflineStorageManager()
    }
    return OfflineStorageManager.instance
  }

  // Load offline data from localStorage
  private loadOfflineData(): void {
    try {
      const stored = localStorage.getItem('offline_data')
      if (stored) {
        const data = JSON.parse(stored)
        this.offlineData = new Map(Object.entries(data))
      }
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }
  }

  // Save offline data to localStorage
  private saveOfflineData(): void {
    try {
      const data = Object.fromEntries(this.offlineData)
      localStorage.setItem('offline_data', JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save offline data:', error)
    }
  }

  // Store data offline
  public storeOffline(key: string, data: any): void {
    this.offlineData.set(key, {
      data,
      timestamp: Date.now(),
    })
    this.saveOfflineData()
  }

  // Get offline data
  public getOffline(key: string): any {
    const item = this.offlineData.get(key)
    return item ? item.data : null
  }

  // Queue data for sync
  public queueForSync(key: string, data: any): void {
    this.syncQueue.push({
      key,
      data,
      timestamp: Date.now(),
    })
  }

  // Sync queued data
  public async syncQueuedData(): Promise<void> {
    if (this.syncQueue.length === 0) return

    const networkManager = NetworkResilienceManager.getInstance()
    const items = this.syncQueue.splice(0, 10) // Process 10 items at a time

    for (const item of items) {
      try {
        await networkManager.makeResilientRequest(
          () => fetch(`/api/v1/sync/${item.key}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(item.data),
          })
        )
        
        // Remove from offline storage after successful sync
        this.offlineData.delete(item.key)
      } catch (error) {
        console.error(`Failed to sync ${item.key}:`, error)
        // Re-queue the item
        this.syncQueue.push(item)
      }
    }

    this.saveOfflineData()
  }

  // Get offline data keys
  public getOfflineKeys(): string[] {
    return Array.from(this.offlineData.keys())
  }

  // Clear offline data
  public clearOfflineData(): void {
    this.offlineData.clear()
    this.syncQueue = []
    localStorage.removeItem('offline_data')
  }

  // Get sync queue status
  public getSyncQueueStatus(): {
    queueLength: number
    oldestItem: number | null
  } {
    return {
      queueLength: this.syncQueue.length,
      oldestItem: this.syncQueue.length > 0 ? Math.min(...this.syncQueue.map(item => item.timestamp)) : null,
    }
  }
}

// Connection Quality Monitor
export class ConnectionQualityMonitor {
  private static instance: ConnectionQualityMonitor
  private qualityHistory: Array<{ timestamp: number; quality: string; responseTime: number }> = []
  private maxHistorySize = 100

  private constructor() {}

  public static getInstance(): ConnectionQualityMonitor {
    if (!ConnectionQualityMonitor.instance) {
      ConnectionQualityMonitor.instance = new ConnectionQualityMonitor()
    }
    return ConnectionQualityMonitor.instance
  }

  // Record connection quality
  public recordQuality(quality: string, responseTime: number): void {
    this.qualityHistory.push({
      timestamp: Date.now(),
      quality,
      responseTime,
    })

    // Maintain history size
    if (this.qualityHistory.length > this.maxHistorySize) {
      this.qualityHistory.shift()
    }
  }

  // Get quality trends
  public getQualityTrends(): {
    averageResponseTime: number
    qualityDistribution: Record<string, number>
    trend: 'improving' | 'stable' | 'degrading'
  } {
    if (this.qualityHistory.length === 0) {
      return {
        averageResponseTime: 0,
        qualityDistribution: {},
        trend: 'stable',
      }
    }

    const averageResponseTime = this.qualityHistory.reduce(
      (sum, item) => sum + item.responseTime,
      0
    ) / this.qualityHistory.length

    const qualityDistribution = this.qualityHistory.reduce((acc, item) => {
      acc[item.quality] = (acc[item.quality] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate trend
    const recent = this.qualityHistory.slice(-10)
    const older = this.qualityHistory.slice(-20, -10)

    if (recent.length < 5 || older.length < 5) {
      return {
        averageResponseTime,
        qualityDistribution,
        trend: 'stable',
      }
    }

    const recentAvg = recent.reduce((sum, item) => sum + item.responseTime, 0) / recent.length
    const olderAvg = older.reduce((sum, item) => sum + item.responseTime, 0) / older.length

    const change = (recentAvg - olderAvg) / olderAvg
    let trend: 'improving' | 'stable' | 'degrading'

    if (change > 0.2) {
      trend = 'degrading'
    } else if (change < -0.2) {
      trend = 'improving'
    } else {
      trend = 'stable'
    }

    return {
      averageResponseTime,
      qualityDistribution,
      trend,
    }
  }

  // Get quality history
  public getQualityHistory(): Array<{ timestamp: number; quality: string; responseTime: number }> {
    return [...this.qualityHistory]
  }

  // Clear quality history
  public clearQualityHistory(): void {
    this.qualityHistory = []
  }
}

// Export singleton instances
export const networkResilienceManager = NetworkResilienceManager.getInstance()
export const offlineStorageManager = OfflineStorageManager.getInstance()
export const connectionQualityMonitor = ConnectionQualityMonitor.getInstance()

// Initialize network resilience
export const initializeNetworkResilience = (): void => {
  // Start periodic sync of offline data
  setInterval(() => {
    if (networkResilienceManager.getNetworkStatus().isOnline) {
      offlineStorageManager.syncQueuedData()
    }
  }, 30000) // Every 30 seconds
}
