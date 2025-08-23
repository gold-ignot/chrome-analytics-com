'use client';

import { useMemo } from 'react';

interface DataPoint {
  date: string;
  users: number;
  rating: number;
  reviewCount: number;
}

interface ChartProps {
  data: DataPoint[];
  type: 'users' | 'rating' | 'reviews';
  title: string;
  variant?: 'area' | 'line';
}

export default function Chart({ data, type, title, variant = 'area' }: ChartProps) {
  const formatValue = (value: number | undefined | null) => {
    if (!value || value === 0 || isNaN(value)) return 'N/A';
    if (type === 'users') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toLocaleString();
    }
    if (type === 'rating') return value.toFixed(1);
    return value.toLocaleString();
  };

  const getColor = () => {
    switch (type) {
      case 'users': return 'bg-blue-500';
      case 'rating': return 'bg-yellow-500';
      case 'reviews': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const filteredData = data
      .filter(point => {
        // Filter out data points with no valid data for the specific type
        const value = type === 'users' ? point.users : type === 'rating' ? point.rating : point.reviewCount;
        return value !== null && value !== undefined && value > 0;
      })
      .map(point => ({
        date: new Date(point.date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        value: type === 'users' ? point.users : type === 'rating' ? point.rating : point.reviewCount,
        originalDate: point.date
      }))
      .sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());

    // For review count data, detect and handle outliers
    if (type === 'reviews' && filteredData.length > 2) {
      const values = filteredData.map(d => d.value);
      const median = values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
      const outlierThreshold = median * 10; // If a value is 10x the median, consider it an outlier
      
      // Remove obvious outliers that might be data quality issues
      return filteredData.filter(point => point.value <= outlierThreshold);
    }

    return filteredData;
  }, [data, type]);

  if (chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-slate-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">No historical data available</p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));

  return (
    <div className="chart-container">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getColor()}`}></div>
          <span className="text-sm text-slate-600">
            {type === 'users' ? 'Total Users' : type === 'rating' ? 'Average Rating' : 'Total Reviews'}
          </span>
        </div>
      </div>

      {/* Data quality indicator */}
      {type === 'reviews' && data && data.length > chartData.length && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm text-amber-800">
              Data filtered: Removed {data.length - chartData.length} outlier data point(s) for better visualization
            </span>
          </div>
        </div>
      )}

      {/* Enhanced bar chart */}
      <div className="h-64 flex items-end justify-between space-x-2 border-b border-slate-200 relative">
        {chartData.map((point, index) => {
          // Calculate height with improved scaling for better visual distinction
          let height;
          
          if (type === 'rating') {
            // For ratings, always use full 1-5 scale for better visual comparison
            height = ((point.value - 1) / 4) * 85 + 15; // Map 1-5 to 15-100%
          } else {
            // For users and reviews, use dynamic scaling with minimum height guarantee
            const range = maxValue - minValue;
            if (range > 0) {
              // Use a more aggressive scaling to create visual differences
              const relativePosition = (point.value - minValue) / range;
              // Apply a curve to make smaller differences more visible
              const scaledPosition = Math.pow(relativePosition, 0.7); // Compress high values, expand low values
              height = scaledPosition * 70 + 30; // 30-100% range with better distribution
            } else {
              // If all values are the same, vary height by position for visual interest
              height = 50 + (index * 10) % 30; // Vary between 50-80%
            }
          }
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center group relative">
              <div 
                className={`w-full ${getColor()} rounded-t transition-all duration-300 hover:opacity-80 relative group-hover:shadow-lg`}
                style={{ height: `${height}%`, minHeight: '12px' }}
                title={`${point.date}: ${formatValue(point.value)}`}
              >
                {/* Improved hover tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg pointer-events-none transition-opacity shadow-lg z-10">
                  <div className="text-center">
                    <div className="font-medium">{formatValue(point.value)}</div>
                    <div className="text-slate-300 text-xs">{point.date}</div>
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900"></div>
                </div>
              </div>
              <span className="text-xs text-slate-500 mt-2 text-center leading-tight max-w-full truncate">
                {point.date}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="flex justify-between items-center pt-4 mt-4">
        <div className="text-sm text-slate-600">
          Latest: <span className="font-medium text-slate-900">
            {formatValue(chartData[chartData.length - 1]?.value || 0)}
          </span>
        </div>
        <div className="text-sm text-slate-600">
          Peak: <span className="font-medium text-slate-900">
            {formatValue(maxValue)}
          </span>
        </div>
        <div className="text-sm text-slate-600">
          {chartData.length} data points
        </div>
      </div>
    </div>
  );
}