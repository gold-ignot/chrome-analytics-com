const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Configuration
const SITE_URL = 'https://chrome-analytics.com';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const EXTENSIONS_PER_SITEMAP = 10000;

// Create SEO-friendly slug using slugify package
function createSlug(text) {
  if (!text) return 'chrome-extension';
  
  return slugify(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  }).substring(0, 60).replace(/-+$/, '') || 'chrome-extension';
}

// Fallback categories (in case API is unavailable)
const FALLBACK_CATEGORIES = [
  'extension',
  'tools',
  'workflow-planning',
  'developer-tools',
  'just-for-fun',
  'games',
  'social-networking',
  'education',
  'shopping',
  'entertainment',
  'communication',
  'art-design',
  'well-being',
  'news-weather',
  'travel',
  'household'
];

// API client setup
const API_BASE_URL = 'https://chrome-extension-api.namedry.com';

async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function getCategories() {
  try {
    console.log('Fetching categories from API...');
    const response = await fetchWithTimeout(`${API_BASE_URL}/categories`);
    return response.categories || [];
  } catch (error) {
    console.log('API failed, using fallback categories:', error.message);
    return FALLBACK_CATEGORIES.map(slug => ({ slug, name: slug }));
  }
}

async function getExtensionCount() {
  try {
    console.log('Fetching extension count from API...');
    const response = await fetchWithTimeout(`${API_BASE_URL}/search?page=1&limit=1`);
    return response.pagination?.total || 165234; // fallback estimate
  } catch (error) {
    console.log('API failed, using fallback extension count:', error.message);
    return 165234; // fallback estimate
  }
}

function generateXML(type, content) {
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  
  if (type === 'sitemapindex') {
    return `${header}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${content}
</sitemapindex>`;
  } else {
    return `${header}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${content}
</urlset>`;
  }
}

async function generateCategoriesSitemap() {
  console.log('Generating categories sitemap...');
  const categories = await getCategories();
  const lastmod = new Date().toISOString();
  
  const urls = categories.map(category => 
    `<url><loc>${SITE_URL}/category/${category.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
  ).join('\n');
  
  const xml = generateXML('urlset', urls);
  const filePath = path.join(PUBLIC_DIR, 'sitemap-categories.xml');
  fs.writeFileSync(filePath, xml);
  console.log(`Generated ${filePath} with ${categories.length} categories`);
  
  return 'sitemap-categories.xml';
}

async function getExtensionSitemapList() {
  console.log('Getting extension sitemap list...');
  const totalExtensions = await getExtensionCount();
  const totalSitemaps = Math.ceil(totalExtensions / EXTENSIONS_PER_SITEMAP);
  
  console.log(`Total extensions: ${totalExtensions}, will reference ${totalSitemaps} extension sitemaps`);
  
  const sitemapList = [];
  for (let i = 0; i < totalSitemaps; i++) {
    sitemapList.push(`sitemap-extensions-${i}.xml`);
  }
  
  return sitemapList;
}

async function generateMainSitemap() {
  console.log('Generating main sitemap...');
  
  // Check which extension sitemaps were actually generated
  const generatedSitemaps = [];
  let i = 0;
  while (true) {
    const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${i}.xml`);
    if (fs.existsSync(filePath)) {
      generatedSitemaps.push(`sitemap-extensions-${i}.xml`);
      i++;
    } else {
      break;
    }
  }
  
  // Include the static sitemap-0.xml (already exists)
  // Include categories sitemap  
  // Include ALL the extension sitemaps that were generated
  const sitemaps = [
    `<sitemap><loc>${SITE_URL}/sitemap-0.xml</loc></sitemap>`,
    `<sitemap><loc>${SITE_URL}/sitemap-categories.xml</loc></sitemap>`,
    ...generatedSitemaps.map(filename => 
      `<sitemap><loc>${SITE_URL}/${filename}</loc></sitemap>`
    )
  ];
  
  const xml = generateXML('sitemapindex', sitemaps.join('\n'));
  const filePath = path.join(PUBLIC_DIR, 'sitemap.xml');
  fs.writeFileSync(filePath, xml);
  console.log(`Generated ${filePath} with ${sitemaps.length} sitemaps (${generatedSitemaps.length} extension sitemaps)`);
}

async function fetchExtensionsPage(page, limit) {
  try {
    console.log(`Fetching extensions page ${page}...`);
    const response = await fetchWithTimeout(`${API_BASE_URL}/search?page=${page}&limit=${limit}&sort_by=users&order=desc`);
    return response.results || [];
  } catch (error) {
    console.log(`Failed to fetch extensions page ${page}:`, error.message);
    return [];
  }
}

async function generateExtensionSitemaps() {
  console.log('Generating extension sitemaps with ALL extension data...');
  const totalExtensions = await getExtensionCount();
  const totalSitemaps = Math.ceil(totalExtensions / EXTENSIONS_PER_SITEMAP);
  
  console.log(`Total extensions: ${totalExtensions}, generating ${totalSitemaps} sitemaps`);
  
  let currentExtensionCount = 0;
  let currentSitemapIndex = 0;
  let currentSitemapUrls = [];
  
  // Fetch ALL extensions, paginated
  let page = 1;
  let hasMorePages = true;
  
  while (hasMorePages && currentSitemapIndex < totalSitemaps) {
    console.log(`Fetching extensions page ${page}...`);
    const extensions = await fetchExtensionsPage(page, 100);
    
    if (extensions.length === 0) {
      hasMorePages = false;
      break;
    }
    
    for (const extension of extensions) {
      const lastmod = new Date().toISOString();
      // Use extension's slug if available, otherwise create SEO-friendly slug from extension name
      const slug = (extension.slug && extension.slug.trim()) || createSlug(extension.name || 'chrome-extension');
      currentSitemapUrls.push(`<url><loc>${SITE_URL}/extension/${slug}/${extension.extension_id}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`);
      currentExtensionCount++;
      
      // Check if we've reached the limit for current sitemap
      if (currentSitemapUrls.length >= EXTENSIONS_PER_SITEMAP) {
        // Write current sitemap
        const xml = generateXML('urlset', currentSitemapUrls.join('\n'));
        const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${currentSitemapIndex}.xml`);
        fs.writeFileSync(filePath, xml);
        console.log(`Generated ${filePath} with ${currentSitemapUrls.length} extensions`);
        
        // Reset for next sitemap
        currentSitemapIndex++;
        currentSitemapUrls = [];
      }
    }
    
    page++;
    
    // Add a small delay to be respectful to the API
    if (page % 10 === 0) {
      console.log(`Processed ${currentExtensionCount} extensions so far...`);
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay every 10 pages
    }
  }
  
  // Write any remaining extensions in the last sitemap
  if (currentSitemapUrls.length > 0) {
    const xml = generateXML('urlset', currentSitemapUrls.join('\n'));
    const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${currentSitemapIndex}.xml`);
    fs.writeFileSync(filePath, xml);
    console.log(`Generated final ${filePath} with ${currentSitemapUrls.length} extensions`);
    currentSitemapIndex++;
  }
  
  console.log(`Generated ${currentSitemapIndex} extension sitemaps with ${currentExtensionCount} total extensions`);
}

async function main() {
  try {
    console.log('Starting sitemap generation...');
    
    // Ensure public directory exists
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    
    // Generate all sitemaps
    await generateCategoriesSitemap();
    await generateExtensionSitemaps();
    await generateMainSitemap();
    
    console.log('Sitemap generation completed successfully!');
  } catch (error) {
    console.error('Error generating sitemaps:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };