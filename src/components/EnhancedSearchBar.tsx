'use client';

import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  showSuggestions?: boolean;
}

interface SearchSuggestion {
  type: 'extension' | 'category' | 'keyword';
  title: string;
  subtitle?: string;
  url: string;
}

export default function EnhancedSearchBar({ 
  onSearch, 
  placeholder = "Search extensions...", 
  initialValue = "", 
  showSuggestions = true 
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestionList, setShowSuggestionList] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      setShowSuggestionList(false);
    }
  };

  // Debounced search suggestions
  useEffect(() => {
    if (!showSuggestions || !query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestionList(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.searchExtensions(query, 1, 5);
        const extensionSuggestions: SearchSuggestion[] = response.extensions.map(ext => ({
          type: 'extension',
          title: ext.name,
          subtitle: `${ext.users.toLocaleString()} users • ${ext.rating.toFixed(1)} stars`,
          url: `/extension/${ext.extension_id}`,
        }));

        // Add category suggestions
        const categories = [
          { name: 'Productivity', slug: 'productivity' },
          { name: 'Developer Tools', slug: 'developer-tools' },
          { name: 'Shopping', slug: 'shopping' },
          { name: 'Communication', slug: 'communication' },
          { name: 'Entertainment', slug: 'entertainment' }
        ];
        
        const categorySuggestions: SearchSuggestion[] = categories
          .filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 2)
          .map(cat => ({
            type: 'category',
            title: `${cat.name} Extensions`,
            subtitle: 'Browse category',
            url: `/category/${cat.slug}`,
          }));

        // Add popular search suggestions based on keywords
        const keywordSuggestions: SearchSuggestion[] = [];
        const keywords = query.toLowerCase();
        
        const popularSearches = [
          { keywords: ['ad', 'block', 'popup'], title: 'Best Ad Blockers', url: '/best/ad-blockers' },
          { keywords: ['password', 'manager', 'secure'], title: 'Best Password Managers', url: '/best/password-managers' },
          { keywords: ['grammar', 'writing', 'spell'], title: 'Best Grammar Checkers', url: '/best/grammar-checkers' },
          { keywords: ['screenshot', 'capture', 'screen'], title: 'Best Screenshot Tools', url: '/best/screenshot-tools' },
          { keywords: ['social', 'media', 'facebook', 'twitter'], title: 'Best Social Media Tools', url: '/best/social-media-tools' },
        ];

        popularSearches.forEach(search => {
          if (search.keywords.some(keyword => keywords.includes(keyword))) {
            keywordSuggestions.push({
              type: 'keyword',
              title: search.title,
              subtitle: 'Popular search',
              url: search.url,
            });
          }
        });

        const allSuggestions = [...extensionSuggestions, ...categorySuggestions, ...keywordSuggestions];
        setSuggestions(allSuggestions.slice(0, 8));
        setShowSuggestionList(allSuggestions.length > 0);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, showSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestionList) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          window.location.href = suggestions[selectedIndex].url;
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setShowSuggestionList(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestionList(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    window.location.href = suggestion.url;
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'extension':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'category':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'keyword':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestionList(true);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            autoComplete="off"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                onSearch('');
                setSuggestions([]);
                setShowSuggestionList(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestionList && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center space-x-3 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                index === selectedIndex ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
              }`}
            >
              {getSuggestionIcon(suggestion.type)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {suggestion.title}
                </div>
                {suggestion.subtitle && (
                  <div className="text-xs text-slate-500 truncate">
                    {suggestion.subtitle}
                  </div>
                )}
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Export the suggestion types for use in other components
export type { SearchSuggestion };