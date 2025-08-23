'use client';

import { ReactNode } from 'react';

// Skeleton loader for extension cards
export function ExtensionCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
      {/* Header with icon and title */}
      <div className="flex items-start space-x-3 mb-3">
        <div className="w-8 h-8 bg-slate-200 rounded-lg flex-shrink-0"></div>
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-slate-200 rounded mb-2 w-3/4"></div>
          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
        </div>
      </div>
      
      {/* Category badge */}
      <div className="mb-3">
        <div className="h-6 bg-slate-200 rounded-full w-20"></div>
      </div>
      
      {/* Description */}
      <div className="mb-4">
        <div className="h-3 bg-slate-200 rounded mb-2 w-full"></div>
        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-2.5">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 bg-slate-200 rounded"></div>
              <div className="flex-1">
                <div className="h-2 bg-slate-200 rounded mb-1 w-8"></div>
                <div className="h-3 bg-slate-200 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Keywords */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-6 bg-slate-200 rounded w-16"></div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <div className="h-3 bg-slate-200 rounded w-20"></div>
          </div>
          <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
}

// Grid of skeleton loaders
export function ExtensionGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ExtensionCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Loading spinner component
export function LoadingSpinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={`inline-block ${className}`}>
      <svg 
        className={`animate-spin text-blue-500 ${sizeClasses[size]}`} 
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        ></circle>
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  );
}

// Pulse loading for text
export function TextSkeleton({ width = 'w-full', lines = 1 }: { width?: string; lines?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className={`h-4 bg-slate-200 rounded mb-2 ${width} ${i === lines - 1 ? 'mb-0' : ''}`}
        ></div>
      ))}
    </div>
  );
}

// Loading overlay
export function LoadingOverlay({ children, isLoading, className = '' }: { 
  children: ReactNode; 
  isLoading: boolean; 
  className?: string 
}) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center space-y-3">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-slate-600 font-medium">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Shimmer effect for cards
export function ShimmerCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gradient-to-r from-slate-200 via-slate-50 to-slate-200 bg-[length:200%_100%] animate-pulse rounded-lg ${className}`}>
      <div className="p-6 space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-slate-300 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-300 rounded w-3/4"></div>
            <div className="h-3 bg-slate-300 rounded w-1/2"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-300 rounded w-full"></div>
          <div className="h-3 bg-slate-300 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
}

// Progress bar component
export function ProgressBar({ 
  progress, 
  className = '',
  showPercentage = false,
  animated = true
}: { 
  progress: number; 
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
}) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-slate-700">Loading</div>
        {showPercentage && (
          <div className="text-xs font-medium text-slate-700">{Math.round(clampedProgress)}%</div>
        )}
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2">
        <div 
          className={`bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300 ${
            animated ? 'ease-out' : ''
          }`}
          style={{ width: `${clampedProgress}%` }}
        ></div>
      </div>
    </div>
  );
}

// Staggered fade-in animation wrapper
export function StaggeredFadeIn({ 
  children, 
  delay = 50, 
  className = '' 
}: { 
  children: ReactNode[]; 
  delay?: number; 
  className?: string 
}) {
  return (
    <div className={className}>
      {Array.isArray(children) ? children.map((child, index) => (
        <div
          key={index}
          className="animate-fadeIn"
          style={{
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'backwards'
          }}
        >
          {child}
        </div>
      )) : children}
    </div>
  );
}

// Pulse animation for interactive elements
export function PulseOnHover({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`transition-transform hover:scale-105 active:scale-95 ${className}`}>
      {children}
    </div>
  );
}

// Smooth height animation container
export function AnimatedHeight({ 
  children, 
  isExpanded, 
  className = '' 
}: { 
  children: ReactNode; 
  isExpanded: boolean; 
  className?: string 
}) {
  return (
    <div 
      className={`overflow-hidden transition-all duration-300 ease-in-out ${className}`}
      style={{
        maxHeight: isExpanded ? '1000px' : '0',
        opacity: isExpanded ? 1 : 0
      }}
    >
      {children}
    </div>
  );
}