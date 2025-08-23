'use client';

import { Extension } from '@/lib/api';
import { useState } from 'react';

interface ExtensionCardProps {
  extension: Extension;
  onClick?: () => void;
}

export default function ExtensionCard({ extension, onClick }: ExtensionCardProps) {
  const [logoError, setLogoError] = useState(false);
  const formatUsers = (users: number | undefined | null) => {
    if (!users || users === 0 || isNaN(users)) return 'N/A';
    if (users >= 1000000) {
      return `${(users / 1000000).toFixed(1)}M`;
    } else if (users >= 1000) {
      return `${(users / 1000).toFixed(1)}K`;
    }
    return users.toLocaleString();
  };

  // Consistent date formatting to avoid hydration mismatches
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) return 'bg-emerald-100 text-emerald-800';
    if (rating >= 4.0) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const getPopularityIcon = (users: number) => {
    if (users >= 1000000) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      );
    } else if (users >= 100000) {
      return (
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      );
    }
    return (
      <div className="w-8 h-8 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      </div>
    );
  };

  return (
    <div className="extension-card group" onClick={onClick}>
      {/* Header with logo and title */}
      <div className="flex items-start space-x-3 mb-3">
        {/* Extension Logo or Popularity Icon */}
        {extension.logo_url && !logoError ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
            <img 
              src={extension.logo_url} 
              alt={`${extension.name} logo`}
              className="w-full h-full object-cover"
              onError={() => setLogoError(true)}
            />
          </div>
        ) : (
          getPopularityIcon(extension.users)
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
            {extension.name}
          </h3>
          {extension.developer && (
            <p className="text-sm text-slate-500 truncate mt-1">
              by {extension.developer}
            </p>
          )}
        </div>
      </div>
      
      {/* Category and Rankings badges */}
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium">
          {extension.category}
        </span>
        {extension.popularity_rank > 0 && extension.popularity_rank <= 100 && (
          <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
            #{extension.popularity_rank} Popular
          </span>
        )}
        {extension.trending_rank > 0 && extension.trending_rank <= 100 && (
          <span className="text-xs px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full font-medium">
            #{extension.trending_rank} Trending
          </span>
        )}
        {extension.top_rated_rank > 0 && extension.top_rated_rank <= 100 && (
          <span className="text-xs px-2.5 py-1 bg-pink-100 text-pink-700 rounded-full font-medium">
            #{extension.top_rated_rank} Top Rated
          </span>
        )}
      </div>
      
      {/* Description */}
      <p className="text-slate-600 text-sm mb-4 line-clamp-2 leading-relaxed">
        {extension.description || 'No description available'}
      </p>
      
      {/* Compact Metrics Row */}
      <div className="bg-slate-50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <span className="font-semibold text-slate-900">{formatUsers(extension.users)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="font-semibold text-slate-900">
              {extension.rating > 0 ? extension.rating.toFixed(1) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <span className="font-semibold text-slate-900">
              {extension.review_count > 0 ? formatUsers(extension.review_count) : 'N/A'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold text-slate-900">
              {formatDate(extension.last_updated_at)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Keywords */}
      {extension.keywords && extension.keywords.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            {extension.keywords.slice(0, 3).map((keyword, index) => (
              <span 
                key={index}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded border border-blue-200"
              >
                {keyword}
              </span>
            ))}
            {extension.keywords.length > 3 && (
              <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200">
                +{extension.keywords.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Flexible spacer to push footer to bottom */}
      <div className="flex-grow"></div>
      
      {/* Footer CTA */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm text-slate-600 group-hover:text-blue-600 transition-colors font-medium">
              View Analytics
            </span>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
            <svg className="w-3 h-3 text-slate-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}