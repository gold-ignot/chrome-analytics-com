'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Extension } from '@/lib/api';
import ExtensionMetrics from '@/components/ExtensionMetrics';
import ScreenshotCarousel from '@/components/ScreenshotCarousel';
import ExtensionDescription from '@/components/ExtensionDescription';
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
          
          {/* CORE PERFORMANCE METRICS */}
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Core Performance Metrics
          </h2>
          
          {/* Active Cards with Real Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {/* Users Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
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
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
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
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="text-2xl font-bold text-gray-900">{formatUsers(extension.review_count)}</span>
                </div>
                <p className="text-sm text-gray-600 font-medium">User Reviews</p>
                <p className="text-xs text-green-600 mt-1">
                  {extension.users > 0 && extension.review_count > 0 ? ((extension.review_count / extension.users) * 100).toFixed(2) : '0.02'}% engagement
                </p>
              </div>

              {/* Version Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-lg font-bold text-gray-900">{extension.version || 'N/A'}</span>
                </div>
                <p className="text-sm text-gray-600 font-medium">Current Version</p>
                {extension.last_updated_at && (
                  <p className="text-xs text-purple-600 mt-1">
                    Updated {formatDate(extension.last_updated_at)}
                  </p>
                )}
              </div>

              {/* Update Frequency Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xl font-bold text-gray-900">
                    {extension.last_updated_at ? 
                      `${Math.floor((Date.now() - new Date(extension.last_updated_at).getTime()) / (1000 * 60 * 60 * 24))}d` 
                      : 'N/A'
                    }
                  </span>
                </div>
                <p className="text-sm text-gray-600 font-medium">Days Since Update</p>
                <p className="text-xs text-orange-600 mt-1">
                  {formatDate(extension.last_updated_at)}
                </p>
              </div>
            </div>

          {/* ADVANCED ANALYTICS - Coming Soon */}
          <h2 className="text-lg font-medium text-gray-500 mb-3 flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Advanced Analytics (Coming Soon)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {/* Monthly Growth Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Monthly Growth</p>
              <p className="text-xs text-gray-400 mt-1">Growth analytics</p>
            </div>

            {/* Category Ranking Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Category Ranking</p>
              <p className="text-xs text-gray-400 mt-1">vs competitors</p>
            </div>

            {/* Install Velocity Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Install Velocity</p>
              <p className="text-xs text-gray-400 mt-1">Weekly trends</p>
            </div>

            {/* Performance Score Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Performance Score</p>
              <p className="text-xs text-gray-400 mt-1">Overall rating</p>
            </div>

            {/* Version Analytics Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Version Analytics</p>
              <p className="text-xs text-gray-400 mt-1">Update patterns</p>
            </div>
          </div>

          {/* DESCRIPTION & SCREENSHOTS - Combined Layout with equal heights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Description - 2/3 width with height matching screenshots */}
            <div className="lg:col-span-2 h-[350px]">
              <ExtensionDescription 
                description={extension.description}
                fullDescription={extension.full_description}
              />
            </div>
            
            {/* Screenshots - 1/3 width */}
            <div className="lg:col-span-1 h-[350px]">
              <ScreenshotCarousel 
                screenshots={extension.screenshots || []} 
                extensionName={extension.name} 
              />
            </div>
          </div>

          {/* GROWTH ANALYTICS & CHARTS - Coming Soon */}
          <h2 className="text-lg font-medium text-gray-500 mb-3 flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Growth Analytics & Charts (Coming Soon)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Growth Charts Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Growth Charts</p>
              <p className="text-xs text-gray-400 mt-1">Historical trends</p>
            </div>

            {/* User Analytics Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">User Analytics</p>
              <p className="text-xs text-gray-400 mt-1">Acquisition data</p>
            </div>

            {/* Rating Trends Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Rating Trends</p>
              <p className="text-xs text-gray-400 mt-1">Rating analysis</p>
            </div>

            {/* Version History Card - Soon */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 opacity-60 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-2xl font-bold text-gray-400">Soon</span>
              </div>
              <p className="text-sm text-gray-500 font-medium">Version History</p>
              <p className="text-xs text-gray-400 mt-1">Update patterns</p>
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
            </div>
          )}


        </div>
      </section>
    </div>
  );
}