'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { apiClient, Extension, ExtensionResponse } from '@/lib/api';
import ExtensionCard from '@/components/ExtensionCard';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import Breadcrumb from '@/components/Breadcrumb';

interface BestPageProps {
  params: {
    type: string;
  };
}

// Long-tail keyword pages for better SEO
const BEST_TYPES = {
  'productivity-extensions': {
    title: 'Best Productivity Chrome Extensions',
    category: 'Productivity',
    description: 'Discover the best productivity Chrome extensions to boost your efficiency, manage tasks, and streamline your workflow.',
    keywords: ['best productivity extensions', 'productivity chrome extensions', 'task management extensions', 'time tracking extensions', 'workflow tools'],
  },
  'developer-extensions': {
    title: 'Best Developer Chrome Extensions',
    category: 'Developer Tools', 
    description: 'Essential Chrome extensions for developers, web designers, and programmers to enhance your coding workflow.',
    keywords: ['best developer extensions', 'web development tools', 'coding extensions', 'developer chrome extensions', 'programming tools'],
  },
  'shopping-extensions': {
    title: 'Best Shopping Chrome Extensions',
    category: 'Shopping',
    description: 'Top Chrome extensions for online shopping, price comparison, coupon finding, and deal alerts.',
    keywords: ['best shopping extensions', 'coupon extensions', 'price comparison tools', 'deal finder extensions', 'shopping chrome extensions'],
  },
  'ad-blockers': {
    title: 'Best Ad Blocker Chrome Extensions',
    category: 'Productivity',
    description: 'Most effective Chrome extensions for blocking ads, improving page loading speed, and enhancing browsing experience.',
    keywords: ['best ad blockers', 'ad blocking extensions', 'chrome ad blockers', 'popup blockers', 'ad blocker chrome'],
  },
  'password-managers': {
    title: 'Best Password Manager Chrome Extensions',
    category: 'Productivity',
    description: 'Secure and reliable Chrome extensions for password management, form filling, and account security.',
    keywords: ['best password managers', 'password manager extensions', 'secure password tools', 'password chrome extensions'],
  },
  'social-media-tools': {
    title: 'Best Social Media Chrome Extensions',
    category: 'Social & Communication',
    description: 'Chrome extensions to enhance your social media experience, schedule posts, and manage multiple accounts.',
    keywords: ['social media extensions', 'social media tools', 'social media chrome extensions', 'social media management'],
  },
  'grammar-checkers': {
    title: 'Best Grammar Checker Chrome Extensions',
    category: 'Productivity',
    description: 'Top Chrome extensions for grammar checking, spell checking, and writing improvement.',
    keywords: ['grammar checker extensions', 'writing tools', 'spell checker chrome', 'grammar chrome extensions', 'writing assistant'],
  },
  'screenshot-tools': {
    title: 'Best Screenshot Chrome Extensions',
    category: 'Photos',
    description: 'Powerful Chrome extensions for taking screenshots, screen recording, and image editing.',
    keywords: ['screenshot extensions', 'screen capture tools', 'screenshot chrome extensions', 'screen recording tools'],
  },
} as const;

