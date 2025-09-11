const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const cliProgress = require('cli-progress');

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

// Fallback categories (must match CATEGORIES in seoHelpers.ts)
const FALLBACK_CATEGORIES = [
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
];

// API client setup
const API_BASE_URL = 'https://chrome-extension-api.namedry.com';

async function fetchWithTimeout(url, timeout = 30000) {
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

async function fetchWithRetry(url, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchWithTimeout(url);
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function getCategories(ora) {
  const spinner = ora('Fetching categories from API...').start();
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/categories`);
    spinner.succeed(`Fetched ${response.categories?.length || 0} categories from API`);
    return response.categories || [];
  } catch (error) {
    spinner.warn(`API failed, using ${FALLBACK_CATEGORIES.length} fallback categories: ${error.message}`);
    return FALLBACK_CATEGORIES.map(slug => ({ slug, name: slug }));
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

async function generateCategoriesSitemap(ora) {
  const spinner = ora('Generating categories sitemap...').start();
  const categories = await getCategories(ora);
  const lastmod = new Date().toISOString();
  
  const urls = categories.map(category => 
    `<url><loc>${SITE_URL}/category/${category.slug}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`
  ).join('\n');
  
  const xml = generateXML('urlset', urls);
  const filePath = path.join(PUBLIC_DIR, 'sitemap-categories.xml');
  fs.writeFileSync(filePath, xml);
  spinner.succeed(`Generated categories sitemap with ${categories.length} categories`);
  
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

async function generateMainSitemap(ora) {
  const spinner = ora('Generating main sitemap index...').start();
  
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
  spinner.succeed(`Generated main sitemap index with ${sitemaps.length} sitemaps (${generatedSitemaps.length} extension sitemaps)`);
}


async function fetchAllSitemapUrls(retries = 3) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/sitemap/urls`, retries);
    return response.urls || [];
  } catch (error) {
    console.log(`\nWarning: Failed to fetch sitemap URLs after ${retries} retries: ${error.message}`);
    return [];
  }
}

async function generateExtensionSitemaps(ora) {
  const spinner = ora('Fetching all extension URLs from sitemap endpoint...').start();
  
  try {
    const allUrls = await fetchAllSitemapUrls();
    
    if (allUrls.length === 0) {
      spinner.warn('No URLs received from sitemap endpoint');
      return;
    }
    
    spinner.succeed(`Fetched ${allUrls.length.toLocaleString()} extension URLs from sitemap endpoint`);
    
    const totalSitemaps = Math.ceil(allUrls.length / EXTENSIONS_PER_SITEMAP);
    const lastmod = new Date().toISOString();
    
    // Create progress bar
    const progressBar = new cliProgress.SingleBar({
      format: 'Generating Sitemaps |{bar}| {percentage}% | {value}/{total} URLs processed',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });
    
    progressBar.start(allUrls.length, 0);
    
    let currentSitemapIndex = 0;
    let currentSitemapUrls = [];
    let processedCount = 0;
    
    for (const urlObj of allUrls) {
      const sitemapUrl = `<url><loc>${SITE_URL}${urlObj.url}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`;
      currentSitemapUrls.push(sitemapUrl);
      processedCount++;
      
      // Check if we've reached the limit for current sitemap
      if (currentSitemapUrls.length >= EXTENSIONS_PER_SITEMAP) {
        const xml = generateXML('urlset', currentSitemapUrls.join('\n'));
        const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${currentSitemapIndex}.xml`);
        fs.writeFileSync(filePath, xml);
        currentSitemapIndex++;
        currentSitemapUrls = [];
      }
      
      // Update progress
      progressBar.update(processedCount);
    }
    
    // Write any remaining extensions in the last sitemap
    if (currentSitemapUrls.length > 0) {
      const xml = generateXML('urlset', currentSitemapUrls.join('\n'));
      const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${currentSitemapIndex}.xml`);
      fs.writeFileSync(filePath, xml);
      currentSitemapIndex++;
    }
    
    progressBar.stop();
    
    const finalSpinner = ora().start();
    finalSpinner.succeed(`Generated ${currentSitemapIndex} extension sitemaps with ${allUrls.length.toLocaleString()} total extensions`);
    
  } catch (error) {
    spinner.fail(`Failed to generate extension sitemaps: ${error.message}`);
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  
  try {
    // Dynamic import of ora (ES module)
    const { default: ora } = await import('ora');
    
    console.log('\n🚀 Starting sitemap generation...\n');
    
    // Ensure public directory exists
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    
    // Generate all sitemaps
    await generateCategoriesSitemap(ora);
    await generateExtensionSitemaps(ora);
    await generateMainSitemap(ora);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);
    
    const finalSpinner = ora().start();
    finalSpinner.succeed(`\n✅ Sitemap generation completed successfully in ${duration}s!\n`);
    
  } catch (error) {
    try {
      const { default: ora } = await import('ora');
      const errorSpinner = ora().start();
      errorSpinner.fail(`❌ Error generating sitemaps: ${error.message}`);
    } catch {
      console.error(`❌ Error generating sitemaps: ${error.message}`);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };