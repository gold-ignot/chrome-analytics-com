import { Extension } from './api';

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  canonical?: string;
  openGraph: {
    title: string;
    description: string;
    type: 'website' | 'article';
    url?: string;
    image?: string;
  };
  twitter: {
    card: 'summary' | 'summary_large_image';
    title: string;
    description: string;
    image?: string;
  };
  structuredData?: any;
}

// Base site information
export const SITE_CONFIG = {
  name: 'Chrome Extension Analytics',
  description: 'Track growth, analyze performance, and discover insights for Chrome Web Store extensions',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com',
  defaultImage: '/og-image.png',
};

// Generate SEO data for homepage
export function generateHomeSEO(): SEOData {
  return {
    title: 'Chrome Extension Analytics - Track Extension Performance & Growth',
    description: 'Discover the most popular Chrome extensions, track performance metrics, and analyze growth trends. Browse extensions by category and find the best tools for your browser.',
    keywords: [
      'chrome extensions',
      'browser extensions',
      'extension analytics',
      'chrome web store',
      'extension metrics',
      'browser tools',
      'productivity extensions',
      'developer tools'
    ],
    openGraph: {
      title: 'Chrome Extension Analytics - Track Extension Performance & Growth',
      description: 'Discover the most popular Chrome extensions, track performance metrics, and analyze growth trends.',
      type: 'website',
      url: SITE_CONFIG.baseUrl,
      image: `${SITE_CONFIG.baseUrl}${SITE_CONFIG.defaultImage}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Chrome Extension Analytics',
      description: 'Discover the most popular Chrome extensions and track their performance metrics.',
      image: `${SITE_CONFIG.baseUrl}${SITE_CONFIG.defaultImage}`,
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_CONFIG.name,
      description: SITE_CONFIG.description,
      url: SITE_CONFIG.baseUrl,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_CONFIG.baseUrl}/extensions?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  };
}

// Generate SEO data for category pages
export function generateCategorySEO(category: string, categoryDisplayName: string, extensionCount?: number): SEOData {
  const descriptions: Record<string, string> = {
    'productivity': 'Discover the best productivity Chrome extensions to boost your efficiency and streamline your workflow',
    'developer-tools': 'Essential Chrome extensions for developers, web designers, and programmers to enhance your development workflow',
    'shopping': 'Find the best shopping Chrome extensions for deals, price comparisons, and smarter online shopping',
    'communication': 'Top communication and messaging Chrome extensions to stay connected and collaborate effectively',
    'entertainment': 'Best entertainment Chrome extensions for games, videos, music, and fun browsing experiences',
    'news-weather': 'Stay informed with the best news and weather Chrome extensions for real-time updates',
    'social-communication': 'Enhance your social media experience with the best social communication Chrome extensions',
    'accessibility': 'Chrome extensions that make the web more accessible for everyone with disabilities',
    'photos': 'Best photo editing, sharing, and management Chrome extensions for visual content creators',
    'search-tools': 'Powerful search and research Chrome extensions to enhance your browsing and information discovery',
  };

  const keywords: Record<string, string[]> = {
    'productivity': ['productivity extensions', 'task management', 'time tracking', 'workflow tools', 'productivity apps'],
    'developer-tools': ['developer extensions', 'web development', 'debugging tools', 'code editors', 'dev tools'],
    'shopping': ['shopping extensions', 'price comparison', 'coupon finder', 'deal alerts', 'online shopping'],
    'communication': ['communication tools', 'messaging apps', 'video chat', 'team collaboration', 'chat extensions'],
    'entertainment': ['entertainment extensions', 'games', 'streaming', 'music players', 'video tools'],
    'news-weather': ['news extensions', 'weather apps', 'news reader', 'current events', 'weather forecast'],
    'social-communication': ['social media tools', 'social networking', 'social sharing', 'community tools'],
    'accessibility': ['accessibility tools', 'screen readers', 'vision assistance', 'disability support'],
    'photos': ['photo editors', 'image tools', 'photo sharing', 'image manipulation', 'visual tools'],
    'search-tools': ['search extensions', 'research tools', 'search enhancement', 'information discovery'],
  };

  const title = `Best ${categoryDisplayName} Chrome Extensions${extensionCount ? ` (${extensionCount}+ Extensions)` : ''} | Chrome Analytics`;
  const description = descriptions[category] || `Explore the best ${categoryDisplayName.toLowerCase()} Chrome extensions with detailed analytics and performance metrics.`;
  
  return {
    title,
    description,
    keywords: [
      ...(keywords[category] || []),
      'chrome extensions',
      categoryDisplayName.toLowerCase(),
      'browser extensions',
      'chrome web store',
      'extension analytics'
    ],
    canonical: `${SITE_CONFIG.baseUrl}/category/${category}`,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_CONFIG.baseUrl}/category/${category}`,
      image: `${SITE_CONFIG.baseUrl}/og-category-${category}.png`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${categoryDisplayName} Chrome Extensions`,
      description,
      image: `${SITE_CONFIG.baseUrl}/og-category-${category}.png`,
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${categoryDisplayName} Chrome Extensions`,
      description,
      url: `${SITE_CONFIG.baseUrl}/category/${category}`,
      about: {
        '@type': 'Thing',
        name: categoryDisplayName,
        description: `Chrome extensions in the ${categoryDisplayName} category`,
      },
      mainEntity: {
        '@type': 'ItemList',
        name: `${categoryDisplayName} Chrome Extensions`,
        description,
        numberOfItems: extensionCount || 0,
      },
    },
  };
}

