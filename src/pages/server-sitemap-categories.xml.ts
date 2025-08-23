import { GetServerSideProps } from 'next'
import { getServerSideSitemapLegacy, ISitemapField } from 'next-sitemap'
import { apiClient } from '@/lib/api'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'
  
  try {
    // Fetch categories from API
    const categoriesResponse = await apiClient.getCategories()
    
    const fields: ISitemapField[] = categoriesResponse.categories.map((category) => ({
      loc: `${siteUrl}/category/${category.slug}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    }))

    return getServerSideSitemapLegacy(ctx, fields)
  } catch (error) {
    console.error('Error generating categories sitemap:', error)
    
    // Fallback to hardcoded categories if API fails
    const fallbackCategories = [
      'productivity',
      'shopping',
      'developer-tools', 
      'communication',
      'entertainment',
      'news-weather',
      'social-communication',
      'accessibility',
      'photos',
      'search-tools'
    ]
    
    const fields: ISitemapField[] = fallbackCategories.map((category) => ({
      loc: `${siteUrl}/category/${category}`,
      lastmod: new Date().toISOString(),
      changefreq: 'weekly',
      priority: 0.8,
    }))
    
    return getServerSideSitemapLegacy(ctx, fields)
  }
}

// Default export to prevent nextjs errors
export default function CategoriesSitemap() {}