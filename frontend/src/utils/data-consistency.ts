import { bugDetector } from './bug-detection'

// Data Consistency Manager
export class DataConsistencyManager {
  private static instance: DataConsistencyManager
  private dataValidators: Map<string, (data: any) => boolean> = new Map()
  private dataChecksums: Map<string, string> = new Map()
  private dataVersions: Map<string, number> = new Map()
  private isMonitoring = false
  private monitoringInterval: number | null = null

  private constructor() {
    this.setupDefaultValidators()
  }

  public static getInstance(): DataConsistencyManager {
    if (!DataConsistencyManager.instance) {
      DataConsistencyManager.instance = new DataConsistencyManager()
    }
    return DataConsistencyManager.instance
  }

  // Setup default validators
  private setupDefaultValidators(): void {
    // User data validator
    this.dataValidators.set('user', (data: any) => {
      return (
        data &&
        typeof data.id === 'number' &&
        typeof data.username === 'string' &&
        data.username.length > 0 &&
        typeof data.email === 'string' &&
        data.email.includes('@')
      )
    })

    // Server data validator
    this.dataValidators.set('server', (data: any) => {
      return (
        data &&
        typeof data.id === 'number' &&
        typeof data.server_name === 'string' &&
        data.server_name.length > 0 &&
        typeof data.port === 'number' &&
        data.port > 0 &&
        data.port < 65536 &&
        typeof data.version === 'string' &&
        data.version.length > 0
      )
    })

    // System config validator
    this.dataValidators.set('system_config', (data: any) => {
      return (
        data &&
        typeof data.max_memory === 'number' &&
        data.max_memory > 0 &&
        typeof data.max_servers === 'number' &&
        data.max_servers > 0
      )
    })
  }

  // Start data consistency monitoring
  public startMonitoring(interval = 30000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.checkDataConsistency()
    }, interval)

    console.log('Data consistency monitoring started')
  }

  // Stop data consistency monitoring
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('Data consistency monitoring stopped')
  }

  // Validate data
  public validateData(type: string, data: any): boolean {
    const validator = this.dataValidators.get(type)
    if (!validator) {
      console.warn(`No validator found for data type: ${type}`)
      return true
    }

    try {
      return validator(data)
    } catch (error) {
      console.error(`Data validation error for type ${type}:`, error)
      return false
    }
  }

  // Check data consistency
  public checkDataConsistency(): void {
    // Check localStorage data
    this.checkLocalStorageConsistency()
    
    // Check sessionStorage data
    this.checkSessionStorageConsistency()
    
    // Check memory data
    this.checkMemoryDataConsistency()
  }

  // Check localStorage consistency
  private checkLocalStorageConsistency(): void {
    try {
      const keys = Object.keys(localStorage)
      
      for (const key of keys) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            const type = this.getDataTypeFromKey(key)
            
            if (type && !this.validateData(type, parsed)) {
              this.reportDataCorruption(key, 'localStorage', parsed)
            }
          } catch (error) {
            this.reportDataCorruption(key, 'localStorage', value)
          }
        }
      }
    } catch (error) {
      console.error('Error checking localStorage consistency:', error)
    }
  }

  // Check sessionStorage consistency
  private checkSessionStorageConsistency(): void {
    try {
      const keys = Object.keys(sessionStorage)
      
      for (const key of keys) {
        const value = sessionStorage.getItem(key)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            const type = this.getDataTypeFromKey(key)
            
            if (type && !this.validateData(type, parsed)) {
              this.reportDataCorruption(key, 'sessionStorage', parsed)
            }
          } catch (error) {
            this.reportDataCorruption(key, 'sessionStorage', value)
          }
        }
      }
    } catch (error) {
      console.error('Error checking sessionStorage consistency:', error)
    }
  }

  // Check memory data consistency
  private checkMemoryDataConsistency(): void {
    // This would check in-memory data structures
    // Implementation depends on your data management approach
  }

  // Get data type from key
  private getDataTypeFromKey(key: string): string | null {
    if (key.startsWith('user_')) return 'user'
    if (key.startsWith('server_')) return 'server'
    if (key.startsWith('config_')) return 'system_config'
    return null
  }

  // Report data corruption
  private reportDataCorruption(key: string, storage: string, data: any): void {
    const appError = {
      code: 'DATA_CORRUPTION',
      message: `Data corruption detected in ${storage}`,
      details: `Key: ${key}, Data: ${JSON.stringify(data)}`,
      timestamp: new Date(),
      context: {
        type: 'data_corruption',
        key,
        storage,
        data,
      },
      retryable: true,
    }

    bugDetector.captureError(appError)
  }

  // Calculate data checksum
  public calculateChecksum(data: any): string {
    const str = JSON.stringify(data, Object.keys(data).sort())
    let hash = 0
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString(36)
  }

  // Store data with checksum
  public storeDataWithChecksum(key: string, data: any): void {
    const checksum = this.calculateChecksum(data)
    const version = (this.dataVersions.get(key) || 0) + 1
    
    this.dataChecksums.set(key, checksum)
    this.dataVersions.set(key, version)
    
    localStorage.setItem(key, JSON.stringify(data))
  }

  // Verify data integrity
  public verifyDataIntegrity(key: string, data: any): boolean {
    const storedChecksum = this.dataChecksums.get(key)
    if (!storedChecksum) return true
    
    const currentChecksum = this.calculateChecksum(data)
    return storedChecksum === currentChecksum
  }

  // Add data validator
  public addValidator(type: string, validator: (data: any) => boolean): void {
    this.dataValidators.set(type, validator)
  }

  // Remove data validator
  public removeValidator(type: string): void {
    this.dataValidators.delete(type)
  }

  // Get data consistency report
  public getConsistencyReport(): {
    isConsistent: boolean
    corruptedKeys: string[]
    validatorCount: number
    monitoredKeys: number
  } {
    const corruptedKeys: string[] = []
    
    // Check for corrupted data
    try {
      const keys = Object.keys(localStorage)
      
      for (const key of keys) {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            const parsed = JSON.parse(value)
            const type = this.getDataTypeFromKey(key)
            
            if (type && !this.validateData(type, parsed)) {
              corruptedKeys.push(key)
            }
          } catch (error) {
            corruptedKeys.push(key)
          }
        }
      }
    } catch (error) {
      console.error('Error generating consistency report:', error)
    }

    return {
      isConsistent: corruptedKeys.length === 0,
      corruptedKeys,
      validatorCount: this.dataValidators.size,
      monitoredKeys: this.dataChecksums.size,
    }
  }
}

