'use client';

import { useState, useEffect } from 'react';
import { Metadata } from 'next';
import { apiClient, Extension, ExtensionResponse } from '@/lib/api';
import ExtensionCard from '@/components/ExtensionCard';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import Breadcrumb from '@/components/Breadcrumb';
import { generateFilterSEO, generateMetadata } from '@/lib/seo';

export const metadata: Metadata = generateMetadata(generateFilterSEO('top-rated'));

export default function TopRatedExtensionsPage() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const limit = 12;

  useEffect(() => {
    fetchExtensions();
  }, [currentPage, searchQuery]);

  // Add structured data to the page
  useEffect(() => {
    if (total > 0) {
      const seoData = generateFilterSEO('top-rated', total);
      if (seoData.structuredData) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(seoData.structuredData);
        document.head.appendChild(script);
        
        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      }
    }
  }, [total]);

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
        response = await apiClient.getExtensions(currentPage, limit, 'rating', 'desc');
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

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Extensions', href: '/extensions' },
    { label: 'Top Rated', href: '/top-rated' },
  ];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      </div>

      {/* Page Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Top Rated Chrome Extensions
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Discover the highest quality Chrome extensions based on user ratings and reviews
          </p>
          
          <div className="max-w-lg mx-auto">
            <SearchBar 
              onSearch={handleSearch} 
              initialValue={searchQuery} 
              placeholder="Search top-rated extensions..." 
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
                    <>{total} extension{total !== 1 ? 's' : ''} sorted by rating</>
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
                onClick={() => handleSearch('')}
                className="text-sm text-slate-600 hover:text-slate-900 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear search
              </button>
            )}
          </div>

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
                onClick={fetchExtensions}
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
                    {extensions.map((extension, index) => (
                      <div key={extension.extension_id} className="relative">
                        {!isSearching && extension.rating >= 4.5 && (
                          <div className="absolute -top-2 -right-2 z-10">
                            <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              {extension.rating.toFixed(1)}
                            </div>
                          </div>
                        )}
                        <ExtensionCard
                          extension={extension}
                          onClick={() => handleExtensionClick(extension)}
                        />
                      </div>
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
                      onClick={() => handleSearch('')}
                      className="inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Browse All Top-Rated Extensions
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