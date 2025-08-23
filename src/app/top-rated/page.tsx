import { Metadata } from 'next';
import { Suspense } from 'react';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('top-rated');

export default function TopRatedExtensionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <FilterPageClient 
        filterType="top-rated"
        title="Top Rated Chrome Extensions"
        description="Discover the highest rated Chrome extensions based on user reviews and ratings"
        sortBy="rating"
        sortOrder="desc"
      />
    </Suspense>
  );
}