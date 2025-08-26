import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '@/lib/api';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';
import HeroSection from '@/components/HeroSection';

export const metadata: Metadata = metadataGenerators.filter('trending');

interface TrendingPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function TrendingExtensionsPage({ searchParams }: TrendingPageProps) {
  const params = await searchParams;
  
  // Extract search parameters with defaults
  const page = parseInt(params.page || '1', 10);
  const searchQuery = params.search || '';
  const limit = 12;

  // Fetch initial data server-side
  let initialData = {
    extensions: [],
    total: 0,
    currentPage: page,
    totalPages: 0,
    error: null as string | null,
    searchQuery,
    isSearching: !!searchQuery,
    filterType: 'trending',
    title: 'Trending Chrome Extensions',
    description: 'Discover the Chrome extensions that are gaining popularity and growing rapidly',
    sortBy: 'recent',
    sortOrder: 'desc'
  };

  try {
    let response;
    
    if (searchQuery.trim()) {
      response = await apiClient.searchExtensions(searchQuery, page, limit);
    } else {
      response = await apiClient.getExtensions(page, limit, 'recent', 'desc');
    }

    initialData = {
      ...initialData,
      extensions: response.extensions || [],
      total: response.total || 0,
      totalPages: Math.ceil((response.total || 0) / limit)
    };
  } catch (error) {
    console.error('Error fetching trending extensions server-side:', error);
    initialData.error = 'Failed to fetch extensions. Please try again later.';
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <HeroSection
        title={initialData.title}
        description={initialData.description}
        searchable={true}
        searchPath="/trending"
        searchInitialValue={initialData.searchQuery}
        searchPlaceholder="Search trending extensions..."
        icon={
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
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
        <FilterPageClient initialData={initialData} />
      </Suspense>
    </div>
  );
}