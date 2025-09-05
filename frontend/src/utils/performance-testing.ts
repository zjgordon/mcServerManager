import React, { useRef, useCallback, useEffect, useState } from 'react';

// Performance testing utilities
export interface PerformanceTestConfig {
  iterations?: number;
  warmup?: number;
  timeout?: number;
  threshold?: number;
}

export interface PerformanceTestResult {
  name: string;
  average: number;
  min: number;
  max: number;
  median: number;
  p95: number;
  p99: number;
  iterations: number;
  passed: boolean;
  threshold?: number;
}

export interface BenchmarkSuite {
  name: string;
  tests: Array<{
    name: string;
    fn: () => void | Promise<void>;
    config?: PerformanceTestConfig;
  }>;
}

// Performance testing class
class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  async runTest(
    name: string,
    testFn: () => void | Promise<void>,
    config: PerformanceTestConfig = {}
  ): Promise<PerformanceTestResult> {
    const {
      iterations = 100,
      warmup = 10,
      timeout = 5000,
      threshold,
    } = config;

    const times: number[] = [];

    // Warmup runs
    for (let i = 0; i < warmup; i++) {
      try {
        await testFn();
      } catch (error) {
        console.warn(`Warmup ${i} failed:`, error);
      }
    }

    // Actual test runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await Promise.race([
          testFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Test timeout')), timeout)
          )
        ]);
        
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.warn(`Test iteration ${i} failed:`, error);
      }
    }

    // Calculate statistics
    const sortedTimes = times.sort((a, b) => a - b);
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    const result: PerformanceTestResult = {
      name,
      average,
      min,
      max,
      median,
      p95,
      p99,
      iterations: times.length,
      passed: threshold ? average <= threshold : true,
      threshold,
    };

    this.results.push(result);
    return result;
  }

  async runSuite(suite: BenchmarkSuite): Promise<PerformanceTestResult[]> {
    console.log(`Running benchmark suite: ${suite.name}`);
    const results: PerformanceTestResult[] = [];

    for (const test of suite.tests) {
      console.log(`Running test: ${test.name}`);
      const result = await this.runTest(test.name, test.fn, test.config);
      results.push(result);
      console.log(`Test ${test.name} completed:`, result);
    }

    return results;
  }

  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }

  generateReport(): string {
    const results = this.getResults();
    const report = {
      summary: {
        totalTests: results.length,
        passedTests: results.filter(r => r.passed).length,
        failedTests: results.filter(r => !r.passed).length,
        averageTime: results.reduce((sum, r) => sum + r.average, 0) / results.length,
      },
      results,
    };

    return JSON.stringify(report, null, 2);
  }
}

// React component performance testing
export const useComponentPerformanceTest = (componentName: string) => {
  const renderTimes = useRef<number[]>([]);
  const mountTime = useRef<number>(0);
  const [metrics, setMetrics] = useState<{
    renderCount: number;
    averageRenderTime: number;
    totalRenderTime: number;
  }>({
    renderCount: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
  });

  const startRender = useCallback(() => {
    mountTime.current = performance.now();
  }, []);

  const endRender = useCallback(() => {
    const renderTime = performance.now() - mountTime.current;
    renderTimes.current.push(renderTime);
    
    const newMetrics = {
      renderCount: renderTimes.current.length,
      averageRenderTime: renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length,
      totalRenderTime: renderTimes.current.reduce((sum, time) => sum + time, 0),
    };
    
    setMetrics(newMetrics);
  }, []);

  useEffect(() => {
    startRender();
    return () => endRender();
  }, [startRender, endRender]);

  return {
    metrics,
    startRender,
    endRender,
    clearMetrics: () => {
      renderTimes.current = [];
      setMetrics({
        renderCount: 0,
        averageRenderTime: 0,
        totalRenderTime: 0,
      });
    },
  };
};

// Memory usage testing
export const useMemoryTest = () => {
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);

  const measureMemory = useCallback(() => {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      setMemoryUsage({
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      });
    }
  }, []);

  useEffect(() => {
    measureMemory();
    const interval = setInterval(measureMemory, 1000);
    return () => clearInterval(interval);
  }, [measureMemory]);

  return {
    memoryUsage,
    measureMemory,
  };
};

// Bundle size testing
export const useBundleSizeTest = () => {
  const [bundleInfo, setBundleInfo] = useState<{
    scripts: number;
    stylesheets: number;
    totalSize: number;
  } | null>(null);

  const measureBundleSize = useCallback(() => {
    if (typeof window === 'undefined') return;

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    let totalSize = 0;
    
    // Estimate bundle size (this is approximate)
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        totalSize += 10000; // Estimate 10KB per script
      }
    });

    stylesheets.forEach(link => {
      const href = link.getAttribute('href');
      if (href && !href.startsWith('data:')) {
        totalSize += 5000; // Estimate 5KB per stylesheet
      }
    });

    setBundleInfo({
      scripts: scripts.length,
      stylesheets: stylesheets.length,
      totalSize,
    });
  }, []);

  useEffect(() => {
    measureBundleSize();
  }, [measureBundleSize]);

  return {
    bundleInfo,
    measureBundleSize,
  };
};

