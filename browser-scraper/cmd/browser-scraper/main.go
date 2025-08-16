package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/chromedp/chromedp"
	"github.com/gin-gonic/gin"
)

type ScrapeRequest struct {
	ExtensionID string `json:"extension_id" binding:"required"`
	Timeout     int    `json:"timeout,omitempty"` // Optional timeout in seconds
}

type ScrapeResponse struct {
	Success     bool   `json:"success"`
	Error       string `json:"error,omitempty"`
	ExtensionID string `json:"extension_id"`
	Name        string `json:"name"`
	Developer   string `json:"developer"`
	Description string `json:"description"`
	Users       int64  `json:"users"`
	Rating      float64 `json:"rating"`
	ReviewCount int64  `json:"review_count"`
	Keywords    []string `json:"keywords"`
	ScrapedAt   string `json:"scraped_at"`
}

type BrowserScraper struct {
	defaultTimeout time.Duration
}

func main() {
	log.Println("Starting Browser Scraper Service")
	
	scraper := &BrowserScraper{
		defaultTimeout: 30 * time.Second,
	}

	// Setup Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy", "service": "browser-scraper"})
	})

	// Main scraping endpoint
	r.POST("/scrape", func(c *gin.Context) {
		var req ScrapeRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		// Set timeout
		timeout := scraper.defaultTimeout
		if req.Timeout > 0 && req.Timeout <= 120 {
			timeout = time.Duration(req.Timeout) * time.Second
		}

		log.Printf("Scraping extension: %s (timeout: %v)", req.ExtensionID, timeout)

		result, err := scraper.scrapeExtension(req.ExtensionID, timeout)
		if err != nil {
			log.Printf("Scraping failed for %s: %v", req.ExtensionID, err)
			c.JSON(500, ScrapeResponse{
				Success:     false,
				Error:       err.Error(),
				ExtensionID: req.ExtensionID,
				ScrapedAt:   time.Now().UTC().Format(time.RFC3339),
			})
			return
		}

		c.JSON(200, result)
	})

	// Batch scraping endpoint
	r.POST("/scrape/batch", func(c *gin.Context) {
		var req struct {
			ExtensionIDs []string `json:"extension_ids" binding:"required"`
			Timeout      int      `json:"timeout,omitempty"`
		}
		
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": err.Error()})
			return
		}

		if len(req.ExtensionIDs) > 10 {
			c.JSON(400, gin.H{"error": "Maximum 10 extensions per batch request"})
			return
		}

		timeout := scraper.defaultTimeout
		if req.Timeout > 0 && req.Timeout <= 120 {
			timeout = time.Duration(req.Timeout) * time.Second
		}

		var results []ScrapeResponse
		for _, extensionID := range req.ExtensionIDs {
			result, err := scraper.scrapeExtension(extensionID, timeout)
			if err != nil {
				result = &ScrapeResponse{
					Success:     false,
					Error:       err.Error(),
					ExtensionID: extensionID,
					ScrapedAt:   time.Now().UTC().Format(time.RFC3339),
				}
			}
			results = append(results, *result)
			
			// Add small delay between requests to be polite
			if len(req.ExtensionIDs) > 1 {
				time.Sleep(2 * time.Second)
			}
		}

		c.JSON(200, gin.H{"results": results})
	})

	log.Println("Browser Scraper Service listening on :8081")
	log.Fatal(http.ListenAndServe(":8081", r))
}

