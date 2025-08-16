package automation

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Scheduler manages automated scheduling of discovery and update jobs
type Scheduler struct {
	queue   *JobQueue
	db      *mongo.Database
	ticker  *time.Ticker
	stopCh  chan struct{}
	running bool
}

// SchedulerConfig configures the scheduler behavior
type SchedulerConfig struct {
	DiscoveryInterval time.Duration // How often to run discovery jobs
	UpdateInterval    time.Duration // How often to schedule update jobs
	MaxJobsPerRun     int           // Maximum jobs to schedule per run
}

// NewScheduler creates a new scheduler instance
func NewScheduler(queue *JobQueue, db *mongo.Database, config SchedulerConfig) *Scheduler {
	if config.DiscoveryInterval == 0 {
		config.DiscoveryInterval = 6 * time.Hour // Default: every 6 hours
	}
	if config.UpdateInterval == 0 {
		config.UpdateInterval = 1 * time.Hour // Default: every hour
	}
	if config.MaxJobsPerRun == 0 {
		config.MaxJobsPerRun = 100 // Default: max 100 jobs per run
	}

	return &Scheduler{
		queue:  queue,
		db:     db,
		ticker: time.NewTicker(config.UpdateInterval),
		stopCh: make(chan struct{}),
	}
}

// Start begins the scheduler
func (s *Scheduler) Start() {
	if s.running {
		log.Println("Scheduler is already running")
		return
	}

	s.running = true
	log.Println("Starting automation scheduler...")

	// Schedule initial discovery jobs
	go s.scheduleInitialDiscovery()

	// Start the main scheduling loop
	go s.run()
}

// Stop stops the scheduler
func (s *Scheduler) Stop() {
	if !s.running {
		return
	}

	log.Println("Stopping automation scheduler...")
	s.running = false
	s.ticker.Stop()
	close(s.stopCh)
}

// run is the main scheduler loop
func (s *Scheduler) run() {
	lastDiscoveryRun := time.Now().Add(-7 * time.Hour) // Force initial discovery
	
	for {
		select {
		case <-s.stopCh:
			log.Println("Scheduler stopped")
			return
		case <-s.ticker.C:
			log.Println("Scheduler tick: checking for jobs to schedule")
			
			// Run discovery jobs every 6 hours
			if time.Since(lastDiscoveryRun) >= 6*time.Hour {
				s.scheduleDiscoveryJobs()
				lastDiscoveryRun = time.Now()
			}
			
			// Always check for update jobs
			s.scheduleUpdateJobs()
		}
	}
}

// scheduleInitialDiscovery schedules the first round of discovery jobs
func (s *Scheduler) scheduleInitialDiscovery() {
	log.Println("Scheduling initial discovery jobs...")

	// Schedule popular extensions discovery (high priority)
	popularJob := &Job{
		Type:     JobTypeDiscovery,
		Priority: PriorityHigh,
		Payload: map[string]interface{}{
			"type": DiscoveryTypePopular,
		},
	}
	
	err := s.queue.EnqueueJob(popularJob)
	if err != nil {
		log.Printf("Failed to schedule popular discovery job: %v", err)
	}

	// Schedule category discovery for main categories
	for _, category := range ChromeStoreCategories[:5] { // Start with top 5 categories
		categoryJob := &Job{
			Type:     JobTypeDiscovery,
			Priority: PriorityMedium,
			Payload: map[string]interface{}{
				"type":     DiscoveryTypeCategory,
				"category": category,
				"page":     1,
				},
		}
		
		err := s.queue.EnqueueJob(categoryJob)
		if err != nil {
			log.Printf("Failed to schedule category discovery job for %s: %v", category, err)
		}
		
		// Small delay between jobs
		time.Sleep(1 * time.Second)
	}

	// Schedule search-based discovery for popular keywords
	for _, keyword := range PopularSearchKeywords[:10] { // Start with top 10 keywords
		searchJob := &Job{
			Type:     JobTypeDiscovery,
			Priority: PriorityLow,
			Payload: map[string]interface{}{
				"type":    DiscoveryTypeSearch,
				"keyword": keyword,
			},
		}
		
		err := s.queue.EnqueueJob(searchJob)
		if err != nil {
			log.Printf("Failed to schedule search discovery job for %s: %v", keyword, err)
		}
		
		time.Sleep(500 * time.Millisecond)
	}

	log.Println("Initial discovery jobs scheduled")
}

