import { Metadata } from 'next';
import { Suspense } from 'react';
import { apiClient } from '@/lib/api';
import { metadataGenerators } from '@/lib/seoHelpers';
import PopularPageClient from './PopularPageClient';

export const metadata: Metadata = metadataGenerators.filter('popular');

interface PopularPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function PopularExtensionsPage({ searchParams }: PopularPageProps) {
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
    filterType: 'popular',
    title: 'Most Popular Chrome Extensions',
    description: 'Discover the Chrome extensions with the most users and highest adoption rates',
    sortBy: 'users',
    sortOrder: 'desc'
  };

  try {
    let response;
    
    if (searchQuery.trim()) {
      response = await apiClient.searchExtensions(searchQuery, page, limit);
    } else {
      response = await apiClient.getExtensions(page, limit, 'users', 'desc');
    }

    initialData = {
      ...initialData,
      extensions: response.extensions || [],
      total: response.total || 0,
      totalPages: Math.ceil((response.total || 0) / limit)
    };
  } catch (error) {
    console.error('Error fetching popular extensions server-side:', error);
    initialData.error = 'Failed to fetch extensions. Please try again later.';
  }

  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <PopularPageClient initialData={initialData} />
    </Suspense>
  );
}