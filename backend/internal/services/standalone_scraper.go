package services

import (
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"chrome-analytics-backend/internal/models"
	"github.com/PuerkitoBio/goquery"
)

type StandaloneScraper struct {
	client       *http.Client
	proxyClient  *http.Client
	metrics      *ScraperMetrics
	proxyManager *StandaloneProxyManager
	extractor    *Extractor
	mu           sync.RWMutex
}

type ScraperMetrics struct {
	TotalRequests     int64
	SuccessfulScrapes int64
	FailedScrapes     int64
	TimeoutErrors     int64
	ConnectionErrors  int64
	ParseErrors       int64
	TotalDuration     time.Duration
	LastError         string
	LastErrorTime     time.Time
}

type ExtensionReview struct {
	Author      string    `json:"author"`
	Rating      int       `json:"rating"`
	Date        time.Time `json:"date"`
	Content     string    `json:"content"`
	Helpful     int       `json:"helpful"`
	ProfileURL  string    `json:"profile_url,omitempty"`
}

type RelatedExtension struct {
	ExtensionID string  `json:"extension_id"`
	Name        string  `json:"name"`
	Rating      float64 `json:"rating"`
	Users       int64   `json:"users"`
	IconURL     string  `json:"icon_url,omitempty"`
}

type ExtensionPermission struct {
	Permission  string `json:"permission"`
	Description string `json:"description"`
}

// Using existing ProxyConfig and ProxyManager from proxy.go

type StandaloneProxyManager struct {
	proxies       []ProxyConfig
	currentIndex  int
	mu            sync.Mutex
	successCount  map[string]int
	failureCount  map[string]int
	lastUsed      map[string]time.Time
	rotateAfter   int // Number of requests before rotating
	requestCount  int
}

func NewStandaloneScraper() *StandaloneScraper {
	// Create HTTP client with reasonable timeouts and headers
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        50,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     30 * time.Second,
		},
	}

	return &StandaloneScraper{
		client:    client,
		metrics:   &ScraperMetrics{},
		extractor: NewExtractor(),
	}
}

// NewStandaloneScraperWithProxies creates a scraper with proxy support
func NewStandaloneScraperWithProxies(proxies []ProxyConfig) *StandaloneScraper {
	// Create regular HTTP client
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        50,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     30 * time.Second,
		},
	}

	// Create proxy manager
	proxyManager := &StandaloneProxyManager{
		proxies:       proxies,
		currentIndex:  0,
		successCount:  make(map[string]int),
		failureCount:  make(map[string]int),
		lastUsed:      make(map[string]time.Time),
		rotateAfter:   5, // Rotate proxy every 5 requests
		requestCount:  0,
	}

	scraper := &StandaloneScraper{
		client:       client,
		metrics:      &ScraperMetrics{},
		proxyManager: proxyManager,
		extractor:    NewExtractor(),
	}

	// Initialize proxy client with first proxy
	if len(proxies) > 0 {
		scraper.updateProxyClient(proxies[0])
	}

	return scraper
}

// updateProxyClient creates or updates the proxy client with a new proxy
func (ss *StandaloneScraper) updateProxyClient(proxy ProxyConfig) error {
	proxyURL := fmt.Sprintf("http://%s:%s@%s:%s", 
		proxy.Username, proxy.Password, proxy.Host, proxy.Port)
	
	parsedURL, err := url.Parse(proxyURL)
	if err != nil {
		return fmt.Errorf("failed to parse proxy URL: %w", err)
	}

	ss.mu.Lock()
	defer ss.mu.Unlock()

	ss.proxyClient = &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			Proxy:               http.ProxyURL(parsedURL),
			MaxIdleConns:        50,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     30 * time.Second,
		},
	}

	return nil
}

// rotateProxy switches to the next available proxy
func (ss *StandaloneScraper) rotateProxy() error {
	if ss.proxyManager == nil || len(ss.proxyManager.proxies) == 0 {
		return fmt.Errorf("no proxies available")
	}

	ss.proxyManager.mu.Lock()
	defer ss.proxyManager.mu.Unlock()

	// Move to next proxy
	ss.proxyManager.currentIndex = (ss.proxyManager.currentIndex + 1) % len(ss.proxyManager.proxies)
	proxy := ss.proxyManager.proxies[ss.proxyManager.currentIndex]

	// Update the proxy client
	err := ss.updateProxyClient(proxy)
	if err != nil {
		return fmt.Errorf("failed to update proxy client: %w", err)
	}

	proxyKey := fmt.Sprintf("%s:%s", proxy.Host, proxy.Port)
	ss.proxyManager.lastUsed[proxyKey] = time.Now()

	return nil
}

