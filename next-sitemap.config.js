/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://chrome-analytics.com',
  generateRobotsText: false, // We manage robots.txt manually
  exclude: [
    '/server-sitemap-index.xml',
    '/server-sitemap-extensions-*.xml',
    '/server-sitemap-categories.xml'
  ],
  additionalPaths: async (config) => {
    const result = []

    // Categories are now handled by server-sitemap-categories.xml

    // Add filter pages
    const filters = ['popular', 'top-rated', 'trending'];
    filters.forEach(filter => {
      result.push({
        loc: `/${filter}`,
        changefreq: 'daily',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      })
    });

    // Add granular "best" pages for long-tail keywords
    const bestTypes = [
      'productivity-extensions',
      'developer-extensions',
      'shopping-extensions',
      'ad-blockers',
      'password-managers',
      'social-media-tools',
      'grammar-checkers',
      'screenshot-tools'
    ];

    bestTypes.forEach(type => {
      result.push({
        loc: `/best/${type}`,
        changefreq: 'weekly',
        priority: 0.6,
        lastmod: new Date().toISOString(),
      })
    });

    return result
  },
  // Transform function to modify URLs or add custom fields
  transform: async (config, path) => {
    // Custom priority logic
    let priority = 0.5;
    let changefreq = 'monthly';

    if (path === '/') {
      priority = 1.0;
      changefreq = 'daily';
    } else if (path === '/extensions') {
      priority = 0.9;
      changefreq = 'daily';
    } else if (path.startsWith('/category/')) {
      priority = 0.8;
      changefreq = 'weekly';
    } else if (path.includes('popular') || path.includes('top-rated') || path.includes('trending')) {
      priority = 0.7;
      changefreq = 'daily';
    } else if (path.startsWith('/best/')) {
      priority = 0.6;
      changefreq = 'weekly';
    } else if (path.startsWith('/extension/')) {
      priority = 0.5;
      changefreq = 'weekly';
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
      // Add structured data hints for search engines
      alternateRefs: config.alternateRefs ?? [],
    }
  }
}