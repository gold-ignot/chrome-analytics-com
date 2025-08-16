package main

import (
	"fmt"
	"os"

	"chrome-analytics-backend/internal/services"
)

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
}