// getClient returns the appropriate HTTP client (with or without proxy)
func (ss *StandaloneScraper) getClient(useProxy bool) *http.Client {
	if useProxy && ss.proxyClient != nil {
		// Check if we need to rotate proxy
		if ss.proxyManager != nil {
			ss.proxyManager.mu.Lock()
			ss.proxyManager.requestCount++
			shouldRotate := ss.proxyManager.requestCount >= ss.proxyManager.rotateAfter
			ss.proxyManager.mu.Unlock()

			if shouldRotate {
				if err := ss.rotateProxy(); err == nil {
					ss.proxyManager.mu.Lock()
					ss.proxyManager.requestCount = 0
					ss.proxyManager.mu.Unlock()
				}
			}
		}

		ss.mu.RLock()
		defer ss.mu.RUnlock()
		return ss.proxyClient
	}
	return ss.client
}

// ScrapeExtension scrapes extension data directly from Chrome Web Store
func (ss *StandaloneScraper) ScrapeExtension(extensionID string) (*models.Extension, error) {
	// Use proxy if available
	useProxy := ss.proxyManager != nil && len(ss.proxyManager.proxies) > 0
	return ss.scrapeExtensionWithClient(extensionID, useProxy)
}

// ScrapeExtensionWithProxy forces using a proxy for scraping
func (ss *StandaloneScraper) ScrapeExtensionWithProxy(extensionID string) (*models.Extension, error) {
	if ss.proxyManager == nil || len(ss.proxyManager.proxies) == 0 {
		return nil, fmt.Errorf("no proxies configured")
	}
	return ss.scrapeExtensionWithClient(extensionID, true)
}

// ScrapeExtensionDirectly forces direct connection without proxy
func (ss *StandaloneScraper) ScrapeExtensionDirectly(extensionID string) (*models.Extension, error) {
	return ss.scrapeExtensionWithClient(extensionID, false)
}

// scrapeExtensionWithClient is the core scraping method that can use proxy or direct connection
func (ss *StandaloneScraper) scrapeExtensionWithClient(extensionID string, useProxy bool) (*models.Extension, error) {
	startTime := time.Now()
	ss.metrics.TotalRequests++

	// Chrome Web Store URL for extensions
	targetURL := fmt.Sprintf("https://chromewebstore.google.com/detail/%s", extensionID)

	// Get the appropriate client
	client := ss.getClient(useProxy)

	// Track proxy usage
	proxyInfo := "direct"
	if useProxy && ss.proxyManager != nil {
		ss.proxyManager.mu.Lock()
		if ss.proxyManager.currentIndex < len(ss.proxyManager.proxies) {
			proxy := ss.proxyManager.proxies[ss.proxyManager.currentIndex]
			proxyInfo = fmt.Sprintf("%s:%s", proxy.Host, proxy.Port)
		}
		ss.proxyManager.mu.Unlock()
	}

	// Create request with proper headers
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		ss.recordError("Failed to create request", err)
		if useProxy && ss.proxyManager != nil {
			ss.recordProxyFailure(proxyInfo)
		}
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Add headers to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("DNT", "1")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	// Make the request
	resp, err := client.Do(req)
	if err != nil {
		ss.recordError("HTTP request failed", err)
		ss.metrics.ConnectionErrors++
		if useProxy && ss.proxyManager != nil {
			ss.recordProxyFailure(proxyInfo)
		}
		return nil, fmt.Errorf("failed to fetch extension page: %w", err)
	}
	defer resp.Body.Close()

	// Check status code
	if resp.StatusCode != 200 {
		ss.recordError("Non-200 status code", fmt.Errorf("status: %d", resp.StatusCode))
		ss.metrics.FailedScrapes++
		if useProxy && ss.proxyManager != nil {
			ss.recordProxyFailure(proxyInfo)
		}
		return nil, fmt.Errorf("received status code %d for extension %s", resp.StatusCode, extensionID)
	}

	// Record proxy success if using proxy
	if useProxy && ss.proxyManager != nil {
		ss.recordProxySuccess(proxyInfo)
	}

	// Handle gzipped response
	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Encoding") == "gzip" {
		gzipReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			ss.recordError("Failed to create gzip reader", err)
			return nil, fmt.Errorf("failed to create gzip reader: %w", err)
		}
		defer gzipReader.Close()
		reader = gzipReader
	}

	// Read response body
	body, err := io.ReadAll(reader)
	if err != nil {
		ss.recordError("Failed to read response body", err)
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Parse the HTML to extract extension data
	extension, err := ss.parseExtensionData(extensionID, string(body))
	if err != nil {
		ss.recordError("Failed to parse extension data", err)
		ss.metrics.ParseErrors++
		return nil, fmt.Errorf("failed to parse extension data: %w", err)
	}

	// Record success metrics
	ss.metrics.SuccessfulScrapes++
	duration := time.Since(startTime)
	ss.metrics.TotalDuration += duration

	return extension, nil
}

