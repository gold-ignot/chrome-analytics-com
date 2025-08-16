package services

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"

	"chrome-analytics-backend/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

// ExtensionScraper interface defines the methods needed for extension scraping
type ExtensionScraper interface {
	ScrapeExtension(extensionID string) (*models.Extension, error)
	ScrapeExtensionWithProxy(extensionID string, proxy *ProxyInfo) (*models.Extension, error)
	HealthCheck() error
	GetMetrics() interface{}
}

type Scraper struct {
	db               *mongo.Database
	standaloneScraper *StandaloneScraper
	concurrency      int // Number of concurrent workers for batch operations
}

func NewScraper(db *mongo.Database) *Scraper {
	// Load proxies from proxies.txt
	proxies, err := loadProxiesFromFile("proxies.txt")
	if err != nil {
		log.Printf("Failed to load proxies from proxies.txt: %v, using direct connection", err)
		// Use standalone scraper without proxies
		standaloneScraper := NewStandaloneScraper()
		return &Scraper{
			db:               db,
			standaloneScraper: standaloneScraper,
			concurrency:      10, // Increased from 5 since standalone scraper is much faster
		}
	}

	log.Printf("✅ Loaded %d proxies for standalone scraper", len(proxies))
	standaloneScraper := NewStandaloneScraperWithProxies(proxies)

	return &Scraper{
		db:               db,
		standaloneScraper: standaloneScraper,
		concurrency:      10, // Increased concurrency for faster standalone scraper
	}
}

// SetStandaloneScraper allows overriding the standalone scraper (useful for testing)
func (s *Scraper) SetStandaloneScraper(scraper *StandaloneScraper) {
	s.standaloneScraper = scraper
}

// ScrapeExtension scrapes a single extension from Chrome Web Store using standalone scraper
func (s *Scraper) ScrapeExtension(extensionID string) (*models.Extension, error) {
	log.Printf("Scraping %s using standalone scraper", extensionID)
	
	// Use the standalone scraper (automatically handles proxy rotation if available)
	extension, err := s.standaloneScraper.ScrapeExtension(extensionID)
	if err != nil {
		return nil, fmt.Errorf("standalone scraping failed for %s: %w", extensionID, err)
	}
	
	log.Printf("Successfully scraped %s using standalone scraper: %s (%d users)", 
		extensionID, extension.Name, extension.Users)
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

		// Minimal delay for standalone scraper (much faster than browser scraper)
		delay := time.Duration(200+rand.Intn(300)) * time.Millisecond // 200-500ms
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

// GetProxyStats returns proxy statistics from standalone scraper
func (s *Scraper) GetProxyStats() map[string]interface{} {
	if s.standaloneScraper == nil {
		return map[string]interface{}{
			"proxy_enabled": false,
			"message":       "Standalone scraper not initialized",
		}
	}

	stats := s.standaloneScraper.GetProxyStats()
	if stats == nil || len(stats) == 0 {
		return map[string]interface{}{
			"proxy_enabled": false,
			"message":       "No proxy support in standalone scraper",
		}
	}

	stats["proxy_enabled"] = true
	return stats
}

// GetScraperStats returns scraper performance statistics
func (s *Scraper) GetScraperStats() map[string]interface{} {
	stats := map[string]interface{}{
		"scraper_type":        "standalone",
		"concurrency_workers": s.concurrency,
		"http_timeout":        "10s",
		"connection_pooling":  true,
		"optimizations": map[string]interface{}{
			"concurrent_processing": true,
			"connection_reuse":      true,
			"request_delays":        "200-500ms",
			"random_jitter":         true,
			"gzip_compression":      true,
			"regex_parsing":         true,
		},
	}

	// Add standalone scraper metrics if available
	if s.standaloneScraper != nil {
		metrics := s.standaloneScraper.GetMetrics()
		stats["standalone_metrics"] = map[string]interface{}{
			"total_requests":     metrics.TotalRequests,
			"successful_scrapes": metrics.SuccessfulScrapes,
			"failed_scrapes":     metrics.FailedScrapes,
			"connection_errors":  metrics.ConnectionErrors,
			"avg_duration":       metrics.TotalDuration.String(),
		}
		
		// Calculate success rate
		if metrics.TotalRequests > 0 {
			successRate := float64(metrics.SuccessfulScrapes) / float64(metrics.TotalRequests) * 100
			stats["success_rate"] = fmt.Sprintf("%.1f%%", successRate)
		}
		
		// Add proxy stats if available
		proxyStats := s.standaloneScraper.GetProxyStats()
		if proxyStats != nil && len(proxyStats) > 0 {
			stats["proxy_integration"] = true
			stats["proxy_stats"] = proxyStats
		} else {
			stats["proxy_integration"] = false
		}
	}

	return stats
}

// PerformHealthCheck checks the health of the standalone scraper
func (s *Scraper) PerformHealthCheck() error {
	if s.standaloneScraper == nil {
		return fmt.Errorf("standalone scraper not initialized")
	}
	
	// Test with a simple extension ID to verify scraper is working
	testExtensionID := "cjpalhdlnbpafiamejdnhcphjbkeiagm" // uBlock Origin
	_, err := s.standaloneScraper.ScrapeExtensionDirectly(testExtensionID)
	if err != nil {
		return fmt.Errorf("health check failed: %w", err)
	}
	
	log.Printf("HEALTH CHECK OK: Standalone scraper is working")
	return nil
}

// GetDetailedDiagnostics returns detailed diagnostic information
func (s *Scraper) GetDetailedDiagnostics() map[string]interface{} {
	diagnostics := map[string]interface{}{
		"timestamp": time.Now(),
		"scraper_config": map[string]interface{}{
			"type":        "standalone",
			"concurrency": s.concurrency,
			"proxy_enabled": s.standaloneScraper != nil && len(s.standaloneScraper.GetProxyStats()) > 0,
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

	// Standalone scraper metrics
	if s.standaloneScraper != nil {
		metrics := s.standaloneScraper.GetMetrics()
		diagnostics["standalone_metrics"] = metrics
		
		// Error analysis
		errorAnalysis := map[string]interface{}{
			"connection_error_rate": 0.0,
			"overall_failure_rate": 0.0,
		}
		
		if metrics.TotalRequests > 0 {
			errorAnalysis["connection_error_rate"] = float64(metrics.ConnectionErrors) / float64(metrics.TotalRequests) * 100
			errorAnalysis["overall_failure_rate"] = float64(metrics.FailedScrapes) / float64(metrics.TotalRequests) * 100
		}
		diagnostics["error_analysis"] = errorAnalysis
		
		// Proxy stats
		proxyStats := s.standaloneScraper.GetProxyStats()
		if proxyStats != nil && len(proxyStats) > 0 {
			diagnostics["proxy_stats"] = proxyStats
		}
	}

	return diagnostics
}

// loadProxiesFromFile loads proxy configurations from a file
func loadProxiesFromFile(filename string) ([]ProxyConfig, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open %s: %w", filename, err)
	}
	defer file.Close()

	var proxies []ProxyConfig
	scanner := bufio.NewScanner(file)
	
	lineNum := 0
	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse format: host:port:username:password
		parts := strings.Split(line, ":")
		if len(parts) != 4 {
			log.Printf("⚠️  Skipping invalid proxy line %d: %s", lineNum, line)
			continue
		}

		proxy := ProxyConfig{
			Host:     parts[0],
			Port:     parts[1],
			Username: parts[2],
			Password: parts[3],
		}
		
		proxies = append(proxies, proxy)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading file: %w", err)
	}

	return proxies, nil
}