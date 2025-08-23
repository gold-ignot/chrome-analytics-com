import { apiClient, Category } from './api';

// Cache categories in memory for the lifetime of the server process
let categoriesCache: Category[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function getCategories(): Promise<Category[]> {
  // Check if cache is still valid
  if (categoriesCache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return categoriesCache;
  }

  try {
    const response = await apiClient.getCategories();
    // Only cache categories with significant extension counts
    categoriesCache = response.categories.filter(cat => cat.count >= 5);
    cacheTimestamp = Date.now();
    return categoriesCache;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    // Return fallback categories if API fails
    return getFallbackCategories();
  }
}

export function getFallbackCategories(): Category[] {
  // Fallback categories based on what we know exists
  return [
    { name: 'Developer Tools', slug: 'developer-tools', count: 343, description: 'Essential tools for developers' },
    { name: 'Productivity', slug: 'productivity', count: 0, description: 'Boost efficiency with productivity extensions' },
    { name: 'Shopping', slug: 'shopping', count: 92, description: 'Find deals and shop smarter' },
    { name: 'Communication', slug: 'communication', count: 92, description: 'Stay connected with messaging tools' },
    { name: 'Entertainment', slug: 'entertainment', count: 82, description: 'Games, videos, and fun extensions' },
    { name: 'News & Weather', slug: 'news-weather', count: 31, description: 'Stay informed with news updates' },
  ];
}

// Get top categories by extension count
export async function getTopCategories(limit: number = 10): Promise<Category[]> {
  const categories = await getCategories();
  return categories.slice(0, limit);
}

// Get category by slug
export async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const categories = await getCategories();
  return categories.find(cat => cat.slug === slug);
}

// Check if a category exists
export async function categoryExists(slug: string): Promise<boolean> {
  const category = await getCategoryBySlug(slug);
  return category !== undefined;
}