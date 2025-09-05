import { bugDetector } from './bug-detection'

// State Management Stability Manager
export class StateManagementStabilityManager {
  private static instance: StateManagementStabilityManager
  private stateHistory: Map<string, Array<{ timestamp: number; state: any; action: string }>> = new Map()
  private stateValidators: Map<string, (state: any) => boolean> = new Map()
  private stateCorruptionDetectors: Map<string, (state: any) => boolean> = new Map()
  private isMonitoring = false
  private monitoringInterval: number | null = null

  private constructor() {
    this.setupDefaultValidators()
    this.setupCorruptionDetectors()
  }

  public static getInstance(): StateManagementStabilityManager {
    if (!StateManagementStabilityManager.instance) {
      StateManagementStabilityManager.instance = new StateManagementStabilityManager()
    }
    return StateManagementStabilityManager.instance
  }

  // Setup default validators
  private setupDefaultValidators(): void {
    // Auth state validator
    this.stateValidators.set('auth', (state: any) => {
      return (
        state &&
        typeof state.isAuthenticated === 'boolean' &&
        (state.user === null || (state.user && typeof state.user.id === 'number'))
      )
    })

    // Server state validator
    this.stateValidators.set('servers', (state: any) => {
      return (
        state &&
        Array.isArray(state.servers) &&
        state.servers.every((server: any) => 
          server && 
          typeof server.id === 'number' && 
          typeof server.server_name === 'string'
        )
      )
    })

    // UI state validator
    this.stateValidators.set('ui', (state: any) => {
      return (
        state &&
        typeof state.loading === 'boolean' &&
        typeof state.error === 'boolean'
      )
    })
  }

  // Setup corruption detectors
  private setupCorruptionDetectors(): void {
    // Auth state corruption detector
    this.stateCorruptionDetectors.set('auth', (state: any) => {
      return (
        state.isAuthenticated === true && state.user === null
      ) || (
        state.isAuthenticated === false && state.user !== null
      )
    })

    // Server state corruption detector
    this.stateCorruptionDetectors.set('servers', (state: any) => {
      return (
        state.servers && 
        state.servers.some((server: any) => 
          !server || 
          typeof server.id !== 'number' || 
          typeof server.server_name !== 'string'
        )
      )
    })

    // UI state corruption detector
    this.stateCorruptionDetectors.set('ui', (state: any) => {
      return (
        typeof state.loading !== 'boolean' ||
        typeof state.error !== 'boolean'
      )
    }
  }

  // Start state monitoring
  public startMonitoring(interval = 5000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.checkStateStability()
    }, interval)