// parseExtensionData extracts extension information from the Chrome Web Store HTML
func (ss *StandaloneScraper) parseExtensionData(extensionID, html string) (*models.Extension, error) {
	extension := &models.Extension{
		ExtensionID: extensionID,
		Category:    "Productivity", // Default category
		Keywords:    []string{},     // Initialize as empty array
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Extract extension name from title
	nameRegex := regexp.MustCompile(`<title[^>]*>([^<]+?) - Chrome Web Store</title>`)
	if matches := nameRegex.FindStringSubmatch(html); len(matches) > 1 {
		extension.Name = strings.TrimSpace(matches[1])
	}

	// Extract developer name - look for various patterns in the Chrome Web Store
	devPatterns := []string{
		`"author":\s*"([^"]+)"`,                              // JSON-LD structure
		`(?i)offered\s+by\s+([^<\n]+?)(?:\s|<|$)`,           // "Offered by" text
		`(?i)by\s+([^<\n]+?)(?:\s|<|$)`,                     // "By" text
		`"developer":\s*"([^"]+)"`,                          // JSON developer field
	}
	for _, pattern := range devPatterns {
		devRegex := regexp.MustCompile(pattern)
		if matches := devRegex.FindStringSubmatch(html); len(matches) > 1 {
			extension.Developer = strings.TrimSpace(matches[1])
			break
		}
	}

	// Extract user count - look for various user count patterns
	userPatterns := []string{
		`"userCount":\s*"([^"]+)"`,                          // JSON user count
		`"users":\s*"([^"]+)"`,                              // JSON users field
		`([\d,]+)\+?\s*users?`,                              // "X users" text
		`Used by\s+([\d,]+)`,                                // "Used by X" text
	}
	for _, pattern := range userPatterns {
		userRegex := regexp.MustCompile(pattern)
		if matches := userRegex.FindStringSubmatch(html); len(matches) > 1 {
			userStr := strings.ReplaceAll(matches[1], ",", "")
			if users, err := strconv.ParseInt(userStr, 10, 64); err == nil {
				extension.Users = users
				break
			}
		}
	}

	// Extract rating - look for various rating patterns
	ratingPatterns := []string{
		`"ratingValue":\s*"([^"]+)"`,                        // JSON-LD rating
		`"averageRating":\s*([0-9.]+)`,                      // JSON rating
		`(\d+\.?\d*)\s*(?:stars?|out of 5)`,                // "X stars" text
		`rating[^>]*>\s*(\d+\.?\d*)`,                        // Rating in element
	}
	for _, pattern := range ratingPatterns {
		ratingRegex := regexp.MustCompile(pattern)
		if matches := ratingRegex.FindStringSubmatch(html); len(matches) > 1 {
			if rating, err := strconv.ParseFloat(matches[1], 64); err == nil {
				extension.Rating = rating
				break
			}
		}
	}

	// Extract review count - look for various review count patterns
	reviewPatterns := []string{
		`"reviewCount":\s*"([^"]+)"`,                        // JSON review count
		`"ratingCount":\s*([0-9,]+)`,                        // JSON rating count
		`([\d,]+)\s*(?:reviews?|ratings?)`,                 // "X reviews" text
	}
	for _, pattern := range reviewPatterns {
		reviewRegex := regexp.MustCompile(pattern)
		if matches := reviewRegex.FindStringSubmatch(html); len(matches) > 1 {
			reviewStr := strings.ReplaceAll(matches[1], ",", "")
			if reviews, err := strconv.ParseInt(reviewStr, 10, 64); err == nil {
				extension.ReviewCount = reviews
				break
			}
		}
	}

	// Extract description - look for meta description or JSON-LD
	descPatterns := []string{
		`<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']`, // Meta description
		`"description":\s*"([^"]+)"`,                                      // JSON description
	}
	for _, pattern := range descPatterns {
		descRegex := regexp.MustCompile(pattern)
		if matches := descRegex.FindStringSubmatch(html); len(matches) > 1 {
			extension.Description = strings.TrimSpace(matches[1])
			if len(extension.Description) > 0 {
				break
			}
		}
	}

	// If we couldn't find basic info, the extension might not exist or be accessible
	if extension.Name == "" {
		return nil, fmt.Errorf("could not extract extension name - extension may not exist or be inaccessible")
	}

	// Create initial snapshot
	snapshot := models.Snapshot{
		Date:        time.Now(),
		Users:       extension.Users,
		Rating:      extension.Rating,
		ReviewCount: extension.ReviewCount,
	}
	extension.Snapshots = []models.Snapshot{snapshot}

	return extension, nil
}

// ScrapeExtensionComprehensive scrapes all available data for an extension
func (ss *StandaloneScraper) ScrapeExtensionComprehensive(extensionID string) (*models.Extension, []ExtensionReview, []RelatedExtension, []ExtensionPermission, error) {
	// Get basic extension data
	extension, err := ss.ScrapeExtension(extensionID)
	if err != nil {
		return nil, nil, nil, nil, err
	}

	// Fetch the main page HTML again for comprehensive parsing
	url := fmt.Sprintf("https://chromewebstore.google.com/detail/%s", extensionID)
	html, err := ss.fetchPageHTML(url)
	if err != nil {
		return extension, nil, nil, nil, fmt.Errorf("failed to fetch page for comprehensive data: %w", err)
	}

	// Extract comprehensive data
	fullDescription := ss.extractFullDescription(html)
	if fullDescription != "" {
		extension.Description = fullDescription
	}

	// Extract related extensions
	relatedExtensions := ss.extractRelatedExtensions(html)

	// Extract reviews
	reviews := ss.extractReviews(html)

	// Extract permissions
	permissions := ss.extractPermissions(html)

	// Extract additional metadata
	ss.extractAdditionalMetadata(extension, html)

	return extension, reviews, relatedExtensions, permissions, nil
}

// fetchPageHTML fetches and returns the HTML content of a page
func (ss *StandaloneScraper) fetchPageHTML(url string) (string, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	// Add headers to mimic a real browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("DNT", "1")
	req.Header.Set("Connection", "keep-alive")
	req.Header.Set("Upgrade-Insecure-Requests", "1")

	resp, err := ss.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("received status code %d", resp.StatusCode)
	}

	// Handle gzipped response
	var reader io.Reader = resp.Body
	if resp.Header.Get("Content-Encoding") == "gzip" {
		gzipReader, err := gzip.NewReader(resp.Body)
		if err != nil {
			return "", err
		}
		defer gzipReader.Close()
		reader = gzipReader
	}

	body, err := io.ReadAll(reader)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// extractFullDescription extracts the complete extension description
func (ss *StandaloneScraper) extractFullDescription(html string) string {
	// Look for various description patterns in order of preference (excluding unreliable meta tags)
	descPatterns := []string{
		// Chrome Web Store Overview section (highest priority for full description)
		`(?s)<section[^>]*class="[^"]*MHH2Z[^"]*"[^>]*>.*?<h2[^>]*>[^<]*Overview[^<]*</h2>.*?<div[^>]*class="[^"]*RNnO5e[^"]*"[^>]*>.*?<div[^>]*class="[^"]*JJ3H1e[^"]*"[^>]*>(.*?)</div>`,
		`(?s)<div[^>]*class="[^"]*JJ3H1e[^"]*"[^>]*>(.*?)</div>`,
		// Chrome Web Store specific patterns
		`(?s)<div[^>]*class="[^"]*C-b-p-j-Oa[^"]*"[^>]*>([^<]{50,})</div>`,
		`(?s)<div[^>]*class="[^"]*overview[^"]*"[^>]*>([^<]{50,})</div>`,
		`(?s)<section[^>]*class="[^"]*description[^"]*"[^>]*>.*?<p[^>]*>([^<]{50,})</p>`,
		// JSON-LD structured data with more flexible matching
		`"description"\s*:\s*"([^"]+)"`,
		// Try to find full description in JavaScript data
		`window\[.*?\]\s*=\s*\[.*?"([^"]{100,})".*?\]`,
		// Look for longer text content in various containers (actual page content only)
		`(?s)<div[^>]*data-value[^>]*>([^<]{100,})</div>`,
		`(?s)<div[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{50,})</div>`,
		`(?s)<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]{50,})</p>`,
		`(?s)<div[^>]*id="[^"]*description[^"]*"[^>]*>([^<]{50,})</div>`,
		`(?s)<p[^>]*>([^<]{100,})</p>`,
	}

	bestDesc := ""
	for _, pattern := range descPatterns {
		descRegex := regexp.MustCompile(pattern)
		matches := descRegex.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				desc := strings.TrimSpace(match[1])
				
				// Remove HTML tags and clean up content
				desc = regexp.MustCompile(`<[^>]*>`).ReplaceAllString(desc, " ")
				
				// Decode HTML entities
				desc = strings.ReplaceAll(desc, "&quot;", "\"")
				desc = strings.ReplaceAll(desc, "&amp;", "&")
				desc = strings.ReplaceAll(desc, "&lt;", "<")
				desc = strings.ReplaceAll(desc, "&gt;", ">")
				desc = strings.ReplaceAll(desc, "&#39;", "'")
				desc = strings.ReplaceAll(desc, "&nbsp;", " ")
				desc = strings.ReplaceAll(desc, "\\n", " ")
				desc = strings.ReplaceAll(desc, "\\t", " ")
				
				// Clean up whitespace
				desc = regexp.MustCompile(`\s+`).ReplaceAllString(desc, " ")
				desc = strings.TrimSpace(desc)
				
				// Prefer longer descriptions
				if len(desc) > len(bestDesc) && len(desc) > 50 {
					bestDesc = desc
				}
			}
		}
	}

	return bestDesc
}

