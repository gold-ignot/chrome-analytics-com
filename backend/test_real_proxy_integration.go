package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"chrome-analytics-backend/internal/services"
)

func main() {
	log.Println("🚀 Real Proxy Integration Test for Standalone Scraper...")

	// Load proxy configuration from environment variables
	proxies := loadProxiesFromEnv()
	
	if len(proxies) == 0 {
		log.Println("❌ No proxies configured!")
		log.Println("   Set proxy environment variables:")
		log.Println("   PROXY_LIST=host1:port1:user1:pass1,host2:port2:user2:pass2")
		log.Println("   OR individual: PROXY_HOST, PROXY_PORT, PROXY_USERNAME, PROXY_PASSWORD")
		log.Println("   OR multiple: PROXY_HOST_1, PROXY_PORT_1, PROXY_USERNAME_1, PROXY_PASSWORD_1, etc.")
		log.Println("")
		log.Println("   See PROXY_INTEGRATION_GUIDE.md for detailed instructions")
		return
	}

	log.Printf("✅ Loaded %d proxy configurations", len(proxies))
	for i, proxy := range proxies {
		log.Printf("   Proxy %d: %s:%s (user: %s)", i+1, proxy.Host, proxy.Port, proxy.Username)
	}

	// Create scrapers for comparison
	directScraper := services.NewStandaloneScraper()
	proxyScraper := services.NewStandaloneScraperWithProxies(proxies)

	// Test extensions
	testExtensions := []string{
		"cjpalhdlnbpafiamejdnhcphjbkeiagm", // uBlock Origin
		"bmnlcjabgnpnenekpadlanbbkooimhnj", // Honey
		"fmkadmapgofadopljbjfkapdkoienihi", // React Developer Tools
		"ldpochfccmkkmhdbclfhpagapcfdljkj", // Decentraleyes
		"nmmhkkegccagdldgiimedpiccmgmieda", // Google Wallet
	}

	log.Println("\n" + strings.Repeat("=", 60))
	log.Println("PHASE 1: DIRECT vs PROXY PERFORMANCE COMPARISON")
	log.Println(strings.Repeat("=", 60))

	// Test 1: Direct connection baseline
	log.Println("\n📋 Test 1: Direct Connection Baseline")
	directResults := make([]testResult, 0)
	
	for i, extID := range testExtensions[:3] { // Test first 3 extensions
		log.Printf("\n   Direct Test %d: %s", i+1, extID)
		
		startTime := time.Now()
		extension, err := directScraper.ScrapeExtensionDirectly(extID)
		duration := time.Since(startTime)
		
		result := testResult{
			ExtensionID: extID,
			Duration:    duration,
			Success:     err == nil,
			Method:      "Direct",
		}
		
		if err != nil {
			log.Printf("   ❌ Failed in %v: %v", duration, err)
			result.Error = err.Error()
		} else {
			log.Printf("   ✅ Success in %v: %s (%d users)", duration, extension.Name, extension.Users)
			result.ExtensionName = extension.Name
			result.Users = extension.Users
		}
		
		directResults = append(directResults, result)
		time.Sleep(2 * time.Second) // Be polite to Chrome Web Store
	}

	// Test 2: Proxy connection
	log.Println("\n📋 Test 2: Proxy Connection Test")
	proxyResults := make([]testResult, 0)
	
	for i, extID := range testExtensions[:3] { // Same extensions as direct test
		log.Printf("\n   Proxy Test %d: %s", i+1, extID)
		
		startTime := time.Now()
		extension, err := proxyScraper.ScrapeExtensionWithProxy(extID)
		duration := time.Since(startTime)
		
		result := testResult{
			ExtensionID: extID,
			Duration:    duration,
			Success:     err == nil,
			Method:      "Proxy",
		}
		
		if err != nil {
			log.Printf("   ❌ Failed in %v: %v", duration, err)
			result.Error = err.Error()
		} else {
			log.Printf("   ✅ Success in %v: %s (%d users)", duration, extension.Name, extension.Users)
			result.ExtensionName = extension.Name
			result.Users = extension.Users
		}
		
		proxyResults = append(proxyResults, result)
		time.Sleep(2 * time.Second) // Be polite
	}

	log.Println("\n" + strings.Repeat("=", 60))
	log.Println("PHASE 2: PROXY ROTATION AND LOAD TESTING")
	log.Println(strings.Repeat("=", 60))

	// Test 3: Proxy rotation test
	log.Println("\n📋 Test 3: Proxy Rotation Test (12 requests to trigger rotations)")
	rotationResults := make([]testResult, 0)
	
	for i := 0; i < 12; i++ {
		extID := testExtensions[i%len(testExtensions)]
		log.Printf("\n   Rotation Test %d: %s", i+1, extID)
		
		// Get current proxy stats before request
		statsBefore := proxyScraper.GetProxyStats()
		currentProxy := statsBefore["current_index"]
		requestCount := statsBefore["request_count"]
		
		log.Printf("   📊 Before: Proxy index %v, requests %v", currentProxy, requestCount)
		
		startTime := time.Now()
		extension, err := proxyScraper.ScrapeExtension(extID) // Auto mode
		duration := time.Since(startTime)
		
		// Get stats after request
		statsAfter := proxyScraper.GetProxyStats()
		newProxy := statsAfter["current_index"]
		newRequestCount := statsAfter["request_count"]
		
		result := testResult{
			ExtensionID: extID,
			Duration:    duration,
			Success:     err == nil,
			Method:      fmt.Sprintf("Proxy-%v", currentProxy),
		}
		
		if err != nil {
			log.Printf("   ❌ Failed in %v: %v", duration, err)
			result.Error = err.Error()
		} else {
			log.Printf("   ✅ Success in %v: %s", duration, extension.Name)
			result.ExtensionName = extension.Name
			result.Users = extension.Users
		}
		
		log.Printf("   📊 After: Proxy index %v, requests %v", newProxy, newRequestCount)
		if newProxy != currentProxy {
			log.Printf("   🔄 PROXY ROTATED: %v → %v", currentProxy, newProxy)
		}
		
		rotationResults = append(rotationResults, result)
		time.Sleep(1 * time.Second) // Shorter delay for rotation test
	}

	log.Println("\n" + strings.Repeat("=", 60))
	log.Println("RESULTS ANALYSIS")
	log.Println(strings.Repeat("=", 60))

	// Performance Analysis
	log.Println("\n📊 Performance Comparison:")
	printPerformanceAnalysis(directResults, "Direct Connection")
	printPerformanceAnalysis(proxyResults, "Proxy Connection")
	printPerformanceAnalysis(rotationResults, "Proxy Rotation")

	// Proxy Statistics
	log.Println("\n📊 Final Proxy Statistics:")
	finalStats := proxyScraper.GetProxyStats()
	statsJSON, _ := json.MarshalIndent(finalStats, "   ", "  ")
	log.Printf("%s", string(statsJSON))

	// Overall Metrics
	log.Println("\n📈 Scraper Metrics Comparison:")
	
	directMetrics := directScraper.GetMetrics()
	log.Println("\n   Direct Scraper:")
	log.Printf("     Total Requests: %d", directMetrics.TotalRequests)
	log.Printf("     Successful: %d", directMetrics.SuccessfulScrapes)
	log.Printf("     Failed: %d", directMetrics.FailedScrapes)
	log.Printf("     Connection Errors: %d", directMetrics.ConnectionErrors)
	log.Printf("     Average Duration: %v", directMetrics.TotalDuration)

	proxyMetrics := proxyScraper.GetMetrics()
	log.Println("\n   Proxy Scraper:")
	log.Printf("     Total Requests: %d", proxyMetrics.TotalRequests)
	log.Printf("     Successful: %d", proxyMetrics.SuccessfulScrapes)
	log.Printf("     Failed: %d", proxyMetrics.FailedScrapes)
	log.Printf("     Connection Errors: %d", proxyMetrics.ConnectionErrors)
	log.Printf("     Average Duration: %v", proxyMetrics.TotalDuration)

	// Success Rate Analysis
	log.Println("\n🎯 Success Rate Analysis:")
	directSuccess := calculateSuccessRate(directResults)
	proxySuccess := calculateSuccessRate(proxyResults)
	rotationSuccess := calculateSuccessRate(rotationResults)
	
	log.Printf("   Direct Connection: %.1f%% success rate", directSuccess)
	log.Printf("   Proxy Connection: %.1f%% success rate", proxySuccess)
	log.Printf("   Proxy Rotation: %.1f%% success rate", rotationSuccess)

	// Recommendations
	log.Println("\n💡 Recommendations:")
	if proxySuccess >= directSuccess {
		log.Println("   ✅ Proxies are working well! Consider using them for production.")
	} else {
		log.Println("   ⚠️  Proxies showing lower success rate. Check proxy configuration.")
	}
	
	if rotationSuccess >= 80 {
		log.Println("   ✅ Proxy rotation is working reliably.")
	} else {
		log.Println("   ⚠️  Some proxy rotation issues detected. Check proxy health.")
	}

	log.Println("\n🎯 Real proxy integration test completed!")
}

