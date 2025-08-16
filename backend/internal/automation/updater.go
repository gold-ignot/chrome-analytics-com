package automation

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"

	"chrome-analytics-backend/internal/models"
	"chrome-analytics-backend/internal/services"
)

// UpdateHandler handles extension update jobs
type UpdateHandler struct {
	db      *mongo.Database
	scraper *services.Scraper
}

// NewUpdateHandler creates a new update handler
func NewUpdateHandler(db *mongo.Database) *UpdateHandler {
	scraper := services.NewScraper(db)

	return &UpdateHandler{
		db:      db,
		scraper: scraper,
	}
}

// HandleJob processes an update job
func (uh *UpdateHandler) HandleJob(job *Job, queue *JobQueue) error {
	extensionID, ok := job.Payload["extension_id"].(string)
	if !ok {
		return fmt.Errorf("extension_id not specified in job payload")
	}

	log.Printf("Updating extension: %s", extensionID)

	// Scrape extension data using browser scraper
	extensionData, err := uh.scraper.ScrapeExtension(extensionID)
	if err != nil {
		return fmt.Errorf("failed to scrape extension %s: %w", extensionID, err)
	}

	// Validate scraped data before storing
	if !uh.isValidExtensionData(extensionData) {
		return fmt.Errorf("scraped data for extension %s is invalid or incomplete - skipping storage", extensionID)
	}

	// Check if extension already exists
	collection := uh.db.Collection("extensions")

	var existingExtension models.Extension
	err = collection.FindOne(context.TODO(), bson.M{"extensionId": extensionID}).Decode(&existingExtension)

	if err == mongo.ErrNoDocuments {
		// New extension - create it
		newExtension := models.Extension{
			ExtensionID: extensionData.ExtensionID,
			Name:        extensionData.Name,
			Description: extensionData.Description,
			Category:    extensionData.Category,
			Developer:   extensionData.Developer,
			Users:       extensionData.Users,
			Rating:      extensionData.Rating,
			ReviewCount: extensionData.ReviewCount,
			Keywords:    extensionData.Keywords,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
			Snapshots: []models.Snapshot{
				{
					Date:        time.Now(),
					Users:       extensionData.Users,
					Rating:      extensionData.Rating,
					ReviewCount: extensionData.ReviewCount,
				},
			},
		}

		_, err = collection.InsertOne(context.TODO(), newExtension)
		if err != nil {
			return fmt.Errorf("failed to insert new extension: %w", err)
		}

		log.Printf("Created new extension: %s (%s)", extensionData.Name, extensionID)

		// Add related discovery job if this is a new popular extension
		if extensionData.Users > 100000 {
			uh.scheduleRelatedDiscovery(job, extensionID, queue)
		}

	} else if err != nil {
		return fmt.Errorf("failed to check existing extension: %w", err)
	} else {
		// Existing extension - update with new snapshot
		hasSignificantChange := uh.hasSignificantChange(existingExtension, extensionData)

		// Create new snapshot
		newSnapshot := models.Snapshot{
			Date:        time.Now(),
			Users:       extensionData.Users,
			Rating:      extensionData.Rating,
			ReviewCount: extensionData.ReviewCount,
		}

		// Update extension
		update := bson.M{
			"$set": bson.M{
				"name":        extensionData.Name,
				"description": extensionData.Description,
				"category":    extensionData.Category,
				"developer":   extensionData.Developer,
				"users":       extensionData.Users,
				"rating":      extensionData.Rating,
				"reviewCount": extensionData.ReviewCount,
				"keywords":    extensionData.Keywords,
				"updatedAt":   time.Now(),
			},
			"$push": bson.M{
				"snapshots": bson.M{
					"$each":  []models.Snapshot{newSnapshot},
					"$slice": -100, // Keep only last 100 snapshots
				},
			},
		}

		_, err = collection.UpdateOne(
			context.TODO(),
			bson.M{"extensionId": extensionID},
			update,
		)
		if err != nil {
			return fmt.Errorf("failed to update extension: %w", err)
		}

		log.Printf("Updated extension: %s (%s)", extensionData.Name, extensionID)

		// Schedule priority updates if there are significant changes
		if hasSignificantChange {
			uh.schedulePriorityUpdate(job, extensionID, extensionData, queue)
		}
	}

	// Update extension priority for future updates
	uh.updateExtensionPriority(extensionID, extensionData)

	return nil
}

// GetJobType returns the job type this handler processes
func (uh *UpdateHandler) GetJobType() JobType {
	return JobTypeUpdate
}

