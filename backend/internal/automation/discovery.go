package automation

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"chrome-analytics-backend/internal/services"

	"github.com/PuerkitoBio/goquery"
	"go.mongodb.org/mongo-driver/mongo"
)

// DiscoveryHandler handles extension discovery jobs
type DiscoveryHandler struct {
	db           *mongo.Database
	client       *http.Client
	proxyManager *services.ProxyManager
}

// DiscoveryJob types
const (
	DiscoveryTypeCategory = "category"
	DiscoveryTypeSearch   = "search"
	DiscoveryTypeRelated  = "related"
	DiscoveryTypePopular  = "popular"
)

// Chrome Web Store categories
var ChromeStoreCategories = []string{
	"productivity",
	"social-communication",
	"developer-tools",
	"photo",
	"shopping",
	"accessibility",
	"news-weather",
	"fun",
	"sports",
	"education",
	"lifestyle",
	"entertainment",
	"business",
	"tools",
	"games",
}

// Popular search keywords for extension discovery
var PopularSearchKeywords = []string{
	"adblocker", "password manager", "vpn", "screenshot", "youtube",
	"gmail", "translator", "calendar", "notes", "bookmark",
	"developer", "seo", "social media", "cryptocurrency", "proxy",
	"weather", "news", "shopping", "productivity", "video downloader",
}

// NewDiscoveryHandler creates a new discovery handler
func NewDiscoveryHandler(db *mongo.Database) *DiscoveryHandler {
	client := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:       10,
			IdleConnTimeout:    30 * time.Second,
			DisableCompression: true,
		},
	}

	// Initialize proxy manager
	proxyManager, err := services.NewProxyManager("proxies.txt")
	if err != nil {
		log.Printf("Failed to initialize proxy manager for discovery: %v, using direct connection", err)
		proxyManager = nil
	}

	return &DiscoveryHandler{
		db:           db,
		client:       client,
		proxyManager: proxyManager,
	}
}

// HandleJob processes a discovery job
func (dh *DiscoveryHandler) HandleJob(job *Job, queue *JobQueue, proxyIndex int) error {
	discoveryType, ok := job.Payload["type"].(string)
	if !ok {
		return fmt.Errorf("invalid discovery type in job payload")
	}

	switch discoveryType {
	case DiscoveryTypeCategory:
		return dh.handleCategoryDiscovery(job, queue, proxyIndex)
	case DiscoveryTypeSearch:
		return dh.handleSearchDiscovery(job, queue, proxyIndex)
	case DiscoveryTypeRelated:
		return dh.handleRelatedDiscovery(job, queue, proxyIndex)
	case DiscoveryTypePopular:
		return dh.handlePopularDiscovery(job, queue, proxyIndex)
	default:
		return fmt.Errorf("unknown discovery type: %s", discoveryType)
	}
}

// GetJobType returns the job type this handler processes
func (dh *DiscoveryHandler) GetJobType() JobType {
	return JobTypeDiscovery
}

// handleCategoryDiscovery crawls a specific Chrome Web Store category
func (dh *DiscoveryHandler) handleCategoryDiscovery(job *Job, queue *JobQueue, proxyIndex int) error {
	category, ok := job.Payload["category"].(string)
	if !ok {
		return fmt.Errorf("category not specified in job payload")
	}

	page := 1
	if p, exists := job.Payload["page"]; exists {
		if pageFloat, ok := p.(float64); ok {
			page = int(pageFloat)
		}
	}

	log.Printf("Discovering extensions in category: %s (page %d)", category, page)

	// Use search instead of category due to 404 issues with category URLs
	categoryURL := fmt.Sprintf("https://chromewebstore.google.com/search/%s", url.QueryEscape(category))
	if page > 1 {
		categoryURL += fmt.Sprintf("?page=%d", page)
	}

	// Scrape the category page
	extensionURLs, hasMore, err := dh.scrapeCategoryPage(categoryURL, proxyIndex)
	if err != nil {
		return fmt.Errorf("failed to scrape category page: %w", err)
	}

	log.Printf("Found %d extensions in category %s (page %d)", len(extensionURLs), category, page)

	// Create update jobs for discovered extensions
	for _, extURL := range extensionURLs {
		extensionID := dh.extractExtensionID(extURL)
		if extensionID == "" {
			continue
		}

		// Check if extension already exists in database
		exists, err := dh.extensionExists(extensionID)
		if err != nil {
			log.Printf("Error checking if extension exists: %v", err)
			continue
		}

		if !exists {
			// Create an update job for this new extension
			updateJob := &Job{
				Type:     JobTypeUpdate,
				Priority: PriorityMedium,
				Payload: map[string]interface{}{
					"extension_id": extensionID,
					"source":       "category_discovery",
					"category":     category,
				},
			}

			err = queue.EnqueueJob(updateJob)
			if err != nil {
				log.Printf("Failed to enqueue update job for %s: %v", extensionID, err)
			}
		}
	}

	// If there are more pages, create a job for the next page
	if hasMore && page < 10 { // Limit to first 10 pages
		nextPageJob := &Job{
			Type:     JobTypeDiscovery,
			Priority: PriorityLow,
			Payload: map[string]interface{}{
				"type":     DiscoveryTypeCategory,
				"category": category,
				"page":     page + 1,
			},
		}

		err = queue.EnqueueJob(nextPageJob)
		if err != nil {
			log.Printf("Failed to enqueue next page job: %v", err)
		}
	}

	return nil
}

