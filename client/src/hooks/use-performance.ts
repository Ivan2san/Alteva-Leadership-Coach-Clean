
import { useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
}

export function usePerformance(componentName?: string) {
  const measureRender = useCallback(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${componentName || 'Component'} render time: ${renderTime.toFixed(2)}ms`);
      }
      
      return renderTime;
    };
  }, [componentName]);

  const measureLoadTime = useCallback(() => {
    const loadTime = performance.now();
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${componentName || 'Component'} load time: ${loadTime.toFixed(2)}ms`);
    }
    
    return loadTime;
  }, [componentName]);

  const getMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }, []);

  const logPerformanceMetrics = useCallback((metrics: Partial<PerformanceMetrics>) => {
    if (process.env.NODE_ENV === 'development') {
      console.group(`[Performance] ${componentName || 'Component'} Metrics`);
      Object.entries(metrics).forEach(([key, value]) => {
        if (value !== undefined) {
          console.log(`${key}: ${typeof value === 'number' ? value.toFixed(2) : value}`);
        }
      });
      console.groupEnd();
    }
  }, [componentName]);

  useEffect(() => {
    const loadTime = measureLoadTime();
    
    return () => {
      const memory = getMemoryUsage();
      logPerformanceMetrics({
        loadTime,
        memoryUsage: memory?.used,
      });
    };
  }, [measureLoadTime, getMemoryUsage, logPerformanceMetrics]);

  return {
    measureRender,
    measureLoadTime,
    getMemoryUsage,
    logPerformanceMetrics,
  };
}

export default usePerformance;
