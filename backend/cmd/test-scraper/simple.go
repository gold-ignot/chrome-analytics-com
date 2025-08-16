package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

func main() {
	extensionID := "nmmhkkegccagdldgiimedpiccmgmieda" // Google Wallet
	url := fmt.Sprintf("https://chromewebstore.google.com/detail/%s", extensionID)
	
	fmt.Printf("Testing Chrome Web Store scraping\n")
	fmt.Printf("URL: %s\n", url)
	fmt.Println(strings.Repeat("=", 50))

	// Create HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// Make request
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Fatalf("Failed to create request: %v", err)
	}

	// Set user agent to mimic browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
	req.Header.Set("Accept-Language", "en-US,en;q=0.5")

	resp, err := client.Do(req)
	if err != nil {
		log.Fatalf("Failed to fetch page: %v", err)
	}
	defer resp.Body.Close()

	fmt.Printf("\nResponse Status: %s\n", resp.Status)
	fmt.Printf("Content-Type: %s\n", resp.Header.Get("Content-Type"))

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Bad status code: %d", resp.StatusCode)
	}

	// Parse HTML
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Fatalf("Failed to parse HTML: %v", err)
	}

	fmt.Println("\n" + strings.Repeat("=", 50))
	fmt.Println("TESTING SELECTORS:")
	fmt.Println(strings.Repeat("=", 50))

	// Test title extraction
	fmt.Println("\n1. PAGE TITLE:")
	title := doc.Find("title").Text()
	fmt.Printf("   Title tag: %q\n", title)

	// Test various h1 selectors
	fmt.Println("\n2. H1 TAGS:")
	doc.Find("h1").Each(func(i int, s *goquery.Selection) {
		fmt.Printf("   H1[%d]: %q\n", i, strings.TrimSpace(s.Text()))
	})

	// Test meta tags
	fmt.Println("\n3. META TAGS:")
	doc.Find("meta").Each(func(i int, s *goquery.Selection) {
		if name, _ := s.Attr("property"); strings.Contains(name, "title") || strings.Contains(name, "name") {
			content, _ := s.Attr("content")
			fmt.Printf("   Meta[%s]: %q\n", name, content)
		}
	})

	// Look for any element containing the extension name
	fmt.Println("\n4. SEARCHING FOR EXTENSION NAME PATTERNS:")
	possibleSelectors := []string{
		"[itemprop='name']",
		"[data-name]",
		"[aria-label*='extension']",
		".extension-name",
		"div[role='heading']",
		"span[role='heading']",
	}

	for _, selector := range possibleSelectors {
		elements := doc.Find(selector)
		if elements.Length() > 0 {
			elements.Each(func(i int, s *goquery.Selection) {
				text := strings.TrimSpace(s.Text())
				if text != "" {
					fmt.Printf("   %s: %q\n", selector, text)
				}
			})
		}
	}

	// Look for user count
	fmt.Println("\n5. SEARCHING FOR USER COUNT:")
	doc.Find("*").Each(func(i int, s *goquery.Selection) {
		text := strings.TrimSpace(s.Text())
		if strings.Contains(text, "users") && len(text) < 50 {
			// Check if parent already printed this
			parent := s.Parent()
			parentText := strings.TrimSpace(parent.Text())
			if parentText != text {
				fmt.Printf("   Found: %q\n", text)
			}
		}
	})

	// Sample the first part of HTML body
	fmt.Println("\n6. HTML BODY SAMPLE (first 2000 chars):")
	html, _ := doc.Html()
	if len(html) > 2000 {
		html = html[:2000]
	}
	fmt.Printf("%s\n...\n", html)
}