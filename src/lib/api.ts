const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface Extension {
  id: string;
  extensionId: string;
  name: string;
  description: string;
  category: string;
  developer: string;
  developerUrl?: string;
  website?: string;
  supportUrl?: string;
  privacyUrl?: string;
  version?: string;
  fileSize?: string;
  lastUpdated?: string;
  permissions?: string[];
  users: number;
  rating: number;
  reviewCount: number;
  keywords: string[] | null; // Allow null for backward compatibility
  createdAt: string;
  updatedAt: string;
  snapshots: Snapshot[];
}

export interface Snapshot {
  date: string;
  users: number;
  rating: number;
  reviewCount: number;
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

  // Extensions
  async getExtensions(page: number = 1, limit: number = 20, sort?: string, order?: string): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (sort) {
      params.append('sort', sort);
    }
    if (order) {
      params.append('order', order);
    }
    
    return this.request<ExtensionResponse>(`/api/extensions?${params}`);
  }

  async getExtension(id: string): Promise<Extension> {
    return this.request<Extension>(`/api/extensions/${id}`);
  }

  async searchExtensions(query: string, page: number = 1, limit: number = 20): Promise<ExtensionResponse> {
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      limit: limit.toString(),
    });
    return this.request<ExtensionResponse>(`/api/extensions/search?${params}`);
  }

  // Analytics
  async getAnalytics(extensionId: string): Promise<Analytics[]> {
    return this.request<Analytics[]>(`/api/analytics/${extensionId}`);
  }

  async getGrowthMetrics(extensionId: string): Promise<GrowthMetrics> {
    return this.request<GrowthMetrics>(`/api/analytics/${extensionId}/growth`);
  }

  async getKeywordPerformance(extensionId: string): Promise<{ keywords: KeywordMetric[] }> {
    return this.request<{ keywords: KeywordMetric[] }>(`/api/analytics/${extensionId}/keywords`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    return this.request<{ status: string; timestamp: string; service: string }>('/api/health');
  }

}

export const apiClient = new ApiClient();