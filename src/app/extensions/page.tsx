'use client';

import { useState, useEffect } from 'react';
import { apiClient, Extension, ExtensionResponse } from '@/lib/api';
import ExtensionCard from '@/components/ExtensionCard';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';

export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('users');
  const [sortOrder, setSortOrder] = useState('desc');

  const limit = 12;

  useEffect(() => {
    fetchExtensions();
  }, [currentPage, searchQuery, selectedCategory, sortBy, sortOrder]);

  const fetchExtensions = async () => {
    try {
      setLoading(true);
      setError(null);

      let response: ExtensionResponse;
      
      if (searchQuery.trim()) {
        setIsSearching(true);
        response = await apiClient.searchExtensions(searchQuery, currentPage, limit);
      } else {
        setIsSearching(false);
        response = await apiClient.getExtensions(currentPage, limit, sortBy, sortOrder, selectedCategory);
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
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExtensionClick = (extension: Extension) => {
    window.location.href = `/extension/${extension.extension_id}`;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Page Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            All Extensions
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Browse our complete database of Chrome Web Store extensions with real-time analytics
          </p>
          
          <div className="max-w-lg mx-auto">
            <SearchBar onSearch={handleSearch} initialValue={searchQuery} placeholder="Search extensions..." />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Results Info */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-gray-600">
              {loading ? (
                'Loading...'
              ) : (
                <>
                  {isSearching ? (
                    <>Found {total} result{total !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;</>
                  ) : (
                    <>{total} extension{total !== 1 ? 's' : ''} total</>
                  )}
                  {total > 0 && totalPages > 1 && (
                    <span className="text-gray-400 ml-2">
                      • Page {currentPage} of {totalPages}
                    </span>
                  )}
                </>
              )}
            </div>
            {isSearching && (
              <button
                onClick={() => handleSearch('')}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear search
              </button>
            )}
          </div>

          {/* Filters and Sorting */}
          {!isSearching && (
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Developer Tools">Developer Tools</option>
                  <option value="Communication">Communication</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="News & Weather">News & Weather</option>
                  <option value="Social & Communication">Social & Communication</option>
                  <option value="Accessibility">Accessibility</option>
                  <option value="Photos">Photos</option>
                  <option value="Search Tools">Search Tools</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="users">Most Users</option>
                  <option value="rating">Highest Rated</option>
                  <option value="reviews">Most Reviews</option>
                  <option value="recent">Recently Updated</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">High to Low</option>
                  <option value="asc">Low to High</option>
                </select>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200 mb-8">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load extensions</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={fetchExtensions}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-3"></div>
                  <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
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
                        onClick={() => handleExtensionClick(extension)}
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
                <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                  <div className="text-gray-400 mb-6">
                    <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.034 0-3.894.76-5.291 2.009M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-900 mb-2">
                    {isSearching ? 'No extensions found' : 'No extensions yet'}
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {isSearching 
                      ? `No extensions match "${searchQuery}". Try a different search term.`
                      : 'Extensions will appear here once they are added to the database.'
                    }
                  </p>
                  {isSearching && (
                    <button
                      onClick={() => handleSearch('')}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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