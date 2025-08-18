package main

import (
	"encoding/json"
	"fmt"
	"os"

	"chrome-analytics-backend/internal/services"
)

func main() {
	// Read the downloaded HTML file
	htmlBytes, err := os.ReadFile("test/fixtures/ublock-origin.html")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading ublock-origin.html: %v\n", err)
		fmt.Println("HTML file not found. Run the comprehensive tests instead: go test ./internal/services -v")
		return
	}
	
	html := string(htmlBytes)
	
	// Create an extractor instance
	extractor := services.NewExtractor()
	
	// Create an ordered structure for meaningful JSON output
	type OrderedExtensionData struct {
		// Basic Information
		ID                string `json:"id"`
		Slug              string `json:"slug"`
		LogoURL           string `json:"logoURL"`
		MarkdownDescription string `json:"markdownDescription"`
		
		// Classification
		Category    string `json:"category"`
		Subcategory string `json:"subcategory"`
		
		// Technical Details
		Version      string   `json:"version"`
		FileSize     string   `json:"fileSize"`
		LastUpdated  string   `json:"lastUpdated"`
		Features     []string `json:"features"`
		Languages    []string `json:"languages"`
		Status       []string `json:"status"`
		
		// Ratings & Reviews
		Rating      float64 `json:"rating"`
		ReviewCount int     `json:"reviewCount"`
		UserCount   int     `json:"userCount"`
		
		// Developer Information
		DeveloperName string `json:"developerName"`
		DeveloperURL  string `json:"developerURL"`
		Website       string `json:"website"`
		SupportURL    string `json:"supportURL"`
		SupportEmail  string `json:"supportEmail"`
		
		// Media & Related
		Screenshots       []string                   `json:"screenshots"`
		RelatedExtensions []map[string]string        `json:"relatedExtensions"`
	}
	
	// Extract category separately since it returns two values
	category, subcategory := extractor.ExtractCategory(html)
	
	// Populate the ordered structure
	data := OrderedExtensionData{
		// Basic Information
		ID:                  extractor.ExtractID(html),
		Slug:                extractor.ExtractSlug(html),
		LogoURL:             extractor.ExtractLogo(html),
		MarkdownDescription: extractor.ExtractMarkdownDescription(html),
		
		// Classification
		Category:    category,
		Subcategory: subcategory,
		
		// Technical Details
		Version:     extractor.ExtractVersion(html),
		FileSize:    extractor.ExtractFileSize(html),
		LastUpdated: extractor.ExtractLastUpdated(html),
		Features:    extractor.ExtractFeatures(html),
		Languages:   extractor.ExtractLanguages(html),
		Status:      extractor.ExtractStatus(html),
		
		// Ratings & Reviews
		Rating:      extractor.ExtractRating(html),
		ReviewCount: extractor.ExtractReviewCount(html),
		UserCount:   extractor.ExtractUserCount(html),
		
		// Developer Information
		DeveloperName: extractor.ExtractDeveloperName(html),
		DeveloperURL:  extractor.ExtractDeveloperURL(html),
		Website:       extractor.ExtractWebsite(html),
		SupportURL:    extractor.ExtractSupportURL(html),
		SupportEmail:  extractor.ExtractSupportEmail(html),
		
		// Media & Related
		Screenshots:       extractor.ExtractBetterScreenshots(html),
		RelatedExtensions: extractor.ExtractRelatedExtensions(html),
	}
	
	// Output as formatted JSON
	jsonBytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling to JSON: %v\n", err)
		return
	}
	
	fmt.Println(string(jsonBytes))
}