'use client';

import Link from 'next/link';
// Inline chevron icon to avoid external dependencies
import { useEffect } from 'react';

interface BreadcrumbItem {
  label: string;
  href: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  // Inject structured data for breadcrumbs
  useEffect(() => {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}${item.href}`,
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    script.id = 'breadcrumb-structured-data';
    
    // Remove existing script if present
    const existing = document.getElementById('breadcrumb-structured-data');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('breadcrumb-structured-data');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [items]);

  if (!items || items.length <= 1) {
    return null;
  }

  return (
    <nav 
      className={`flex ${className}`} 
      aria-label="Breadcrumb"
      role="navigation"
    >
      <ol className="flex items-center space-x-2 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={`${item.href}-${index}`} className="flex items-center">
              {index > 0 && (
                <svg 
                  className="flex-shrink-0 w-4 h-4 text-slate-400 mx-2" 
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
              
              {isLast || item.current ? (
                <span 
                  className="text-slate-900 font-medium truncate"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-slate-500 hover:text-slate-700 transition-colors duration-150 truncate"
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Utility function to generate common breadcrumb patterns
export const breadcrumbPatterns = {
  // For category pages
  category: (category: string, categoryName: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: categoryName, href: `/category/${category}`, current: true },
  ],

  // For filter pages (popular, top-rated, trending)
  filter: (filterType: string, filterName: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: filterName, href: `/${filterType}`, current: true },
  ],

  // For "best" pages
  best: (bestType: string, bestName: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: bestName, href: `/best/${bestType}`, current: true },
  ],

  // For individual extension pages
  extension: (extensionName: string, extensionId: string, category?: string, categoryName?: string): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', href: '/' },
      { label: 'Extensions', href: '/extensions' },
    ];

    if (category && categoryName) {
      items.push({ label: categoryName, href: `/category/${category}` });
    }

    // Generate slug from extension name for the URL
    const slug = extensionName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60)
      .replace(/-+$/, '') || 'extension';

    items.push({ label: extensionName, href: `/extension/${slug}/${extensionId}`, current: true });
    
    return items;
  },

  // For search results
  search: (query: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: `Search: "${query}"`, href: `/search?q=${encodeURIComponent(query)}`, current: true },
  ],

  // For general pages
  simple: (pageName: string, href: string): BreadcrumbItem[] => [
    { label: 'Home', href: '/' },
    { label: pageName, href, current: true },
  ],
};