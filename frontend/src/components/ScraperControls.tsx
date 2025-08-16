'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';

interface ScraperControlsProps {
  onScrapeComplete?: () => void;
}

export default function ScraperControls({ onScrapeComplete }: ScraperControlsProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extensionId, setExtensionId] = useState('');

  const handleScrapePopular = async () => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await apiClient.scrapePopularExtensions();
      setMessage(`Started scraping ${response.count} popular extensions. This may take a few minutes.`);
      
      if (onScrapeComplete) {
        // Wait a bit then refresh the data
        setTimeout(() => {
          onScrapeComplete();
        }, 3000);
      }
    } catch (err) {
      setError('Failed to start scraping popular extensions');
      console.error('Scraping error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeExtension = async () => {
    if (!extensionId.trim()) {
      setError('Please enter an extension ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      const response = await apiClient.scrapeExtension(extensionId.trim());
      setMessage(`Successfully scraped: ${response.extension.name}`);
      
      if (onScrapeComplete) {
        onScrapeComplete();
      }
    } catch (err) {
      setError('Failed to scrape extension. Please check the ID and try again.');
      console.error('Scraping error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessage(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Data Collection Controls
      </h2>
      
      {/* Messages */}
      {(message || error) && (
        <div className={`mb-4 p-4 rounded-md ${
          error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
        }`}>
          <div className="flex justify-between items-start">
            <p className={`text-sm ${error ? 'text-red-700' : 'text-green-700'}`}>
              {error || message}
            </p>
            <button
              onClick={clearMessages}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Scrape Popular Extensions */}
        <div>
          <button
            onClick={handleScrapePopular}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scraping...
              </>
            ) : (
              'Scrape Popular Extensions'
            )}
          </button>
          <p className="text-sm text-gray-500 mt-1">
            Collect data from 10 popular Chrome extensions
          </p>
        </div>

        {/* Scrape Single Extension */}
        <div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={extensionId}
              onChange={(e) => setExtensionId(e.target.value)}
              placeholder="Enter Chrome extension ID"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleScrapeExtension}
              disabled={loading || !extensionId.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Scrape
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Example: cjpalhdlnbpafiamejdnhcphjbkeiagm (uBlock Origin)
          </p>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Scraping may take time due to rate limiting. 
          Popular extensions are scraped in the background and will appear in the list shortly.
        </p>
      </div>
    </div>
  );
}