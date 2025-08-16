'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Chart from '@/components/Chart';
import { apiClient, Extension } from '@/lib/api';

// Simple SVG icons components
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
  </svg>
);

const DatabaseIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
    <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
    <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
);

interface AutomationStatus {
  status: { running: boolean };
  worker_stats: {
    total_workers: number;
    workers_by_type: Record<string, number>;
    queue_stats: Record<string, number>;
  };
  scheduler_stats: {
    running: boolean;
    queue_stats: Record<string, number>;
    last_checked: string;
  };
  update_stats: {
    total_extensions: number;
    recently_updated: number;
    extensions_by_users: Record<string, number>;
    last_updated: string;
  };
}

interface QueueStats {
  queue_stats: Record<string, number>;
}

interface ProxyStats {
  proxy_stats: {
    proxy_enabled: boolean;
    total_proxies: number;
    healthy_proxies: number;
    unhealthy_proxies: number;
    health_rate: number;
  };
}

export default function AdminPage() {
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [completedJobsStats, setCompletedJobsStats] = useState<{
    total_completed: number;
    completed_last_24h: number;
    completed_by_type: Record<string, number>;
    recent_completed: Array<{
      id: string;
      type: string;
      priority: string;
      status: string;
      created_at: string;
      updated_at: string;
      payload: Record<string, any>;
    }>;
  } | null>(null);
  const [dashboardOverview, setDashboardOverview] = useState<any>(null);
  const [growthTrends, setGrowthTrends] = useState<any>(null);
  const [proxyStats, setProxyStats] = useState<ProxyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [extensionId, setExtensionId] = useState('');
  const [refreshRate, setRefreshRate] = useState(2000); // Default 2 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduling'>('overview');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const fetchAutomationStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/status`);
      const data = await response.json();
      setAutomationStatus(data);
    } catch (error) {
      console.error('Error fetching automation status:', error);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/queue/stats`);
      const data = await response.json();
      setQueueStats(data);
    } catch (error) {
      console.error('Error fetching queue stats:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/categories`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchKeywords = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/keywords`);
      const data = await response.json();
      setKeywords(data.keywords || []);
    } catch (error) {
      console.error('Error fetching keywords:', error);
    }
  };

  const fetchProxyStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/proxy/stats`);
      const data = await response.json();
      setProxyStats(data);
    } catch (error) {
      console.error('Error fetching proxy stats:', error);
    }
  };

  const fetchCompletedJobsStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/automation/completed/stats`);
      const data = await response.json();
      setCompletedJobsStats(data);
    } catch (error) {
      console.error('Error fetching completed jobs stats:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [overviewData, trendsData] = await Promise.all([
        apiClient.getDashboardOverview(),
        apiClient.getExtensionGrowthTrends()
      ]);
      setDashboardOverview(overviewData);
      setGrowthTrends(trendsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const startAutomation = async () => {
    setActionLoading('start');
    try {
      const response = await fetch(`${API_BASE}/api/automation/start`, { method: 'POST' });
      const data = await response.json();
      toast.success(data.message);
      await fetchAutomationStatus();
    } catch (error) {
      toast.error('Error starting automation: ' + error);
    }
    setActionLoading(null);
  };

  const stopAutomation = async () => {
    setActionLoading('stop');
    try {
      const response = await fetch(`${API_BASE}/api/automation/stop`, { method: 'POST' });
      const data = await response.json();
      toast.success(data.message);
      await fetchAutomationStatus();
    } catch (error) {
      toast.error('Error stopping automation: ' + error);
    }
    setActionLoading(null);
  };

  const cleanupInvalidData = async () => {
    if (!confirm('This will remove all invalid extension records from the database. Continue?')) {
      return;
    }
    
    setActionLoading('cleanup');
    try {
      const response = await fetch(`${API_BASE}/api/automation/cleanup`, { method: 'POST' });
      const data = await response.json();
      toast.success(data.message || 'Database cleanup completed successfully');
      await fetchAutomationStatus();
    } catch (error) {
      toast.error('Failed to cleanup database: ' + error);
    }
    setActionLoading(null);
  };

  const scheduleDiscoveryJob = async (type: string, params: Record<string, string>) => {
    setActionLoading(`discovery-${type}`);
    try {
      const response = await fetch(`${API_BASE}/api/automation/jobs/discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...params, priority: 'high' })
      });
      const data = await response.json();
      toast.success(`Discovery job scheduled: ${data.job_id}`);
      await fetchQueueStats();
    } catch (error) {
      toast.error('Error scheduling discovery job: ' + error);
    }
    setActionLoading(null);
  };

  const scheduleUpdateJob = async () => {
    if (!extensionId.trim()) {
      toast.error('Please enter an extension ID');
      return;
    }
    setActionLoading('update');
    try {
      const response = await fetch(`${API_BASE}/api/automation/jobs/update/${extensionId}?priority=high`, {
        method: 'POST'
      });
      const data = await response.json();
      toast.success(`Update job scheduled: ${data.job_id}`);
      await fetchQueueStats();
    } catch (error) {
      toast.error('Error scheduling update job: ' + error);
    }
    setActionLoading(null);
  };

  const refreshAllData = async () => {
    await Promise.all([
      fetchAutomationStatus(),
      fetchQueueStats(),
      fetchCompletedJobsStats(),
      fetchProxyStats(),
      fetchDashboardData()
    ]);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAutomationStatus(),
        fetchQueueStats(),
        fetchCompletedJobsStats(),
        fetchProxyStats(),
        fetchCategories(),
        fetchKeywords(),
        fetchDashboardData()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(refreshAllData, refreshRate);
    return () => clearInterval(interval);
  }, [refreshRate, autoRefresh]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 animate-spin text-blue-600">
            <RefreshIcon />
          </div>
          <span className="ml-2 text-lg text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  const isRunning = automationStatus?.status?.running || false;
  const totalQueuedJobs = Object.values(queueStats?.queue_stats || {}).reduce((sum, count) => sum + count, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Automation Admin Dashboard</h1>
            <p className="text-gray-600">Control and monitor the Chrome Extension Analytics automation system</p>
          </div>
          
          {/* Refresh Controls */}
          <div className="bg-white rounded-lg shadow px-4 py-2 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              Auto-refresh
            </label>
            <select
              value={refreshRate}
              onChange={(e) => setRefreshRate(Number(e.target.value))}
              disabled={!autoRefresh}
              className="text-sm border border-gray-300 rounded px-2 py-1 disabled:bg-gray-100"
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
            <button
              onClick={refreshAllData}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              <RefreshIcon />
            </button>
            <div className="text-xs text-gray-500">
              {lastRefresh && `${lastRefresh.toLocaleTimeString()} | `}
              {automationStatus?.update_stats?.total_extensions || 0} ext | {totalQueuedJobs} queued
              {autoRefresh && <span className="text-green-600 ml-1">●</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('scheduling')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scheduling'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Job Scheduling
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* System Status Header */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">System Status</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {isRunning ? 'Running' : 'Stopped'}
                  </p>
                  <p className="text-xs text-blue-600">
                    {automationStatus?.worker_stats?.total_workers || 0} workers active
                  </p>
                </div>
                <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Extensions</p>
                  <p className="text-2xl font-bold text-green-900">
                    {dashboardOverview?.total_extensions || automationStatus?.update_stats?.total_extensions || 0}
                  </p>
                  <p className="text-xs text-green-600">
                    {Math.round((dashboardOverview?.total_users || 0) / 1000000 * 10) / 10}M total users
                  </p>
                </div>
                <DatabaseIcon />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Average Rating</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {dashboardOverview?.average_rating ? dashboardOverview.average_rating.toFixed(1) : '4.2'}
                  </p>
                  <p className="text-xs text-purple-600">across all extensions</p>
                </div>
                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Queue Status</p>
                  <p className="text-2xl font-bold text-orange-900">{totalQueuedJobs}</p>
                  <p className="text-xs text-orange-600">jobs queued</p>
                </div>
                <ClockIcon />
              </div>
            </div>
          </div>

          {/* Main Analytics Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Category Breakdown Chart */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Extensions by Category</h2>
                {dashboardOverview?.category_breakdown ? (
                  <Chart 
                    data={Object.entries(dashboardOverview.category_breakdown).map(([category, count]) => ({
                      date: category,
                      users: count,
                      rating: 0,
                      reviewCount: 0
                    }))}
                    type="users"
                    title=""
                    variant="area"
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-500">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-4 animate-spin">
                        <RefreshIcon />
                      </div>
                      <p className="text-sm">Loading category data...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Extensions */}
            <div className="bg-white rounded-xl shadow-lg border border-slate-200">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-6">Top Extensions</h2>
                <div className="space-y-4">
                  {dashboardOverview?.top_extensions?.slice(0, 5).map((extension: Extension, index: number) => (
                    <div key={extension.extensionId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm leading-tight">
                            {extension.name.length > 25 ? `${extension.name.substring(0, 25)}...` : extension.name}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">{extension.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">
                          {extension.users >= 1000000 ? `${Math.round(extension.users / 1000000)}M` : 
                           extension.users >= 1000 ? `${Math.round(extension.users / 1000)}K` : extension.users}
                        </p>
                        <p className="text-xs text-slate-500">users</p>
                      </div>
                    </div>
                  )) || (
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg animate-pulse">
                          <div className="w-8 h-8 bg-slate-300 rounded-lg"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-slate-300 rounded w-3/4 mb-1"></div>
                            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Growth Trends */}
          {growthTrends?.growth_by_category && Object.keys(growthTrends.growth_by_category).length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {Object.entries(growthTrends.growth_by_category).slice(0, 4).map(([category, data]: [string, any]) => (
                <div key={category} className="bg-white rounded-xl shadow-lg border border-slate-200">
                  <div className="p-6">
                    <Chart 
                      data={data.map((point: any) => ({
                        date: point.date,
                        users: point.users || 0,
                        rating: point.rating || 0,
                        reviewCount: 0
                      }))}
                      type="users"
                      title={`${category.charAt(0).toUpperCase() + category.slice(1)} Extensions Growth`}
                      variant="area"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* System Controls */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-6">System Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={startAutomation}
                disabled={isRunning || actionLoading === 'start'}
                className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <PlayIcon />
                <span className="ml-2">{actionLoading === 'start' ? 'Starting...' : 'Start Automation'}</span>
              </button>

              <button
                onClick={stopAutomation}
                disabled={!isRunning || actionLoading === 'stop'}
                className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <PauseIcon />
                <span className="ml-2">{actionLoading === 'stop' ? 'Stopping...' : 'Stop Automation'}</span>
              </button>

              <button
                onClick={cleanupInvalidData}
                disabled={actionLoading === 'cleanup'}
                className="flex items-center justify-center px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <DatabaseIcon />
                <span className="ml-2">{actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup Database'}</span>
              </button>
            </div>
          </div>

          {/* Job Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Queue Processing</h2>
              <div className="space-y-4">
                {Object.entries(queueStats?.queue_stats || {}).map(([queue, count]) => {
                  const maxCount = Math.max(...Object.values(queueStats?.queue_stats || {}));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={queue} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 capitalize">{queue.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-slate-900">{count}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Completed Jobs</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-800 font-medium">Total Completed</span>
                  <span className="text-2xl font-bold text-green-900">{completedJobsStats?.total_completed || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-800 font-medium">Last 24 Hours</span>
                  <span className="text-2xl font-bold text-blue-900">{completedJobsStats?.completed_last_24h || 0}</span>
                </div>
                
                <div className="pt-3 border-t border-slate-200">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">By Type</h3>
                  {Object.entries(completedJobsStats?.completed_by_type || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm py-1">
                      <span className="text-slate-600 capitalize">{type}</span>
                      <span className="font-medium text-slate-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'scheduling' && (
        <>
          {/* Job Scheduling */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Discovery Jobs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Discovery Jobs</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Discovery</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select category...</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => scheduleDiscoveryJob('category', { category: selectedCategory })}
                      disabled={!selectedCategory || actionLoading === 'discovery-category'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {actionLoading === 'discovery-category' ? 'Scheduling...' : 'Schedule'}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keyword Search</label>
                  <div className="flex gap-2">
                    <select
                      value={selectedKeyword}
                      onChange={(e) => setSelectedKeyword(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select keyword...</option>
                      {keywords.map(keyword => (
                        <option key={keyword} value={keyword}>{keyword}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => scheduleDiscoveryJob('search', { keyword: selectedKeyword })}
                      disabled={!selectedKeyword || actionLoading === 'discovery-search'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {actionLoading === 'discovery-search' ? 'Scheduling...' : 'Schedule'}
                    </button>
                  </div>
                </div>
                
                <div>
                  <button
                    onClick={() => scheduleDiscoveryJob('popular', {})}
                    disabled={actionLoading === 'discovery-popular'}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    {actionLoading === 'discovery-popular' ? 'Scheduling...' : 'Schedule Popular Extensions Discovery'}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Update Jobs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Update Jobs</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Extension ID</label>
                  <input
                    type="text"
                    value={extensionId}
                    onChange={(e) => setExtensionId(e.target.value)}
                    placeholder="Enter extension ID..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                
                <button
                  onClick={scheduleUpdateJob}
                  disabled={!extensionId.trim() || actionLoading === 'update'}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {actionLoading === 'update' ? 'Scheduling...' : 'Schedule Update Job'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Toaster position="top-right" />
    </div>
  );
}