// extractRelatedExtensions extracts related/similar extensions
func (ss *StandaloneScraper) extractRelatedExtensions(html string) []RelatedExtension {
	var related []RelatedExtension

	// Look for extension IDs in various patterns throughout the page
	patterns := []string{
		// Extension IDs in href attributes
		`href="[^"]*\/detail\/([a-z]{32})"`,
		// Extension IDs in data attributes
		`data-[^=]*="[^"]*([a-z]{32})"`,
		// Extension IDs in JavaScript
		`['"]([a-z]{32})['"]`,
		// Chrome Web Store URLs
		`chrome\.google\.com\/webstore\/detail\/[^\/]*\/([a-z]{32})`,
		`chromewebstore\.google\.com\/detail\/([a-z]{32})`,
	}

	found := make(map[string]bool) // To avoid duplicates

	for _, pattern := range patterns {
		regex := regexp.MustCompile(pattern)
		matches := regex.FindAllStringSubmatch(html, -1)
		
		for _, match := range matches {
			if len(match) > 1 {
				extID := match[1]
				// Skip if we already found this extension ID or if it's the current one
				if !found[extID] && len(related) < 15 {
					found[extID] = true
					related = append(related, RelatedExtension{
						ExtensionID: extID,
						Name:        "", // Name would need separate request
					})
				}
			}
		}
	}

	return related
}