export default function BestTypePage({ params }: BestPageProps) {
  const { type } = params;
  const typeInfo = BEST_TYPES[type as keyof typeof BEST_TYPES];
  
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState('users');
  const [sortOrder, setSortOrder] = useState('desc');

  const limit = 12;

  if (!typeInfo) {
    notFound();
  }

  useEffect(() => {
    fetchExtensions();
  }, [currentPage, searchQuery, sortBy, sortOrder, type]);

  const fetchExtensions = async () => {
    try {
      setLoading(true);
      setError(null);

      let response: ExtensionResponse;
      
      if (searchQuery.trim()) {
        setIsSearching(true);
        response = await apiClient.searchExtensions(searchQuery, currentPage, limit);
        // Filter by category on client side if searching
        response.extensions = response.extensions.filter(ext => 
          ext.category === typeInfo.category || 
          typeInfo.keywords.some(keyword => 
            ext.name.toLowerCase().includes(keyword.split(' ')[0]) ||
            ext.description.toLowerCase().includes(keyword.split(' ')[0])
          )
        );
      } else {
        setIsSearching(false);
        response = await apiClient.getExtensions(currentPage, limit, sortBy, sortOrder, typeInfo.category);
      }

      setExtensions(response.extensions);
      setTotal(response.total);
      setTotalPages(Math.ceil(response.total / limit));
    } catch (err) {
      setError('Failed to fetch extensions. Please try again later.');
      console.error('Error fetching extensions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExtensionClick = (extension: Extension) => {
    window.location.href = `/extension/${extension.extension_id}`;
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: typeInfo.title, href: `/best/${type}` },
  ];

  // Add structured data
  useEffect(() => {
    if (total > 0) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: typeInfo.title,
        description: typeInfo.description,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/best/${type}`,
        about: {
          '@type': 'Thing',
          name: typeInfo.category,
          description: typeInfo.description,
        },
        mainEntity: {
          '@type': 'ItemList',
          name: typeInfo.title,
          description: typeInfo.description,
          numberOfItems: total,
        },
      };

      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
      
      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, [total, type, typeInfo]);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      {/* Page Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {typeInfo.title}
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            {typeInfo.description}
          </p>
          
          <div className="max-w-lg mx-auto">
            <SearchBar 
              onSearch={handleSearch} 
              initialValue={searchQuery} 
              placeholder={`Search ${typeInfo.title.toLowerCase()}...`} 
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Results Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-slate-600">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  {isSearching ? (
                    <>Found {total} result{total !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</>
                  ) : (
                    <>{total} extension{total !== 1 ? 's' : ''}</>
                  )}
                  {total > 0 && totalPages > 1 && (
                    <span className="text-slate-400 ml-2">
                      • Page {currentPage} of {totalPages}
                    </span>
                  )}
                </>
              )}
            </div>
            {isSearching && (
              <button
                onClick={() => handleSearch('')}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear search
              </button>
            )}
          </div>

          {/* Sorting */}
          {!isSearching && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border border-slate-200">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="users">Most Users</option>
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviews</option>
                  <option value="recent">Recently Updated</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
          )}

          {/* Content sections same as category page... */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded mb-3"></div>
                  <div className="h-3 bg-slate-200 rounded mb-4 w-3/4"></div>
                  <div className="h-16 bg-slate-200 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && (
            <>
              {extensions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {extensions.map((extension) => (
                      <ExtensionCard
                        key={extension.extension_id}
                        extension={extension}
                        onClick={() => handleExtensionClick(extension)}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-400 mb-6">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.894.76-5.291 2.009M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 mb-2">
                    {isSearching ? 'No extensions found' : `No ${typeInfo.title.toLowerCase()} yet`}
                  </h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    {isSearching 
                      ? `No extensions match "${searchQuery}". Try a different search term.`
                      : `${typeInfo.title} will appear here once they are added to the database.`
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 mb-8">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load extensions</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <button
                onClick={fetchExtensions}
                className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export async function generateStaticParams() {
  return Object.keys(BEST_TYPES).map((type) => ({
    type,
  }));
}

export async function generateMetadata({ params }: BestPageProps): Promise<Metadata> {
  const { type } = params;
  const typeInfo = BEST_TYPES[type as keyof typeof BEST_TYPES];
  
  if (!typeInfo) {
    return {
      title: 'Page Not Found',
      description: 'The requested page does not exist.',
    };
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com';
  
  return {
    title: `${typeInfo.title} | Chrome Analytics`,
    description: typeInfo.description,
    keywords: typeInfo.keywords.join(', '),
    openGraph: {
      title: typeInfo.title,
      description: typeInfo.description,
      type: 'website',
      url: `${baseUrl}/best/${type}`,
      images: [`${baseUrl}/og-best-${type}.png`],
      siteName: 'Chrome Extension Analytics',
    },
    twitter: {
      card: 'summary_large_image',
      title: typeInfo.title,
      description: typeInfo.description,
      images: [`${baseUrl}/og-best-${type}.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}