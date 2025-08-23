'use client';

import { Metadata } from 'next';
import { useFilteredExtensions, useExtensionSearch, useExtensionFilters } from '@/hooks/useExtensions';
import { metadataGenerators, injectStructuredData, FILTER_TYPES } from '@/lib/seoHelpers';
import ExtensionListLayout from '@/components/layouts/ExtensionListLayout';
import { useEffect } from 'react';

// Generate static metadata
export const metadata: Metadata = metadataGenerators.filter('popular');

export default function PopularExtensionsPage() {
  // Use specialized hook for filtered extensions
  const extensionsData = useFilteredExtensions('popular');
  
  // Use search functionality
  const { searchQuery, isSearching, handleSearch, clearSearch } = useExtensionSearch();
  
  // Use filter state management
  const { sortBy, setSortBy, sortOrder, setSortOrder } = useExtensionFilters();
  
  // Override with popular-specific defaults
  useEffect(() => {
    setSortBy('users');
    setSortOrder('desc');
  }, [setSortBy, setSortOrder]);

  // Inject structured data when data is available
  useEffect(() => {
    if (extensionsData.total > 0) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: FILTER_TYPES.popular.title,
        description: FILTER_TYPES.popular.description,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/popular`,
        mainEntity: {
          '@type': 'ItemList',
          name: FILTER_TYPES.popular.title,
          description: FILTER_TYPES.popular.description,
          numberOfItems: extensionsData.total,
        },
      };

      const cleanup = injectStructuredData(structuredData);
      return cleanup;
    }
  }, [extensionsData.total]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: 'Most Popular', href: '/popular' },
  ];

  return (
    <ExtensionListLayout
      title={FILTER_TYPES.popular.title}
      description={FILTER_TYPES.popular.description}
      breadcrumbItems={breadcrumbItems}
      
      // Search
      searchQuery={searchQuery}
      onSearch={handleSearch}
      searchPlaceholder="Search popular extensions..."
      
      // Sorting (fixed for popular page)
      sortBy={sortBy}
      setSortBy={setSortBy}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
      
      // Data
      extensions={extensionsData.extensions}
      loading={extensionsData.loading}
      error={extensionsData.error}
      currentPage={extensionsData.currentPage}
      totalPages={extensionsData.totalPages}
      total={extensionsData.total}
      onPageChange={extensionsData.setCurrentPage}
      onExtensionClick={(extension) => {
        window.location.href = `/extension/${extension.extension_id}`;
      }}
      
      // State
      isSearching={isSearching}
      onClearSearch={clearSearch}
      onRetry={extensionsData.refetch}
      
      // Customization
      showFilters={true}
      showCategoryFilter={false}
      emptyStateMessage="No popular extensions available yet."
      emptySearchMessage={`No popular extensions match "${searchQuery}".`}
    />
  );
}