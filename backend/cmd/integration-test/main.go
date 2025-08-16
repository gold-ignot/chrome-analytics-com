package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"chrome-analytics-backend/internal/models"
	"chrome-analytics-backend/internal/services"
	"github.com/joho/godotenv"
)

func main() {
	fmt.Println("Chrome Web Store Scraper Integration Test")
	fmt.Println(strings.Repeat("=", 60))

	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Test extension IDs - using well-known stable extensions
	testExtensions := []struct {
		id   string
		name string
	}{
		{"nmmhkkegccagdldgiimedpiccmgmieda", "Google Wallet"},
		{"cjpalhdlnbpafiamejdnhcphjbkeiagm", "uBlock Origin"},
		{"gighmmpiobklfepjocnamgkkbiglidom", "AdBlock"},
		{"hkgfoiooedgoejojocmhlaklaeopbecg", "Picture-in-Picture Extension"},
		{"ejidjjhkpiempkbhmpbfngldlkglhimk", "Web Developer"},
	}

	fmt.Printf("Testing %d extensions...\n\n", len(testExtensions))

	// Create scraper with real proxy setup
	scraper := services.NewScraper(nil) // nil database for testing
	
	// Note: Now using standalone scraper by default, no need to override

	results := make(map[string]interface{})
	successCount := 0
	failureCount := 0

	for i, ext := range testExtensions {
		fmt.Printf("[%d/%d] Testing: %s (%s)\n", i+1, len(testExtensions), ext.name, ext.id)
		fmt.Printf("URL: https://chromewebstore.google.com/detail/%s\n", ext.id)

		startTime := time.Now()
		
		// Test 1: Regular scraping
		extension, err := scraper.ScrapeExtension(ext.id)
		duration := time.Since(startTime)
		
		fmt.Printf("Duration: %v\n", duration)

		if err != nil {
			fmt.Printf("❌ FAILED: %v\n", err)
			failureCount++
			results[ext.id] = map[string]interface{}{
				"name":     ext.name,
				"success":  false,
				"error":    err.Error(),
				"duration": duration.String(),
			}
		} else {
			fmt.Printf("✅ SUCCESS\n")
			successCount++

			// Validate extracted data
			validation := validateExtraction(extension)
			
			fmt.Printf("   Name: %q (valid: %v)\n", extension.Name, validation["name"])
			fmt.Printf("   Developer: %q (valid: %v)\n", extension.Developer, validation["developer"])
			fmt.Printf("   Users: %d (valid: %v)\n", extension.Users, validation["users"])
			fmt.Printf("   Rating: %.1f (valid: %v)\n", extension.Rating, validation["rating"])
			fmt.Printf("   Reviews: %d (valid: %v)\n", extension.ReviewCount, validation["reviews"])
			fmt.Printf("   Description: %q (valid: %v)\n", 
				truncateString(extension.Description, 50), validation["description"])

			results[ext.id] = map[string]interface{}{
				"name":        ext.name,
				"success":     true,
				"extension":   extension,
				"validation":  validation,
				"duration":    duration.String(),
				"score":       calculateValidationScore(validation),
			}
		}

		fmt.Println()

		// Add delay between requests to be polite
		if i < len(testExtensions)-1 {
			fmt.Printf("Waiting 5 seconds before next request...\n\n")
			time.Sleep(5 * time.Second)
		}
	}

	// Print summary
	fmt.Println(strings.Repeat("=", 60))
	fmt.Println("INTEGRATION TEST SUMMARY")
	fmt.Println(strings.Repeat("=", 60))
	fmt.Printf("Total Extensions Tested: %d\n", len(testExtensions))
	fmt.Printf("Successful Extractions: %d (%.1f%%)\n", successCount, float64(successCount)/float64(len(testExtensions))*100)
	fmt.Printf("Failed Extractions: %d (%.1f%%)\n", failureCount, float64(failureCount)/float64(len(testExtensions))*100)

	// Calculate overall data quality
	if successCount > 0 {
		fmt.Println("\nDATA QUALITY ANALYSIS:")
		totalScore := 0.0
		validCount := 0

		for _, result := range results {
			if resultMap, ok := result.(map[string]interface{}); ok {
				if score, exists := resultMap["score"]; exists {
					if scoreFloat, ok := score.(float64); ok {
						totalScore += scoreFloat
						validCount++
					}
				}
			}
		}

		if validCount > 0 {
			avgScore := totalScore / float64(validCount)
			fmt.Printf("Average Data Quality Score: %.1f/5.0\n", avgScore)
			
			if avgScore >= 4.0 {
				fmt.Println("🟢 EXCELLENT: Scraper is extracting high-quality data")
			} else if avgScore >= 3.0 {
				fmt.Println("🟡 GOOD: Scraper is working but some data missing")
			} else if avgScore >= 2.0 {
				fmt.Println("🟠 FAIR: Scraper partially working, needs improvement")
			} else {
				fmt.Println("🔴 POOR: Scraper needs significant fixes")
			}
		}
	}

	// Save detailed results to file
	if resultsJSON, err := json.MarshalIndent(results, "", "  "); err == nil {
		if err := os.WriteFile("integration_test_results.json", resultsJSON, 0644); err == nil {
			fmt.Printf("\n📝 Detailed results saved to: integration_test_results.json\n")
		}
	}

	// Provide recommendations
	fmt.Println("\nRECOMMENDations:")
	if failureCount > successCount {
		fmt.Println("🔧 High failure rate suggests:")
		fmt.Println("   - Chrome Web Store may be blocking requests")
		fmt.Println("   - Try different user agents or request headers")
		fmt.Println("   - Consider using headless browser (Playwright/Puppeteer)")
		fmt.Println("   - Check if proxies are working correctly")
	}
	
	if successCount > 0 {
		// Analyze which fields are failing most
		fieldFailures := make(map[string]int)
		for _, result := range results {
			if resultMap, ok := result.(map[string]interface{}); ok {
				if success, exists := resultMap["success"].(bool); exists && success {
					if validation, exists := resultMap["validation"].(map[string]interface{}); exists {
						for field, valid := range validation {
							if valid.(bool) == false {
								fieldFailures[field]++
							}
						}
					}
				}
			}
		}

		if len(fieldFailures) > 0 {
			fmt.Println("🔍 Fields that need selector updates:")
			for field, count := range fieldFailures {
				fmt.Printf("   - %s: failing in %d/%d cases\n", field, count, successCount)
			}
		}
	}

	fmt.Println("\n🚀 Next steps:")
	fmt.Println("   1. Review detailed results in integration_test_results.json")
	fmt.Println("   2. Update selectors for failing fields")
	fmt.Println("   3. Test with different request headers if needed")
	fmt.Println("   4. Consider JavaScript rendering if all else fails")
}

func validateExtraction(ext *models.Extension) map[string]interface{} {
	return map[string]interface{}{
		"name":        ext.Name != "",
		"developer":   ext.Developer != "",
		"users":       ext.Users > 0,
		"rating":      ext.Rating > 0 && ext.Rating <= 5,
		"reviews":     ext.ReviewCount >= 0, // 0 is valid for new extensions
		"description": ext.Description != "",
	}
}

func calculateValidationScore(validation map[string]interface{}) float64 {
	score := 0.0
	count := 0.0
	
	for _, valid := range validation {
		if validBool, ok := valid.(bool); ok {
			if validBool {
				score += 1.0
			}
			count += 1.0
		}
	}
	
	if count > 0 {
		return (score / count) * 5.0 // Scale to 0-5
	}
	return 0.0
}

func truncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}