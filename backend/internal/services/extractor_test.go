package services

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"

	"github.com/bradleyjkemp/cupaloy/v2"
)

// TestExtensionData represents the test data for an extension
type TestExtensionData struct {
	ID          string
	Name        string
	URL         string
	HTMLFile    string
	Expected    ExtensionTestExpectations
}

// ExtensionTestExpectations defines what we expect to extract from each extension
type ExtensionTestExpectations struct {
	ID                  string
	Slug                string
	HasLogo            bool
	HasDescription      bool
	Category           string
	Subcategory        string
	HasVersion         bool
	HasFileSize        bool
	HasLastUpdated     bool
	HasLanguages       bool
	RatingGreaterThan  float64
	ReviewCountGreater int
	UserCountGreater   int
	HasDeveloperName   bool
	HasScreenshots     bool
}

// Test extensions data
var testExtensions = []TestExtensionData{
	{
		ID:       "cjpalhdlnbpafiamejdnhcphjbkeiagm",
		Name:     "uBlock Origin",
		URL:      "https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm",
		HTMLFile: "ublock-origin.html",
		Expected: ExtensionTestExpectations{
			ID:                  "cjpalhdlnbpafiamejdnhcphjbkeiagm",
			Slug:                "ublock-origin",
			HasLogo:            true,
			HasDescription:      true,
			Category:           "Extension",
			Subcategory:        "Privacy & Security",
			HasVersion:         true,
			HasFileSize:        true,
			HasLastUpdated:     true,
			HasLanguages:       true,
			RatingGreaterThan:  4.0,
			ReviewCountGreater: 30000,
			UserCountGreater:   10000000,
			HasDeveloperName:   true,
			HasScreenshots:     true,
		},
	},
	{
		ID:       "gighmmpiobklfepjocnamgkkbiglidom",
		Name:     "AdBlock",
		URL:      "https://chromewebstore.google.com/detail/adblock-%E2%80%94-block-ads-acros/gighmmpiobklfepjocnamgkkbiglidom",
		HTMLFile: "adblock.html",
		Expected: ExtensionTestExpectations{
			ID:                  "gighmmpiobklfepjocnamgkkbiglidom",
			Slug:                "adblock-—-block-ads-acros",
			HasLogo:            true,
			HasDescription:      true,
			Category:           "Extension",
			Subcategory:        "",
			HasVersion:         true,
			HasFileSize:        true,
			HasLastUpdated:     true,
			HasLanguages:       true,
			RatingGreaterThan:  4.0,
			ReviewCountGreater: 100000,
			UserCountGreater:   50000000,
			HasDeveloperName:   true,
			HasScreenshots:     true,
		},
	},
	{
		ID:       "bgnkhhnnamicmpeenaelnjfhikgbkllg",
		Name:     "AdGuard AdBlocker",
		URL:      "https://chromewebstore.google.com/detail/adguard-adblocker/bgnkhhnnamicmpeenaelnjfhikgbkllg",
		HTMLFile: "adguard.html",
		Expected: ExtensionTestExpectations{
			ID:                  "bgnkhhnnamicmpeenaelnjfhikgbkllg",
			Slug:                "adguard-adblocker",
			HasLogo:            true,
			HasDescription:      true,
			Category:           "Extension",
			Subcategory:        "",
			HasVersion:         true,
			HasFileSize:        true,
			HasLastUpdated:     true,
			HasLanguages:       true,
			RatingGreaterThan:  4.0,
			ReviewCountGreater: 50000,
			UserCountGreater:   10000000,
			HasDeveloperName:   true,
			HasScreenshots:     true,
		},
	},
	{
		ID:       "mlomiejdfkolichcflejclcbmpeaniij",
		Name:     "Ghostery",
		URL:      "https://chromewebstore.google.com/detail/ghostery-tracker-ad-block/mlomiejdfkolichcflejclcbmpeaniij",
		HTMLFile: "ghostery.html",
		Expected: ExtensionTestExpectations{
			ID:                  "mlomiejdfkolichcflejclcbmpeaniij",
			Slug:                "ghostery-tracker-ad-block",
			HasLogo:            true,
			HasDescription:      true,
			Category:           "Extension",
			Subcategory:        "",
			HasVersion:         true,
			HasFileSize:        true,
			HasLastUpdated:     true,
			HasLanguages:       true,
			RatingGreaterThan:  4.0,
			ReviewCountGreater: 10000,
			UserCountGreater:   1000000,
			HasDeveloperName:   true,
			HasScreenshots:     true,
		},
	},
	{
		ID:       "ddkjiahejlhfcafbddmgiahcphecmpfh",
		Name:     "uBlock Origin Lite",
		URL:      "https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh",
		HTMLFile: "ublock-origin-lite.html",
		Expected: ExtensionTestExpectations{
			ID:                  "ddkjiahejlhfcafbddmgiahcphecmpfh",
			Slug:                "ublock-origin-lite",
			HasLogo:            true,
			HasDescription:      true,
			Category:           "Extension",
			Subcategory:        "",
			HasVersion:         true,
			HasFileSize:        true,
			HasLastUpdated:     true,
			HasLanguages:       true,
			RatingGreaterThan:  4.0,
			ReviewCountGreater: 1000,
			UserCountGreater:   1000000,
			HasDeveloperName:   true,
			HasScreenshots:     true,
		},
	},
}

