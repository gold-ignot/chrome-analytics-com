package main

import (
	"fmt"
	"chrome-analytics-backend/internal/services"
	"os"
)

func main() {
	htmlBytes, _ := os.ReadFile("../../test/fixtures/ublock-origin.html")
	html := string(htmlBytes)
	extractor := services.NewExtractor()
	
	fmt.Printf("Features: %+v
", extractor.ExtractFeatures(html))
	fmt.Printf("Status: %+v
", extractor.ExtractStatus(html))
	fmt.Printf("DeveloperURL: %q
", extractor.ExtractDeveloperURL(html))
	fmt.Printf("Website: %q
", extractor.ExtractWebsite(html))
	fmt.Printf("RelatedExtensions: %+v
", extractor.ExtractRelatedExtensions(html))
}
