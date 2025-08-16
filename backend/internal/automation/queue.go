package automation

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
)

type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
)

type JobType string

const (
	JobTypeDiscovery      JobType = "discovery"
	JobTypeUpdate         JobType = "update"
	JobTypeAnalytics      JobType = "analytics"
	JobTypeHealthCheck    JobType = "health_check"
)

type Priority int

const (
	PriorityLow    Priority = 1
	PriorityMedium Priority = 5
	PriorityHigh   Priority = 10
)

// Job represents a work item in the queue
type Job struct {
	ID          string                 `json:"id"`
	Type        JobType               `json:"type"`
	Priority    Priority              `json:"priority"`
	Payload     map[string]interface{} `json:"payload"`
	Status      JobStatus             `json:"status"`
	CreatedAt   time.Time             `json:"created_at"`
	UpdatedAt   time.Time             `json:"updated_at"`
	RetryCount  int                   `json:"retry_count"`
	MaxRetries  int                   `json:"max_retries"`
	ErrorMsg    string                `json:"error_msg,omitempty"`
}

// JobQueue manages Redis-based job queues
type JobQueue struct {
	redis  *redis.Client
	ctx    context.Context
}

// NewJobQueue creates a new job queue instance
func NewJobQueue(redisURL string) (*JobQueue, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	rdb := redis.NewClient(opts)
	
	// Test connection
	ctx := context.Background()
	_, err = rdb.Ping(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Println("Connected to Redis successfully")

	return &JobQueue{
		redis: rdb,
		ctx:   ctx,
	}, nil
}

// GetQueueKey returns the Redis key for a specific job type and priority
func (jq *JobQueue) GetQueueKey(jobType JobType, priority Priority) string {
	return fmt.Sprintf("queue:%s:priority:%d", jobType, priority)
}

// GetJobKey returns the Redis key for storing job details
func (jq *JobQueue) GetJobKey(jobID string) string {
	return fmt.Sprintf("job:%s", jobID)
}

// EnqueueJob adds a new job to the appropriate queue
func (jq *JobQueue) EnqueueJob(job *Job) error {
	job.CreatedAt = time.Now()
	job.UpdatedAt = time.Now()
	job.Status = JobStatusPending
	
	if job.ID == "" {
		job.ID = generateJobID()
	}
	
	if job.MaxRetries == 0 {
		job.MaxRetries = 3
	}

	// Store job details
	jobData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}

	err = jq.redis.Set(jq.ctx, jq.GetJobKey(job.ID), jobData, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to store job: %w", err)
	}

	// Add to priority queue
	queueKey := jq.GetQueueKey(job.Type, job.Priority)
	err = jq.redis.LPush(jq.ctx, queueKey, job.ID).Err()
	if err != nil {
		return fmt.Errorf("failed to enqueue job: %w", err)
	}

	log.Printf("Enqueued job %s (type: %s, priority: %d)", job.ID, job.Type, job.Priority)
	return nil
}

// DequeueJob retrieves the next job from the specified queue
func (jq *JobQueue) DequeueJob(jobType JobType) (*Job, error) {
	// Try high priority first, then medium, then low
	priorities := []Priority{PriorityHigh, PriorityMedium, PriorityLow}
	
	for _, priority := range priorities {
		queueKey := jq.GetQueueKey(jobType, priority)
		
		// Blocking pop with timeout
		result, err := jq.redis.BRPop(jq.ctx, 5*time.Second, queueKey).Result()
		if err != nil {
			if err == redis.Nil {
				continue // No jobs in this priority queue
			}
			return nil, fmt.Errorf("failed to dequeue job: %w", err)
		}

		if len(result) < 2 {
			continue
		}

		jobID := result[1]
		job, err := jq.GetJob(jobID)
		if err != nil {
			log.Printf("Failed to get job details for %s: %v", jobID, err)
			continue
		}

		// Mark as processing
		job.Status = JobStatusProcessing
		job.UpdatedAt = time.Now()
		err = jq.UpdateJob(job)
		if err != nil {
			log.Printf("Failed to update job status for %s: %v", jobID, err)
		}

		return job, nil
	}

	return nil, nil // No jobs available
}

// GetJob retrieves job details by ID
func (jq *JobQueue) GetJob(jobID string) (*Job, error) {
	jobData, err := jq.redis.Get(jq.ctx, jq.GetJobKey(jobID)).Result()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("job not found: %s", jobID)
		}
		return nil, fmt.Errorf("failed to get job: %w", err)
	}

	var job Job
	err = json.Unmarshal([]byte(jobData), &job)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal job: %w", err)
	}

	return &job, nil
}