    console.log('State management stability monitoring started')
  }

  // Stop state monitoring
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('State management stability monitoring stopped')
  }

  // Record state change
  public recordStateChange(stateKey: string, state: any, action: string): void {
    if (!this.stateHistory.has(stateKey)) {
      this.stateHistory.set(stateKey, [])
    }

    const history = this.stateHistory.get(stateKey)!
    history.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      action,
    })

    // Keep only last 50 state changes
    if (history.length > 50) {
      history.shift()
    }

    // Validate state
    this.validateState(stateKey, state, action)
  }

  // Validate state
  private validateState(stateKey: string, state: any, action: string): void {
    const validator = this.stateValidators.get(stateKey)
    if (!validator) return

    try {
      const isValid = validator(state)
      if (!isValid) {
        this.reportStateValidationError(stateKey, state, action)
      }
    } catch (error) {
      this.reportStateValidationError(stateKey, state, action, error)
    }
  }

  // Check state stability
  private checkStateStability(): void {
    for (const [stateKey, history] of this.stateHistory.entries()) {
      if (history.length < 10) continue

      // Check for state corruption
      const corruptionDetector = this.stateCorruptionDetectors.get(stateKey)
      if (corruptionDetector) {
        const currentState = history[history.length - 1].state
        if (corruptionDetector(currentState)) {
          this.reportStateCorruption(stateKey, currentState)
        }
      }

      // Check for rapid state changes
      this.checkRapidStateChanges(stateKey, history)
    }
  }

  // Check for rapid state changes
  private checkRapidStateChanges(stateKey: string, history: Array<{ timestamp: number; state: any; action: string }>): void {
    const recent = history.slice(-10)
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    const recentChanges = recent.filter(change => change.timestamp > oneMinuteAgo)
    
    if (recentChanges.length > 20) { // More than 20 changes per minute
      this.reportRapidStateChanges(stateKey, recentChanges.length)
    }
  }

  // Report state validation error
  private reportStateValidationError(stateKey: string, state: any, action: string, error?: any): void {
    const appError = {
      code: 'STATE_VALIDATION_ERROR',
      message: `State validation failed for ${stateKey}`,
      details: `Action: ${action}, Error: ${error?.message || 'Invalid state'}`,
      timestamp: new Date(),
      context: {
        type: 'state_validation_error',
        stateKey,
        action,
        state,
        error: error?.message,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Report state corruption
  private reportStateCorruption(stateKey: string, state: any): void {
    const appError = {
      code: 'STATE_CORRUPTION',
      message: `State corruption detected for ${stateKey}`,
      details: `Corrupted state: ${JSON.stringify(state)}`,
      timestamp: new Date(),
      context: {
        type: 'state_corruption',
        stateKey,
        state,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Report rapid state changes
  private reportRapidStateChanges(stateKey: string, changeCount: number): void {
    const appError = {
      code: 'RAPID_STATE_CHANGES',
      message: `Rapid state changes detected for ${stateKey}`,
      details: `${changeCount} changes in the last minute`,
      timestamp: new Date(),
      context: {
        type: 'rapid_state_changes',
        stateKey,
        changeCount,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Add state validator
  public addStateValidator(stateKey: string, validator: (state: any) => boolean): void {
    this.stateValidators.set(stateKey, validator)
  }

  // Add corruption detector
  public addCorruptionDetector(stateKey: string, detector: (state: any) => boolean): void {
    this.stateCorruptionDetectors.set(stateKey, detector)
  }

  // Get state stability report
  public getStateStabilityReport(): {
    isStable: boolean
    stateKeys: string[]
    corruptionCount: number
    validationErrorCount: number
    rapidChangeCount: number
  } {
    let corruptionCount = 0
    let validationErrorCount = 0
    let rapidChangeCount = 0

    for (const [stateKey, history] of this.stateHistory.entries()) {
      if (history.length < 10) continue

      // Check for corruption
      const corruptionDetector = this.stateCorruptionDetectors.get(stateKey)
      if (corruptionDetector) {
        const currentState = history[history.length - 1].state
        if (corruptionDetector(currentState)) {
          corruptionCount++
        }
      }

      // Check for rapid changes
      const recent = history.slice(-10)
      const now = Date.now()
      const oneMinuteAgo = now - 60000
      const recentChanges = recent.filter(change => change.timestamp > oneMinuteAgo)
      
      if (recentChanges.length > 20) {
        rapidChangeCount++
      }
    }

    return {
      isStable: corruptionCount === 0 && validationErrorCount === 0 && rapidChangeCount === 0,
      stateKeys: Array.from(this.stateHistory.keys()),
      corruptionCount,
      validationErrorCount,
      rapidChangeCount,
    }
  }

  // Get state history
  public getStateHistory(stateKey: string): Array<{ timestamp: number; state: any; action: string }> {
    return this.stateHistory.get(stateKey) || []
  }

  // Clear state history
  public clearStateHistory(stateKey?: string): void {
    if (stateKey) {
      this.stateHistory.delete(stateKey)
    } else {
      this.stateHistory.clear()
    }
  }
}

// State Recovery Manager
export class StateRecoveryManager {
  private static instance: StateRecoveryManager
  private stateSnapshots: Map<string, Array<{ timestamp: number; state: any }>> = new Map()
  private maxSnapshots = 10

  private constructor() {}

  public static getInstance(): StateRecoveryManager {
    if (!StateRecoveryManager.instance) {
      StateRecoveryManager.instance = new StateRecoveryManager()
    }
    return StateRecoveryManager.instance
  }

  // Create state snapshot
  public createSnapshot(stateKey: string, state: any): void {
    if (!this.stateSnapshots.has(stateKey)) {
      this.stateSnapshots.set(stateKey, [])
    }

    const snapshots = this.stateSnapshots.get(stateKey)!
    snapshots.push({
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)), // Deep clone
    })

    // Keep only last N snapshots
    if (snapshots.length > this.maxSnapshots) {
      snapshots.shift()
    }
  }

  // Recover state from snapshot
  public recoverState(stateKey: string, snapshotIndex?: number): any | null {
    const snapshots = this.stateSnapshots.get(stateKey)
    if (!snapshots || snapshots.length === 0) return null

    const index = snapshotIndex !== undefined ? snapshotIndex : snapshots.length - 1
    const snapshot = snapshots[index]
    
    if (!snapshot) return null

    return JSON.parse(JSON.stringify(snapshot.state)) // Deep clone
  }

  // Get available snapshots
  public getAvailableSnapshots(stateKey: string): Array<{ index: number; timestamp: number }> {
    const snapshots = this.stateSnapshots.get(stateKey)
    if (!snapshots) return []

    return snapshots.map((snapshot, index) => ({
      index,
      timestamp: snapshot.timestamp,
    }))
  }

  // Clear snapshots
  public clearSnapshots(stateKey?: string): void {
    if (stateKey) {
      this.stateSnapshots.delete(stateKey)
    } else {
      this.stateSnapshots.clear()
    }
  }
}

// State Consistency Checker
export class StateConsistencyChecker {
  private static instance: StateConsistencyChecker
  private consistencyRules: Map<string, (state1: any, state2: any) => boolean> = new Map()

  private constructor() {
    this.setupConsistencyRules()
  }

  public static getInstance(): StateConsistencyChecker {
    if (!StateConsistencyChecker.instance) {
      StateConsistencyChecker.instance = new StateConsistencyChecker()
    }
    return StateConsistencyChecker.instance
  }

  // Setup consistency rules
  private setupConsistencyRules(): void {
    // Auth state consistency
    this.consistencyRules.set('auth', (state1: any, state2: any) => {
      return state1.isAuthenticated === state2.isAuthenticated &&
             state1.user?.id === state2.user?.id
    })

    // Server state consistency
    this.consistencyRules.set('servers', (state1: any, state2: any) => {
      if (state1.servers.length !== state2.servers.length) return false
      
      return state1.servers.every((server1: any) => 
        state2.servers.some((server2: any) => 
          server1.id === server2.id && 
          server1.server_name === server2.server_name
        )
      )
    })
  }

  // Check state consistency
  public checkConsistency(stateKey: string, state1: any, state2: any): boolean {
    const rule = this.consistencyRules.get(stateKey)
    if (!rule) return true

    try {
      return rule(state1, state2)
    } catch (error) {
      console.error(`Consistency check failed for ${stateKey}:`, error)
      return false
    }
  }

  // Add consistency rule
  public addConsistencyRule(stateKey: string, rule: (state1: any, state2: any) => boolean): void {
    this.consistencyRules.set(stateKey, rule)
  }

  // Remove consistency rule
  public removeConsistencyRule(stateKey: string): void {
    this.consistencyRules.delete(stateKey)
  }
}

// State Performance Monitor
export class StatePerformanceMonitor {
  private static instance: StatePerformanceMonitor
  private performanceMetrics: Map<string, Array<{ timestamp: number; duration: number; action: string }>> = new Map()

  private constructor() {}

  public static getInstance(): StatePerformanceMonitor {
    if (!StatePerformanceMonitor.instance) {
      StatePerformanceMonitor.instance = new StatePerformanceMonitor()
    }
    return StatePerformanceMonitor.instance
  }

  // Record state update performance
  public recordStateUpdate(stateKey: string, action: string, duration: number): void {
    if (!this.performanceMetrics.has(stateKey)) {
      this.performanceMetrics.set(stateKey, [])
    }

    const metrics = this.performanceMetrics.get(stateKey)!
    metrics.push({
      timestamp: Date.now(),
      duration,
      action,
    })

    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift()
    }

    // Check for performance issues
    if (duration > 100) { // More than 100ms
      this.reportSlowStateUpdate(stateKey, action, duration)
    }
  }

  // Report slow state update
  private reportSlowStateUpdate(stateKey: string, action: string, duration: number): void {
    const appError = {
      code: 'SLOW_STATE_UPDATE',
      message: `Slow state update detected for ${stateKey}`,
      details: `Action: ${action}, Duration: ${duration}ms`,
      timestamp: new Date(),
      context: {
        type: 'slow_state_update',
        stateKey,
        action,
        duration,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Get performance metrics
  public getPerformanceMetrics(stateKey: string): {
    averageDuration: number
    maxDuration: number
    minDuration: number
    slowUpdates: number
  } {
    const metrics = this.performanceMetrics.get(stateKey)
    if (!metrics || metrics.length === 0) {
      return {
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        slowUpdates: 0,
      }
    }

    const durations = metrics.map(m => m.duration)
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length
    const maxDuration = Math.max(...durations)
    const minDuration = Math.min(...durations)
    const slowUpdates = durations.filter(d => d > 100).length

    return {
      averageDuration,
      maxDuration,
      minDuration,
      slowUpdates,
    }
  }

  // Clear performance metrics
  public clearPerformanceMetrics(stateKey?: string): void {
    if (stateKey) {
      this.performanceMetrics.delete(stateKey)
    } else {
      this.performanceMetrics.clear()
    }
  }
}

// Export singleton instances
export const stateManagementStabilityManager = StateManagementStabilityManager.getInstance()
export const stateRecoveryManager = StateRecoveryManager.getInstance()
export const stateConsistencyChecker = StateConsistencyChecker.getInstance()
export const statePerformanceMonitor = StatePerformanceMonitor.getInstance()

// Initialize state management stability
export const initializeStateManagementStability = (): void => {
  stateManagementStabilityManager.startMonitoring()
}
