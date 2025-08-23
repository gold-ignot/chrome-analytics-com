import { Metadata } from 'next';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('trending');

export default function TrendingExtensionsPage() {
  return (
    <FilterPageClient 
      filterType="trending"
      title="Trending Chrome Extensions"
      description="Discover the fastest growing and most trending Chrome extensions"
      sortBy="recent"
      sortOrder="desc"
    />
  );
}