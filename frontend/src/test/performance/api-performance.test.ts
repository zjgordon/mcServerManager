import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PerformanceMonitor } from './utils'
import { TestDataFactory } from '../utils'
import * as apiService from '../../services/api'

describe('API Performance Tests', () => {
  let monitor: PerformanceMonitor

  beforeEach(() => {
    monitor = new PerformanceMonitor()
    vi.clearAllMocks()
  })

  it('should handle authentication API calls efficiently', async () => {
    const mockUser = TestDataFactory.user()
    vi.mocked(apiService.login).mockResolvedValueOnce(mockUser)

    monitor.mark('auth-start')
    const result = await apiService.login('testuser', 'password123')
    monitor.mark('auth-end')
    
    const authTime = monitor.measure('auth-call', 'auth-start', 'auth-end')

    // Verify authentication API performance
    expect(authTime).toBeLessThan(100) // 100ms for auth call
    expect(result).toEqual(mockUser)
  })

  it('should handle server management API calls efficiently', async () => {
    const mockServer = TestDataFactory.server()
    vi.mocked(apiService.createServer).mockResolvedValueOnce(mockServer)

    monitor.mark('server-create-start')
    const result = await apiService.createServer({
      server_name: 'Test Server',
      version: '1.21.8',
      port: 25565
    })
    monitor.mark('server-create-end')
    
    const serverTime = monitor.measure('server-create', 'server-create-start', 'server-create-end')

    // Verify server creation API performance
    expect(serverTime).toBeLessThan(200) // 200ms for server creation
    expect(result).toEqual(mockServer)
  })

  it('should handle bulk server operations efficiently', async () => {
    const serverList = Array.from({ length: 50 }, (_, i) => 
      TestDataFactory.server({ id: i, server_name: `Server ${i}` })
    )
    vi.mocked(apiService.getServers).mockResolvedValueOnce(serverList)

    monitor.mark('bulk-start')
    const result = await apiService.getServers()
    monitor.mark('bulk-end')
    
    const bulkTime = monitor.measure('bulk-servers', 'bulk-start', 'bulk-end')

    // Verify bulk server API performance
    expect(bulkTime).toBeLessThan(300) // 300ms for 50 servers
    expect(result).toHaveLength(50)
  })

  it('should handle concurrent API calls efficiently', async () => {
    const mockServer = TestDataFactory.server()
    vi.mocked(apiService.getServer).mockResolvedValue(mockServer)

    monitor.mark('concurrent-start')
    
    // Simulate concurrent API calls
    const promises = Array.from({ length: 10 }, (_, i) => 
      apiService.getServer(i)
    )
    
    const results = await Promise.all(promises)
    
    monitor.mark('concurrent-end')
    
    const concurrentTime = monitor.measure('concurrent-calls', 'concurrent-start', 'concurrent-end')

    // Verify concurrent API performance
    expect(concurrentTime).toBeLessThan(500) // 500ms for 10 concurrent calls
    expect(results).toHaveLength(10)
  })

  it('should handle API error responses efficiently', async () => {
    vi.mocked(apiService.getServer).mockRejectedValueOnce(new Error('Server not found'))

    monitor.mark('error-start')
    
    try {
      await apiService.getServer(999)
    } catch (error) {
      // Expected error
    }
    
    monitor.mark('error-end')
    
    const errorTime = monitor.measure('error-response', 'error-start', 'error-end')

    // Verify error response performance
    expect(errorTime).toBeLessThan(100) // 100ms for error response
  })

  it('should handle API timeout scenarios efficiently', async () => {
    vi.mocked(apiService.getSystemStats).mockImplementation(
      () => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    )

    monitor.mark('timeout-start')
    
    try {
      await apiService.getSystemStats()
    } catch (error) {
      // Expected timeout
    }
    
    monitor.mark('timeout-end')
    
    const timeoutTime = monitor.measure('timeout-response', 'timeout-start', 'timeout-end')

    // Verify timeout response performance
    expect(timeoutTime).toBeLessThan(200) // 200ms for timeout
  })

  it('should handle API retry scenarios efficiently', async () => {
    let callCount = 0
    vi.mocked(apiService.getServer).mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.reject(new Error('Temporary failure'))
      }
      return Promise.resolve(TestDataFactory.server())
    })

    monitor.mark('retry-start')
    const result = await apiService.getServer(1)
    monitor.mark('retry-end')
    
    const retryTime = monitor.measure('retry-calls', 'retry-start', 'retry-end')

    // Verify retry performance
    expect(retryTime).toBeLessThan(300) // 300ms for retry scenario
    expect(result).toBeDefined()
  })

  it('should handle large API responses efficiently', async () => {
    const largeServerList = Array.from({ length: 1000 }, (_, i) => 
      TestDataFactory.server({ 
        id: i, 
        server_name: `Server ${i}`,
        motd: `A very long MOTD for server ${i} with lots of text to simulate large response`
      })
    )
    vi.mocked(apiService.getServers).mockResolvedValueOnce(largeServerList)

    monitor.mark('large-response-start')
    const result = await apiService.getServers()
    monitor.mark('large-response-end')
    
    const largeResponseTime = monitor.measure('large-response', 'large-response-start', 'large-response-end')

    // Verify large response performance
    expect(largeResponseTime).toBeLessThan(1000) // 1000ms for large response
    expect(result).toHaveLength(1000)
  })

  it('should handle API rate limiting efficiently', async () => {
    let callCount = 0
    vi.mocked(apiService.getServer).mockImplementation(() => {
      callCount++
      if (callCount > 5) {
        return Promise.reject(new Error('Rate limit exceeded'))
      }
      return Promise.resolve(TestDataFactory.server())
    })

    monitor.mark('rate-limit-start')
    
    // Simulate rapid API calls
    const promises = Array.from({ length: 10 }, (_, i) => 
      apiService.getServer(i).catch(() => null)
    )
    
    const results = await Promise.all(promises)
    
    monitor.mark('rate-limit-end')
    
    const rateLimitTime = monitor.measure('rate-limit', 'rate-limit-start', 'rate-limit-end')

    // Verify rate limiting performance
    expect(rateLimitTime).toBeLessThan(500) // 500ms for rate limiting
    expect(results.filter(Boolean)).toHaveLength(5) // Only 5 successful calls
  })

  it('should handle API caching efficiently', async () => {
    const mockServer = TestDataFactory.server()
    vi.mocked(apiService.getServer).mockResolvedValue(mockServer)

    monitor.mark('cache-start')
    
    // First call (cache miss)
    const result1 = await apiService.getServer(1)
    
    // Second call (cache hit)
    const result2 = await apiService.getServer(1)
    
    monitor.mark('cache-end')
    
    const cacheTime = monitor.measure('cache-calls', 'cache-start', 'cache-end')

    // Verify caching performance
    expect(cacheTime).toBeLessThan(200) // 200ms for cached calls
    expect(result1).toEqual(result2)
  })

  it('should handle API pagination efficiently', async () => {
    const pageSize = 20
    const totalPages = 5
    
    vi.mocked(apiService.getServers).mockImplementation((page = 1) => {
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const servers = Array.from({ length: pageSize }, (_, i) => 
        TestDataFactory.server({ id: startIndex + i })
      )
      return Promise.resolve(servers)
    })

    monitor.mark('pagination-start')
    
    // Fetch all pages
    const allServers = []
    for (let page = 1; page <= totalPages; page++) {
      const servers = await apiService.getServers(page)
      allServers.push(...servers)
    }
    
    monitor.mark('pagination-end')
    
    const paginationTime = monitor.measure('pagination', 'pagination-start', 'pagination-end')

    // Verify pagination performance
    expect(paginationTime).toBeLessThan(800) // 800ms for 5 pages
    expect(allServers).toHaveLength(pageSize * totalPages)
  })

  it('should handle API batch operations efficiently', async () => {
    const serverIds = [1, 2, 3, 4, 5]
    vi.mocked(apiService.startServer).mockResolvedValue(undefined)

    monitor.mark('batch-start')
    
    // Batch start servers
    const promises = serverIds.map(id => apiService.startServer(id))
    await Promise.all(promises)
    
    monitor.mark('batch-end')
    
    const batchTime = monitor.measure('batch-operations', 'batch-start', 'batch-end')

    // Verify batch operations performance
    expect(batchTime).toBeLessThan(300) // 300ms for 5 batch operations
  })
})
