'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Google Analytics tracking
declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: any) => void;
    dataLayer: any[];
  }
}

export function GoogleAnalytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!gaId) return;

    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}', {
        page_title: document.title,
        page_location: window.location.href,
      });
    `;
    document.head.appendChild(script2);

    return () => {
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, [gaId]);

  useEffect(() => {
    if (!gaId || !window.gtag) return;

    const url = pathname + (searchParams ? `?${searchParams}` : '');
    
    window.gtag('config', gaId, {
      page_path: url,
      page_title: document.title,
    });
  }, [pathname, searchParams, gaId]);

  return null;
}

// Custom event tracking
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Specific tracking functions for the extension analytics site
export const analytics = {
  // Track extension views
  trackExtensionView: (extensionId: string, extensionName: string, category: string) => {
    trackEvent('extension_view', {
      extension_id: extensionId,
      extension_name: extensionName,
      category: category,
    });
  },

  // Track search queries
  trackSearch: (query: string, resultsCount: number) => {
    trackEvent('search', {
      search_term: query,
      results_count: resultsCount,
    });
  },

  // Track category browsing
  trackCategoryView: (category: string, extensionCount: number) => {
    trackEvent('category_view', {
      category: category,
      extension_count: extensionCount,
    });
  },

  // Track filter usage
  trackFilterView: (filterType: string, extensionCount: number) => {
    trackEvent('filter_view', {
      filter_type: filterType,
      extension_count: extensionCount,
    });
  },

  // Track outbound clicks to Chrome Web Store
  trackChromeStoreClick: (extensionId: string, extensionName: string) => {
    trackEvent('chrome_store_click', {
      extension_id: extensionId,
      extension_name: extensionName,
      outbound: true,
    });
  },

  // Track pagination
  trackPagination: (page: number, totalPages: number, context: string) => {
    trackEvent('pagination', {
      page_number: page,
      total_pages: totalPages,
      context: context,
    });
  },

  // Track user engagement time
  trackEngagement: (timeOnPage: number, pageType: string) => {
    trackEvent('engagement', {
      time_on_page: timeOnPage,
      page_type: pageType,
    });
  },

  // Track suggestion clicks in search
  trackSuggestionClick: (suggestionType: string, suggestionText: string) => {
    trackEvent('search_suggestion_click', {
      suggestion_type: suggestionType,
      suggestion_text: suggestionText,
    });
  },

  // Track performance metrics
  trackPerformance: (metric: string, value: number) => {
    trackEvent('performance', {
      metric_name: metric,
      metric_value: value,
    });
  },
};

// Performance monitoring component
export function PerformanceMonitor() {
  useEffect(() => {
    // Track Core Web Vitals
    if (typeof window !== 'undefined' && 'performance' in window) {
      // First Contentful Paint
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
            analytics.trackPerformance('first_contentful_paint', entry.startTime);
          }
        });
      });
      
      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (e) {
        // PerformanceObserver not supported
      }

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        analytics.trackPerformance('largest_contentful_paint', lastEntry.startTime);
      });
      
      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Not supported
      }

      // Track page load time
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        analytics.trackPerformance('page_load_time', loadTime);
      });

      // Track user engagement time
      let startTime = Date.now();
      const trackEngagementTime = () => {
        const timeOnPage = (Date.now() - startTime) / 1000; // in seconds
        if (timeOnPage > 10) { // Only track if user stayed for more than 10 seconds
          analytics.trackEngagement(timeOnPage, document.title);
        }
      };

      window.addEventListener('beforeunload', trackEngagementTime);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          trackEngagementTime();
          startTime = Date.now(); // Reset timer when page becomes visible again
        }
      });

      return () => {
        observer.disconnect();
        lcpObserver.disconnect();
        window.removeEventListener('beforeunload', trackEngagementTime);
      };
    }
  }, []);

  return null;
}

// Error tracking component
export function ErrorBoundaryAnalytics({ error, errorInfo }: { error: Error; errorInfo: any }) {
  useEffect(() => {
    trackEvent('exception', {
      description: error.message,
      fatal: false,
      error_stack: error.stack,
      component_stack: errorInfo?.componentStack,
    });
  }, [error, errorInfo]);

  return null;
}

// A/B testing helper
export function ABTest({ 
  testName, 
  variants, 
  userId 
}: { 
  testName: string; 
  variants: string[]; 
  userId?: string 
}) {
  const getVariant = (testName: string, userId?: string): string => {
    const seed = userId || 'anonymous';
    const hash = seed.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const variantIndex = Math.abs(hash) % variants.length;
    return variants[variantIndex];
  };

  useEffect(() => {
    const variant = getVariant(testName, userId);
    trackEvent('ab_test_exposure', {
      test_name: testName,
      variant: variant,
      user_id: userId || 'anonymous',
    });
  }, [testName, variants, userId]);

  return null;
}

// Conversion tracking
export const trackConversion = (conversionName: string, value?: number, currency = 'USD') => {
  trackEvent('conversion', {
    conversion_name: conversionName,
    value: value,
    currency: currency,
  });
};