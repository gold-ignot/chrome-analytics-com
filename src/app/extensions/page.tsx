import { Suspense } from 'react';
import { Metadata } from 'next';
import { apiClient } from '@/lib/api';
import ExtensionsPageClient from './ExtensionsPageClient';
import HeroSection from '@/components/HeroSection';

export const metadata: Metadata = {
  title: 'All Chrome Extensions - Analytics & Insights',
  description: 'Browse our complete database of Chrome Web Store extensions with real-time analytics, user counts, ratings, and performance metrics.',
  keywords: 'chrome extensions, browser extensions, web store, extension analytics, extension metrics',
};

interface ExtensionsPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
    category?: string;
    sort?: string;
    order?: string;
  }>;
}

export default async function ExtensionsPage({ searchParams }: ExtensionsPageProps) {
  const params = await searchParams;
  
  // Extract search parameters with defaults
  const page = parseInt(params.page || '1', 10);
  const searchQuery = params.search || '';
  const selectedCategory = params.category || '';
  const sortBy = params.sort || 'users';
  const sortOrder = params.order || 'desc';
  const limit = 12;

  // Fetch initial data server-side
  let initialData = {
    extensions: [],
    total: 0,
    currentPage: page,
    totalPages: 0,
    error: null as string | null,
    searchQuery,
    selectedCategory,
    sortBy,
    sortOrder,
    isSearching: !!searchQuery
  };

  try {
    let response;
    
    if (searchQuery.trim()) {
      response = await apiClient.searchExtensions(searchQuery, page, limit);
    } else {
      response = await apiClient.getExtensions(page, limit, sortBy, sortOrder, selectedCategory);
    }

    initialData = {
      ...initialData,
      extensions: response.extensions || [],
      total: response.total || 0,
      totalPages: Math.ceil((response.total || 0) / limit)
    };
  } catch (error) {
    console.error('Error fetching extensions server-side:', error);
    initialData.error = 'Failed to fetch extensions. Please try again later.';
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Page Header */}
      <HeroSection
        title="All Extensions"
        description="Browse our complete database of Chrome Web Store extensions with real-time analytics"
        icon={
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        searchable={true}
        onSearch={(query) => {
          // This will be handled by ExtensionsPageClient
          const params = new URLSearchParams(window.location.search);
          if (query) {
            params.set('search', query);
            params.delete('page');
          } else {
            params.delete('search');
            params.delete('page');
          }
          const queryString = params.toString();
          const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
          window.location.href = newUrl;
        }}
        searchInitialValue={searchQuery}
        searchPlaceholder="Search all extensions..."
      />

      {/* Client-side interactive content */}
      <Suspense fallback={
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          </div>
        </section>
      }>
        <ExtensionsPageClient initialData={initialData} />
      </Suspense>
    </div>
  );
}