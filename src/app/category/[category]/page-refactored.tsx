'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { 
  metadataGenerators, 
  injectStructuredData, 
  CATEGORIES, 
  CATEGORY_DESCRIPTIONS,
  CategoryKey 
} from '@/lib/seoHelpers';
import { useExtensions, useExtensionSearch, useExtensionFilters } from '@/hooks/useExtensions';
import ExtensionListLayout from '@/components/layouts/ExtensionListLayout';

interface CategoryPageProps {
  params: {
    category: string;
  };
}

// Generate static metadata
export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = params;
  const categoryName = CATEGORIES[category as CategoryKey];
  
  if (!categoryName) {
    return {
      title: 'Category Not Found',
      description: 'The requested category does not exist.',
    };
  }
  
  return metadataGenerators.category(category, categoryName);
}

export default function CategoryPageRefactored({ params }: CategoryPageProps) {
  const { category } = params;
  const categoryName = CATEGORIES[category as CategoryKey];
  const categoryDescription = CATEGORY_DESCRIPTIONS[category as CategoryKey];
  
  if (!categoryName) {
    notFound();
  }

  // Use hooks for data fetching and state management
  const extensionsData = useExtensions({
    category: categoryName,
    sortBy: 'users',
    sortOrder: 'desc',
  });
  
  const { searchQuery, isSearching, handleSearch, clearSearch } = useExtensionSearch();
  const { sortBy, setSortBy, sortOrder, setSortOrder } = useExtensionFilters();

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
      searchQuery={searchQuery}
      onSearch={handleSearch}
      searchPlaceholder={`Search ${categoryName.toLowerCase()} extensions...`}
      
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
        window.location.href = `/extension/${extension.extension_id}`;
      }}
      
      // State
      isSearching={isSearching}
      onClearSearch={clearSearch}
      onRetry={extensionsData.refetch}
      
      // Customization
      showFilters={true}
      showCategoryFilter={false}
      emptyStateMessage={`No ${categoryName.toLowerCase()} extensions available yet.`}
      emptySearchMessage={`No ${categoryName.toLowerCase()} extensions match "${searchQuery}".`}
    />
  );
}

export async function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({
    category,
  }));
}