'use client';

import { lazy, Suspense, ReactNode, useEffect, useRef, useState } from 'react';
import { ExtensionCardSkeleton } from './LoadingStates';

// Lazy load heavy components
const Chart = lazy(() => import('./Chart'));

// Intersection Observer hook for lazy loading
export function useInView(options?: IntersectionObserverInit) {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || hasBeenInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          setHasBeenInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [hasBeenInView, options]);

  return { ref, isInView, hasBeenInView };
}

// Lazy loading wrapper component
export function LazyLoad({ 
  children, 
  fallback = null, 
  threshold = 0.1,
  rootMargin = '50px'
}: {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
}) {
  const { ref, hasBeenInView } = useInView({ threshold, rootMargin });

  return (
    <div ref={ref}>
      {hasBeenInView ? children : fallback}
    </div>
  );
}

// Lazy chart component with skeleton loader
export function LazyChart(props: any) {
  return (
    <LazyLoad 
      fallback={
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded mb-4 w-1/3"></div>
            <div className="h-64 bg-slate-100 rounded"></div>
          </div>
        </div>
      }
    >
      <Suspense fallback={
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-slate-200 rounded mb-4 w-1/3"></div>
            <div className="h-64 bg-slate-100 rounded"></div>
          </div>
        </div>
      }>
        <Chart {...props} />
      </Suspense>
    </LazyLoad>
  );
}

// Virtualized list component for large datasets
export function VirtualizedExtensionList({ 
  extensions, 
  onExtensionClick 
}: {
  extensions: any[];
  onExtensionClick: (extension: any) => void;
}) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeight = 300; // Approximate height of each extension card

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(
        start + Math.ceil(containerHeight / itemHeight) + 5, // Add buffer
        extensions.length
      );
      
      setVisibleRange({ start: Math.max(0, start - 5), end }); // Add buffer above too
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener('scroll', handleScroll);
  }, [extensions.length, itemHeight]);

  const visibleExtensions = extensions.slice(visibleRange.start, visibleRange.end);
  const totalHeight = extensions.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div 
      ref={containerRef}
      className="h-96 overflow-y-auto"
      style={{ height: '600px' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleExtensions.map((extension, index) => (
            <div
              key={extension.extension_id}
              style={{ height: itemHeight }}
              className="p-2"
            >
              <LazyLoad 
                fallback={<ExtensionCardSkeleton />}
                threshold={0.1}
              >
                {/* Your ExtensionCard component here */}
                <div 
                  onClick={() => onExtensionClick(extension)}
                  className="cursor-pointer h-full"
                >
                  {/* Extension card content */}
                </div>
              </LazyLoad>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Image lazy loading with fade-in effect
export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  fallback = '/placeholder-extension.png' 
}: {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [imageSrc, setImageSrc] = useState(fallback);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      setHasError(true);
      setImageSrc(fallback);
    };
    img.src = src;
  }, [src, fallback]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded && !hasError ? 'opacity-100' : 'opacity-75'
        } ${className}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setImageSrc(fallback);
        }}
      />
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-slate-200 animate-pulse"></div>
      )}
    </div>
  );
}

// Debounced input component
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Prefetch component for critical resources
export function PrefetchResources({ urls }: { urls: string[] }) {
  useEffect(() => {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });

    // Cleanup
    return () => {
      urls.forEach(url => {
        const link = document.querySelector(`link[href="${url}"]`);
        if (link) {
          document.head.removeChild(link);
        }
      });
    };
  }, [urls]);

  return null;
}

// Critical CSS inliner (for above-the-fold content)
export function CriticalStyles({ css }: { css: string }) {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = css;
    style.setAttribute('data-critical', 'true');
    document.head.appendChild(style);

    return () => {
      const criticalStyles = document.querySelectorAll('style[data-critical="true"]');
      criticalStyles.forEach(style => style.remove());
    };
  }, [css]);

  return null;
}

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Track CLS (Cumulative Layout Shift)
  let cls = 0;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        cls += (entry as any).value;
      }
    }
  }).observe({ type: 'layout-shift', buffered: true });

  // Track LCP (Largest Contentful Paint)
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('LCP:', lastEntry.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // Track FID (First Input Delay)
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FID:', (entry as any).processingStart - entry.startTime);
    }
  }).observe({ type: 'first-input', buffered: true });
}

// Preload critical routes
export function PreloadRoutes({ routes }: { routes: string[] }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const preloadRoute = (route: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.crossOrigin = 'anonymous';
      link.href = route;
      document.head.appendChild(link);
    };

    routes.forEach(preloadRoute);

    // Cleanup
    return () => {
      routes.forEach(route => {
        const link = document.querySelector(`link[href="${route}"]`);
        if (link) document.head.removeChild(link);
      });
    };
  }, [routes]);

  return null;
}