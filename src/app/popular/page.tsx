import { Metadata } from 'next';
import { metadataGenerators } from '@/lib/seoHelpers';
import FilterPageClient from '../components/FilterPageClient';

export const metadata: Metadata = metadataGenerators.filter('popular');

export default function PopularExtensionsPage() {
  return (
    <FilterPageClient 
      filterType="popular"
      title="Most Popular Chrome Extensions"
      description="Discover the Chrome extensions with the most users and highest adoption rates"
      sortBy="users"
      sortOrder="desc"
    />
  );
}