func TestExtractorWithMultipleExtensions(t *testing.T) {
	extractor := NewExtractor()

	for _, testExt := range testExtensions {
		t.Run(testExt.Name, func(t *testing.T) {
			// Read the HTML file
			htmlFilePath := filepath.Join("../../test/fixtures", testExt.HTMLFile)
			htmlBytes, err := os.ReadFile(htmlFilePath)
			if err != nil {
				t.Skipf("HTML file not found: %s (run download script first)", htmlFilePath)
				return
			}

			html := string(htmlBytes)

			// Extract all data
			extractedData := extractAllData(extractor, html)

			// Validate expectations
			validateExtractedData(t, extractedData, testExt.Expected)

			// Snapshot test for consistency
			cupaloy.SnapshotT(t, extractedData)
		})
	}
}

// extractAllData extracts all data from an extension HTML page
func extractAllData(extractor *Extractor, html string) map[string]interface{} {
	category, subcategory := extractor.ExtractCategory(html)
	
	return map[string]interface{}{
		"id":                  extractor.ExtractID(html),
		"slug":                extractor.ExtractSlug(html),
		"logoURL":             extractor.ExtractLogo(html),
		"markdownDescription": extractor.ExtractMarkdownDescription(html),
		"category":            category,
		"subcategory":         subcategory,
		"version":             extractor.ExtractVersion(html),
		"fileSize":            extractor.ExtractFileSize(html),
		"lastUpdated":         extractor.ExtractLastUpdated(html),
		"features":            extractor.ExtractFeatures(html),
		"languages":           extractor.ExtractLanguages(html),
		"status":              extractor.ExtractStatus(html),
		"rating":              extractor.ExtractRating(html),
		"reviewCount":         extractor.ExtractReviewCount(html),
		"userCount":           extractor.ExtractUserCount(html),
		"developerName":       extractor.ExtractDeveloperName(html),
		"developerURL":        extractor.ExtractDeveloperURL(html),
		"website":             extractor.ExtractWebsite(html),
		"supportURL":          extractor.ExtractSupportURL(html),
		"supportEmail":        extractor.ExtractSupportEmail(html),
		"screenshots":         extractor.ExtractBetterScreenshots(html),
		"relatedExtensions":   extractor.ExtractRelatedExtensions(html),
	}
}

// validateExtractedData validates that extracted data meets expectations
func validateExtractedData(t *testing.T, extracted map[string]interface{}, expected ExtensionTestExpectations) {
	// Test required fields
	if extracted["id"] != expected.ID {
		t.Errorf("ID mismatch: got %v, want %s", extracted["id"], expected.ID)
	}

	if extracted["slug"] != expected.Slug {
		t.Errorf("Slug mismatch: got %v, want %s", extracted["slug"], expected.Slug)
	}

	if expected.HasLogo && extracted["logoURL"] == "" {
		t.Error("Logo URL should not be empty")
	}

	if expected.HasDescription && extracted["markdownDescription"] == "" {
		t.Error("Description should not be empty")
	}

	if extracted["category"] != expected.Category {
		t.Errorf("Category mismatch: got %v, want %s", extracted["category"], expected.Category)
	}

	if expected.Subcategory != "" && extracted["subcategory"] != expected.Subcategory {
		t.Errorf("Subcategory mismatch: got %v, want %s", extracted["subcategory"], expected.Subcategory)
	}

	if expected.HasVersion && extracted["version"] == "" {
		t.Error("Version should not be empty")
	}

	if expected.HasFileSize && extracted["fileSize"] == "" {
		t.Error("File size should not be empty")
	}

	if expected.HasLastUpdated && extracted["lastUpdated"] == "" {
		t.Error("Last updated should not be empty")
	}

	if expected.HasLanguages {
		languages, ok := extracted["languages"].([]string)
		if !ok || len(languages) == 0 {
			t.Error("Languages should be a non-empty array")
		}
	}

	if rating, ok := extracted["rating"].(float64); ok {
		if rating < expected.RatingGreaterThan {
			t.Errorf("Rating too low: got %f, want > %f", rating, expected.RatingGreaterThan)
		}
	} else {
		t.Error("Rating should be a float64")
	}

	if reviewCount, ok := extracted["reviewCount"].(int); ok {
		if reviewCount < expected.ReviewCountGreater {
			t.Errorf("Review count too low: got %d, want > %d", reviewCount, expected.ReviewCountGreater)
		}
	} else {
		t.Error("Review count should be an int")
	}

	if userCount, ok := extracted["userCount"].(int); ok {
		if userCount < expected.UserCountGreater {
			t.Errorf("User count too low: got %d, want > %d", userCount, expected.UserCountGreater)
		}
	} else {
		t.Error("User count should be an int")
	}

	if expected.HasDeveloperName && extracted["developerName"] == "" {
		t.Error("Developer name should not be empty")
	}

	if expected.HasScreenshots {
		screenshots, ok := extracted["screenshots"].([]string)
		if !ok || len(screenshots) == 0 {
			t.Error("Screenshots should be a non-empty array")
		}
	}
}

// TestExtractorSnapshot tests snapshot consistency for the uBlock Origin extension
func TestExtractorSnapshot(t *testing.T) {
	extractor := NewExtractor()

	// Read the uBlock Origin HTML file
	htmlFilePath := filepath.Join("../../test/fixtures", "ublock-origin.html")
	htmlBytes, err := os.ReadFile(htmlFilePath)
	if err != nil {
		t.Skipf("HTML file not found: %s", htmlFilePath)
		return
	}

	html := string(htmlBytes)
	extractedData := extractAllData(extractor, html)

	// Snapshot test
	cupaloy.SnapshotT(t, extractedData)
}

// Helper function to download extension HTML files (to be run manually)
func downloadExtensionHTML(extensionID, fileName string) error {
	// This would be implemented to download HTML files for testing
	// For now, we'll use the existing ublock-origin.html file
	fmt.Printf("Would download %s to %s\n", extensionID, fileName)
	return nil
}