// extractReviews extracts user reviews from the page
func (ss *StandaloneScraper) extractReviews(html string) []ExtensionReview {
	var reviews []ExtensionReview

	// Chrome Web Store loads reviews dynamically, so try to find any embedded review data
	reviewPatterns := []string{
		// Look for JSON review data in various formats
		`"reviews":\s*\[(.*?)\]`,
		`"userReviews":\s*\[(.*?)\]`,
		// Try to find review data in script tags
		`<script[^>]*>.*?"reviews".*?\[(.*?)\].*?</script>`,
		// Look for structured data
		`"@type":\s*"Review"[^}]*"author":\s*\{[^}]*"name":\s*"([^"]+)"[^}]*\}[^}]*"reviewRating":\s*\{[^}]*"ratingValue":\s*(\d+)[^}]*\}[^}]*"reviewBody":\s*"([^"]+)"`,
	}

	for _, pattern := range reviewPatterns {
		regex := regexp.MustCompile(`(?s)` + pattern)
		matches := regex.FindAllStringSubmatch(html, -1)
		
		for _, match := range matches {
			if len(match) > 1 {
				// For structured data pattern (last one)
				if len(match) == 4 {
					rating, _ := strconv.Atoi(match[2])
					reviews = append(reviews, ExtensionReview{
						Author:  match[1],
						Rating:  rating,
						Content: match[3],
						Date:    time.Now(),
					})
					continue
				}
				
				// For JSON patterns, try to extract individual review components
				reviewContent := match[1]
				
				// Look for individual review objects
				reviewObjRegex := regexp.MustCompile(`\{[^}]*"author":\s*"([^"]+)"[^}]*"rating":\s*(\d+)[^}]*"content":\s*"([^"]+)"[^}]*\}`)
				reviewMatches := reviewObjRegex.FindAllStringSubmatch(reviewContent, -1)
				
				for _, reviewMatch := range reviewMatches {
					if len(reviewMatch) == 4 {
						rating, _ := strconv.Atoi(reviewMatch[2])
						reviews = append(reviews, ExtensionReview{
							Author:  reviewMatch[1],
							Rating:  rating,
							Content: reviewMatch[3],
							Date:    time.Now(),
						})
						
						if len(reviews) >= 20 {
							break
						}
					}
				}
			}
		}
	}

	// Note: Chrome Web Store typically loads reviews via AJAX, so we might not find many here
	// In a production system, you'd want to make additional API calls to get reviews
	return reviews
}

// extractPermissions extracts extension permissions
func (ss *StandaloneScraper) extractPermissions(html string) []ExtensionPermission {
	var permissions []ExtensionPermission
	found := make(map[string]bool)

	// Look for permissions in various formats
	permPatterns := []string{
		// JSON permissions arrays
		`"permissions":\s*\[([^\]]*)\]`,
		`"host_permissions":\s*\[([^\]]*)\]`,
		`"optional_permissions":\s*\[([^\]]*)\]`,
		// Manifest permissions
		`"manifest":\s*\{[^}]*"permissions":\s*\[([^\]]*)\]`,
		// Permission descriptions in HTML
		`(?i)(?:permission|access)[^>]*>([^<]+)</`,
		// Look for common permission indicators
		`(?i)(?:can\s+|may\s+|access\s+to\s+)([^<\n\.]+)`,
	}

	for _, pattern := range permPatterns {
		regex := regexp.MustCompile(`(?s)` + pattern)
		matches := regex.FindAllStringSubmatch(html, -1)
		
		for _, match := range matches {
			if len(match) > 1 {
				permContent := match[1]
				
				// Extract individual permission strings
				permRegex := regexp.MustCompile(`"([^"]+)"`)
				permMatches := permRegex.FindAllStringSubmatch(permContent, -1)
				
				for _, permMatch := range permMatches {
					if len(permMatch) > 1 {
						permission := strings.TrimSpace(permMatch[1])
						if permission != "" && !found[permission] && ss.isValidPermission(permission) {
							found[permission] = true
							permissions = append(permissions, ExtensionPermission{
								Permission:  permission,
								Description: ss.getPermissionDescription(permission),
							})
						}
					}
				}
			}
		}
	}

	// If no permissions found through JSON, try to infer from common permission phrases
	if len(permissions) == 0 {
		commonPerms := []string{
			"tabs", "activeTab", "storage", "webRequest", "contextMenus",
			"notifications", "cookies", "history", "bookmarks", "downloads",
		}
		
		for _, perm := range commonPerms {
			if strings.Contains(strings.ToLower(html), perm) {
				permissions = append(permissions, ExtensionPermission{
					Permission:  perm,
					Description: ss.getPermissionDescription(perm),
				})
			}
		}
	}

	return permissions
}