// scheduleDiscoveryJobs schedules periodic discovery jobs
func (s *Scheduler) scheduleDiscoveryJobs() {
	log.Println("Scheduling periodic discovery jobs...")

	// Schedule category crawling (rotate through categories)
	currentHour := time.Now().Hour()
	categoryIndex := currentHour % len(ChromeStoreCategories)
	category := ChromeStoreCategories[categoryIndex]
	
	categoryJob := &Job{
		Type:     JobTypeDiscovery,
		Priority: PriorityMedium,
		Payload: map[string]interface{}{
			"type":     DiscoveryTypeCategory,
			"category": category,
			"page":     1,
		},
	}
	
	err := s.queue.EnqueueJob(categoryJob)
	if err != nil {
		log.Printf("Failed to schedule category discovery job: %v", err)
	}

	// Schedule search discovery (rotate through keywords)
	keywordIndex := currentHour % len(PopularSearchKeywords)
	keyword := PopularSearchKeywords[keywordIndex]
	
	searchJob := &Job{
		Type:     JobTypeDiscovery,
		Priority: PriorityLow,
		Payload: map[string]interface{}{
			"type":    DiscoveryTypeSearch,
			"keyword": keyword,
			"queue":   s.queue,
		},
	}
	
	err = s.queue.EnqueueJob(searchJob)
	if err != nil {
		log.Printf("Failed to schedule search discovery job: %v", err)
	}

	// Schedule related discovery for popular extensions (once per day)
	if currentHour == 2 { // Run at 2 AM
		s.scheduleRelatedDiscovery()
	}
}

// scheduleUpdateJobs schedules update jobs based on priority and frequency
func (s *Scheduler) scheduleUpdateJobs() {
	log.Println("Scheduling update jobs...")

	// Get extensions that need updates
	extensionsToUpdate := s.getExtensionsNeedingUpdate()
	
	jobsScheduled := 0
	maxJobs := 50 // Limit jobs per run to avoid overwhelming the system
	
	for _, ext := range extensionsToUpdate {
		if jobsScheduled >= maxJobs {
			break
		}
		
		priority := s.determineUpdatePriority(ext)
		
		updateJob := &Job{
			Type:     JobTypeUpdate,
			Priority: priority,
			Payload: map[string]interface{}{
				"extension_id": ext.ExtensionID,
				"source":       "scheduled_update",
			},
		}
		
		err := s.queue.EnqueueJob(updateJob)
		if err != nil {
			log.Printf("Failed to schedule update job for %s: %v", ext.ExtensionID, err)
			continue
		}
		
		jobsScheduled++
	}
	
	log.Printf("Scheduled %d update jobs", jobsScheduled)
}

// scheduleRelatedDiscovery schedules related extension discovery for popular extensions
func (s *Scheduler) scheduleRelatedDiscovery() {
	log.Println("Scheduling related discovery jobs...")

	// Find popular extensions (1M+ users) for related discovery
	collection := s.db.Collection("extensions")
	
	cursor, err := collection.Find(context.TODO(), bson.M{
		"users": bson.M{"$gte": 1000000},
	}, options.Find().SetLimit(20).SetSort(bson.M{"users": -1}))
	
	if err != nil {
		log.Printf("Failed to query popular extensions: %v", err)
		return
	}
	defer cursor.Close(context.TODO())
	
	relatedJobsScheduled := 0
	
	for cursor.Next(context.TODO()) {
		var ext struct {
			ExtensionID string `bson:"extensionId"`
		}
		
		if err := cursor.Decode(&ext); err != nil {
			continue
		}
		
		relatedJob := &Job{
			Type:     JobTypeDiscovery,
			Priority: PriorityLow,
			Payload: map[string]interface{}{
				"type":         DiscoveryTypeRelated,
				"extension_id": ext.ExtensionID,
			},
		}
		
		err := s.queue.EnqueueJob(relatedJob)
		if err != nil {
			log.Printf("Failed to schedule related discovery for %s: %v", ext.ExtensionID, err)
			continue
		}
		
		relatedJobsScheduled++
		
		// Small delay between jobs
		time.Sleep(200 * time.Millisecond)
	}
	
	log.Printf("Scheduled %d related discovery jobs", relatedJobsScheduled)
}

