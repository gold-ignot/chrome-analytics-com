const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
const cliProgress = require('cli-progress');

// Configuration
const SITE_URL = 'https://chrome-analytics.com';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const EXTENSIONS_PER_SITEMAP = 10000;
const CHECKPOINT_FILE = path.join(__dirname, '.sitemap-progress.json');

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

async function getExtensionCount(ora) {
  const spinner = ora('Fetching extension count from API...').start();
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/search?page=1&limit=1`);
    const count = response.pagination?.total || 165234;
    spinner.succeed(`Found ${count.toLocaleString()} total extensions`);
    return count;
  } catch (error) {
    spinner.warn(`API failed, using fallback extension count: 165,234 (${error.message})`);
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

// Checkpoint management
function saveCheckpoint(data) {
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn(`Failed to save checkpoint: ${error.message}`);
  }
}

function loadCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
    }
  } catch (error) {
    console.warn(`Failed to load checkpoint: ${error.message}`);
  }
  return null;
}

function clearCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    console.warn(`Failed to clear checkpoint: ${error.message}`);
  }
}

async function fetchExtensionsPage(page, limit, retries = 3) {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/search?page=${page}&limit=${limit}&sort_by=users&order=desc`, retries);
    return response.results || [];
  } catch (error) {
    console.log(`\nWarning: Failed to fetch page ${page} after ${retries} retries: ${error.message}`);
    return [];
  }
}

