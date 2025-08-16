package services

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"chrome-analytics-backend/internal/models"
)

func TestScraper_ExtractFromHTML(t *testing.T) {
	// Load test HTML file
	testHTML, err := os.ReadFile(filepath.Join("..", "..", "test", "fixtures", "chrome-webstore-sample.html"))
	if err != nil {
		t.Fatalf("Failed to load test HTML: %v", err)
	}

	// Create test server that returns our sample HTML
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		w.WriteHeader(http.StatusOK)
		w.Write(testHTML)
	}))
	defer ts.Close()

	// Create scraper with nil database (for testing)
	scraper := NewScraper(nil)
	// Override the Chrome Web Store URL to point to our test server
	scraper.baseURL = ts.URL + "/detail/"

	// Test scraping
	testCases := []struct {
		name        string
		extensionID string
		expected    *models.Extension
	}{
		{
			name:        "AdBlock Extension",
			extensionID: "gighmmpiobklfepjocnamgkkbiglidom",
			expected: &models.Extension{
				ExtensionID: "gighmmpiobklfepjocnamgkkbiglidom",
				Name:        "AdBlock — best ad blocker",
				Description: "Block ads and pop-ups on YouTube, Facebook, Twitch, and your favorite websites.",
				Developer:   "getadblock.com",
				Users:       int64(10000000),
				Rating:      4.5,
				ReviewCount: int64(171234),
				Category:    "Productivity",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			extension, err := scraper.ScrapeExtension(tc.extensionID)
			if err != nil {
				t.Errorf("ScrapeExtension failed: %v", err)
				return
			}

			// Validate results
			if extension.Name != tc.expected.Name {
				t.Errorf("Name mismatch: got %q, want %q", extension.Name, tc.expected.Name)
			}
			if extension.Description != tc.expected.Description {
				t.Errorf("Description mismatch: got %q, want %q", extension.Description, tc.expected.Description)
			}
			if extension.Developer != tc.expected.Developer {
				t.Errorf("Developer mismatch: got %q, want %q", extension.Developer, tc.expected.Developer)
			}
			if extension.Users != tc.expected.Users {
				t.Errorf("Users mismatch: got %d, want %d", extension.Users, tc.expected.Users)
			}
			if extension.Rating != tc.expected.Rating {
				t.Errorf("Rating mismatch: got %f, want %f", extension.Rating, tc.expected.Rating)
			}
			if extension.ReviewCount != tc.expected.ReviewCount {
				t.Errorf("ReviewCount mismatch: got %d, want %d", extension.ReviewCount, tc.expected.ReviewCount)
			}
		})
	}
}

func TestScraper_ParseUserCount(t *testing.T) {
	testCases := []struct {
		input    string
		expected int64
	}{
		{"10,000,000+ users", 10000000},
		{"10,000,000+", 10000000},
		{"1,234,567 users", 1234567},
		{"500,000", 500000},
		{"50K+ users", 50000},
		{"5M users", 5000000},
		{"123", 123},
		{"", 0},
		{"invalid", 0},
	}

	scraper := &Scraper{}
	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := scraper.parseUserCount(tc.input)
			if result != tc.expected {
				t.Errorf("parseUserCount(%q) = %d, want %d", tc.input, result, tc.expected)
			}
		})
	}
}

func TestScraper_ParseRating(t *testing.T) {
	testCases := []struct {
		input    string
		expected float64
	}{
		{"4.5", 4.5},
		{"5.0", 5.0},
		{"3.7 out of 5", 3.7},
		{"Rated 4.2 out of 5", 4.2},
		{"", 0.0},
		{"invalid", 0.0},
	}

	scraper := &Scraper{}
	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := scraper.parseRating(tc.input)
			if result != tc.expected {
				t.Errorf("parseRating(%q) = %f, want %f", tc.input, result, tc.expected)
			}
		})
	}
}

func TestScraper_ParseReviewCount(t *testing.T) {
	testCases := []struct {
		input    string
		expected int64
	}{
		{"171,234 reviews", 171234},
		{"171,234", 171234},
		{"1,234", 1234},
		{"500 reviews", 500},
		{"12", 12},
		{"", 0},
		{"no reviews", 0},
	}

	scraper := &Scraper{}
	for _, tc := range testCases {
		t.Run(tc.input, func(t *testing.T) {
			result := scraper.parseReviewCount(tc.input)
			if result != tc.expected {
				t.Errorf("parseReviewCount(%q) = %d, want %d", tc.input, result, tc.expected)
			}
		})
	}
}

// TestScraper_LiveScraping tests against the real Chrome Web Store
// This test is skipped by default to avoid hitting the real site during regular test runs
func TestScraper_LiveScraping(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping live scraping test in short mode")
	}

	// Only run if explicitly enabled via environment variable
	if os.Getenv("TEST_LIVE_SCRAPING") != "true" {
		t.Skip("Live scraping test disabled. Set TEST_LIVE_SCRAPING=true to enable")
	}

	scraper := NewScraper(nil)

	// Test with a known stable extension
	extensionID := "nmmhkkegccagdldgiimedpiccmgmieda" // Google Wallet
	
	extension, err := scraper.ScrapeExtension(extensionID)
	if err != nil {
		t.Fatalf("Failed to scrape extension: %v", err)
	}

	// Basic validation
	if extension.Name == "" {
		t.Error("Extension name is empty")
	}
	if extension.Developer == "" {
		t.Error("Extension developer is empty")
	}
	if extension.Users <= 0 {
		t.Error("Extension users count is invalid")
	}
	if extension.Rating < 0 || extension.Rating > 5 {
		t.Errorf("Extension rating is out of range: %f", extension.Rating)
	}

	t.Logf("Successfully scraped: %s by %s (%d users, %.1f rating)",
		extension.Name, extension.Developer, extension.Users, extension.Rating)
}