'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface LoadingBarProps {
  color?: string;
  height?: number;
}

export default function LoadingBar({ color = '#3b82f6', height = 3 }: LoadingBarProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    if (loading) {
      // Start progress animation
      setProgress(10);
      
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      // Auto-complete after 3 seconds if still loading
      timeoutId = setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          setProgress(0);
        }, 200);
      }, 3000);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) {
      setProgress(100);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 100);
    }
  }, [pathname]);

  // Listen for link clicks
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        const url = new URL(link.href);
        const isInternal = url.origin === window.location.origin;
        const isCurrentPage = url.pathname === pathname;
        
        if (isInternal && !isCurrentPage && !link.target) {
          setLoading(true);
          setProgress(0);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[9999]"
      style={{ height: `${height}px` }}
    >
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          backgroundColor: color,
          boxShadow: `0 0 10px ${color}40`,
        }}
      />
    </div>
  );
}