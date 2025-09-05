import { describe, it, expect } from 'vitest'
import { BundleAnalyzer, PERFORMANCE_THRESHOLDS } from './utils'

describe('Bundle Analysis Performance Tests', () => {
  it('should maintain bundle size within threshold', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify total bundle size is within threshold
    expect(analysis.totalSize).toBeLessThan(PERFORMANCE_THRESHOLDS.BUNDLE_SIZE_THRESHOLD)
  })

  it('should have reasonable chunk sizes', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify individual chunk sizes are reasonable
    Object.entries(analysis.chunkSizes).forEach(([name, size]) => {
      expect(size).toBeLessThan(1024 * 1024) // 1MB per chunk
      expect(size).toBeGreaterThan(0)
    })
  })

  it('should identify largest chunks for optimization', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify largest chunks are identified
    expect(analysis.largestChunks).toHaveLength(4)
    expect(analysis.largestChunks[0].size).toBeGreaterThan(analysis.largestChunks[1].size)
  })

  it('should have vendor chunk properly separated', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify vendor chunk exists and is substantial
    expect(analysis.chunkSizes.vendor).toBeDefined()
    expect(analysis.chunkSizes.vendor).toBeGreaterThan(500000) // 500KB
  })

  it('should have main chunk optimized', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify main chunk is reasonable size
    expect(analysis.chunkSizes.main).toBeDefined()
    expect(analysis.chunkSizes.main).toBeLessThan(800000) // 800KB
  })

  it('should have component chunk properly code-split', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify component chunk exists and is reasonable
    expect(analysis.chunkSizes.components).toBeDefined()
    expect(analysis.chunkSizes.components).toBeLessThan(500000) // 500KB
  })

  it('should have utility chunk minimal', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify utility chunk is minimal
    expect(analysis.chunkSizes.utils).toBeDefined()
    expect(analysis.chunkSizes.utils).toBeLessThan(200000) // 200KB
  })

  it('should maintain bundle size growth under control', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify bundle size growth is controlled
    const growthRate = analysis.totalSize / (1024 * 1024) // MB
    expect(growthRate).toBeLessThan(2) // Under 2MB total
  })

  it('should have proper chunk splitting strategy', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Verify chunk splitting strategy
    const chunkCount = Object.keys(analysis.chunkSizes).length
    expect(chunkCount).toBeGreaterThanOrEqual(4) // At least 4 chunks
    expect(chunkCount).toBeLessThanOrEqual(10) // Not too many chunks
  })

  it('should identify optimization opportunities', () => {
    const analysis = BundleAnalyzer.analyzeBundleSize()
    
    // Identify chunks that could be optimized
    const largeChunks = analysis.largestChunks.filter(chunk => chunk.size > 600000)
    
    // Should have optimization opportunities identified
    expect(largeChunks.length).toBeGreaterThan(0)
    expect(largeChunks[0].name).toBe('vendor') // Vendor should be largest
  })
})
