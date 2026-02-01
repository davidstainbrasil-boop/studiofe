/**
 * Performance optimization utilities for dynamic imports and lazy loading
 * Eliminates chunk bloat by loading components on-demand
 */
import { lazy, ComponentType, LazyExoticComponent } from 'react';
import { logger } from '@lib/logger';

// Cache for loaded components (use 'any' for flexibility with various component types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const componentCache = new Map<string, LazyExoticComponent<any>>();

/**
 * Creates a dynamic import with retry mechanism and error handling
 * Note: Using 'any' here to allow components with various prop types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createDynamicImport<T extends ComponentType<any>>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importFn: () => Promise<{ default: T }>,
  componentName: string,
  retryAttempts: number = 3,
  retryDelayMs: number = 1000
): LazyExoticComponent<T> {
  // Check cache first
  if (componentCache.has(componentName)) {
    return componentCache.get(componentName)!;
  }

  const lazyComponent = lazy(() => {
    return retryImport(importFn, retryAttempts, retryDelayMs, componentName);
  });

  componentCache.set(componentName, lazyComponent);
  return lazyComponent;
}

/**
 * Retry import with exponential backoff
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function retryImport<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries: number,
  delayMs: number,
  componentName: string,
  attempt: number = 1
): Promise<{ default: T }> {
  try {
    const result = await importFn();
    
    if (attempt > 1) {
      logger.info(`Dynamic import succeeded on attempt ${attempt}`, {
        component: componentName,
        attempt,
        totalAttempts: maxRetries
      });
    }
    
    return result;
  } catch (error) {
    if (attempt >= maxRetries) {
      logger.error(
        `Dynamic import failed after ${maxRetries} attempts`,
        error instanceof Error ? error : new Error(String(error)),
        {
          component: componentName,
          maxRetries
        },
      );
      throw error;
    }

    const backoffDelay = delayMs * Math.pow(2, attempt - 1);
    
    logger.warn(`Dynamic import failed, retrying in ${backoffDelay}ms`, {
      component: componentName,
      attempt,
      maxRetries,
      error: (error as Error).message
    });

    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    return retryImport(importFn, maxRetries, delayMs, componentName, attempt + 1);
  }
}

/**
 * Preload a component without rendering
 */
export function preloadComponent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  importFn: () => Promise<{ default: ComponentType<any> }>,
  componentName: string
): void {
  if (!componentCache.has(componentName)) {
    importFn()
      .then(() => {
        logger.debug(`Component preloaded successfully: ${componentName}`);
      })
      .catch((error) => {
        logger.warn(`Failed to preload component: ${componentName}`, {
          error: (error as Error).message
        });
      });
  }
}

/**
 * Utility to create commonly used dynamic imports
 * Reduces initial bundle size by splitting heavy components
 */
export const dynamicComponents = {
  // Editor components (heavy)
  CanvasEditor: () => createDynamicImport(
    async () => {
      const mod = await import('@components/editor/canvas-editor');
      return { default: mod.CanvasEditor };
    },
    'CanvasEditor'
  ),
  
  TimelineEditor: () => createDynamicImport(
    async () => {
      const mod = await import('@components/timeline/timeline-editor');
      return { default: mod.TimelineEditor || mod.default };
    },
    'TimelineEditor'
  ),
  
  // Render components
  RenderQueue: () => createDynamicImport(
    () => import('@components/render/render-queue-monitor'),
    'RenderQueue'
  ),
  
  // Analytics (charts/visualizations)
  Analytics: () => createDynamicImport(
    () => import('@components/analytics/analytics-dashboard'),
    'Analytics'
  ),
  
  // Admin/settings components
  ComplianceDashboard: () => createDynamicImport(
    async () => {
      const mod = await import('@components/compliance/compliance-dashboard');
      return { default: mod.ComplianceDashboard };
    },
    'ComplianceDashboard'
  ),
  
  UserSettings: () => createDynamicImport(
    async () => {
      const mod = await import('@components/user/user-settings');
      return { default: mod.UserSettings };
    },
    'UserSettings'
  )
};

/**
 * Batch preload components for better UX
 */
export function preloadCriticalComponents(): void {
  // Preload commonly used components after initial page load
  setTimeout(() => {
    preloadComponent(
      async () => {
        const mod = await import('@components/editor/canvas-editor');
        return { default: mod.CanvasEditor as ComponentType<unknown> };
      },
      'CanvasEditor'
    );
    
    preloadComponent(
      async () => {
        const mod = await import('@components/timeline/timeline-editor');
        return { default: (mod.TimelineEditor || mod.default) as ComponentType<unknown> };
      },
      'TimelineEditor'
    );
  }, 2000); // Wait 2s after page load
}

/**
 * Clear component cache (useful for testing)
 */
export function clearComponentCache(): void {
  componentCache.clear();
}

/**
 * Get cache status for monitoring
 */
export function getComponentCacheStats() {
  return {
    totalCached: componentCache.size,
    cachedComponents: Array.from(componentCache.keys())
  };
}

/**
 * Progressive loading strategy
 * Load components based on user interaction patterns
 */
export function initializeProgressiveLoading(): void {
  // Intersection Observer for viewport-based loading
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const componentName = element.dataset.dynamicComponent;
          
          if (componentName && dynamicComponents[componentName as keyof typeof dynamicComponents]) {
            // Preload component when it comes into view
            const componentFactory = dynamicComponents[componentName as keyof typeof dynamicComponents];
            if (componentFactory) {
              componentFactory();
              observer.unobserve(element);
            }
          }
        }
      });
    }, {
      rootMargin: '50px' // Preload 50px before component enters viewport
    });
    
    // Observe elements with data-dynamic-component attribute
    document.querySelectorAll('[data-dynamic-component]').forEach((el) => {
      observer.observe(el);
    });
  }
}

export default {
  createDynamicImport,
  preloadComponent,
  dynamicComponents,
  preloadCriticalComponents,
  clearComponentCache,
  getComponentCacheStats,
  initializeProgressiveLoading
};
