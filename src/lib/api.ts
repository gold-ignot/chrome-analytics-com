const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://chrome-extension-api.namedry.com';

export interface Extension {
  extension_id: string;
  name: string;
  description: string;
  full_description?: string;
  category: string;
  subcategory?: string;
  developer: string;
  developer_url?: string;
  website?: string;
  support_url?: string;
  support_email?: string;
  privacy_url?: string;
  version?: string;
  file_size?: string;
  last_updated_at?: string;
  permissions?: string[];
  users: number;
  rating: number;
  review_count: number;
  keywords?: string[] | null;
  languages?: string[];
  features?: string[];
  screenshots?: string[];
  logo_url?: string;
  status?: string;
  // Pre-computed ranking fields (lower number = higher rank)
  popularity_rank?: number;
  trending_rank?: number;
  top_rated_rank?: number;
  ranked_at?: string;
}

export interface Snapshot {
  date: string;
  users: number;
  rating: number;
  reviewCount: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total_pages: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ExtensionResponse {
  extensions: Extension[];
  total: number;
  page: number;
  limit: number;
}

export interface Analytics {
  id: string;
  extensionId: string;
  date: string;
  metrics: {
    userGrowth: number;
    ratingChange: number;
    reviewGrowth: number;
  };
  keywords: KeywordMetric[];
}

export interface KeywordMetric {
  keyword: string;
  position: number;
  searchVolume: number;
}

export interface GrowthMetrics {
  userGrowth: number;
  ratingChange: number;
  reviewGrowth: number;
  period?: {
    from: string;
    to: string;
  };
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }


  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Add timestamp to URL to prevent caching
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${endpoint}${separator}_t=${Date.now()}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        cache: 'no-store',
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${url}`, error);
      throw error;
    }
  }

  // Extensions - Updated to match actual API
  async getExtensions(page: number = 1, limit: number = 20, sort?: string, order?: string, category?: string): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    // Map our sort fields to API fields
    if (sort) {
      const sortMap: Record<string, string> = {
        'users': 'users',
        'rating': 'rating',
        'reviews': 'review_count',
        'recent': 'last_updated_at'
      };
      params.append('sort_by', sortMap[sort] || 'users');
    }
    if (order) {
      params.append('order', order);
    }
    if (category) {
      params.append('category', category);
    }
    
    // Use /search endpoint for browsing all extensions
    const response = await this.request<{results: Extension[], pagination: PaginationInfo}>(`/search?${params}`);
    
    // Transform API response to match our interface
    return {
      extensions: response.results || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || page,
      limit: response.pagination?.limit || limit
    };
  }

  async getExtension(id: string): Promise<Extension> {
    return this.request<Extension>(`/extension/${id}`);
  }

  async searchExtensions(query: string, page: number = 1, limit: number = 20): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await this.request<{results: Extension[], pagination: PaginationInfo}>(`/search?${params}`);
    
    // Transform API response to match our interface
    return {
      extensions: response.results || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || page,
      limit: response.pagination?.limit || limit
    };
  }

  // New intelligent filter endpoints
  async getPopularExtensions(page: number = 1, limit: number = 20): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await this.request<{results: Extension[], pagination: any}>(`/extensions/popular?${params}`);
    
    return {
      extensions: response.results || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || page,
      limit: response.pagination?.limit || limit
    };
  }

  async getTrendingExtensions(page: number = 1, limit: number = 20): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await this.request<{results: Extension[], pagination: any}>(`/extensions/trending?${params}`);
    
    return {
      extensions: response.results || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || page,
      limit: response.pagination?.limit || limit
    };
  }

  async getTopRatedExtensions(page: number = 1, limit: number = 20): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    const response = await this.request<{results: Extension[], pagination: any}>(`/extensions/top-rated?${params}`);
    
    return {
      extensions: response.results || [],
      total: response.pagination?.total || 0,
      page: response.pagination?.page || page,
      limit: response.pagination?.limit || limit
    };
  }


  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request<{ status: string; timestamp: string; service: string }>('/health');
  }

}

export const apiClient = new ApiClient();