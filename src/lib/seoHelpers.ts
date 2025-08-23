import { Metadata } from 'next';
import { 
  generateHomeSEO, 
  generateCategorySEO, 
  generateFilterSEO, 
  generateExtensionSEO,
  generateExtensionsListSEO,
  SEOData 
} from './seo';
import { Extension } from './api';

// Convert SEOData to Next.js Metadata format
export function seoDataToMetadata(seoData: SEOData): Metadata {
  return {
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords.join(', '),
    
    openGraph: {
      title: seoData.openGraph.title,
      description: seoData.openGraph.description,
      type: seoData.openGraph.type,
      url: seoData.openGraph.url,
      images: seoData.openGraph.image ? [seoData.openGraph.image] : [],
      siteName: 'Chrome Extension Analytics',
    },
    
    twitter: {
      card: seoData.twitter.card,
      title: seoData.twitter.title,
      description: seoData.twitter.description,
      images: seoData.twitter.image ? [seoData.twitter.image] : [],
    },
    
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
    
    alternates: seoData.canonical ? {
      canonical: seoData.canonical,
    } : undefined,
    
    other: {
      'revisit-after': '1 days',
    },
  };
}

// Simplified metadata generators
export const metadataGenerators = {
  home: () => seoDataToMetadata(generateHomeSEO()),
  
  category: (category: string, categoryDisplayName: string, extensionCount?: number) =>
    seoDataToMetadata(generateCategorySEO(category, categoryDisplayName, extensionCount)),
  
  filter: (filter: 'popular' | 'top-rated' | 'trending', extensionCount?: number) =>
    seoDataToMetadata(generateFilterSEO(filter, extensionCount)),
  
  extension: (extension: Extension) =>
    seoDataToMetadata(generateExtensionSEO(extension)),
  
  extensionsList: (searchQuery?: string, category?: string, extensionCount?: number) =>
    seoDataToMetadata(generateExtensionsListSEO(searchQuery, category, extensionCount)),
  
  // For "best" pages
  best: (type: string, typeInfo: { title: string; category: string; description: string; keywords: string[] }) => {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com';
    return {
      title: `${typeInfo.title} | Chrome Analytics`,
      description: typeInfo.description,
      keywords: typeInfo.keywords.join(', '),
      openGraph: {
        title: typeInfo.title,
        description: typeInfo.description,
        type: 'website' as const,
        url: `${baseUrl}/best/${type}`,
        images: [`${baseUrl}/og-best-${type}.png`],
        siteName: 'Chrome Extension Analytics',
      },
      twitter: {
        card: 'summary_large_image' as const,
        title: typeInfo.title,
        description: typeInfo.description,
        images: [`${baseUrl}/og-best-${type}.png`],
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  },
};

// Inject structured data into page
export function injectStructuredData(structuredData: any) {
  if (typeof window === 'undefined') return;
  
  // Remove existing structured data
  const existingScript = document.querySelector('script[data-structured-data]');
  if (existingScript) {
    existingScript.remove();
  }
  
  // Add new structured data
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-structured-data', 'true');
  script.textContent = JSON.stringify(structuredData);
  document.head.appendChild(script);
  
  return () => {
    const scriptToRemove = document.querySelector('script[data-structured-data]');
    if (scriptToRemove && document.head.contains(scriptToRemove)) {
      document.head.removeChild(scriptToRemove);
    }
  };
}

// Categories mapping for consistent use across components
export const CATEGORIES = {
  'productivity': 'Productivity',
  'shopping': 'Shopping',
  'developer-tools': 'Developer Tools',
  'communication': 'Communication',
  'entertainment': 'Entertainment',
  'news-weather': 'News & Weather',
  'social-communication': 'Social & Communication',
  'accessibility': 'Accessibility',
  'photos': 'Photos',
  'search-tools': 'Search Tools',
} as const;

export const CATEGORY_DESCRIPTIONS = {
  'productivity': 'Boost efficiency with productivity extensions',
  'shopping': 'Find deals, compare prices, and shop smarter',
  'developer-tools': 'Essential tools for developers and web professionals',
  'communication': 'Stay connected with communication and messaging tools',
  'entertainment': 'Games, videos, and fun extensions',
  'news-weather': 'Stay informed with news and weather updates',
  'social-communication': 'Social networking and communication tools',
  'accessibility': 'Make the web more accessible for everyone',
  'photos': 'Photo editing, sharing, and management tools',
  'search-tools': 'Enhance your search experience',
} as const;

// "Best" types for long-tail keyword pages
export const BEST_TYPES = {
  'productivity-extensions': {
    title: 'Best Productivity Chrome Extensions',
    category: 'Productivity',
    description: 'Boost efficiency, manage tasks, and streamline your workflow with productivity extensions.',
    keywords: ['best productivity extensions', 'productivity chrome extensions', 'task management extensions', 'time tracking extensions', 'workflow tools'],
  },
  'developer-extensions': {
    title: 'Best Developer Chrome Extensions',
    category: 'Developer Tools', 
    description: 'Essential tools for developers, web designers, and programmers to enhance coding workflows.',
    keywords: ['best developer extensions', 'web development tools', 'coding extensions', 'developer chrome extensions', 'programming tools'],
  },
  'shopping-extensions': {
    title: 'Best Shopping Chrome Extensions',
    category: 'Shopping',
    description: 'Find deals, compare prices, get coupons, and receive alerts for online shopping.',
    keywords: ['best shopping extensions', 'coupon extensions', 'price comparison tools', 'deal finder extensions', 'shopping chrome extensions'],
  },
  'ad-blockers': {
    title: 'Best Ad Blocker Chrome Extensions',
    category: '', // Remove category filter to show all extensions
    description: 'Block ads, improve page loading speed, and enhance your browsing experience.',
    keywords: ['best ad blockers', 'ad blocking extensions', 'chrome ad blockers', 'popup blockers', 'ad blocker chrome'],
  },
  'password-managers': {
    title: 'Best Password Manager Chrome Extensions',
    category: 'Productivity',
    description: 'Secure password management, form filling, and account security tools.',
    keywords: ['best password managers', 'password manager extensions', 'secure password tools', 'password chrome extensions'],
  },
  'social-media-tools': {
    title: 'Best Social Media Chrome Extensions',
    category: 'Social & Communication',
    description: 'Enhance social media experience, schedule posts, and manage multiple accounts.',
    keywords: ['social media extensions', 'social media tools', 'social media chrome extensions', 'social media management'],
  },
  'grammar-checkers': {
    title: 'Best Grammar Checker Chrome Extensions',
    category: 'Productivity',
    description: 'Grammar checking, spell checking, and writing improvement tools.',
    keywords: ['grammar checker extensions', 'writing tools', 'spell checker chrome', 'grammar chrome extensions', 'writing assistant'],
  },
  'screenshot-tools': {
    title: 'Best Screenshot Chrome Extensions',
    category: 'Photos',
    description: 'Take screenshots, record screens, and edit images with powerful tools.',
    keywords: ['screenshot extensions', 'screen capture tools', 'screenshot chrome extensions', 'screen recording tools'],
  },
} as const;

// Filter types with metadata
export const FILTER_TYPES = {
  popular: {
    title: 'Most Popular Chrome Extensions',
    description: 'Discover the most popular Chrome extensions with millions of users.',
    sortBy: 'users',
    sortOrder: 'desc' as const,
  },
  'top-rated': {
    title: 'Top Rated Chrome Extensions', 
    description: 'Explore the highest-rated Chrome extensions based on user reviews.',
    sortBy: 'rating',
    sortOrder: 'desc' as const,
  },
  trending: {
    title: 'Trending Chrome Extensions',
    description: 'Discover trending and recently updated Chrome extensions.',
    sortBy: 'recent',
    sortOrder: 'desc' as const,
  },
} as const;

// Type exports for better TypeScript support
export type CategoryKey = keyof typeof CATEGORIES;
export type BestTypeKey = keyof typeof BEST_TYPES;
export type FilterTypeKey = keyof typeof FILTER_TYPES;