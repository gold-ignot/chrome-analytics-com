package services

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

// ProxyConfig represents a single proxy configuration
type ProxyConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	URL      string // Full proxy URL
}

// ProxyManager handles proxy rotation and health checking
type ProxyManager struct {
	proxies     []ProxyConfig
	currentIdx  int
	mutex       sync.RWMutex
	healthCheck map[string]bool
	healthMutex sync.RWMutex
}

// NewProxyManager creates a new proxy manager from the proxies.txt file
func NewProxyManager(proxiesFile string) (*ProxyManager, error) {
	pm := &ProxyManager{
		proxies:     make([]ProxyConfig, 0),
		currentIdx:  0,
		healthCheck: make(map[string]bool),
	}

	err := pm.loadProxies(proxiesFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load proxies: %w", err)
	}

	// Start health checking
	go pm.startHealthChecking()

	log.Printf("Proxy manager initialized with %d proxies", len(pm.proxies))
	return pm, nil
}

// loadProxies loads proxy configurations from file
func (pm *ProxyManager) loadProxies(filename string) error {
	file, err := os.Open(filename)
	if err != nil {
		return fmt.Errorf("failed to open proxies file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		// Parse proxy format: host:port:username:password
		parts := strings.Split(line, ":")
		if len(parts) != 4 {
			log.Printf("Invalid proxy format: %s", line)
			continue
		}

		proxy := ProxyConfig{
			Host:     parts[0],
			Port:     parts[1],
			Username: parts[2],
			Password: parts[3],
			URL:      fmt.Sprintf("http://%s:%s@%s:%s", parts[2], parts[3], parts[0], parts[1]),
		}

		pm.proxies = append(pm.proxies, proxy)
		pm.healthCheck[proxy.URL] = true // Assume healthy initially
	}

	if err := scanner.Err(); err != nil {
		return fmt.Errorf("error reading proxies file: %w", err)
	}

	if len(pm.proxies) == 0 {
		return fmt.Errorf("no valid proxies found in file")
	}

	return nil
}

// GetNextProxy returns the next healthy proxy in rotation
func (pm *ProxyManager) GetNextProxy() (*ProxyConfig, error) {
	pm.mutex.Lock()
	defer pm.mutex.Unlock()

	if len(pm.proxies) == 0 {
		return nil, fmt.Errorf("no proxies available")
	}

	// Find next healthy proxy
	startIdx := pm.currentIdx
	for {
		proxy := &pm.proxies[pm.currentIdx]
		
		pm.healthMutex.RLock()
		isHealthy := pm.healthCheck[proxy.URL]
		pm.healthMutex.RUnlock()

		if isHealthy {
			pm.currentIdx = (pm.currentIdx + 1) % len(pm.proxies)
			return proxy, nil
		}

		pm.currentIdx = (pm.currentIdx + 1) % len(pm.proxies)
		
		// If we've cycled through all proxies
		if pm.currentIdx == startIdx {
			// Return any proxy as fallback
			proxy := &pm.proxies[pm.currentIdx]
			pm.currentIdx = (pm.currentIdx + 1) % len(pm.proxies)
			return proxy, nil
		}
	}
}

// GetRandomProxy returns a random healthy proxy
func (pm *ProxyManager) GetRandomProxy() (*ProxyConfig, error) {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	if len(pm.proxies) == 0 {
		return nil, fmt.Errorf("no proxies available")
	}

	// Get healthy proxies
	var healthyProxies []ProxyConfig
	pm.healthMutex.RLock()
	for _, proxy := range pm.proxies {
		if pm.healthCheck[proxy.URL] {
			healthyProxies = append(healthyProxies, proxy)
		}
	}
	pm.healthMutex.RUnlock()

	// If no healthy proxies, use any proxy
	if len(healthyProxies) == 0 {
		healthyProxies = pm.proxies
	}

	// Return random proxy
	idx := rand.Intn(len(healthyProxies))
	return &healthyProxies[idx], nil
}

// CreateHTTPClient creates an HTTP client with the specified proxy
func (pm *ProxyManager) CreateHTTPClient(proxy *ProxyConfig) (*http.Client, error) {
	proxyURL, err := url.Parse(proxy.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse proxy URL: %w", err)
	}

	transport := &http.Transport{
		Proxy: http.ProxyURL(proxyURL),
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true, // Skip SSL verification for proxies
		},
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 10,
		IdleConnTimeout:     30 * time.Second,
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second, // Faster timeout for quicker failure detection
	}

	return client, nil
}