// handleSearchDiscovery searches for extensions using keywords
func (dh *DiscoveryHandler) handleSearchDiscovery(job *Job, queue *JobQueue, proxyIndex int) error {
	keyword, ok := job.Payload["keyword"].(string)
	if !ok {
		return fmt.Errorf("keyword not specified in job payload")
	}

	log.Printf("Searching for extensions with keyword: %s", keyword)

	// Construct search URL
	searchURL := fmt.Sprintf("https://chromewebstore.google.com/search/%s", url.QueryEscape(keyword))

	// Scrape search results
	extensionURLs, err := dh.scrapeSearchResults(searchURL, proxyIndex)
	if err != nil {
		return fmt.Errorf("failed to scrape search results: %w", err)
	}

	log.Printf("Found %d extensions for keyword %s", len(extensionURLs), keyword)

	// Create update jobs for discovered extensions
	for _, extURL := range extensionURLs {
		extensionID := dh.extractExtensionID(extURL)
		if extensionID == "" {
			continue
		}

		exists, err := dh.extensionExists(extensionID)
		if err != nil {
			log.Printf("Error checking if extension exists: %v", err)
			continue
		}

		if !exists {
			updateJob := &Job{
				Type:     JobTypeUpdate,
				Priority: PriorityMedium,
				Payload: map[string]interface{}{
					"extension_id": extensionID,
					"source":       "search_discovery",
					"keyword":      keyword,
				},
			}

			err = queue.EnqueueJob(updateJob)
			if err != nil {
				log.Printf("Failed to enqueue update job for %s: %v", extensionID, err)
			}
		}
	}

	return nil
}

// handleRelatedDiscovery finds related extensions from an existing extension page
func (dh *DiscoveryHandler) handleRelatedDiscovery(job *Job, queue *JobQueue, proxyIndex int) error {
	extensionID, ok := job.Payload["extension_id"].(string)
	if !ok {
		return fmt.Errorf("extension_id not specified in job payload")
	}

	log.Printf("Finding related extensions for: %s", extensionID)

	// Construct extension page URL
	extensionURL := fmt.Sprintf("https://chromewebstore.google.com/detail/%s", extensionID)

	// Scrape related extensions
	relatedURLs, err := dh.scrapeRelatedExtensions(extensionURL, proxyIndex)
	if err != nil {
		return fmt.Errorf("failed to scrape related extensions: %w", err)
	}

	log.Printf("Found %d related extensions for %s", len(relatedURLs), extensionID)

	// Create update jobs for discovered extensions
	for _, extURL := range relatedURLs {
		relatedID := dh.extractExtensionID(extURL)
		if relatedID == "" || relatedID == extensionID {
			continue
		}

		exists, err := dh.extensionExists(relatedID)
		if err != nil {
			log.Printf("Error checking if extension exists: %v", err)
			continue
		}

		if !exists {
			updateJob := &Job{
				Type:     JobTypeUpdate,
				Priority: PriorityLow,
				Payload: map[string]interface{}{
					"extension_id": relatedID,
					"source":       "related_discovery",
					"parent_id":    extensionID,
				},
			}

			err = queue.EnqueueJob(updateJob)
			if err != nil {
				log.Printf("Failed to enqueue update job for %s: %v", relatedID, err)
			}
		}
	}

	return nil
}

