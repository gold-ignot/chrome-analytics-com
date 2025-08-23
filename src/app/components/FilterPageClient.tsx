'use client';

import { useEffect } from 'react';
import { injectStructuredData } from '@/lib/seoHelpers';
import { extensionUrls } from '@/lib/slugs';
import { useFilteredExtensions, useExtensionSearch, useExtensionFilters } from '@/hooks/useExtensions';
import ExtensionListLayout from '@/components/layouts/ExtensionListLayout';

interface FilterPageClientProps {
  filterType: string;
  title: string;
  description: string;
  sortBy: string;
  sortOrder: string;
}

export default function FilterPageClient({ 
  filterType, 
  title, 
  description, 
  sortBy: defaultSortBy, 
  sortOrder: defaultSortOrder 
}: FilterPageClientProps) {
  // Use hooks for data fetching and state management
  const extensionsData = useFilteredExtensions(filterType);
  const { searchQuery, isSearching, handleSearch, clearSearch } = useExtensionSearch();
  const { sortBy, setSortBy, sortOrder, setSortOrder } = useExtensionFilters();

  // Set initial sort values
  useEffect(() => {
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
  }, [defaultSortBy, defaultSortOrder, setSortBy, setSortOrder]);

  // Inject structured data when data is available
  useEffect(() => {
    if (extensionsData.total > 0) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: title,
        description: description,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/${filterType}`,
        mainEntity: {
          '@type': 'ItemList',
          name: title,
          description: description,
          numberOfItems: extensionsData.total,
        },
      };

      const cleanup = injectStructuredData(structuredData);
      return cleanup;
    }
  }, [extensionsData.total, filterType, title, description]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: title.replace('Chrome Extensions', '').trim(), href: `/${filterType}` },
  ];

  return (
    <ExtensionListLayout
      title={title}
      description={description}
      breadcrumbItems={breadcrumbItems}
      
      // Search
      searchQuery={searchQuery}
      onSearch={handleSearch}
      searchPlaceholder={`Search ${filterType} extensions...`}
      
      // Sorting
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
        window.location.href = extensionUrls.main(extension);
      }}
      
      // State
      isSearching={isSearching}
      onClearSearch={clearSearch}
      onRetry={extensionsData.refetch}
      
      // Customization
      showFilters={true}
      showCategoryFilter={true}
      showRankingBadges={!isSearching}
      emptyStateMessage={`No ${filterType} extensions available yet.`}
      emptySearchMessage={`No ${filterType} extensions match "${searchQuery}".`}
    />
  );
}