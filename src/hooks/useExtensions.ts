'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient, Extension, ExtensionResponse } from '@/lib/api';

interface UseExtensionsProps {
  // Filtering options
  category?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  searchQuery?: string;
  
  // Pagination
  limit?: number;
  initialPage?: number;
  
  // Auto-fetch control
  autoFetch?: boolean;
  
  // Dependencies for re-fetching
  dependencies?: any[];
}

interface UseExtensionsReturn {
  // Data
  extensions: Extension[];
  total: number;
  totalPages: number;
  
  // State
  loading: boolean;
  error: string | null;
  currentPage: number;
  
  // Actions
  fetchExtensions: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  refetch: () => Promise<void>;
  
  // Computed values
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isEmpty: boolean;
}

export function useExtensions({
  category,
  sortBy = 'users',
  sortOrder = 'desc',
  searchQuery = '',
  limit = 12,
  initialPage = 1,
  autoFetch = true,
  dependencies = [],
}: UseExtensionsProps = {}): UseExtensionsReturn {
  
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const fetchExtensions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let response: ExtensionResponse;
      
      if (searchQuery.trim()) {
        response = await apiClient.searchExtensions(searchQuery, currentPage, limit);
        
        // Filter by category on client side if searching and category is specified
        if (category) {
          response.extensions = response.extensions.filter(ext => ext.category === category);
          response.total = response.extensions.length;
        }
      } else {
        response = await apiClient.getExtensions(currentPage, limit, sortBy, sortOrder, category);
      }

      setExtensions(response.extensions);
      setTotal(response.total);
      setTotalPages(Math.ceil(response.total / limit));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch extensions';
      setError(errorMessage);
      setExtensions([]);
      console.error('Error fetching extensions:', err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, category, sortBy, sortOrder, limit, ...dependencies]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchExtensions();
    }
  }, [fetchExtensions, autoFetch]);

  // Reset to first page when search/filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery, category, sortBy, sortOrder]);

  const refetch = useCallback(() => {
    return fetchExtensions();
  }, [fetchExtensions]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    // Data
    extensions,
    total,
    totalPages,
    
    // State
    loading,
    error,
    currentPage,
    
    // Actions
    fetchExtensions,
    setCurrentPage: handlePageChange,
    refetch,
    
    // Computed values
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    isEmpty: !loading && extensions.length === 0,
  };
}

// Specialized hook for category pages
export function useCategoryExtensions(category: string, sortBy = 'users', sortOrder: 'asc' | 'desc' = 'desc') {
  return useExtensions({
    category,
    sortBy,
    sortOrder,
  });
}

// Specialized hook for filter pages (popular, top-rated, trending)
export function useFilteredExtensions(filterType: 'popular' | 'top-rated' | 'trending') {
  const sortMap = {
    'popular': { sortBy: 'users', sortOrder: 'desc' as const },
    'top-rated': { sortBy: 'rating', sortOrder: 'desc' as const },
    'trending': { sortBy: 'recent', sortOrder: 'desc' as const },
  };
  
  const { sortBy, sortOrder } = sortMap[filterType];
  
  return useExtensions({
    sortBy,
    sortOrder,
  });
}

// Hook for search functionality
export function useExtensionSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const extensionsData = useExtensions({
    searchQuery,
    autoFetch: false, // Manual control for search
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setIsSearching(!!query.trim());
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  // Fetch when search query changes
  useEffect(() => {
    extensionsData.fetchExtensions();
  }, [searchQuery]);

  return {
    ...extensionsData,
    searchQuery,
    isSearching,
    handleSearch,
    clearSearch,
  };
}

// Hook for managing sort/filter state
export function useExtensionFilters() {
  const [sortBy, setSortBy] = useState('users');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedCategory, setSelectedCategory] = useState('');

  const resetFilters = useCallback(() => {
    setSortBy('users');
    setSortOrder('desc');
    setSelectedCategory('');
  }, []);

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedCategory,
    setSelectedCategory,
    resetFilters,
  };
}