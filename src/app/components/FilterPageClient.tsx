'use client';

import { useEffect } from 'react';
import { injectStructuredData } from '@/lib/seoHelpers';
import { extensionUrls } from '@/lib/slugs';
import { useExtensionSearch, useFilteredExtensions } from '@/hooks/useExtensions';
import ExtensionListLayout from '@/components/layouts/ExtensionListLayout';

interface FilterPageClientProps {
  filterType: string;
  title: string;
  description: string;
}

export default function FilterPageClient({ 
  filterType, 
  title, 
  description
}: FilterPageClientProps) {
  // Use hooks for data fetching and state management
  const searchData = useExtensionSearch();
  const filteredData = useFilteredExtensions(filterType as 'popular' | 'top-rated' | 'trending');
  
  // Use filtered data when not searching, search data when searching
  const extensionsData = searchData.isSearching ? searchData : filteredData;

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
      searchQuery={searchData.searchQuery}
      onSearch={searchData.handleSearch}
      searchPlaceholder={`Search ${filterType} extensions...`}
      
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
      isSearching={searchData.isSearching}
      onClearSearch={searchData.clearSearch}
      onRetry={extensionsData.refetch}
      
      // Customization
      showCategoryFilter={true}
      emptyStateMessage={`No ${filterType} extensions available yet.`}
      emptySearchMessage={`No ${filterType} extensions match "${searchData.searchQuery}".`}
    />
  );
}