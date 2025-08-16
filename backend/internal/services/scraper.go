package services

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"chrome-analytics-backend/internal/models"

	"github.com/PuerkitoBio/goquery"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type Scraper struct {
	db            *mongo.Database
	client        *http.Client
	proxyManager  *ProxyManager
	browserClient *BrowserClient
	baseURL       string // For testing, defaults to Chrome Web Store
}

func NewScraper(db *mongo.Database) *Scraper {
	// Initialize proxy manager
	proxyManager, err := NewProxyManager("proxies.txt")
	if err != nil {
		log.Printf("Failed to initialize proxy manager: %v, using direct connection", err)
		proxyManager = nil
	}

	// Initialize browser client
	browserClient := NewBrowserClient("")

	return &Scraper{
		db:            db,
		client: &http.Client{
			Timeout: 10 * time.Second, // Faster timeout for quicker failure detection
		},
		proxyManager:  proxyManager,
		browserClient: browserClient,
		baseURL:       "https://chromewebstore.google.com/detail/",
	}
}

// SetBrowserClient allows overriding the browser client (useful for testing)
func (s *Scraper) SetBrowserClient(client *BrowserClient) {
	s.browserClient = client
}

// ScrapeExtension scrapes a single extension from Chrome Web Store
func (s *Scraper) ScrapeExtension(extensionID string) (*models.Extension, error) {
	// First try the traditional HTTP scraping method
	extension, err := s.ScrapeExtensionWithProxy(extensionID, -1)
	
	// Check if we got meaningful data
	if err == nil && s.hasValidData(extension) {
		log.Printf("Successfully scraped %s using HTTP method", extensionID)
		return extension, nil
	}

	// If HTTP scraping failed or returned empty data, try browser scraping with proxy
	log.Printf("HTTP scraping for %s returned insufficient data, trying browser scraping with proxy", extensionID)
	
	var browserExtension *models.Extension
	var browserErr error
	
	if s.proxyManager != nil {
		// Get a random proxy for browser scraping
		proxy, err := s.proxyManager.GetRandomProxy()
		if err != nil {
			log.Printf("Failed to get proxy for browser scraping: %v", err)
			browserExtension, browserErr = s.browserClient.ScrapeExtension(extensionID)
		} else {
			log.Printf("Using proxy %s for browser scraping", proxy.URL)
			proxyInfo := &ProxyInfo{
				Host:     proxy.Host,
				Port:     proxy.Port,
				Username: proxy.Username,
				Password: proxy.Password,
			}
			browserExtension, browserErr = s.browserClient.ScrapeExtensionWithProxy(extensionID, proxyInfo)
		}
	} else {
		browserExtension, browserErr = s.browserClient.ScrapeExtension(extensionID)
	}
	
	if browserErr == nil && s.hasValidData(browserExtension) {
		log.Printf("Successfully scraped %s using browser method", extensionID)
		return browserExtension, nil
	}

	// If both methods failed, return the original error
	if err != nil {
		return nil, fmt.Errorf("both HTTP and browser scraping failed. HTTP error: %w, Browser error: %v", err, browserErr)
	}

	// Return the HTTP result even if data is incomplete
	log.Printf("Returning incomplete data for %s from HTTP scraping", extensionID)
	return extension, nil
}

// hasValidData checks if the extension has meaningful data
func (s *Scraper) hasValidData(ext *models.Extension) bool {
	if ext == nil {
		return false
	}
	
	// Consider it valid if we have at least name OR users OR rating
	return ext.Name != "" || ext.Users > 0 || ext.Rating > 0
}

