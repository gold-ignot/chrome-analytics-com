package services

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"chrome-analytics-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// BrowserScraper interface defines the methods needed for browser scraping
type BrowserScraper interface {
	ScrapeExtension(extensionID string) (*models.Extension, error)
	ScrapeExtensionWithProxy(extensionID string, proxy *ProxyInfo) (*models.Extension, error)
	HealthCheck() error
}

type Scraper struct {
	db            *mongo.Database
	proxyManager  *ProxyManager
	browserClient BrowserScraper
	concurrency   int // Number of concurrent workers for batch operations
}

func NewScraper(db *mongo.Database) *Scraper {
	// Initialize proxy manager
	proxyManager, err := NewProxyManager("proxies.txt")
	if err != nil {
		log.Printf("Failed to initialize proxy manager: %v, using direct connection", err)
		proxyManager = nil
	}

	// Initialize browser client
	browserClient := NewBrowserClient("")

	return &Scraper{
		db:            db,
		proxyManager:  proxyManager,
		browserClient: browserClient,
		concurrency:   5, // Restored to 5 workers with delays to balance throughput and stability
	}
}

// SetBrowserClient allows overriding the browser client (useful for testing)
func (s *Scraper) SetBrowserClient(client BrowserScraper) {
	s.browserClient = client
}

// ScrapeExtension scrapes a single extension from Chrome Web Store using browser scraper
func (s *Scraper) ScrapeExtension(extensionID string) (*models.Extension, error) {
	var extension *models.Extension
	var err error
	
	if s.proxyManager != nil {
		// Get a random proxy for browser scraping
		proxy, proxyErr := s.proxyManager.GetRandomProxy()
		if proxyErr != nil {
			log.Printf("Failed to get proxy for browser scraping: %v, using direct connection", proxyErr)
			extension, err = s.browserClient.ScrapeExtension(extensionID)
		} else {
			log.Printf("Using proxy %s for browser scraping of %s", proxy.URL, extensionID)
			proxyInfo := &ProxyInfo{
				Host:     proxy.Host,
				Port:     proxy.Port,
				Username: proxy.Username,
				Password: proxy.Password,
			}
			extension, err = s.browserClient.ScrapeExtensionWithProxy(extensionID, proxyInfo)
		}
	} else {
		log.Printf("Scraping %s using browser scraper (no proxy)", extensionID)
		extension, err = s.browserClient.ScrapeExtension(extensionID)
	}
	
	if err != nil {
		return nil, fmt.Errorf("browser scraping failed for %s: %w", extensionID, err)
	}
	
	log.Printf("Successfully scraped %s using browser scraper", extensionID)
	return extension, nil
}



// SaveExtension saves or updates an extension in the database
func (s *Scraper) SaveExtension(extension *models.Extension) error {
	collection := s.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"extensionId": extension.ExtensionID}
	
	// Check if extension already exists
	var existing models.Extension
	err := collection.FindOne(ctx, filter).Decode(&existing)
	
	if err == mongo.ErrNoDocuments {
		// Insert new extension
		_, err = collection.InsertOne(ctx, extension)
		if err != nil {
			return fmt.Errorf("inserting extension: %w", err)
		}
		log.Printf("Inserted new extension: %s", extension.Name)
	} else if err != nil {
		return fmt.Errorf("checking existing extension: %w", err)
	} else {
		// Update existing extension with new snapshot
		existing.UpdatedAt = time.Now()
		existing.Users = extension.Users
		existing.Rating = extension.Rating
		existing.ReviewCount = extension.ReviewCount
		
		// Add new snapshot
		newSnapshot := models.Snapshot{
			Date:        time.Now(),
			Users:       extension.Users,
			Rating:      extension.Rating,
			ReviewCount: extension.ReviewCount,
		}
		existing.Snapshots = append(existing.Snapshots, newSnapshot)

		// Update in database
		update := bson.M{
			"$set": bson.M{
				"updatedAt":   existing.UpdatedAt,
				"users":       existing.Users,
				"rating":      existing.Rating,
				"reviewCount": existing.ReviewCount,
				"snapshots":   existing.Snapshots,
			},
		}

		_, err = collection.UpdateOne(ctx, filter, update)
		if err != nil {
			return fmt.Errorf("updating extension: %w", err)
		}
		log.Printf("Updated existing extension: %s", existing.Name)
	}

	return nil
}

// SetConcurrency sets the number of concurrent workers for batch operations
func (s *Scraper) SetConcurrency(concurrency int) {
	if concurrency > 0 && concurrency <= 20 { // Reasonable limits
		s.concurrency = concurrency
		log.Printf("Scraper concurrency set to %d workers", concurrency)
	}
}

// ScrapeMultiple scrapes multiple extensions concurrently
func (s *Scraper) ScrapeMultiple(extensionIDs []string) error {
	return s.ScrapeMultipleWithConcurrency(extensionIDs, s.concurrency)
}