// CreateHTTPClientWithRandomProxy creates an HTTP client with a random proxy
func (pm *ProxyManager) CreateHTTPClientWithRandomProxy() (*http.Client, error) {
	proxy, err := pm.GetRandomProxy()
	if err != nil {
		return nil, err
	}

	return pm.CreateHTTPClient(proxy)
}

// GetProxyByIndex returns a specific proxy by index
func (pm *ProxyManager) GetProxyByIndex(index int) (*ProxyConfig, error) {
	pm.mutex.RLock()
	defer pm.mutex.RUnlock()

	if index < 0 || index >= len(pm.proxies) {
		return nil, fmt.Errorf("proxy index %d out of range (0-%d)", index, len(pm.proxies)-1)
	}

	return &pm.proxies[index], nil
}

// CreateHTTPClientWithProxyIndex creates an HTTP client with a specific proxy by index
func (pm *ProxyManager) CreateHTTPClientWithProxyIndex(index int) (*http.Client, error) {
	proxy, err := pm.GetProxyByIndex(index)
	if err != nil {
		return nil, err
	}

	return pm.CreateHTTPClient(proxy)
}

// MarkProxyUnhealthy marks a proxy as unhealthy
func (pm *ProxyManager) MarkProxyUnhealthy(proxyURL string) {
	pm.healthMutex.Lock()
	pm.healthCheck[proxyURL] = false
	pm.healthMutex.Unlock()
	log.Printf("Marked proxy as unhealthy: %s", proxyURL)
}

// MarkProxyHealthy marks a proxy as healthy
func (pm *ProxyManager) MarkProxyHealthy(proxyURL string) {
	pm.healthMutex.Lock()
	pm.healthCheck[proxyURL] = true
	pm.healthMutex.Unlock()
}

// GetProxyStats returns proxy health statistics
func (pm *ProxyManager) GetProxyStats() map[string]interface{} {
	pm.healthMutex.RLock()
	defer pm.healthMutex.RUnlock()

	healthy := 0
	unhealthy := 0

	for _, isHealthy := range pm.healthCheck {
		if isHealthy {
			healthy++
		} else {
			unhealthy++
		}
	}

	return map[string]interface{}{
		"total_proxies":   len(pm.proxies),
		"healthy_proxies": healthy,
		"unhealthy_proxies": unhealthy,
		"health_rate":     float64(healthy) / float64(len(pm.proxies)) * 100,
	}
}

// startHealthChecking runs periodic health checks on all proxies
func (pm *ProxyManager) startHealthChecking() {
	ticker := time.NewTicker(5 * time.Minute) // Check every 5 minutes
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			pm.checkAllProxies()
		}
	}
}

// checkAllProxies performs health checks on all proxies
func (pm *ProxyManager) checkAllProxies() {
	log.Println("Starting proxy health check...")
	
	for _, proxy := range pm.proxies {
		go func(p ProxyConfig) {
			healthy := pm.checkProxyHealth(p)
			pm.healthMutex.Lock()
			pm.healthCheck[p.URL] = healthy
			pm.healthMutex.Unlock()
		}(proxy)
	}
}

// checkProxyHealth checks if a single proxy is working
func (pm *ProxyManager) checkProxyHealth(proxy ProxyConfig) bool {
	client, err := pm.CreateHTTPClient(&proxy)
	if err != nil {
		return false
	}

	// Test with a simple HTTP request
	resp, err := client.Get("http://httpbin.org/ip")
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200
}

// GetHealthyProxyCount returns the number of healthy proxies
func (pm *ProxyManager) GetHealthyProxyCount() int {
	pm.healthMutex.RLock()
	defer pm.healthMutex.RUnlock()

	count := 0
	for _, isHealthy := range pm.healthCheck {
		if isHealthy {
			count++
		}
	}
	return count
}