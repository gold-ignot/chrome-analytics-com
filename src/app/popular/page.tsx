import { Metadata } from 'next';
import { Suspense } from 'react';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('popular');

export default function PopularExtensionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <FilterPageClient 
        filterType="popular"
        title="Most Popular Chrome Extensions"
        description="Discover the Chrome extensions with the most users and highest adoption rates"
        sortBy="users"
        sortOrder="desc"
      />
    </Suspense>
  );
}