func (bs *BrowserScraper) scrapeExtension(extensionID string, timeout time.Duration) (*ScrapeResponse, error) {
	url := fmt.Sprintf("https://chromewebstore.google.com/detail/%s", extensionID)

	// Create chrome context with alpine-compatible options
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.ExecPath("/usr/bin/chromium-browser"),
		chromedp.Flag("headless", true),
		chromedp.Flag("disable-gpu", true),
		chromedp.Flag("disable-dev-shm-usage", true),
		chromedp.Flag("disable-extensions", true),
		chromedp.Flag("no-sandbox", true),
		chromedp.Flag("disable-setuid-sandbox", true),
		chromedp.Flag("disable-web-security", true),
		chromedp.Flag("disable-features", "VizDisplayCompositor"),
		chromedp.UserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"),
	)

	allocCtx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()

	ctx, cancel := chromedp.NewContext(allocCtx)
	defer cancel()

	// Set timeout
	ctx, cancel = context.WithTimeout(ctx, timeout)
	defer cancel()

	var pageHTML string

	err := chromedp.Run(ctx,
		// Navigate to the page
		chromedp.Navigate(url),

		// Wait for the body to be visible
		chromedp.WaitVisible("body", chromedp.ByQuery),

		// Wait for JavaScript to load the extension data
		chromedp.Sleep(8*time.Second),

		// Get the rendered HTML
		chromedp.OuterHTML("html", &pageHTML, chromedp.ByQuery),
	)

	if err != nil {
		return nil, fmt.Errorf("browser scraping failed: %w", err)
	}

	// Extract extension data
	result := &ScrapeResponse{
		Success:     true,
		ExtensionID: extensionID,
		ScrapedAt:   time.Now().UTC().Format(time.RFC3339),
	}

	result.Name = bs.extractName(pageHTML)
	result.Developer = bs.extractDeveloper(pageHTML)
	result.Description = bs.extractDescription(pageHTML)
	result.Users = bs.extractUserCount(pageHTML)
	result.Rating = bs.extractRating(pageHTML)
	result.ReviewCount = bs.extractReviewCount(pageHTML)
	result.Keywords = bs.generateKeywords(result.Name, result.Description)

	return result, nil
}

func (bs *BrowserScraper) extractName(html string) string {
	// Strategy 1: Look in page title
	titleRe := regexp.MustCompile(`<title>([^<]+)</title>`)
	if matches := titleRe.FindStringSubmatch(html); len(matches) > 1 {
		title := strings.TrimSpace(matches[1])
		if title != "Chrome Web Store" && !strings.Contains(title, "Chrome Web Store") {
			title = strings.Replace(title, " - Chrome Web Store", "", 1)
			if len(title) > 3 && len(title) < 100 {
				return title
			}
		}
	}

	// Strategy 2: Look for h1 tags
	h1Re := regexp.MustCompile(`<h1[^>]*>([^<]{3,80})</h1>`)
	matches := h1Re.FindAllStringSubmatch(html, -1)
	for _, match := range matches {
		if len(match) > 1 {
			candidate := strings.TrimSpace(match[1])
			if bs.looksLikeExtensionName(candidate) {
				return candidate
			}
		}
	}

	// Strategy 3: Look for JSON data
	namePatterns := []string{
		`"name":\s*"([^"]{3,80})"`,
		`"title":\s*"([^"]{3,80})"`,
	}

	for _, pattern := range namePatterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				candidate := strings.TrimSpace(match[1])
				if bs.looksLikeExtensionName(candidate) {
					return candidate
				}
			}
		}
	}

	return ""
}

func (bs *BrowserScraper) extractDeveloper(html string) string {
	patterns := []string{
		`"developer":\s*"([^"]+)"`,
		`"author":\s*"([^"]+)"`,
		`href="/publisher/[^"]*">([^<]+)</a>`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(html); len(matches) > 1 {
			developer := strings.TrimSpace(matches[1])
			if developer != "" && len(developer) < 100 {
				return developer
			}
		}
	}

	return ""
}

func (bs *BrowserScraper) extractDescription(html string) string {
	// Check meta description first
	metaRe := regexp.MustCompile(`<meta name="description" content="([^"]+)"`)
	if matches := metaRe.FindStringSubmatch(html); len(matches) > 1 {
		desc := strings.TrimSpace(matches[1])
		if desc != "" && !strings.Contains(desc, "Chrome Web Store") && len(desc) > 20 {
			return desc
		}
	}

	patterns := []string{
		`"description":\s*"([^"]{20,500})"`,
		`"summary":\s*"([^"]{20,500})"`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(html); len(matches) > 1 {
			desc := strings.TrimSpace(matches[1])
			if len(desc) >= 20 && !strings.Contains(desc, "Chrome Web Store") {
				return desc
			}
		}
	}

	return ""
}

