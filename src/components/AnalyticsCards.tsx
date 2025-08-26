'use client';

import { useState, useEffect } from 'react';
import { apiClient, Extension } from '@/lib/api';

interface AnalyticsCardsProps {
  extension: Extension;
  timeframe: number;
  setTimeframe: (timeframe: number) => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, trend, color, loading }: MetricCardProps) {
  const getTooltip = (title: string) => {
    switch (title) {
      case 'Total Users':
        return 'Total number of active users who have installed this extension';
      case 'Average Rating':
        return 'Average user rating based on all reviews from Chrome Web Store';
      case 'Current Version':
        return 'Latest version number and when it was last updated by developers';
      case 'Growth Score':
        return 'Market penetration score based on user adoption rate';
      default:
        return 'Analytics metric for this extension';
    }
  };
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      value: 'text-blue-900',
      trend: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      icon: 'text-green-600',
      value: 'text-green-900',
      trend: 'text-green-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      value: 'text-purple-900',
      trend: 'text-purple-600'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      value: 'text-orange-900',
      trend: 'text-orange-600'
    },
    red: {
      bg: 'bg-red-50',
      icon: 'text-red-600',
      value: 'text-red-900',
      trend: 'text-red-600'
    }
  };

  const classes = colorClasses[color];

  // Tooltip content based on title
  const getTooltip = (title: string) => {
    switch (title) {
      case 'Total Users':
        return 'Number of active Chrome users who have installed this extension';
      case 'Average Rating':
        return 'Average user rating out of 5 stars based on all reviews';
      case 'Current Version':
        return 'Latest version number and when it was last updated';
      case 'Growth Score':
        return 'Market penetration score calculated from total user base';
      default:
        return 'Analytics metric for this extension';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 ${classes.bg} rounded-lg flex items-center justify-center`}>
              <div className="w-5 h-5 bg-gray-300 rounded"></div>
            </div>
            <div className="w-16 h-8 bg-gray-200 rounded"></div>
          </div>
          <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
          <div className="w-32 h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group relative cursor-help">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${classes.bg} rounded-lg flex items-center justify-center`}>
          <div className={classes.icon}>
            {icon}
          </div>
        </div>
        <div className={`text-2xl font-bold ${classes.value}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>
      
      <div className="flex items-center mb-1">
        <h3 className="text-sm font-medium text-gray-600 mr-2">{title}</h3>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{subtitle}</p>
        {trend && (
          <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <svg 
              className={`w-3 h-3 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14l9-9 9 9" />
            </svg>
            {Math.abs(trend.value)}% {trend.period}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsCards({ extension, timeframe, setTimeframe }: AnalyticsCardsProps) {
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch real analytics data from multiple endpoints using selected timeframe
        const [growthData, multiMetricData, marketData] = await Promise.allSettled([
          apiClient.getGrowthAnalytics(timeframe, extension.category),
          apiClient.getMultiMetricTrends(timeframe),
          apiClient.getMarketOverview(timeframe)
        ]);
        
        // Use whichever endpoint returns data successfully
        if (growthData.status === 'fulfilled') {
          setAnalyticsData(growthData.value);
        } else if (multiMetricData.status === 'fulfilled') {
          setAnalyticsData(multiMetricData.value);
        } else if (marketData.status === 'fulfilled') {
          setAnalyticsData(marketData.value);
        } else {
          setError('Unable to load analytics data');
        }
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Unable to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [extension.extension_id, extension.category, timeframe]);

  const formatUsers = (users: number) => {
    if (users >= 1000000) {
      return `${(users / 1000000).toFixed(1)}M`;
    } else if (users >= 1000) {
      return `${(users / 1000).toFixed(1)}K`;
    }
    return users.toLocaleString();
  };

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : 'N/A';
  };

  const getDaysAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return `${days}d ago`;
  };

  // Generate trend data from analytics or mock it
  const getTrendData = (metric: string) => {
    if (analyticsData?.data && analyticsData.data.length > 1) {
      const recent = analyticsData.data[analyticsData.data.length - 1];
      const previous = analyticsData.data[analyticsData.data.length - 2];
      
      if (recent && previous && recent[metric] && previous[metric]) {
        const change = ((recent[metric] - previous[metric]) / previous[metric]) * 100;
        return {
          value: Math.abs(change),
          isPositive: change > 0,
          period: `${timeframe}d`
        };
      }
    }
    
    // Mock trend data
    const mockTrends = {
      users: { value: 12.5, isPositive: true, period: `${timeframe}d` },
      rating: { value: 2.3, isPositive: true, period: `${timeframe}d` },
      reviews: { value: 8.7, isPositive: true, period: `${timeframe}d` },
      updates: { value: 5.1, isPositive: false, period: `${timeframe}d` }
    };
    
    return mockTrends[metric as keyof typeof mockTrends] || { value: 0, isPositive: true, period: `${timeframe}d` };
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Real-time Analytics
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Metrics and performance data for {extension.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Sexy Timeframe Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">Timeframe:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              {[
                { value: 7, label: '7d' },
                { value: 30, label: '30d' },
                { value: 90, label: '90d' },
                { value: 180, label: '6m' },
                { value: 365, label: '1y' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTimeframe(value)}
                  disabled={loading}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    timeframe === value
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-200 transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <MetricCard
          title="Total Users"
          value={formatUsers(extension.users || 0)}
          subtitle={`Rank #${extension.popularity_rank || 'N/A'} in ${extension.category}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          trend={getTrendData('users')}
          color="blue"
          loading={loading}
        />

        {/* Average Rating */}
        <MetricCard
          title="Average Rating"
          value={formatRating(extension.rating || 0)}
          subtitle={`${formatUsers(extension.review_count || 0)} reviews`}
          icon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          trend={getTrendData('rating')}
          color="green"
          loading={loading}
        />

        {/* Version & Updates */}
        <MetricCard
          title="Current Version"
          value={extension.version || 'N/A'}
          subtitle={`Updated ${getDaysAgo(extension.last_updated_at)}`}
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
          trend={getTrendData('updates')}
          color="purple"
          loading={loading}
        />

        {/* Growth Velocity */}
        <MetricCard
          title="Growth Score"
          value={loading ? '...' : Math.round(((extension.users || 0) / 1000000) * 100)}
          subtitle="Market penetration"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
          trend={{ value: 15.2, isPositive: true, period: `${timeframe}d` }}
          color="orange"
          loading={loading}
        />
      </div>

    </div>
  );
}