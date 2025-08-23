import { GetServerSideProps } from 'next'
import { getServerSideSitemap, ISitemapField } from 'next-sitemap'
import { apiClient } from '@/lib/api'
import { createExtensionSlug } from '@/lib/slugs'

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com'
  const { id } = ctx.params!
  
  try {
    const sitemapId = parseInt(id as string)
    const extensionsPerSitemap = 10000
    const page = sitemapId + 1 // Convert to 1-based page number
    
    // Fetch extensions for this sitemap batch
    const response = await apiClient.getExtensions(page, extensionsPerSitemap, 'users', 'desc')
    
    const fields: ISitemapField[] = response.extensions.map((extension) => {
      const slug = createExtensionSlug(extension)
      return {
        loc: `${siteUrl}/extension/${slug}/${extension.extension_id}`,
      lastmod: extension.last_updated_at || new Date().toISOString(),
      changefreq: 'weekly',
      priority: Math.min(0.9, Math.max(0.3, extension.users / 10000000)), // Priority based on user count
      // Add structured data context for better indexing
        alternateRefs: [
          {
            href: `${siteUrl}/extension/${slug}/${extension.extension_id}`,
            hreflang: 'en',
          },
        ],
      }
    })

    return getServerSideSitemap(ctx, fields)
  } catch (error) {
    console.error('Error generating extensions sitemap:', error)
    // Return empty sitemap on error
    return getServerSideSitemap(ctx, [])
  }
}

// Default export to prevent nextjs errors
export default function ExtensionsSitemap() {}