// Data Synchronization Manager
export class DataSynchronizationManager {
  private static instance: DataSynchronizationManager
  private syncQueue: Array<{ key: string; data: any; timestamp: number }> = []
  private isSyncing = false
  private syncInterval: number | null = null
  private conflictResolvers: Map<string, (local: any, remote: any) => any> = new Map()

  private constructor() {
    this.setupConflictResolvers()
  }

  public static getInstance(): DataSynchronizationManager {
    if (!DataSynchronizationManager.instance) {
      DataSynchronizationManager.instance = new DataSynchronizationManager()
    }
    return DataSynchronizationManager.instance
  }

  // Setup conflict resolvers
  private setupConflictResolvers(): void {
    // User data conflict resolver
    this.conflictResolvers.set('user', (local: any, remote: any) => {
      // Prefer remote data for user information
      return { ...local, ...remote, lastSync: Date.now() }
    })

    // Server data conflict resolver
    this.conflictResolvers.set('server', (local: any, remote: any) => {
      // Merge server configurations
      return { ...local, ...remote, lastSync: Date.now() }
    })

    // System config conflict resolver
    this.conflictResolvers.set('system_config', (local: any, remote: any) => {
      // Prefer local system config
      return { ...local, ...remote, lastSync: Date.now() }
    })
  }

  // Start synchronization
  public startSynchronization(interval = 60000): void {
    if (this.syncInterval) return

    this.syncInterval = setInterval(() => {
      this.synchronizeData()
    }, interval)

    console.log('Data synchronization started')
  }

  // Stop synchronization
  public stopSynchronization(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
    console.log('Data synchronization stopped')
  }

  // Add data to sync queue
  public addToSyncQueue(key: string, data: any): void {
    this.syncQueue.push({
      key,
      data,
      timestamp: Date.now(),
    })
  }

  // Synchronize data
  private async synchronizeData(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return

    this.isSyncing = true

    try {
      const items = this.syncQueue.splice(0, 10) // Process 10 items at a time

      for (const item of items) {
        await this.syncDataItem(item)
      }
    } catch (error) {
      console.error('Data synchronization error:', error)
    } finally {
      this.isSyncing = false
    }
  }

