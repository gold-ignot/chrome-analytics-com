package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/mongo"

	"chrome-analytics-backend/internal/automation"
)

// AutomationHandler handles automation-related API endpoints
type AutomationHandler struct {
	db           *mongo.Database
	queue        *automation.JobQueue
	workerPool   *automation.WorkerPool
	scheduler    *automation.Scheduler
	discoveryHandler *automation.DiscoveryHandler
	updateHandler    *automation.UpdateHandler
	isRunning    bool
}

// NewAutomationHandler creates a new automation handler
func NewAutomationHandler(db *mongo.Database, redisURL string) (*AutomationHandler, error) {
	// Initialize job queue
	queue, err := automation.NewJobQueue(redisURL)
	if err != nil {
		return nil, err
	}

	// Initialize handlers
	discoveryHandler := automation.NewDiscoveryHandler(db)
	updateHandler := automation.NewUpdateHandler(db)

	// Initialize worker pool
	config := automation.DefaultWorkerPoolConfig()
	workerPool := automation.NewWorkerPool(queue, config)

	// Initialize scheduler
	schedulerConfig := automation.SchedulerConfig{
		DiscoveryInterval: 0, // Use defaults
		UpdateInterval:    0, // Use defaults
		MaxJobsPerRun:     100,
	}
	scheduler := automation.NewScheduler(queue, db, schedulerConfig)

	return &AutomationHandler{
		db:               db,
		queue:            queue,
		workerPool:       workerPool,
		scheduler:        scheduler,
		discoveryHandler: discoveryHandler,
		updateHandler:    updateHandler,
		isRunning:        false,
	}, nil
}

// StartAutomation starts the automation system
func (ah *AutomationHandler) StartAutomation(c *gin.Context) {
	if ah.isRunning {
		c.JSON(http.StatusOK, gin.H{
			"message": "Automation system is already running",
			"status":  "running",
		})
		return
	}

	// Create handler map
	handlers := map[automation.JobType]automation.JobHandler{
		automation.JobTypeDiscovery: ah.discoveryHandler,
		automation.JobTypeUpdate:    ah.updateHandler,
	}

	// Start worker pool
	ah.workerPool.Start(handlers)

	// Start scheduler
	ah.scheduler.Start()

	ah.isRunning = true

	c.JSON(http.StatusOK, gin.H{
		"message": "Automation system started successfully",
		"status":  "running",
	})
}

// StopAutomation stops the automation system
func (ah *AutomationHandler) StopAutomation(c *gin.Context) {
	if !ah.isRunning {
		c.JSON(http.StatusOK, gin.H{
			"message": "Automation system is not running",
			"status":  "stopped",
		})
		return
	}

	// Stop scheduler
	ah.scheduler.Stop()

	// Stop worker pool
	ah.workerPool.Stop()

	ah.isRunning = false

	c.JSON(http.StatusOK, gin.H{
		"message": "Automation system stopped successfully",
		"status":  "stopped",
	})
}

// GetAutomationStatus returns the current status of the automation system
func (ah *AutomationHandler) GetAutomationStatus(c *gin.Context) {
	workerStats := ah.workerPool.GetStats()
	schedulerStats := ah.scheduler.GetSchedulerStats()
	updateStats := ah.updateHandler.GetUpdateStats()

	c.JSON(http.StatusOK, gin.H{
		"status":          map[string]interface{}{"running": ah.isRunning},
		"worker_stats":    workerStats,
		"scheduler_stats": schedulerStats,
		"update_stats":    updateStats,
	})
}