func (bs *BrowserScraper) extractUserCount(html string) int64 {
	patterns := []string{
		`(\d+(?:,\d+)*)\s*users?`,
		`(\d+(?:\.\d+)?)\s*[Mm]\s*users?`,
		`(\d+(?:\.\d+)?)\s*[Kk]\s*users?`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				if users := bs.parseUserCount(match[0]); users > 0 {
					return users
				}
			}
		}
	}

	return 0
}

func (bs *BrowserScraper) extractRating(html string) float64 {
	patterns := []string{
		`([0-9.]+)\s*out\s*of\s*5`,
		`([0-9.]+)\s*stars?`,
		`"rating":\s*([0-9.]+)`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				if rating, err := strconv.ParseFloat(match[1], 64); err == nil && rating >= 0 && rating <= 5 {
					return rating
				}
			}
		}
	}

	return 0.0
}

func (bs *BrowserScraper) extractReviewCount(html string) int64 {
	patterns := []string{
		`(\d+(?:,\d+)*)\s*reviews?`,
		`(\d+(?:\.\d+)?)\s*[Kk]\s*reviews?`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				if reviews := bs.parseUserCount(match[0]); reviews > 0 {
					return reviews
				}
			}
		}
	}

	return 0
}

func (bs *BrowserScraper) parseUserCount(text string) int64 {
	text = strings.ToLower(text)

	// Handle millions
	if strings.Contains(text, "m") {
		re := regexp.MustCompile(`(\d+(?:\.\d+)?)\s*m`)
		if matches := re.FindStringSubmatch(text); len(matches) > 1 {
			if num, err := strconv.ParseFloat(matches[1], 64); err == nil {
				return int64(num * 1000000)
			}
		}
	}

	// Handle thousands
	if strings.Contains(text, "k") {
		re := regexp.MustCompile(`(\d+(?:\.\d+)?)\s*k`)
		if matches := re.FindStringSubmatch(text); len(matches) > 1 {
			if num, err := strconv.ParseFloat(matches[1], 64); err == nil {
				return int64(num * 1000)
			}
		}
	}

	// Handle regular numbers
	re := regexp.MustCompile(`(\d+(?:,\d+)*)`)
	if matches := re.FindStringSubmatch(text); len(matches) > 1 {
		numStr := strings.ReplaceAll(matches[1], ",", "")
		if num, err := strconv.ParseInt(numStr, 10, 64); err == nil {
			return num
		}
	}

	return 0
}

func (bs *BrowserScraper) looksLikeExtensionName(candidate string) bool {
	if len(candidate) < 3 || len(candidate) > 100 {
		return false
	}

	excludePatterns := []string{
		"chrome web store", "google", "http", "www", "extension",
		"manifest", "version", "update", "error", "loading",
	}

	candidateLower := strings.ToLower(candidate)
	for _, pattern := range excludePatterns {
		if strings.Contains(candidateLower, pattern) {
			return false
		}
	}

	hasLetter := regexp.MustCompile(`[a-zA-Z]`).MatchString(candidate)
	return hasLetter
}

func (bs *BrowserScraper) generateKeywords(name, description string) []string {
	keywords := make(map[string]bool)

	// Add words from name
	nameWords := strings.Fields(strings.ToLower(name))
	for _, word := range nameWords {
		word = strings.Trim(word, ".,!?-()[]{}\"'")
		if len(word) > 2 && !bs.isStopWord(word) {
			keywords[word] = true
		}
	}

	// Add words from description
	if len(description) > 100 {
		description = description[:100]
	}
	descWords := strings.Fields(strings.ToLower(description))
	for _, word := range descWords {
		word = strings.Trim(word, ".,!?-()[]{}\"'")
		if len(word) > 3 && !bs.isStopWord(word) {
			keywords[word] = true
		}
	}

	result := make([]string, 0, len(keywords))
	for keyword := range keywords {
		result = append(result, keyword)
	}

	if len(result) > 10 {
		result = result[:10]
	}

	return result
}

func (bs *BrowserScraper) isStopWord(word string) bool {
	stopWords := map[string]bool{
		"the": true, "a": true, "an": true, "and": true, "or": true, "but": true,
		"in": true, "on": true, "at": true, "to": true, "for": true, "of": true,
		"with": true, "by": true, "from": true, "up": true, "about": true, "into": true,
	}
	return stopWords[word]
}