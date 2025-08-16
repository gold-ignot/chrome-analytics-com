package services

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"chrome-analytics-backend/internal/models"
)

// MockBrowserClient is a test implementation of BrowserClient
type MockBrowserClient struct {
	response *models.Extension
	err      error
}

func (m *MockBrowserClient) ScrapeExtension(extensionID string) (*models.Extension, error) {
	return m.response, m.err
}

func (m *MockBrowserClient) ScrapeExtensionWithProxy(extensionID string, proxy *ProxyInfo) (*models.Extension, error) {
	return m.response, m.err
}

func (m *MockBrowserClient) ScrapeExtensionWithTimeout(extensionID string, timeoutSeconds int) (*models.Extension, error) {
	return m.response, m.err
}

func (m *MockBrowserClient) HealthCheck() error {
	return m.err
}

func TestScraper_BrowserScraping(t *testing.T) {
	// Create mock browser client that returns expected data
	expectedExtension := &models.Extension{
		ExtensionID: "gighmmpiobklfepjocnamgkkbiglidom",
		Name:        "AdBlock — best ad blocker",
		Description: "Block ads and pop-ups on YouTube, Facebook, Twitch, and your favorite websites.",
		Developer:   "getadblock.com",
		Users:       int64(10000000),
		Rating:      4.5,
		ReviewCount: int64(171234),
		Category:    "Productivity",
	}

	mockBrowserClient := &MockBrowserClient{
		response: expectedExtension,
		err:      nil,
	}

	// Create scraper with nil database (for testing)
	scraper := NewScraper(nil)
	scraper.SetBrowserClient(mockBrowserClient)

	// Test scraping
	extension, err := scraper.ScrapeExtension("gighmmpiobklfepjocnamgkkbiglidom")
	if err != nil {
		t.Errorf("ScrapeExtension failed: %v", err)
		return
	}

	// Validate results
	if extension.Name != expectedExtension.Name {
		t.Errorf("Name mismatch: got %q, want %q", extension.Name, expectedExtension.Name)
	}
	if extension.Description != expectedExtension.Description {
		t.Errorf("Description mismatch: got %q, want %q", extension.Description, expectedExtension.Description)
	}
	if extension.Developer != expectedExtension.Developer {
		t.Errorf("Developer mismatch: got %q, want %q", extension.Developer, expectedExtension.Developer)
	}
	if extension.Users != expectedExtension.Users {
		t.Errorf("Users mismatch: got %d, want %d", extension.Users, expectedExtension.Users)
	}
	if extension.Rating != expectedExtension.Rating {
		t.Errorf("Rating mismatch: got %f, want %f", extension.Rating, expectedExtension.Rating)
	}
	if extension.ReviewCount != expectedExtension.ReviewCount {
		t.Errorf("ReviewCount mismatch: got %d, want %d", extension.ReviewCount, expectedExtension.ReviewCount)
	}
}

func TestScraper_BrowserClient_Integration(t *testing.T) {
	// Create a mock browser scraper server that mimics the real browser scraper API
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
			return
		}

		if r.URL.Path == "/scrape" && r.Method == "POST" {
			// Mock successful scraping response
			response := BrowserScrapeResponse{
				Success:     true,
				ExtensionID: "test-extension-id",
				Name:        "Test Extension",
				Developer:   "Test Developer",
				Description: "Test Description",
				Users:       12345,
				Rating:      4.2,
				ReviewCount: 567,
				Keywords:    []string{"test", "extension"},
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}

		http.NotFound(w, r)
	}))
	defer ts.Close()

	// Create browser client pointing to our test server
	browserClient := NewBrowserClient(ts.URL)

	// Create scraper and set the mock browser client
	scraper := NewScraper(nil)
	scraper.SetBrowserClient(browserClient)

	// Test scraping
	extension, err := scraper.ScrapeExtension("test-extension-id")
	if err != nil {
		t.Errorf("ScrapeExtension failed: %v", err)
		return
	}

	// Validate results
	if extension.Name != "Test Extension" {
		t.Errorf("Name mismatch: got %q, want %q", extension.Name, "Test Extension")
	}
	if extension.Developer != "Test Developer" {
		t.Errorf("Developer mismatch: got %q, want %q", extension.Developer, "Test Developer")
	}
	if extension.Users != 12345 {
		t.Errorf("Users mismatch: got %d, want %d", extension.Users, 12345)
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