package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"chrome-analytics-backend/internal/models"
)

type BrowserClient struct {
	baseURL          string
	client           *http.Client
	metrics          *BrowserMetrics
	activeRequests   int64
	requestCounter   int64
}

type BrowserMetrics struct {
	TotalRequests     int64
	SuccessfulScrapes int64
	FailedScrapes     int64
	TimeoutErrors     int64
	ConnectionErrors  int64
	TotalDuration     time.Duration
	LastError         string
	LastErrorTime     time.Time
}

type BrowserScrapeRequest struct {
	ExtensionID string     `json:"extension_id"`
	Timeout     int        `json:"timeout,omitempty"`
	Proxy       *ProxyInfo `json:"proxy,omitempty"`
}

type ProxyInfo struct {
	Host     string `json:"host"`
	Port     string `json:"port"`
	Username string `json:"username"`
	Password string `json:"password"`
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

	// Optimize HTTP client for better performance
	transport := &http.Transport{
		MaxIdleConns:        100,             // Increase connection pool
		MaxIdleConnsPerHost: 10,              // Connections per host
		IdleConnTimeout:     90 * time.Second, // Keep connections alive
		DisableCompression:  false,           // Enable compression
	}

	return &BrowserClient{
		baseURL: baseURL,
		client: &http.Client{
			Timeout:   45 * time.Second, // Reduced from 60s for faster timeouts
			Transport: transport,
		},
		metrics: &BrowserMetrics{},
	}
}

// ScrapeExtension scrapes a single extension using the browser scraper service
func (bc *BrowserClient) ScrapeExtension(extensionID string) (*models.Extension, error) {
	return bc.ScrapeExtensionWithTimeout(extensionID, 30)
}

// ScrapeExtensionWithRetry scrapes with retry logic for failed requests
func (bc *BrowserClient) ScrapeExtensionWithRetry(extensionID string, maxRetries int) (*models.Extension, error) {
	var lastErr error
	
	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			// Exponential backoff: 1s, 2s, 4s, 8s
			backoff := time.Duration(1<<(attempt-1)) * time.Second
			log.Printf("RETRY: Attempt %d/%d for %s after %v delay", attempt+1, maxRetries+1, extensionID, backoff)
			time.Sleep(backoff)
		}
		
		extension, err := bc.ScrapeExtension(extensionID)
		if err == nil {
			if attempt > 0 {
				log.Printf("RETRY SUCCESS: %s succeeded on attempt %d", extensionID, attempt+1)
			}
			return extension, nil
		}
		
		lastErr = err
		log.Printf("RETRY FAILED: Attempt %d failed for %s: %v", attempt+1, extensionID, err)
		
		// Don't retry certain types of errors
		if isNonRetryableError(err) {
			log.Printf("RETRY ABORT: Non-retryable error for %s: %v", extensionID, err)
			break
		}
	}
	
	return nil, fmt.Errorf("failed after %d attempts: %w", maxRetries+1, lastErr)
}

// isNonRetryableError determines if an error should not be retried
func isNonRetryableError(err error) bool {
	errStr := strings.ToLower(err.Error())
	// Don't retry if the extension doesn't exist or is invalid
	return strings.Contains(errStr, "extension not found") ||
		   strings.Contains(errStr, "invalid extension id") ||
		   strings.Contains(errStr, "404") ||
		   strings.Contains(errStr, "403")
}

// ScrapeExtensionWithProxy scrapes using a specific proxy
func (bc *BrowserClient) ScrapeExtensionWithProxy(extensionID string, proxy *ProxyInfo) (*models.Extension, error) {
	reqData := BrowserScrapeRequest{
		ExtensionID: extensionID,
		Timeout:     30,
		Proxy:       proxy,
	}

	return bc.scrapeWithRequest(reqData)
}

// ScrapeExtensionWithTimeout scrapes with a custom timeout
func (bc *BrowserClient) ScrapeExtensionWithTimeout(extensionID string, timeoutSeconds int) (*models.Extension, error) {
	reqData := BrowserScrapeRequest{
		ExtensionID: extensionID,
		Timeout:     timeoutSeconds,
	}
	
	return bc.scrapeWithRequest(reqData)
}