type testResult struct {
	ExtensionID   string
	ExtensionName string
	Users         int64
	Duration      time.Duration
	Success       bool
	Error         string
	Method        string
}

func loadProxiesFromEnv() []services.ProxyConfig {
	var proxies []services.ProxyConfig

	// Method 1: PROXY_LIST format (host1:port1:user1:pass1,host2:port2:user2:pass2)
	if proxyList := os.Getenv("PROXY_LIST"); proxyList != "" {
		parts := strings.Split(proxyList, ",")
		for _, part := range parts {
			credentials := strings.Split(strings.TrimSpace(part), ":")
			if len(credentials) >= 4 {
				proxies = append(proxies, services.ProxyConfig{
					Host:     credentials[0],
					Port:     credentials[1],
					Username: credentials[2],
					Password: credentials[3],
				})
			}
		}
	}

	// Method 2: Individual environment variables
	if len(proxies) == 0 {
		if host := os.Getenv("PROXY_HOST"); host != "" {
			proxy := services.ProxyConfig{
				Host:     host,
				Port:     getEnvWithDefault("PROXY_PORT", "8080"),
				Username: os.Getenv("PROXY_USERNAME"),
				Password: os.Getenv("PROXY_PASSWORD"),
			}
			proxies = append(proxies, proxy)
		}
	}

	// Method 3: Numbered environment variables (PROXY_HOST_1, PROXY_HOST_2, etc.)
	if len(proxies) == 0 {
		for i := 1; i <= 10; i++ { // Check up to 10 proxies
			host := os.Getenv(fmt.Sprintf("PROXY_HOST_%d", i))
			if host == "" {
				break
			}
			proxy := services.ProxyConfig{
				Host:     host,
				Port:     getEnvWithDefault(fmt.Sprintf("PROXY_PORT_%d", i), "8080"),
				Username: os.Getenv(fmt.Sprintf("PROXY_USERNAME_%d", i)),
				Password: os.Getenv(fmt.Sprintf("PROXY_PASSWORD_%d", i)),
			}
			proxies = append(proxies, proxy)
		}
	}

	return proxies
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func printPerformanceAnalysis(results []testResult, method string) {
	if len(results) == 0 {
		log.Printf("   %s: No results", method)
		return
	}

	var totalDuration time.Duration
	var successCount int
	var minDuration, maxDuration time.Duration
	
	minDuration = results[0].Duration
	maxDuration = results[0].Duration

	for _, result := range results {
		totalDuration += result.Duration
		if result.Success {
			successCount++
		}
		if result.Duration < minDuration {
			minDuration = result.Duration
		}
		if result.Duration > maxDuration {
			maxDuration = result.Duration
		}
	}

	avgDuration := totalDuration / time.Duration(len(results))
	successRate := float64(successCount) / float64(len(results)) * 100

	log.Printf("   %s:", method)
	log.Printf("     Requests: %d", len(results))
	log.Printf("     Success Rate: %.1f%% (%d/%d)", successRate, successCount, len(results))
	log.Printf("     Average Duration: %v", avgDuration)
	log.Printf("     Min Duration: %v", minDuration)
	log.Printf("     Max Duration: %v", maxDuration)
}

func calculateSuccessRate(results []testResult) float64 {
	if len(results) == 0 {
		return 0
	}
	
	successCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		}
	}
	
	return float64(successCount) / float64(len(results)) * 100
}