// isValidPermission checks if a string looks like a valid Chrome extension permission
func (ss *StandaloneScraper) isValidPermission(permission string) bool {
	if len(permission) < 3 || len(permission) > 100 {
		return false
	}
	
	// Skip common non-permission strings
	if ss.isCommonWord(permission) {
		return false
	}
	
	// Check if it looks like a permission pattern
	validPatterns := []string{
		`^[a-zA-Z]+$`,              // Simple word permissions like "tabs"
		`^[a-zA-Z]+\.[a-zA-Z]+$`,   // Dotted permissions like "chrome.storage"
		`^\*://`,                   // URL patterns
		`^https?://`,               // HTTP patterns
		`^file://`,                 // File patterns
		`^<all_urls>$`,            // Special permission
	}
	
	for _, pattern := range validPatterns {
		if matched, _ := regexp.MatchString(pattern, permission); matched {
			return true
		}
	}
	
	return false
}

// extractAdditionalMetadata extracts category, version, and other metadata
func (ss *StandaloneScraper) extractAdditionalMetadata(extension *models.Extension, html string) {
	// Extract category
	categoryPatterns := []string{
		`"category":\s*"([^"]+)"`,
		`(?i)category[^>]*>\s*([^<]+)`,
		`"applicationCategory":\s*"([^"]+)"`,
	}
	
	for _, pattern := range categoryPatterns {
		regex := regexp.MustCompile(pattern)
		if match := regex.FindStringSubmatch(html); len(match) > 1 {
			category := strings.TrimSpace(match[1])
			if category != "" && category != "Extension" {
				extension.Category = category
				break
			}
		}
	}

	// Remove the duplicate developer extraction that was causing corruption
	// The developer field is already extracted earlier with proper patterns

	// Extract additional metadata using the CSS selector extractor
	extension.LogoURL = ss.extractor.ExtractLogo(html)
	extension.DeveloperURL = ss.extractor.ExtractDeveloperURL(html)
	extension.Website = ss.extractor.ExtractWebsite(html)
	extension.SupportURL = ss.extractor.ExtractSupportURL(html)
	extension.PrivacyURL = ss.extractor.ExtractPrivacyURL(html)
	extension.Version = ss.extractor.ExtractVersion(html)
	extension.FileSize = ss.extractor.ExtractFileSize(html)
	extension.LastUpdated = ss.extractor.ExtractLastUpdated(html)
	extension.Features = ss.extractor.ExtractFeatures(html)
	extension.Languages = ss.extractor.ExtractLanguages(html)
	extension.Screenshots = ss.extractor.ExtractScreenshots(html)
	extension.Permissions = ss.extractPermissionStrings(html)
}

// isCommonWord checks if a string is a common word that shouldn't be a permission
func (ss *StandaloneScraper) isCommonWord(word string) bool {
	commonWords := []string{"the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "users", "extension", "chrome", "browser"}
	word = strings.ToLower(strings.TrimSpace(word))
	for _, common := range commonWords {
		if word == common {
			return true
		}
	}
	return false
}

// ExtractDeveloperURL extracts the developer's website URL using CSS selectors (public for testing)
func (ss *StandaloneScraper) ExtractDeveloperURL(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	// Look for "Offered by" section and find links
	var devURL string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.Contains(strings.TrimSpace(firstDiv.Text()), "Offered by") {
			// Look for links in this li or nearby
			s.Find("a").Each(func(j int, link *goquery.Selection) {
				href, exists := link.Attr("href")
				if exists && strings.HasPrefix(href, "http") {
					if !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
						devURL = href
					}
				}
			})
		}
	})

	// Also check for general links with privacy/website context
	if devURL == "" {
		doc.Find("a").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if exists && strings.HasPrefix(href, "http") {
				linkText := strings.ToLower(strings.TrimSpace(s.Text()))
				if strings.Contains(linkText, "privacy") || strings.Contains(linkText, "website") {
					if !strings.Contains(href, "chrome.google.com") && !strings.Contains(href, "chromewebstore.google.com") {
						devURL = href
					}
				}
			}
		})
	}

	return devURL
}

// extractDeveloperURL is the internal wrapper
func (ss *StandaloneScraper) extractDeveloperURL(html string) string {
	return ss.ExtractDeveloperURL(html)
}

// extractWebsite extracts the extension's official website URL
func (ss *StandaloneScraper) extractWebsite(html string) string {
	patterns := []string{
		// Website link with text content
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*(?:official\s+)?website[^<]*</a>`,
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*homepage[^<]*</a>`,
		// Links section patterns
		`(?s)<div[^>]*>[^<]*Links?[^<]*</div>.*?<a[^>]*href=["'](https?://(?!chrome)[^"']+)["']`,
		// External link patterns in extension info sections
		`(?s)<section[^>]*>.*?<a[^>]*href=["'](https?://(?!chrome|support\.google)[^"']+)["'][^>]*>[^<]*(?:visit|website|homepage)[^<]*</a>`,
	}
	
	return ss.extractURL(html, patterns)
}

