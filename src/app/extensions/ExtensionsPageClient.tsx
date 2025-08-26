'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, Extension, ExtensionResponse } from '@/lib/api';
import { extensionUrls } from '@/lib/slugs';
import ExtensionCard from '@/components/ExtensionCard';
import Pagination from '@/components/Pagination';

interface InitialData {
  extensions: Extension[];
  total: number;
  currentPage: number;
  totalPages: number;
  error: string | null;
  searchQuery: string;
  selectedCategory: string;
  sortBy: string;
  sortOrder: string;
  isSearching: boolean;
}

interface ExtensionsPageClientProps {
  initialData: InitialData;
}

export default function ExtensionsPageClient({ initialData }: ExtensionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [extensions, setExtensions] = useState(initialData.extensions);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialData.error);
  const [currentPage, setCurrentPage] = useState(initialData.currentPage);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);
  const [total, setTotal] = useState(initialData.total);
  const [searchQuery, setSearchQuery] = useState(initialData.searchQuery);
  const [isSearching, setIsSearching] = useState(initialData.isSearching);
  const [selectedCategory, setSelectedCategory] = useState(initialData.selectedCategory);
  const [sortBy, setSortBy] = useState(initialData.sortBy);
  const [sortOrder, setSortOrder] = useState(initialData.sortOrder);

  const limit = 12;

  // Update URL parameters when state changes
  const updateURL = (updates: Partial<{
    page: number;
    search: string;
    category: string;
    sort: string;
    order: string;
  }>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 1 && value !== 'users' && value !== 'desc') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });

    const queryString = params.toString();
    const newUrl = queryString ? `/extensions?${queryString}` : '/extensions';
    router.push(newUrl);
  };

  const fetchExtensions = async (params?: {
    page?: number;
    search?: string;
    category?: string;
    sort?: string;
    order?: string;
  }) => {
    const {
      page = currentPage,
      search = searchQuery,
      category = selectedCategory,
      sort = sortBy,
      order = sortOrder
    } = params || {};

    try {
      setLoading(true);
      setError(null);

      let response: ExtensionResponse;
      
      if (search.trim()) {
        setIsSearching(true);
        response = await apiClient.searchExtensions(search, page, limit);
      } else {
        setIsSearching(false);
        response = await apiClient.getExtensions(page, limit, sort, order, category);
      }

      setExtensions(response.extensions);
      setTotal(response.total);
      setTotalPages(Math.ceil(response.total / limit));
    } catch (err) {
      setError('Failed to fetch extensions. Please try again later.');
      console.error('Error fetching extensions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    updateURL({ page: 1, search: query });
    fetchExtensions({ page: 1, search: query });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page });
    fetchExtensions({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
    updateURL({ page: 1, category });
    fetchExtensions({ page: 1, category });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
    updateURL({ page: 1, sort });
    fetchExtensions({ page: 1, sort });
  };

  const handleOrderChange = (order: string) => {
    setSortOrder(order);
    setCurrentPage(1);
    updateURL({ page: 1, order });
    fetchExtensions({ page: 1, order });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
    updateURL({ page: 1, search: '' });
    fetchExtensions({ page: 1, search: '' });
  };

  // Listen for URL changes and sync state
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const urlSearchQuery = params.get('search') || '';
    const urlPage = parseInt(params.get('page') || '1', 10);
    
    // If URL parameters differ from current state, sync them
    if (urlSearchQuery !== searchQuery || urlPage !== currentPage) {
      setSearchQuery(urlSearchQuery);
      setCurrentPage(urlPage);
      fetchExtensions({ page: urlPage, search: urlSearchQuery });
    }
  }, [searchParams]);

  return (
    <>
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
                    <>Found {total} result{total !== 1 ? 's' : ''} for "{searchQuery}"</>
                  ) : (
                    <>{total} extension{total !== 1 ? 's' : ''} total</>
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
                onClick={handleClearSearch}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear search
              </button>
            )}
          </div>

          {/* One-line Compact Filters */}
          {!isSearching && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-lg border border-slate-200">
              <div className="flex items-center text-sm font-medium text-slate-700">
                <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
                Filters:
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 text-sm cursor-pointer hover:border-slate-400 transition-colors"
              >
                <option value="">All Categories</option>
                <option value="Productivity">📋 Productivity</option>
                <option value="Shopping">🛒 Shopping</option>
                <option value="Developer Tools">⚡ Developer Tools</option>
                <option value="Communication">💬 Communication</option>
                <option value="Entertainment">🎮 Entertainment</option>
                <option value="News & Weather">📰 News & Weather</option>
                <option value="Social & Communication">👥 Social & Communication</option>
                <option value="Accessibility">♿ Accessibility</option>
                <option value="Photos">📸 Photos</option>
                <option value="Search Tools">🔍 Search Tools</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 text-sm cursor-pointer hover:border-slate-400 transition-colors"
              >
                <option value="users">👥 Most Users</option>
                <option value="rating">⭐ Highest Rated</option>
                <option value="reviews">💬 Most Reviews</option>
                <option value="recent">🆕 Recently Updated</option>
              </select>

              <div className="flex rounded-md border border-slate-300 overflow-hidden">
                <button
                  onClick={() => handleOrderChange('desc')}
                  className={`px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                    sortOrder === 'desc'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📈 High to Low
                </button>
                <button
                  onClick={() => handleOrderChange('asc')}
                  className={`px-3 py-2 text-sm font-medium transition-all cursor-pointer ${
                    sortOrder === 'asc'
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  📉 Low to High
                </button>
              </div>

              {(selectedCategory || sortBy !== 'users' || sortOrder !== 'desc') && (
                <>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSortBy('users');
                      setSortOrder('desc');
                      setCurrentPage(1);
                      updateURL({ page: 1, category: '', sort: 'users', order: 'desc' });
                      fetchExtensions({ page: 1, category: '', sort: 'users', order: 'desc' });
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                  >
                    <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                </>
              )}
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
                onClick={() => fetchExtensions()}
                className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded mb-3"></div>
                  <div className="h-3 bg-slate-200 rounded mb-4 w-3/4"></div>
                  <div className="h-16 bg-slate-200 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extensions Grid */}
          {!loading && !error && (
            <>
              {extensions.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {extensions.map((extension) => (
                      <ExtensionCard
                        key={extension.extension_id}
                        extension={extension}
                        href={extensionUrls.main(extension)}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
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
                      ? `No extensions match "${searchQuery}". Try a different search term.`
                      : 'Extensions will appear here once they are added to the database.'
                    }
                  </p>
                  {isSearching && (
                    <button
                      onClick={handleClearSearch}
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
    </>
  );
}