async function generateExtensionSitemaps(ora) {
  const totalExtensions = await getExtensionCount(ora);
  const totalSitemaps = Math.ceil(totalExtensions / EXTENSIONS_PER_SITEMAP);
  const totalPages = Math.ceil(totalExtensions / 100); // 100 extensions per page
  
  // Check for existing checkpoint
  let checkpoint = loadCheckpoint();
  let startPage = 1;
  let currentExtensionCount = 0;
  let currentSitemapIndex = 0;
  let currentSitemapUrls = [];
  let processedPages = 0;
  
  if (checkpoint) {
    startPage = checkpoint.lastPage + 1;
    currentExtensionCount = checkpoint.extensionCount;
    currentSitemapIndex = checkpoint.sitemapIndex;
    currentSitemapUrls = checkpoint.currentSitemapUrls || [];
    processedPages = checkpoint.processedPages;
    console.log(`\n📁 Resuming from checkpoint: page ${startPage}, ${currentExtensionCount.toLocaleString()} extensions processed\n`);
  }
  
  // Create progress bar
  const progressBar = new cliProgress.SingleBar({
    format: 'Fetching Extensions |{bar}| {percentage}% | {value}/{total} pages | {extensions} extensions | ETA: {eta}s | Errors: {errors}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });
  
  progressBar.start(totalPages, processedPages, { extensions: currentExtensionCount, errors: 0 });
  
  // Adaptive concurrency and throttling
  let concurrency = 2;
  let baseDelay = 100;
  let totalErrors = 0;
  let recentRequestTimes = [];
  const maxRecentTimes = 10;
  
  try {
    for (let page = startPage; page <= totalPages; page += concurrency) {
      // Save checkpoint every 50 pages
      if (page % 50 === 0) {
        saveCheckpoint({
          lastPage: page - 1,
          extensionCount: currentExtensionCount,
          sitemapIndex: currentSitemapIndex,
          currentSitemapUrls: currentSitemapUrls,
          processedPages: processedPages,
          timestamp: new Date().toISOString()
        });
      }
      
      // Fetch pages with current concurrency
      const pagePromises = [];
      const pagesToFetch = [];
      
      for (let i = 0; i < concurrency && (page + i) <= totalPages; i++) {
        const currentPage = page + i;
        pagesToFetch.push(currentPage);
        pagePromises.push(fetchExtensionsPage(currentPage, 100));
      }
      
      const startTime = Date.now();
      const results = await Promise.all(pagePromises);
      const endTime = Date.now();
      const batchTime = endTime - startTime;
      
      // Track recent request times for adaptive throttling
      recentRequestTimes.push(batchTime);
      if (recentRequestTimes.length > maxRecentTimes) {
        recentRequestTimes.shift();
      }
      
      // Process all fetched pages
      let batchErrors = 0;
      for (let i = 0; i < results.length; i++) {
        const extensions = results[i];
        processedPages++;
        
        if (extensions.length === 0) {
          batchErrors++;
        } else {
          for (const extension of extensions) {
            const lastmod = new Date().toISOString();
            const slug = (extension.slug && extension.slug.trim()) || createSlug(extension.name || 'chrome-extension');
            currentSitemapUrls.push(`<url><loc>${SITE_URL}/extension/${slug}/${extension.extension_id}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`);
            currentExtensionCount++;
            
            // Check if we've reached the limit for current sitemap
            if (currentSitemapUrls.length >= EXTENSIONS_PER_SITEMAP) {
              const xml = generateXML('urlset', currentSitemapUrls.join('\n'));
              const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${currentSitemapIndex}.xml`);
              fs.writeFileSync(filePath, xml);
              currentSitemapIndex++;
              currentSitemapUrls = [];
            }
          }
        }
      }
      
      totalErrors += batchErrors;
      
      // Update progress bar
      progressBar.update(processedPages, { 
        extensions: currentExtensionCount, 
        errors: totalErrors 
      });
      
      // Adaptive throttling based on performance
      const avgRecentTime = recentRequestTimes.reduce((sum, time) => sum + time, 0) / recentRequestTimes.length;
      
      if (batchErrors > 0 || avgRecentTime > 5000) {
        // If errors or slow responses, reduce concurrency and add delay
        concurrency = Math.max(1, concurrency - 1);
        baseDelay = Math.min(2000, baseDelay * 1.5);
        console.log(`\n⚠️ Throttling: concurrency=${concurrency}, delay=${baseDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, baseDelay));
      } else if (batchErrors === 0 && avgRecentTime < 1000 && recentRequestTimes.length >= 5) {
        // If no errors and fast responses, gradually increase concurrency
        concurrency = Math.min(4, concurrency + 1);
        baseDelay = Math.max(50, baseDelay * 0.9);
      }
      
      // Regular delay
      if (baseDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, baseDelay));
      }
    }
    
    // Write any remaining extensions in the last sitemap
    if (currentSitemapUrls.length > 0) {
      const xml = generateXML('urlset', currentSitemapUrls.join('\n'));
      const filePath = path.join(PUBLIC_DIR, `sitemap-extensions-${currentSitemapIndex}.xml`);
      fs.writeFileSync(filePath, xml);
      currentSitemapIndex++;
    }
    
    progressBar.stop();
    
    // Clear checkpoint on successful completion
    clearCheckpoint();
    
    const spinner = ora().start();
    const errorMessage = totalErrors > 0 ? ` (${totalErrors} failed requests)` : '';
    spinner.succeed(`Generated ${currentSitemapIndex} extension sitemaps with ${currentExtensionCount.toLocaleString()} total extensions${errorMessage}`);
    
  } catch (error) {
    progressBar.stop();
    
    // Save final checkpoint before failing
    saveCheckpoint({
      lastPage: page - 1,
      extensionCount: currentExtensionCount,
      sitemapIndex: currentSitemapIndex,
      currentSitemapUrls: currentSitemapUrls,
      processedPages: processedPages,
      timestamp: new Date().toISOString(),
      error: error.message
    });
    
    throw error;
  }
}

async function main() {
  const startTime = Date.now();
  
  // Check for command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--clear-checkpoint')) {
    clearCheckpoint();
    console.log('✅ Checkpoint cleared');
    return;
  }
  
  try {
    // Dynamic import of ora (ES module)
    const { default: ora } = await import('ora');
    
    console.log('\n🚀 Starting sitemap generation...\n');
    
    // Check if resuming from checkpoint
    const existingCheckpoint = loadCheckpoint();
    if (existingCheckpoint) {
      console.log(`📁 Found existing checkpoint from ${existingCheckpoint.timestamp}`);
      console.log(`   Last page: ${existingCheckpoint.lastPage}`);
      console.log(`   Extensions processed: ${existingCheckpoint.extensionCount?.toLocaleString() || 0}`);
      if (existingCheckpoint.error) {
        console.log(`   Previous error: ${existingCheckpoint.error}`);
      }
      console.log('\n   Run with --clear-checkpoint to start fresh\n');
    }
    
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
      
      const checkpoint = loadCheckpoint();
      if (checkpoint) {
        console.log(`\n💾 Progress saved to checkpoint. Run again to resume from page ${checkpoint.lastPage + 1}`);
        console.log(`   Or use --clear-checkpoint to start fresh\n`);
      }
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