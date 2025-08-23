import { GetServerSideProps } from 'next'
import { getServerSideSitemapIndex } from 'next-sitemap'
import { apiClient } from '@/lib/api'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'
  
  try {
    // Get first page to determine total number of extensions
    const response = await apiClient.getExtensions(1, 1)
    const totalExtensions = response.total
    const extensionsPerSitemap = 10000 // Google's recommended limit per sitemap
    const totalSitemaps = Math.ceil(totalExtensions / extensionsPerSitemap)
    
    // Generate sitemap URLs for each batch of extensions
    const sitemaps = []
    for (let i = 0; i < totalSitemaps; i++) {
      sitemaps.push(`${siteUrl}/server-sitemap-extensions-${i}.xml`)
    }
    
    return getServerSideSitemapIndex(ctx, sitemaps)
  } catch (error) {
    console.error('Error generating server sitemap index:', error)
    // Return empty sitemap index on error
    return getServerSideSitemapIndex(ctx, [])
  }
}

// Default export to prevent nextjs errors
export default function ServerSitemapIndex() {}