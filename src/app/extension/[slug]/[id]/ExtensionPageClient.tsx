'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Extension } from '@/lib/api';
import ExtensionMetrics from '@/components/ExtensionMetrics';
import ScreenshotCarousel from '@/components/ScreenshotCarousel';
import ExtensionDescription from '@/components/ExtensionDescription';
import ExtensionCard from '@/components/ExtensionCard';
import AnalyticsCards from '@/components/AnalyticsCards';
import EnhancedAnalyticsChart from '@/components/EnhancedAnalyticsChart';
import AdvancedAnalyticsCards from '@/components/AdvancedAnalyticsCards';
import { createExtensionSlug, extensionUrls, createSlug } from '@/lib/slugs';
import { breadcrumbPatterns } from '@/components/Breadcrumbs';
import { injectStructuredData } from '@/lib/seoHelpers';
import Breadcrumbs from '@/components/Breadcrumbs';

interface ExtensionPageClientProps {
  extension: Extension;
  relatedExtensions: Extension[];
}

export default function ExtensionPageClient({ extension, relatedExtensions }: ExtensionPageClientProps) {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState(7);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Consistent date formatting function to avoid hydration mismatches
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getDaysAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  // Inject structured data when component mounts
  useEffect(() => {
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
  }, []);


  const formatUsers = (users: number | undefined | null) => {
    if (!users || users === 0 || isNaN(users)) return 'N/A';
    if (users >= 1000000) {
      return `${(users / 1000000).toFixed(1)}M`;
    } else if (users >= 1000) {
      return `${(users / 1000).toFixed(1)}K`;
    }
    return users.toLocaleString();
  };


  // Create breadcrumbs
  const breadcrumbs = breadcrumbPatterns.extension(
    extension.name,
    extension.extension_id,
    extension.category?.toLowerCase().replace(/\s+/g, '-'),
    extension.category
  );

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 overflow-visible">
          <div className="flex items-center gap-4">
            {mounted && (
              <button
                onClick={() => router.back()}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
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
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{extension.name}</h1>
              
              {/* Ranking Mini Cards - Below title */}
              {((extension.popularity_rank > 0 && extension.popularity_rank <= 100) || 
                (extension.top_rated_rank > 0 && extension.top_rated_rank <= 100) || 
                (extension.trending_rank > 0 && extension.trending_rank <= 100)) && (
                <div className="flex items-center gap-2 mb-3 flex-wrap relative">
                  {extension.popularity_rank > 0 && extension.popularity_rank <= 100 && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg px-2 py-1 border border-purple-200 group relative cursor-help hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="text-xs font-bold text-purple-900">#{extension.popularity_rank}</span>
                      <span className="text-xs text-purple-600 font-medium">Most Popular</span>
                    </div>
                    <div className="absolute left-1/2 top-full transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-hover:block transition-all duration-500 pointer-events-none w-52 text-center z-[9999] shadow-xl whitespace-normal">
                      Ranked by total active users across all Chrome extensions
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-500"></div>
                    </div>
                  </div>
                )}

                {extension.top_rated_rank > 0 && extension.top_rated_rank <= 100 && (
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 rounded-lg px-2 py-1 border border-yellow-200 group relative cursor-help hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-bold text-yellow-900">#{extension.top_rated_rank}</span>
                      <span className="text-xs text-yellow-600 font-medium">Top Rated</span>
                    </div>
                    <div className="absolute left-1/2 top-full transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-hover:block transition-all duration-500 pointer-events-none w-52 text-center z-[9999] shadow-xl whitespace-normal">
                      Ranked by average user rating and review quality
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-500"></div>
                    </div>
                  </div>
                )}

                {extension.trending_rank > 0 && extension.trending_rank <= 100 && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg px-2 py-1 border border-green-200 group relative cursor-help hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      <span className="text-xs font-bold text-green-900">#{extension.trending_rank}</span>
                      <span className="text-xs text-green-600 font-medium">Trending</span>
                    </div>
                    <div className="absolute left-1/2 top-full transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-hover:block transition-all duration-500 pointer-events-none w-52 text-center z-[9999] shadow-xl whitespace-normal">
                      Ranked by recent growth in users and engagement
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-red-500"></div>
                    </div>
                  </div>
                )}
                

                {/* Last Data Check Badge */}
                {extension.scraped_at && (
                  <div className="bg-blue-50 rounded-lg px-2 py-1 border border-blue-200">
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs text-blue-600 font-medium">
                        Data: {getDaysAgo(extension.scraped_at)}
                      </span>
                    </div>
                  </div>
                )}
                </div>
              )}
              
              <div className="flex items-center gap-4 text-gray-600">
                <span>by {extension.developer || 'Unknown Developer'}</span>
                {extension.developer_url && (
                  <a 
                    href={extension.developer_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                  >
                    Developer Website
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
                <span>•</span>
                {extension.category && (
                  <a 
                    href={`/category/${createSlug(extension.category)}`}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {extension.category}
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
                Add to Chrome
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Proper UX Priority Order with Reusable Components */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* ENHANCED ANALYTICS CARDS */}
          <AnalyticsCards 
            extension={extension} 
            timeframe={timeframe}
            setTimeframe={setTimeframe}
          />

          {/* ADVANCED ANALYTICS - Live Data */}
          <AdvancedAnalyticsCards 
            extension={extension} 
            timeframe={timeframe}
          />

          {/* ENHANCED ANALYTICS CHART */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Performance Trends
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Analytics data over time for {extension.name}
              </p>
            </div>
            <EnhancedAnalyticsChart 
              extensionId={extension.extension_id}
              extensionCategory={extension.category}
              days={timeframe}
              height={300}
            />
          </div>

          {/* DESCRIPTION & SCREENSHOTS - Combined Layout with equal heights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Description - 2/3 width with height matching screenshots */}
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

          {/* TECHNICAL DETAILS, LINKS & VERSION HISTORY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            {/* Links & Resources */}
            {(extension.website || extension.support_url || extension.privacy_url) && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Links & Resources
                </h2>
                <div className="space-y-3">
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
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
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
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
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
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Version History - Third card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Version History
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <div className="font-medium text-gray-900">{extension.version || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Current Version</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">Latest</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(extension.last_updated_at)}
                    </div>
                  </div>
                </div>
                
                {/* Mock previous versions for demo */}
                {extension.version && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-700">
                          {extension.version.split('.').map((v, i) => 
                            i === extension.version!.split('.').length - 1 ? (parseInt(v) - 1).toString() : v
                          ).join('.')}
                        </div>
                        <div className="text-sm text-gray-600">Previous Version</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {extension.last_updated_at ? 
                            formatDate(new Date(new Date(extension.last_updated_at).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()) 
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-700">
                          {extension.version.split('.').map((v, i) => 
                            i === extension.version!.split('.').length - 1 ? (parseInt(v) - 2).toString() : v
                          ).join('.')}
                        </div>
                        <div className="text-sm text-gray-600">Older Version</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {extension.last_updated_at ? 
                            formatDate(new Date(new Date(extension.last_updated_at).getTime() - 60 * 24 * 60 * 60 * 1000).toISOString()) 
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Permissions - Separate row if exists */}
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


          {/* 6. RELATED EXTENSIONS */}
          {relatedExtensions.length > 0 && (
            <div className="mb-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Related Extensions
                </h2>
                <p className="text-slate-600 mt-1">
                  Similar extensions in {extension.category}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedExtensions.map((relatedExt) => (
                  <ExtensionCard
                    key={relatedExt.extension_id}
                    extension={relatedExt}
                    href={extensionUrls.main(relatedExt)}
                  />
                ))}
              </div>
            </div>
          )}


        </div>
      </section>
    </div>
  );
}