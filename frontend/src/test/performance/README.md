# Performance Testing

This directory contains comprehensive performance tests to ensure the application meets performance standards and maintains optimal user experience.

## Overview

Performance tests ensure that:
- Core Web Vitals meet Google's standards
- Bundle sizes remain optimized
- Memory usage is controlled and leak-free
- Rendering performance is smooth
- API calls are efficient
- The application performs well under various conditions

## Test Categories

### 1. Core Web Vitals Tests (`core-web-vitals.test.tsx`)
- **Largest Contentful Paint (LCP)**: Measures loading performance
- **First Input Delay (FID)**: Measures interactivity
- **Cumulative Layout Shift (CLS)**: Measures visual stability
- **First Contentful Paint (FCP)**: Measures initial loading
- **Time to Interactive (TTI)**: Measures when page becomes interactive
- **Total Blocking Time (TBT)**: Measures main thread blocking

### 2. Bundle Analysis Tests (`bundle-analysis.test.ts`)
- Bundle size monitoring and optimization
- Chunk size analysis and splitting strategy
- Vendor chunk separation and optimization
- Code splitting effectiveness
- Bundle growth monitoring

### 3. Performance Benchmarks (`benchmarks.test.tsx`)
- Component rendering performance
- Server list rendering with large datasets
- Form submission performance
- Navigation performance
- Real-time updates performance
- Search and filtering performance
- Memory usage during operations
- API call performance
- Animation performance
- Concurrent operations performance

### 4. Memory Leak Detection (`memory-leak.test.tsx`)
- Component mounting/unmounting memory leaks
- Server list rendering memory leaks
- WebSocket operations memory leaks
- Form interactions memory leaks
- Navigation memory leaks
- API calls memory leaks
- Timer operations memory leaks
- Event listener memory leaks
- Large data processing memory leaks
- Animation operations memory leaks

### 5. Rendering Performance Tests (`rendering-performance.test.tsx`)
- Main app rendering performance
- Server list rendering with many items
- Form rendering efficiency
- Admin panel rendering efficiency
- Rapid re-renders performance
- Different data rendering efficiency
- Empty state rendering efficiency
- Error state rendering efficiency
- Loading state rendering efficiency
- Concurrent rendering efficiency
- Complex nested components performance
- Animation rendering efficiency
- Frequent updates performance

### 6. API Performance Tests (`api-performance.test.ts`)
- Authentication API calls efficiency
- Server management API calls efficiency
- Bulk server operations efficiency
- Concurrent API calls efficiency
- API error responses efficiency
- API timeout scenarios efficiency
- API retry scenarios efficiency
- Large API responses efficiency
- API rate limiting efficiency
- API caching efficiency
- API pagination efficiency
- API batch operations efficiency

## Running Performance Tests

```bash
# Run all performance tests
npm run test:performance

# Run specific performance test category
npm run test:performance -- core-web-vitals
npm run test:performance -- bundle-analysis
npm run test:performance -- benchmarks
npm run test:performance -- memory-leak
npm run test:performance -- rendering-performance
npm run test:performance -- api-performance

# Run with coverage
npm run test:performance:coverage
```

## Performance Thresholds

### Core Web Vitals Thresholds
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### Additional Performance Thresholds
- **FCP (First Contentful Paint)**: < 1.8s
- **TTI (Time to Interactive)**: < 3.8s
- **TBT (Total Blocking Time)**: < 200ms
- **Memory Leak Threshold**: < 1MB increase
- **Bundle Size Threshold**: < 2MB total
- **Render Time Threshold**: < 16ms (60fps)

## Performance Testing Utilities

### `PerformanceMonitor`
Utility class for measuring and tracking performance metrics:
```typescript
const monitor = new PerformanceMonitor()
monitor.mark('start')
// ... perform operation
monitor.mark('end')
const duration = monitor.measure('operation', 'start', 'end')
```

### `CoreWebVitals`
Utility class for measuring Core Web Vitals:
```typescript
const lcp = await CoreWebVitals.measureLCP()
const fid = await CoreWebVitals.measureFID()
const cls = await CoreWebVitals.measureCLS()
```

### `MemoryMonitor`
Utility class for memory usage monitoring:
```typescript
const result = await MemoryMonitor.measureMemoryLeak(() => {
  // ... perform operation
}, 100)
```

### `BundleAnalyzer`
Utility class for bundle size analysis:
```typescript
const analysis = BundleAnalyzer.analyzeBundleSize()
```

## Best Practices

### Performance Testing
1. **Test Real Scenarios**: Use realistic data and user interactions
2. **Monitor Trends**: Track performance over time to detect regressions
3. **Test Edge Cases**: Include large datasets, slow networks, and error conditions
4. **Use Appropriate Thresholds**: Set realistic but challenging performance targets
5. **Test on Different Devices**: Consider various hardware capabilities

### Memory Management
1. **Clean Up Resources**: Ensure proper cleanup of timers, event listeners, and subscriptions
2. **Monitor Memory Usage**: Track memory consumption during operations
3. **Test Long-Running Operations**: Verify memory stability over time
4. **Use Memory Profiling**: Leverage browser dev tools for detailed analysis

### Bundle Optimization
1. **Monitor Bundle Size**: Track total bundle size and individual chunk sizes
2. **Optimize Code Splitting**: Ensure effective chunk splitting strategy
3. **Remove Dead Code**: Use tree shaking and dead code elimination
4. **Optimize Dependencies**: Choose lightweight alternatives when possible

## Performance Monitoring

### Real-time Monitoring
- Core Web Vitals tracking
- Performance metrics collection
- Memory usage monitoring
- API response time tracking

### Performance Budgets
- Bundle size limits
- Performance threshold enforcement
- Memory usage limits
- API response time limits

### Performance Reports
- Automated performance reports
- Performance regression detection
- Performance trend analysis
- Optimization recommendations

## Examples

### Testing Component Rendering Performance
```typescript
it('should render component efficiently', async () => {
  const { averageTime } = await performanceTestHelpers.measureRenderTime(
    () => render(<MyComponent />),
    10
  )
  
  expect(averageTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_TIME_THRESHOLD)
})
```

### Testing Memory Leaks
```typescript
it('should not leak memory', async () => {
  const result = await MemoryMonitor.measureMemoryLeak(() => {
    const { unmount } = render(<MyComponent />)
    unmount()
  }, 100)
  
  expect(result.memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LEAK_THRESHOLD)
})
```

### Testing API Performance
```typescript
it('should handle API calls efficiently', async () => {
  monitor.mark('api-start')
  await apiService.getData()
  monitor.mark('api-end')
  
  const apiTime = monitor.measure('api-call', 'api-start', 'api-end')
  expect(apiTime).toBeLessThan(100)
})
```

## Continuous Integration

Performance tests are integrated into the CI/CD pipeline to:
- Detect performance regressions early
- Ensure performance budgets are maintained
- Provide performance feedback on every build
- Track performance trends over time

## Performance Optimization

Based on test results, the following optimizations are implemented:
- Code splitting and lazy loading
- Bundle size optimization
- Memory leak prevention
- Rendering performance optimization
- API response optimization
- Caching strategies
- Animation optimization
