import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '@/lib/api';
import { metadataGenerators } from '@/lib/seoHelpers';
import TopRatedPageClient from './TopRatedPageClient';

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
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <TopRatedPageClient initialData={initialData} />
    </Suspense>
  );
}