'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient, Extension, ExtensionResponse } from '@/lib/api';
import ExtensionCard from '@/components/ExtensionCard';
import SearchBar from '@/components/SearchBar';

export default function Home() {
  const [extensions, setExtensions] = useState<Extension[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalExtensions, setTotalExtensions] = useState(0);

  useEffect(() => {
    fetchFeaturedExtensions();
    
    // Auto-refresh every 10 seconds to show latest data
    const interval = setInterval(() => {
      fetchFeaturedExtensionsBackground();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchFeaturedExtensions = async () => {
    try {
      setLoading(true);
      setError(null);
      // Sort by users to get the most popular extensions
      const response = await apiClient.getExtensions(1, 6, 'users', 'desc');
      setExtensions(response.extensions || []);
      setTotalExtensions(response.total);
    } catch (err) {
      setError('Failed to fetch extensions');
      setExtensions([]);
      console.error('Error fetching extensions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedExtensionsBackground = async () => {
    try {
      // Background refresh without loading state - get popular extensions
      const response = await apiClient.getExtensions(1, 6, 'users', 'desc');
      setExtensions(response.extensions || []);
      setTotalExtensions(response.total);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error('Background refresh failed:', err);
      // Don't update error state for background refreshes
    }
  };

  const handleExtensionClick = (extension: Extension) => {
    window.location.href = `/extension/${extension.extension_id}`;
  };

  const handleSearch = (query: string) => {
    window.location.href = `/extensions?search=${encodeURIComponent(query)}`;
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Chrome Extension Analytics
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Track growth, analyze performance, and discover insights for Chrome Web Store extensions
          </p>
          
          <div className="max-w-lg mx-auto mb-8">
            <SearchBar onSearch={handleSearch} placeholder="Search for extensions..." />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/extensions"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Browse Extensions
            </Link>
            <Link
              href="/api"
              className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            >
              API Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Recent Extensions */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Recent Extensions
              </h2>
              <p className="text-gray-600 mt-1">
                Latest extensions added to our database
              </p>
            </div>
            <Link
              href="/extensions"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center"
            >
              View all
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
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
          ) : error ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-red-500 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load extensions</h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={fetchFeaturedExtensions}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : extensions && extensions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {extensions.map((extension) => (
                <ExtensionCard
                  key={extension.extension_id}
                  extension={extension}
                  onClick={() => handleExtensionClick(extension)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No extensions yet</h3>
              <p className="text-gray-500">Extensions will appear here once they are added to the database.</p>
            </div>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {totalExtensions.toLocaleString()}
              </div>
              <div className="text-gray-600">Extensions Tracked</div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                24/7
              </div>
              <div className="text-gray-600">Real-time Monitoring</div>
            </div>
            
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                API
              </div>
              <div className="text-gray-600">Access Available</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