func (bc *BrowserClient) scrapeWithRequest(reqData BrowserScrapeRequest) (*models.Extension, error) {
	startTime := time.Now()
	bc.metrics.TotalRequests++
	
	// Track concurrent requests
	requestNum := atomic.AddInt64(&bc.requestCounter, 1)
	activeCount := atomic.AddInt64(&bc.activeRequests, 1)
	defer atomic.AddInt64(&bc.activeRequests, -1)
	
	// Enhanced logging with pool tracking
	log.Printf("🔄 POOL [%d/%s] Request #%d for %s (timeout: %ds, proxy: %v, active: %d)", 
		requestNum, bc.getPoolStatus(), requestNum, reqData.ExtensionID, reqData.Timeout, 
		reqData.Proxy != nil, activeCount)

	jsonData, err := json.Marshal(reqData)
	if err != nil {
		bc.recordError("JSON marshal failed", err)
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Track request timing
	requestStart := time.Now()
	resp, err := bc.client.Post(bc.baseURL+"/scrape", "application/json", bytes.NewBuffer(jsonData))
	requestDuration := time.Since(requestStart)
	
	if err != nil {
		bc.recordError("HTTP request failed", err)
		// Categorize error types
		if requestDuration >= 45*time.Second {
			bc.metrics.TimeoutErrors++
			log.Printf("❌ TIMEOUT [%d] HTTP request failed for %s after %v (active: %d): %v", 
				requestNum, reqData.ExtensionID, requestDuration, atomic.LoadInt64(&bc.activeRequests), err)
		} else {
			bc.metrics.ConnectionErrors++
			log.Printf("❌ CONNECTION [%d] HTTP request failed for %s after %v (active: %d): %v", 
				requestNum, reqData.ExtensionID, requestDuration, atomic.LoadInt64(&bc.activeRequests), err)
		}
		return nil, fmt.Errorf("failed to call browser scraper: %w", err)
	}
	defer resp.Body.Close()

	// Log response details
	log.Printf("📡 RESPONSE [%d] HTTP request completed for %s: status=%d, duration=%v, active=%d", 
		requestNum, reqData.ExtensionID, resp.StatusCode, requestDuration, atomic.LoadInt64(&bc.activeRequests))

	var result BrowserScrapeResponse
	decodeStart := time.Now()
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		bc.recordError("Response decode failed", err)
		log.Printf("❌ DECODE ERROR [%d] Response decode failed for %s after %v (active: %d): %v", 
			requestNum, reqData.ExtensionID, time.Since(decodeStart), atomic.LoadInt64(&bc.activeRequests), err)
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	totalDuration := time.Since(startTime)
	bc.metrics.TotalDuration += totalDuration
	
	if !result.Success {
		bc.recordError("Browser scraping failed", fmt.Errorf(result.Error))
		bc.metrics.FailedScrapes++
		
		// Categorize browser scraper errors
		if requestDuration >= 30*time.Second {
			log.Printf("❌ BROWSER TIMEOUT [%d] Scraping failed for %s (total: %v, http: %v, active: %d): %s", 
				requestNum, reqData.ExtensionID, totalDuration, requestDuration, atomic.LoadInt64(&bc.activeRequests), result.Error)
		} else {
			log.Printf("❌ BROWSER ERROR [%d] Scraping failed for %s (total: %v, http: %v, active: %d): %s", 
				requestNum, reqData.ExtensionID, totalDuration, requestDuration, atomic.LoadInt64(&bc.activeRequests), result.Error)
		}
		return nil, fmt.Errorf("browser scraping failed: %s", result.Error)
	}

	bc.metrics.SuccessfulScrapes++
	log.Printf("✅ SUCCESS [%d] Scraping successful for %s (total: %v, http: %v, active: %d): name='%s', users=%d", 
		requestNum, reqData.ExtensionID, totalDuration, requestDuration, atomic.LoadInt64(&bc.activeRequests), result.Name, result.Users)

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

// recordError records an error in the metrics
func (bc *BrowserClient) recordError(context string, err error) {
	bc.metrics.LastError = fmt.Sprintf("%s: %v", context, err)
	bc.metrics.LastErrorTime = time.Now()
}

// getPoolStatus returns a string describing the current pool status
func (bc *BrowserClient) getPoolStatus() string {
	active := atomic.LoadInt64(&bc.activeRequests)
	total := atomic.LoadInt64(&bc.requestCounter)
	return fmt.Sprintf("A%d/T%d", active, total)
}

// GetMetrics returns the current browser client metrics
func (bc *BrowserClient) GetMetrics() *BrowserMetrics {
	avgDuration := time.Duration(0)
	if bc.metrics.TotalRequests > 0 {
		avgDuration = bc.metrics.TotalDuration / time.Duration(bc.metrics.TotalRequests)
	}
	
	// Create a copy to avoid race conditions
	return &BrowserMetrics{
		TotalRequests:     bc.metrics.TotalRequests,
		SuccessfulScrapes: bc.metrics.SuccessfulScrapes,
		FailedScrapes:     bc.metrics.FailedScrapes,
		TimeoutErrors:     bc.metrics.TimeoutErrors,
		ConnectionErrors:  bc.metrics.ConnectionErrors,
		TotalDuration:     avgDuration, // Return average duration instead of total
		LastError:         bc.metrics.LastError,
		LastErrorTime:     bc.metrics.LastErrorTime,
	}
}

// HealthCheck checks if the browser scraper service is healthy
func (bc *BrowserClient) HealthCheck() error {
	startTime := time.Now()
	resp, err := bc.client.Get(bc.baseURL + "/health")
	duration := time.Since(startTime)
	
	if err != nil {
		log.Printf("HEALTH CHECK FAILED: %v (duration: %v)", err, duration)
		return fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("HEALTH CHECK BAD STATUS: %d (duration: %v)", resp.StatusCode, duration)
		return fmt.Errorf("health check returned status %d", resp.StatusCode)
	}

	log.Printf("HEALTH CHECK OK: status=200 (duration: %v)", duration)
	return nil
}