// ScheduleDiscoveryJob manually schedules a discovery job
func (ah *AutomationHandler) ScheduleDiscoveryJob(c *gin.Context) {
	var request struct {
		Type     string `json:"type" binding:"required"`
		Category string `json:"category,omitempty"`
		Keyword  string `json:"keyword,omitempty"`
		ExtensionID string `json:"extension_id,omitempty"`
		Priority string `json:"priority,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Determine priority
	priority := automation.PriorityMedium
	if request.Priority != "" {
		switch request.Priority {
		case "high":
			priority = automation.PriorityHigh
		case "low":
			priority = automation.PriorityLow
		}
	}

	// Create job payload
	payload := map[string]interface{}{
		"type":  request.Type,
	}

	switch request.Type {
	case automation.DiscoveryTypeCategory:
		if request.Category == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "category is required for category discovery"})
			return
		}
		payload["category"] = request.Category
		payload["page"] = 1

	case automation.DiscoveryTypeSearch:
		if request.Keyword == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "keyword is required for search discovery"})
			return
		}
		payload["keyword"] = request.Keyword

	case automation.DiscoveryTypeRelated:
		if request.ExtensionID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "extension_id is required for related discovery"})
			return
		}
		payload["extension_id"] = request.ExtensionID

	case automation.DiscoveryTypePopular:
		// No additional parameters needed

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid discovery type"})
		return
	}

	// Create and enqueue job
	job := &automation.Job{
		Type:     automation.JobTypeDiscovery,
		Priority: priority,
		Payload:  payload,
	}

	err := ah.queue.EnqueueJob(job)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule discovery job: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Discovery job scheduled successfully",
		"job_id":  job.ID,
		"type":    request.Type,
	})
}

// ScheduleUpdateJob manually schedules an update job for a specific extension
func (ah *AutomationHandler) ScheduleUpdateJob(c *gin.Context) {
	extensionID := c.Param("extensionId")
	if extensionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Extension ID is required"})
		return
	}

	// Get priority from query parameter
	priorityStr := c.DefaultQuery("priority", "medium")
	priority := automation.PriorityMedium
	switch priorityStr {
	case "high":
		priority = automation.PriorityHigh
	case "low":
		priority = automation.PriorityLow
	}

	// Create and enqueue job
	job := &automation.Job{
		Type:     automation.JobTypeUpdate,
		Priority: priority,
		Payload: map[string]interface{}{
			"extension_id": extensionID,
			"source":       "manual_request",
		},
	}

	err := ah.queue.EnqueueJob(job)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule update job: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Update job scheduled successfully",
		"job_id":       job.ID,
		"extension_id": extensionID,
	})
}

// GetQueueStats returns detailed queue statistics
func (ah *AutomationHandler) GetQueueStats(c *gin.Context) {
	stats, err := ah.queue.GetQueueStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get queue stats: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"queue_stats": stats,
	})
}

// GetCompletedJobsStats returns statistics about completed jobs
func (ah *AutomationHandler) GetCompletedJobsStats(c *gin.Context) {
	stats, err := ah.queue.GetCompletedJobsStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get completed jobs stats: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetJobDetails returns details for a specific job
func (ah *AutomationHandler) GetJobDetails(c *gin.Context) {
	jobID := c.Param("jobId")
	if jobID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job ID is required"})
		return
	}

	job, err := ah.queue.GetJob(jobID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Job not found: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"job": job,
	})
}

// BulkScheduleUpdates schedules update jobs for multiple extensions
func (ah *AutomationHandler) BulkScheduleUpdates(c *gin.Context) {
	var request struct {
		ExtensionIDs []string `json:"extension_ids" binding:"required"`
		Priority     string   `json:"priority,omitempty"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(request.ExtensionIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one extension ID is required"})
		return
	}

	// Limit bulk operations
	if len(request.ExtensionIDs) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum 100 extensions can be updated at once"})
		return
	}

	// Determine priority
	priority := automation.PriorityMedium
	if request.Priority != "" {
		switch request.Priority {
		case "high":
			priority = automation.PriorityHigh
		case "low":
			priority = automation.PriorityLow
		}
	}

	// Schedule jobs
	jobIDs := make([]string, 0, len(request.ExtensionIDs))
	for _, extensionID := range request.ExtensionIDs {
		job := &automation.Job{
			Type:     automation.JobTypeUpdate,
			Priority: priority,
			Payload: map[string]interface{}{
				"extension_id": extensionID,
				"source":       "bulk_update",
				},
		}

		err := ah.queue.EnqueueJob(job)
		if err != nil {
			// Log error but continue with other jobs
			continue
		}

		jobIDs = append(jobIDs, job.ID)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Bulk update jobs scheduled",
		"scheduled_jobs": len(jobIDs),
		"total_requested": len(request.ExtensionIDs),
		"job_ids":        jobIDs,
	})
}

// GetAvailableCategories returns the list of available Chrome Web Store categories
func (ah *AutomationHandler) GetAvailableCategories(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"categories": automation.ChromeStoreCategories,
	})
}

// GetPopularKeywords returns the list of popular search keywords
func (ah *AutomationHandler) GetPopularKeywords(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"keywords": automation.PopularSearchKeywords,
	})
}

// GetProxyStats returns proxy statistics
func (ah *AutomationHandler) GetProxyStats(c *gin.Context) {
	stats := ah.updateHandler.GetProxyStats()
	c.JSON(http.StatusOK, gin.H{
		"proxy_stats": stats,
	})
}

// CleanupInvalidExtensions removes invalid extension records from database
func (ah *AutomationHandler) CleanupInvalidExtensions(c *gin.Context) {
	err := ah.updateHandler.CleanupInvalidExtensions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to cleanup invalid extensions",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Invalid extensions cleaned up successfully",
	})
}

// Close gracefully shuts down the automation handler
func (ah *AutomationHandler) Close() error {
	if ah.isRunning {
		ah.scheduler.Stop()
		ah.workerPool.Stop()
		ah.isRunning = false
	}
	return ah.queue.Close()
}