// handlePopularDiscovery crawls popular/trending extension lists
func (dh *DiscoveryHandler) handlePopularDiscovery(job *Job, queue *JobQueue, proxyIndex int) error {
	log.Println("Discovering popular extensions")

	// Popular extensions URLs to check - using main categories page
	popularURLs := []string{
		"https://chromewebstore.google.com/category/extensions",
	}

	totalFound := 0

	for _, popURL := range popularURLs {
		extensionURLs, _, err := dh.scrapeCategoryPage(popURL, proxyIndex)
		if err != nil {
			log.Printf("Failed to scrape popular page %s: %v", popURL, err)
			continue
		}

		for _, extURL := range extensionURLs {
			extensionID := dh.extractExtensionID(extURL)
			if extensionID == "" {
				continue
			}

			exists, err := dh.extensionExists(extensionID)
			if err != nil {
				log.Printf("Error checking if extension exists: %v", err)
				continue
			}

			if !exists {
				updateJob := &Job{
					Type:     JobTypeUpdate,
					Priority: PriorityHigh, // Popular extensions get high priority
					Payload: map[string]interface{}{
						"extension_id": extensionID,
						"source":       "popular_discovery",
					},
				}

				err = queue.EnqueueJob(updateJob)
				if err != nil {
					log.Printf("Failed to enqueue update job for %s: %v", extensionID, err)
				} else {
					totalFound++
				}
			}
		}

		// Be polite
		time.Sleep(2 * time.Second)
	}

	log.Printf("Discovered %d popular extensions", totalFound)
	return nil
}

// scrapeCategoryPage scrapes extensions from a category page
func (dh *DiscoveryHandler) scrapeCategoryPage(pageURL string, proxyIndex int) ([]string, bool, error) {
	req, err := http.NewRequest("GET", pageURL, nil)
	if err != nil {
		return nil, false, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	
	// Use proxy if available
	client := dh.client
	var proxyURL string
	if dh.proxyManager != nil {
		if proxyIndex >= 0 {
			// Use dedicated proxy
			proxyClient, err := dh.proxyManager.CreateHTTPClientWithProxyIndex(proxyIndex)
			if err != nil {
				log.Printf("Failed to create dedicated proxy client %d for discovery, using direct connection: %v", proxyIndex, err)
			} else {
				client = proxyClient
				proxy, _ := dh.proxyManager.GetProxyByIndex(proxyIndex)
				if proxy != nil {
					proxyURL = proxy.URL
				}
				log.Printf("Using dedicated proxy %d for discovery URL %s", proxyIndex, pageURL)
			}
		} else {
			// Use random proxy (fallback)
			proxyClient, err := dh.proxyManager.CreateHTTPClientWithRandomProxy()
			if err != nil {
				log.Printf("Failed to create random proxy client for discovery, using direct connection: %v", err)
			} else {
				client = proxyClient
				proxy, _ := dh.proxyManager.GetRandomProxy()
				if proxy != nil {
					proxyURL = proxy.URL
				}
			}
		}
	}
	
	resp, err := client.Do(req)
	if err != nil {
		// Mark proxy as unhealthy if it failed
		if dh.proxyManager != nil && proxyURL != "" {
			dh.proxyManager.MarkProxyUnhealthy(proxyURL)
		}
		return nil, false, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, false, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, false, err
	}

	var extensionURLs []string
	
	// Find extension links (this selector may need adjustment based on Chrome Web Store structure)
	doc.Find("a[href*='/detail/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists && strings.Contains(href, "/detail/") {
			if !strings.HasPrefix(href, "http") {
				href = "https://chromewebstore.google.com" + href
			}
			extensionURLs = append(extensionURLs, href)
		}
	})

	// Check if there's a "Next" or "More" button indicating more pages
	hasMore := doc.Find("a[aria-label*='next'], a[aria-label*='Next'], .next").Length() > 0

	return extensionURLs, hasMore, nil
}

