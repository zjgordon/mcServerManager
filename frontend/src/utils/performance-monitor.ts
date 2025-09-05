import React from 'react';

// Performance monitoring utilities
export interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  componentRenderTime?: number;
  apiResponseTime?: number;
  bundleSize?: number;
  memoryUsage?: number;
  
  // User experience metrics
  pageLoadTime?: number;
  timeToInteractive?: number;
  firstPaint?: number;
}

export interface PerformanceEntry {
  name: string;
  value: number;
  timestamp: number;
  type: 'metric' | 'mark' | 'measure';
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private observers: PerformanceObserver[] = [];
  private isEnabled: boolean = true;

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined' || !window.performance) return;

    // Observe Core Web Vitals
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry) {
    if (!this.isEnabled) return;

    const metricName = this.getMetricName(entry);
    if (!metricName) return;

    this.recordMetric(metricName, entry.startTime, 'metric', {
      entryType: entry.entryType,
      duration: entry.duration,
    });
  }

  private getMetricName(entry: PerformanceEntry): string | null {
    switch (entry.entryType) {
      case 'paint':
        return entry.name === 'first-contentful-paint' ? 'fcp' : 
               entry.name === 'first-paint' ? 'fp' : null;
      case 'largest-contentful-paint':
        return 'lcp';
      case 'first-input':
        return 'fid';
      case 'layout-shift':
        return 'cls';
      default:
        return null;
    }
  }

  // Public API methods
  public recordMetric(name: string, value: number, type: 'metric' | 'mark' | 'measure' = 'metric', metadata?: Record<string, any>) {
    if (!this.isEnabled) return;

    const entry: PerformanceEntry = {
      name,
      value,
      timestamp: Date.now(),
      type,
      metadata,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(entry);

    // Also record in browser performance API if available
    if (typeof window !== 'undefined' && window.performance) {
      if (type === 'mark') {
        window.performance.mark(name);
      } else if (type === 'measure') {
        window.performance.measure(name);
      }
    }
  }

  public startMeasure(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-start`);
    }
  }

  public endMeasure(name: string, metadata?: Record<string, any>) {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`${name}-end`);
      window.performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = window.performance.getEntriesByName(name, 'measure')[0];
      if (measure) {
        this.recordMetric(name, measure.duration, 'measure', metadata);
      }
    }
  }

  public getMetrics(name?: string): PerformanceEntry[] | Map<string, PerformanceEntry[]> {
    if (name) {
      return this.metrics.get(name) || [];
    }
    return this.metrics;
  }

  public getLatestMetric(name: string): PerformanceEntry | null {
    const entries = this.metrics.get(name);
    return entries && entries.length > 0 ? entries[entries.length - 1] : null;
  }

  public getAverageMetric(name: string): number | null {
    const entries = this.metrics.get(name);
    if (!entries || entries.length === 0) return null;
    
    const sum = entries.reduce((acc, entry) => acc + entry.value, 0);
    return sum / entries.length;
  }

  public clearMetrics(name?: string) {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  public enable() {
    this.isEnabled = true;
  }

  public disable() {
    this.isEnabled = false;
  }

  public destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }

  // Utility methods for common metrics
  public measureComponentRender(componentName: string, renderFn: () => void) {
    this.startMeasure(`component-${componentName}`);
    renderFn();
    this.endMeasure(`component-${componentName}`, { component: componentName });
  }

  public measureApiCall(apiName: string, apiCall: () => Promise<any>) {
    this.startMeasure(`api-${apiName}`);
    return apiCall().finally(() => {
      this.endMeasure(`api-${apiName}`, { api: apiName });
    });
  }

  public measureUserInteraction(interactionName: string, interactionFn: () => void) {
    this.startMeasure(`interaction-${interactionName}`);
    interactionFn();
    this.endMeasure(`interaction-${interactionName}`, { interaction: interactionName });
  }

  // Bundle size monitoring
  public measureBundleSize() {
    if (typeof window === 'undefined') return;

    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    
    let totalSize = 0;
    
    scripts.forEach(script => {
      const src = script.getAttribute('src');
      if (src) {
        // This is a simplified measurement - in reality you'd need to fetch and measure
        this.recordMetric('script-count', 1, 'metric', { src });
      }
    });

    stylesheets.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        this.recordMetric('stylesheet-count', 1, 'metric', { href });
      }
    });

    this.recordMetric('total-assets', scripts.length + stylesheets.length, 'metric');
  }

  // Memory usage monitoring
  public measureMemoryUsage() {
    if (typeof window === 'undefined' || !(window as any).performance?.memory) return;

    const memory = (window as any).performance.memory;
    this.recordMetric('memory-used', memory.usedJSHeapSize, 'metric');
    this.recordMetric('memory-total', memory.totalJSHeapSize, 'metric');
    this.recordMetric('memory-limit', memory.jsHeapSizeLimit, 'metric');
  }

  // Network performance monitoring
  public measureNetworkPerformance() {
    if (typeof window === 'undefined' || !window.performance) return;

    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.recordMetric('dns-lookup', navigation.domainLookupEnd - navigation.domainLookupStart, 'metric');
      this.recordMetric('tcp-connect', navigation.connectEnd - navigation.connectStart, 'metric');
      this.recordMetric('request-response', navigation.responseEnd - navigation.requestStart, 'metric');
      this.recordMetric('dom-processing', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, 'metric');
      this.recordMetric('page-load', navigation.loadEventEnd - navigation.loadEventStart, 'metric');
    }
  }

  // Generate performance report
  public generateReport(): PerformanceMetrics {
    const report: PerformanceMetrics = {};

    // Core Web Vitals
    const lcp = this.getLatestMetric('lcp');
    if (lcp) report.lcp = lcp.value;

    const fid = this.getLatestMetric('fid');
    if (fid) report.fid = fid.value;

    const cls = this.getLatestMetric('cls');
    if (cls) report.cls = cls.value;

    const fcp = this.getLatestMetric('fcp');
    if (fcp) report.fcp = fcp.value;

    // Custom metrics
    const componentRenderTime = this.getAverageMetric('component-render');
    if (componentRenderTime) report.componentRenderTime = componentRenderTime;

    const apiResponseTime = this.getAverageMetric('api-response');
    if (apiResponseTime) report.apiResponseTime = apiResponseTime;

    // Memory usage
    const memoryUsed = this.getLatestMetric('memory-used');
    if (memoryUsed) report.memoryUsage = memoryUsed.value;

    return report;
  }

  // Export metrics for analysis
  public exportMetrics(): string {
    const allMetrics = Array.from(this.metrics.entries()).map(([name, entries]) => ({
      name,
      entries: entries.map(entry => ({
        value: entry.value,
        timestamp: entry.timestamp,
        type: entry.type,
        metadata: entry.metadata,
      })),
    }));

    return JSON.stringify(allMetrics, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = React.useRef<number>(0);

  React.useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime.current;
      performanceMonitor.recordMetric(`component-${componentName}`, renderTime, 'metric', {
        component: componentName,
        type: 'render',
      });
    };
  });

  const measureOperation = (operationName: string, operation: () => void) => {
    performanceMonitor.measureUserInteraction(`${componentName}-${operationName}`, operation);
  };

  const measureAsyncOperation = async (operationName: string, operation: () => Promise<any>) => {
    return performanceMonitor.measureApiCall(`${componentName}-${operationName}`, operation);
  };

  return {
    measureOperation,
    measureAsyncOperation,
    recordMetric: (name: string, value: number, metadata?: Record<string, any>) => {
      performanceMonitor.recordMetric(`${componentName}-${name}`, value, 'metric', metadata);
    },
  };
};

// Performance monitoring component
export const PerformanceMonitorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Initialize performance monitoring
    performanceMonitor.measureBundleSize();
    performanceMonitor.measureMemoryUsage();
    performanceMonitor.measureNetworkPerformance();

    // Set up periodic memory monitoring
    const memoryInterval = setInterval(() => {
      performanceMonitor.measureMemoryUsage();
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(memoryInterval);
    };
  }, []);

  return <>{children}</>;
};

export default performanceMonitor;
