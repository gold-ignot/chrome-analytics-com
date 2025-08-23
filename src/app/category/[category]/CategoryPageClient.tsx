'use client';

import { useEffect } from 'react';
import { 
  injectStructuredData, 
  CATEGORY_DESCRIPTIONS,
  CategoryKey 
} from '@/lib/seoHelpers';
import { extensionUrls } from '@/lib/slugs';
import { useExtensions, useExtensionSearch } from '@/hooks/useExtensions';
import ExtensionListLayout from '@/components/layouts/ExtensionListLayout';

interface CategoryPageClientProps {
  category: string;
  categoryName: string;
}

export default function CategoryPageClient({ category, categoryName }: CategoryPageClientProps) {
  const categoryDescription = CATEGORY_DESCRIPTIONS[category as CategoryKey];

  // Use hooks for data fetching and state management
  const searchData = useExtensionSearch();
  const extensionsData = useExtensions({
    category: categoryName,
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
        name: `${categoryName} Chrome Extensions`,
        description: categoryDescription,
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'}/category/${category}`,
        about: {
          '@type': 'Thing',
          name: categoryName,
          description: `Chrome extensions in the ${categoryName} category`,
        },
        mainEntity: {
          '@type': 'ItemList',
          name: `${categoryName} Chrome Extensions`,
          description: categoryDescription,
          numberOfItems: extensionsData.total,
        },
      };

      const cleanup = injectStructuredData(structuredData);
      return cleanup;
    }
  }, [extensionsData.total, categoryName, categoryDescription, category]);

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: categoryName, href: `/category/${category}` },
  ];

  return (
    <ExtensionListLayout
      title={`${categoryName} Extensions`}
      description={categoryDescription}
      breadcrumbItems={breadcrumbItems}
      
      // Search
      searchQuery={searchData.searchQuery}
      onSearch={searchData.handleSearch}
      searchPlaceholder={`Search ${categoryName.toLowerCase()} extensions...`}
      
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
      emptyStateMessage={`No ${categoryName.toLowerCase()} extensions available yet.`}
      emptySearchMessage={`No ${categoryName.toLowerCase()} extensions match "${searchData.searchQuery}".`}
    />
  );
}