// ScrapeExtensionWithProxy scrapes a single extension using a specific proxy
func (s *Scraper) ScrapeExtensionWithProxy(extensionID string, proxyIndex int) (*models.Extension, error) {
	url := fmt.Sprintf("%s%s", s.baseURL, extensionID)
	
	// Use proxy if available
	client := s.client
	var proxyURL string
	if s.proxyManager != nil {
		if proxyIndex >= 0 {
			// Use dedicated proxy
			proxyClient, err := s.proxyManager.CreateHTTPClientWithProxyIndex(proxyIndex)
			if err != nil {
				log.Printf("Failed to create dedicated proxy client %d, using direct connection: %v", proxyIndex, err)
			} else {
				client = proxyClient
				proxy, _ := s.proxyManager.GetProxyByIndex(proxyIndex)
				if proxy != nil {
					proxyURL = proxy.URL
				}
				log.Printf("Using dedicated proxy %d for extension %s", proxyIndex, extensionID)
			}
		} else {
			// Use random proxy (fallback)
			proxyClient, err := s.proxyManager.CreateHTTPClientWithRandomProxy()
			if err != nil {
				log.Printf("Failed to create random proxy client, using direct connection: %v", err)
			} else {
				client = proxyClient
				proxy, _ := s.proxyManager.GetRandomProxy()
				if proxy != nil {
					proxyURL = proxy.URL
				}
			}
		}
	}
	
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	// Set user agent to avoid blocking
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := client.Do(req)
	if err != nil {
		// Mark proxy as unhealthy if it failed
		if s.proxyManager != nil && proxyURL != "" {
			s.proxyManager.MarkProxyUnhealthy(proxyURL)
		}
		return nil, fmt.Errorf("making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP error: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("parsing HTML: %w", err)
	}

	extension := &models.Extension{
		ExtensionID: extensionID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Extract extension name - try multiple selectors
	extension.Name = s.extractName(doc)

	// Extract description - try multiple selectors
	extension.Description = s.extractDescription(doc)

	// Extract developer
	extension.Developer = s.extractDeveloper(doc)

	// Extract users count
	extension.Users = s.extractUserCount(doc)

	// Extract rating
	extension.Rating = s.extractRating(doc)

	// Extract review count
	extension.ReviewCount = s.extractReviewCount(doc)

	// Extract category (simplified)
	extension.Category = "Productivity" // Default category for now

	// Generate keywords from name and description
	extension.Keywords = s.generateKeywords(extension.Name, extension.Description)

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

// extractName tries multiple selectors to find the extension name
func (s *Scraper) extractName(doc *goquery.Document) string {
	selectors := []string{
		"h1",
		"[data-g-id='name']",
		".e-f-w",
		".a-na-d-w",
		"title", // fallback to page title
	}

	for _, selector := range selectors {
		if text := strings.TrimSpace(doc.Find(selector).First().Text()); text != "" {
			// Clean up title if it contains " - Chrome Web Store"
			if strings.Contains(text, " - Chrome Web Store") {
				text = strings.Split(text, " - Chrome Web Store")[0]
			}
			return text
		}
	}
	return ""
}

// extractDescription tries multiple selectors to find the description
func (s *Scraper) extractDescription(doc *goquery.Document) string {
	// Try meta description first
	if desc := strings.TrimSpace(doc.Find("meta[name='description']").AttrOr("content", "")); desc != "" {
		return desc
	}

	// Try various content selectors
	selectors := []string{
		".a-na-d-w .C-b-p-j-Pb",
		".e-f-y",
		".a-d .C-b-p-j-Pb",
		"div[role='main'] p",
		".webstore-test-wall-tile-description",
	}

	for _, selector := range selectors {
		if text := strings.TrimSpace(doc.Find(selector).First().Text()); text != "" {
			return text
		}
	}
	return ""
}

// extractDeveloper tries multiple selectors to find the developer name
func (s *Scraper) extractDeveloper(doc *goquery.Document) string {
	selectors := []string{
		"a[href*='/publisher/']",
		".e-f-Me .a-u-O-d",
		".a-na-d-w .a-u-O-d",
		"span[title*='developer']",
		".webstore-test-wall-tile-developer",
	}

	for _, selector := range selectors {
		if text := strings.TrimSpace(doc.Find(selector).Text()); text != "" {
			return text
		}
	}
	return ""
}

// extractUserCount tries multiple selectors and patterns to find user count
func (s *Scraper) extractUserCount(doc *goquery.Document) int64 {
	// Look for text containing "users" in various places
	patterns := []string{
		"span:contains('users')",
		"div:contains('users')", 
		".e-f-ih",
		".a-ge-H",
		".webstore-test-wall-tile-user-count",
	}

	for _, pattern := range patterns {
		doc.Find(pattern).Each(func(i int, sel *goquery.Selection) {
			text := sel.Text()
			if count := s.parseUserCount(text); count > 0 {
				return
			}
		})
	}

	// Also check all text for user count patterns
	var userCount int64
	doc.Find("*").Each(func(i int, sel *goquery.Selection) {
		text := sel.Text()
		if strings.Contains(strings.ToLower(text), "user") && (strings.Contains(text, ",") || regexp.MustCompile(`\d+`).MatchString(text)) {
			if count := s.parseUserCount(text); count > 0 && userCount == 0 {
				userCount = count
			}
		}
	})

	return userCount
}

// extractRating tries multiple selectors to find the rating
func (s *Scraper) extractRating(doc *goquery.Document) float64 {
	// Try aria-label with star rating
	if rating := s.parseRating(doc.Find("div[role='img'][aria-label*='stars']").AttrOr("aria-label", "")); rating > 0 {
		return rating
	}

	// Try other selectors
	selectors := []string{
		".rsw-stars",
		".a-ge-G",
		".webstore-test-wall-tile-rating",
	}

	for _, selector := range selectors {
		if rating := s.parseRating(doc.Find(selector).Text()); rating > 0 {
			return rating
		}
	}

	// Look for rating patterns in all text
	var rating float64
	doc.Find("*").Each(func(i int, sel *goquery.Selection) {
		text := sel.Text()
		if r := s.parseRating(text); r > 0 && rating == 0 {
			rating = r
		}
	})

	return rating
}

// extractReviewCount tries multiple selectors to find review count
func (s *Scraper) extractReviewCount(doc *goquery.Document) int64 {
	patterns := []string{
		"button:contains('reviews')",
		"a:contains('reviews')",
		"span:contains('ratings')",
		".a-ge-G-N",
		".webstore-test-wall-tile-review-count",
	}

	for _, pattern := range patterns {
		if count := s.parseReviewCount(doc.Find(pattern).Text()); count > 0 {
			return count
		}
	}

	// Look for review/rating count patterns in all text
	var reviewCount int64
	doc.Find("*").Each(func(i int, sel *goquery.Selection) {
		text := sel.Text()
		if (strings.Contains(strings.ToLower(text), "review") || strings.Contains(strings.ToLower(text), "rating")) && 
		   (strings.Contains(text, ",") || regexp.MustCompile(`\d+`).MatchString(text)) {
			if count := s.parseReviewCount(text); count > 0 && reviewCount == 0 {
				reviewCount = count
			}
		}
	})

	return reviewCount
}

// parseUserCount extracts user count from text like "1,234,567 users" or "1,000,000 users"
func (s *Scraper) parseUserCount(text string) int64 {
	// Look for patterns like "1,000,000 users" or "1,234 users"
	re := regexp.MustCompile(`([\d,]+)\s*users?`)
	matches := re.FindStringSubmatch(strings.ToLower(text))
	if len(matches) >= 2 {
		// Remove commas and convert to int
		cleanText := strings.ReplaceAll(matches[1], ",", "")
		if users, err := strconv.ParseInt(cleanText, 10, 64); err == nil {
			return users
		}
	}

	// Fallback: look for any number followed by users
	re2 := regexp.MustCompile(`(\d+)\s*users?`)
	matches2 := re2.FindStringSubmatch(strings.ToLower(text))
	if len(matches2) >= 2 {
		if users, err := strconv.ParseInt(matches2[1], 10, 64); err == nil {
			return users
		}
	}

	return 0
}

// parseRating extracts rating from various formats like "3.5", "Rated 4.5 out of 5 stars"
func (s *Scraper) parseRating(text string) float64 {
	// Try "X.X out of 5" format first
	re := regexp.MustCompile(`(\d+(?:\.\d+)?)\s*out\s*of\s*5`)
	matches := re.FindStringSubmatch(text)
	if len(matches) >= 2 {
		if rating, err := strconv.ParseFloat(matches[1], 64); err == nil {
			return rating
		}
	}

	// Try direct rating format like "3.5" or "4.7"
	re2 := regexp.MustCompile(`^\s*(\d+\.\d+)\s*$`)
	matches2 := re2.FindStringSubmatch(text)
	if len(matches2) >= 2 {
		if rating, err := strconv.ParseFloat(matches2[1], 64); err == nil && rating <= 5.0 {
			return rating
		}
	}

	// Try finding any decimal number that looks like a rating
	re3 := regexp.MustCompile(`(\d+\.\d+)`)
	matches3 := re3.FindStringSubmatch(text)
	if len(matches3) >= 2 {
		if rating, err := strconv.ParseFloat(matches3[1], 64); err == nil && rating > 0 && rating <= 5.0 {
			return rating
		}
	}

	return 0.0
}

// parseReviewCount extracts review count from text like "1,234 reviews", "2.1K ratings"
func (s *Scraper) parseReviewCount(text string) int64 {
	// Try formats like "2.1K ratings" or "1.5K reviews"
	re := regexp.MustCompile(`(\d+(?:\.\d+)?)\s*K\s*(?:ratings?|reviews?)`)
	matches := re.FindStringSubmatch(strings.ToLower(text))
	if len(matches) >= 2 {
		if num, err := strconv.ParseFloat(matches[1], 64); err == nil {
			return int64(num * 1000)
		}
	}

	// Try "1,234 reviews" format
	re2 := regexp.MustCompile(`([\d,]+)\s*(?:reviews?|ratings?)`)
	matches2 := re2.FindStringSubmatch(strings.ToLower(text))
	if len(matches2) >= 2 {
		cleanText := strings.ReplaceAll(matches2[1], ",", "")
		if reviews, err := strconv.ParseInt(cleanText, 10, 64); err == nil {
			return reviews
		}
	}

	// Try just numbers near "rating" or "review"
	re3 := regexp.MustCompile(`(\d+)\s*(?:ratings?|reviews?)`)
	matches3 := re3.FindStringSubmatch(strings.ToLower(text))
	if len(matches3) >= 2 {
		if reviews, err := strconv.ParseInt(matches3[1], 10, 64); err == nil {
			return reviews
		}
	}

	return 0
}

// generateKeywords creates keywords from name and description
func (s *Scraper) generateKeywords(name, description string) []string {
	keywords := make(map[string]bool)
	
	// Add words from name
	nameWords := strings.Fields(strings.ToLower(name))
	for _, word := range nameWords {
		word = strings.Trim(word, ".,!?-()[]{}\"'")
		if len(word) > 2 && !s.isStopWord(word) {
			keywords[word] = true
		}
	}

	// Add words from description (first 100 chars)
	shortDesc := description
	if len(shortDesc) > 100 {
		shortDesc = shortDesc[:100]
	}
	descWords := strings.Fields(strings.ToLower(shortDesc))
	for _, word := range descWords {
		word = strings.Trim(word, ".,!?-()[]{}\"'")
		if len(word) > 3 && !s.isStopWord(word) {
			keywords[word] = true
		}
	}

	// Convert to slice
	result := make([]string, 0, len(keywords))
	for keyword := range keywords {
		result = append(result, keyword)
	}

	// Limit to 10 keywords
	if len(result) > 10 {
		result = result[:10]
	}

	return result
}

// isStopWord checks if a word is a common stop word
func (s *Scraper) isStopWord(word string) bool {
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "and": true, "or": true, "but": true,
		"in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
		"with": true, "by": true, "from": true, "up": true, "about": true, "into": true,
		"through": true, "during": true, "before": true, "after": true, "above": true,
		"below": true, "between": true, "among": true, "is": true, "are": true,
		"was": true, "were": true, "be": true, "been": true, "being": true,
		"have": true, "has": true, "had": true, "do": true, "does": true, "did": true,
		"will": true, "would": true, "could": true, "should": true, "may": true,
		"might": true, "must": true, "can": true, "this": true, "that": true,
		"these": true, "those": true, "you": true, "your": true, "yours": true,
	}
	return stopWords[word]
}

// SaveExtension saves or updates an extension in the database
func (s *Scraper) SaveExtension(extension *models.Extension) error {
	collection := s.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"extensionId": extension.ExtensionID}
	
	// Check if extension already exists
	var existing models.Extension
	err := collection.FindOne(ctx, filter).Decode(&existing)
	
	if err == mongo.ErrNoDocuments {
		// Insert new extension
		_, err = collection.InsertOne(ctx, extension)
		if err != nil {
			return fmt.Errorf("inserting extension: %w", err)
		}
		log.Printf("Inserted new extension: %s", extension.Name)
	} else if err != nil {
		return fmt.Errorf("checking existing extension: %w", err)
	} else {
		// Update existing extension with new snapshot
		existing.UpdatedAt = time.Now()
		existing.Users = extension.Users
		existing.Rating = extension.Rating
		existing.ReviewCount = extension.ReviewCount
		
		// Add new snapshot
		newSnapshot := models.Snapshot{
			Date:        time.Now(),
			Users:       extension.Users,
			Rating:      extension.Rating,
			ReviewCount: extension.ReviewCount,
		}
		existing.Snapshots = append(existing.Snapshots, newSnapshot)

		// Update in database
		update := bson.M{
			"$set": bson.M{
				"updatedAt":   existing.UpdatedAt,
				"users":       existing.Users,
				"rating":      existing.Rating,
				"reviewCount": existing.ReviewCount,
				"snapshots":   existing.Snapshots,
			},
		}

		_, err = collection.UpdateOne(ctx, filter, update)
		if err != nil {
			return fmt.Errorf("updating extension: %w", err)
		}
		log.Printf("Updated existing extension: %s", existing.Name)
	}

	return nil
}

// ScrapeMultiple scrapes multiple extensions
func (s *Scraper) ScrapeMultiple(extensionIDs []string) error {
	for i, id := range extensionIDs {
		log.Printf("Scraping extension %d/%d: %s", i+1, len(extensionIDs), id)
		
		extension, err := s.ScrapeExtension(id)
		if err != nil {
			log.Printf("Error scraping %s: %v", id, err)
			continue
		}

		err = s.SaveExtension(extension)
		if err != nil {
			log.Printf("Error saving %s: %v", id, err)
			continue
		}

		// Add delay to avoid being blocked
		if i < len(extensionIDs)-1 {
			time.Sleep(2 * time.Second)
		}
	}

	return nil
}

// GetProxyStats returns proxy manager statistics
func (s *Scraper) GetProxyStats() map[string]interface{} {
	if s.proxyManager == nil {
		return map[string]interface{}{
			"proxy_enabled": false,
			"message":       "Proxy manager not initialized",
		}
	}

	stats := s.proxyManager.GetProxyStats()
	stats["proxy_enabled"] = true
	return stats
}