// ExtensionUpdateInfo represents extension info for update scheduling
type ExtensionUpdateInfo struct {
	ExtensionID  string    `bson:"extensionId"`
	Users        int       `bson:"users"`
	UpdatedAt    time.Time `bson:"updatedAt"`
	LastSnapshot time.Time `bson:"lastSnapshot"`
}

// getExtensionsNeedingUpdate returns extensions that need to be updated
func (s *Scheduler) getExtensionsNeedingUpdate() []ExtensionUpdateInfo {
	collection := s.db.Collection("extensions")
	
	now := time.Now()
	
	// Define update intervals based on user count
	highPriorityAge := 24 * time.Hour   // 1M+ users: daily
	mediumPriorityAge := 7 * 24 * time.Hour  // 100K-1M users: weekly
	lowPriorityAge := 30 * 24 * time.Hour    // <100K users: monthly
	
	// Build aggregation pipeline to find extensions needing updates
	pipeline := []bson.M{
		{
			"$addFields": bson.M{
				"lastSnapshot": bson.M{
					"$arrayElemAt": []interface{}{"$snapshots.date", -1},
				},
			},
		},
		{
			"$match": bson.M{
				"$or": []bson.M{
					// High priority: 1M+ users updated more than 24h ago
					{
						"users": bson.M{"$gte": 1000000},
						"updatedAt": bson.M{"$lt": now.Add(-highPriorityAge)},
					},
					// Medium priority: 100K-1M users updated more than 7 days ago
					{
						"users": bson.M{"$gte": 100000, "$lt": 1000000},
						"updatedAt": bson.M{"$lt": now.Add(-mediumPriorityAge)},
					},
					// Low priority: <100K users updated more than 30 days ago
					{
						"users": bson.M{"$lt": 100000},
						"updatedAt": bson.M{"$lt": now.Add(-lowPriorityAge)},
					},
				},
			},
		},
		{
			"$project": bson.M{
				"extensionId": 1,
				"users":       1,
				"updatedAt":   1,
				"lastSnapshot": 1,
			},
		},
		{
			"$sort": bson.M{
				"users": -1, // Prioritize by user count
			},
		},
		{
			"$limit": 100, // Limit to prevent overwhelming
		},
	}
	
	cursor, err := collection.Aggregate(context.TODO(), pipeline)
	if err != nil {
		log.Printf("Failed to query extensions needing update: %v", err)
		return nil
	}
	defer cursor.Close(context.TODO())
	
	var extensions []ExtensionUpdateInfo
	for cursor.Next(context.TODO()) {
		var ext ExtensionUpdateInfo
		if err := cursor.Decode(&ext); err != nil {
			log.Printf("Failed to decode extension: %v", err)
			continue
		}
		extensions = append(extensions, ext)
	}
	
	log.Printf("Found %d extensions needing updates", len(extensions))
	return extensions
}

// determineUpdatePriority determines the priority for an update job
func (s *Scheduler) determineUpdatePriority(ext ExtensionUpdateInfo) Priority {
	if ext.Users >= 1000000 {
		return PriorityHigh
	} else if ext.Users >= 100000 {
		return PriorityMedium
	}
	return PriorityLow
}

// GetSchedulerStats returns scheduler statistics
func (s *Scheduler) GetSchedulerStats() map[string]interface{} {
	queueStats, _ := s.queue.GetQueueStats()
	
	return map[string]interface{}{
		"running":      s.running,
		"queue_stats":  queueStats,
		"last_checked": time.Now(),
	}
}