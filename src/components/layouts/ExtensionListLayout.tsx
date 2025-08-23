'use client';

import { ReactNode } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import ExtensionCard from '@/components/ExtensionCard';
import { Extension } from '@/lib/api';
import { ExtensionGridSkeleton } from '@/components/LoadingStates';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface FilterOption {
  value: string;
  label: string;
}

interface ExtensionListLayoutProps {
  // Page metadata
  title: string;
  description: string;
  breadcrumbItems: BreadcrumbItem[];
  
  // Search functionality
  searchQuery: string;
  onSearch: (query: string) => void;
  searchPlaceholder?: string;
  
  // Filter/Sort options
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  sortOrder: string;
  setSortOrder: (sortOrder: string) => void;
  sortOptions?: SortOption[];
  
  // Optional category filter
  selectedCategory?: string;
  setSelectedCategory?: (category: string) => void;
  categoryOptions?: FilterOption[];
  
  // Data & pagination
  extensions: Extension[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onExtensionClick: (extension: Extension) => void;
  
  // State flags
  isSearching: boolean;
  onClearSearch: () => void;
  onRetry: () => void;
  
  // Customization
  showFilters?: boolean;
  showCategoryFilter?: boolean;
  additionalFilters?: ReactNode;
  emptyStateMessage?: string;
  emptySearchMessage?: string;
}

const DEFAULT_SORT_OPTIONS: SortOption[] = [
  { value: 'users', label: 'Most Users' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'recent', label: 'Recently Updated' },
];

const DEFAULT_CATEGORY_OPTIONS: FilterOption[] = [
  { value: '', label: 'All Categories' },
  { value: 'Productivity', label: 'Productivity' },
  { value: 'Shopping', label: 'Shopping' },
  { value: 'Developer Tools', label: 'Developer Tools' },
  { value: 'Communication', label: 'Communication' },
  { value: 'Entertainment', label: 'Entertainment' },
  { value: 'News & Weather', label: 'News & Weather' },
  { value: 'Social & Communication', label: 'Social & Communication' },
  { value: 'Accessibility', label: 'Accessibility' },
  { value: 'Photos', label: 'Photos' },
  { value: 'Search Tools', label: 'Search Tools' },
];

export default function ExtensionListLayout({
  title,
  description,
  breadcrumbItems,
  searchQuery,
  onSearch,
  searchPlaceholder = "Search extensions...",
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  sortOptions = DEFAULT_SORT_OPTIONS,
  selectedCategory,
  setSelectedCategory,
  categoryOptions = DEFAULT_CATEGORY_OPTIONS,
  extensions,
  loading,
  error,
  currentPage,
  totalPages,
  total,
  onPageChange,
  onExtensionClick,
  isSearching,
  onClearSearch,
  onRetry,
  showFilters = true,
  showCategoryFilter = false,
  additionalFilters,
  emptyStateMessage,
  emptySearchMessage,
}: ExtensionListLayoutProps) {
  
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {/* Page Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {title}
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            {description}
          </p>
          
          <div className="max-w-lg mx-auto">
            <SearchBar 
              onSearch={onSearch} 
              initialValue={searchQuery} 
              placeholder={searchPlaceholder} 
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Results Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-slate-600">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  {isSearching ? (
                    <>Found {total} result{total !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</>
                  ) : (
                    <>{total} extension{total !== 1 ? 's' : ''}</>
                  )}
                  {total > 0 && totalPages > 1 && (
                    <span className="text-slate-400 ml-2">
                      • Page {currentPage} of {totalPages}
                    </span>
                  )}
                </>
              )}
            </div>
            {isSearching && (
              <button
                onClick={onClearSearch}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear search
              </button>
            )}
          </div>

          {/* Filters */}
          {showFilters && !isSearching && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border border-slate-200">
              {/* Category Filter */}
              {showCategoryFilter && setSelectedCategory && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {categoryOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Sort By */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Sort Order */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
              
              {/* Additional Filters */}
              {additionalFilters}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200 mb-8">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">Failed to load extensions</h3>
              <p className="text-slate-500 mb-4">{error}</p>
              <button
                onClick={onRetry}
                className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && <ExtensionGridSkeleton />}

          {/* Extensions Grid */}
          {!loading && !error && (
            <>
              {extensions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {extensions.map((extension, index) => (
                      <ExtensionCard
                        key={extension.extension_id}
                        extension={extension}
                        onClick={() => onExtensionClick(extension)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={onPageChange}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
                  <div className="text-slate-400 mb-6">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.894.76-5.291 2.009M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-slate-900 mb-2">
                    {isSearching ? 'No extensions found' : 'No extensions yet'}
                  </h3>
                  <p className="text-slate-500 mb-6 max-w-md mx-auto">
                    {isSearching 
                      ? (emptySearchMessage || `No extensions match "${searchQuery}". Try a different search term.`)
                      : (emptyStateMessage || 'Extensions will appear here once they are added to the database.')
                    }
                  </p>
                  {isSearching && (
                    <button
                      onClick={onClearSearch}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Browse All Extensions
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}