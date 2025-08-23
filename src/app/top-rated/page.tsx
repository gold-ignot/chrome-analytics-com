import { Metadata } from 'next';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('top-rated');

export default function TopRatedExtensionsPage() {
  return (
    <FilterPageClient 
      filterType="top-rated"
      title="Top Rated Chrome Extensions"
      description="Discover the highest rated Chrome extensions based on user reviews and ratings"
      sortBy="rating"
      sortOrder="desc"
    />
  );
}