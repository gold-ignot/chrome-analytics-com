'use client';

import { useState, useEffect } from 'react';
import TypingAnimation from './TypingAnimation';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  variant?: 'default' | 'hero';
  showTypingAnimation?: boolean;
}

export default function SearchBar({ 
  onSearch, 
  placeholder = "Search extensions...", 
  initialValue = "",
  variant = 'default',
  showTypingAnimation = false
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  // Sync query state with initialValue prop
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  if (variant === 'hero') {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
        <div className={`relative group transition-all duration-300 ${
          isFocused ? 'transform scale-105' : ''
        }`}>
          {/* Background with gradient and shadow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
          
          {/* Main container */}
          <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300">
            {/* Search icon */}
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <svg 
                className={`h-6 w-6 transition-colors duration-200 ${
                  isFocused ? 'text-blue-600' : 'text-slate-400'
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
            
            {/* Input field */}
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              className="block w-full pl-16 pr-16 py-5 text-lg bg-transparent placeholder-slate-400 focus:placeholder-slate-300 focus:outline-none text-slate-900 rounded-2xl"
            />
            
            {/* Action buttons container */}
            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="mr-2 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 rounded-full transition-all duration-200"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              
              {/* Submit button */}
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Floating suggestions hint with typing animation */}
          {!query && !isFocused && showTypingAnimation && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-sm text-slate-500">
              <TypingAnimation 
                suggestions={['ad blocker', 'password manager', 'developer tools', 'vpn', 'productivity', 'youtube downloader']}
              />
            </div>
          )}
        </div>
      </form>
    );
  }

  // Default variant (existing design)
  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg 
            className="h-5 w-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
        </div>
        
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}