// Core Web Vitals testing
export const useCoreWebVitalsTest = () => {
  const [vitals, setVitals] = useState<{
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
  }>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            setVitals(prev => ({ ...prev, lcp: entry.startTime }));
            break;
          case 'first-input':
            setVitals(prev => ({ ...prev, fid: (entry as any).processingStart - entry.startTime }));
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              setVitals(prev => ({ ...prev, cls: (prev.cls || 0) + (entry as any).value }));
            }
            break;
          case 'paint':
            if (entry.name === 'first-contentful-paint') {
              setVitals(prev => ({ ...prev, fcp: entry.startTime }));
            }
            break;
        }
      }
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });

    // Measure TTFB
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      setVitals(prev => ({ ...prev, ttfb: navigation.responseStart - navigation.requestStart }));
    }

    return () => observer.disconnect();
  }, []);

  return vitals;
};

// Performance testing component
export const PerformanceTestRunner: React.FC<{
  tests: Array<{
    name: string;
    fn: () => void | Promise<void>;
    config?: PerformanceTestConfig;
  }>;
  onComplete?: (results: PerformanceTestResult[]) => void;
}> = ({ tests, onComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PerformanceTestResult[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const tester = useRef(new PerformanceTester());

  const runTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    tester.current.clearResults();

    for (const test of tests) {
      setCurrentTest(test.name);
      try {
        const result = await tester.current.runTest(test.name, test.fn, test.config);
        setResults(prev => [...prev, result]);
      } catch (error) {
        console.error(`Test ${test.name} failed:`, error);
      }
    }

    setCurrentTest('');
    setIsRunning(false);
    onComplete?.(tester.current.getResults());
  }, [tests, onComplete]);

  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Tests</h3>
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Run Tests'}
        </button>
      </div>

      {isRunning && (
        <div className="text-sm text-muted-foreground">
          Running: {currentTest}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">Passed: {passedTests}</span>
            <span className="text-red-600">Failed: {failedTests}</span>
            <span>Total: {results.length}</span>
          </div>

          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-md border ${
                  result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{result.name}</span>
                  <span className={`text-sm ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {result.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Average: {result.average.toFixed(2)}ms
                  {result.threshold && ` (threshold: ${result.threshold}ms)`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Performance benchmark utilities
export const benchmarkUtils = {
  // Create a benchmark suite
  createSuite: (name: string, tests: Array<{
    name: string;
    fn: () => void | Promise<void>;
    config?: PerformanceTestConfig;
  }>): BenchmarkSuite => ({
    name,
    tests,
  }),

  // Common performance tests
  createCommonTests: () => ({
    // DOM manipulation test
    domManipulation: {
      name: 'DOM Manipulation',
      fn: () => {
        const div = document.createElement('div');
        div.textContent = 'Test';
        document.body.appendChild(div);
        document.body.removeChild(div);
      },
      config: { iterations: 1000, threshold: 1 },
    },

    // Array operations test
    arrayOperations: {
      name: 'Array Operations',
      fn: () => {
        const arr = Array.from({ length: 1000 }, (_, i) => i);
        arr.map(x => x * 2).filter(x => x > 100).reduce((sum, x) => sum + x, 0);
      },
      config: { iterations: 100, threshold: 5 },
    },

    // Object creation test
    objectCreation: {
      name: 'Object Creation',
      fn: () => {
        for (let i = 0; i < 100; i++) {
          const obj = { id: i, name: `Item ${i}`, value: Math.random() };
          JSON.stringify(obj);
        }
      },
      config: { iterations: 50, threshold: 10 },
    },

    // Async operations test
    asyncOperations: {
      name: 'Async Operations',
      fn: async () => {
        await new Promise(resolve => setTimeout(resolve, 1));
        return Promise.resolve('test');
      },
      config: { iterations: 100, threshold: 5 },
    },
  }),

  // Performance comparison utility
  comparePerformance: (results1: PerformanceTestResult[], results2: PerformanceTestResult[]) => {
    const comparison = results1.map((result1, index) => {
      const result2 = results2[index];
      if (!result2) return null;

      const improvement = ((result2.average - result1.average) / result2.average) * 100;
      return {
        test: result1.name,
        before: result1.average,
        after: result2.average,
        improvement: improvement.toFixed(2) + '%',
        faster: improvement > 0,
      };
    }).filter(Boolean);

    return comparison;
  },
};

// Singleton performance tester instance
export const performanceTester = new PerformanceTester();

export default {
  PerformanceTester,
  useComponentPerformanceTest,
  useMemoryTest,
  useBundleSizeTest,
  useCoreWebVitalsTest,
  PerformanceTestRunner,
  benchmarkUtils,
  performanceTester,
};
