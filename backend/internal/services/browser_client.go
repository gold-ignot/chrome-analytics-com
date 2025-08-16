package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"chrome-analytics-backend/internal/models"
)

type BrowserClient struct {
	baseURL string
	client  *http.Client
}

type BrowserScrapeRequest struct {
	ExtensionID string `json:"extension_id"`
	Timeout     int    `json:"timeout,omitempty"`
}

type BrowserScrapeResponse struct {
	Success     bool     `json:"success"`
	Error       string   `json:"error,omitempty"`
	ExtensionID string   `json:"extension_id"`
	Name        string   `json:"name"`
	Developer   string   `json:"developer"`
	Description string   `json:"description"`
	Users       int64    `json:"users"`
	Rating      float64  `json:"rating"`
	ReviewCount int64    `json:"review_count"`
	Keywords    []string `json:"keywords"`
	ScrapedAt   string   `json:"scraped_at"`
}

func NewBrowserClient(baseURL string) *BrowserClient {
	if baseURL == "" {
		baseURL = "http://browser-scraper:8081"
	}

	return &BrowserClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout: 60 * time.Second, // Longer timeout for browser operations
		},
	}
}

// ScrapeExtension scrapes a single extension using the browser scraper service
func (bc *BrowserClient) ScrapeExtension(extensionID string) (*models.Extension, error) {
	return bc.ScrapeExtensionWithTimeout(extensionID, 30)
}

// ScrapeExtensionWithTimeout scrapes with a custom timeout
func (bc *BrowserClient) ScrapeExtensionWithTimeout(extensionID string, timeoutSeconds int) (*models.Extension, error) {
	reqData := BrowserScrapeRequest{
		ExtensionID: extensionID,
		Timeout:     timeoutSeconds,
	}

	jsonData, err := json.Marshal(reqData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := bc.client.Post(bc.baseURL+"/scrape", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to call browser scraper: %w", err)
	}
	defer resp.Body.Close()

	var result BrowserScrapeResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Success {
		return nil, fmt.Errorf("browser scraping failed: %s", result.Error)
	}

	// Convert to models.Extension
	extension := &models.Extension{
		ExtensionID: result.ExtensionID,
		Name:        result.Name,
		Developer:   result.Developer,
		Description: result.Description,
		Users:       result.Users,
		Rating:      result.Rating,
		ReviewCount: result.ReviewCount,
		Keywords:    result.Keywords,
		Category:    "Productivity", // Default category
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Create initial snapshot
	snapshot := models.Snapshot{
		Date:        time.Now(),
		Users:       extension.Users,
		Rating:      extension.Rating,
		ReviewCount: extension.ReviewCount,
	}
	extension.Snapshots = []models.Snapshot{snapshot}

	return extension, nil
}

// HealthCheck checks if the browser scraper service is healthy
func (bc *BrowserClient) HealthCheck() error {
	resp, err := bc.client.Get(bc.baseURL + "/health")
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("health check returned status %d", resp.StatusCode)
	}

	return nil
}