// hasSignificantChange checks if there are significant changes in the extension data
func (uh *UpdateHandler) hasSignificantChange(existing models.Extension, new *models.Extension) bool {
	if len(existing.Snapshots) == 0 {
		return false
	}

	latest := existing.Snapshots[len(existing.Snapshots)-1]

	// Check for significant user growth (>10% or >10k users)
	userGrowth := float64(new.Users-latest.Users) / float64(latest.Users)
	if userGrowth > 0.1 || (new.Users-latest.Users) > 10000 {
		return true
	}

	// Check for significant rating change (>0.2 points)
	ratingChange := new.Rating - latest.Rating
	if ratingChange > 0.2 || ratingChange < -0.2 {
		return true
	}

	// Check for significant review growth (>20% or >100 reviews)
	if latest.ReviewCount > 0 {
		reviewGrowth := float64(new.ReviewCount-latest.ReviewCount) / float64(latest.ReviewCount)
		if reviewGrowth > 0.2 || (new.ReviewCount-latest.ReviewCount) > 100 {
			return true
		}
	}

	return false
}

// updateExtensionPriority updates the priority scheduling for an extension
func (uh *UpdateHandler) updateExtensionPriority(extensionID string, data *models.Extension) {
	// This would be implemented to update a scheduling collection
	// For now, we'll just log the priority determination

	priority := uh.determineUpdatePriority(data)
	frequency := uh.determineUpdateFrequency(data)

	log.Printf("Extension %s assigned priority %s with frequency %s",
		extensionID, priority, frequency)

	// TODO: Update scheduling collection in MongoDB
	// collection := uh.db.Collection("update_schedule")
	// ... implement scheduling logic
}

// determineUpdatePriority determines the update priority based on extension data
func (uh *UpdateHandler) determineUpdatePriority(data *models.Extension) Priority {
	// High priority: 1M+ users or recently trending
	if data.Users >= 1000000 {
		return PriorityHigh
	}

	// Medium priority: 100K-1M users
	if data.Users >= 100000 {
		return PriorityMedium
	}

	// Low priority: <100K users
	return PriorityLow
}

// determineUpdateFrequency determines how often an extension should be updated
func (uh *UpdateHandler) determineUpdateFrequency(data *models.Extension) string {
	if data.Users >= 1000000 {
		return "daily"
	} else if data.Users >= 100000 {
		return "weekly"
	} else {
		return "monthly"
	}
}

// scheduleRelatedDiscovery schedules a job to discover related extensions
func (uh *UpdateHandler) scheduleRelatedDiscovery(parentJob *Job, extensionID string, queue *JobQueue) {
	relatedJob := &Job{
		Type:     JobTypeDiscovery,
		Priority: PriorityLow,
		Payload: map[string]interface{}{
			"type":         DiscoveryTypeRelated,
			"extension_id": extensionID,
		},
	}

	err := queue.EnqueueJob(relatedJob)
	if err != nil {
		log.Printf("Failed to schedule related discovery for %s: %v", extensionID, err)
	} else {
		log.Printf("Scheduled related discovery for popular extension: %s", extensionID)
	}
}

// schedulePriorityUpdate schedules a priority update for trending extensions
func (uh *UpdateHandler) schedulePriorityUpdate(parentJob *Job, extensionID string, data *models.Extension, queue *JobQueue) {
	// Schedule a follow-up update sooner for trending extensions
	priorityJob := &Job{
		Type:     JobTypeUpdate,
		Priority: PriorityHigh,
		Payload: map[string]interface{}{
			"extension_id": extensionID,
			"source":       "priority_update",
			"reason":       "significant_change",
		},
	}

	err := queue.EnqueueJob(priorityJob)
	if err != nil {
		log.Printf("Failed to schedule priority update for %s: %v", extensionID, err)
	} else {
		log.Printf("Scheduled priority update for trending extension: %s", extensionID)
	}
}

