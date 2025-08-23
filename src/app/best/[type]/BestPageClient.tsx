'use client';

import { useEffect } from 'react';
import { 
  injectStructuredData
} from '@/lib/seoHelpers';
import { extensionUrls } from '@/lib/slugs';
import { useExtensions, useExtensionSearch } from '@/hooks/useExtensions';
import ExtensionListLayout from '@/components/layouts/ExtensionListLayout';

interface BestPageClientProps {
  type: string;
  typeInfo: {
    title: string;
    category: string;
    description: string;
    keywords: readonly string[];
  };
}

export default function BestPageClient({ type, typeInfo }: BestPageClientProps) {
  // Use hooks for data fetching and state management  
  const searchData = useExtensionSearch();
  const extensionsData = useExtensions({
    category: typeInfo.category,
    sortBy: 'users',
    sortOrder: 'desc',
    searchQuery: searchData.searchQuery,
  });

  // Inject structured data when data is available
  useEffect(() => {
    if (extensionsData.total > 0) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: typeInfo.title,
        description: typeInfo.description,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/best/${type}`,
        about: {
          '@type': 'Thing',
          name: typeInfo.category,
          description: typeInfo.description,
        },
        mainEntity: {
          '@type': 'ItemList',
          name: typeInfo.title,
          description: typeInfo.description,
          numberOfItems: extensionsData.total,
        },
      };

      const cleanup = injectStructuredData(structuredData);
      return cleanup;
    }
  }, [extensionsData.total, type, typeInfo]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: typeInfo.title, href: `/best/${type}` },
  ];

  return (
    <ExtensionListLayout
      title={typeInfo.title}
      description={typeInfo.description}
      breadcrumbItems={breadcrumbItems}
      
      // Search
      searchQuery={searchData.searchQuery}
      onSearch={searchData.handleSearch}
      searchPlaceholder={`Search ${typeInfo.title.toLowerCase()}...`}
      
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
      showCategoryFilter={false}
      emptyStateMessage={`No ${typeInfo.title.toLowerCase()} available yet.`}
      emptySearchMessage={`No extensions match "${searchData.searchQuery}".`}
    />
  );
}