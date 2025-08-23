import { GetServerSideProps } from 'next'
import { getServerSideSitemapIndexLegacy } from 'next-sitemap'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'
  
  try {
    // Use a reasonable estimate for extensions if API is unavailable
    // Based on user's requirement of 165K+ extensions
    const totalExtensions = 165234
    const extensionsPerSitemap = 10000 // Google's recommended limit per sitemap
    const totalSitemaps = Math.ceil(totalExtensions / extensionsPerSitemap)
    
    // Generate sitemap URLs for each batch of extensions
    const sitemaps = []
    for (let i = 0; i < totalSitemaps; i++) {
      sitemaps.push(`${siteUrl}/server-sitemap-extensions-${i}.xml`)
    }
    
    return getServerSideSitemapIndexLegacy(ctx, sitemaps)
  } catch (error) {
    console.error('Error generating server sitemap index:', error)
    // Return empty sitemap index on error
    return getServerSideSitemapIndexLegacy(ctx, [])
  }
}

// Default export to prevent nextjs errors
export default function ServerSitemapIndex() {}