// isValidExtensionData validates that scraped extension data is complete and usable
func (uh *UpdateHandler) isValidExtensionData(extension *models.Extension) bool {
	// Check required fields
	if extension.ExtensionID == "" {
		log.Printf("Extension validation failed: missing extension ID")
		return false
	}

	if extension.Name == "" {
		log.Printf("Extension validation failed: missing name for %s", extension.ExtensionID)
		return false
	}

	// Name should be reasonable length (not just whitespace or single chars)
	if len(strings.TrimSpace(extension.Name)) < 2 {
		log.Printf("Extension validation failed: name too short for %s: '%s'", extension.ExtensionID, extension.Name)
		return false
	}

	// Users count should be reasonable (extensions typically have at least some users)
	if extension.Users < 0 {
		log.Printf("Extension validation failed: negative user count for %s: %d", extension.ExtensionID, extension.Users)
		return false
	}

	// Rating should be valid range (0-5 stars, or 0 if no ratings)
	if extension.Rating < 0 || extension.Rating > 5 {
		log.Printf("Extension validation failed: invalid rating for %s: %f", extension.ExtensionID, extension.Rating)
		return false
	}

	// Review count should not be negative
	if extension.ReviewCount < 0 {
		log.Printf("Extension validation failed: negative review count for %s: %d", extension.ExtensionID, extension.ReviewCount)
		return false
	}

	// If it has a rating > 0, it should have some reviews (basic consistency check)
	if extension.Rating > 0 && extension.ReviewCount == 0 && extension.Users > 1000 {
		log.Printf("Extension validation warning: has rating but no reviews for %s (rating: %f, reviews: %d, users: %d)",
			extension.ExtensionID, extension.Rating, extension.ReviewCount, extension.Users)
		// This is just a warning, not a failure
	}

	log.Printf("Extension data validated successfully for %s: name='%s', users=%d, rating=%.1f",
		extension.ExtensionID, extension.Name, extension.Users, extension.Rating)
	return true
}

// CleanupInvalidExtensions removes invalid extension records from the database
func (uh *UpdateHandler) CleanupInvalidExtensions() error {
	collection := uh.db.Collection("extensions")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Find extensions with invalid data
	filter := bson.M{
		"$or": []bson.M{
			{"name": ""},
			{"name": bson.M{"$exists": false}},
			{"extensionId": ""},
			{"extensionId": bson.M{"$exists": false}},
			{"users": bson.M{"$lt": 0}},
			{"rating": bson.M{"$lt": 0}},
			{"rating": bson.M{"$gt": 5}},
			{"reviewCount": bson.M{"$lt": 0}},
		},
	}

	// First, count how many invalid records exist
	count, err := collection.CountDocuments(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to count invalid extensions: %w", err)
	}

	if count == 0 {
		log.Printf("No invalid extensions found")
		return nil
	}

	log.Printf("Found %d invalid extensions to clean up", count)

	// Delete invalid records
	result, err := collection.DeleteMany(ctx, filter)
	if err != nil {
		return fmt.Errorf("failed to delete invalid extensions: %w", err)
	}

	log.Printf("Successfully cleaned up %d invalid extension records", result.DeletedCount)
	return nil
}

// GetProxyStats returns proxy statistics from the scraper
func (uh *UpdateHandler) GetProxyStats() map[string]interface{} {
	return uh.scraper.GetProxyStats()
}

// GetScraperDiagnostics returns detailed scraper diagnostics
func (uh *UpdateHandler) GetScraperDiagnostics() map[string]interface{} {
	return uh.scraper.GetDetailedDiagnostics()
}

// GetUpdateStats returns statistics about the update process
func (uh *UpdateHandler) GetUpdateStats() map[string]interface{} {
	collection := uh.db.Collection("extensions")

	// Count total extensions
	totalExtensions, _ := collection.CountDocuments(context.TODO(), bson.M{})

	// Count extensions updated in last 24 hours
	yesterday := time.Now().AddDate(0, 0, -1)
	recentlyUpdated, _ := collection.CountDocuments(context.TODO(), bson.M{
		"updatedAt": bson.M{"$gte": yesterday},
	})

	// Count extensions by user range
	pipeline := []bson.M{
		{
			"$group": bson.M{
				"_id": bson.M{
					"$switch": bson.M{
						"branches": []bson.M{
							{
								"case": bson.M{"$gte": []interface{}{"$users", 1000000}},
								"then": "1M+",
							},
							{
								"case": bson.M{"$gte": []interface{}{"$users", 100000}},
								"then": "100K-1M",
							},
							{
								"case": bson.M{"$gte": []interface{}{"$users", 10000}},
								"then": "10K-100K",
							},
						},
						"default": "<10K",
					},
				},
				"count": bson.M{"$sum": 1},
			},
		},
	}

	cursor, err := collection.Aggregate(context.TODO(), pipeline)
	userRanges := make(map[string]int)
	if err == nil {
		defer cursor.Close(context.TODO())
		for cursor.Next(context.TODO()) {
			var result struct {
				ID    string `bson:"_id"`
				Count int    `bson:"count"`
			}
			if err := cursor.Decode(&result); err == nil {
				userRanges[result.ID] = result.Count
			}
		}
	}

	return map[string]interface{}{
		"total_extensions":    totalExtensions,
		"recently_updated":    recentlyUpdated,
		"extensions_by_users": userRanges,
		"last_updated":        time.Now(),
	}
}