// scrapeSearchResults scrapes extension URLs from search results
func (dh *DiscoveryHandler) scrapeSearchResults(searchURL string, proxyIndex int) ([]string, error) {
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	
	// Use proxy if available
	client := dh.client
	var proxyURL string
	if dh.proxyManager != nil {
		if proxyIndex >= 0 {
			// Use dedicated proxy
			proxyClient, err := dh.proxyManager.CreateHTTPClientWithProxyIndex(proxyIndex)
			if err != nil {
				log.Printf("Failed to create dedicated proxy client %d for search, using direct connection: %v", proxyIndex, err)
			} else {
				client = proxyClient
				proxy, _ := dh.proxyManager.GetProxyByIndex(proxyIndex)
				if proxy != nil {
					proxyURL = proxy.URL
				}
				log.Printf("Using dedicated proxy %d for search URL %s", proxyIndex, searchURL)
			}
		} else {
			// Use random proxy (fallback)
			proxyClient, err := dh.proxyManager.CreateHTTPClientWithRandomProxy()
			if err != nil {
				log.Printf("Failed to create random proxy client for search, using direct connection: %v", err)
			} else {
				client = proxyClient
				proxy, _ := dh.proxyManager.GetRandomProxy()
				if proxy != nil {
					proxyURL = proxy.URL
				}
			}
		}
	}
	
	resp, err := client.Do(req)
	if err != nil {
		// Mark proxy as unhealthy if it failed
		if dh.proxyManager != nil && proxyURL != "" {
			dh.proxyManager.MarkProxyUnhealthy(proxyURL)
		}
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var extensionURLs []string
	
	doc.Find("a[href*='/detail/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists {
			if !strings.HasPrefix(href, "http") {
				href = "https://chromewebstore.google.com" + href
			}
			extensionURLs = append(extensionURLs, href)
		}
	})

	return extensionURLs, nil
}

// scrapeRelatedExtensions finds related extensions from an extension page
func (dh *DiscoveryHandler) scrapeRelatedExtensions(extensionURL string, proxyIndex int) ([]string, error) {
	req, err := http.NewRequest("GET", extensionURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	
	// Use proxy if available
	client := dh.client
	var proxyURL string
	if dh.proxyManager != nil {
		if proxyIndex >= 0 {
			// Use dedicated proxy
			proxyClient, err := dh.proxyManager.CreateHTTPClientWithProxyIndex(proxyIndex)
			if err != nil {
				log.Printf("Failed to create dedicated proxy client %d for related discovery, using direct connection: %v", proxyIndex, err)
			} else {
				client = proxyClient
				proxy, _ := dh.proxyManager.GetProxyByIndex(proxyIndex)
				if proxy != nil {
					proxyURL = proxy.URL
				}
				log.Printf("Using dedicated proxy %d for related discovery URL %s", proxyIndex, extensionURL)
			}
		} else {
			// Use random proxy (fallback)
			proxyClient, err := dh.proxyManager.CreateHTTPClientWithRandomProxy()
			if err != nil {
				log.Printf("Failed to create random proxy client for related discovery, using direct connection: %v", err)
			} else {
				client = proxyClient
				proxy, _ := dh.proxyManager.GetRandomProxy()
				if proxy != nil {
					proxyURL = proxy.URL
				}
			}
		}
	}
	
	resp, err := client.Do(req)
	if err != nil {
		// Mark proxy as unhealthy if it failed
		if dh.proxyManager != nil && proxyURL != "" {
			dh.proxyManager.MarkProxyUnhealthy(proxyURL)
		}
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	var relatedURLs []string
	
	// Look for related extensions sections
	doc.Find("a[href*='/detail/']").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if exists {
			if !strings.HasPrefix(href, "http") {
				href = "https://chromewebstore.google.com" + href
			}
			relatedURLs = append(relatedURLs, href)
		}
	})

	return relatedURLs, nil
}

// extractExtensionID extracts the extension ID from a Chrome Web Store URL
func (dh *DiscoveryHandler) extractExtensionID(extensionURL string) string {
	// URL pattern: https://chromewebstore.google.com/detail/extension-name/EXTENSION_ID
	re := regexp.MustCompile(`/detail/[^/]+/([a-z]{32})`)
	matches := re.FindStringSubmatch(extensionURL)
	if len(matches) >= 2 {
		return matches[1]
	}
	
	// Alternative pattern: https://chromewebstore.google.com/detail/EXTENSION_ID
	re2 := regexp.MustCompile(`/detail/([a-z]{32})`)
	matches2 := re2.FindStringSubmatch(extensionURL)
	if len(matches2) >= 2 {
		return matches2[1]
	}
	
	return ""
}

// extensionExists checks if an extension already exists in the database
func (dh *DiscoveryHandler) extensionExists(extensionID string) (bool, error) {
	collection := dh.db.Collection("extensions")
	
	count, err := collection.CountDocuments(context.TODO(), map[string]interface{}{
		"extensionId": extensionID,
	})
	if err != nil {
		return false, err
	}
	
	return count > 0, nil
}