'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Extension } from '@/lib/api';
import ExtensionMetrics from '@/components/ExtensionMetrics';
import ScreenshotCarousel from '@/components/ScreenshotCarousel';
import ExtensionDescription from '@/components/ExtensionDescription';
import { createExtensionSlug, extensionUrls } from '@/lib/slugs';
import { breadcrumbPatterns } from '@/components/Breadcrumbs';
import { injectStructuredData } from '@/lib/seoHelpers';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ExtensionPageClientProps {
  slug: string;
  extensionId: string;
}

export default function ExtensionPageClient({ slug, extensionId }: ExtensionPageClientProps) {
  const router = useRouter();

  const [extension, setExtension] = useState<Extension | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedExtensions, setRelatedExtensions] = useState<Extension[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  useEffect(() => {
    if (extensionId) {
      console.log('Fetching extension data for:', extensionId);
      fetchExtensionData();
    }
  }, [extensionId]);

  // Inject structured data when extension is available
  useEffect(() => {
    if (extension) {
      const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: extension.name,
        description: extension.description,
        applicationCategory: 'BrowserApplication',
        operatingSystem: 'Chrome',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        aggregateRating: extension.rating > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: extension.rating,
          ratingCount: extension.review_count || 1,
          bestRating: 5,
          worstRating: 1,
        } : undefined,
        author: {
          '@type': 'Organization',
          name: extension.developer || 'Unknown Developer',
        },
        datePublished: extension.published_at,
        dateModified: extension.last_updated_at,
        version: extension.version,
        downloadUrl: `https://chrome.google.com/webstore/detail/${extension.extension_id}`,
        screenshot: extension.screenshots,
        image: extension.logo_url,
      };

      const cleanup = injectStructuredData(structuredData);
      return cleanup;
    }
  }, [extension]);

  const fetchExtensionData = async () => {
    try {
      console.log('Setting loading to true');
      setLoading(true);
      setError(null);

      // Fetch extension details
      const extensionData = await apiClient.getExtension(extensionId);
      
      // Validate essential extension data
      if (!extensionData || !extensionData.name || !extensionData.extension_id) {
        setError('Extension not found');
        setLoading(false); // Stop loading on error
        return;
      }

      // Check if slug matches the extension name (for SEO integrity)
      const expectedSlug = createExtensionSlug(extensionData);
      if (expectedSlug !== slug) {
        // Redirect to correct URL with proper slug
        const correctUrl = extensionUrls.main(extensionData);
        router.replace(correctUrl);
        setLoading(false); // Stop loading before redirect
        return;
      }
      
      setExtension(extensionData);
      console.log('Setting loading to false - extension loaded');
      setLoading(false); // Set loading to false after extension data is loaded
      
      // Fetch related extensions from the same category (don't block main loading)
      fetchRelatedExtensions(extensionData);
    } catch (err) {
      setError('Failed to load extension data');
      console.error('Error fetching extension data:', err);
      console.log('Setting loading to false - error occurred');
      setLoading(false);
    }
  };

  const fetchRelatedExtensions = async (currentExtension: Extension) => {
    try {
      setRelatedLoading(true);
      
      // Get extensions from the same category, excluding current extension
      const response = await apiClient.getExtensions(1, 3, 'users', 'desc', currentExtension.category, [currentExtension.extension_id]);
        
      setRelatedExtensions(response.extensions);
    } catch (err) {
      console.error('Error fetching related extensions:', err);
      setRelatedExtensions([]);
    } finally {
      setRelatedLoading(false);
    }
  };

  const formatUsers = (users: number) => {
    if (users >= 1000000) {
      return `${(users / 1000000).toFixed(1)}M`;
    } else if (users >= 1000) {
      return `${(users / 1000).toFixed(1)}K`;
    }
    return users.toLocaleString();
  };


  // Create breadcrumbs
  const breadcrumbs = extension ? breadcrumbPatterns.extension(
    extension.name,
    extensionId,
    extension.category?.toLowerCase().replace(/\s+/g, '-'),
    extension.category
  ) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading extension details...</p>
        </div>
      </div>
    );
  }

  if (error || !extension) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Extension Not Found</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Extensions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {extension.logo_url && (
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200">
                <img 
                  src={extension.logo_url} 
                  alt={`${extension.name} logo`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{extension.name}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <span>by {extension.developer || 'Unknown Developer'}</span>
                {extension.developer_url && (
                  <a 
                    href={extension.developer_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Developer Website →
                  </a>
                )}
              </div>
            </div>

            {/* Chrome Web Store Link */}
            <div className="ml-auto">
              <a
                href={extensionUrls.store(extension.extension_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Add to Chrome
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Proper UX Priority Order with Reusable Components */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* 1. KEY METRICS FIRST - Most Important */}
          <ExtensionMetrics extension={extension} showRankings={true} />

          {/* 2. STATS CARDS - Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Users Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="text-2xl font-bold text-gray-900">{formatUsers(extension.users)}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">Total Users</p>
              {extension.popularity_rank && (
                <p className="text-xs text-blue-600 mt-1">#{extension.popularity_rank} Most Popular</p>
              )}
            </div>

            {/* Rating Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-2xl font-bold text-gray-900">{extension.rating.toFixed(1)}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">Average Rating</p>
              {extension.top_rated_rank && (
                <p className="text-xs text-yellow-600 mt-1">#{extension.top_rated_rank} Top Rated</p>
              )}
            </div>

            {/* Reviews Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span className="text-2xl font-bold text-gray-900">{formatUsers(extension.review_count)}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">User Reviews</p>
              <p className="text-xs text-green-600 mt-1">
                {((extension.review_count / extension.users) * 100).toFixed(2)}% engagement
              </p>
            </div>

            {/* Version Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-lg font-bold text-gray-900">{extension.version || 'N/A'}</span>
              </div>
              <p className="text-sm text-gray-600 font-medium">Current Version</p>
              {extension.last_updated_at && (
                <p className="text-xs text-purple-600 mt-1">
                  Updated {new Date(extension.last_updated_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          
          {/* 3. DESCRIPTION & SCREENSHOTS - Combined Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Description - 2/3 width */}
            <div className="lg:col-span-2">
              <ExtensionDescription 
                description={extension.description}
                fullDescription={extension.full_description}
              />
            </div>
            
            {/* Screenshots - 1/3 width */}
            <div className="lg:col-span-1">
              <ScreenshotCarousel 
                screenshots={extension.screenshots || []} 
                extensionName={extension.name} 
              />
            </div>
          </div>

          {/* 4. TECHNICAL DETAILS & PERMISSIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Permissions */}
            {extension.permissions && extension.permissions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Permissions Required
                </h2>
                <div className="flex flex-wrap gap-2">
                  {extension.permissions.map((permission, index) => (
                    <span 
                      key={index}
                      className="text-xs px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Technical Information
              </h2>
              <dl className="space-y-3">
                {extension.file_size && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Size</dt>
                    <dd className="text-sm font-medium text-gray-900">{extension.file_size}</dd>
                  </div>
                )}
                {extension.languages && extension.languages.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">Languages</dt>
                    <dd className="text-sm font-medium text-gray-900">{extension.languages.length} supported</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Extension ID</dt>
                  <dd className="text-xs font-mono text-gray-900">{extension.extension_id.slice(0, 12)}...</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* 5. USEFUL LINKS */}
          {(extension.website || extension.support_url || extension.privacy_url) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Links & Resources
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {extension.website && (
                  <a 
                    href={extension.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}
                {extension.support_url && (
                  <a 
                    href={extension.support_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Support
                  </a>
                )}
                {extension.privacy_url && (
                  <a 
                    href={extension.privacy_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Privacy Policy
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 6. RELATED EXTENSIONS */}
          {relatedExtensions.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Related Extensions
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Similar extensions in {extension.category}
                  </p>
                </div>
              </div>

              {relatedLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {relatedExtensions.map((relatedExt) => (
                    <div
                      key={relatedExt.extension_id}
                      onClick={() => router.push(`/extension/${createExtensionSlug(relatedExt.name)}/${relatedExt.extension_id}`)}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md cursor-pointer transition-all"
                    >
                      <div className="flex items-start space-x-3 mb-3">
                        {relatedExt.logo_url ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                            <img 
                              src={relatedExt.logo_url} 
                              alt={`${relatedExt.name} logo`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                            </svg>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">
                            {relatedExt.name}
                          </h3>
                          {/* Rankings */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {relatedExt.popularity_rank && relatedExt.popularity_rank <= 100 && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                #{relatedExt.popularity_rank} Popular
                              </span>
                            )}
                            {relatedExt.trending_rank && relatedExt.trending_rank <= 100 && (
                              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
                                #{relatedExt.trending_rank} Trending
                              </span>
                            )}
                            {relatedExt.top_rated_rank && relatedExt.top_rated_rank <= 100 && (
                              <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full font-medium">
                                #{relatedExt.top_rated_rank} Top Rated
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                        {relatedExt.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span>{formatUsers(relatedExt.users)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span>{relatedExt.rating > 0 ? relatedExt.rating.toFixed(1) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. TECHNICAL DETAILS - Less important info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Technical Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {extension.version && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-sm text-gray-600">Version:</span>
                  <span className="text-sm font-medium text-gray-900">{extension.version}</span>
                </div>
              )}
              
              {extension.file_size && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-gray-600">Size:</span>
                  <span className="text-sm font-medium text-gray-900">{extension.file_size}</span>
                </div>
              )}
              
              {extension.last_updated_at && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-600">Updated:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(extension.last_updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm text-gray-600">Category:</span>
                <span className="text-sm font-medium text-gray-900">{extension.category}</span>
              </div>

              {extension.subcategory && (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-sm text-gray-600">Subcategory:</span>
                  <span className="text-sm font-medium text-gray-900">{extension.subcategory}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                </svg>
                <span className="text-sm text-gray-600">Extension ID:</span>
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">{extension.extension_id}</code>
              </div>
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
              {extension.website && (
                <a 
                  href={extension.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  <span>Developer Website</span>
                </a>
              )}
              
              {extension.support_url && (
                <a 
                  href={extension.support_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Support</span>
                </a>
              )}

              <a
                href={extensionUrls.store(extension.extension_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Chrome Web Store</span>
              </a>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}