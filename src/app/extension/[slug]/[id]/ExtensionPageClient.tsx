'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Extension, GrowthMetrics, KeywordMetric } from '@/lib/api';
import { createExtensionSlug, slugToTitle, extensionUrls } from '@/lib/slugs';
import { breadcrumbPatterns } from '@/components/Breadcrumbs';
import { injectStructuredData } from '@/lib/seoHelpers';
import Breadcrumbs from '@/components/Breadcrumbs';
import Chart from '@/components/Chart';

interface ExtensionPageClientProps {
  slug: string;
  extensionId: string;
}

export default function ExtensionPageClient({ slug, extensionId }: ExtensionPageClientProps) {
  const router = useRouter();

  const [extension, setExtension] = useState<Extension | null>(null);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [keywords, setKeywords] = useState<KeywordMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError('Failed to load extension data');
      console.error('Error fetching extension data:', err);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  // Analytics calculations for deeper insights
  const calculateInsights = () => {
    if (!extension) return null;

    // Performance categorization
    const getPerformanceCategory = (users: number, rating: number) => {
      if (users >= 1000000 && rating >= 4.5) return { label: 'Excellent', color: 'emerald', icon: '🚀' };
      if (users >= 500000 && rating >= 4.0) return { label: 'Very Good', color: 'blue', icon: '⭐' };
      if (users >= 100000 && rating >= 3.5) return { label: 'Good', color: 'yellow', icon: '👍' };
      if (users >= 10000) return { label: 'Growing', color: 'orange', icon: '📈' };
      return { label: 'Starting', color: 'slate', icon: '🌱' };
    };

    const performance = getPerformanceCategory(extension.users, extension.rating);
    
    // Calculate percentiles
    const getUserPercentile = (users: number) => {
      if (users >= 1000000) return 99;
      if (users >= 500000) return 95;
      if (users >= 100000) return 85;
      if (users >= 50000) return 70;
      if (users >= 10000) return 50;
      return 20;
    };

    const userPercentile = getUserPercentile(extension.users);
    
    return {
      userGrowthRate: 0, // No historical data available
      ratingTrend: '0.00',
      performance,
      userPercentile,
      totalDataPoints: 0,
      timespan: 0,
      avgRating: extension.rating.toFixed(1),
      peakUsers: extension.users,
      hasGrowthData: false
    };
  };

  const insights = calculateInsights();

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

      {/* Main Content - Reuse most of the existing content from the old page */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Extension Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">
                    {extension.category}
                  </span>
                  {extension.subcategory && (
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded font-medium">
                      {extension.subcategory}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {extension.extension_id}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {extension.full_description || extension.description || 'No description available'}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {extension.users > 0 ? formatUsers(extension.users) : 'N/A'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Rating</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {extension.rating > 0 ? extension.rating.toFixed(1) : 'N/A'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reviews</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {extension.review_count > 0 ? extension.review_count.toLocaleString() : 'N/A'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Screenshots Gallery */}
          {extension.screenshots && extension.screenshots.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Screenshots</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {extension.screenshots.slice(0, 6).map((screenshot, index) => (
                  <div key={index} className="relative group cursor-pointer">
                    <img
                      src={screenshot}
                      alt={`${extension.name} screenshot ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 group-hover:shadow-lg transition-shadow"
                      onClick={() => window.open(screenshot, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              {extension.screenshots.length > 6 && (
                <p className="text-sm text-gray-500 mt-3">
                  Showing 6 of {extension.screenshots.length} screenshots
                </p>
              )}
            </div>
          )}

          {/* Extension Metadata */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Extension Details</h2>
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
                  <span className="text-sm font-medium text-gray-900">{formatDate(extension.last_updated_at)}</span>
                </div>
              )}
            </div>
            
            {/* Links */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-200">
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
                  <span>Website</span>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Support</span>
                </a>
              )}
              
              {extension.privacy_url && (
                <a 
                  href={extension.privacy_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Privacy Policy</span>
                </a>
              )}
            </div>
          </div>

          {/* Analytics Insights */}
          {insights && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Performance Insights</h2>
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full bg-${insights.performance.color}-100`}>
                  <span className="text-lg">{insights.performance.icon}</span>
                  <span className={`text-sm font-medium text-${insights.performance.color}-800`}>
                    {insights.performance.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* User Percentile */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="text-2xl font-bold text-blue-800">{insights.userPercentile}%</span>
                  </div>
                  <p className="text-sm text-blue-700 font-medium">User Base Percentile</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Outperforms {insights.userPercentile}% of extensions
                  </p>
                </div>

                {/* Growth Rate */}
                {insights.hasGrowthData && (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span className="text-2xl font-bold text-emerald-800">
                        {insights.userGrowthRate > 0 ? '+' : ''}{formatUsers(insights.userGrowthRate)}
                      </span>
                    </div>
                    <p className="text-sm text-emerald-700 font-medium">Daily Growth Rate</p>
                    <p className="text-xs text-emerald-600 mt-1">
                      Average users per day
                    </p>
                  </div>
                )}

                {/* Peak Performance */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-2xl font-bold text-purple-800">{formatUsers(insights.peakUsers)}</span>
                  </div>
                  <p className="text-sm text-purple-700 font-medium">Peak Users</p>
                  <p className="text-xs text-purple-600 mt-1">
                    Highest recorded user count
                  </p>
                </div>

                {/* Data Coverage */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-2xl font-bold text-orange-800">{insights.totalDataPoints}</span>
                  </div>
                  <p className="text-sm text-orange-700 font-medium">Data Points</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Over {Math.round(insights.timespan)} days
                  </p>
                </div>
              </div>

              {/* Trend Analysis */}
              {insights.hasGrowthData && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="text-md font-semibold text-slate-900 mb-4">Trend Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">User Growth</span>
                      </div>
                      <p className={`text-lg font-bold ${getGrowthColor(insights.userGrowthRate)}`}>
                        {insights.userGrowthRate > 0 ? 'Growing' : insights.userGrowthRate < 0 ? 'Declining' : 'Stable'}
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">Rating Trend</span>
                      </div>
                      <p className={`text-lg font-bold ${getGrowthColor(parseFloat(insights.ratingTrend))}`}>
                        {parseFloat(insights.ratingTrend) > 0 ? 'Improving' : parseFloat(insights.ratingTrend) < 0 ? 'Declining' : 'Stable'}
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">Average Rating</span>
                      </div>
                      <p className="text-lg font-bold text-slate-900">{insights.avgRating}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Market Position - Redesigned */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Market Position</h2>
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-sm text-slate-600 font-medium">{extension.category}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Market Ranking Card */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-indigo-900">Market Rank</h3>
                      <p className="text-xs text-indigo-700">vs similar extensions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-900">
                      {insights ? insights.userPercentile : 0}%
                    </div>
                    <div className="text-xs text-indigo-600 font-medium">
                      Top {100 - (insights ? insights.userPercentile : 0)}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${Math.min(insights ? insights.userPercentile : 0, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Adoption Level Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-900">User Adoption</h3>
                      <p className="text-xs text-emerald-700">{formatUsers(extension.users)} users</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-900">
                      {extension.users >= 1000000 ? 'Viral' : 
                       extension.users >= 100000 ? 'Popular' : 
                       extension.users >= 10000 ? 'Growing' : 'Emerging'}
                    </div>
                    <div className="flex items-center justify-end space-x-1">
                      {extension.users >= 1000000 ? (
                        <div className="flex space-x-0.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        </div>
                      ) : extension.users >= 100000 ? (
                        <div className="flex space-x-0.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></div>
                        </div>
                      ) : (
                        <div className="flex space-x-0.5">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Rating Card */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 border border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900">Quality Score</h3>
                      <p className="text-xs text-amber-700">User satisfaction</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-900">
                      {extension.rating >= 4.5 ? 'Excellent' : 
                       extension.rating >= 4.0 ? 'Very Good' : 
                       extension.rating >= 3.5 ? 'Good' : 'Improving'}
                    </div>
                    <div className="flex items-center justify-end space-x-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg 
                          key={star}
                          className={`w-3 h-3 ${star <= Math.round(extension.rating) ? 'text-amber-500' : 'text-amber-300'}`}
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-amber-700">
                  <span className="font-medium">{extension.rating.toFixed(1)}/5.0</span> from {extension.review_count?.toLocaleString() || 0} reviews
                </div>
              </div>
            </div>

            {/* Ranking Information */}
            {(extension.popularity_rank || extension.trending_rank || extension.top_rated_rank) && (
              <div className="pt-6 border-t border-slate-200">
                <h3 className="text-md font-semibold text-slate-900 mb-6">Global Rankings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Popular Extensions Ranking */}
                  {extension.popularity_rank && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-purple-900">Popular Rank</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-purple-200 text-purple-800 rounded-full font-medium">
                          #{extension.popularity_rank.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-purple-700">
                        Most popular extensions by user count
                      </div>
                    </div>
                  )}

                  {/* Trending Extensions Ranking */}
                  {extension.trending_rank && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-orange-900">Trending Rank</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-orange-200 text-orange-800 rounded-full font-medium">
                          #{extension.trending_rank.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-orange-700">
                        Most recently updated extensions
                      </div>
                    </div>
                  )}

                  {/* Top Rated Extensions Ranking */}
                  {extension.top_rated_rank && (
                    <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-pink-900">Top Rated Rank</span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-pink-200 text-pink-800 rounded-full font-medium">
                          #{extension.top_rated_rank.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-pink-700">
                        Highest rated extensions by quality
                      </div>
                    </div>
                  )}
                </div>
                {extension.ranked_at && (
                  <div className="mt-4 text-xs text-slate-500 text-center">
                    Rankings last updated: {new Date(extension.ranked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Performance Benchmarks */}
            <div className="pt-6">
              <h3 className="text-md font-semibold text-slate-900 mb-6">Performance Benchmarks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Base Comparison */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-blue-900">User Base</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full font-medium">
                      {extension.users >= 1000000 ? 'Top 1%' :
                       extension.users >= 500000 ? 'Top 5%' :
                       extension.users >= 100000 ? 'Top 15%' :
                       extension.users >= 10000 ? 'Top 50%' : 'Bottom 50%'}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min((extension.users / 1000000) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-blue-700">{formatUsers(extension.users)} total users</p>
                </div>

                {/* Rating Comparison */}
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-amber-900">Satisfaction</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded-full font-medium">
                      {extension.rating >= 4.5 ? 'Exceptional' :
                       extension.rating >= 4.0 ? 'Above Average' :
                       extension.rating >= 3.5 ? 'Average' : 'Below Average'}
                    </span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-3 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${(extension.rating / 5) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-amber-700">{extension.rating.toFixed(1)} out of 5 stars</p>
                </div>

                {/* Engagement Score */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium text-emerald-900">Engagement</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-emerald-200 text-emerald-800 rounded-full font-medium">
                      {(extension.review_count || 0) >= 10000 ? 'High' :
                       (extension.review_count || 0) >= 1000 ? 'Moderate' :
                       (extension.review_count || 0) >= 100 ? 'Low' : 'Minimal'}
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min(((extension.review_count || 0) / 10000) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-emerald-700">{extension.review_count?.toLocaleString() || 0} reviews</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Growth Metrics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Growth Metrics</h2>
              
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Historical Data</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Growth metrics require historical data tracking over time. This feature is not available with the current API.
                </p>
              </div>
            </div>

            {/* Keywords & Permissions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="space-y-6">
                {/* Keywords Section */}
                <div>
                  <h3 className="text-md font-semibold text-gray-900 mb-3">Keywords</h3>
                  {extension.keywords && extension.keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {extension.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No keywords available</p>
                  )}
                </div>

                {/* Features Section */}
                {extension.features && extension.features.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {extension.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supported Languages Section */}
                {extension.languages && extension.languages.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Supported Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {extension.languages.map((language, index) => (
                        <span
                          key={index}
                          className="text-xs px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200 font-medium"
                        >
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions Section */}
                {extension.permissions && extension.permissions.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-md font-semibold text-gray-900 mb-3">Permissions</h3>
                    <div className="space-y-2">
                      {extension.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="text-sm text-gray-700">{permission}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Historical Data Charts */}
          {false && (
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Chart
                  data={extension.snapshots}
                  type="users"
                  title="User Growth Over Time"
                  variant="area"
                />
                <Chart
                  data={extension.snapshots}
                  type="rating"
                  title="Rating Trends"
                  variant="line"
                />
              </div>
              {extension.snapshots.some(s => s.reviewCount > 0) && (
                <Chart
                  data={extension.snapshots}
                  type="reviews"
                  title="Review Count Growth"
                  variant="area"
                />
              )}
            </div>
          )}

        </div>
      </section>
    </div>
  );
}