  // Sync individual data item
  private async syncDataItem(item: { key: string; data: any; timestamp: number }): Promise<void> {
    try {
      // Simulate API call
      const response = await fetch(`/api/v1/sync/${item.key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(item.data),
      })

      if (response.ok) {
        console.log(`Data synchronized for key: ${item.key}`)
      } else {
        throw new Error(`Sync failed for key: ${item.key}`)
      }
    } catch (error) {
      console.error(`Failed to sync data for key ${item.key}:`, error)
      // Re-queue the item for later sync
      this.syncQueue.push(item)
    }
  }

  // Resolve data conflict
  public resolveConflict(key: string, localData: any, remoteData: any): any {
    const resolver = this.conflictResolvers.get(key)
    if (resolver) {
      return resolver(localData, remoteData)
    }

    // Default conflict resolution: prefer remote data
    return { ...localData, ...remoteData, lastSync: Date.now() }
  }

  // Add conflict resolver
  public addConflictResolver(key: string, resolver: (local: any, remote: any) => any): void {
    this.conflictResolvers.set(key, resolver)
  }

  // Get sync status
  public getSyncStatus(): {
    isSyncing: boolean
    queueLength: number
    lastSync: number | null
  } {
    return {
      isSyncing: this.isSyncing,
      queueLength: this.syncQueue.length,
      lastSync: this.syncQueue.length > 0 ? Math.max(...this.syncQueue.map(item => item.timestamp)) : null,
    }
  }
}

// Data Backup Manager
export class DataBackupManager {
  private static instance: DataBackupManager
  private backupInterval: number | null = null
  private maxBackups = 5

  private constructor() {}

  public static getInstance(): DataBackupManager {
    if (!DataBackupManager.instance) {
      DataBackupManager.instance = new DataBackupManager()
    }
    return DataBackupManager.instance
  }

  // Start automatic backups
  public startBackups(interval = 300000): void { // 5 minutes
    if (this.backupInterval) return

    this.backupInterval = setInterval(() => {
      this.createBackup()
    }, interval)

    console.log('Automatic data backups started')
  }

  // Stop automatic backups
  public stopBackups(): void {
    if (this.backupInterval) {
      clearInterval(this.backupInterval)
      this.backupInterval = null
    }
    console.log('Automatic data backups stopped')
  }

  // Create backup
  public createBackup(): void {
    try {
      const backup = {
        timestamp: Date.now(),
        data: this.exportAllData(),
        version: '1.0',
      }

      const backupKey = `backup_${backup.timestamp}`
      localStorage.setItem(backupKey, JSON.stringify(backup))

      // Clean up old backups
      this.cleanupOldBackups()

      console.log('Data backup created:', backupKey)
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  // Export all data
  private exportAllData(): Record<string, any> {
    const data: Record<string, any> = {}

    // Export localStorage
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('backup_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || 'null')
        } catch (error) {
          data[key] = localStorage.getItem(key)
        }
      }
    }

    // Export sessionStorage
    for (const key of Object.keys(sessionStorage)) {
      try {
        data[`session_${key}`] = JSON.parse(sessionStorage.getItem(key) || 'null')
      } catch (error) {
        data[`session_${key}`] = sessionStorage.getItem(key)
      }
    }

    return data
  }

  // Cleanup old backups
  private cleanupOldBackups(): void {
    const backupKeys = Object.keys(localStorage)
      .filter(key => key.startsWith('backup_'))
      .sort((a, b) => {
        const timestampA = parseInt(a.split('_')[1])
        const timestampB = parseInt(b.split('_')[1])
        return timestampB - timestampA
      })

    if (backupKeys.length > this.maxBackups) {
      const keysToRemove = backupKeys.slice(this.maxBackups)
      keysToRemove.forEach(key => localStorage.removeItem(key))
    }
  }

  // Restore from backup
  public restoreFromBackup(backupKey: string): boolean {
    try {
      const backupData = localStorage.getItem(backupKey)
      if (!backupData) return false

      const backup = JSON.parse(backupData)
      if (!backup.data) return false

      // Clear current data
      localStorage.clear()
      sessionStorage.clear()

      // Restore data
      for (const [key, value] of Object.entries(backup.data)) {
        if (key.startsWith('session_')) {
          sessionStorage.setItem(key.substring(8), JSON.stringify(value))
        } else {
          localStorage.setItem(key, JSON.stringify(value))
        }
      }

      console.log('Data restored from backup:', backupKey)
      return true
    } catch (error) {
      console.error('Failed to restore from backup:', error)
      return false
    }
  }

  // Get available backups
  public getAvailableBackups(): Array<{ key: string; timestamp: number; size: number }> {
    const backups: Array<{ key: string; timestamp: number; size: number }> = []

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('backup_')) {
        try {
          const backupData = localStorage.getItem(key)
          if (backupData) {
            const backup = JSON.parse(backupData)
            backups.push({
              key,
              timestamp: backup.timestamp,
              size: backupData.length,
            })
          }
        } catch (error) {
          console.error(`Error reading backup ${key}:`, error)
        }
      }
    }

    return backups.sort((a, b) => b.timestamp - a.timestamp)
  }
}

// Export singleton instances
export const dataConsistencyManager = DataConsistencyManager.getInstance()
export const dataSynchronizationManager = DataSynchronizationManager.getInstance()
export const dataBackupManager = DataBackupManager.getInstance()

// Initialize data consistency
export const initializeDataConsistency = (): void => {
  dataConsistencyManager.startMonitoring()
  dataSynchronizationManager.startSynchronization()
  dataBackupManager.startBackups()
}
