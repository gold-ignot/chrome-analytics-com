package main

import (
	"fmt"
	"os"
	"strings"

	"chrome-analytics-backend/internal/services"
)

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	// Read the downloaded HTML file
	htmlBytes, err := os.ReadFile("../../test/fixtures/extension.html")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading extension.html: %v\n", err)
		fmt.Println("Please run 'go run test_extractor.go' first to download the HTML file")
		return
	}
	
	html := string(htmlBytes)
	
	// Create an extractor instance
	extractor := services.NewExtractor()
	
	fmt.Println("=== Testing Extractor with CSS Selectors ===")
	
	// Test the extraction methods directly
	version := extractor.ExtractVersion(html)
	fmt.Printf("Version: '%s'\n", version)
	
	fileSize := extractor.ExtractFileSize(html)
	fmt.Printf("File Size: '%s'\n", fileSize)
	
	lastUpdated := extractor.ExtractLastUpdated(html)
	fmt.Printf("Last Updated: '%s'\n", lastUpdated)
	
	developerURL := extractor.ExtractDeveloperURL(html)
	fmt.Printf("Developer URL: '%s'\n", developerURL)
	
	website := extractor.ExtractWebsite(html)
	fmt.Printf("Website: '%s'\n", website)
	
	supportURL := extractor.ExtractSupportURL(html)
	fmt.Printf("Support URL: '%s'\n", supportURL)
	
	privacyURL := extractor.ExtractPrivacyURL(html)
	fmt.Printf("Privacy URL: '%s'\n", privacyURL)
	
	logoURL := extractor.ExtractLogo(html)
	fmt.Printf("Logo URL: '%s'\n", logoURL)
	
	features := extractor.ExtractFeatures(html)
	fmt.Printf("Features: %v\n", features)
	
	languages := extractor.ExtractLanguages(html)
	fmt.Printf("Languages: '%s'\n", languages)
	
	fullDesc := extractor.ExtractFullDescription(html)
	fmt.Printf("Full Description: '%s'\n", fullDesc[:min(200, len(fullDesc))]+"...")
	
	screenshots := extractor.ExtractScreenshots(html)
	fmt.Printf("Screenshots: %v\n", screenshots)
	
	category, subcategory := extractor.ExtractCategory(html)
	fmt.Printf("Category: '%s', Subcategory: '%s'\n", category, subcategory)
	
	status := extractor.ExtractStatus(html)
	fmt.Printf("Status: %v\n", status)
	
	reviewCount := extractor.ExtractReviewCount(html)
	fmt.Printf("Review Count: '%s'\n", reviewCount)
	
	privacyDetails := extractor.ExtractPrivacyDetails(html)
	fmt.Printf("Privacy Details: %v\n", privacyDetails)
	
	rating := extractor.ExtractRating(html)
	fmt.Printf("Rating: '%s'\n", rating)
	
	userCount := extractor.ExtractUserCount(html)
	fmt.Printf("User Count: '%s'\n", userCount)
	
	// Debug user count extraction
	fmt.Printf("Debug: Searching for 'users' in HTML...\n")
	lines := strings.Split(html, "\n")
	for i, line := range lines {
		if strings.Contains(line, "users") && strings.Contains(line, "1,000,000") {
			fmt.Printf("Found user count in line %d: %s\n", i, strings.TrimSpace(line))
			break
		}
	}
	
	betterScreenshots := extractor.ExtractBetterScreenshots(html)
	fmt.Printf("Better Screenshots: %v\n", betterScreenshots)
	
	related := extractor.ExtractRelatedExtensions(html)
	fmt.Printf("Related Extensions: %v\n", related)
}