'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

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
      fetchProxyStats()
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
        fetchKeywords()
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
          {/* System Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {isRunning ? 'Running' : 'Stopped'}
              </p>
              <p className="text-sm text-gray-600">
                {automationStatus?.worker_stats?.total_workers || 0} workers active
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <ClockIcon />
                <h3 className="text-lg font-semibold text-gray-900 ml-2">Queue Status</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalQueuedJobs}</p>
              <p className="text-sm text-gray-600">jobs queued</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <DatabaseIcon />
                <h3 className="text-lg font-semibold text-gray-900 ml-2">Extensions</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {automationStatus?.update_stats?.total_extensions || 0}
              </p>
              <p className="text-sm text-gray-600">
                {automationStatus?.update_stats?.recently_updated || 0} recently updated
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${proxyStats?.proxy_stats?.proxy_enabled ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <h3 className="text-lg font-semibold text-gray-900">Proxy Status</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {proxyStats?.proxy_stats?.healthy_proxies || 0}/{proxyStats?.proxy_stats?.total_proxies || 0}
              </p>
              <p className="text-sm text-gray-600">healthy proxies</p>
            </div>
          </div>

          {/* System Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button
              onClick={startAutomation}
              disabled={isRunning || actionLoading === 'start'}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <div className="mr-2">
                <PlayIcon />
              </div>
              {actionLoading === 'start' ? 'Starting...' : 'Start Automation'}
            </button>

            <button
              onClick={stopAutomation}
              disabled={!isRunning || actionLoading === 'stop'}
              className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <div className="mr-2">
                <PauseIcon />
              </div>
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop Automation'}
            </button>

            <button
              onClick={cleanupInvalidData}
              disabled={actionLoading === 'cleanup'}
              className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <div className="mr-2">
                <DatabaseIcon />
              </div>
              {actionLoading === 'cleanup' ? 'Cleaning...' : 'Cleanup Invalid Data'}
            </button>
          </div>

          {/* Job Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Queued Jobs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Queued Jobs</h2>
              <div className="space-y-3">
                {Object.entries(queueStats?.queue_stats || {}).map(([queue, count]) => (
                  <div key={queue} className="flex justify-between">
                    <span className="text-gray-600">{queue.replace(/_/g, ' ')}:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(queueStats?.queue_stats || {}).length === 0 && (
                  <p className="text-gray-500 italic">No queue data available</p>
                )}
              </div>
            </div>

            {/* Completed Jobs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Completed Jobs</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Completed:</span>
                  <span className="font-semibold">{completedJobsStats?.total_completed || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last 24 Hours:</span>
                  <span className="font-semibold">{completedJobsStats?.completed_last_24h || 0}</span>
                </div>
                
                {/* Completed by Type */}
                <div className="pt-3 border-t">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">By Type:</h3>
                  {Object.entries(completedJobsStats?.completed_by_type || {}).map(([type, count]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{type}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(completedJobsStats?.completed_by_type || {}).length === 0 && (
                    <p className="text-gray-500 italic text-sm">No completed jobs yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Queue Processing Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Queue Processing Metrics</h2>
              <div className="space-y-4">
                {Object.entries(queueStats?.queue_stats || {}).map(([queue, count]) => {
                  const maxCount = Math.max(...Object.values(queueStats?.queue_stats || {}));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  return (
                    <div key={queue} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{queue.replace(/_/g, ' ')}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Performance */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">System Performance</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-green-800">Workers Active</p>
                    <p className="text-2xl font-bold text-green-900">{automationStatus?.worker_stats?.total_workers || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Extensions Tracked</p>
                    <p className="text-2xl font-bold text-blue-900">{automationStatus?.update_stats?.total_extensions || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DatabaseIcon />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-purple-800">Healthy Proxies</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {proxyStats?.proxy_stats?.healthy_proxies || 0}/{proxyStats?.proxy_stats?.total_proxies || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Statistics */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Worker Pool Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {Object.values(automationStatus?.worker_stats?.workers_by_type || {}).reduce((sum, count) => sum + count, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Workers</div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">By Type</h3>
                {Object.entries(automationStatus?.worker_stats?.workers_by_type || {}).map(([type, count]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className="text-gray-600 capitalize">{type.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
              
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Scheduler Status</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${automationStatus?.scheduler_stats?.running ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm">{automationStatus?.scheduler_stats?.running ? 'Running' : 'Stopped'}</span>
                </div>
                {automationStatus?.scheduler_stats?.last_checked && (
                  <div className="text-xs text-gray-500">
                    Last check: {new Date(automationStatus.scheduler_stats.last_checked).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {completedJobsStats?.recent_completed?.slice(0, 5).map((job, index) => (
                <div key={job.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      job.type === 'discovery' ? 'bg-blue-500' : 
                      job.type === 'update' ? 'bg-green-500' : 
                      'bg-gray-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {job.type} Job Completed
                      </p>
                      <p className="text-xs text-gray-500">
                        Priority: {job.priority} | {new Date(job.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {job.id.slice(-8)}
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 italic text-center py-4">No recent activity</p>
              )}
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