// Generate SEO data for filter pages (popular, top-rated, trending)
export function generateFilterSEO(filter: 'popular' | 'top-rated' | 'trending', extensionCount?: number): SEOData {
  const filterData = {
    'popular': {
      title: `Most Popular Chrome Extensions${extensionCount ? ` (${extensionCount}+ Extensions)` : ''} | Chrome Analytics`,
      description: 'Discover the most popular Chrome extensions with millions of users. Find the most downloaded and widely-used browser extensions.',
      keywords: ['popular chrome extensions', 'most downloaded extensions', 'top extensions', 'best chrome extensions'],
      structuredDataName: 'Most Popular Chrome Extensions',
    },
    'top-rated': {
      title: `Top Rated Chrome Extensions${extensionCount ? ` (${extensionCount}+ Extensions)` : ''} | Chrome Analytics`,
      description: 'Explore the highest-rated Chrome extensions based on user reviews and ratings. Find quality extensions with excellent user satisfaction.',
      keywords: ['top rated extensions', 'best rated chrome extensions', 'highest rated extensions', 'quality extensions'],
      structuredDataName: 'Top Rated Chrome Extensions',
    },
    'trending': {
      title: `Trending Chrome Extensions${extensionCount ? ` (${extensionCount}+ Extensions)` : ''} | Chrome Analytics`,
      description: 'Discover trending and recently updated Chrome extensions. Find the latest and most innovative browser extensions gaining popularity.',
      keywords: ['trending extensions', 'new chrome extensions', 'latest extensions', 'recent extensions'],
      structuredDataName: 'Trending Chrome Extensions',
    },
  };

  const data = filterData[filter];
  
  return {
    title: data.title,
    description: data.description,
    keywords: [
      ...data.keywords,
      'chrome extensions',
      'browser extensions',
      'chrome web store',
      'extension analytics'
    ],
    canonical: `${SITE_CONFIG.baseUrl}/${filter}`,
    openGraph: {
      title: data.title,
      description: data.description,
      type: 'website',
      url: `${SITE_CONFIG.baseUrl}/${filter}`,
      image: `${SITE_CONFIG.baseUrl}/og-${filter}.png`,
    },
    twitter: {
      card: 'summary_large_image',
      title: data.structuredDataName,
      description: data.description,
      image: `${SITE_CONFIG.baseUrl}/og-${filter}.png`,
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: data.structuredDataName,
      description: data.description,
      url: `${SITE_CONFIG.baseUrl}/${filter}`,
      mainEntity: {
        '@type': 'ItemList',
        name: data.structuredDataName,
        description: data.description,
        numberOfItems: extensionCount || 0,
      },
    },
  };
}

// Generate SEO data for individual extension pages
export function generateExtensionSEO(extension: Extension): SEOData {
  const title = `${extension.name} - Chrome Extension Analytics & Performance Metrics`;
  const description = `Analyze ${extension.name} Chrome extension performance with ${extension.users.toLocaleString()} users and ${extension.rating.toFixed(1)} rating. Track growth trends and key metrics.`;
  
  return {
    title,
    description,
    keywords: [
      extension.name.toLowerCase(),
      extension.category.toLowerCase(),
      'chrome extension analytics',
      'extension metrics',
      'performance tracking',
      ...(extension.keywords || []).slice(0, 5),
    ],
    canonical: `${SITE_CONFIG.baseUrl}/extension/${extension.extension_id}`,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `${SITE_CONFIG.baseUrl}/extension/${extension.extension_id}`,
      image: extension.logo_url || `${SITE_CONFIG.baseUrl}${SITE_CONFIG.defaultImage}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: extension.name,
      description,
      image: extension.logo_url || `${SITE_CONFIG.baseUrl}${SITE_CONFIG.defaultImage}`,
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: extension.name,
      description: extension.description,
      url: `${SITE_CONFIG.baseUrl}/extension/${extension.extension_id}`,
      applicationCategory: extension.category,
      operatingSystem: 'Chrome Browser',
      author: {
        '@type': 'Person',
        name: extension.developer,
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: extension.rating,
        ratingCount: extension.review_count,
        bestRating: 5,
        worstRating: 1,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
  };
}

// Generate SEO data for extensions listing page
export function generateExtensionsListSEO(searchQuery?: string, category?: string, extensionCount?: number): SEOData {
  let title = 'Chrome Extensions Directory';
  let description = 'Browse thousands of Chrome extensions with detailed analytics and performance metrics.';
  
  if (searchQuery) {
    title = `Search Results for "${searchQuery}" - Chrome Extensions`;
    description = `Find Chrome extensions matching "${searchQuery}" with performance analytics and user ratings.`;
  } else if (category) {
    title = `${category} Chrome Extensions Directory`;
    description = `Browse ${category.toLowerCase()} Chrome extensions with detailed analytics and performance metrics.`;
  }
  
  if (extensionCount) {
    title += ` (${extensionCount}+ Extensions)`;
  }
  
  title += ' | Chrome Analytics';
  
  return {
    title,
    description,
    keywords: [
      'chrome extensions directory',
      'browser extensions',
      'chrome web store',
      'extension search',
      'extension analytics',
      ...(searchQuery ? [searchQuery] : []),
      ...(category ? [category] : []),
    ],
    canonical: `${SITE_CONFIG.baseUrl}/extensions`,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_CONFIG.baseUrl}/extensions`,
      image: `${SITE_CONFIG.baseUrl}${SITE_CONFIG.defaultImage}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Chrome Extensions Directory',
      description,
      image: `${SITE_CONFIG.baseUrl}${SITE_CONFIG.defaultImage}`,
    },
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Chrome Extensions Directory',
      description,
      url: `${SITE_CONFIG.baseUrl}/extensions`,
      mainEntity: {
        '@type': 'ItemList',
        name: 'Chrome Extensions',
        description,
        numberOfItems: extensionCount || 0,
      },
    },
  };
}