// UpdateJob updates job details in Redis
func (jq *JobQueue) UpdateJob(job *Job) error {
	job.UpdatedAt = time.Now()
	
	jobData, err := json.Marshal(job)
	if err != nil {
		return fmt.Errorf("failed to marshal job: %w", err)
	}

	err = jq.redis.Set(jq.ctx, jq.GetJobKey(job.ID), jobData, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to update job: %w", err)
	}

	return nil
}

// CompleteJob marks a job as completed
func (jq *JobQueue) CompleteJob(jobID string) error {
	job, err := jq.GetJob(jobID)
	if err != nil {
		return err
	}

	job.Status = JobStatusCompleted
	job.UpdatedAt = time.Now()
	
	// Add to completed jobs list
	completedKey := "jobs:completed"
	jq.redis.LPush(jq.ctx, completedKey, jobID)
	// Keep only last 1000 completed jobs
	jq.redis.LTrim(jq.ctx, completedKey, 0, 999)
	
	return jq.UpdateJob(job)
}

// FailJob marks a job as failed and optionally retries it
func (jq *JobQueue) FailJob(jobID string, errorMsg string) error {
	job, err := jq.GetJob(jobID)
	if err != nil {
		return err
	}

	job.RetryCount++
	job.ErrorMsg = errorMsg
	job.UpdatedAt = time.Now()

	if job.RetryCount >= job.MaxRetries {
		job.Status = JobStatusFailed
		log.Printf("Job %s failed permanently after %d retries: %s", jobID, job.RetryCount, errorMsg)
	} else {
		job.Status = JobStatusPending
		// Re-enqueue with lower priority for retry
		retryPriority := job.Priority
		if retryPriority > PriorityLow {
			retryPriority--
		}
		
		queueKey := jq.GetQueueKey(job.Type, retryPriority)
		err = jq.redis.LPush(jq.ctx, queueKey, jobID).Err()
		if err != nil {
			return fmt.Errorf("failed to re-enqueue job for retry: %w", err)
		}
		
		log.Printf("Re-enqueued job %s for retry (%d/%d)", jobID, job.RetryCount, job.MaxRetries)
	}

	return jq.UpdateJob(job)
}

// GetQueueStats returns statistics about the queues
func (jq *JobQueue) GetQueueStats() (map[string]int64, error) {
	stats := make(map[string]int64)
	
	jobTypes := []JobType{JobTypeDiscovery, JobTypeUpdate, JobTypeAnalytics, JobTypeHealthCheck}
	priorities := []Priority{PriorityHigh, PriorityMedium, PriorityLow}
	
	for _, jobType := range jobTypes {
		for _, priority := range priorities {
			queueKey := jq.GetQueueKey(jobType, priority)
			length, err := jq.redis.LLen(jq.ctx, queueKey).Result()
			if err != nil {
				return nil, fmt.Errorf("failed to get queue length: %w", err)
			}
			
			statKey := fmt.Sprintf("%s_priority_%d", jobType, priority)
			stats[statKey] = length
		}
	}
	
	return stats, nil
}

// GetCompletedJobsStats returns statistics about completed jobs
func (jq *JobQueue) GetCompletedJobsStats() (map[string]interface{}, error) {
	completedKey := "jobs:completed"
	
	// Get total completed jobs count
	totalCompleted, err := jq.redis.LLen(jq.ctx, completedKey).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get completed jobs count: %w", err)
	}
	
	// Get recent completed job IDs (last 50)
	recentJobIDs, err := jq.redis.LRange(jq.ctx, completedKey, 0, 49).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get recent completed jobs: %w", err)
	}
	
	// Get details for recent jobs
	recentJobs := make([]map[string]interface{}, 0)
	completedByType := make(map[string]int)
	completedInLast24h := 0
	now := time.Now()
	
	for _, jobID := range recentJobIDs {
		job, err := jq.GetJob(jobID)
		if err != nil {
			continue // Skip if job details can't be retrieved
		}
		
		// Count by type
		completedByType[string(job.Type)]++
		
		// Count jobs completed in last 24 hours
		if job.UpdatedAt.After(now.Add(-24 * time.Hour)) {
			completedInLast24h++
		}
		
		// Add job details for recent list
		recentJobs = append(recentJobs, map[string]interface{}{
			"id":         job.ID,
			"type":       job.Type,
			"priority":   job.Priority,
			"status":     job.Status,
			"created_at": job.CreatedAt,
			"updated_at": job.UpdatedAt,
			"payload":    job.Payload,
		})
	}
	
	return map[string]interface{}{
		"total_completed":      totalCompleted,
		"completed_last_24h":   completedInLast24h,
		"completed_by_type":    completedByType,
		"recent_completed":     recentJobs,
	}, nil
}

// Close closes the Redis connection
func (jq *JobQueue) Close() error {
	return jq.redis.Close()
}

// generateJobID creates a unique job ID
func generateJobID() string {
	return fmt.Sprintf("job_%d", time.Now().UnixNano())
}