// ScrapeMultipleWithConcurrency scrapes multiple extensions with specified concurrency
func (s *Scraper) ScrapeMultipleWithConcurrency(extensionIDs []string, maxConcurrency int) error {
	if len(extensionIDs) == 0 {
		return nil
	}

	log.Printf("Starting concurrent scraping of %d extensions with %d workers", len(extensionIDs), maxConcurrency)

	// Create channels for work distribution
	workChan := make(chan string, len(extensionIDs))
	resultChan := make(chan scrapeResult, len(extensionIDs))

	// Start worker goroutines
	for i := 0; i < maxConcurrency; i++ {
		go s.scrapeWorker(workChan, resultChan)
	}

	// Send work to workers
	for _, id := range extensionIDs {
		workChan <- id
	}
	close(workChan)

	// Collect results
	var errors []string
	successCount := 0

	for i := 0; i < len(extensionIDs); i++ {
		result := <-resultChan
		if result.err != nil {
			log.Printf("Error processing %s: %v", result.extensionID, result.err)
			errors = append(errors, fmt.Sprintf("%s: %v", result.extensionID, result.err))
		} else {
			successCount++
			log.Printf("Successfully processed %s", result.extensionID)
		}
	}

	log.Printf("Completed scraping: %d successful, %d failed", successCount, len(errors))

	if len(errors) > 0 {
		return fmt.Errorf("some extensions failed to scrape: %v", errors)
	}
	return nil
}

type scrapeResult struct {
	extensionID string
	err         error
}

// scrapeWorker processes extensions from the work channel
func (s *Scraper) scrapeWorker(workChan <-chan string, resultChan chan<- scrapeResult) {
	for extensionID := range workChan {
		result := scrapeResult{extensionID: extensionID}

		// Add 1-2 second delay to prevent overwhelming the browser-scraper service
		delay := time.Duration(1000+rand.Intn(1000)) * time.Millisecond // 1-2 seconds
		time.Sleep(delay)
		log.Printf("Worker processing %s after %v delay", extensionID, delay)

		extension, err := s.ScrapeExtension(extensionID)
		if err != nil {
			result.err = fmt.Errorf("scraping failed: %w", err)
			resultChan <- result
			continue
		}

		err = s.SaveExtension(extension)
		if err != nil {
			result.err = fmt.Errorf("saving failed: %w", err)
		}

		resultChan <- result
	}
}

// GetProxyStats returns proxy manager statistics
func (s *Scraper) GetProxyStats() map[string]interface{} {
	if s.proxyManager == nil {
		return map[string]interface{}{
			"proxy_enabled": false,
			"message":       "Proxy manager not initialized",
		}
	}

	stats := s.proxyManager.GetProxyStats()
	stats["proxy_enabled"] = true
	return stats
}

// GetScraperStats returns scraper performance statistics
func (s *Scraper) GetScraperStats() map[string]interface{} {
	stats := map[string]interface{}{
		"concurrency_workers": s.concurrency,
		"browser_timeout":     "45s",
		"connection_pooling":  true,
		"optimizations": map[string]interface{}{
			"concurrent_processing": true,
			"connection_reuse":      true,
			"request_delays":        "1-2 seconds",
			"random_jitter":         true,
		},
	}

	// Add browser client metrics if available
	if browserClient, ok := s.browserClient.(*BrowserClient); ok {
		metrics := browserClient.GetMetrics()
		stats["browser_metrics"] = map[string]interface{}{
			"total_requests":     metrics.TotalRequests,
			"successful_scrapes": metrics.SuccessfulScrapes,
			"failed_scrapes":     metrics.FailedScrapes,
			"timeout_errors":     metrics.TimeoutErrors,
			"connection_errors":  metrics.ConnectionErrors,
			"avg_duration":       metrics.TotalDuration.String(),
			"last_error":         metrics.LastError,
			"last_error_time":    metrics.LastErrorTime,
		}
		
		// Calculate success rate
		if metrics.TotalRequests > 0 {
			successRate := float64(metrics.SuccessfulScrapes) / float64(metrics.TotalRequests) * 100
			stats["success_rate"] = fmt.Sprintf("%.1f%%", successRate)
		}
	}

	return stats
}

// PerformHealthCheck checks the health of the browser scraper service
func (s *Scraper) PerformHealthCheck() error {
	return s.browserClient.HealthCheck()
}

// GetDetailedDiagnostics returns detailed diagnostic information
func (s *Scraper) GetDetailedDiagnostics() map[string]interface{} {
	diagnostics := map[string]interface{}{
		"timestamp": time.Now(),
		"scraper_config": map[string]interface{}{
			"concurrency": s.concurrency,
			"proxy_enabled": s.proxyManager != nil,
		},
	}

	// Health check
	healthErr := s.PerformHealthCheck()
	diagnostics["health_check"] = map[string]interface{}{
		"status": healthErr == nil,
		"error":  nil,
	}
	if healthErr != nil {
		diagnostics["health_check"].(map[string]interface{})["error"] = healthErr.Error()
	}

	// Browser metrics
	if browserClient, ok := s.browserClient.(*BrowserClient); ok {
		metrics := browserClient.GetMetrics()
		diagnostics["browser_metrics"] = metrics
		
		// Error analysis
		errorAnalysis := map[string]interface{}{
			"timeout_rate": 0.0,
			"connection_error_rate": 0.0,
			"overall_failure_rate": 0.0,
		}
		
		if metrics.TotalRequests > 0 {
			errorAnalysis["timeout_rate"] = float64(metrics.TimeoutErrors) / float64(metrics.TotalRequests) * 100
			errorAnalysis["connection_error_rate"] = float64(metrics.ConnectionErrors) / float64(metrics.TotalRequests) * 100
			errorAnalysis["overall_failure_rate"] = float64(metrics.FailedScrapes) / float64(metrics.TotalRequests) * 100
		}
		diagnostics["error_analysis"] = errorAnalysis
	}

	// Proxy stats
	if s.proxyManager != nil {
		diagnostics["proxy_stats"] = s.GetProxyStats()
	}

	return diagnostics
}