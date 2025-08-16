package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"chrome-analytics-backend/internal/services"
)

func main() {
	log.Println("🚀 Actual Proxy Integration Test - Using Real Proxies from proxies.txt")

	// Load actual proxies from proxies.txt
	proxies, err := loadProxiesFromFile("proxies.txt")
	if err != nil {
		log.Fatalf("❌ Failed to load proxies: %v", err)
	}

	log.Printf("✅ Loaded %d actual proxies from proxies.txt", len(proxies))
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
	}

	log.Println("\n" + strings.Repeat("=", 70))
	log.Println("PHASE 1: DIRECT vs ACTUAL PROXY PERFORMANCE COMPARISON")
	log.Println(strings.Repeat("=", 70))

	// Test 1: Direct connection baseline
	log.Println("\n📋 Test 1: Direct Connection Baseline (No Proxy)")
	directResults := make([]TestResult, 0)
	
	for i, extID := range testExtensions {
		log.Printf("\n   Direct Test %d/%d: %s", i+1, len(testExtensions), extID)
		
		startTime := time.Now()
		extension, err := directScraper.ScrapeExtensionDirectly(extID)
		duration := time.Since(startTime)
		
		result := TestResult{
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

	// Test 2: Actual proxy connection
	log.Println("\n📋 Test 2: Actual Proxy Connection Test")
	proxyResults := make([]TestResult, 0)
	
	for i, extID := range testExtensions {
		log.Printf("\n   Proxy Test %d/%d: %s", i+1, len(testExtensions), extID)
		
		// Get current proxy info
		stats := proxyScraper.GetProxyStats()
		currentProxyIndex := stats["current_index"]
		
		startTime := time.Now()
		extension, err := proxyScraper.ScrapeExtensionWithProxy(extID)
		duration := time.Since(startTime)
		
		result := TestResult{
			ExtensionID: extID,
			Duration:    duration,
			Success:     err == nil,
			Method:      fmt.Sprintf("Proxy-%v", currentProxyIndex),
		}
		
		if err != nil {
			log.Printf("   ❌ Failed in %v: %v", duration, err)
			result.Error = err.Error()
		} else {
			log.Printf("   ✅ Success in %v: %s (%d users)", duration, extension.Name, extension.Users)
			result.ExtensionName = extension.Name
			result.Users = extension.Users
		}
		
		log.Printf("   📊 Used proxy index: %v", currentProxyIndex)
		proxyResults = append(proxyResults, result)
		time.Sleep(2 * time.Second)
	}

	log.Println("\n" + strings.Repeat("=", 70))
	log.Println("PHASE 2: ACTUAL PROXY ROTATION AND LOAD TESTING")
	log.Println(strings.Repeat("=", 70))

	// Test 3: Proxy rotation with actual proxies
	log.Println("\n📋 Test 3: Actual Proxy Rotation Test (15 requests)")
	rotationResults := make([]TestResult, 0)
	
	for i := 0; i < 15; i++ {
		extID := testExtensions[i%len(testExtensions)]
		log.Printf("\n   Rotation Test %d/15: %s", i+1, extID)
		
		// Get proxy stats before request
		statsBefore := proxyScraper.GetProxyStats()
		currentProxy := statsBefore["current_index"]
		requestCount := statsBefore["request_count"]
		
		log.Printf("   📊 Before: Proxy index %v, request count %v", currentProxy, requestCount)
		
		startTime := time.Now()
		extension, err := proxyScraper.ScrapeExtension(extID) // Auto mode - should use proxy
		duration := time.Since(startTime)
		
		// Get stats after request
		statsAfter := proxyScraper.GetProxyStats()
		newProxy := statsAfter["current_index"]
		newRequestCount := statsAfter["request_count"]
		
		result := TestResult{
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
		
		log.Printf("   📊 After: Proxy index %v, request count %v", newProxy, newRequestCount)
		if newProxy != currentProxy {
			log.Printf("   🔄 PROXY ROTATED: %v → %v", currentProxy, newProxy)
		}
		
		rotationResults = append(rotationResults, result)
		time.Sleep(1 * time.Second) // Faster for rotation test
	}

	log.Println("\n" + strings.Repeat("=", 70))
	log.Println("RESULTS ANALYSIS - ACTUAL PROXY PERFORMANCE")
	log.Println(strings.Repeat("=", 70))

	// Performance Analysis
	log.Println("\n📊 Performance Comparison:")
	printPerformanceAnalysis(directResults, "Direct Connection")
	printPerformanceAnalysis(proxyResults, "Actual Proxy Connection")
	printPerformanceAnalysis(rotationResults, "Proxy Rotation Test")

	// Detailed Proxy Statistics
	log.Println("\n📊 Detailed Actual Proxy Statistics:")
	finalStats := proxyScraper.GetProxyStats()
	statsJSON, _ := json.MarshalIndent(finalStats, "   ", "  ")
	log.Printf("%s", string(statsJSON))

	// Per-proxy success rates
	log.Println("\n📋 Per-Proxy Performance Analysis:")
	if proxyStats, ok := finalStats["proxy_stats"].([]map[string]interface{}); ok {
		for _, proxyData := range proxyStats {
			index := proxyData["index"]
			host := proxyData["host"]
			successes := proxyData["successes"]
			failures := proxyData["failures"]
			successRate := proxyData["success_rate"]
			isActive := proxyData["is_active"]
			
			status := ""
			if isActive.(bool) {
				status = " (ACTIVE)"
			}
			
			log.Printf("   Proxy %v%s: %s", index, status, host)
			log.Printf("     Successes: %v, Failures: %v", successes, failures)
			log.Printf("     Success Rate: %.1f%%", successRate)
		}
	}

	// Overall Metrics Comparison
	log.Println("\n📈 Scraper Metrics Comparison:")
	
	directMetrics := directScraper.GetMetrics()
	log.Println("\n   Direct Scraper (No Proxy):")
	log.Printf("     Total Requests: %d", directMetrics.TotalRequests)
	log.Printf("     Successful: %d", directMetrics.SuccessfulScrapes)
	log.Printf("     Failed: %d", directMetrics.FailedScrapes)
	log.Printf("     Connection Errors: %d", directMetrics.ConnectionErrors)
	log.Printf("     Average Duration: %v", directMetrics.TotalDuration)

	proxyMetrics := proxyScraper.GetMetrics()
	log.Println("\n   Proxy Scraper (Actual Proxies):")
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
	log.Printf("   Actual Proxy Connection: %.1f%% success rate", proxySuccess)
	log.Printf("   Proxy Rotation Test: %.1f%% success rate", rotationSuccess)

	// Performance comparison
	log.Println("\n⚡ Performance Comparison:")
	if len(directResults) > 0 && len(proxyResults) > 0 {
		directAvg := calculateAverageDuration(directResults)
		proxyAvg := calculateAverageDuration(proxyResults)
		speedRatio := float64(proxyAvg) / float64(directAvg)
		
		log.Printf("   Direct Average: %v", directAvg)
		log.Printf("   Proxy Average: %v", proxyAvg)
		log.Printf("   Proxy Overhead: %.1fx slower", speedRatio)
		
		if speedRatio < 2.0 {
			log.Printf("   ✅ Proxy performance is acceptable (<2x slower)")
		} else {
			log.Printf("   ⚠️  Proxy performance may be concerning (>2x slower)")
		}
	}

	// Production Readiness Assessment
	log.Println("\n💡 Production Readiness Assessment:")
	
	// Check success rates
	if proxySuccess >= 90 {
		log.Println("   ✅ Proxy success rate is excellent (≥90%)")
	} else if proxySuccess >= 80 {
		log.Println("   ⚠️  Proxy success rate is acceptable (≥80%) but could be better")
	} else {
		log.Println("   ❌ Proxy success rate is concerning (<80%)")
	}
	
	// Check rotation
	rotationCount := countProxyRotations(rotationResults)
	expectedRotations := len(rotationResults) / 5 // Should rotate every 5 requests
	if rotationCount >= expectedRotations-1 { // Allow for some variance
		log.Println("   ✅ Proxy rotation is working correctly")
	} else {
		log.Println("   ⚠️  Proxy rotation may not be working as expected")
	}
	
	// Overall recommendation
	if proxySuccess >= 85 && rotationCount >= expectedRotations-1 {
		log.Println("\n🚀 RECOMMENDATION: Proxies are ready for production use!")
	} else {
		log.Println("\n🔧 RECOMMENDATION: Review proxy configuration before production use")
	}

	log.Println("\n🎯 Actual proxy integration test completed!")
	log.Printf("   Tested %d real proxies from decodo.com", len(proxies))
	log.Printf("   Performed %d total requests", len(directResults)+len(proxyResults)+len(rotationResults))
	log.Printf("   Proxy rotation tested with %d requests", len(rotationResults))
}

type TestResult struct {
	ExtensionID   string
	ExtensionName string
	Users         int64
	Duration      time.Duration
	Success       bool
	Error         string
	Method        string
}

func loadProxiesFromFile(filename string) ([]services.ProxyConfig, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to open %s: %w", filename, err)
	}
	defer file.Close()

	var proxies []services.ProxyConfig
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

		proxy := services.ProxyConfig{
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

func printPerformanceAnalysis(results []TestResult, method string) {
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

func calculateSuccessRate(results []TestResult) float64 {
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

func calculateAverageDuration(results []TestResult) time.Duration {
	if len(results) == 0 {
		return 0
	}
	
	var total time.Duration
	for _, result := range results {
		total += result.Duration
	}
	
	return total / time.Duration(len(results))
}

func countProxyRotations(results []TestResult) int {
	rotationCount := 0
	previousProxy := ""
	
	for _, result := range results {
		if previousProxy != "" && result.Method != previousProxy {
			rotationCount++
		}
		previousProxy = result.Method
	}
	
	return rotationCount
}