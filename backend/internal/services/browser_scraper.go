package services

import (
	"context"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

	"chrome-analytics-backend/internal/models"

	"github.com/chromedp/chromedp"
)

type BrowserScraper struct {
	timeout time.Duration
}

func NewBrowserScraper() *BrowserScraper {
	return &BrowserScraper{
		timeout: 30 * time.Second,
	}
}

// ScrapeExtension scrapes an extension using headless browser
func (bs *BrowserScraper) ScrapeExtension(extensionID string) (*models.Extension, error) {
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

	ctx, cancel := chromedp.NewContext(allocCtx, chromedp.WithLogf(log.Printf))
	defer cancel()

	// Set timeout
	ctx, cancel = context.WithTimeout(ctx, bs.timeout)
	defer cancel()

	log.Printf("Starting browser scraping for extension: %s", extensionID)

	var pageHTML string

	err := chromedp.Run(ctx,
		// Navigate to the page
		chromedp.Navigate(url),

		// Wait for the body to be visible
		chromedp.WaitVisible("body", chromedp.ByQuery),

		// Wait for JavaScript to load the extension data
		// We'll wait for either specific selectors or a timeout
		chromedp.Sleep(8*time.Second),

		// Get the rendered HTML
		chromedp.OuterHTML("html", &pageHTML, chromedp.ByQuery),
	)

	if err != nil {
		return nil, fmt.Errorf("browser scraping failed: %w", err)
	}

	log.Printf("Successfully retrieved %d characters of rendered HTML", len(pageHTML))

	// Extract extension data from the rendered HTML
	extension := &models.Extension{
		ExtensionID: extensionID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Use enhanced extraction methods
	extension.Name = bs.extractName(pageHTML)
	extension.Developer = bs.extractDeveloper(pageHTML)
	extension.Description = bs.extractDescription(pageHTML)
	extension.Users = bs.extractUserCount(pageHTML)
	extension.Rating = bs.extractRating(pageHTML)
	extension.ReviewCount = bs.extractReviewCount(pageHTML)
	extension.Category = "Productivity" // Default category

	// Generate keywords
	extension.Keywords = bs.generateKeywords(extension.Name, extension.Description)

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

	// Strategy 2: Look for h1 tags that might contain the extension name
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

	// Strategy 3: Look for JSON data with extension name
	namePatterns := []string{
		`"name":\s*"([^"]{3,80})"`,
		`"title":\s*"([^"]{3,80})"`,
		`'name':\s*'([^']{3,80})'`,
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

	// Strategy 4: Look in text content that might be displayed
	textPatterns := []string{
		`aria-label="([^"]{3,80})"`,
		`data-name="([^"]{3,80})"`,
		`class="[^"]*name[^"]*"[^>]*>([^<]{3,80})</`,
	}

	for _, pattern := range textPatterns {
		re := regexp.MustCompile(`(?i)` + pattern)
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
		`"publisher":\s*"([^"]+)"`,
		`href="/publisher/[^"]*">([^<]+)</a>`,
		`class="[^"]*developer[^"]*"[^>]*>([^<]+)</`,
		`class="[^"]*publisher[^"]*"[^>]*>([^<]+)</`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				developer := strings.TrimSpace(match[1])
				if developer != "" && len(developer) < 100 && !strings.Contains(strings.ToLower(developer), "chrome") {
					return developer
				}
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

	// Look for description in various places
	patterns := []string{
		`"description":\s*"([^"]{20,500})"`,
		`"summary":\s*"([^"]{20,500})"`,
		`class="[^"]*description[^"]*"[^>]*>([^<]{20,500})</`,
		`class="[^"]*summary[^"]*"[^>]*>([^<]{20,500})</`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindAllStringSubmatch(html, -1)
		for _, match := range matches {
			if len(match) > 1 {
				desc := strings.TrimSpace(match[1])
				if len(desc) >= 20 && !strings.Contains(desc, "Chrome Web Store") {
					return desc
				}
			}
		}
	}

	return ""
}

func (bs *BrowserScraper) extractUserCount(html string) int64 {
	patterns := []string{
		`"users":\s*"?(\d+(?:,\d+)*)"?`,
		`"userCount":\s*(\d+)`,
		`"activeUsers":\s*(\d+)`,
		`(\d+(?:,\d+)*)\s*users?`,
		`(\d+(?:\.\d+)?)\s*[Mm]\s*users?`,
		`(\d+(?:\.\d+)?)\s*[Kk]\s*users?`,
		`>(\d+(?:,\d+)*)\s*users?<`,
		`aria-label="[^"]*(\d+(?:,\d+)*)\s*users?[^"]*"`,
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
		`"rating":\s*([0-9.]+)`,
		`"averageRating":\s*([0-9.]+)`,
		`"score":\s*([0-9.]+)`,
		`([0-9.]+)\s*out\s*of\s*5`,
		`([0-9.]+)\s*stars?`,
		`aria-label="[^"]*([0-9.]+)\s*stars?[^"]*"`,
		`>([0-9.]+)\s*stars?<`,
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
		`"reviews":\s*"?(\d+(?:,\d+)*)"?`,
		`"reviewCount":\s*(\d+)`,
		`"ratingCount":\s*(\d+)`,
		`(\d+(?:,\d+)*)\s*reviews?`,
		`(\d+(?:\.\d+)?)\s*[Kk]\s*reviews?`,
		`>(\d+(?:,\d+)*)\s*reviews?<`,
		`aria-label="[^"]*(\d+(?:,\d+)*)\s*reviews?[^"]*"`,
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
	// Clean the text
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

	// Handle regular numbers with commas
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
	// Filter out obvious non-names
	if len(candidate) < 3 || len(candidate) > 100 {
		return false
	}

	// Exclude common non-name patterns
	excludePatterns := []string{
		"chrome web store",
		"google",
		"http",
		"www",
		"extension",
		"manifest",
		"version",
		"update",
		"error",
		"loading",
		"search",
		"menu",
		"button",
		"click",
	}

	candidateLower := strings.ToLower(candidate)
	for _, pattern := range excludePatterns {
		if strings.Contains(candidateLower, pattern) {
			return false
		}
	}

	// Must contain at least one letter
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

	// Add words from description (first 100 chars)
	shortDesc := description
	if len(shortDesc) > 100 {
		shortDesc = shortDesc[:100]
	}
	descWords := strings.Fields(strings.ToLower(shortDesc))
	for _, word := range descWords {
		word = strings.Trim(word, ".,!?-()[]{}\"'")
		if len(word) > 3 && !bs.isStopWord(word) {
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

func (bs *BrowserScraper) isStopWord(word string) bool {
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