// extractSupportURL extracts the support/help URL
func (ss *StandaloneScraper) extractSupportURL(html string) string {
	patterns := []string{
		// Support link with text content
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*support[^<]*</a>`,
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*help[^<]*</a>`,
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*contact[^<]*</a>`,
		// Support section patterns
		`(?s)<div[^>]*>[^<]*Support[^<]*</div>.*?<a[^>]*href=["'](https?://[^"']+)["']`,
		`(?s)<section[^>]*>.*?support.*?<a[^>]*href=["'](https?://[^"']+)["']`,
	}
	
	return ss.extractURL(html, patterns)
}

// extractPrivacyURL extracts the privacy policy URL
func (ss *StandaloneScraper) extractPrivacyURL(html string) string {
	patterns := []string{
		// Privacy policy link with text content
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*privacy\s+policy[^<]*</a>`,
		`(?i)<a[^>]*href=["'](https?://[^"']+)["'][^>]*>[^<]*privacy[^<]*</a>`,
		// Privacy section patterns  
		`(?s)<div[^>]*>[^<]*Privacy[^<]*</div>.*?<a[^>]*href=["'](https?://[^"']+)["']`,
		`(?s)<section[^>]*>.*?privacy.*?<a[^>]*href=["'](https?://[^"']+)["']`,
	}
	
	return ss.extractURL(html, patterns)
}

// extractURL is a helper function to extract URLs using patterns
func (ss *StandaloneScraper) extractURL(html string, patterns []string) string {
	for _, pattern := range patterns {
		regex := regexp.MustCompile(pattern)
		if match := regex.FindStringSubmatch(html); len(match) > 1 {
			url := strings.TrimSpace(match[1])
			url = strings.ReplaceAll(url, "\\", "")
			if strings.HasPrefix(url, "http") && len(url) > 10 && len(url) < 500 {
				if !strings.Contains(url, "chrome.google.com") && 
				   !strings.Contains(url, "chromewebstore.google.com") {
					return url
				}
			}
		}
	}
	return ""
}

// ExtractVersion extracts the extension version using CSS selectors (public for testing)
func (ss *StandaloneScraper) ExtractVersion(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var version string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Version" {
			secondDiv := firstDiv.Next()
			version = strings.TrimSpace(secondDiv.Text())
		}
	})
	return version
}

// extractVersion is the internal wrapper
func (ss *StandaloneScraper) extractVersion(html string) string {
	return ss.ExtractVersion(html)
}

// ExtractFileSize extracts the extension file size using CSS selectors (public for testing)
func (ss *StandaloneScraper) ExtractFileSize(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var size string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Size" {
			secondDiv := firstDiv.Next()
			size = strings.TrimSpace(secondDiv.Text())
		}
	})
	return size
}

// extractFileSize is the internal wrapper
func (ss *StandaloneScraper) extractFileSize(html string) string {
	return ss.ExtractFileSize(html)
}

// ExtractLastUpdated extracts the last updated date using CSS selectors (public for testing)
func (ss *StandaloneScraper) ExtractLastUpdated(html string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return ""
	}
	
	var updated string
	doc.Find("li").Each(func(i int, s *goquery.Selection) {
		firstDiv := s.Find("div").First()
		if strings.TrimSpace(firstDiv.Text()) == "Updated" {
			secondDiv := firstDiv.Next()
			updated = strings.TrimSpace(secondDiv.Text())
		}
	})
	return updated
}

// extractLastUpdated is the internal wrapper
func (ss *StandaloneScraper) extractLastUpdated(html string) string {
	return ss.ExtractLastUpdated(html)
}

// extractPermissionStrings extracts extension permissions and converts to string slice
func (ss *StandaloneScraper) extractPermissionStrings(html string) []string {
	permissions := ss.extractPermissions(html)
	result := make([]string, len(permissions))
	for i, perm := range permissions {
		result[i] = perm.Permission
	}
	return result
}

// recordProxySuccess records a successful proxy request
func (ss *StandaloneScraper) recordProxySuccess(proxyKey string) {
	if ss.proxyManager == nil {
		return
	}
	ss.proxyManager.mu.Lock()
	defer ss.proxyManager.mu.Unlock()
	ss.proxyManager.successCount[proxyKey]++
}

// recordProxyFailure records a failed proxy request
func (ss *StandaloneScraper) recordProxyFailure(proxyKey string) {
	if ss.proxyManager == nil {
		return
	}
	ss.proxyManager.mu.Lock()
	defer ss.proxyManager.mu.Unlock()
	ss.proxyManager.failureCount[proxyKey]++
}

