'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Bar
} from 'recharts';
import { apiClient } from '@/lib/api';

interface EnhancedAnalyticsChartProps {
  extensionId?: string;
  extensionCategory?: string;
  days?: number;
  height?: number;
}

export default function EnhancedAnalyticsChart({ 
  extensionId, 
  extensionCategory, 
  days = 7, 
  height = 500 
}: EnhancedAnalyticsChartProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'area' | 'composed'>('area');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try multiple analytics endpoints for chart data
        const [multiMetricResult, growthResult, marketResult] = await Promise.allSettled([
          apiClient.getMultiMetricTrends(days),
          apiClient.getGrowthAnalytics(days, extensionCategory),
          apiClient.getMarketOverview(days)
        ]);

        // Use whichever endpoint returns valid chart data
        if (multiMetricResult.status === 'fulfilled' && multiMetricResult.value.chartData) {
          // Filter out Extension Updates if it exists
          const filteredData = {
            ...multiMetricResult.value,
            chartData: {
              ...multiMetricResult.value.chartData,
              datasets: multiMetricResult.value.chartData.datasets.filter((dataset: any) => 
                !dataset.label.includes('Extension Updates') && !dataset.label.includes('Extension')
              )
            }
          };
          setData(filteredData);
        } else if (growthResult.status === 'fulfilled' && growthResult.value.data && growthResult.value.data.length > 0) {
          // Transform growth data to chart format
          const transformedData = {
            ...growthResult.value,
            chartData: {
              labels: growthResult.value.data.map((item: any) => item.date),
              datasets: [
                {
                  label: 'Total Users (K)',
                  data: growthResult.value.data.map((item: any) => (item.totalUsers || 0) / 1000),
                  borderColor: '#3B82F6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  yAxisID: 'y',
                },
                {
                  label: 'Average Rating',
                  data: growthResult.value.data.map((item: any) => item.averageRating || 0),
                  borderColor: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  yAxisID: 'y1',
                }
              ]
            }
          };
          setData(transformedData);
        } else if (marketResult.status === 'fulfilled' && marketResult.value.chartData) {
          // Filter out Extension Updates from market data too
          const filteredMarketData = {
            ...marketResult.value,
            chartData: {
              ...marketResult.value.chartData,
              datasets: marketResult.value.chartData.datasets.filter((dataset: any) => 
                !dataset.label.includes('Extension Updates') && !dataset.label.includes('Extension')
              )
            }
          };
          setData(filteredMarketData);
        } else {
          setError('No analytics data available');
        }
      } catch (err) {
        console.error('Failed to fetch analytics data:', err);
        setError('Unable to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [days, extensionCategory]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="animate-pulse h-6 w-48 bg-gray-200 rounded"></div>
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
        </div>
        <div style={{ height }} className="flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="text-gray-600 font-medium">Loading analytics data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Analytics Unavailable
          </h3>
        </div>
        <div style={{ height }} className="flex items-center justify-center bg-red-50 rounded-lg border border-red-200">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">{error}</p>
            <p className="text-red-500 text-sm">Please check back later for analytics data</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data?.chartData) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Chart</h3>
          <span className="text-sm text-gray-500">No data available</span>
        </div>
        <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm">No analytics data available</p>
        </div>
      </div>
    );
  }

  // Transform chart data for Recharts with enhanced styling
  const chartData = data.chartData.labels.map((label, index) => {
    const point: any = { 
      date: label,
      dateFormatted: new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
    data.chartData!.datasets.forEach((dataset) => {
      point[dataset.label] = dataset.data[index];
    });
    return point;
  });

  const formatTooltipValue = (value: any, name: string) => {
    if (typeof value === 'number') {
      if (name.includes('Rating')) {
        return [value.toFixed(2), name];
      } else if (name.includes('K') || name.includes('M')) {
        return [value.toLocaleString(), name];
      }
      return [Math.round(value).toLocaleString(), name];
    }
    return [value, name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900 mb-2 text-sm">
            {new Date(label).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between min-w-[140px]">
              <div className="flex items-center">
                <div 
                  className="w-2 h-2 rounded-full mr-2" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600">{entry.name}</span>
              </div>
              <span className="font-medium text-gray-900 ml-3 text-xs">
                {formatTooltipValue(entry.value, entry.name)[0]}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: {
        top: 10,
        right: 20,
        left: 10,
        bottom: 30,
      }
    };

    switch (chartType) {
      case 'area':
        return (
          <ComposedChart {...commonProps}>
            <defs>
              <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
              </linearGradient>
              <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#f1f5f9" opacity={0.3} />
            <XAxis 
              dataKey="dateFormatted"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={5}
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => {
                if (value >= 1000) {
                  return `${(value / 1000).toFixed(0)}K`;
                }
                return value.toLocaleString();
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#9ca3af' }}
              domain={[0, 5]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip />} />

            {data.chartData.datasets.map((dataset, index) => {
              const yAxisId = dataset.label.includes('Rating') ? 'right' : 'left';
              const fillId = dataset.label.includes('Users') ? 'colorUsers' : 'colorRating';
              
              return (
                <Area
                  key={dataset.label}
                  yAxisId={yAxisId}
                  type="monotone"
                  dataKey={dataset.label}
                  stroke={dataset.borderColor}
                  strokeWidth={3}
                  fill={`url(#${fillId})`}
                  dot={{ fill: dataset.borderColor, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: dataset.borderColor, strokeWidth: 2, fill: 'white' }}
                />
              );
            })}
          </ComposedChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dateFormatted" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            
            {data.chartData.datasets.map((dataset, index) => {
              const yAxisId = dataset.label.includes('Rating') ? 'right' : 'left';
              
              if (index === 0) {
                return (
                  <Bar
                    key={dataset.label}
                    yAxisId={yAxisId}
                    dataKey={dataset.label}
                    fill={dataset.borderColor}
                    opacity={0.6}
                  />
                );
              } else {
                return (
                  <Line
                    key={dataset.label}
                    yAxisId={yAxisId}
                    type="monotone"
                    dataKey={dataset.label}
                    stroke={dataset.borderColor}
                    strokeWidth={3}
                    dot={{ fill: dataset.borderColor, r: 4 }}
                  />
                );
              }
            })}
          </ComposedChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="dateFormatted" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />

            {data.chartData.datasets.map((dataset) => (
              <Line
                key={dataset.label}
                yAxisId={dataset.label.includes('Rating') ? 'right' : 'left'}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.borderColor}
                strokeWidth={3}
                dot={{ fill: dataset.borderColor, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Simple chart without wrapper card */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}