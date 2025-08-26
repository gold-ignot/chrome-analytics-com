import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { 
  metadataGenerators, 
  BEST_TYPES,
  BestTypeKey 
} from '@/lib/seoHelpers';
import { apiClient } from '@/lib/api';
import FilterPageClient from '../../components/FilterPageClient';
import HeroSection from '@/components/HeroSection';

interface BestPageProps {
  params: Promise<{
    type: string;
  }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

// Generate static metadata
export async function generateMetadata({ params }: BestPageProps): Promise<Metadata> {
  const { type } = await params;
  const typeInfo = BEST_TYPES[type as BestTypeKey];
  
  if (!typeInfo) {
    return {
      title: 'Page Not Found',
      description: 'The requested page does not exist.',
    };
  }
  
  return metadataGenerators.best(type, typeInfo);
}

export default async function BestPage({ params, searchParams }: BestPageProps) {
  const { type } = await params;
  const searchParamsObj = await searchParams;
  const typeInfo = BEST_TYPES[type as BestTypeKey];
  
  if (!typeInfo) {
    notFound();
  }

  // Extract search parameters with defaults
  const page = parseInt(searchParamsObj.page || '1', 10);
  const searchQuery = searchParamsObj.search || '';
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
    filterType: type,
    title: typeInfo.title,
    description: typeInfo.description,
    sortBy: 'users',
    sortOrder: 'desc'
  };

  try {
    let response;
    
    if (searchQuery.trim()) {
      response = await apiClient.searchExtensions(searchQuery, page, limit);
      // Filter by category if specified
      if (typeInfo.category) {
        response.extensions = response.extensions.filter(ext => ext.category === typeInfo.category);
        response.total = response.extensions.length;
      }
    } else {
      response = await apiClient.getExtensions(page, limit, 'users', 'desc', typeInfo.category);
    }

    initialData = {
      ...initialData,
      extensions: response.extensions || [],
      total: response.total || 0,
      totalPages: Math.ceil((response.total || 0) / limit)
    };
  } catch (error) {
    console.error(`Error fetching ${type} extensions server-side:`, error);
    initialData.error = 'Failed to fetch extensions. Please try again later.';
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <HeroSection
        title={initialData.title}
        description={initialData.description}
        searchable={true}
        searchPath={`/best/${type}`}
        searchInitialValue={initialData.searchQuery}
        searchPlaceholder={`Search ${typeInfo.title.toLowerCase()}...`}
        icon={
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

export async function generateStaticParams() {
  return Object.keys(BEST_TYPES).map((type) => ({
    type,
  }));
}