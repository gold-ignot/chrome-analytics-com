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
    fetchExtensionData();
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
      setLoading(true);
      setError(null);

      // Fetch extension details
      const extensionData = await apiClient.getExtension(extensionId);
      
      // Validate essential extension data
      if (!extensionData || !extensionData.name || !extensionData.extension_id) {
        setError('Extension not found');
        return;
      }

      // Check if slug matches the extension name (for SEO integrity)
      const expectedSlug = createExtensionSlug(extensionData);
      if (expectedSlug !== slug) {
        // Redirect to correct URL with proper slug
        const correctUrl = extensionUrls.main(extensionData);
        router.replace(correctUrl);
        return;
      }
      
      setExtension(extensionData);
      
      // Set keywords from extension data if available
      if (extensionData.keywords) {
        setKeywords(extensionData.keywords.map(keyword => ({ 
          keyword, 
          position: 0, 
          searchVolume: 0 
        })));
      }
      
      // Fetch related extensions from the same category
      await fetchRelatedExtensions(extensionData);
    } catch (err) {
      setError('Failed to load extension data');
      console.error('Error fetching extension data:', err);
    } finally {
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
          
          {/* 2. DESCRIPTION - What it does */}
          <ExtensionDescription 
            description={extension.description}
            fullDescription={extension.full_description}
          />
          
          {/* 3. SCREENSHOTS - How it looks */}
          <ScreenshotCarousel 
            screenshots={extension.screenshots || []} 
            extensionName={extension.name} 
          />

          {/* 4. RELATED EXTENSIONS */}
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

        </div>
      </section>
    </div>
  );
}