package automation

import (
	"context"
	"log"
	"sync"
	"time"
)

// WorkerPool manages a pool of workers for processing jobs
type WorkerPool struct {
	queue       *JobQueue
	workers     []*Worker
	workerCount int
	stopChan    chan struct{}
	wg          sync.WaitGroup
	ctx         context.Context
	cancel      context.CancelFunc
}

// Worker represents a single worker that processes jobs
type Worker struct {
	id         int
	pool       *WorkerPool
	jobType    JobType
	stopChan   chan struct{}
	proxyIndex int // Dedicated proxy index (-1 for no proxy)
}

// JobHandler defines the interface for handling different job types
type JobHandler interface {
	HandleJob(job *Job, queue *JobQueue, proxyIndex int) error
	GetJobType() JobType
}

// WorkerPoolConfig configures the worker pool
type WorkerPoolConfig struct {
	DiscoveryWorkers  int
	UpdateWorkers     int
	AnalyticsWorkers  int
	HealthWorkers     int
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool(queue *JobQueue, config WorkerPoolConfig) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	
	pool := &WorkerPool{
		queue:       queue,
		workers:     make([]*Worker, 0),
		workerCount: 0,
		stopChan:    make(chan struct{}),
		ctx:         ctx,
		cancel:      cancel,
	}

	// Create workers for each job type
	pool.addWorkers(JobTypeDiscovery, config.DiscoveryWorkers)
	pool.addWorkers(JobTypeUpdate, config.UpdateWorkers)
	pool.addWorkers(JobTypeAnalytics, config.AnalyticsWorkers)
	pool.addWorkers(JobTypeHealthCheck, config.HealthWorkers)

	return pool
}

// addWorkers adds workers for a specific job type
func (wp *WorkerPool) addWorkers(jobType JobType, count int) {
	for i := 0; i < count; i++ {
		// Assign dedicated proxy indices for scraping workers
		proxyIndex := -1 // Default: no dedicated proxy
		if (jobType == JobTypeDiscovery || jobType == JobTypeUpdate) && wp.workerCount < 10 {
			proxyIndex = wp.workerCount // Assign proxy 0-9 to first 10 workers
		}
		
		worker := &Worker{
			id:         wp.workerCount,
			pool:       wp,
			jobType:    jobType,
			stopChan:   make(chan struct{}),
			proxyIndex: proxyIndex,
		}
		wp.workers = append(wp.workers, worker)
		wp.workerCount++
	}
}

// Start starts all workers in the pool
func (wp *WorkerPool) Start(handlers map[JobType]JobHandler) {
	log.Printf("Starting worker pool with %d workers", len(wp.workers))
	
	for _, worker := range wp.workers {
		handler, exists := handlers[worker.jobType]
		if !exists {
			log.Printf("No handler found for job type %s, skipping worker %d", worker.jobType, worker.id)
			continue
		}
		
		wp.wg.Add(1)
		go worker.start(handler, &wp.wg)
	}
	
	log.Println("All workers started")
}

// Stop gracefully stops all workers
func (wp *WorkerPool) Stop() {
	log.Println("Stopping worker pool...")
	
	wp.cancel() // Cancel context for all workers
	close(wp.stopChan)
	
	// Stop all workers
	for _, worker := range wp.workers {
		close(worker.stopChan)
	}
	
	// Wait for all workers to finish
	wp.wg.Wait()
	log.Println("Worker pool stopped")
}

// GetStats returns worker pool statistics
func (wp *WorkerPool) GetStats() map[string]interface{} {
	stats := make(map[string]interface{})
	
	// Count workers by type
	workerCounts := make(map[JobType]int)
	for _, worker := range wp.workers {
		workerCounts[worker.jobType]++
	}
	
	stats["total_workers"] = len(wp.workers)
	stats["workers_by_type"] = workerCounts
	
	// Get queue stats
	queueStats, err := wp.queue.GetQueueStats()
	if err != nil {
		log.Printf("Failed to get queue stats: %v", err)
	} else {
		stats["queue_stats"] = queueStats
	}
	
	return stats
}

// start begins the worker's job processing loop
func (w *Worker) start(handler JobHandler, wg *sync.WaitGroup) {
	defer wg.Done()
	
	if w.proxyIndex >= 0 {
		log.Printf("Worker %d started for job type: %s (dedicated proxy %d)", w.id, w.jobType, w.proxyIndex)
	} else {
		log.Printf("Worker %d started for job type: %s (no dedicated proxy)", w.id, w.jobType)
	}
	
	for {
		select {
		case <-w.stopChan:
			log.Printf("Worker %d stopping", w.id)
			return
		case <-w.pool.ctx.Done():
			log.Printf("Worker %d stopping due to context cancellation", w.id)
			return
		default:
			// Try to get a job
			job, err := w.pool.queue.DequeueJob(w.jobType)
			if err != nil {
				log.Printf("Worker %d: Failed to dequeue job: %v", w.id, err)
				time.Sleep(1 * time.Second) // Reduced delay for faster recovery
				continue
			}
			
			if job == nil {
				// No jobs available, wait a shorter time for better responsiveness
				time.Sleep(500 * time.Millisecond)
				continue
			}
			
			log.Printf("Worker %d processing job %s", w.id, job.ID)
			
			// Process the job
			err = handler.HandleJob(job, w.pool.queue, w.proxyIndex)
			if err != nil {
				log.Printf("Worker %d: Job %s failed: %v", w.id, job.ID, err)
				err = w.pool.queue.FailJob(job.ID, err.Error())
				if err != nil {
					log.Printf("Worker %d: Failed to mark job %s as failed: %v", w.id, job.ID, err)
				}
			} else {
				log.Printf("Worker %d: Job %s completed successfully", w.id, job.ID)
				err = w.pool.queue.CompleteJob(job.ID)
				if err != nil {
					log.Printf("Worker %d: Failed to mark job %s as completed: %v", w.id, job.ID, err)
				}
			}
		}
	}
}

// DefaultWorkerPoolConfig returns a default configuration for the worker pool
func DefaultWorkerPoolConfig() WorkerPoolConfig {
	return WorkerPoolConfig{
		DiscoveryWorkers: 4,  // 4 workers with dedicated proxies 0-3
		UpdateWorkers:    6,  // 6 workers with dedicated proxies 4-9  
		AnalyticsWorkers: 2,  // 2 workers without dedicated proxies (use shared/rotated)
		HealthWorkers:    1,  // 1 worker without dedicated proxy
	}
}