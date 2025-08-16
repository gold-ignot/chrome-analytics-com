package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"chrome-analytics-backend/internal/services"
	"github.com/PuerkitoBio/goquery"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Get extension ID from command line or use default
	extensionID := "nmmhkkegccagdldgiimedpiccmgmieda" // Google Wallet as default
	if len(os.Args) > 1 {
		extensionID = os.Args[1]
	}

	fmt.Printf("Testing scraper with extension ID: %s\n", extensionID)
	fmt.Println("=" + strings.Repeat("=", 50))

	// Create proxy manager and scraper
	proxyFile := os.Getenv("PROXY_FILE")
	if proxyFile == "" {
		proxyFile = "proxies.txt" // Default proxy file
	}
	
	proxyManager, err := services.NewProxyManager(proxyFile)
	if err != nil {
		fmt.Printf("Warning: Failed to load proxies: %v\n", err)
		// Create empty proxy manager
		proxyManager, _ = services.NewProxyManager("/dev/null")
	}
	
	scraper := services.NewScraper(proxyManager)

	// Attempt to scrape
	fmt.Println("\n1. Attempting to scrape extension...")
	extension, err := scraper.ScrapeExtension(extensionID)
	if err != nil {
		fmt.Printf("❌ Scraping failed: %v\n", err)
		
		// Try direct request without proxy to debug
		fmt.Println("\n2. Attempting direct request (no proxy)...")
		testDirectRequest(extensionID)
	} else {
		fmt.Println("✅ Scraping successful!")
		
		// Print extension details
		data, _ := json.MarshalIndent(extension, "", "  ")
		fmt.Printf("\nExtension Data:\n%s\n", string(data))
	}
}

func testDirectRequest(extensionID string) {
	url := fmt.Sprintf("https://chromewebstore.google.com/detail/%s", extensionID)
	fmt.Printf("URL: %s\n", url)

	// Try to fetch the page directly
	doc, err := goquery.NewDocument(url)
	if err != nil {
		fmt.Printf("❌ Direct request failed: %v\n", err)
		return
	}

	fmt.Println("✅ Direct request successful!")
	fmt.Println("\n3. Analyzing HTML structure...")

	// Test various selectors to find what works
	selectors := map[string]string{
		"h1":                     "H1 tag",
		"title":                  "Page title",
		"[itemprop='name']":      "Schema.org name",
		"[data-g-id='name']":     "Data attribute name",
		".e-f-w":                 "Class e-f-w",
		".a-na-d-w":              "Class a-na-d-w",
		"[role='heading']":       "Role heading",
		"meta[property='og:title']": "Open Graph title",
	}

	fmt.Println("\nTesting selectors for extension name:")
	for selector, description := range selectors {
		text := doc.Find(selector).First().Text()
		if text != "" {
			fmt.Printf("✅ %s (%s): %q\n", selector, description, strings.TrimSpace(text))
		} else {
			// Try attribute value for meta tags
			if val, exists := doc.Find(selector).First().Attr("content"); exists {
				fmt.Printf("✅ %s (%s) [content]: %q\n", selector, description, val)
			} else {
				fmt.Printf("❌ %s (%s): not found\n", selector, description)
			}
		}
	}

	// Check for user count
	fmt.Println("\nTesting selectors for user count:")
	userSelectors := map[string]string{
		"[itemprop='interactionCount']": "Schema.org interaction count",
		"span:contains('users')":        "Span containing 'users'",
		"div:contains('users')":         "Div containing 'users'",
	}

	for selector, description := range userSelectors {
		doc.Find(selector).Each(func(i int, s *goquery.Selection) {
			text := strings.TrimSpace(s.Text())
			if text != "" && strings.Contains(strings.ToLower(text), "user") {
				fmt.Printf("✅ %s (%s): %q\n", selector, description, text)
			}
		})
	}

	// Sample first 1000 chars of HTML to see structure
	html, _ := doc.Html()
	if len(html) > 1000 {
		html = html[:1000]
	}
	fmt.Printf("\n4. First 1000 chars of HTML:\n%s\n...\n", html)
}