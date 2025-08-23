import { Metadata } from 'next';
import { Suspense } from 'react';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('trending');

export default function TrendingExtensionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <FilterPageClient 
        filterType="trending"
        title="Trending Chrome Extensions"
        description="Discover the fastest growing and most trending Chrome extensions"
        sortBy="recent"
        sortOrder="desc"
      />
    </Suspense>
  );
}