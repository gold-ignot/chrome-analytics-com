import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '@/lib/api';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('top-rated');

interface TopRatedPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function TopRatedExtensionsPage({ searchParams }: TopRatedPageProps) {
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
    filterType: 'top-rated',
    title: 'Top Rated Chrome Extensions',
    description: 'Discover the highest rated Chrome extensions based on user reviews and ratings',
    sortBy: 'rating',
    sortOrder: 'desc'
  };

  try {
    let response;
    
    if (searchQuery.trim()) {
      response = await apiClient.searchExtensions(searchQuery, page, limit);
    } else {
      response = await apiClient.getExtensions(page, limit, 'rating', 'desc');
    }

    initialData = {
      ...initialData,
      extensions: response.extensions || [],
      total: response.total || 0,
      totalPages: Math.ceil((response.total || 0) / limit)
    };
  } catch (error) {
    console.error('Error fetching top-rated extensions server-side:', error);
    initialData.error = 'Failed to fetch extensions. Please try again later.';
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Page Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {initialData.title}
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            {initialData.description}
          </p>
        </div>
      </section>

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