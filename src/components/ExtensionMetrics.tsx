'use client';

import { Extension } from '@/lib/api';

interface ExtensionMetricsProps {
  extension: Extension;
  showRankings?: boolean;
}

export default function ExtensionMetrics({ extension, showRankings = false }: ExtensionMetricsProps) {
  const formatUsers = (users: number | undefined | null) => {
    if (!users || users === 0 || isNaN(users)) return 'N/A';
    if (users >= 1000000) {
      return `${(users / 1000000).toFixed(1)}M`;
    } else if (users >= 1000) {
      return `${(users / 1000).toFixed(1)}K`;
    }
    return users.toLocaleString();
  };

  const hasRankings = (extension.popularity_rank && extension.popularity_rank <= 100) || 
                     (extension.trending_rank && extension.trending_rank <= 100) || 
                     (extension.top_rated_rank && extension.top_rated_rank <= 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatUsers(extension.users)}</div>
          <div className="text-sm text-gray-500">Users</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
            {extension.rating > 0 ? extension.rating.toFixed(1) : 'N/A'}
            {extension.rating > 0 && (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>
          <div className="text-sm text-gray-500">Rating</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{formatUsers(extension.review_count)}</div>
          <div className="text-sm text-gray-500">Reviews</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{extension.category}</div>
          <div className="text-sm text-gray-500">Category</div>
        </div>
      </div>
      
      {/* Rankings - Only show if showRankings is true and extension has rankings */}
      {showRankings && hasRankings && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            {extension.popularity_rank && extension.popularity_rank <= 100 && (
              <span className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full font-semibold">
                #{extension.popularity_rank} Most Popular
              </span>
            )}
            {extension.trending_rank && extension.trending_rank <= 100 && (
              <span className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-full font-semibold">
                #{extension.trending_rank} Trending
              </span>
            )}
            {extension.top_rated_rank && extension.top_rated_rank <= 100 && (
              <span className="text-xs px-3 py-1.5 bg-pink-100 text-pink-700 rounded-full font-semibold">
                #{extension.top_rated_rank} Top Rated
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}