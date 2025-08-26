'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { analyticsService, generateMockAnalyticsData, AnalyticsData } from '@/lib/analytics';

interface AnalyticsChartProps {
  extensionId?: string;
  extensionCategory?: string;
  days?: number;
  height?: number;
}

export default function AnalyticsChart({ 
  extensionId, 
  extensionCategory, 
  days = 30, 
  height = 400 
}: AnalyticsChartProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Try multiple analytics endpoints for chart data
        const [multiMetricResult, growthResult, marketResult] = await Promise.allSettled([
          analyticsService.getMultiMetricTrends(days),
          analyticsService.getGrowthAnalytics(days, extensionCategory),
          analyticsService.getMarketOverview(days)
        ]);

        // Use whichever endpoint returns valid chart data
        if (multiMetricResult.status === 'fulfilled' && multiMetricResult.value.chartData) {
          setData(multiMetricResult.value);
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
                  backgroundColor: '#3B82F640',
                  yAxisID: 'y',
                },
                {
                  label: 'Average Rating',
                  data: growthResult.value.data.map((item: any) => item.averageRating || 0),
                  borderColor: '#10B981',
                  backgroundColor: '#10B98140',
                  yAxisID: 'y1',
                }
              ]
            }
          };
          setData(transformedData);
        } else if (marketResult.status === 'fulfilled' && marketResult.value.chartData) {
          setData(marketResult.value);
        } else {
          setError('No chart data available from analytics endpoints');
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
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Trends</h3>
          <div className="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Trends</h3>
          <span className="text-sm text-red-600">Error loading data</span>
        </div>
        <div style={{ height }} className="flex items-center justify-center bg-red-50 rounded-lg">
          <p className="text-red-600 text-sm">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  if (!data?.chartData) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Trends</h3>
          <span className="text-sm text-gray-500">No data available</span>
        </div>
        <div style={{ height }} className="flex items-center justify-center bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-sm">No analytics data available</p>
        </div>
      </div>
    );
  }

  // Transform chart data for Recharts
  const chartData = data.chartData.labels.map((label, index) => {
    const point: any = { date: label };
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics Trends
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Multi-metric trends over the last {days} days
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">
            Last updated: {new Date(data.timestamp).toLocaleDateString()}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            {chartData.length} data points
          </div>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis 
              dataKey="date"
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              yAxisId="left"
              stroke="#64748b"
              fontSize={12}
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
              stroke="#64748b"
              fontSize={12}
              domain={[0, 5]}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelFormatter={(value) => {
                return new Date(value).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });
              }}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />

            {data.chartData.datasets.map((dataset, index) => (
              <Line
                key={dataset.label}
                yAxisId={dataset.label.includes('Rating') ? 'right' : 'left'}
                type="monotone"
                dataKey={dataset.label}
                stroke={dataset.borderColor}
                strokeWidth={2}
                dot={{ fill: dataset.borderColor, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: dataset.borderColor, strokeWidth: 2 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend with additional info */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {data.chartData.datasets.map((dataset, index) => (
            <div key={dataset.label} className="flex items-center">
              <div
                className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                style={{ backgroundColor: dataset.borderColor }}
              ></div>
              <span className="text-gray-600 truncate">{dataset.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}