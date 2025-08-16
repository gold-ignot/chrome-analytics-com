'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, Extension, GrowthMetrics, KeywordMetric } from '@/lib/api';
import Breadcrumb from '@/components/Breadcrumb';
import Chart from '@/components/Chart';
// import { 
//   ArrowLeft, 
//   Users, 
//   Star, 
//   MessageSquare, 
//   TrendingUp, 
//   BarChart3, 
//   AlertCircle,
//   Loader2,
//   Tag
// } from 'lucide-react';

export default function ExtensionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const extensionId = params.id as string;

  const [extension, setExtension] = useState<Extension | null>(null);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [keywords, setKeywords] = useState<KeywordMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (extensionId) {
      fetchExtensionData();
    }
  }, [extensionId]);

  const fetchExtensionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch extension details, growth metrics, and keywords in parallel
      const [extResponse, growthResponse, keywordsResponse] = await Promise.allSettled([
        apiClient.getExtension(extensionId),
        apiClient.getGrowthMetrics(extensionId),
        apiClient.getKeywordPerformance(extensionId),
      ]);

      if (extResponse.status === 'fulfilled') {
        setExtension(extResponse.value);
      } else {
        throw new Error('Extension not found');
      }

      if (growthResponse.status === 'fulfilled') {
        setGrowthMetrics(growthResponse.value);
      }

      if (keywordsResponse.status === 'fulfilled') {
        setKeywords(keywordsResponse.value.keywords);
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
    if (!extension || !extension.snapshots.length) return null;

    const snapshots = extension.snapshots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = snapshots[snapshots.length - 1];
    const earliest = snapshots[0];
    
    // Growth rates
    const daysBetween = (new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24);
    const userGrowthRate = daysBetween > 0 ? ((latest.users - earliest.users) / daysBetween) : 0;
    const ratingTrend = latest.rating - earliest.rating;
    
    // Performance categorization
    const getPerformanceCategory = (users: number, rating: number) => {
      if (users >= 1000000 && rating >= 4.5) return { label: 'Excellent', color: 'emerald', icon: '🚀' };
      if (users >= 500000 && rating >= 4.0) return { label: 'Very Good', color: 'blue', icon: '⭐' };
      if (users >= 100000 && rating >= 3.5) return { label: 'Good', color: 'yellow', icon: '👍' };
      if (users >= 10000) return { label: 'Growing', color: 'orange', icon: '📈' };
      return { label: 'Starting', color: 'slate', icon: '🌱' };
    };

    const performance = getPerformanceCategory(extension.users, extension.rating);
    
    // Calculate percentiles (mock data for demonstration)
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
      userGrowthRate: Math.round(userGrowthRate),
      ratingTrend: ratingTrend.toFixed(2),
      performance,
      userPercentile,
      totalDataPoints: snapshots.length,
      timespan: daysBetween,
      avgRating: (snapshots.reduce((sum, s) => sum + s.rating, 0) / snapshots.length).toFixed(1),
      peakUsers: Math.max(...snapshots.map(s => s.users)),
      hasGrowthData: snapshots.length > 1
    };
  };

  const insights = calculateInsights();

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
      {/* Header */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/extensions')}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{extension.name}</h1>
              <p className="text-gray-600">by {extension.developer || 'Unknown Developer'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Extension Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded font-medium">
                    {extension.category}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {extension.extensionId}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  {extension.description || 'No description available'}
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
                    {extension.reviewCount > 0 ? extension.reviewCount.toLocaleString() : 'N/A'}
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
                  <span className="font-medium">{extension.rating.toFixed(1)}/5.0</span> from {extension.reviewCount.toLocaleString()} reviews
                </div>
              </div>
            </div>

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
                      {extension.reviewCount >= 10000 ? 'High' :
                       extension.reviewCount >= 1000 ? 'Moderate' :
                       extension.reviewCount >= 100 ? 'Low' : 'Minimal'}
                    </span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-3 mb-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${Math.min((extension.reviewCount / 10000) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-emerald-700">{extension.reviewCount.toLocaleString()} reviews</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Growth Metrics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Growth Metrics</h2>
              
              {extension.snapshots.length >= 2 ? (() => {
                const sortedSnapshots = extension.snapshots
                  .filter(s => s.users > 0 || s.rating > 0 || s.reviewCount > 0)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                if (sortedSnapshots.length < 2) {
                  return <p className="text-gray-500">Insufficient data for growth calculation</p>;
                }
                
                const latest = sortedSnapshots[sortedSnapshots.length - 1];
                const previous = sortedSnapshots[sortedSnapshots.length - 2];
                
                const userGrowth = latest.users - previous.users;
                const ratingChange = latest.rating - previous.rating;
                const reviewGrowth = latest.reviewCount - previous.reviewCount;
                
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                          <span className="text-sm font-medium text-blue-900">User Growth</span>
                        </div>
                        <div className={`text-xl font-bold ${getGrowthColor(userGrowth)}`}>
                          {userGrowth > 0 ? '+' : ''}{formatUsers(userGrowth)}
                        </div>
                        <p className="text-xs text-blue-700 mt-1">vs previous period</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm font-medium text-amber-900">Rating Change</span>
                        </div>
                        <div className={`text-xl font-bold ${getGrowthColor(ratingChange)}`}>
                          {ratingChange > 0 ? '+' : ''}{ratingChange.toFixed(1)}
                        </div>
                        <p className="text-xs text-amber-700 mt-1">vs previous period</p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className="text-sm font-medium text-emerald-900">Review Growth</span>
                        </div>
                        <div className={`text-xl font-bold ${getGrowthColor(reviewGrowth)}`}>
                          {reviewGrowth > 0 ? '+' : ''}{reviewGrowth.toLocaleString()}
                        </div>
                        <p className="text-xs text-emerald-700 mt-1">vs previous period</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        Comparing {formatDate(latest.date)} to {formatDate(previous.date)}
                      </p>
                    </div>
                  </div>
                );
              })() : (
                <p className="text-gray-500">No growth data available</p>
              )}
            </div>

            {/* Keywords */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Keywords</h2>
              
              {extension.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extension.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No keywords available</p>
              )}
            </div>
          </div>

          {/* Historical Data Charts */}
          {extension.snapshots.length > 0 && (
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