// GetProxyStats returns statistics about proxy usage
func (ss *StandaloneScraper) GetProxyStats() map[string]interface{} {
	if ss.proxyManager == nil {
		return map[string]interface{}{
			"enabled": false,
			"message": "No proxies configured",
		}
	}

	ss.proxyManager.mu.Lock()
	defer ss.proxyManager.mu.Unlock()

	stats := map[string]interface{}{
		"enabled":       true,
		"total_proxies": len(ss.proxyManager.proxies),
		"current_index": ss.proxyManager.currentIndex,
		"rotate_after":  ss.proxyManager.rotateAfter,
		"request_count": ss.proxyManager.requestCount,
		"proxy_stats":   []map[string]interface{}{},
	}

	// Collect stats for each proxy
	for i, proxy := range ss.proxyManager.proxies {
		proxyKey := fmt.Sprintf("%s:%s", proxy.Host, proxy.Port)
		proxyStats := map[string]interface{}{
			"index":     i,
			"host":      proxy.Host,
			"port":      proxy.Port,
			"successes": ss.proxyManager.successCount[proxyKey],
			"failures":  ss.proxyManager.failureCount[proxyKey],
			"last_used": ss.proxyManager.lastUsed[proxyKey],
			"is_active": i == ss.proxyManager.currentIndex,
		}
		
		// Calculate success rate
		total := ss.proxyManager.successCount[proxyKey] + ss.proxyManager.failureCount[proxyKey]
		if total > 0 {
			proxyStats["success_rate"] = float64(ss.proxyManager.successCount[proxyKey]) / float64(total) * 100
		} else {
			proxyStats["success_rate"] = 0.0
		}
		
		stats["proxy_stats"] = append(stats["proxy_stats"].([]map[string]interface{}), proxyStats)
	}

	return stats
}

// getPermissionDescription returns a human-readable description for a permission
func (ss *StandaloneScraper) getPermissionDescription(permission string) string {
	descriptions := map[string]string{
		"tabs":                    "Access browser tabs",
		"activeTab":               "Access the active tab",
		"storage":                 "Store data locally",
		"webRequest":              "Monitor and modify web requests",
		"webRequestBlocking":      "Block web requests",
		"contextMenus":            "Add context menu items",
		"notifications":           "Show notifications",
		"cookies":                 "Access cookies",
		"history":                 "Access browsing history",
		"bookmarks":               "Access bookmarks",
		"downloads":               "Manage downloads",
		"clipboardWrite":          "Write to clipboard",
		"clipboardRead":           "Read from clipboard",
		"geolocation":             "Access location",
		"background":              "Run in background",
		"alarms":                  "Schedule code to run",
		"identity":                "Access user identity",
		"management":              "Manage extensions",
		"webNavigation":           "Access navigation events",
		"declarativeContent":      "Modify page content",
		"scripting":               "Inject scripts",
		"unlimitedStorage":        "Use unlimited storage",
	}
	
	if desc, exists := descriptions[permission]; exists {
		return desc
	}
	return "Extension permission"
}

// ScrapeExtensionWithRetry scrapes with retry logic
func (ss *StandaloneScraper) ScrapeExtensionWithRetry(extensionID string, maxRetries int) (*models.Extension, error) {
	var lastErr error

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff with jitter
			backoff := time.Duration(1<<(attempt-1)) * time.Second
			time.Sleep(backoff)
		}

		extension, err := ss.ScrapeExtension(extensionID)
		if err == nil {
			return extension, nil
		}

		lastErr = err

		// Don't retry certain types of errors
		if isNonRetryableError(err) {
			break
		}
	}

	return nil, fmt.Errorf("failed after %d attempts: %w", maxRetries+1, lastErr)
}

// recordError records an error in metrics
func (ss *StandaloneScraper) recordError(context string, err error) {
	ss.metrics.LastError = fmt.Sprintf("%s: %v", context, err)
	ss.metrics.LastErrorTime = time.Now()
}

// GetMetrics returns current scraper metrics
func (ss *StandaloneScraper) GetMetrics() *ScraperMetrics {
	avgDuration := time.Duration(0)
	if ss.metrics.TotalRequests > 0 {
		avgDuration = ss.metrics.TotalDuration / time.Duration(ss.metrics.TotalRequests)
	}

	// Create a copy to avoid race conditions
	return &ScraperMetrics{
		TotalRequests:     ss.metrics.TotalRequests,
		SuccessfulScrapes: ss.metrics.SuccessfulScrapes,
		FailedScrapes:     ss.metrics.FailedScrapes,
		TimeoutErrors:     ss.metrics.TimeoutErrors,
		ConnectionErrors:  ss.metrics.ConnectionErrors,
		ParseErrors:       ss.metrics.ParseErrors,
		TotalDuration:     avgDuration, // Return average duration
		LastError:         ss.metrics.LastError,
		LastErrorTime:     ss.metrics.LastErrorTime,
	}
}

// HealthCheck verifies the scraper can reach Chrome Web Store
func (ss *StandaloneScraper) HealthCheck() error {
	// Try to fetch the Chrome Web Store main page
	resp, err := ss.client.Get("https://chromewebstore.google.com/")
	if err != nil {
		return fmt.Errorf("failed to reach Chrome Web Store: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("Chrome Web Store returned status %d", resp.StatusCode)
	}

	return nil
}