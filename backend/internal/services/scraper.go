package services

import (
	"context"
	"fmt"
	"log"
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

// ScrapeMultiple scrapes multiple extensions
func (s *Scraper) ScrapeMultiple(extensionIDs []string) error {
	for i, id := range extensionIDs {
		log.Printf("Scraping extension %d/%d: %s", i+1, len(extensionIDs), id)
		
		extension, err := s.ScrapeExtension(id)
		if err != nil {
			log.Printf("Error scraping %s: %v", id, err)
			continue
		}

		err = s.SaveExtension(extension)
		if err != nil {
			log.Printf("Error saving %s: %v", id, err)
			continue
		}

		// Add delay to avoid being blocked
		if i < len(extensionIDs)-1 {
			time.Sleep(2 * time.Second)
		}
	}

	return nil
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